"use client";

import { BrandingProvider } from "@/components/branding/BrandingProvider";

export default function BrandingShell({ children }: { children: React.ReactNode }) {
  return (
    <div id="app-root" className="app-root">
      <BrandingProvider>{children}</BrandingProvider>
    </div>
  );
}
