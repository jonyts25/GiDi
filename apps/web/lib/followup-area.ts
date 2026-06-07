export type TrackingMode = "TEXT_ONLY" | "MONTHLY_GRID";

export const TEXT_ONLY_AREA_KEYS = new Set([
  "ADMINISTRATIVO",
  "FAMILIAR",
  "TRATAMIENTO_PSICOLOGICO",
  "TRATAMIENTO_MEDICO",
  "SEGUIMIENTO_ESCOLAR",
]);

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
  if (TEXT_ONLY_AREA_KEYS.has(k)) return "TEXT_ONLY";
  const n = area.name.toLowerCase();
  if (
    n.includes("administrativo") ||
    n.includes("familiar") ||
    n.includes("tratamiento psicológico") ||
    n.includes("tratamiento medico") ||
    n.includes("tratamiento médico") ||
    n.includes("seguimiento escolar")
  ) {
    return "TEXT_ONLY";
  }
  return "MONTHLY_GRID";
}

export function areaSupportsObjectiveSuggestions(area: { key: string; name: string }): boolean {
  const k = area.key.toUpperCase();
  const n = area.name.toLowerCase();
  return (
    ["LECTURA", "VISUALES", "AUDITIVAS", "AUDITIVO", "MEMORIA_DISPOSITIVOS_APRENDIZAJE"].includes(k) ||
    n.includes("lectura") ||
    n.includes("visual") ||
    n.includes("audit") ||
    n.includes("memoria")
  );
}
