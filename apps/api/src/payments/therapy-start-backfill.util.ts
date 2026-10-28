/** Espejo de la migración 20261027220000: MIN de fechas presentes (día 1 del mes). */
export function earliestTherapyStartDate(
  firstPaidMonth: Date | null | undefined,
  firstIncomeMonth: Date | null | undefined,
  createdAtMonth: Date,
): Date {
  const candidates = [firstPaidMonth, firstIncomeMonth, createdAtMonth].filter(
    (d): d is Date => d != null,
  );
  return new Date(Math.min(...candidates.map((d) => d.getTime())));
}
