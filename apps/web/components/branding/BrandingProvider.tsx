"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "@/lib/get-api-base-url";
import { BrandingSettings, DEFAULT_BRANDING, resolveLogoUrl } from "@/lib/branding";

type BrandingContextValue = {
  branding: BrandingSettings;
  logoUrl: string;
  loading: boolean;
  refresh: () => Promise<void>;
  setBranding: (next: BrandingSettings) => void;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/settings/branding`);
      if (!res.ok) return;
      const data = (await res.json()) as BrandingSettings;
      setBranding({
        preset: data.preset ?? DEFAULT_BRANDING.preset,
        customLogo: data.customLogo ?? null,
      });
    } catch {
      /* fallback to default */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logoUrl = useMemo(() => resolveLogoUrl(branding), [branding]);

  const value = useMemo(
    () => ({ branding, logoUrl, loading, refresh, setBranding }),
    [branding, logoUrl, loading, refresh],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used within BrandingProvider");
  return ctx;
}
