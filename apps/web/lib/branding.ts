export type BrandingPreset = "white" | "teal" | "dark" | "orange" | "horizontal-dark";

export type BrandingSettings = {
  preset: BrandingPreset;
  customLogo: {
    dataUrl: string;
    mimeType: string;
    fileName: string;
  } | null;
};

export const BRANDING_PRESETS: Array<{
  id: BrandingPreset;
  label: string;
  file: string;
  hint: string;
}> = [
  {
    id: "white",
    label: "Fondo blanco",
    file: "/logos/gidi-white.png",
    hint: "Recomendado para la app (fondo claro).",
  },
  {
    id: "horizontal-dark",
    label: "Horizontal oscuro",
    file: "/logos/gidi-horizontal-dark.png",
    hint: "Ideal para encabezados amplios.",
  },
  {
    id: "teal",
    label: "Fondo turquesa",
    file: "/logos/gidi-teal.png",
    hint: "Color institucional GiDi.",
  },
  {
    id: "orange",
    label: "Fondo naranja",
    file: "/logos/gidi-orange.png",
    hint: "Variante cálida del logo.",
  },
  {
    id: "dark",
    label: "Fondo gris oscuro",
    file: "/logos/gidi-dark.png",
    hint: "Contraste alto sobre fondos claros.",
  },
];

export const DEFAULT_BRANDING: BrandingSettings = {
  preset: "white",
  customLogo: null,
};

export function presetLogoUrl(preset: BrandingPreset): string {
  const match = BRANDING_PRESETS.find((p) => p.id === preset);
  return match?.file ?? "/logos/gidi-white.png";
}

export function resolveLogoUrl(branding: BrandingSettings): string {
  if (branding.customLogo?.dataUrl) return branding.customLogo.dataUrl;
  return presetLogoUrl(branding.preset);
}

export const LOGO_UPLOAD_TIPS = [
  "Formato recomendado: PNG con fondo transparente o blanco.",
  "Tamaño sugerido: 800×400 px (horizontal) o 600×800 px (vertical).",
  "Peso máximo: 2 MB.",
  "Para la barra superior, evita fondos muy oscuros (la app usa tema claro).",
];
