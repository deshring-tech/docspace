@echo off
rem ============================================================
rem  DocSpace one-click launcher
rem  - Installs dependencies on first run
rem  - Builds the app if no production build exists
rem  - Starts the server on http://localhost:4680
rem  - Opens your default browser
rem  Close the server window (or press Ctrl+C in it) to stop.
rem ============================================================
title DocSpace Launcher
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo [DocSpace] Node.js was not found. Install it from https://nodejs.org and run this again.
    pause
    exit /b 1
)

rem If DocSpace (or anything) is already listening on 4680, don't start a
rem second copy - just open the browser.
netstat -ano | findstr ":4680" | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo [DocSpace] Already running - opening browser...
    start "" "http://localhost:4680"
    timeout /t 2 /nobreak >nul
    exit /b 0
)

if not exist node_modules (
    echo [DocSpace] First run - installing dependencies. This happens only once...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo [DocSpace] npm install failed. See the messages above.
        pause
        exit /b 1
    )
)

if not exist .next\BUILD_ID (
    echo [DocSpace] Building the app. This happens only after code changes...
    call npm run build
    if errorlevel 1 (
        echo [DocSpace] Build failed. See the messages above.
        pause
        exit /b 1
    )
)

echo [DocSpace] Starting server on http://localhost:4680 ...
start "DocSpace Server (close this window to stop)" cmd /k "npm run start"

rem Give the server a moment to come up, then open the browser.
timeout /t 3 /nobreak >nul
start "" "http://localhost:4680"

echo [DocSpace] Launched. This window can be closed.
timeout /t 4 /nobreak >nul
exit /b 0
