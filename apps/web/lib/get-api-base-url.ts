/**
 * URL base de la API GiDi.
 *
 * Orden en el navegador:
 * 1) `window.__GIDI_API_BASE__` — lo inyecta `app/layout.tsx` en cada respuesta (env de Railway en runtime).
 * 2) `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_API_BASE_URL` (sustituidas en build).
 * 3) Fallback público.
 *
 * En producción, si la URL resuelta apunta a localhost/127.0.0.1, se ignora y se usa el fallback
 * (evita bundles viejos o builds con .env.local equivocado).
 */
export const PUBLIC_API_FALLBACK = "https://gidi2.up.railway.app";

const LOCAL_RE = /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i;

function stripTrailingSlashes(s: string) {
  return s.replace(/\/+$/, "");
}

function isProd() {
  return process.env.NODE_ENV === "production";
}

function rejectLocalhostInProd(base: string): string {
  if (!isProd()) return base;
  if (LOCAL_RE.test(base)) return stripTrailingSlashes(PUBLIC_API_FALLBACK);
  return base;
}

function fromProcessEnv(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    PUBLIC_API_FALLBACK;
  const base = stripTrailingSlashes(raw.length > 0 ? raw : PUBLIC_API_FALLBACK);
  return rejectLocalhostInProd(base);
}

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const injected = (window as unknown as { __GIDI_API_BASE__?: string }).__GIDI_API_BASE__;
    if (injected && typeof injected === "string") {
      const t = injected.trim();
      if (t.length > 0) {
        return rejectLocalhostInProd(stripTrailingSlashes(t));
      }
    }
  }
  return fromProcessEnv();
}

/** Misma URL que verá el cliente tras hidratar (para el script inline del layout). */
export function getApiBaseUrlForScript(): string {
  return fromProcessEnv();
}
