@echo off
REM ============================================================
REM Build FastAPI Sidecar — PyInstaller bundle
REM ============================================================
echo.
echo === Building FastAPI Sidecar ===
echo.

cd /d "%~dp0..\backend"

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Please install Python 3.10+.
    exit /b 1
)

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt -q
pip install pyinstaller -q

REM Build with PyInstaller
echo Building sidecar executable...
pyinstaller fastapi_server.spec --clean --noconfirm

if %errorlevel% neq 0 (
    echo ERROR: PyInstaller build failed.
    exit /b 1
)

REM Copy to Tauri binaries directory
set TAURI_BIN=%~dp0..\desktop\src-tauri\binaries
if not exist "%TAURI_BIN%" mkdir "%TAURI_BIN%"

echo Copying executable to Tauri binaries...
copy /Y "dist\fastapi-server.exe" "%TAURI_BIN%\fastapi-server-x86_64-pc-windows-msvc.exe"

echo.
echo === Sidecar build complete ===
echo Output: %TAURI_BIN%\fastapi-server-x86_64-pc-windows-msvc.exe
echo.
