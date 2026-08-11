"use client";

import { useBranding } from "@/components/branding/BrandingProvider";
import { presetLogoUrl } from "@/lib/branding";

/** Logo fijo en esquina superior derecha — se repite en cada hoja al imprimir. */
export function GiDiPrintPageLogo() {
  const { logoUrl, loading, branding } = useBranding();
  const src = loading ? presetLogoUrl(branding.preset) : logoUrl;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="gidi-print-page-logo" aria-hidden />
  );
}
