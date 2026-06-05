import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
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
    } = {
      patientId,
      ...(year ? { periodYear: year } : {}),
      ...(month ? { periodMonth: month } : {}),
    };

    if (user.roles.includes("THERAPIST") && !this.access.isAdmin(user)) {
      where.therapistId = user.sub;
    }

    return this.prisma.followUp.findMany({
      where,
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
      include: {
        area: { select: { id: true, key: true, name: true, category: true, trackingMode: true } },
        therapist: { select: { id: true, fullName: true, email: true, status: true } },
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async listForTherapist(user: AuthUser, year?: number, month?: number) {
    if (!user.roles.includes("THERAPIST") && !this.access.isAdmin(user)) {
      throw new ForbiddenException("Solo terapeutas");
    }

    const therapistId = user.sub;
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;

    return this.prisma.followUp.findMany({
      where: {
        therapistId,
        periodYear: y,
        periodMonth: m,
        patient: { assignments: { some: { therapistId } } },
      },
      orderBy: [{ patient: { lastName: "asc" } }, { area: { sortOrder: "asc" } }],
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

    const now = new Date();
    const periodYear = year ?? now.getFullYear();
    const periodMonth = month ?? now.getMonth() + 1;

    const followUps = await this.prisma.followUp.findMany({
      where: { patientId, periodYear, periodMonth },
      include: {
        area: { select: { id: true, key: true, name: true, trackingMode: true } },
        therapist: { select: { id: true, fullName: true } },
        objectives: { orderBy: { idx: "asc" } },
        sessions: {
          orderBy: { sessionDate: "asc" },
          include: { marks: true },
        },
      },
      orderBy: { area: { sortOrder: "asc" } },
    });

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    return {
      patient,
      periodYear,
      periodMonth,
      followUps: followUps.map((fu) => this.buildSummaryCard(fu)),
    };
  }

  private buildSummaryCard(fu: {
    id: string;
    periodYear: number;
    periodMonth: number;
    generalNotes: string | null;
    homeWork: string | null;
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
      area: fu.area,
      therapist: fu.therapist,
      attendance,
      objectives,
      generalNotes: fu.generalNotes,
      homeWork: fu.homeWork,
      sessionCount: fu.sessions.length,
    };
  }

  async getReport(user: AuthUser, id: string) {
    const fu = await this.get(user, id);

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
    await this.access.assertCanEditPatientFollowUps(user, dto.patientId);

    if (user.roles.includes("THERAPIST") && !this.access.isAdmin(user) && dto.therapistId !== user.sub) {
      throw new ForbiddenException("Debe crear el seguimiento a su nombre");
    }

    const existing = await this.prisma.followUp.findFirst({
      where: {
        patientId: dto.patientId,
        therapistId: dto.therapistId,
        areaId: dto.areaId,
        periodYear: dto.periodYear,
        periodMonth: dto.periodMonth,
      },
      select: { id: true },
    });
    if (existing) return this.get(user, existing.id);

    const { prevYear, prevMonth } = previousCalendarMonth(dto.periodYear, dto.periodMonth);

    const prevFu = await this.prisma.followUp.findFirst({
      where: {
        patientId: dto.patientId,
        therapistId: dto.therapistId,
        areaId: dto.areaId,
        periodYear: prevYear,
        periodMonth: prevMonth,
      },
      include: { objectives: { orderBy: { idx: "asc" } } },
    });

    const created = await this.prisma.followUp.create({
      data: {
        patientId: dto.patientId,
        therapistId: dto.therapistId,
        areaId: dto.areaId,
        periodYear: dto.periodYear,
        periodMonth: dto.periodMonth,
        generalGoal: dto.generalGoal ?? null,
        generalNotes: dto.generalNotes ?? null,
        homeWork: dto.homeWork ?? null,
      },
      select: { id: true },
    });

    if (prevFu?.objectives?.length) {
      await this.prisma.followUpObjective.createMany({
        data: prevFu.objectives.map((o) => ({
          followUpId: created.id,
          idx: o.idx,
          text: o.text,
        })),
      });
    }

    return this.get(user, created.id);
  }

  async update(user: AuthUser, id: string, dto: UpdateFollowUpDto) {
    await this.access.assertCanEditFollowUp(user, id);
    await this.prisma.followUp.update({
      where: { id },
      data: {
        generalGoal: dto.generalGoal ?? undefined,
        generalNotes: dto.generalNotes ?? undefined,
        homeWork: dto.homeWork ?? undefined,
        status: dto.status ?? undefined,
      },
    });
    return this.get(user, id);
  }

  async replaceObjectives(user: AuthUser, id: string, dto: ReplaceObjectivesDto) {
    await this.access.assertCanEditFollowUp(user, id);
    await this.prisma.followUpObjective.deleteMany({ where: { followUpId: id } });

    if (dto.objectives.length) {
      await this.prisma.followUpObjective.createMany({
        data: dto.objectives.map((text, i) => ({
          followUpId: id,
          idx: i + 1,
          text,
        })),
      });
    }

    return this.get(user, id);
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
    const therapistId = dto.therapistId ?? user.sub ?? fu.therapistId;

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
}

function previousCalendarMonth(year: number, month: number): { prevYear: number; prevMonth: number } {
  if (month <= 1) return { prevYear: year - 1, prevMonth: 12 };
  return { prevYear: year, prevMonth: month - 1 };
}

function normalizeUtcDate(iso: string): Date {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}
