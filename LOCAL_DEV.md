# GiDi — desarrollo local

## 1. Requisitos

- Node.js **22+**
- pnpm **9**
- Base Postgres accesible (`DATABASE_URL` en `apps/api/.env`)

## 2. Instalar

```powershell
cd d:\apps\GiDi2.0
pnpm install
```

## 3. Base de datos (API)

```powershell
cd apps\api
pnpm exec prisma generate
pnpm exec prisma migrate deploy
```

Si la BD ya existía sin historial de Prisma (`P3005`), en **local** puedes sincronizar el esquema con:

```powershell
pnpm exec prisma db push
```

(No uses `db push` en producción; en Railway usa `migrate deploy` o un baseline de migraciones.)

Datos demo (opcional; **borra** datos de app):

```powershell
pnpm exec prisma db seed
```

Credenciales seed por defecto:

- Admin: `admin@gidi.local` / `Admin123!`
- Terapeuta: `maria.gonzalez@gidi.local` / `Admin123!`

## 4. Arrancar servicios

**Terminal 1 — API (puerto 3001):**

```powershell
cd d:\apps\GiDi2.0\apps\api
pnpm run start:dev
```

**Terminal 2 — Web (puerto 3000):**

```powershell
cd d:\apps\GiDi2.0\apps\web
pnpm run dev
```

Abrir: http://localhost:3000

## 5. Comprobar API

- http://localhost:3001/health → `{"ok":true}`
- http://localhost:3001/health/ready → comprueba Postgres

## 6. Despliegue en Railway

Guía completa: **[RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)** (dos servicios, variables, migraciones, enlace para pruebas remotas).

## 7. Antes de subir a Railway (checklist)

1. En Railway (web): `NEXT_PUBLIC_API_URL` = URL pública de la API.
2. En Railway (api): `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGINS` (dominio del front).
3. `pnpm exec prisma migrate deploy` en el servicio API al desplegar.
4. No usar `prisma db seed` en producción.
