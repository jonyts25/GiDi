import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

const REVAL_PREFIX = "[REVALUACIÓN]";
const REVAL_TAG = "reval-patient:";

/** Meses desde la última revaloración para generar alerta. */
const REVAL_ALERT_MONTHS = 6;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

@Injectable()
export class RevaluationAlertsService {
  constructor(private prisma: PrismaService) {}

  /** Pacientes activos con revaloración vencida (≥6 meses) y sin snooze vigente. */
  async listDuePatients() {
    const now = new Date();
    const patients = await this.prisma.patient.findMany({
      where: {
        status: "ACTIVE",
        lastRevaluationDate: { not: null },
        OR: [{ revaluationAlertSnoozedUntil: null }, { revaluationAlertSnoozedUntil: { lte: now } }],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        center: true,
        lastRevaluationDate: true,
        revaluationSkipReason: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return patients.filter((p) => {
      if (!p.lastRevaluationDate) return false;
      const dueAt = addMonths(p.lastRevaluationDate, REVAL_ALERT_MONTHS);
      return dueAt <= now;
    });
  }

  async snoozePatient(patientId: string, months: number) {
    const until = addMonths(new Date(), months);
    return this.prisma.patient.update({
      where: { id: patientId },
      data: {
        revaluationAlertSnoozedUntil: until,
        ...(months >= 12 ? {} : { revaluationSkipReason: null }),
      },
      select: { id: true, revaluationAlertSnoozedUntil: true },
    });
  }

  async skipPatient(patientId: string, reason: string) {
    const until = addMonths(new Date(), 12);
    return this.prisma.patient.update({
      where: { id: patientId },
      data: {
        revaluationSkipReason: reason.trim(),
        revaluationAlertSnoozedUntil: until,
      },
      select: { id: true, revaluationSkipReason: true, revaluationAlertSnoozedUntil: true },
    });
  }

  /** Sincroniza avisos automáticos de revaloración para ADMIN y SECRETARY. */
  async syncAnnouncementAlerts() {
    const due = await this.listDuePatients();
    const dueIds = new Set(due.map((p) => p.id));

    const existing = await this.prisma.announcement.findMany({
      where: { title: { startsWith: REVAL_PREFIX }, isActive: true },
      select: { id: true, title: true, body: true },
    });

    const systemUserId = await this.resolveSystemAuthorId();
    if (!systemUserId) return { synced: 0 };

    for (const patient of due) {
      const tag = `${REVAL_TAG}${patient.id}`;
      const found = existing.find((a) => a.body.includes(tag));
      const lastLabel = patient.lastRevaluationDate
        ? patient.lastRevaluationDate.toLocaleDateString("es-MX", { dateStyle: "long" })
        : "—";
      const body = `${tag}\nAl paciente ${patient.firstName} ${patient.lastName} le corresponde revaloración (última: ${lastLabel}). Revise la ficha en Pacientes.`;

      if (!found) {
        await this.prisma.announcement.create({
          data: {
            title: `${REVAL_PREFIX} ${patient.firstName} ${patient.lastName}`,
            body,
            audience: ["ADMIN", "SECRETARY"],
            isActive: true,
            createdById: systemUserId,
          },
        });
      } else if (found.body !== body) {
        await this.prisma.announcement.update({
          where: { id: found.id },
          data: { body, title: `${REVAL_PREFIX} ${patient.firstName} ${patient.lastName}` },
        });
      }
    }

    for (const ann of existing) {
      const match = ann.body.match(/reval-patient:([0-9a-f-]{36})/i);
      const pid = match?.[1];
      if (pid && !dueIds.has(pid)) {
        await this.prisma.announcement.update({
          where: { id: ann.id },
          data: { isActive: false },
        });
      }
    }

    return { synced: due.length };
  }

  private async resolveSystemAuthorId(): Promise<string | null> {
    const admin = await this.prisma.user.findFirst({
      where: { roles: { some: { role: { key: { in: ["ADMIN", "SUPERADMIN"] } } } } },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return admin?.id ?? null;
  }
}

export { REVAL_ALERT_MONTHS, addMonths };
