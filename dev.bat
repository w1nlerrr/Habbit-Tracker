@echo off
setlocal
cd /d "%~dp0"

echo Starting development servers...
echo API:    http://127.0.0.1:3000
echo Client: http://127.0.0.1:5173
echo.

start "Habit Tracker API" cmd /k "npm run dev:server"
start "Habit Tracker Client" cmd /k "npm run dev:client"

echo Two windows were opened. Close them to stop the servers.
