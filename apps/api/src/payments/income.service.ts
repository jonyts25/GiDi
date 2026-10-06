import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  GidiCenter,
  IncomeConcept,
  IncomeMethod,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { billingAmountFor, priorPeriodDebtPeriodFilter } from "./payment-config";
import { PAYMENT_COUNTING_CONCEPTS } from "./income-config";
import {
  aggregatePaymentFromEntries,
  PaymentCountingEntry,
  previousPeriod,
  resolveAmountDueFromBilling,
  resolveInheritedAmountDue,
} from "./recompute-payment";
import { isInactiveForPeriod, isPastOrCurrentPeriod } from "./payment-period";
import { CreateIncomeEntryDto, UpdateIncomeEntryDto } from "./dto/income-entry.dto";

const incomeSelect = {
  id: true,
  center: true,
  receivedAt: true,
  concept: true,
  patientId: true,
  payerName: true,
  amount: true,
  periodYear: true,
  periodMonth: true,
  method: true,
  invoiced: true,
  notes: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: { id: true, firstName: true, lastName: true } },
} as const;

function decimalToNumber(value: Prisma.Decimal | number): number {
  return typeof value === "number" ? value : Number(value);
}

function requiresPatientPeriod(concept: IncomeConcept): boolean {
  return concept === IncomeConcept.MENSUALIDAD || concept === IncomeConcept.SESION_INDIVIDUAL;
}

@Injectable()
export class IncomeService {
  constructor(private prisma: PrismaService) {}

  list(filters: {
    center?: GidiCenter;
    from?: Date;
    to?: Date;
    concept?: IncomeConcept;
    patientId?: string;
  }) {
    const where: Prisma.IncomeEntryWhereInput = {};
    if (filters.center) where.center = filters.center;
    if (filters.concept) where.concept = filters.concept;
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.from || filters.to) {
      where.receivedAt = {};
      if (filters.from) where.receivedAt.gte = filters.from;
      if (filters.to) where.receivedAt.lte = filters.to;
    }

    return this.prisma.incomeEntry.findMany({
      where,
      orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
      select: incomeSelect,
    });
  }

  async create(userId: string, dto: CreateIncomeEntryDto) {
    const data = await this.validateAndBuild(dto);
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.incomeEntry.create({
        data: { ...data, createdById: userId },
        select: incomeSelect,
      });
      if (created.patientId && created.periodYear && created.periodMonth) {
        await this.recomputePayment(tx, created.patientId, created.periodYear, created.periodMonth);
      }
      return created;
    });
  }

  async update(id: string, dto: UpdateIncomeEntryDto) {
    const existing = await this.prisma.incomeEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Ingreso no encontrado");

    const merged = {
      center: dto.center ?? existing.center,
      receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : existing.receivedAt,
      concept: dto.concept ?? existing.concept,
      patientId: dto.patientId === undefined ? existing.patientId : dto.patientId,
      payerName: dto.payerName === undefined ? existing.payerName : dto.payerName,
      amount: dto.amount ?? decimalToNumber(existing.amount),
      periodYear: dto.periodYear === undefined ? existing.periodYear : dto.periodYear,
      periodMonth: dto.periodMonth === undefined ? existing.periodMonth : dto.periodMonth,
      method: dto.method ?? existing.method,
      invoiced: dto.invoiced ?? existing.invoiced,
      notes: dto.notes === undefined ? existing.notes : dto.notes,
    };

    await this.validateEntryFields(merged);

    const prevPatientId = existing.patientId;
    const prevYear = existing.periodYear;
    const prevMonth = existing.periodMonth;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.incomeEntry.update({
        where: { id },
        data: {
          center: merged.center,
          receivedAt: merged.receivedAt,
          concept: merged.concept,
          patientId: merged.patientId,
          payerName: merged.payerName,
          amount: merged.amount,
          periodYear: merged.periodYear,
          periodMonth: merged.periodMonth,
          method: merged.method,
          invoiced: merged.invoiced,
          notes: merged.notes,
        },
        select: incomeSelect,
      });

      const periods = new Set<string>();
      if (prevPatientId && prevYear && prevMonth) {
        periods.add(`${prevPatientId}:${prevYear}:${prevMonth}`);
      }
      if (updated.patientId && updated.periodYear && updated.periodMonth) {
        periods.add(`${updated.patientId}:${updated.periodYear}:${updated.periodMonth}`);
      }

      for (const key of periods) {
        const [patientId, year, month] = key.split(":");
        await this.recomputePayment(tx, patientId, Number(year), Number(month));
      }

      return updated;
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.incomeEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Ingreso no encontrado");

    return this.prisma.$transaction(async (tx) => {
      await tx.incomeEntry.delete({ where: { id } });
      if (existing.patientId && existing.periodYear && existing.periodMonth) {
        await this.recomputePayment(
          tx,
          existing.patientId,
          existing.periodYear,
          existing.periodMonth,
        );
      }
      return { ok: true };
    });
  }

  async setBillingNotes(patientId: string, billingNotes: string | null | undefined) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException("Paciente no encontrado");
    return this.prisma.patient.update({
      where: { id: patientId },
      data: { billingNotes: billingNotes ?? null },
      select: { id: true, billingNotes: true },
    });
  }

  async ensureMonthRows(year: number, month: number, center?: GidiCenter) {
    if (month < 1 || month > 12) throw new BadRequestException("Mes inválido");
    if (!isPastOrCurrentPeriod(year, month)) return;

    const patients = await this.prisma.patient.findMany({
      where: {
        status: "ACTIVE",
        monthlyBillingStatus: { not: "NO_INTEGRADO" },
        ...(center ? { center } : {}),
      },
      select: {
        id: true,
        sessionsPerWeek: true,
        discountPercent: true,
        agreedMonthlyAmount: true,
        status: true,
        dischargedAt: true,
      },
    });

    const billablePatients = patients.filter((p) => !isInactiveForPeriod(p, year, month));
    if (billablePatients.length === 0) return;

    const patientIds = billablePatients.map((p) => p.id);
    const existing = await this.prisma.payment.findMany({
      where: {
        patientId: { in: patientIds },
        periodYear: year,
        periodMonth: month,
      },
      select: { patientId: true },
    });
    const hasPayment = new Set(existing.map((p) => p.patientId));
    const missing = billablePatients.filter((p) => !hasPayment.has(p.id));
    if (missing.length === 0) return;

    const missingIds = missing.map((p) => p.id);
    const historyRows = await this.prisma.payment.findMany({
      where: { patientId: { in: missingIds } },
      select: {
        patientId: true,
        periodYear: true,
        periodMonth: true,
        amountDue: true,
        status: true,
      },
    });

    const historyByPatient = new Map<string, Map<string, { amountDue: number; status: PaymentStatus }>>();
    for (const row of historyRows) {
      const key = `${row.periodYear}-${row.periodMonth}`;
      let map = historyByPatient.get(row.patientId);
      if (!map) {
        map = new Map();
        historyByPatient.set(row.patientId, map);
      }
      map.set(key, { amountDue: row.amountDue, status: row.status });
    }

    const toCreate = missing.map((patient) => ({
      patientId: patient.id,
      periodYear: year,
      periodMonth: month,
      amountDue: resolveInheritedAmountDue(
        patient,
        historyByPatient.get(patient.id) ?? new Map(),
        year,
        month,
      ),
      amountPaid: 0,
      status: PaymentStatus.PENDIENTE,
    }));

    if (toCreate.length === 0) return;

    await this.prisma.payment.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
  }

  async monthSheet(year: number, month: number, center?: GidiCenter) {
    if (month < 1 || month > 12) throw new BadRequestException("Mes inválido");

    await this.ensureMonthRows(year, month, center);

    const payments = await this.prisma.payment.findMany({
      where: {
        periodYear: year,
        periodMonth: month,
        ...(center ? { patient: { center } } : {}),
      },
      select: {
        patientId: true,
        amountDue: true,
        amountPaid: true,
        status: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            center: true,
            status: true,
            billingNotes: true,
          },
        },
      },
    });

    const activePatients = await this.prisma.patient.findMany({
      where: {
        status: "ACTIVE",
        ...(center ? { center } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        center: true,
        billingNotes: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const patientIds = new Set<string>();
    for (const p of activePatients) patientIds.add(p.id);
    for (const pay of payments) patientIds.add(pay.patientId);

    const entries = await this.prisma.incomeEntry.findMany({
      where: {
        patientId: { in: [...patientIds] },
        periodYear: year,
        periodMonth: month,
      },
      orderBy: [{ receivedAt: "asc" }],
      select: {
        patientId: true,
        receivedAt: true,
        amount: true,
        method: true,
      },
    });

    const entriesByPatient = new Map<string, typeof entries>();
    for (const e of entries) {
      if (!e.patientId) continue;
      const list = entriesByPatient.get(e.patientId) ?? [];
      list.push(e);
      entriesByPatient.set(e.patientId, list);
    }

    const paymentByPatient = new Map(payments.map((p) => [p.patientId, p]));
    const patientMap = new Map(activePatients.map((p) => [p.id, p]));
    for (const pay of payments) {
      if (!patientMap.has(pay.patient.id)) {
        patientMap.set(pay.patient.id, pay.patient);
      }
    }

    const { debtCarriedOver } = await this.priorPeriodDebtByPatient(year, month, [...patientIds]);

    const rows: Array<{
      patientId: string;
      firstName: string;
      lastName: string;
      billingNotes: string | null;
      amountDue: number;
      status: PaymentStatus;
      entries: { receivedAt: string; amount: number; method: string }[];
      totalPaid: number;
      pending: number;
    }> = [];

    for (const patientId of patientIds) {
      const payment = paymentByPatient.get(patientId);
      const patient = patientMap.get(patientId);
      if (!patient) continue;
      if (center && patient.center !== center) continue;

      const monthEntries = (entriesByPatient.get(patientId) ?? []).map((e) => ({
        receivedAt: e.receivedAt.toISOString(),
        amount: decimalToNumber(e.amount),
        method: e.method,
      }));

      const totalPaid = monthEntries.reduce((acc, e) => acc + e.amount, 0);
      const amountDue = payment?.amountDue ?? 0;
      const debt = debtCarriedOver.get(patientId) ?? 0;
      const pending = Math.max(amountDue - totalPaid, 0) + debt;

      rows.push({
        patientId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        billingNotes: patient.billingNotes ?? null,
        amountDue,
        status: payment?.status ?? PaymentStatus.PENDIENTE,
        entries: monthEntries,
        totalPaid: Math.round(totalPaid),
        pending,
      });
    }

    rows.sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "es"),
    );

    const totalDue = rows.reduce((acc, r) => acc + r.amountDue, 0);
    const totalPaid = rows.reduce((acc, r) => acc + r.totalPaid, 0);

    return {
      periodYear: year,
      periodMonth: month,
      center: center ?? null,
      totals: { totalDue, totalPaid },
      rows,
    };
  }

  async recomputePayment(
    tx: Prisma.TransactionClient,
    patientId: string,
    year: number,
    month: number,
  ) {
    if (month < 1 || month > 12) throw new BadRequestException("Mes inválido");

    const patient = await tx.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        sessionsPerWeek: true,
        discountPercent: true,
        agreedMonthlyAmount: true,
        center: true,
      },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    const existing = await tx.payment.findUnique({
      where: { patientId_periodYear_periodMonth: { patientId, periodYear: year, periodMonth: month } },
    });

    const rawEntries = await tx.incomeEntry.findMany({
      where: {
        patientId,
        periodYear: year,
        periodMonth: month,
        concept: { in: [IncomeConcept.MENSUALIDAD, IncomeConcept.SESION_INDIVIDUAL] },
      },
      select: { receivedAt: true, amount: true, method: true, concept: true },
      orderBy: [{ receivedAt: "asc" }],
    });

    const entries: PaymentCountingEntry[] = rawEntries.map((e) => ({
      receivedAt: e.receivedAt,
      amount: decimalToNumber(e.amount),
      method: e.method,
      concept: e.concept,
    }));

    let amountDue = existing?.amountDue;
    if (amountDue == null) {
      const prev = previousPeriod(year, month);
      const prevPayment = await tx.payment.findUnique({
        where: {
          patientId_periodYear_periodMonth: {
            patientId,
            periodYear: prev.year,
            periodMonth: prev.month,
          },
        },
      });
      amountDue = resolveAmountDueFromBilling(
        billingAmountFor(patient),
        prevPayment?.amountDue,
      );
    }

    const manualStatus = existing?.status;
    const aggregated = aggregatePaymentFromEntries(entries, amountDue, manualStatus ?? null);

    let status = aggregated.status;
    let finalAmountDue = amountDue;
    let finalAmountPaid = aggregated.amountPaid;

    if (manualStatus === PaymentStatus.PAUSA_VACACIONES) {
      finalAmountDue = 0;
      if (aggregated.amountPaid === 0) {
        status = PaymentStatus.PAUSA_VACACIONES;
        finalAmountPaid = 0;
      }
    }

    if (existing) {
      return tx.payment.update({
        where: { id: existing.id },
        data: {
          amountPaid: finalAmountPaid,
          paidAt: aggregated.paidAt,
          method: aggregated.method,
          status,
        },
      });
    }

    return tx.payment.create({
      data: {
        patientId,
        periodYear: year,
        periodMonth: month,
        amountDue: finalAmountDue,
        amountPaid: finalAmountPaid,
        paidAt: aggregated.paidAt,
        method: aggregated.method,
        status,
      },
    });
  }

  private async priorPeriodDebtByPatient(
    beforeYear: number,
    beforeMonth: number,
    patientIds: string[],
  ) {
    if (patientIds.length === 0) return { debtCarriedOver: new Map<string, number>() };

    const rows = await this.prisma.payment.findMany({
      where: {
        patientId: { in: patientIds },
        status: { not: PaymentStatus.PAUSA_VACACIONES },
        ...priorPeriodDebtPeriodFilter(beforeYear, beforeMonth),
      },
      select: { patientId: true, amountDue: true, amountPaid: true },
    });

    const debtCarriedOver = new Map<string, number>();
    for (const row of rows) {
      const balance = Math.max(row.amountDue - row.amountPaid, 0);
      if (balance <= 0) continue;
      debtCarriedOver.set(row.patientId, (debtCarriedOver.get(row.patientId) ?? 0) + balance);
    }
    return { debtCarriedOver };
  }

  private async validateAndBuild(dto: CreateIncomeEntryDto) {
    await this.validateEntryFields({
      center: dto.center,
      receivedAt: new Date(dto.receivedAt),
      concept: dto.concept,
      patientId: dto.patientId ?? null,
      payerName: dto.payerName ?? null,
      amount: dto.amount,
      periodYear: dto.periodYear ?? null,
      periodMonth: dto.periodMonth ?? null,
      method: dto.method,
      invoiced: dto.invoiced ?? false,
      notes: dto.notes ?? null,
    });

    const center = await this.resolveCenter(dto.center, dto.patientId ?? null);

    return {
      center,
      receivedAt: new Date(dto.receivedAt),
      concept: dto.concept,
      patientId: dto.patientId ?? null,
      payerName: dto.payerName ?? null,
      amount: dto.amount,
      periodYear: dto.periodYear ?? null,
      periodMonth: dto.periodMonth ?? null,
      method: dto.method,
      invoiced: dto.invoiced ?? false,
      notes: dto.notes ?? null,
    };
  }

  private async validateEntryFields(entry: {
    center?: GidiCenter;
    receivedAt: Date;
    concept: IncomeConcept;
    patientId: string | null;
    payerName: string | null;
    amount: number;
    periodYear: number | null;
    periodMonth: number | null;
    method: IncomeMethod;
    invoiced?: boolean;
    notes?: string | null;
  }) {
    if (entry.amount <= 0) throw new BadRequestException("El monto debe ser mayor a 0");

    if (requiresPatientPeriod(entry.concept)) {
      if (!entry.patientId) throw new BadRequestException("Este concepto requiere paciente");
      if (!entry.periodYear || !entry.periodMonth) {
        throw new BadRequestException("Este concepto requiere periodo (año y mes)");
      }
    }

    if (!entry.patientId && !entry.payerName?.trim()) {
      throw new BadRequestException("Indique paciente o nombre del pagador");
    }

    if (entry.patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { id: entry.patientId },
        select: { id: true },
      });
      if (!patient) throw new NotFoundException("Paciente no encontrado");
    }

    if (entry.periodMonth != null && (entry.periodMonth < 1 || entry.periodMonth > 12)) {
      throw new BadRequestException("Mes inválido");
    }

    if (!PAYMENT_COUNTING_CONCEPTS.has(entry.concept) && entry.periodYear && entry.periodMonth) {
      // period optional for non-monthly concepts
    }
  }

  private async resolveCenter(center: GidiCenter | undefined, patientId: string | null) {
    if (patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        select: { center: true },
      });
      if (!patient) throw new NotFoundException("Paciente no encontrado");
      return patient.center;
    }
    if (!center) throw new BadRequestException("Indique la sede del ingreso");
    return center;
  }
}
