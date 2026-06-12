@echo off
REM ============================================================
REM Build Tauri Desktop App — NSIS installer for Windows
REM ============================================================
echo.
echo === Building Paperhelp Desktop App ===
echo.

set PROJECT_ROOT=%~dp0..

REM Check prerequisites
where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Rust/Cargo not found. Install from https://rustup.rs
    exit /b 1
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Install from https://nodejs.org
    exit /b 1
)

npx tauri --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Tauri CLI...
    npm install -g @tauri-apps/cli@latest
)

REM Check sidecar exists
set SIDECAR=%PROJECT_ROOT%\desktop\src-tauri\binaries\fastapi-server-x86_64-pc-windows-msvc.exe
if not exist "%SIDECAR%" (
    echo WARNING: Sidecar executable not found.
    echo Run build_sidecar.bat first, or the Tauri build will fail.
    echo.
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i not "%CONTINUE%"=="y" exit /b 1
)

REM Install frontend dependencies
echo Installing frontend dependencies...
cd /d "%PROJECT_ROOT%\frontend"
call npm install

REM Build Tauri app
echo Building Tauri application...
cd /d "%PROJECT_ROOT%\desktop\src-tauri"
npx tauri build --bundles nsis

if %errorlevel% neq 0 (
    echo ERROR: Tauri build failed.
    exit /b 1
)

echo.
echo === Build complete ===
echo Installer: %PROJECT_ROOT%\desktop\src-tauri\target\release\bundle\nsis\
echo.
dir /B "%PROJECT_ROOT%\desktop\src-tauri\target\release\bundle\nsis\*.exe" 2>nul
echo.
