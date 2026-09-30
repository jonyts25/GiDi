import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AreaTrackingMode } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth-user";
import { FollowUpAccessService } from "./followup-access.service";
import { FollowUpsService } from "./followups.service";
import {
  CreateFollowUpProgramDto,
  ProgramAreaRowDto,
} from "./dto/followup-program.dto";

const ARCHIVED_OBJECTIVE_IDX = 1000;

function previousCalendarMonth(year: number, month: number): { prevYear: number; prevMonth: number } {
  if (month <= 1) return { prevYear: year - 1, prevMonth: 12 };
  return { prevYear: year, prevMonth: month - 1 };
}

function normalizeUtcDate(iso: string): Date {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class FollowUpProgramService {
  constructor(
    private prisma: PrismaService,
    private access: FollowUpAccessService,
    private followUps: FollowUpsService,
  ) {}

  async listByPatient(user: AuthUser, patientId: string, year?: number, month?: number) {
    await this.access.assertCanViewPatient(user, patientId);

    return this.prisma.followUpProgram.findMany({
      where: {
        patientId,
        ...(year ? { periodYear: year } : {}),
        ...(month ? { periodMonth: month } : {}),
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
      include: {
        therapist: { select: { id: true, fullName: true, email: true } },
        followUps: {
          include: {
            area: { select: { id: true, key: true, name: true, sortOrder: true, trackingMode: true } },
          },
          orderBy: { area: { sortOrder: "asc" } },
        },
      },
    });
  }

  async createOrGet(user: AuthUser, dto: CreateFollowUpProgramDto) {
    await this.access.assertCanCreateProgram(user, dto);
    if (dto.periodMonth < 1 || dto.periodMonth > 12) {
      throw new BadRequestException("Mes inválido");
    }

    const program = await this.prisma.followUpProgram.upsert({
      where: {
        patientId_therapistId_periodYear_periodMonth: {
          patientId: dto.patientId,
          therapistId: dto.therapistId,
          periodYear: dto.periodYear,
          periodMonth: dto.periodMonth,
        },
      },
      create: {
        patientId: dto.patientId,
        therapistId: dto.therapistId,
        periodYear: dto.periodYear,
        periodMonth: dto.periodMonth,
      },
      update: {},
      include: {
        therapist: { select: { id: true, fullName: true, email: true } },
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return program;
  }

  async get(user: AuthUser, programId: string) {
    await this.access.assertCanViewProgram(user, programId);

    const program = await this.prisma.followUpProgram.findUnique({
      where: { id: programId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        therapist: { select: { id: true, fullName: true, email: true } },
        followUps: {
          where: {
            area: { trackingMode: AreaTrackingMode.MONTHLY_GRID },
          },
          include: {
            area: { select: { id: true, name: true, sortOrder: true, key: true } },
            objectives: {
              where: { idx: { lt: ARCHIVED_OBJECTIVE_IDX } },
              orderBy: { idx: "asc" },
            },
            sessions: {
              orderBy: { sessionDate: "asc" },
              include: { marks: true },
            },
          },
          orderBy: { area: { sortOrder: "asc" } },
        },
      },
    });

    if (!program) throw new NotFoundException("Programación no encontrada");

    const globalNoByObjectiveId = new Map<string, number>();
    let globalNo = 1;

    const areas = program.followUps.map((fu) => {
      const objectives = fu.objectives.map((o) => {
        globalNoByObjectiveId.set(o.id, globalNo);
        return {
          id: o.id,
          idx: o.idx,
          globalNo: globalNo++,
          text: o.text,
          activities: o.activities,
        };
      });

      return {
        areaId: fu.area.id,
        areaName: fu.area.name,
        areaSortOrder: fu.area.sortOrder,
        followUpId: fu.id,
        objectives,
      };
    });

    const sessionMap = new Map<
      string,
      { date: string; entries: { followUpId: string; sessionId: string; areaId: string }[] }
    >();

    const marks: {
      followUpId: string;
      sessionId: string;
      objectiveId: string;
      globalNo: number;
      code: string | null;
      progressScale: number | null;
      note: string | null;
    }[] = [];

    for (const fu of program.followUps) {
      for (const session of fu.sessions) {
        const key = dateKey(session.sessionDate);
        const bucket = sessionMap.get(key) ?? { date: key, entries: [] };
        bucket.entries.push({
          followUpId: fu.id,
          sessionId: session.id,
          areaId: fu.area.id,
        });
        sessionMap.set(key, bucket);

        for (const mark of session.marks) {
          const gNo = globalNoByObjectiveId.get(mark.objectiveId);
          if (gNo == null) continue;
          marks.push({
            followUpId: fu.id,
            sessionId: session.id,
            objectiveId: mark.objectiveId,
            globalNo: gNo,
            code: mark.code,
            progressScale: mark.progressScale,
            note: mark.note,
          });
        }
      }
    }

    const sessions = [...sessionMap.values()].sort((a, b) => a.date.localeCompare(b.date));

    return {
      program: {
        id: program.id,
        patientId: program.patientId,
        therapistId: program.therapistId,
        periodYear: program.periodYear,
        periodMonth: program.periodMonth,
        patient: program.patient,
        therapist: program.therapist,
        createdAt: program.createdAt,
        updatedAt: program.updatedAt,
      },
      areas,
      sessions,
      marks,
    };
  }

  async putRows(user: AuthUser, programId: string, rows: ProgramAreaRowDto[]) {
    await this.access.assertCanEditProgram(user, programId);

    const program = await this.prisma.followUpProgram.findUnique({
      where: { id: programId },
      include: {
        followUps: {
          include: {
            area: { select: { id: true, name: true, trackingMode: true } },
          },
        },
      },
    });
    if (!program) throw new NotFoundException("Programación no encontrada");

    const payloadAreaIds = new Set(rows.map((r) => r.areaId));

    for (const fu of program.followUps) {
      if (payloadAreaIds.has(fu.areaId)) continue;
      const markCount = await this.prisma.followUpMark.count({
        where: { session: { followUpId: fu.id } },
      });
      if (markCount > 0) {
        throw new BadRequestException(
          `No se puede quitar el área «${fu.area.name}» porque ya tiene marcas registradas.`,
        );
      }
      await this.prisma.followUp.delete({ where: { id: fu.id } });
    }

    const programSessionDates = await this.existingProgramSessionDates(program.id);

    for (const row of rows) {
      const area = await this.prisma.area.findUnique({ where: { id: row.areaId } });
      if (!area) throw new NotFoundException("Área no encontrada");
      if (area.trackingMode !== AreaTrackingMode.MONTHLY_GRID) {
        throw new BadRequestException(`El área «${area.name}» no admite programación en cuadrícula`);
      }

      let followUp = await this.prisma.followUp.findFirst({
        where: {
          programId: program.id,
          areaId: row.areaId,
        },
      });

      if (!followUp) {
        followUp = await this.prisma.followUp.create({
          data: {
            patientId: program.patientId,
            therapistId: program.therapistId,
            areaId: row.areaId,
            programId: program.id,
            periodYear: program.periodYear,
            periodMonth: program.periodMonth,
          },
        });
        await this.createSessionsForNewFollowUp(
          followUp.id,
          program.therapistId,
          programSessionDates,
        );
      }

      await this.followUps.replaceObjectivesWithMeta(user, followUp.id, row.objectives, {
        skipAccessCheck: true,
      });
    }

    return this.get(user, programId);
  }

  async addSession(user: AuthUser, programId: string, dateIso: string) {
    await this.access.assertCanEditProgram(user, programId);

    const program = await this.prisma.followUpProgram.findUnique({
      where: { id: programId },
      include: { followUps: { select: { id: true, therapistId: true } } },
    });
    if (!program) throw new NotFoundException("Programación no encontrada");
    if (program.followUps.length === 0) {
      throw new BadRequestException("La programación no tiene áreas; guarde filas primero.");
    }

    const sessionDate = normalizeUtcDate(dateIso);
    if (
      sessionDate.getUTCFullYear() !== program.periodYear ||
      sessionDate.getUTCMonth() + 1 !== program.periodMonth
    ) {
      throw new BadRequestException("La fecha debe pertenecer al mes de la programación");
    }

    for (const fu of program.followUps) {
      const exists = await this.prisma.followUpSession.findFirst({
        where: { followUpId: fu.id, sessionDate },
      });
      if (exists) continue;

      await this.prisma.followUpSession.create({
        data: {
          followUpId: fu.id,
          therapistId: fu.therapistId,
          sessionDate,
        },
      });
    }

    return this.get(user, programId);
  }

  async deleteSession(user: AuthUser, programId: string, dateIso: string) {
    await this.access.assertCanEditProgram(user, programId);

    const program = await this.prisma.followUpProgram.findUnique({
      where: { id: programId },
      include: { followUps: { select: { id: true } } },
    });
    if (!program) throw new NotFoundException("Programación no encontrada");

    const sessionDate = normalizeUtcDate(dateIso);
    const followUpIds = program.followUps.map((fu) => fu.id);

    await this.prisma.followUpSession.deleteMany({
      where: {
        followUpId: { in: followUpIds },
        sessionDate,
      },
    });

    return this.get(user, programId);
  }

  async copyFromPrevious(user: AuthUser, programId: string) {
    await this.access.assertCanEditProgram(user, programId);

    const program = await this.access.getProgramForAccess(programId);
    const { prevYear, prevMonth } = previousCalendarMonth(program.periodYear, program.periodMonth);

    const prevProgram = await this.prisma.followUpProgram.findUnique({
      where: {
        patientId_therapistId_periodYear_periodMonth: {
          patientId: program.patientId,
          therapistId: program.therapistId,
          periodYear: prevYear,
          periodMonth: prevMonth,
        },
      },
      include: {
        followUps: {
          where: { area: { trackingMode: AreaTrackingMode.MONTHLY_GRID } },
          include: {
            area: { select: { id: true, sortOrder: true } },
            objectives: {
              where: { idx: { lt: ARCHIVED_OBJECTIVE_IDX } },
              orderBy: { idx: "asc" },
            },
          },
          orderBy: { area: { sortOrder: "asc" } },
        },
      },
    });

    if (!prevProgram || prevProgram.followUps.length === 0) {
      throw new NotFoundException("No hay programación del mes anterior para copiar");
    }

    const rows: ProgramAreaRowDto[] = prevProgram.followUps.map((fu) => ({
      areaId: fu.areaId,
      objectives: fu.objectives.map((o) => ({
        text: o.text,
        activities: o.activities,
      })),
    }));

    return this.putRows(user, programId, rows);
  }

  /** Fechas de sesión ya registradas en cualquier área del programa. */
  private async existingProgramSessionDates(programId: string): Promise<Date[]> {
    const rows = await this.prisma.followUpSession.findMany({
      where: { followUp: { programId } },
      select: { sessionDate: true },
      distinct: ["sessionDate"],
      orderBy: { sessionDate: "asc" },
    });
    return rows.map((r) => r.sessionDate);
  }

  /** Replica columnas de sesión existentes al agregar un área nueva al programa. */
  private async createSessionsForNewFollowUp(
    followUpId: string,
    therapistId: string,
    sessionDates: Date[],
  ) {
    if (sessionDates.length === 0) return;

    await this.prisma.followUpSession.createMany({
      data: sessionDates.map((sessionDate) => ({
        followUpId,
        therapistId,
        sessionDate,
      })),
      skipDuplicates: true,
    });
  }
}
