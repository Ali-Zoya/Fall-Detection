@echo off
set ROOT=%~dp0
set PGBIN=%ROOT%pgsql\bin
set PGDATA=%ROOT%pgsql\data

echo [SafeWalk] Checking PostgreSQL status on port 5432...
powershell -NoProfile -Command "if (Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue) { Write-Host '[SafeWalk] PostgreSQL is already running on port 5432.' -ForegroundColor Green; exit 0 } else { exit 1 }"
if %ERRORLEVEL% equ 0 goto done

echo [SafeWalk] Starting local PostgreSQL...
powershell -NoProfile -Command "Start-Process -FilePath '%PGBIN%\postgres.exe' -ArgumentList '-D', '%PGDATA%' -WindowStyle Hidden"

powershell -NoProfile -Command "Start-Sleep -Seconds 2; if (Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue) { Write-Host '[SafeWalk] PostgreSQL started successfully on port 5432!' -ForegroundColor Green } else { Write-Host '[SafeWalk] Still starting, please wait a moment...' -ForegroundColor Yellow }"

:done
echo.
pause
