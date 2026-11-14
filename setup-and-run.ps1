<#
 SafeWalk - one-click setup and start (Windows PowerShell).

 Run from the project root (the folder that contains "backend" and "frontend"):
     powershell -ExecutionPolicy Bypass -File .\setup-and-run.ps1

 What it does (safe to run again):
   1. Moves the old MAZT / Next.js files into "_legacy_mazt" (nothing is deleted).
   2. Checks Node.js and PostgreSQL.
   3. Asks for your PostgreSQL password, creates the "safewalk" database if missing.
   4. Creates backend\.env and frontend\.env (only if they do not exist yet; JWT secret is generated).
   5. Runs npm install in both folders and applies the Prisma migration.
   6. Opens the backend and the frontend in two new windows and opens the browser.

 E-mail (SMTP or Brevo) and AI chatbot keys are OPTIONAL: add them to backend\.env later and restart.
#>
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Step($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Fail($t) { Write-Host "`nERROR: $t" -ForegroundColor Red; Read-Host 'Press Enter to close'; exit 1 }

if (-not ((Test-Path .\backend) -and (Test-Path .\frontend))) { Fail 'Run this script from the folder that contains "backend" and "frontend".' }

# ---------------------------------------------------------------- 1. legacy cleanup
Step '1/6 Moving old MAZT files to _legacy_mazt'
$keep = @('backend', 'frontend', 'README.md', '.gitignore', 'cleanup-legacy.ps1', 'setup-and-run.ps1', 'start-postgres.ps1', 'stop-postgres.ps1', 'pgsql', '_legacy_mazt', '.git')
$legacy = Get-ChildItem -Force | Where-Object { $keep -notcontains $_.Name }
if ($legacy) {
  $dest = Join-Path $PSScriptRoot '_legacy_mazt'
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  foreach ($i in $legacy) {
    Write-Host "  moving $($i.Name)"
    Move-Item -LiteralPath $i.FullName -Destination $dest -Force
  }
} else { Write-Host '  nothing to move' }

# ---------------------------------------------------------------- 2. tools
Step '2/6 Checking Node.js and PostgreSQL'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail 'Node.js is not installed. Install the LTS version from https://nodejs.org and run this script again.' }
$nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 20) { Fail "Node.js $nodeMajor is too old. Install Node.js 20 or newer from https://nodejs.org." }
Write-Host "  Node.js $(node -v)"

$psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psql) {
  $psql = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $psql) { Fail 'PostgreSQL was not found. Install it from https://www.postgresql.org/download/windows/ (remember the password you set for the "postgres" user) and run this script again.' }
Write-Host "  PostgreSQL client: $psql"

# ---------------------------------------------------------------- 3. database
Step '3/6 Creating the "safewalk" database'
$backendEnv = '.\backend\.env'
$haveEnv = Test-Path $backendEnv
if ($haveEnv -and ((Get-Content $backendEnv -Raw) -match 'DATABASE_URL=postgresql://[^\r\n]+')) {
  Write-Host '  backend\.env already exists - keeping its DATABASE_URL.'
  $pgPass = $null
} else {
  $sec = Read-Host 'Enter the password of your PostgreSQL "postgres" user' -AsSecureString
  $pgPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
  $env:PGPASSWORD = $pgPass
  $exists = & $psql -h localhost -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='safewalk'" 2>&1
  if ($LASTEXITCODE -ne 0) { Fail "Could not connect to PostgreSQL on localhost:5432 as 'postgres' (wrong password, or the service is not running).`n$exists" }
  if (-not ("$exists".Trim() -eq '1')) {
    & $psql -h localhost -U postgres -c 'CREATE DATABASE safewalk;' | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail 'Could not create the database.' }
    Write-Host '  database "safewalk" created'
  } else { Write-Host '  database "safewalk" already exists' }
  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

# ---------------------------------------------------------------- 4. .env files
Step '4/6 Creating .env files'
if (-not $haveEnv) {
  $bytes = New-Object byte[] 48
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $jwt = -join ($bytes | ForEach-Object { $_.ToString('x2') })
  $enc = [Uri]::EscapeDataString($pgPass)
  $text = Get-Content .\backend\.env.example -Raw
  $text = $text -replace 'DATABASE_URL=[^\r\n]*', "DATABASE_URL=postgresql://postgres:$enc@localhost:5432/safewalk?schema=public"
  $text = $text -replace 'JWT_SECRET=[^\r\n]*', "JWT_SECRET=$jwt"
  [IO.File]::WriteAllText((Join-Path $PSScriptRoot 'backend\.env'), $text, (New-Object Text.UTF8Encoding($false)))
  Write-Host '  backend\.env created (database + generated JWT secret)'
} elseif ($haveEnv -and -not (Select-String -Path $backendEnv -Pattern '^JWT_SECRET=.+' -Quiet)) {
  Fail 'backend\.env exists but JWT_SECRET is empty. Fill it in (see README) and run again.'
} else { Write-Host '  backend\.env kept' }
if (-not (Test-Path .\frontend\.env)) { Copy-Item .\frontend\.env.example .\frontend\.env; Write-Host '  frontend\.env created' } else { Write-Host '  frontend\.env kept' }

# ---------------------------------------------------------------- 5. install + migrate
Step '5/6 Installing packages (this takes a few minutes the first time)'
Push-Location backend
npm install
if ($LASTEXITCODE -ne 0) { Pop-Location; Fail 'npm install failed in backend. Scroll up for the error.' }
Write-Host "`n  applying database migration..."
npx prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) { Pop-Location; Fail 'Prisma migration failed. Check DATABASE_URL in backend\.env.' }
Pop-Location

Push-Location frontend
npm install
if ($LASTEXITCODE -ne 0) { Pop-Location; Fail 'npm install failed in frontend. Scroll up for the error.' }
Pop-Location
if (-not (Test-Path .\frontend\public\models\pose_landmarker_lite.task)) {
  Write-Host "`n  WARNING: the pose model was not downloaded automatically. Downloading it now..." -ForegroundColor Yellow
  try {
    Invoke-WebRequest -Uri 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task' -OutFile .\frontend\public\models\pose_landmarker_lite.task
  } catch { Fail "Could not download the pose model: $($_.Exception.Message)" }
}

# ---------------------------------------------------------------- 6. start
Step '6/6 Starting SafeWalk'
$root = $PSScriptRoot
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location -LiteralPath '$root\backend'; `$host.UI.RawUI.WindowTitle='SafeWalk backend'; npm run dev"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location -LiteralPath '$root\frontend'; `$host.UI.RawUI.WindowTitle='SafeWalk frontend'; npm run dev"
Start-Sleep -Seconds 8
Start-Process 'http://localhost:5173'
Write-Host "`nSafeWalk is starting.`n  App:     http://localhost:5173`n  Backend: http://localhost:4000/health`nClose the two new windows to stop it. Next time just run this script again (it skips finished steps)." -ForegroundColor Green
