/** Índice lineal año-mes para comparar periodos. */
export function periodYm(year: number, month: number): number {
  return year * 12 + (month - 1);
}

/** Primer año-mes (UTC) desde el cual aplica cobro y deuda arrastrada para el paciente. */
export function therapyBillingStartYm(fechaInicioTerapia: Date): number {
  return periodYm(fechaInicioTerapia.getUTCFullYear(), fechaInicioTerapia.getUTCMonth() + 1);
}

export function isPeriodOnOrAfterTherapyStart(
  fechaInicioTerapia: Date,
  periodYear: number,
  periodMonth: number,
): boolean {
  return periodYm(periodYear, periodMonth) >= therapyBillingStartYm(fechaInicioTerapia);
}

/**
 * Un paciente inactivo (alta/baja) deja de contar en ingresos desde el mes de
 * inactivación en adelante. Los meses anteriores se conservan (ingresos reales).
 */
export function isInactiveForPeriod(
  patient: { status: string; dischargedAt: Date | null },
  periodYear: number,
  periodMonth: number,
): boolean {
  if (patient.status !== "DISCHARGED" || !patient.dischargedAt) return false;
  const d = patient.dischargedAt;
  const dischargeYm = periodYm(d.getUTCFullYear(), d.getUTCMonth() + 1);
  return periodYm(periodYear, periodMonth) >= dischargeYm;
}

export function isPastOrCurrentPeriod(year: number, month: number, now = new Date()): boolean {
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  return periodYm(year, month) <= periodYm(nowYear, nowMonth);
}
