/** Mensualidad por frecuencia semanal (pesos). Tarifas vigentes 2026. */
export const MONTHLY_RATES: Record<number, number> = {
  1: 2150,
  2: 4130,
  3: 5000,
};

/** `0` = pago por sesión (precio variable). */
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

export function isPayPerSession(sessionsPerWeek: number | null | undefined): boolean {
  return sessionsPerWeek === 0;
}
