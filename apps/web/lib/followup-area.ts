export type TrackingMode = "TEXT_ONLY" | "MONTHLY_GRID";

/** Coincide con `Area.trackingMode` del API; si falta, infiere por clave/nombre. */
export function resolveTrackingMode(area: {
  trackingMode?: string | null;
  key: string;
  name: string;
}): TrackingMode {
  if (area.trackingMode === "TEXT_ONLY" || area.trackingMode === "MONTHLY_GRID") {
    return area.trackingMode;
  }
  const k = area.key.toUpperCase();
  const n = area.name.toLowerCase();
  if (k === "ADMINISTRATIVO" || k === "FAMILIAR" || n.includes("administrativo") || n.includes("familiar")) {
    return "TEXT_ONLY";
  }
  return "MONTHLY_GRID";
}

export function areaSupportsObjectiveSuggestions(area: { key: string; name: string }): boolean {
  const k = area.key.toUpperCase();
  const n = area.name.toLowerCase();
  return (
    ["LECTURA", "VISUALES", "AUDITIVAS", "AUDITIVO"].includes(k) ||
    n.includes("lectura") ||
    n.includes("visual") ||
    n.includes("audit")
  );
}
