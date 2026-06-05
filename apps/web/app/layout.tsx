import "./globals.css";
import type { Metadata } from "next";
import SWRegister from "./sw-register";
import { getApiBaseUrlForScript } from "../lib/get-api-base-url";

/** Lee `NEXT_PUBLIC_*` en el servidor en cada request (Railway), no solo en el build. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "GiDi",
  description: "GiDi PWA",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#F38A1D",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const apiBase = getApiBaseUrlForScript();
  return (
    <html lang="es">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__GIDI_API_BASE__=${JSON.stringify(apiBase)};`,
          }}
        />
      </head>
      <body>
        <SWRegister />
        {children}
      </body>
    </html>
  );
}
