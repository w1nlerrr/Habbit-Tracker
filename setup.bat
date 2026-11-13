@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo  Habit Tracker - first-time setup
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 24 or newer is required. Download: https://nodejs.org/
  pause
  exit /b 1
)

if not exist ".env" (
  echo [ERROR] Configuration file .env not found.
  if exist ".env.example" copy ".env.example" ".env" >nul
  echo A template was created: .env
  echo Open it, fill in PostgreSQL credentials, then run setup.bat again.
  pause
  exit /b 1
)

echo [1/5] Installing dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 goto :fail

echo [2/5] Creating database and roles...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\setup-db.ps1"
if errorlevel 1 goto :fail

echo [3/5] Building project...
call npm run build
if errorlevel 1 goto :fail

echo [4/5] Applying database migrations...
call npm run db:deploy -w @habit/server
if errorlevel 1 goto :fail

echo [5/5] Loading demo data...
call npm run db:seed -w @habit/server
if errorlevel 1 echo [WARN] Demo data was not loaded. You can skip this step.

echo.
echo Setup completed successfully.
echo Run start.bat to launch the application.
pause
exit /b 0

:fail
echo.
echo [ERROR] Setup failed. See messages above.
pause
exit /b 1
