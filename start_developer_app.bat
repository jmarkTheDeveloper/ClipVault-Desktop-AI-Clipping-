@echo off
title ClipVault AI Video Studio - Developer Studio
cd /d "%~dp0"

:: Prevent mouse clicks from freezing/pausing execution in QuickEdit mode
reg add "HKCU\Console" /v QuickEdit /t REG_DWORD /d 0 /f >nul 2>&1

echo ========================================================
echo   Starting ClipVault AI Video Studio [Developer Studio]
echo ========================================================
echo.
echo Mode: Developer Edition
echo Live Reload: Enabled (Vite HMR on port 54321)
echo Dev Tools: Enabled (Dev Tier Matrix and Simulation Switcher)
echo.
npm run dev:developer
pause
