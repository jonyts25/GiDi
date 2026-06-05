# Genera .env locales desde Railway (sin USB ni copiar a mano).
# Requisitos: Node 22+, pnpm, railway CLI logueado y proyecto enlazado.
#
# Uso (después de git clone):
#   cd GiDi
#   pnpm install
#   railway login          # una vez
#   railway link           # elige proyecto GiDi2.0
#   .\scripts\setup-laptop.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Get-RailwayVar {
    param([string]$Service, [string]$Key)
    $line = npx @railway/cli variable list --service $Service --kv 2>$null |
        Where-Object { $_ -match "^${Key}=" } |
        Select-Object -First 1
    if (-not $line) { return $null }
    return ($line -replace "^${Key}=", "")
}

Write-Host "Leyendo variables de Railway (servicio Gidi API)..."
$db = Get-RailwayVar "Gidi API" "DATABASE_URL"
$direct = Get-RailwayVar "Gidi API" "DIRECT_URL"
$jwt = Get-RailwayVar "Gidi API" "JWT_SECRET"

if (-not $db -or -not $direct -or -not $jwt) {
    Write-Error @"
No pude leer DATABASE_URL, DIRECT_URL o JWT_SECRET.
1) npx @railway/cli login
2) npx @railway/cli link   (proyecto GiDi2.0)
3) Vuelve a ejecutar este script.
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
Set-Content -Path $apiPath -Value $apiEnv.TrimEnd() -Encoding UTF8
Write-Host "OK: $apiPath"

$webExample = Join-Path $root "apps\web\.env.example"
$webLocal = Join-Path $root "apps\web\.env.local"
if (Test-Path $webExample) {
    Copy-Item $webExample $webLocal -Force
    Write-Host "OK: $webLocal (desde .env.example — API local en :3001)"
}

Write-Host ""
Write-Host "Listo. Arranca local:"
Write-Host "  cd apps\api && pnpm run start:dev"
Write-Host "  cd apps\web && pnpm run dev"
