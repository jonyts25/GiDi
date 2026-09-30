const AREA_CHIP_PALETTE = [
  "bg-sky-500/20 text-sky-800 dark:text-sky-200",
  "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200",
  "bg-amber-500/20 text-amber-900 dark:text-amber-100",
  "bg-violet-500/20 text-violet-800 dark:text-violet-200",
  "bg-rose-500/20 text-rose-800 dark:text-rose-200",
  "bg-teal-500/20 text-teal-800 dark:text-teal-200",
  "bg-orange-500/20 text-orange-900 dark:text-orange-100",
  "bg-indigo-500/20 text-indigo-800 dark:text-indigo-200",
] as const;

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
  const idx = areaIdsInOrder.indexOf(areaId);
  const paletteIdx = idx >= 0 ? idx : hashString(areaId);
  return AREA_CHIP_PALETTE[paletteIdx % AREA_CHIP_PALETTE.length];
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}
