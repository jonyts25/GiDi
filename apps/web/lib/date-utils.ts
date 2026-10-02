/** Fecha local YYYY-MM-DD para inputs type="date". */
export function localDateInputValue(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Convierte YYYY-MM-DD a ISO UTC medianoche (consistente con el API). */
export function calendarDateToUtcIso(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString();
}

/** Resta meses a un periodo calendario (enero − 1 → diciembre del año anterior). */
export function subtractCalendarMonths(
  year: number,
  month: number,
  monthsBack: number,
): { periodYear: number; periodMonth: number } {
  let m = month - monthsBack;
  let y = year;
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  return { periodYear: y, periodMonth: m };
}

export type ProgramPeriodOption = {
  periodYear: number;
  periodMonth: number;
  monthsBack: number;
  label: string;
};

/** Mes actual y los dos anteriores (para programación a mes vencido). */
export function programPeriodOptions(now = new Date()): ProgramPeriodOption[] {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return [0, 1, 2].map((monthsBack) => {
    const { periodYear, periodMonth } = subtractCalendarMonths(year, month, monthsBack);
    const label = new Date(periodYear, periodMonth - 1, 1).toLocaleDateString("es-MX", {
      month: "long",
      year: "numeric",
    });
    return { periodYear, periodMonth, monthsBack, label };
  });
}

/** Muestra fecha de sesión sin desfase por zona horaria. */
export function formatCalendarDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", {
    timeZone: "UTC",
    ...(opts ?? { weekday: "short", day: "2-digit", month: "short", year: "numeric" }),
  });
}
