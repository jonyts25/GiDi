/** Incluir fila de pago en hoja/export del mes (NO_INTEGRADO sin cobro ni ingreso del periodo se omite). */
export function includePaymentPatientInMonthSheet(
  monthlyBillingStatus: string,
  amountPaid: number,
  hasIncomeEntryInPeriod: boolean,
): boolean {
  if (monthlyBillingStatus !== "NO_INTEGRADO") return true;
  if (amountPaid > 0) return true;
  return hasIncomeEntryInPeriod;
}
