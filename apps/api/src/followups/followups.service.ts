import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { FollowUpStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { CreateFollowUpDto } from "./dto/create-followup.dto";
import { UpdateFollowUpDto } from "./dto/update-followup.dto";
import { ReplaceObjectivesDto } from "./dto/replace-objectives.dto";
import { CreateFollowUpSessionDto } from "./dto/create-followup-session.dto";
import { UpsertMarkDto } from "./dto/upsert-mark.dto";
import { UpdateObjectiveNotesDto } from "./dto/update-objective-notes.dto";
import { AuthUser } from "../auth/auth-user";
import { FollowUpAccessService } from "./followup-access.service";
import {
  computeAttendancePercent,
  lastObjectiveScores,
  progressScaleToPercent,
  sessionAttendanceFromMarks,
} from "./followup-metrics";

/** Objetivos archivados (con datos en cuadrícula pero fuera de la lista activa). */
const ARCHIVED_OBJECTIVE_IDX = 1000;

function nowYear(): number {
  return new Date().getFullYear();
}

function nowMonth(): number {
  return new Date().getMonth() + 1;
}

const followUpInclude = {
  patient: { select: { id: true, firstName: true, lastName: true } },
  therapist: { select: { id: true, fullName: true, email: true, status: true } },
  area: { select: { id: true, key: true, name: true, category: true, trackingMode: true } },
  objectives: { orderBy: { idx: "asc" as const } },
  sessions: {
    orderBy: { sessionDate: "asc" as const },
    include: {
      therapist: { select: { id: true, fullName: true } },
      marks: true,
    },
  },
  attachments: { orderBy: { createdAt: "desc" as const } },
  metrics: { orderBy: { measuredAt: "desc" as const } },
};

@Injectable()
export class FollowUpsService {
  constructor(
    private prisma: PrismaService,
    private access: FollowUpAccessService,
  ) {}

  async listByPatient(user: AuthUser, patientId: string, year?: number, month?: number) {
    await this.access.assertCanViewPatient(user, patientId);

    const where: {
      patientId: string;
      therapistId?: string;
      periodYear?: number;
      periodMonth?: number;
      OR?: Prisma.FollowUpWhereInput[];
    } = {
      patientId,
      ...(year ? { periodYear: year } : {}),
      ...(month ? { periodMonth: month } : {}),
    };

    if (user.roles.includes("THERAPIST") && !this.access.isAdmin(user)) {
      where.OR = [
        { therapistId: user.sub },
        { visibleToTherapist: true, status: FollowUpStatus.CLOSED },
      ];
    }

    return this.prisma.followUp.findMany({
      where,
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
      include: {
        area: { select: { id: true, key: true, name: true, category: true, trackingMode: true } },
        therapist: { select: { id: true, fullName: true, email: true, status: true } },
        patient: { select: { id: true, firstName: true, lastName: true } },
        program: { select: { id: true, therapist: { select: { fullName: true } } } },
      },
    });
  }

  async listForTherapist(user: AuthUser, year?: number, month?: number, allMonths = false) {
    if (!user.roles.includes("THERAPIST") && !this.access.isAdmin(user)) {
      throw new ForbiddenException("Solo terapeutas");
    }

    const therapistId = user.sub;
    return this.prisma.followUp.findMany({
      where: {
        ...(allMonths ? {} : { periodYear: year ?? nowYear(), periodMonth: month ?? nowMonth() }),
        patient: { assignments: { some: { therapistId } } },
        OR: [
          { therapistId },
          { visibleToTherapist: true, status: FollowUpStatus.CLOSED },
        ],
      },
      orderBy: [
        { periodYear: "desc" },
        { periodMonth: "desc" },
        { patient: { lastName: "asc" } },
        { area: { sortOrder: "asc" } },
      ],
      include: {
        area: { select: { id: true, key: true, name: true, trackingMode: true } },
        patient: { select: { id: true, firstName: true, lastName: true } },
        therapist: { select: { id: true, fullName: true } },
        sessions: { select: { id: true } },
        objectives: { select: { id: true } },
      },
    });
  }

  async get(user: AuthUser, id: string) {
    await this.access.assertCanViewFollowUp(user, id);
    const fu = await this.prisma.followUp.findUnique({
      where: { id },
      include: followUpInclude,
    });
    if (!fu) throw new NotFoundException("FollowUp not found");
    return fu;
  }

  async getParentSummary(user: AuthUser, patientId: string, year?: number, month?: number) {
    await this.access.assertCanViewPatient(user, patientId);

    const followUps = await this.fetchVisibleClosedFollowUps(user, patientId, year, month);

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    return {
      patient,
      periodYear: year ?? null,
      periodMonth: month ?? null,
      followUps: this.groupSummaryItems(followUps),
    };
  }

  async getParentProgramSummary(user: AuthUser, programId: string) {
    await this.access.assertCanViewProgram(user, programId);

    const visibilityFilter = this.parentVisibilityFilter(user);

    const program = await this.prisma.followUpProgram.findUnique({
      where: { id: programId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        therapist: { select: { id: true, fullName: true } },
        followUps: {
          where: {
            status: FollowUpStatus.CLOSED,
            ...visibilityFilter,
          },
          include: this.parentSummaryFollowUpInclude(),
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!program) throw new NotFoundException("Programación no encontrada");
    if (program.followUps.length === 0) {
      throw new NotFoundException("No hay seguimientos publicados visibles en esta programación");
    }

    return {
      programId: program.id,
      patient: program.patient,
      therapistName: program.therapist.fullName,
      periodYear: program.periodYear,
      periodMonth: program.periodMonth,
      areas: program.followUps.map((fu) => this.buildSummaryCard(fu)),
    };
  }

  private parentVisibilityFilter(user: AuthUser): { visibleToSchool?: true; visibleToParent?: true } {
    if (this.access.isAdmin(user)) return {};
    if (user.roles.includes("SCHOOL")) return { visibleToSchool: true };
    return { visibleToParent: true };
  }

  private parentSummaryFollowUpInclude() {
    return {
      area: { select: { id: true, key: true, name: true, trackingMode: true } },
      therapist: { select: { id: true, fullName: true } },
      objectives: { where: { idx: { lt: ARCHIVED_OBJECTIVE_IDX } }, orderBy: { idx: "asc" as const } },
      sessions: {
        orderBy: { sessionDate: "asc" as const },
        include: { marks: true },
      },
    };
  }

  private async fetchVisibleClosedFollowUps(
    user: AuthUser,
    patientId: string,
    year?: number,
    month?: number,
  ) {
    return this.prisma.followUp.findMany({
      where: {
        patientId,
        ...(year ? { periodYear: year } : {}),
        ...(month ? { periodMonth: month } : {}),
        status: FollowUpStatus.CLOSED,
        ...this.parentVisibilityFilter(user),
      },
      include: {
        ...this.parentSummaryFollowUpInclude(),
        program: { select: { id: true } },
      },
      orderBy: [
        { periodYear: "desc" },
        { periodMonth: "desc" },
        { programId: "asc" },
        { createdAt: "asc" },
      ],
    });
  }

  private groupSummaryItems(
    followUps: {
      id: string;
      programId: string | null;
      periodYear: number;
      periodMonth: number;
      therapist: { id: string; fullName: string };
    }[],
  ) {
    type SummaryCard = ReturnType<FollowUpsService["buildSummaryCard"]>;
    type ProgramGroup = {
      programId: string;
      therapistName: string;
      periodYear: number;
      periodMonth: number;
      areas: SummaryCard[];
    };

    const items: (SummaryCard | ProgramGroup)[] = [];
    const seenPrograms = new Set<string>();

    for (const fu of followUps) {
      const card = this.buildSummaryCard(fu as Parameters<FollowUpsService["buildSummaryCard"]>[0]);
      if (!fu.programId) {
        items.push(card);
        continue;
      }
      if (seenPrograms.has(fu.programId)) continue;
      seenPrograms.add(fu.programId);
      const programFollowUps = followUps.filter((row) => row.programId === fu.programId);
      items.push({
        programId: fu.programId,
        therapistName: fu.therapist.fullName,
        periodYear: fu.periodYear,
        periodMonth: fu.periodMonth,
        areas: programFollowUps.map((row) =>
          this.buildSummaryCard(row as Parameters<FollowUpsService["buildSummaryCard"]>[0]),
        ),
      });
    }

    return items;
  }

  private buildSummaryCard(fu: {
    id: string;
    periodYear: number;
    periodMonth: number;
    createdAt: Date;
    updatedAt: Date;
    generalNotes: string | null;
    homeWork: string | null;
    parentComments: string | null;
    observationsAuthor: string | null;
    area: { id: string; key: string; name: string; trackingMode: string };
    therapist: { id: string; fullName: string };
    objectives: { id: string; idx: number; text: string; monthlyNotes: string | null }[];
    sessions: { id: string; sessionDate: Date; marks: { objectiveId: string; code: string | null; progressScale: number | null }[] }[];
  }) {
    const attendance = computeAttendancePercent(
      fu.sessions.map((s) => ({
        sessionDate: s.sessionDate,
        marks: s.marks,
      })),
    );

    const objectives = lastObjectiveScores(
      fu.objectives,
      fu.sessions.map((s) => ({
        sessionDate: s.sessionDate,
        marks: s.marks.map((m) => ({
          objectiveId: m.objectiveId,
          code: m.code,
          progressScale: m.progressScale,
        })),
      })),
    );

    return {
      followUpId: fu.id,
      periodYear: fu.periodYear,
      periodMonth: fu.periodMonth,
      area: fu.area,
      therapist: fu.therapist,
      attendance,
      objectives,
      generalNotes: fu.generalNotes,
      homeWork: fu.homeWork,
      parentComments: fu.parentComments,
      observationsAuthor: fu.observationsAuthor,
      sessionCount: fu.sessions.length,
      createdAt: fu.createdAt,
      updatedAt: fu.updatedAt,
    };
  }

  async getReport(user: AuthUser, id: string) {
    const fu = await this.get(user, id);
    return this.buildFollowUpReport(fu);
  }

  async getBulkReport(user: AuthUser, ids: string[]) {
    const orderedIds = ids.filter((id, idx) => ids.indexOf(id) === idx);
    const reports: ReturnType<FollowUpsService["buildFollowUpReport"]>[] = [];
    for (const id of orderedIds) {
      const fu = await this.get(user, id);
      reports.push(this.buildFollowUpReport(fu));
    }
    return {
      generatedAt: new Date().toISOString(),
      reports,
    };
  }

  /** Expediente para portal de papás: seguimientos visibles + documentos. */
  async buildParentPatientDossier(user: AuthUser, patientId: string) {
    await this.access.assertCanViewPatient(user, patientId);

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, birthDate: true, notes: true },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    const followUps = await this.prisma.followUp.findMany({
      where: {
        patientId,
        status: FollowUpStatus.CLOSED,
        visibleToParent: true,
      },
      orderBy: [
        { periodYear: "desc" },
        { periodMonth: "desc" },
        { area: { sortOrder: "asc" } },
      ],
      include: followUpInclude,
    });

    const documents = await this.prisma.patientDocument.findMany({
      where: { patientId },
      select: {
        id: true,
        category: true,
        fileName: true,
        mimeType: true,
        createdAt: true,
      },
      orderBy: [{ category: "asc" }, { createdAt: "desc" }],
    });

    const reports = followUps.map((fu) => this.buildFollowUpReport(fu));
    const monthBuckets = new Map<string, typeof reports>();
    for (const report of reports) {
      const key = `${report.followUp.periodYear}-${String(report.followUp.periodMonth).padStart(2, "0")}`;
      const list = monthBuckets.get(key) ?? [];
      list.push(report);
      monthBuckets.set(key, list);
    }

    const months = [...monthBuckets.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, followUpReports]) => {
        const [yearStr, monthStr] = key.split("-");
        return {
          periodYear: Number(yearStr),
          periodMonth: Number(monthStr),
          followUpReports,
        };
      });

    return {
      generatedAt: new Date().toISOString(),
      patient,
      documents,
      months,
      totalFollowUps: followUps.length,
      totalMonths: months.length,
    };
  }

  /** Expediente consolidado por mes (solo invocar desde rutas admin). */
  async buildPatientDossier(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, birthDate: true, notes: true },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    const followUps = await this.prisma.followUp.findMany({
      where: { patientId },
      orderBy: [
        { periodYear: "desc" },
        { periodMonth: "desc" },
        { area: { sortOrder: "asc" } },
        { createdAt: "desc" },
      ],
      include: followUpInclude,
    });

    const documents = await this.prisma.patientDocument.findMany({
      where: { patientId },
      select: {
        id: true,
        category: true,
        fileName: true,
        mimeType: true,
        createdAt: true,
      },
      orderBy: [{ category: "asc" }, { createdAt: "desc" }],
    });

    const reports = followUps.map((fu) => this.buildFollowUpReport(fu));

    const monthBuckets = new Map<string, typeof reports>();
    for (const report of reports) {
      const key = `${report.followUp.periodYear}-${String(report.followUp.periodMonth).padStart(2, "0")}`;
      const list = monthBuckets.get(key) ?? [];
      list.push(report);
      monthBuckets.set(key, list);
    }

    const months = [...monthBuckets.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, followUpReports]) => {
        const [yearStr, monthStr] = key.split("-");
        return {
          periodYear: Number(yearStr),
          periodMonth: Number(monthStr),
          followUpReports,
        };
      });

    return {
      generatedAt: new Date().toISOString(),
      patient,
      documents,
      months,
      totalFollowUps: followUps.length,
      totalMonths: months.length,
    };
  }

  private buildFollowUpReport(fu: Awaited<ReturnType<FollowUpsService["get"]>>) {
    const attendance = computeAttendancePercent(
      fu.sessions.map((s) => ({
        sessionDate: s.sessionDate,
        marks: s.marks,
      })),
    );

    const objectiveProgress = lastObjectiveScores(fu.objectives, fu.sessions);

    return {
      generatedAt: new Date().toISOString(),
      followUp: {
        id: fu.id,
        status: fu.status,
        periodYear: fu.periodYear,
        periodMonth: fu.periodMonth,
        generalGoal: fu.generalGoal,
        generalNotes: fu.generalNotes,
        homeWork: fu.homeWork,
        parentComments: fu.parentComments,
        observationsAuthor: fu.observationsAuthor,
        patient: fu.patient,
        therapist: fu.therapist,
        area: fu.area,
      },
      summary: {
        attendance,
        objectiveProgress,
        sessionCount: fu.sessions.length,
        objectiveCount: fu.objectives.length,
      },
      objectives: fu.objectives.map((o) => ({
        id: o.id,
        idx: o.idx,
        text: o.text,
        activities: o.activities,
        monthlyNotes: o.monthlyNotes,
      })),
      sessions: fu.sessions.map((s) => ({
        id: s.id,
        sessionDate: s.sessionDate,
        therapist: s.therapist,
        attendance: sessionAttendanceFromMarks(s.marks),
        marks: s.marks.map((m) => {
          const objective = fu.objectives.find((o) => o.id === m.objectiveId);
          return {
            id: m.id,
            objectiveId: m.objectiveId,
            objectiveIdx: objective?.idx ?? null,
            objectiveText: objective?.text ?? null,
            code: m.code,
            progressScale: m.progressScale,
            progressPercent: progressScaleToPercent(m.progressScale),
            note: m.note,
          };
        }),
      })),
      attachments: fu.attachments,
      metrics: fu.metrics,
    };
  }

  async createOrGet(user: AuthUser, dto: CreateFollowUpDto) {
    const area = await this.prisma.area.findUnique({ where: { id: dto.areaId } });
    if (!area) throw new NotFoundException("Área no encontrada");

    await this.access.assertCanEditPatientFollowUps(user, dto.patientId, area.key);
    this.access.assertRoleCanUseArea(user, area.key, area.trackingMode);

    let therapistId: string;
    if (this.access.isAdmin(user)) {
      therapistId = dto.therapistId ?? user.sub;
    } else if (user.roles.includes("PARENT") || user.roles.includes("SECRETARY")) {
      therapistId = user.sub;
    } else if (user.roles.includes("THERAPIST")) {
      therapistId = user.sub;
    } else {
      therapistId = dto.therapistId ?? user.sub;
    }

    if (!therapistId) throw new BadRequestException("Terapeuta / responsable requerido");

    if (user.roles.includes("THERAPIST") && !this.access.isAdmin(user) && therapistId !== user.sub) {
      throw new ForbiddenException("Debe crear el seguimiento a su nombre");
    }

    if (area.trackingMode === "MONTHLY_GRID") {
      await this.ensureSingleTherapistAssignment(dto.patientId, therapistId);
    }

    const programId =
      area.trackingMode === "MONTHLY_GRID"
        ? (
            await this.getOrCreateProgramRecord(
              dto.patientId,
              therapistId,
              dto.periodYear,
              dto.periodMonth,
            )
          ).id
        : null;

    const { prevYear, prevMonth } = previousCalendarMonth(dto.periodYear, dto.periodMonth);

    const prevFu = await this.prisma.followUp.findFirst({
      where: {
        patientId: dto.patientId,
        therapistId,
        areaId: dto.areaId,
        periodYear: prevYear,
        periodMonth: prevMonth,
      },
      include: {
        objectives: { orderBy: { idx: "asc" } },
        sessions: { include: { marks: true } },
      },
    });

    let createdId: string;
    try {
      const created = await this.prisma.followUp.create({
        data: {
          patientId: dto.patientId,
          therapistId,
          areaId: dto.areaId,
          programId,
          periodYear: dto.periodYear,
          periodMonth: dto.periodMonth,
          generalGoal: dto.generalGoal ?? null,
          generalNotes: dto.generalNotes ?? null,
          homeWork: dto.homeWork ?? null,
        },
        select: { id: true },
      });
      createdId = created.id;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException(
          "Ya existe un seguimiento para este paciente, área y mes. Si la base de datos ya fue actualizada, intente de nuevo en unos minutos.",
        );
      }
      throw e;
    }

    const objectivesToCopy = prevFu ? objectivesEligibleForCarry(prevFu) : [];
    if (objectivesToCopy.length) {
      await this.prisma.followUpObjective.createMany({
        data: objectivesToCopy.map((o, i) => ({
          followUpId: createdId,
          idx: i + 1,
          text: o.text,
        })),
      });
    }

    return this.get(user, createdId);
  }

  /** Publica un seguimiento (status CLOSED). Reutilizado por programación mensual. */
  async publishFollowUp(user: AuthUser, id: string) {
    await this.access.assertCanEditFollowUp(user, id);
    await this.prisma.followUp.update({
      where: { id },
      data: { status: FollowUpStatus.CLOSED },
    });
  }

  /** Revierte un seguimiento publicado a borrador (solo ADMIN). */
  async unpublishFollowUp(user: AuthUser, id: string) {
    const fu = await this.access.getFollowUpForAccess(id);
    if (fu.status !== FollowUpStatus.CLOSED) return;
    if (!this.access.isAdmin(user)) {
      throw new ForbiddenException("Solo administradores pueden reabrir seguimientos");
    }
    await this.prisma.followUp.update({
      where: { id },
      data: { status: FollowUpStatus.DRAFT },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateFollowUpDto) {
    const fu = await this.access.getFollowUpForAccess(id);

    if (dto.status === FollowUpStatus.CLOSED) {
      await this.access.assertCanEditFollowUp(user, id);
    } else if (dto.status && dto.status !== fu.status) {
      if (!this.access.isAdmin(user)) {
        throw new ForbiddenException("Solo administradores pueden reabrir seguimientos");
      }
    } else {
      await this.access.assertCanEditFollowUp(user, id);
    }

    await this.prisma.followUp.update({
      where: { id },
      data: {
        generalGoal: dto.generalGoal ?? undefined,
        generalNotes: dto.generalNotes ?? undefined,
        homeWork: dto.homeWork ?? undefined,
        parentComments: dto.parentComments ?? undefined,
        observationsAuthor: dto.observationsAuthor ?? undefined,
        status: dto.status ?? undefined,
        visibleToParent: dto.visibleToParent ?? undefined,
        visibleToTherapist: dto.visibleToTherapist ?? undefined,
        visibleToSchool: dto.visibleToSchool ?? undefined,
      },
    });
    return this.get(user, id);
  }

  async deleteFollowUp(user: AuthUser, id: string) {
    const fu = await this.access.getFollowUpForAccess(id);

    if (fu.status === FollowUpStatus.CLOSED) {
      if (!this.access.isOfficeStaff(user)) {
        throw new ForbiddenException(
          "Solo administradores o secretaria pueden eliminar seguimientos publicados",
        );
      }
    } else {
      // Borradores: quien pueda editarlos puede borrarlos
      await this.access.assertCanEditFollowUp(user, id);
    }

    await this.prisma.followUp.delete({ where: { id } });
    return { ok: true };
  }

  async replaceObjectives(user: AuthUser, id: string, dto: ReplaceObjectivesDto) {
    await this.access.assertCanEditFollowUp(user, id);
    await this.replaceObjectivesInternal(
      id,
      dto.objectives.map((text) => ({ text })),
    );
    return this.get(user, id);
  }

  /** Reemplaza objetivos (texto y actividades opcionales). Usado por programación individual. */
  async replaceObjectivesWithMeta(
    user: AuthUser,
    followUpId: string,
    objectives: { id?: string; text: string; activities?: string | null }[],
    options?: { skipAccessCheck?: boolean },
  ) {
    if (!options?.skipAccessCheck) {
      await this.access.assertCanEditFollowUp(user, followUpId);
    }
    return this.replaceObjectivesInternal(followUpId, objectives);
  }

  private async replaceObjectivesInternal(
    id: string,
    objectives: { id?: string; text: string; activities?: string | null }[],
  ) {
    const fu = await this.prisma.followUp.findUnique({
      where: { id },
      include: {
        objectives: {
          include: { _count: { select: { marks: true } } },
        },
      },
    });
    if (!fu) throw new NotFoundException("FollowUp not found");

    const normalized = objectives
      .map((o) => ({
        id: o.id,
        text: o.text.trim(),
        activities: o.activities ?? null,
      }))
      .filter((o) => o.text.length > 0);

    const usedIds = new Set<string>();

    for (let i = 0; i < normalized.length; i++) {
      const { id: objectiveId, text, activities } = normalized[i];
      const idx = i + 1;

      let match =
        (objectiveId
          ? fu.objectives.find((o) => o.id === objectiveId && o.idx < ARCHIVED_OBJECTIVE_IDX)
          : undefined) ??
        fu.objectives.find((o) => !usedIds.has(o.id) && o.text === text && o.idx < ARCHIVED_OBJECTIVE_IDX) ??
        fu.objectives.find((o) => !usedIds.has(o.id) && o.idx === idx && o.idx < ARCHIVED_OBJECTIVE_IDX);

      if (match) {
        await this.prisma.followUpObjective.update({
          where: { id: match.id },
          data: { text, idx, activities },
        });
        usedIds.add(match.id);
      } else {
        const created = await this.prisma.followUpObjective.create({
          data: { followUpId: id, idx, text, activities },
        });
        usedIds.add(created.id);
      }
    }

    let archiveIdx = ARCHIVED_OBJECTIVE_IDX;
    for (const obj of fu.objectives) {
      if (usedIds.has(obj.id)) continue;
      if (obj._count.marks > 0) {
        await this.prisma.followUpObjective.update({
          where: { id: obj.id },
          data: { idx: archiveIdx++ },
        });
      } else {
        await this.prisma.followUpObjective.delete({ where: { id: obj.id } });
      }
    }

    return { ok: true };
  }

  async updateObjectiveNotes(user: AuthUser, id: string, dto: UpdateObjectiveNotesDto) {
    await this.access.assertCanEditFollowUp(user, id);
    for (const item of dto.notes) {
      await this.prisma.followUpObjective.updateMany({
        where: { id: item.objectiveId, followUpId: id },
        data: { monthlyNotes: item.monthlyNotes ?? null },
      });
    }
    return this.get(user, id);
  }

  async createSession(user: AuthUser, followUpId: string, dto: CreateFollowUpSessionDto) {
    await this.access.assertCanEditFollowUp(user, followUpId);
    const fu = await this.get(user, followUpId);
    const therapistId = dto.therapistId ?? fu.therapistId ?? user.sub;

    if (user.roles.includes("THERAPIST") && !this.access.isAdmin(user) && therapistId !== user.sub) {
      throw new ForbiddenException("Solo puede registrar sesiones a su nombre");
    }

    const sessionDate = normalizeUtcDate(dto.sessionDate);

    if (
      sessionDate.getUTCFullYear() !== fu.periodYear ||
      sessionDate.getUTCMonth() + 1 !== fu.periodMonth
    ) {
      throw new BadRequestException("La fecha debe pertenecer al mes del seguimiento");
    }

    try {
      await this.prisma.followUpSession.create({
        data: { followUpId, therapistId, sessionDate },
      });
    } catch {
      throw new BadRequestException("Ya existe una sesión registrada para esa fecha");
    }

    return this.get(user, followUpId);
  }

  async deleteSession(user: AuthUser, followUpId: string, sessionId: string) {
    await this.access.assertCanEditFollowUp(user, followUpId);
    const session = await this.prisma.followUpSession.findFirst({
      where: { id: sessionId, followUpId },
    });
    if (!session) throw new NotFoundException("Sesión no encontrada");
    await this.prisma.followUpSession.delete({ where: { id: sessionId } });
    return this.get(user, followUpId);
  }

  async upsertMark(user: AuthUser, followUpId: string, sessionId: string, dto: UpsertMarkDto) {
    await this.access.assertCanEditFollowUp(user, followUpId);

    const session = await this.prisma.followUpSession.findFirst({
      where: { id: sessionId, followUpId },
    });
    if (!session) throw new NotFoundException("Sesión no encontrada");

    const objective = await this.prisma.followUpObjective.findFirst({
      where: { id: dto.objectiveId, followUpId },
    });
    if (!objective) throw new NotFoundException("Objetivo no encontrado");

    if (dto.code != null && dto.progressScale != null) {
      throw new BadRequestException("Indique código (A–X) o escala 0–4, no ambos");
    }

    await this.prisma.followUpMark.deleteMany({
      where: { followUpSessionId: sessionId, objectiveId: dto.objectiveId },
    });

    if (dto.code != null || dto.progressScale != null) {
      await this.prisma.followUpMark.create({
        data: {
          followUpSessionId: sessionId,
          objectiveId: dto.objectiveId,
          code: dto.code ?? null,
          progressScale: dto.progressScale ?? null,
        },
      });
    }

    return this.get(user, followUpId);
  }

  private async getOrCreateProgramRecord(
    patientId: string,
    therapistId: string,
    periodYear: number,
    periodMonth: number,
  ) {
    return this.prisma.followUpProgram.upsert({
      where: {
        patientId_therapistId_periodYear_periodMonth: {
          patientId,
          therapistId,
          periodYear,
          periodMonth,
        },
      },
      create: { patientId, therapistId, periodYear, periodMonth },
      update: {},
    });
  }

  private async ensureSingleTherapistAssignment(patientId: string, therapistId: string) {
    const existing = await this.prisma.patientTherapist.findMany({
      where: { patientId },
      select: { therapistId: true },
    });

    if (existing.some((a) => a.therapistId === therapistId)) return;

    await this.prisma.patientTherapist.deleteMany({ where: { patientId } });
    await this.prisma.patientTherapist.create({
      data: { patientId, therapistId },
    });
  }
}

function previousCalendarMonth(year: number, month: number): { prevYear: number; prevMonth: number } {
  if (month <= 1) return { prevYear: year - 1, prevMonth: 12 };
  return { prevYear: year, prevMonth: month - 1 };
}

function normalizeUtcDate(iso: string): Date {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function maxProgressScaleForObjective(
  objectiveId: string,
  sessions: { marks: { objectiveId: string; progressScale: number | null }[] }[],
): number | null {
  let max: number | null = null;
  for (const session of sessions) {
    for (const mark of session.marks) {
      if (mark.objectiveId !== objectiveId || mark.progressScale == null) continue;
      if (max == null || mark.progressScale > max) max = mark.progressScale;
    }
  }
  return max;
}

function objectivesEligibleForCarry(prevFu: {
  objectives: { id: string; idx: number; text: string }[];
  sessions: { marks: { objectiveId: string; progressScale: number | null }[] }[];
}) {
  return prevFu.objectives
    .filter((o) => o.idx < ARCHIVED_OBJECTIVE_IDX)
    .filter((o) => maxProgressScaleForObjective(o.id, prevFu.sessions) !== 4)
    .sort((a, b) => a.idx - b.idx);
}
