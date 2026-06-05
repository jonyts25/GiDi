# Arreglo Railway — actualizado

**API:** deploy `7a5b8f6e` → **SUCCESS** (jun 2026). Fallaba `pnpm exec prisma` → ahora `npx prisma` en `start-prod.cjs`.

**WEB:** no debe usar el script `start` de la raíz (arrancaba la API). Usar `NIXPACKS_START_CMD=pnpm --filter web start`.

---

# Arreglo urgente Railway (lee esto primero)

## El problema

El servicio **Gidi API** en Railway tiene:

1. **Root Directory** = `apps/api` → no sube el monorepo (`@gidi/bot`, `package.json` raíz).
2. **Start command** del panel = `pnpm run start:api` → en `apps/api` ese script no existía (ya añadido, pero sin monorepo sigue fallando el build).

Por eso ves **Online** pero con código del **27 may**; los deploys nuevos fallan.

## Qué hacer en el panel (2 minutos)

### Servicio **Gidi API**

1. Railway → **Gidi API** → **Settings**
2. **Root Directory** → **borrar** el valor (`apps/api`) y dejar **vacío** (raíz del repo).
3. **Deploy** → **Custom Start Command** → **borrar** (dejar vacío; usa `railway.toml`).
4. Guardar → **Redeploy**

### Servicio **GiDi WEB**

1. **Root Directory** → vacío
2. Variable `RAILWAY_CONFIG_FILE` = `railway.web.toml` (ya debería estar)
3. Custom Start Command → vacío

## Redeploy desde tu PC

```powershell
cd d:\apps\GiDi2.0
npx @railway/cli variable delete RAILWAY_CONFIG_FILE --service "Gidi API"
npx @railway/cli up --service "Gidi API"
npx @railway/cli up --service "GiDi WEB"
```

Comprueba que el último deployment diga **SUCCESS**:

```powershell
npx @railway/cli deployment list --service "Gidi API" --limit 1
```

## URLs

- Web: https://gidi-web-production.up.railway.app
- API: https://gidi-api-production.up.railway.app/health
