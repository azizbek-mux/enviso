@echo off
title Video to Learning App
cd /d "%~dp0"

echo.
echo  ===============================================
echo    Starting the app...
echo    Wait about 10 seconds.
echo    Your browser will open by itself.
echo.
echo    To stop the app: just close this window.
echo  ===============================================
echo.

if not exist "node_modules" (
  echo  First run - installing, this takes a few minutes...
  call npm install
)

start "" /b cmd /c "timeout /t 10 /nobreak > nul && explorer http://localhost:3000"

call npm run dev

echo.
echo  The app has stopped. Press any key to close this window.
pause > nul
