const AREA_PALETTE = [
  { chip: "bg-sky-600 text-white", border: "border-l-sky-600", header: "bg-sky-600 text-white" },
  { chip: "bg-emerald-600 text-white", border: "border-l-emerald-600", header: "bg-emerald-600 text-white" },
  { chip: "bg-amber-600 text-white", border: "border-l-amber-600", header: "bg-amber-600 text-white" },
  { chip: "bg-violet-600 text-white", border: "border-l-violet-600", header: "bg-violet-600 text-white" },
  { chip: "bg-rose-600 text-white", border: "border-l-rose-600", header: "bg-rose-600 text-white" },
  { chip: "bg-teal-600 text-white", border: "border-l-teal-600", header: "bg-teal-600 text-white" },
  { chip: "bg-orange-600 text-white", border: "border-l-orange-600", header: "bg-orange-600 text-white" },
  { chip: "bg-indigo-600 text-white", border: "border-l-indigo-600", header: "bg-indigo-600 text-white" },
] as const;

function paletteIndex(areaId: string, areaIdsInOrder: string[]): number {
  const idx = areaIdsInOrder.indexOf(areaId);
  return idx >= 0 ? idx : hashString(areaId);
}

/** Nombre corto para chips en tablas de programación (p. ej. «Estimulación temprana…» → «Estim. temprana»). */
export function areaShortLabel(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 14) return trimmed;

  const dash = trimmed.indexOf(" - ");
  if (dash > 0 && dash <= 18) return trimmed.slice(0, dash);

  const words = trimmed.split(/\s+/);
  if (words.length >= 2 && words[0].length <= 10) {
    const pair = `${words[0]} ${words[1]}`;
    if (pair.length <= 16) return pair;
  }

  return `${trimmed.slice(0, 12)}…`;
}

export function areaChipClass(areaId: string, areaIdsInOrder: string[]): string {
  return AREA_PALETTE[paletteIndex(areaId, areaIdsInOrder) % AREA_PALETTE.length].chip;
}

export function areaBorderClass(areaId: string, areaIdsInOrder: string[]): string {
  return AREA_PALETTE[paletteIndex(areaId, areaIdsInOrder) % AREA_PALETTE.length].border;
}

export function areaHeaderClass(areaId: string, areaIdsInOrder: string[]): string {
  return AREA_PALETTE[paletteIndex(areaId, areaIdsInOrder) % AREA_PALETTE.length].header;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}
