# Marca todas las migraciones como aplicadas (sin ejecutar SQL).
# Usar UNA VEZ si la BD ya tiene el esquema (p. ej. tras prisma db push) y migrate deploy da P3005.

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$migrations = Get-ChildItem "prisma\migrations" -Directory | Sort-Object Name
if ($migrations.Count -eq 0) {
  Write-Error "No hay carpetas en prisma/migrations"
}

Write-Host "Marcando $($migrations.Count) migraciones como aplicadas..."
foreach ($m in $migrations) {
  Write-Host "  -> $($m.Name)"
  pnpm exec prisma migrate resolve --applied $m.Name
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Listo. Prueba: pnpm exec prisma migrate deploy"
