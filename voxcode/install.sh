#!/bin/bash
# VoxCode One-Click Installer for macOS/Linux
# Run: chmod +x install.sh && ./install.sh

set -e

echo ""
echo "========================================"
echo "  VoxCode Installer"
echo "  Voice Coding with AI Superpowers"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON=python3
elif command -v python &> /dev/null; then
    PYTHON=python
else
    echo -e "${RED}[ERROR]${NC} Python not found!"
    echo "Please install Python 3.10+ from https://python.org"
    exit 1
fi

PY_VERSION=$($PYTHON --version 2>&1 | awk '{print $2}')
echo -e "${GREEN}[OK]${NC} Found Python $PY_VERSION"

# Check Python version (need 3.10+)
PY_MAJOR=$($PYTHON -c "import sys; print(sys.version_info.major)")
PY_MINOR=$($PYTHON -c "import sys; print(sys.version_info.minor)")

if [ "$PY_MAJOR" -lt 3 ] || ([ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 10 ]); then
    echo -e "${RED}[ERROR]${NC} Python 3.10+ required, found $PY_VERSION"
    exit 1
fi

# Check/Install FFmpeg
if command -v ffmpeg &> /dev/null; then
    echo -e "${GREEN}[OK]${NC} FFmpeg found"
else
    echo -e "${YELLOW}[WARN]${NC} FFmpeg not found - attempting to install..."

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install ffmpeg
        else
            echo "Please install Homebrew first: https://brew.sh"
            echo "Then run: brew install ffmpeg"
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt &> /dev/null; then
            sudo apt update && sudo apt install -y ffmpeg
        elif command -v dnf &> /dev/null; then
            sudo dnf install -y ffmpeg
        elif command -v pacman &> /dev/null; then
            sudo pacman -S ffmpeg
        else
            echo "Please install FFmpeg manually for your distribution"
        fi
    fi
fi

echo ""
echo "Installing VoxCode..."
echo ""

# Create virtual environment (optional but recommended)
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    $PYTHON -m venv venv
fi

# Activate venv
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null || true

# Upgrade pip
$PYTHON -m pip install --upgrade pip

# Install VoxCode
pip install -e ".[all]"

if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Installation failed!"
    exit 1
fi

echo -e "${GREEN}[OK]${NC} VoxCode installed successfully!"
echo ""

# Download Whisper model
echo "Downloading Whisper model (base.en)..."
$PYTHON -c "import whisper; whisper.load_model('base.en')"

echo ""
echo "========================================"
echo -e "  ${GREEN}Installation Complete!${NC}"
echo "========================================"
echo ""
echo -e "To start VoxCode, run:"
echo -e "  ${CYAN}voxcode${NC}"
echo ""
echo -e "To configure:"
echo -e "  ${CYAN}voxcode setup${NC}"
echo ""
echo -e "For local AI (free, private):"
echo -e "  1. Install Ollama: ${CYAN}https://ollama.com${NC}"
echo -e "  2. Run: ${CYAN}ollama pull codellama${NC}"
echo -e "  3. Run: ${CYAN}ollama serve${NC}"
echo ""
