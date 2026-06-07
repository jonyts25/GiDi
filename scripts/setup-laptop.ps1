# Genera .env locales desde Railway (sin USB ni copiar a mano).
#
# Requisitos: Node 22+, pnpm install hecho, railway CLI logueado y proyecto enlazado.
#
# Uso (despues de git clone):
#   cd GiDi
#   pnpm install
#   railway login
#   railway link          # proyecto GiDi2.0, servicio Gidi API
#   .\scripts\setup-laptop.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Invoke-Railway {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)

    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
        if (Get-Command railway -ErrorAction SilentlyContinue) {
            return & railway @Args 2>$null
        }
        $env:npm_config_loglevel = "error"
        return & npx --yes @railway/cli @Args 2>$null
    } finally {
        $ErrorActionPreference = $prevEap
    }
}

function Get-RailwayVar {
    param([string]$Service, [string]$Key)
    $json = Invoke-Railway variable list --service $Service --json | Out-String
    try {
        $vars = $json | ConvertFrom-Json
    } catch {
        return $null
    }
    return $vars.$Key
}

Write-Host "Leyendo variables de Railway (servicio Gidi API)..."
$db = Get-RailwayVar "Gidi API" "DATABASE_URL"
$direct = Get-RailwayVar "Gidi API" "DIRECT_URL"
$jwt = Get-RailwayVar "Gidi API" "JWT_SECRET"

if (-not $db -or -not $direct -or -not $jwt) {
    Write-Error @"
No pude leer DATABASE_URL, DIRECT_URL o JWT_SECRET.

1) railway login
2) railway link   (workspace -> GiDi2.0 -> Gidi API)
3) Vuelve a ejecutar: .\scripts\setup-laptop.ps1

Si railway no se reconoce: npm install -g @railway/cli
"@
}

$apiEnv = @"
PORT=3001
DATABASE_URL=$db
DIRECT_URL=$direct
JWT_SECRET=$jwt
CORS_ORIGINS=http://localhost:3000
SEED_DEMO_PASSWORD=Admin123!
"@

$apiPath = Join-Path $root "apps\api\.env"
[System.IO.File]::WriteAllText($apiPath, $apiEnv.TrimEnd() + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
Write-Host "OK: $apiPath"

$webEnv = @"
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
"@

$webLocal = Join-Path $root "apps\web\.env.local"
[System.IO.File]::WriteAllText($webLocal, $webEnv.TrimEnd() + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
Write-Host "OK: $webLocal (API local en http://localhost:3001)"

Write-Host ""
Write-Host "Generando Prisma client y compilando @gidi/bot..."
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
Push-Location (Join-Path $root "apps\api")
pnpm exec prisma generate | Out-Host
Pop-Location
pnpm --filter @gidi/bot run build | Out-Host
$ErrorActionPreference = $prevEap
Write-Host "OK: dependencias de desarrollo listas"

Write-Host ""
Write-Host "Listo. Arranca local (desde la raiz del repo):"
Write-Host '  pnpm --filter api run start:dev'
Write-Host '  pnpm --filter web run dev'
Write-Host ""
Write-Host "Verifica alineacion con GitHub (ver GIT_ALINEACION.md):"
Write-Host "  git fetch origin"
Write-Host "  git status"
Write-Host "  git log -1 --oneline"
