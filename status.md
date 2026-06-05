# GiDi 2.0 — Estado del proyecto

**Actualizado:** abril de 2026  
**Tipo de repo:** monorepo **pnpm** (`pnpm-workspace.yaml`: `apps/*`).

---

## Resumen ejecutivo

GiDi 2.0 es una plataforma de gestión clínica/operativa con **frontend PWA (Next.js)**, **API REST (NestJS + Prisma + PostgreSQL)** y un **paquete `bot`** preparado para WhatsApp pero **sin integración activa** en el flujo web/API. La integración principal hoy es **Web → API** mediante `fetch`, JWT en `localStorage` y variables de entorno para la URL de la API (incluye despliegue tipo **Railway** y fallback público documentado en código).

---

## Módulos del monorepo

| Paquete | Ubicación | Rol | Stack destacado |
|--------|-----------|-----|------------------|
| **web** | `apps/web` | UI: login, áreas protegidas por rol (admin, terapeuta, padre), PWA (manifest + service worker) | Next.js 16, React 19, Tailwind 4, TypeScript |
| **api** | `apps/api` | Backend: auth, usuarios, pacientes, sesiones, seguimientos (follow-ups), áreas, administración | NestJS 11, Prisma 6, PostgreSQL, JWT |
| **bot** | `apps/bot` | Dependencias **whatsapp-web.js**, Prisma 7, **sin scripts `dev`/`start` ni código fuente visible** en la raíz del paquete (solo `package.json` + `node_modules`) | Estado: **esqueleto / no cableado al resto** |

**Scripts raíz** (`package.json`): `pnpm dev` y `pnpm build` ejecutan **recursivamente** todos los workspaces (`pnpm -r`). Conviene asegurarse de que `bot` no rompa el árbol si se añaden scripts allí.

---

## Dominio de datos (API / Prisma)

Modelos principales ya reflejados en `schema.prisma`:

- **Identidad:** `User`, `Role`, `UserRole` (incluye `RoleKey`: SUPERADMIN, ADMIN, THERAPIST, PARENT, FINANCE, SCHOOL, SECRETARY).
- **Pacientes y vínculos:** `Patient`, `PatientTherapist`, `ParentPatient`, `SchoolPatient`.
- **Sesiones reales:** `Session` + `SessionStatus` (incluye flujo operativo DRAFT → COMPLETED / NO_SHOW / CANCELLED / RESCHEDULED / SCHEDULED y auditoría confirmación/validación).
- **Seguimiento mensual:** `FollowUp`, objetivos, entradas, marcas, adjuntos, métricas; catálogo `Area`.
- **WhatsApp / citas (solo esquema):** `AppointmentRequest` — **no hay referencias en `apps/api/src`** (sin controladores/servicios detectados); queda como **capacidad de datos sin API expuesta**.

Migraciones presentes bajo `apps/api/prisma/migrations/` (evolución desde init hasta session status y UUIDs nativos).

---

## Módulos NestJS (`apps/api/src`)

Registrados en `app.module.ts`:

| Módulo | Responsabilidad probable |
|--------|---------------------------|
| `AuthModule` | Login, JWT, cambio de contraseña |
| `PrismaModule` | Acceso a base de datos |
| `UsersModule` | Usuarios / listados (p. ej. terapeutas) |
| `PatientsModule` | CRUD pacientes y sesiones por paciente |
| `SessionsModule` | Sesiones, confirmar/validar |
| `AdminModule` | Pacientes admin, usuarios por rol, reset password, guardians, escuela, terapeutas |
| `TherapistModule` | Vista terapeuta / pacientes asignados |
| `ParentModule` | Vista padre / pacientes vinculados |
| `AreasModule` | Catálogo de áreas (follow-ups) |
| `FollowUpsModule` | Seguimientos mensuales |

Controladores alineados con rutas consumidas por el front (`auth`, `admin`, `therapist`, `parent`, `patients`, `sessions`, `followups`, `areas`, `users`).

---

## Frontend (`apps/web`)

- **Autenticación:** página `/` hace `POST /auth/login`, guarda `gidi_token` y `gidi_user` en `localStorage`.
- **Cliente HTTP:** `lib/api.ts` → `apiFetch` añade `Authorization: Bearer` y asume respuestas JSON.
- **URL de API:** `lib/get-api-base-url.ts` — prioridad: `window.__GIDI_API_BASE__` (inyectado en `app/layout.tsx`), luego `NEXT_PUBLIC_API_*`, fallback `https://gidi2.up.railway.app`; en producción se **rechaza localhost** en favor del fallback.
- **Layout protegido:** `(protected)/layout.tsx` redirige si no hay token, fuerza `/change-password` si `mustChangePassword`.
- **Rutas por rol:** dashboard admin enlaza pacientes, terapeutas, padres, escuelas, usuarios; terapeuta y padre tienen flujos de listado y detalle; administración de follow-ups bajo rutas `admin/...`.

**Nota técnica:** existe `apps/web/src/app/page.tsx` además de `apps/web/app/page.tsx`. En proyectos Next suele usarse **una sola** convención (`app/` en raíz **o** `src/app/`). Conviene **unificar o eliminar el duplicado** para evitar confusiones o conflictos según la versión de Next.

---

## Estado de la integración

| Integración | Estado | Comentario |
|-------------|--------|------------|
| **Web ↔ API (JSON + JWT)** | **Operativa en código** | Múltiples páginas usan `apiFetch` contra rutas Nest existentes. |
| **CORS** | **Configurable** | `CORS_ORIGINS`: lista vacía = permisivo (útil en demo/Railway); en producción estable conviene **lista explícita** de orígenes. |
| **API ↔ PostgreSQL** | **Operativa (desarrollo)** | Prisma + `DATABASE_URL` / `DIRECT_URL`; script `smoke:db` y `seed` disponibles en `api`. |
| **PWA** | **Parcial** | `manifest.ts`, `sw-register.tsx`, `public/sw.js` — registro de SW presente. |
| **Bot WhatsApp** | **No integrado** | Paquete con dependencias; **sin pipeline** claro hacia API ni eventos hacia `AppointmentRequest`. |
| **AppointmentRequest** | **Solo BD** | Sin endpoints ni UI detectados. |
| **Roles FINANCE / SECRETARY / SUPERADMIN** | **En esquema** | El layout del front simplifica navegación a ADMIN / THERAPIST / PARENT; **no hay evidencia de UI dedicada** para el resto de roles. |

---

## Pendientes recomendados (prioridad sugerida)

1. **Producción y seguridad**
   - Fijar `CORS_ORIGINS` al dominio real del front.
   - Revisar credenciales por defecto en UI de login (`app/page.tsx` precarga email/password de demo) — **no apto para producción**.
   - Confirmar variables en Railway/hosting: `NEXT_PUBLIC_API_URL`, secretos JWT, `DATABASE_URL`.

2. **Producto / API**
   - Exponer flujo completo de **solicitudes de cita** (`AppointmentRequest`) si el bot o canales externos deben alimentarlo.
   - Definir si **FINANCE**, **SECRETARY** y **SUPERADMIN** tienen pantallas y políticas (RBAC en front y guards en API).

3. **Monorepo y mantenimiento**
   - Aclarar destino de **`apps/bot`**: añadir código fuente, scripts `dev`/`start`, alinear **versión de Prisma** con `api` (hoy 7 vs 6) o extraer esquema compartido.
   - Eliminar o fusionar **`src/app/page.tsx`** duplicado respecto a `app/page.tsx`.

4. **UX admin**
   - El header de `(protected)/layout.tsx` solo muestra enlace rápido principal por rol (p. ej. admin solo “Pacientes”); el **dashboard admin** sí lista más módulos — valorar **navegación consistente** entre header y dashboard.

5. **Calidad**
   - Ejecutar y mantener **tests** (`api` tiene Jest), cobertura de regresión para sesiones/follow-ups.
   - Documentar `.env.example` por app (sin commitear secretos).

---

## Cómo arrancar en local (referencia rápida)

- Instalar dependencias en la raíz: `pnpm install`.
- **API:** variables Prisma + JWT según proyecto; `pnpm --filter api start:dev` (o el script usado en tu entorno).
- **Web:** `pnpm --filter web dev` (puerto 3000 por defecto; puede chocar con API si ambas usan 3000 — la API usa `PORT` o 3000 por defecto en `main.ts`).

---

*Este documento se generó a partir de la estructura del repositorio y lectura de archivos clave; no sustituye pruebas end-to-end en tu entorno.*
