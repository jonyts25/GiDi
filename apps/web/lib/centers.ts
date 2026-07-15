export type GidiCenterKey = "SAN_AGUSTIN" | "VALLARTA" | "COLEGIOS";

export const GIDI_CENTER_OPTIONS: { value: GidiCenterKey; label: string }[] = [
  { value: "SAN_AGUSTIN", label: "San Agustín" },
  { value: "VALLARTA", label: "Vallarta" },
  { value: "COLEGIOS", label: "Colegios" },
];

export const GIDI_CENTER_LABELS: Record<GidiCenterKey, string> = {
  SAN_AGUSTIN: "San Agustín",
  VALLARTA: "Vallarta",
  COLEGIOS: "Colegios",
};

export function labelForCenter(center?: string | null): string {
  if (!center) return "—";
  return GIDI_CENTER_LABELS[center as GidiCenterKey] ?? center;
}
