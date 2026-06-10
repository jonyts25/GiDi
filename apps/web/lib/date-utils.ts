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

/** Muestra fecha de sesión sin desfase por zona horaria. */
export function formatCalendarDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", {
    timeZone: "UTC",
    ...(opts ?? { weekday: "short", day: "2-digit", month: "short", year: "numeric" }),
  });
}
