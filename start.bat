@echo off
echo Starting AI Model Trainer with Data Cleaning Pipeline...
echo.

echo Starting Backend Server...
cd backend
start "Backend Server" cmd /k "venv_new\Scripts\python.exe app.py"
cd ..

echo.
echo Starting Frontend Server...
cd frontend
start "Frontend Server" cmd /k "npm run dev"
cd ..

echo.
echo Services are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Press any key to exit...
pause > nul
