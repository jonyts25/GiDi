"use client";

import { useBranding } from "@/components/branding/BrandingProvider";
import { presetLogoUrl } from "@/lib/branding";

type GiDiLogoProps = {
  variant?: "header" | "login" | "print";
  className?: string;
  alt?: string;
};

const sizes: Record<NonNullable<GiDiLogoProps["variant"]>, string> = {
  header: "h-10 w-auto max-w-[140px] object-contain",
  login: "h-28 w-auto max-w-[220px] object-contain",
  print: "h-16 w-auto max-w-[200px] object-contain",
};

export function GiDiLogo({ variant = "header", className = "", alt = "GiDi — Grupo para la investigación del Desarrollo Infantil" }: GiDiLogoProps) {
  const { logoUrl, loading, branding } = useBranding();
  const src = loading ? presetLogoUrl(branding.preset) : logoUrl;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={`${sizes[variant]} ${className}`} />
  );
}
