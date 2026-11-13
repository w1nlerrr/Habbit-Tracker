@echo off
setlocal
cd /d "%~dp0"

set NODE_ENV=production
set SERVE_CLIENT=true
set COOKIE_SECURE=false

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 24 or newer is required. Download: https://nodejs.org/
  pause
  exit /b 1
)

if not exist ".env" (
  echo [ERROR] Configuration file .env not found. Run setup.bat first.
  pause
  exit /b 1
)

if not exist "apps\client\dist\index.html" goto :build
if not exist "apps\server\dist\index.js" goto :build
goto :migrate

:build
echo [INFO] Building application...
call npm run build
if errorlevel 1 (
  echo [ERROR] Build failed.
  pause
  exit /b 1
)

:migrate
echo [INFO] Applying database migrations...
call npm run db:deploy -w @habit/server
if errorlevel 1 (
  echo [ERROR] Migration failed. Check that PostgreSQL is running and .env is correct.
  pause
  exit /b 1
)

echo.
echo Habit Tracker is starting: http://127.0.0.1:3000
echo Press Ctrl+C to stop the server.
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://127.0.0.1:3000'"
node "apps\server\dist\index.js"

pause
