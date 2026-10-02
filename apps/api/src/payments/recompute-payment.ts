import { IncomeConcept, IncomeMethod, PaymentStatus } from "@prisma/client";
import { incomeMethodLabel } from "./income-config";
import { PatientBillingProfile, suggestedMonthly } from "./payment-config";

export type PaymentCountingEntry = {
  receivedAt: Date;
  amount: number;
  method: IncomeMethod;
  concept: IncomeConcept;
};

export function sumPaymentEntries(entries: PaymentCountingEntry[]): number {
  return entries.reduce((acc, e) => acc + e.amount, 0);
}

export function aggregatePaymentFromEntries(
  entries: PaymentCountingEntry[],
  amountDue: number,
  existingStatus: PaymentStatus | null,
): {
  amountPaid: number;
  paidAt: Date | null;
  method: string | null;
  status: PaymentStatus;
} {
  const amountPaid = Math.round(sumPaymentEntries(entries));

  if (entries.length === 0) {
    return {
      amountPaid: 0,
      paidAt: null,
      method: null,
      status: deriveStatusWhenUnpaid(amountDue, existingStatus),
    };
  }

  const sorted = [...entries].sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
  const last = sorted[sorted.length - 1];
  const paidAt = sorted.reduce(
    (max, e) => (e.receivedAt.getTime() > max.getTime() ? e.receivedAt : max),
    sorted[0].receivedAt,
  );

  return {
    amountPaid,
    paidAt,
    method: incomeMethodLabel(last.method),
    status: deriveStatusFromPaid(amountDue, amountPaid, existingStatus),
  };
}

export function deriveStatusFromPaid(
  amountDue: number,
  amountPaid: number,
  existingStatus: PaymentStatus | null,
): PaymentStatus {
  if (existingStatus === PaymentStatus.PAUSA_VACACIONES && amountPaid === 0) {
    return PaymentStatus.PAUSA_VACACIONES;
  }
  if (amountPaid >= amountDue && amountDue > 0) {
    return PaymentStatus.PAGADO;
  }
  if (amountPaid > 0) {
    return PaymentStatus.PARCIAL;
  }
  return deriveStatusWhenUnpaid(amountDue, existingStatus);
}

function deriveStatusWhenUnpaid(
  _amountDue: number,
  existingStatus: PaymentStatus | null,
): PaymentStatus {
  if (existingStatus === PaymentStatus.PAUSA_VACACIONES) {
    return PaymentStatus.PAUSA_VACACIONES;
  }
  if (existingStatus === PaymentStatus.DEUDA) {
    return PaymentStatus.DEUDA;
  }
  return PaymentStatus.PENDIENTE;
}

export function previousPeriod(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

/** Monto sugerido o, si no hay tarifa, el amountDue del mes anterior. */
export function resolveAmountDueFromBilling(
  suggested: number | null | undefined,
  fallbackPreviousDue: number | null | undefined,
): number {
  if (suggested != null) return suggested;
  return fallbackPreviousDue ?? 0;
}

export type PaymentHistoryEntry = {
  amountDue: number;
  status: PaymentStatus;
};

function periodKey(year: number, month: number): string {
  return `${year}-${month}`;
}

/** Hereda amountDue para meses nuevos: acordada > mes anterior > 6 previos > tarifa > 0. */
export function resolveInheritedAmountDue(
  patient: PatientBillingProfile,
  historyByPeriod: Map<string, PaymentHistoryEntry>,
  year: number,
  month: number,
): number {
  if (patient.agreedMonthlyAmount != null && patient.agreedMonthlyAmount > 0) {
    return patient.agreedMonthlyAmount;
  }

  const prev = previousPeriod(year, month);
  const prevEntry = historyByPeriod.get(periodKey(prev.year, prev.month));

  if (
    prevEntry &&
    prevEntry.status !== PaymentStatus.PAUSA_VACACIONES &&
    prevEntry.amountDue > 0
  ) {
    return prevEntry.amountDue;
  }

  let y = prev.year;
  let m = prev.month;
  for (let i = 0; i < 6; i++) {
    const entry = historyByPeriod.get(periodKey(y, m));
    if (entry && entry.status !== PaymentStatus.PAUSA_VACACIONES && entry.amountDue > 0) {
      return entry.amountDue;
    }
    ({ year: y, month: m } = previousPeriod(y, m));
  }

  const suggested = suggestedMonthly(patient.sessionsPerWeek, patient.discountPercent);
  if (suggested != null && suggested > 0) return suggested;
  return 0;
}
