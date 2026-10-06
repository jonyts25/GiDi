import { GidiCenter, Prisma } from "@prisma/client";
import { periodYm } from "./payment-period";

/** Los meses anteriores a esta fecha no cuentan como deuda arrastrada (datos legacy). */
export const DEBT_TRACKING_START = { year: 2026, month: 8 } as const;

const DEBT_START_YM = periodYm(DEBT_TRACKING_START.year, DEBT_TRACKING_START.month);

export function isOnOrAfterDebtStart(year: number, month: number): boolean {
  return periodYm(year, month) >= DEBT_START_YM;
}

/** Periodos anteriores al consultado y en o después del inicio de deuda arrastrada. */
export function priorPeriodDebtPeriodFilter(
  beforeYear: number,
  beforeMonth: number,
): Prisma.PaymentWhereInput {
  return {
    AND: [
      {
        OR: [
          { periodYear: { lt: beforeYear } },
          { periodYear: beforeYear, periodMonth: { lt: beforeMonth } },
        ],
      },
      {
        OR: [
          { periodYear: { gt: DEBT_TRACKING_START.year } },
          {
            periodYear: DEBT_TRACKING_START.year,
            periodMonth: { gte: DEBT_TRACKING_START.month },
          },
        ],
      },
    ],
  };
}

/** Mensualidad por frecuencia semanal (pesos). Tarifas vigentes 2026. */
export const MONTHLY_RATES: Record<number, number> = {
  1: 2150,
  2: 4130,
  3: 5000,
};

export type CenterPaymentInfo = {
  centerLabel: string;
  titular: string;
  banco: string;
  clabe: string;
  cuenta?: string;
  concepto: string;
};

/** Datos de transferencia por sede. El concepto siempre es el nombre del paciente. */
export const CENTER_PAYMENT_INFO: Record<GidiCenter, CenterPaymentInfo> = {
  SAN_AGUSTIN: {
    centerLabel: "GiDi San Agustín",
    titular: "Carla Patricia Zarate Rosique",
    banco: "Transferencia electrónica SPEI",
    clabe: "646180205611945594",
    concepto: "Nombre del paciente",
  },
  VALLARTA: {
    centerLabel: "GiDi Vallarta",
    titular: "Maria Patricia Rosique Vessi",
    banco: "BANORTE",
    clabe: "072320006765961442",
    cuenta: "0676596144",
    concepto: "Nombre del paciente",
  },
  COLEGIOS: {
    centerLabel: "GiDi Colegios",
    titular: "",
    banco: "",
    clabe: "",
    concepto: "Nombre del paciente",
  },
};

export type PatientBillingProfile = {
  agreedMonthlyAmount?: number | null;
  sessionsPerWeek?: number | null;
  discountPercent?: number | null;
};

/** Mensualidad sugerida a partir de frecuencia y descuento (%).
 * `sessionsPerWeek === 0` = pago por sesión (sin monto fijo). */
export function suggestedMonthly(
  sessionsPerWeek: number | null | undefined,
  discountPercent: number | null | undefined,
): number | null {
  if (sessionsPerWeek == null || sessionsPerWeek <= 0) return null;
  const base = MONTHLY_RATES[sessionsPerWeek];
  if (base == null) return null;
  const disc = Math.min(Math.max(discountPercent ?? 0, 0), 100);
  return Math.round(base * (1 - disc / 100));
}

/** Monto de cobro: mensualidad acordada si existe; si no, tarifa sugerida. */
export function billingAmountFor(patient: PatientBillingProfile): number | null {
  if (patient.agreedMonthlyAmount != null && patient.agreedMonthlyAmount > 0) {
    return patient.agreedMonthlyAmount;
  }
  return suggestedMonthly(patient.sessionsPerWeek, patient.discountPercent);
}
