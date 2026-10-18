@echo off
title ClipVault AI Video Studio - Consumer Product
cd /d "%~dp0"

:: Prevent mouse clicks from freezing execution while keeping mouse-wheel scrolling active (9000-line scrollback)
reg add "HKCU\Console" /v QuickEdit /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU\Console" /v TerminalScrolling /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKCU\Console" /v ScreenBufferSize /t REG_DWORD /d 589889656 /f >nul 2>&1

echo ========================================================
echo   Starting ClipVault AI Video Studio [Consumer Product]
echo ========================================================
echo.
echo Mode: Consumer Edition (Production distribution)
echo Live Reload: Disabled (Safe from real-time developer edits)
echo Dev Tools: Hidden (Pristine customer-facing experience)
echo.

if not exist "dist\index.html" (
    echo Building latest consumer assets...
    call npm run build
)

npm run start:consumer
pause
