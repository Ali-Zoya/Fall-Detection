<#
  Stops the local PostgreSQL server.
  Run from the project root:
      powershell -ExecutionPolicy Bypass -File .\stop-postgres.ps1
#>
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$pgBin = Join-Path $root 'pgsql\bin'
$pgData = Join-Path $root 'pgsql\data'

if (Test-Path (Join-Path $pgBin 'pg_ctl.exe')) {
  & (Join-Path $pgBin 'pg_ctl.exe') -D "$pgData" -m fast stop
} else {
  Get-Process postgres -ErrorAction SilentlyContinue | Stop-Process -Force
}
Write-Host "PostgreSQL stopped." -ForegroundColor Yellow

