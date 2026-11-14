<#
 Moves the OLD MAZT (Next.js) files out of the project root into a "_legacy_mazt" folder,
 so only the new SafeWalk "backend" and "frontend" folders remain.
 Nothing is deleted. Review _legacy_mazt afterwards and delete it yourself when you are happy.

 Run from the project root (the folder that contains "backend" and "frontend"):
     powershell -ExecutionPolicy Bypass -File .\cleanup-legacy.ps1
#>
$ErrorActionPreference = 'Stop'
if (-not ((Test-Path .\backend) -and (Test-Path .\frontend))) {
  Write-Error 'Run this script from the project root that contains the "backend" and "frontend" folders.'
}
$keep = @('backend', 'frontend', 'README.md', '.gitignore', 'cleanup-legacy.ps1', 'setup-and-run.ps1', 'start-postgres.ps1', 'stop-postgres.ps1', 'pgsql', '_legacy_mazt', '.git')
$dest = Join-Path (Get-Location) '_legacy_mazt'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Get-ChildItem -Force | Where-Object { $keep -notcontains $_.Name } | ForEach-Object {
  Write-Host "Moving $($_.Name)"
  Move-Item -LiteralPath $_.FullName -Destination $dest
}
Write-Host 'Done. Old MAZT files are in _legacy_mazt.'
