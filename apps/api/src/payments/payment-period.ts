/** Índice lineal año-mes para comparar periodos. */
export function periodYm(year: number, month: number): number {
  return year * 12 + (month - 1);
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

/** Periodo anterior al mes de ingreso a terapia (sin contar cobros ni arrastre). */
export function isBeforeTherapyStart(
  patient: { therapyStartDate: Date | null },
  periodYear: number,
  periodMonth: number,
): boolean {
  if (!patient.therapyStartDate) return false;
  const d = patient.therapyStartDate;
  const startYm = periodYm(d.getUTCFullYear(), d.getUTCMonth() + 1);
  return periodYm(periodYear, periodMonth) < startYm;
}

/** Cobro del mes: activo para el periodo y ya inició terapia. */
export function isBillableForPeriod(
  patient: {
    status: string;
    dischargedAt: Date | null;
    therapyStartDate: Date | null;
  },
  periodYear: number,
  periodMonth: number,
): boolean {
  return (
    !isInactiveForPeriod(patient, periodYear, periodMonth) &&
    !isBeforeTherapyStart(patient, periodYear, periodMonth)
  );
}
