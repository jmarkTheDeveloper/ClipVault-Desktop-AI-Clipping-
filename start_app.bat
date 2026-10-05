@echo off
title ClipVault AI Video Studio Launcher
cd /d "%~dp0"

:: Prevent mouse clicks from freezing/pausing execution in QuickEdit mode
reg add "HKCU\Console" /v QuickEdit /t REG_DWORD /d 0 /f >nul 2>&1

:MENU
cls
echo ========================================================
echo          ClipVault AI Video Studio Launcher
echo ========================================================
echo.
echo Select the edition to launch:
echo.
echo   [1] Consumer Product
echo       - Pristine customer-facing experience
echo       - Developer matrix and simulation banners hidden
echo       - Isolated from real-time source code changes
echo.
echo   [2] Developer Studio
echo       - Vite hot-reloading server (HMR on port 54321)
echo       - Real-time instant code and style updates
echo       - Developer Tier Matrix and tier simulation controls
echo.
echo   [3] Build Production Bundle (npm run build)
echo   [4] Exit
echo.
echo ========================================================
set /p choice="Enter choice (1-4, default 1): "

if "%choice%"=="" set choice=1
if "%choice%"=="1" goto CONSUMER
if "%choice%"=="2" goto DEVELOPER
if "%choice%"=="3" goto BUILD
if "%choice%"=="4" goto EXIT

echo Invalid option. Please select 1, 2, 3, or 4.
timeout /t 2 >nul
goto MENU

:CONSUMER
cls
echo Starting Consumer Product...
call start_consumer_app.bat
goto EXIT

:DEVELOPER
cls
echo Starting Developer Studio...
call start_developer_app.bat
goto EXIT

:BUILD
cls
echo Building production assets...
call npm run build
echo.
echo Build complete.
pause
goto MENU

:EXIT
exit
