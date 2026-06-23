@echo off
echo.
echo ═══════════════════════════════════════════════════════
echo    RESTARTING LOW-CODE AI SERVERS
echo ═══════════════════════════════════════════════════════
echo.

echo [1/2] Stopping existing processes...
taskkill /F /FI "WINDOWTITLE eq Backend Server*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Frontend Server*" >nul 2>&1
timeout /t 2 >nul

echo [2/2] Starting servers...
cd backend
start "Backend Server" cmd /k "python app.py"
cd ..

cd frontend
start "Frontend Server" cmd /k "npm run dev"
cd ..

echo.
echo ✓ Servers restarted successfully!
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Press any key to close this window...
pause >nul
