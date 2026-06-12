@echo off
REM ============================================================
REM Build All — Sidecar + Tauri App in one command
REM ============================================================
echo.
echo ========================================
echo  Paperhelp Desktop App — Full Build
echo ========================================
echo.

REM Step 1: Build sidecar
echo [1/2] Building FastAPI sidecar...
call "%~dp0build_sidecar.bat"
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Sidecar build failed. Aborting.
    exit /b 1
)

REM Step 2: Build Tauri app
echo [2/2] Building Tauri desktop app...
call "%~dp0build_app.bat"
if %errorlevel% neq 0 (
    echo.
    echo ERROR: App build failed.
    exit /b 1
)

echo.
echo ========================================
echo  Build completed successfully!
echo ========================================
echo.
