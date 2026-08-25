@echo off
title ClipVault AI Video Studio
cd /d "%~dp0"
echo ========================================================
echo   Starting ClipVault AI Video Studio (Desktop App)
echo ========================================================
echo.
npm run dev:electron
pause
