@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo  Habit Tracker
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 24 or newer is required.
  echo Download and install: https://nodejs.org/
  pause
  exit /b 1
)

if not exist ".env" (
  echo [INFO] First run detected. Configuring database and building the project...
  echo.
  powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\bootstrap.ps1"
  if errorlevel 1 (
    echo.
    echo [ERROR] Automatic setup failed. Read the messages above.
    pause
    exit /b 1
  )
)

if not exist "node_modules" (
  echo [INFO] Installing dependencies...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
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
echo [INFO] Checking database migrations...
call npm run db:deploy -w @habit/server
if errorlevel 1 (
  echo.
  echo [ERROR] Cannot connect to the database.
  echo Make sure PostgreSQL is running.
  echo To reconfigure from scratch: delete .env and run start.bat again.
  pause
  exit /b 1
)

echo.
echo Habit Tracker is running: http://localhost:3000
echo Press Ctrl+C to stop.
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3000'"

set NODE_ENV=production
set SERVE_CLIENT=true
set COOKIE_SECURE=false
node "apps\server\dist\index.js"

pause

