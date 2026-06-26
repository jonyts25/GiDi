import { GidiCenter } from "@prisma/client";

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
};

/** Mensualidad sugerida a partir de frecuencia y descuento (%). */
export function suggestedMonthly(
  sessionsPerWeek: number | null | undefined,
  discountPercent: number | null | undefined,
): number | null {
  if (!sessionsPerWeek) return null;
  const base = MONTHLY_RATES[sessionsPerWeek];
  if (base == null) return null;
  const disc = Math.min(Math.max(discountPercent ?? 0, 0), 100);
  return Math.round(base * (1 - disc / 100));
}
