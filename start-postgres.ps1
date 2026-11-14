<#
  Starts the local PostgreSQL server (SafeWalk database).
  Run from the project root:
      powershell -ExecutionPolicy Bypass -File .\start-postgres.ps1
#>
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$pgBin = Join-Path $root 'pgsql\bin'
$pgData = Join-Path $root 'pgsql\data'

if (-not (Test-Path (Join-Path $pgBin 'postgres.exe'))) {
  Write-Error "PostgreSQL binaries not found in $pgBin"
}

$portOpen = Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($portOpen) {
  Write-Host "PostgreSQL is already running on port 5432." -ForegroundColor Green
  exit 0
}

Write-Host "Starting local PostgreSQL..." -ForegroundColor Cyan
$logFile = Join-Path $pgData 'server.log'
Start-Process -FilePath (Join-Path $pgBin 'postgres.exe') -ArgumentList "-D", "`"$pgData`"" -RedirectStandardOutput $logFile -RedirectStandardError $logFile -WindowStyle Hidden
Start-Sleep -Seconds 3

$portOpen = Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($portOpen) {
  Write-Host "PostgreSQL started successfully on port 5432." -ForegroundColor Green
} else {
  Write-Warning "PostgreSQL process launched; check pgsql\data\server.log if connection fails."
}

