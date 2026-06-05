# GiDi — laptop nueva (sin USB, sin olvidar .env)

## Idea general

| Dónde vive qué | Para qué |
|----------------|----------|
| **GitHub** | Todo el código |
| **Railway** | Secretos de **producción** (BD, JWT, URLs públicas) |
| **Tu laptop** | `.env` locales — se **generan** desde Railway con un script |

Los `.env` **no van a GitHub** (seguridad). Pero **no hace falta USB**: los sacas de Railway con un comando.

---

## Una vez: enlazar Railway ↔ GitHub (deploy automático)

Haz esto en [railway.app](https://railway.app) con el proyecto **GiDi2.0**:

### Servicio **Gidi API**

1. Abre el servicio → pestaña **Settings**
2. **Source** → **Connect GitHub Repo** (autoriza GitHub si pide)
3. Elige el repo: **jonyts25/GiDi**
4. Branch: **main**
5. **Root Directory**: déjalo **vacío** (no `apps/api`)
6. **Custom Start Command**: déjalo **vacío** (usa variables Nixpacks del proyecto)
7. Guarda. Railway hará un deploy desde GitHub.

### Servicio **GiDi WEB**

1. Mismo repo: **jonyts25/GiDi**
2. Branch: **main**
3. **Root Directory**: **vacío**
4. Variables que deben seguir existiendo:
   - `NEXT_PUBLIC_API_URL` = `https://gidi-api-production.up.railway.app`
   - `NIXPACKS_START_CMD` = `pnpm --filter web start`
   - `NIXPACKS_BUILD_CMD` = `NODE_ENV=development pnpm run build:web && test -d apps/web/.next`
5. **No** pongas `RAILWAY_CONFIG_FILE` en web (evita healthcheck de API).

### Después de enlazar

Flujo normal:

```text
editas código → git push → Railway despliega solo (API + Web)
```

No necesitas `railway up` salvo emergencia.

---

## En la laptop (cada máquina nueva)

### 1. Instalar (una vez)

- [Node.js 22+](https://nodejs.org)
- `npm i -g pnpm`
- `npm i -g @railway/cli` (o usa `npx @railway/cli`)

### 2. Clonar y preparar

```powershell
git clone https://github.com/jonyts25/GiDi.git
cd GiDi
pnpm install
railway login
railway link
# Elige: workspace → proyecto GiDi2.0 → servicio Gidi API (cualquiera sirve para leer vars)
.\scripts\setup-laptop.ps1
```

El script crea:

- `apps/api/.env` — BD y JWT **desde Railway**
- `apps/web/.env.local` — apunta a `http://localhost:3001` para desarrollo local

### 3. Probar local

```powershell
# Terminal 1
cd apps\api
pnpm run start:dev

# Terminal 2
cd apps\web
pnpm run dev
```

→ http://localhost:3000

### 4. Subir cambios a producción

```powershell
cd GiDi
git add .
git commit -m "Descripción del cambio"
git push
```

Si Railway ya está enlazado a GitHub, en 2–5 minutos se actualiza solo.

---

## ¿Puedo ver las variables en Railway sin el script?

Sí, en el panel:

**Gidi API** → **Variables** → ver/copiar `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`

O en terminal (muestra valores reales — no compartas la pantalla):

```powershell
npx @railway/cli variable list --service "Gidi API" --kv
```

---

## Deploy automático (GitHub → Railway)

Tras enlazar el repo, cada `git push` a `main` debe crear un deploy **SUCCESS** en API y Web.
Última verificación automática: 2026-06-05.

## Checklist “todo listo”

- [ ] GitHub: [github.com/jonyts25/GiDi](https://github.com/jonyts25/GiDi)
- [ ] Railway API + Web **Connect GitHub Repo** → `main`, root vacío
- [ ] Producción responde: web y `/health` de la API
- [ ] En laptop: `git clone` + `setup-laptop.ps1` funciona

---

## Si algo truena en una demo

1. Revisa deploy en Railway (debe decir **SUCCESS**, no solo Online)
2. `git push` si el código no llegó
3. Variables en Railway intactas (GitHub no las borra)
4. Local: vuelve a correr `.\scripts\setup-laptop.ps1`
