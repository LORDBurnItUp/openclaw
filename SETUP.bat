@echo off
:: ============================================================================
:: SETUP.bat — OpenClaw One-Click Launcher
:: Double-click this file to run the full setup & deploy wizard
:: ============================================================================

title OpenClaw Setup
cd /d "%~dp0"

:: Check PowerShell is available
where powershell >nul 2>&1
if errorlevel 1 (
    echo ERROR: PowerShell not found. This requires Windows 10/11.
    pause
    exit /b 1
)

:: Run the PowerShell setup script
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0SETUP.ps1"
