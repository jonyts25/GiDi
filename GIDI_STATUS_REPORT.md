# GiDi 2.0 — Reporte técnico y funcional completo

**Fecha del reporte:** 27 de mayo de 2026  
**Fuente:** análisis estático del repositorio `d:\apps\GiDi2.0` (sin modificar código de aplicación).  
**Alcance:** monorepo pnpm con `apps/web`, `apps/api`, `apps/bot`.  
**Verificación E2E:** no ejecutada en esta sesión; los flujos marcados como “probables” se infieren del código, no de pruebas manuales en producción.

> **Nota:** existe `status.md` en la raíz (abril 2026) pero está **desactualizado** respecto al código actual (p. ej. menciona `SessionsModule`, modelo `Session` global y rutas de sesiones eliminadas). Este documento refleja el estado **real** detectado hoy.

---

# 1. Objetivo actual del proyecto

## Qué problema resuelve GiDi

GiDi es una plataforma de **gestión clínica y operativa** para centros de desarrollo / terapia infantil. Según el código y metadatos del proyecto:

- Registra **pacientes**, sus **terapeutas**, **padres/tutores** y **escuelas** vinculadas.
- Permite **seguimiento mensual por área clínica** (lectura, lenguaje, psicología, etc.) con:
  - Objetivos terapéuticos por mes.
  - **Sesiones reales de asistencia** (`FollowUpSession`) dentro de cada seguimiento.
  - Cuadrícula dinámica día×objetivo reemplazada por **columnas por sesión real**.
  - Marcas de progreso (escala 0–4) y códigos de asistencia (A, V, E, F, R, X).
  - Cierre mensual (observaciones generales, trabajo en casa).
- Ofrece **vista resumida para padres** (% asistencia, progreso por objetivo).
- Genera **expediente clínico imprimible** vía `window.print()` (layout HTML, no PDF server-side).
- Incluye **banco de objetivos** reutilizables y vínculo paciente–objetivo.
- Integración **parcial** con **WhatsApp Cloud API (Meta)** para menú de bienvenida automatizado.

## Quiénes son los usuarios

Roles definidos en Prisma (`RoleKey`):

| Rol | Evidencia de UI |
|-----|-----------------|
| **ADMIN** | Dashboard admin, CRUD pacientes/usuarios/terapeutas/padres/escuelas, seguimientos |
| **THERAPIST** | Pacientes asignados, seguimientos, banco de objetivos |
| **PARENT** | Lista de hijos, resumen mensual de seguimiento |
| **SCHOOL** | Solo gestión admin de usuarios escuela; **sin portal propio** |
| **FINANCE, SECRETARY, SUPERADMIN** | En esquema de BD; **sin pantallas dedicadas** detectadas |

## Flujo principal que ya funciona (según código)

Flujo más maduro del producto:

1. **Login** (`POST /auth/login`) → JWT en `localStorage`.
2. **Admin o terapeuta** crea/abre un **seguimiento mensual** por paciente + área + mes.
3. Registra **sesiones** (fecha + terapeuta) dentro del seguimiento.
4. Marca **progreso/asistencia** en cuadrícula dinámica.
5. **Padre** consulta **resumen read-only** del mes.
6. **Terapeuta/admin** exporta **expediente** → impresión/PDF del navegador.

---

# 2. Estado REAL del proyecto

Leyenda: **FUNCIONAL** = API + UI conectadas y lógica completa en código. **PARCIAL** = existe pero incompleto, sin UI, o con gaps de seguridad/UX. **MOCKUP** = UI mínima o datos demo hardcodeados. **NO INICIADO** = sin evidencia en repo.

| Módulo | Estado | Evidencia / comentario |
|--------|--------|------------------------|
| **Autenticación** | **FUNCIONAL** | `auth.service.ts`: login bcrypt/JWT, `change-password`, guard JWT en API, login web en `/`, redirección `mustChangePassword`. |
| **Roles/permisos** | **PARCIAL** | `RolesGuard` en admin/therapist/parent/objective-bank; **FollowUps** usa control en servicio (`followup-access.service.ts`); **`PatientsController` solo JwtGuard** (cualquier usuario autenticado puede listar/crear pacientes). Roles FINANCE/SECRETARY/SCHOOL sin portal. |
| **Pacientes** | **FUNCIONAL** (admin) / **PARCIAL** (global) | CRUD admin completo (`admin/patients/*`). Terapeuta ve asignados. Endpoint genérico `/patients` poco restringido. |
| **Terapeutas** | **FUNCIONAL** | Admin gestiona usuarios THERAPIST; terapeuta tiene rutas `/therapist/*`. |
| **Sesiones terapéuticas** | **FUNCIONAL** (integradas en seguimiento) | Modelo `FollowUpSession` + marcas. **Eliminado** el módulo global `Session` y páginas `/sessions`. |
| **Calendario** | **NO INICIADO** | Sin rutas, modelos ni componentes de calendario/agenda. |
| **KPIs** | **PARCIAL** | KPIs en resumen padre, report JSON y expediente impreso; **no hay dashboard de director** con métricas agregadas. |
| **Dashboard director** | **NO INICIADO** | No existe rol “director”. Dashboard admin es menú de enlaces, sin métricas. |
| **Portal padres** | **PARCIAL** | Lista hijos + ficha + resumen mensual read-only. Sin chat, citas, ni historial multi-mes enriquecido. |
| **Portal escuelas** | **NO INICIADO** | Admin crea usuarios SCHOOL; **no hay login/UI** para rol SCHOOL. |
| **Notificaciones** | **PARCIAL** | Webhook WhatsApp Meta (`MetaWhatsappModule`) con menú automático. Sin push/email/in-app. |
| **Adjuntos/archivos** | **NO INICIADO** (API) | Modelo `FollowUpAttachment` en Prisma; **sin endpoints** ni UI de subida. |
| **Evaluaciones** | **PARCIAL** | Marcas 0–4 y códigos en seguimiento mensual; no hay módulo formal de “evaluaciones” separado. |
| **Reportes PDF** | **PARCIAL** | `GET /followups/:id/report` + `FollowUpReportPrint` + `window.print()`. **No** generación PDF en servidor (puppeteer, etc.). |
| **Billing/pagos** | **NO INICIADO** | Sin modelos, rutas ni UI. Rol FINANCE sin implementación. |
| **Chat/comunicación** | **PARCIAL** | WhatsApp outbound vía `@gidi/bot` + webhook Nest. **Sin chat** in-app web. Legacy `apps/bot/index.js` (whatsapp-web.js) existe pero no es el flujo principal. |
| **Mobile app** | **NO INICIADO** | No hay React Native, Expo ni app nativa. Solo **PWA web**. |
| **Web app** | **FUNCIONAL** | Next.js 16 App Router, ~26 pantallas, integración API JWT. |

---

# 3. Arquitectura detectada

## Frontend

- **Next.js 16.1.4** + **React 19** + **TypeScript**
- **Tailwind CSS 4** (`app/globals.css`, `@theme`)
- App Router en `apps/web/app/` (no `src/app/` duplicado detectado hoy)
- Cliente HTTP: `lib/api.ts` → `fetch` + Bearer token
- Auth state: **`localStorage`** (`gidi_token`, `gidi_user`) — sin Redux/Zustand/Context global
- PWA: `manifest.ts`, `sw-register.tsx`, `public/sw.js` (parcial)

## Backend

- **NestJS 11** (`apps/api/src`)
- **Prisma 6.19.3** ORM
- Validación: `class-validator` + `ValidationPipe` global
- Módulos: Auth, Users, Patients, Admin, Therapist, Parent, Areas, FollowUps, ObjectiveBank, MetaWhatsapp, Prisma

## Estado global

- **No hay** store global (Redux, Zustand, etc.)
- Estado local por página (`useState` / `useEffect`)
- Sesión: JWT + usuario en `localStorage`

## Navegación

- Público: `/`, `/change-password`
- Protegido: `(protected)/layout.tsx` valida token y roles en header
- Redirecciones por rol en `/dashboard` (admin queda; terapeuta → pacientes; padre → hijos)

## Base de datos

- **PostgreSQL** hospedado en **Supabase** (connection string en `DATABASE_URL` / `DIRECT_URL`)
- Esquema gestionado por **Prisma migrations** (`apps/api/prisma/migrations/`)
- **No** hay carpeta `supabase/migrations` ni CLI Supabase en el repo

## Storage

- Modelo `FollowUpAttachment` con campo `url` (string) — **sin integración S3/Supabase Storage** en código
- Variables `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` presentes en `.env` pero **no usadas** en servicios Nest detectados

## Auth

- **Custom JWT** (`JWT_SECRET`), **no Supabase Auth**
- Comentario explícito en `auth.service.ts`: *"usuario en Postgres vía Prisma, no Supabase Auth"*
- Guards: `JwtGuard`, `RolesGuard` (selectivo)

## APIs externas

| Integración | Uso |
|-------------|-----|
| **Meta WhatsApp Cloud API** | Webhook `POST/GET /webhooks/meta/whatsapp`, envío vía `@gidi/bot` |
| **Railway** | Fallback API URL `https://gidi2.up.railway.app` en front |
| **Supabase Postgres** | Solo como host de BD (pooler + direct) |

---

# 4. Estructura de carpetas importante

```
GiDi2.0/
├── package.json                 # Monorepo pnpm, scripts build/dev
├── pnpm-workspace.yaml
├── status.md                    # Doc anterior (DESACTUALIZADO)
├── GIDI_STATUS_REPORT.md        # Este documento
│
├── apps/
│   ├── web/                     # Frontend Next.js
│   │   ├── app/                 # App Router (páginas y layouts)
│   │   ├── components/          # Componentes React reutilizables
│   │   ├── lib/                 # apiFetch, URLs, tipos follow-up
│   │   └── public/              # PWA icons, service worker
│   │
│   ├── api/                     # Backend NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Modelo de datos
│   │   │   ├── seed.ts          # Datos demo
│   │   │   └── migrations/      # Migraciones SQL
│   │   ├── src/
│   │   │   ├── auth/            # Login, JWT, guards
│   │   │   ├── admin/           # CRUD admin pacientes/usuarios
│   │   │   ├── therapist/       # Pacientes del terapeuta
│   │   │   ├── parent/          # Portal padre API
│   │   │   ├── followups/       # Seguimiento mensual + reportes
│   │   │   ├── objective-bank/  # Banco de objetivos
│   │   │   ├── meta-whatsapp/   # Webhook WhatsApp
│   │   │   ├── areas/           # Catálogo áreas clínicas
│   │   │   ├── patients/        # Endpoints genéricos pacientes
│   │   │   └── users/           # Listados terapeutas/padres/escuelas
│   │   └── scripts/smoke-db.ts
│   │
│   └── bot/                     # Paquete @gidi/bot (WhatsApp outbound TS)
│       ├── src/meta/            # Cliente Meta Cloud API
│       └── index.js             # Legacy whatsapp-web.js (no integrado al monorepo dev)
```

---

# 5. Pantallas existentes

Todas bajo `apps/web/app/`:

| Ruta | Rol | Propósito |
|------|-----|-----------|
| `/` | Público | Login (credenciales demo precargadas) |
| `/change-password` | Autenticado | Cambio de contraseña obligatorio |
| `/dashboard` | Admin (otros redirigen) | Menú admin: pacientes, terapeutas, padres, escuelas, usuarios |
| **Admin** | | |
| `/admin/patients` | ADMIN | Lista pacientes |
| `/admin/patients/new` | ADMIN | Alta paciente |
| `/admin/patients/[id]` | ADMIN | Detalle: datos, terapeutas, padres, escuela |
| `/admin/patients/[id]/followups` | ADMIN | Lista/crear seguimientos mensuales |
| `/admin/followups/[id]` | ADMIN | Editor seguimiento (delega a `FollowUpDetailEditor`) |
| `/admin/therapists` | ADMIN | Lista terapeutas |
| `/admin/therapists/[id]` | ADMIN | Detalle terapeuta |
| `/admin/parents` | ADMIN | Lista padres |
| `/admin/parents/[id]` | ADMIN | Detalle padre |
| `/admin/schools` | ADMIN | Lista/crea usuarios escuela |
| `/admin/schools/[id]` | ADMIN | Detalle escuela |
| `/admin/users` | ADMIN | Lista usuarios |
| `/admin/users/[id]` | ADMIN | Detalle usuario |
| **Terapeuta** | | |
| `/therapist` | THERAPIST | Redirect → `/therapist/patients` |
| `/therapist/patients` | THERAPIST | Pacientes asignados |
| `/therapist/patients/[id]` | THERAPIST | Redirect → followups del paciente |
| `/therapist/patients/[id]/followups` | THERAPIST | Lista/crear seguimientos propios |
| `/therapist/followups` | THERAPIST | Todos sus seguimientos del mes |
| `/therapist/followups/[id]` | THERAPIST | Editor seguimiento |
| `/therapist/objective-bank` | THERAPIST | Banco de objetivos (CRUD propio + públicos) |
| **Padre** | | |
| `/parent/patients` | PARENT | Lista hijos |
| `/parent/patients/[id]` | PARENT | Ficha hijo + enlace a resumen |
| `/parent/patients/[id]/followups` | PARENT | Tarjetas resumen mensual (solo lectura) |

**Pantallas eliminadas (no existen en repo):**

- `/admin/patients/[id]/sessions`
- `/therapist/patients/[id]/sessions`

---

# 6. Componentes importantes reutilizables

| Componente | Ubicación | Uso |
|------------|-----------|-----|
| `FollowUpDetailEditor` | `components/followups/` | Editor completo seguimiento (admin + terapeuta) |
| `MonthlyFollowUpGrid` | `components/followups/` | Cuadrícula dinámica sesión×objetivo |
| `NewFollowUpSessionForm` | `components/followups/` | Alta sesión (fecha + terapeuta) |
| `FollowUpReportPrint` | `components/followups/` | Layout expediente clínico para impresión |
| `ParentFollowUpSummaryCard` | `components/followups/` | Resumen padres por área |
| `ResetPasswordButton` | `components/admin/` | Reset password admin |

**Utilidades:**

- `lib/api.ts` — cliente HTTP autenticado
- `lib/get-api-base-url.ts` — resolución URL API (Railway fallback)
- `lib/followup-area.ts`, `followup-suggestions.ts` — modo TEXT_ONLY vs GRID
- `lib/followup-report.types.ts` — tipos del endpoint report

---

# 7. Estado de Supabase

> **Importante:** GiDi usa Supabase principalmente como **host PostgreSQL**. No usa Supabase Auth, Storage ni Edge Functions en el código analizado.

## Tablas detectadas (vía Prisma → Postgres)

Definidas en `apps/api/prisma/schema.prisma`:

| Tabla / modelo | Función |
|----------------|---------|
| `User`, `Role`, `UserRole` | Identidad y roles |
| `Patient` | Pacientes |
| `PatientTherapist` | Asignación paciente–terapeuta |
| `ParentPatient` | Vínculo padre–paciente |
| `SchoolPatient` | Vínculo escuela–paciente |
| `Area` | Catálogo áreas clínicas (`trackingMode`) |
| `ObjectiveBank`, `PatientObjective` | Banco objetivos |
| `FollowUp` | Seguimiento mensual |
| `FollowUpObjective` | Objetivos del mes (+ `monthlyNotes`) |
| `FollowUpSession` | Sesiones reales dentro del seguimiento |
| `FollowUpMark` | Marcas progreso/asistencia por celda |
| `FollowUpAttachment` | Adjuntos (schema only) |
| `FollowUpMetric` | Métricas (schema only) |
| `AppointmentRequest` | Solicitudes cita (schema only) |
| `WhatsAppContactState` | Estado menú WhatsApp |

**Modelo eliminado:** `Session` global (migración `20260527120000_followup_sessions`).

## Relaciones clave

```
Patient ──< PatientTherapist >── User (therapist)
Patient ──< ParentPatient >── User (parent)
Patient ──< SchoolPatient >── User (school)
Patient ──< FollowUp >── Area, User (therapist)
FollowUp ──< FollowUpObjective
FollowUp ──< FollowUpSession ──< FollowUpMark >── FollowUpObjective
```

## Policies RLS

- **NO CONFIRMADO / no presente en repo:** no hay archivos SQL de RLS ni `supabase/migrations`.
- Prisma se conecta con credenciales de servicio Postgres; **la autorización está en NestJS**, no en RLS.

## Buckets Storage

- **NO INICIADO** en código. Sin referencias a `supabase.storage` ni uploads.

## Edge Functions

- **NO INICIADO** en repo. Sin carpeta `supabase/functions`.

## Migraciones

Gestionadas por **Prisma** (16 archivos en `apps/api/prisma/migrations/`), incluyendo:

- `20260121030522_init`
- `20260209061208_followups`
- `20260421120000_area_tracking_followup_marks`
- `20260527120000_followup_sessions` (sesiones dentro de follow-up; drop `Session`)

---

# 8. Flujos realmente probables hoy

> Marcados como **probables** (código coherente). **No verificados E2E** en esta auditoría.

| Flujo | ¿Probable E2E? | Notas |
|-------|----------------|-------|
| Login admin → dashboard → pacientes | **Sí** | Seed: `admin@gidi.local` / `Admin123!` |
| Admin → paciente → asignar terapeuta/padre | **Sí** | API `admin/patients/*` + UI |
| Admin → crear seguimiento → sesiones → cuadrícula | **Sí** | Flujo más completo del producto |
| Terapeuta → mis seguimientos → editar | **Sí** | Con restricción: solo seguimientos propios |
| Terapeuta → banco objetivos | **Sí** | API `therapist/objective-bank` |
| Padre → hijo → resumen mensual | **Sí** | `GET /parent/patients/:id/followups/summary` |
| Exportar expediente → imprimir/PDF | **Sí** | `GET /followups/:id/report` + `window.print()` |
| Cambio contraseña obligatorio | **Probable** | Si `mustChangePassword=true` |
| WhatsApp menú bienvenida | **Parcial** | Requiere env Meta + webhook desplegado |
| Director → ver métricas | **No** | No existe |
| Escuela → portal propio | **No** | No existe |
| Padre → ver sesiones antiguas (módulo Session) | **No** | Eliminado |
| Subir adjuntos a seguimiento | **No** | Sin API/UI |
| Solicitud cita AppointmentRequest | **No** | Solo tabla |

---

# 9. Qué depende de mock data / hardcodes

| Elemento | Tipo | Ubicación |
|----------|------|-----------|
| Credenciales login precargadas | **Hardcode UI** | `apps/web/app/page.tsx`: `admin@gidi.local` / `Admin123!` |
| Password seed demo | **Env/default** | `SEED_DEMO_PASSWORD ?? "Admin123!"` en `prisma/seed.ts` |
| Usuario admin UUID fijo | **Seed** | `ADMIN_ID`, `admin@gidi.local` en seed |
| Pacientes/terapeutas demo | **Seed** | `prisma/seed.ts` (2 pacientes, seguimiento demo con 3 sesiones) |
| Sugerencias objetivos por área | **Hardcode estático** | `lib/followup-suggestions.ts` |
| API URL fallback producción | **Hardcode** | `PUBLIC_API_FALLBACK = "https://gidi2.up.railway.app"` |
| JWT secret default | **Hardcode dev** | `auth.service.ts`: fallback `"dev"` si no hay `JWT_SECRET` |
| Theme color manifest | **Desactualizado vs CSS** | `manifest.ts` usa `#F38A1D`; `globals.css` usa paleta `#2d8a8a` |
| Legacy bot whatsapp-web.js | **Script suelto** | `apps/bot/index.js` — no integrado al flujo Nest principal |

**No detectado:** datos ficticios en componentes de producción más allá de seed y login demo.

---

# 10. Deuda técnica y riesgos

## Seguridad

| Riesgo | Severidad | Detalle |
|--------|-----------|---------|
| Credenciales en `.env` commiteadas | **CRÍTICO** | `apps/api/.env` y `apps/web/.env.local` contienen `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (detectados en repo; **rotar secretos**). |
| Login demo precargado | **Alto** | Pantalla login expone credenciales por defecto. |
| `PatientsController` sin RolesGuard | **Alto** | Cualquier JWT puede `GET /patients`, `POST /patients`. |
| FollowUps: solo JwtGuard en controller | **Medio** | Autorización en servicio; depende de no omitir checks en nuevos métodos. |
| CORS vacío = permisivo | **Medio** | `CORS_ORIGINS=` vacío en `.env` → `buildCorsOptions` permisivo. |
| JWT secret fallback `"dev"` | **Medio** | Si falta env en producción. |

## Arquitectura

- `status.md` desincronizado con código.
- Variables Supabase en web `.env.local` sin uso aparente (confusión operativa).
- PWA manifest/theme desalineado con nueva paleta clínica.
- Paquete `@gidi/bot` + legacy `index.js` (dos enfoques WhatsApp).

## Performance

- Sin caché server-side en front (todo client fetch).
- Listados sin paginación visible en varias pantallas admin.
- Prisma pooler con `connection_limit=1` en DATABASE_URL (posible cuello de botella).

## Código duplicado

- Lógica de auth role-check repetida en cada página (`localStorage` + `roles.includes`).
- Patrones similares en páginas admin list/detail.

## Riesgos para demo

- Dependencia de Railway + Supabase remoto.
- Seed destructivo (`wipeAppData`) — no ejecutar en prod.
- Impresión expediente depende del diálogo del navegador (Safari/Chrome difieren).

## Riesgos para producción

- Secretos en repositorio.
- RBAC incompleto en algunos endpoints.
- Sin backups/monitoring documentados en repo.
- Adjuntos/métricas en schema sin implementar (expectativa vs realidad).

---

# 11. Prioridad recomendada

## Imprescindible para MVP

1. **Rotar y sacar secretos del repo**; usar `.env.example` sin valores reales.
2. **Endurecer RBAC** en `PatientsController` y revisar todos los endpoints con JwtGuard solo.
3. **Quitar credenciales demo** del login en producción.
4. **Migraciones Prisma** aplicadas y verificadas en Supabase prod (`pnpm --filter api migrate:deploy`).
5. **Flujo seguimiento mensual** estable (ya es el core): sesiones + cuadrícula + cierre.
6. **Portal padres** resumen mensual funcional (ya implementado; validar E2E).
7. **CORS** restrictivo al dominio del front.

## Deseable

1. Portal **SCHOOL** (login + vista pacientes vinculados).
2. **Adjuntos** en seguimiento (Storage + API).
3. Dashboard **métricas** admin/director (asistencia agregada, pacientes activos).
4. **Calendario** de sesiones / citas (`AppointmentRequest` + UI).
5. PDF server-side opcional (además de print).
6. Unificar navegación header vs dashboard.
7. Tests E2E automatizados (Playwright) para flujos críticos.

## Congelar después

1. Roles FINANCE / SECRETARY hasta definir producto.
2. Legacy `apps/bot/index.js` (whatsapp-web.js).
3. Modelos `FollowUpMetric` hasta tener requisitos claros.
4. App móvil nativa (PWA puede bastar en MVP).

---

# 12. Comandos para correr

## Requisitos

- **Node.js >= 22** (declarado en `package.json` raíz y `apps/web`)
- **pnpm 9**
- PostgreSQL accesible (`DATABASE_URL`, `DIRECT_URL`)

## Instalación

```bash
cd d:\apps\GiDi2.0
pnpm install
```

## Web (Next.js, puerto 3000)

```bash
pnpm --filter web dev
# Producción:
pnpm --filter web build
pnpm --filter web start
```

Variables recomendadas (`apps/web/.env.local`):

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_API_BASE_URL`

## API (NestJS, puerto 3001 en .env local / 3000 por defecto en main.ts)

```bash
cd apps/api
pnpm exec prisma generate
pnpm exec prisma migrate deploy   # o migrate dev en local
pnpm exec prisma db seed          # ⚠️ borra datos demo
pnpm run start:dev
```

Variables recomendadas (`apps/api/.env`):

- `PORT`
- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `CORS_ORIGINS`
- `SEED_DEMO_PASSWORD` (opcional, seed)
- WhatsApp (opcional): `META_WHATSAPP_VERIFY_TOKEN`, `META_WHATSAPP_APP_SECRET`, `META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_GRAPH_VERSION`

## Bot (solo librería / build)

```bash
pnpm --filter @gidi/bot build
# No hay script start integrado al monorepo dev
```

## Supabase local

- **NO APLICA** como stack local en este repo (no hay `supabase/config.toml`).
- Se usa **Supabase hosted Postgres** vía Prisma.

## Monorepo completo

```bash
pnpm dev      # ejecuta dev en todos los workspaces (web tiene dev; api no listado en root dev de bot)
pnpm build    # build bot + web + api
```

## Mobile

- **NO APLICA** — no existe app mobile en el repositorio.

---

# Anexos

## A. `package.json` (raíz)

```json
{
  "name": "gidi",
  "private": true,
  "version": "0.1.0",
  "packageManager": "pnpm@9.0.0",
  "workspaces": ["apps/*"],
  "scripts": {
    "dev": "pnpm -r dev",
    "build": "pnpm run build:all",
    "build:all": "pnpm run build:bot && pnpm run build:web && pnpm run build:api",
    "build:bot": "pnpm --filter @gidi/bot run build",
    "build:api": "pnpm --filter api run build",
    "build:web": "pnpm --filter web run build",
    "build:railway-api": "pnpm run build:bot && pnpm run build:api",
    "start:api": "pnpm --filter api start"
  },
  "pnpm": {
    "overrides": {
      "prisma": "6.19.3",
      "@prisma/client": "6.19.3"
    }
  },
  "engines": { "node": ">=22.0.0" }
}
```

## B. `apps/web/package.json`

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": ">=22.0.0" },
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "eslint"
  },
  "dependencies": {
    "next": "16.1.4",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.4",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

## C. `apps/api/package.json` (scripts principales)

```json
{
  "name": "api",
  "scripts": {
    "build": "prisma generate && nest build",
    "seed": "prisma db seed",
    "migrate:deploy": "prisma migrate deploy",
    "start": "node dist/apps/api/main.js",
    "start:dev": "nest start --watch",
    "test": "jest",
    "smoke:db": "ts-node scripts/smoke-db.ts"
  }
}
```

## D. Estructura `apps/web/app`

```
app/
├── layout.tsx              # Root layout, PWA, inyección API URL
├── page.tsx                # Login
├── globals.css             # Tailwind 4 + estilos expediente print
├── manifest.ts             # PWA manifest
├── sw-register.tsx         # Service worker
├── change-password/
└── (protected)/
    ├── layout.tsx          # Header + nav por rol
    ├── dashboard/
    ├── admin/              # patients, followups, users, therapists, parents, schools
    ├── therapist/          # patients, followups, objective-bank
    └── parent/             # patients, followups summary
```

## E. Endpoints API principales (referencia)

| Prefijo | Descripción |
|---------|-------------|
| `POST /auth/login`, `/auth/change-password` | Auth |
| `GET /health`, `/health/ready` | Health |
| `/admin/patients/*`, `/admin/users/*` | Admin |
| `/therapist/patients`, `/therapist/followups` | Terapeuta |
| `/parent/patients/*` | Padre |
| `/patients/:id/followups`, `/followups/*` | Seguimientos (+ `/report`) |
| `/areas` | Catálogo áreas |
| `/users/therapists`, `/users/parents`, `/users/schools` | Listados |
| `/therapist/objective-bank`, `/admin/objective-bank` | Objetivos |
| `/webhooks/meta/whatsapp` | WhatsApp Meta |

## F. Variables de entorno necesarias

### API (`apps/api/.env`)

| Variable | Requerida | Uso |
|----------|-----------|-----|
| `DATABASE_URL` | Sí | Prisma (pooler) |
| `DIRECT_URL` | Sí | Prisma migrations |
| `JWT_SECRET` | Sí | Firmar JWT |
| `PORT` | No | Puerto HTTP (default 3000) |
| `CORS_ORIGINS` | Recomendada | Orígenes permitidos (vacío = permisivo) |
| `SEED_DEMO_PASSWORD` | No | Seed |
| `META_WHATSAPP_*` | No | WhatsApp webhook/outbound |
| `SUPABASE_URL` | No | Presente en .env; **no usado en código Nest analizado** |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Idem |

### Web (`apps/web/.env.local` / `.env.production`)

| Variable | Requerida | Uso |
|----------|-----------|-----|
| `NEXT_PUBLIC_API_URL` | Sí | URL API |
| `NEXT_PUBLIC_API_BASE_URL` | Alt. | URL API |
| `PORT` | No | Puerto Next (3000) |

> **No commitear** archivos `.env` con secretos reales.

## G. Screenshots

- **NO GENERADOS** en esta auditoría (análisis estático sin servidor UI en ejecución).
- Para ChatGPT o documentación visual: capturar manualmente login, editor seguimiento, resumen padre y vista previa de impresión del expediente.

---

*Documento generado para uso con ChatGPT u otros agentes. Basado exclusivamente en archivos del repositorio al 27-may-2026. Revisar periódicamente tras cambios de código.*
