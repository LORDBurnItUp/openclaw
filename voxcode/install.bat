@echo off
:: VoxCode One-Click Installer for Windows
:: Run this script to install VoxCode with all dependencies

echo.
echo ========================================
echo   VoxCode Installer
echo   Voice Coding with AI Superpowers
echo ========================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    echo Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

:: Check Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYVER=%%i
echo [OK] Found Python %PYVER%

:: Check FFmpeg
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [WARN] FFmpeg not found - installing via winget...
    winget install ffmpeg
    if errorlevel 1 (
        echo [WARN] Could not auto-install FFmpeg.
        echo Please install manually from https://ffmpeg.org/download.html
    )
) else (
    echo [OK] FFmpeg found
)

echo.
echo Installing VoxCode...
echo.

:: Upgrade pip
python -m pip install --upgrade pip

:: Install VoxCode with all features
pip install -e ".[all]"

if errorlevel 1 (
    echo.
    echo [ERROR] Installation failed!
    echo Try running: pip install -e .
    pause
    exit /b 1
)

echo.
echo [OK] VoxCode installed successfully!
echo.

:: Download Whisper model
echo Downloading Whisper model (base.en)...
python -c "import whisper; whisper.load_model('base.en')"

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo To start VoxCode, run:
echo   voxcode
echo.
echo To configure:
echo   voxcode setup
echo.
echo For local AI (free, private):
echo   1. Install Ollama: https://ollama.com
echo   2. Run: ollama pull codellama
echo   3. Run: ollama serve
echo.
pause
