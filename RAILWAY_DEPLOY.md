# Desplegar GiDi en Railway

## Por qué fallaban los deploys (y seguías viendo código viejo)

Railway **deja el último deploy exitoso en línea** si el nuevo falla. El último OK fue ~27 may; los de junio fallaban al arrancar.

Causas en este repo:

1. **Build vacío (principal)** — `tsconfig.build.tsbuildinfo` + `deleteOutDir` hacían que `nest build` no emitiera archivos → no existía `dist/main.js`.
2. **Ruta de salida distinta** — versión antigua compilaba a `dist/apps/api/main.js`; los scripts nuevos buscaban solo `dist/main.js`.
3. **Build y start separados (Nixpacks)** — el contenedor arrancaba sin el `dist/` del build.
4. **Base de datos vs código viejo** — en local usaste `prisma db push`; la API del 27 may sigue esperando tablas/columnas antiguas (`FollowUpEntry`, `entryId`).

## Qué hacer siempre

Desde la **raíz** del monorepo:

```powershell
cd d:\apps\GiDi2.0
npx @railway/cli up --service "Gidi API"
npx @railway/cli up --service "GiDi WEB"
```

No ejecutes `railway up` dentro de `apps\api`.

## Servicios

| Servicio | Config | Dockerfile |
|----------|--------|------------|
| **Gidi API** | `railway.toml` (raíz) | `Dockerfile.api` |
| **GiDi WEB** | Variable `RAILWAY_CONFIG_FILE=railway.web.toml` | `Dockerfile.web` |

En el panel de Railway, **borra** Custom Build/Start Command si chocan con `railway.toml` / Docker.

## Variables

**API:** `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGINS` (URL del front).

**Web:** `NEXT_PUBLIC_API_URL` = URL pública de la API, `RAILWAY_CONFIG_FILE=railway.web.toml`.

## Migraciones

Si `migrate deploy` falla con **P3005** (BD ya existente):

```powershell
cd apps\api
.\scripts\baseline-prisma-migrations.ps1
```

Solo si el esquema **ya coincide** con el código (p. ej. tras `db push`). Si falta la migración de sesiones, ejecuta el SQL de `prisma/migrations/20260527120000_followup_sessions/migration.sql` en Supabase o:

```powershell
pnpm exec prisma migrate resolve --rolled-back 20260527120000_followup_sessions
pnpm exec prisma migrate deploy
```

## URLs actuales

- API: https://gidi-api-production.up.railway.app
- Web: https://gidi-web-production.up.railway.app

## Comprobar deploy nuevo

Tras `railway up`, en el dashboard el deployment debe estar **SUCCESS**, no solo “Online” con deploy failed.

```powershell
npx @railway/cli deployment list --service "Gidi API" --limit 3
```
