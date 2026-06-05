import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

/**
 * CORS controlado por `CORS_ORIGINS` (lista separada por comas).
 *
 * - Lista **vacía** (o sin variable): permisivo (cualquier `Origin`) — útil para demo / Railway
 *   hasta que fijes dominios reales.
 * - Lista **no vacía**: solo esos orígenes exactos (recomendado en producción estable).
 *
 * Peticiones **sin** cabecera `Origin` (curl, probes): permitidas.
 */
export function buildCorsOptions(): CorsOptions {
  const allowed = new Set(
    (process.env.CORS_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  return {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }
      if (allowed.size === 0) {
        cb(null, true);
        return;
      }
      if (allowed.has(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };
}
