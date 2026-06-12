# build_tauri.ps1 - Setup MSVC environment and build Tauri app
$ErrorActionPreference = "Stop"

# Setup MSVC environment using vcvarsall.bat
Write-Host "Setting up MSVC x64 environment..."
$vcvarsOutput = cmd /c "`"E:\c++\VC\Auxiliary\Build\vcvarsall.bat`" x64 >nul 2>&1 && set"

# Parse environment variables from vcvarsall output
$envPairs = @{}
foreach ($line in ($vcvarsOutput -split "`r`n")) {
    if ($line -match '^([^=]+)=(.*)$') {
        $envPairs[$matches[1]] = $matches[2]
    }
}

# Apply critical environment variables
if ($envPairs.ContainsKey('PATH')) { $env:PATH = $envPairs['PATH'] }
if ($envPairs.ContainsKey('LIB')) { $env:LIB = $envPairs['LIB'] }
if ($envPairs.ContainsKey('INCLUDE')) { $env:INCLUDE = $envPairs['INCLUDE'] }
if ($envPairs.ContainsKey('LIBPATH')) { $env:LIBPATH = $envPairs['LIBPATH'] }

# Verify cl.exe is available
$clPath = (Get-Command cl.exe -ErrorAction SilentlyContinue).Source
if ($clPath) {
    Write-Host "MSVC compiler found: $clPath"
} else {
    Write-Host "ERROR: cl.exe not found in PATH" -ForegroundColor Red
    exit 1
}

# Explicitly set CC/CXX/AR for the cc crate to use MSVC
$env:CC_x86_64_pc_windows_msvc = $clPath
$env:CXX_x86_64_pc_windows_msvc = $clPath -replace 'cl\.exe$', 'cl.exe'
$env:AR_x86_64_pc_windows_msvc = (Join-Path (Split-Path $clPath) 'lib.exe')
$env:CC = $clPath
$env:CXX = $clPath
$env:AR = (Join-Path (Split-Path $clPath) 'lib.exe')
Write-Host "CC = $env:CC"
Write-Host "AR = $env:AR"

# Run Tauri build
Write-Host ""
Write-Host "=== Starting Tauri Build ==="
Write-Host ""
Set-Location "C:\Users\WQF\.qoderworkcn\workspace\mqa84s0wjfc9jiwf\desktop\src-tauri"
& npx tauri build --bundles nsis --target x86_64-pc-windows-msvc
exit $LASTEXITCODE
