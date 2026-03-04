#!/usr/bin/env python3
"""VoxCode installation helper script."""

import os
import platform
import subprocess
import sys
from pathlib import Path


def run_cmd(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    """Run a command and return result."""
    print(f"  $ {' '.join(cmd)}")
    return subprocess.run(cmd, check=check, capture_output=True, text=True)


def check_python():
    """Check Python version."""
    print("Checking Python version...")
    version = sys.version_info
    if version < (3, 10):
        print(f"  ❌ Python 3.10+ required, found {version.major}.{version.minor}")
        return False
    print(f"  ✓ Python {version.major}.{version.minor}.{version.micro}")
    return True


def check_ffmpeg():
    """Check if FFmpeg is installed."""
    print("Checking FFmpeg...")
    try:
        result = run_cmd(["ffmpeg", "-version"], check=False)
        if result.returncode == 0:
            print("  ✓ FFmpeg installed")
            return True
    except FileNotFoundError:
        pass

    print("  ❌ FFmpeg not found")
    print("\nInstall FFmpeg:")
    if platform.system() == "Windows":
        print("  winget install ffmpeg")
        print("  or download from: https://ffmpeg.org/download.html")
    elif platform.system() == "Darwin":
        print("  brew install ffmpeg")
    else:
        print("  sudo apt install ffmpeg")
        print("  or: sudo dnf install ffmpeg")
    return False


def check_cuda():
    """Check CUDA availability."""
    print("Checking CUDA (GPU acceleration)...")
    try:
        import torch
        if torch.cuda.is_available():
            device = torch.cuda.get_device_name(0)
            print(f"  ✓ CUDA available: {device}")
            return True
        else:
            print("  ○ CUDA not available (CPU will be used)")
    except ImportError:
        print("  ○ PyTorch not installed yet")
    return False


def install_dependencies():
    """Install Python dependencies."""
    print("\nInstalling dependencies...")

    # Core dependencies
    deps = [
        "openai-whisper",
        "sounddevice",
        "numpy",
        "pynput",
        "pyperclip",
        "pyyaml",
        "rich",
        "typer",
        "httpx",
        "pydantic",
        "tree-sitter",
        "tree-sitter-languages",
        "watchdog",
        "platformdirs",
    ]

    # Optional: System tray
    deps.extend(["pystray", "pillow"])

    for dep in deps:
        print(f"  Installing {dep}...")
        try:
            run_cmd([sys.executable, "-m", "pip", "install", dep])
        except subprocess.CalledProcessError as e:
            print(f"    ⚠ Failed to install {dep}: {e}")

    print("  ✓ Dependencies installed")


def install_voxcode():
    """Install VoxCode package."""
    print("\nInstalling VoxCode...")
    voxcode_dir = Path(__file__).parent.parent

    try:
        run_cmd([sys.executable, "-m", "pip", "install", "-e", str(voxcode_dir)])
        print("  ✓ VoxCode installed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ❌ Installation failed: {e}")
        return False


def create_config():
    """Create default configuration."""
    print("\nCreating configuration...")
    from platformdirs import user_config_dir

    config_dir = Path(user_config_dir("voxcode"))
    config_file = config_dir / "config.yaml"

    if config_file.exists():
        print(f"  ○ Config already exists: {config_file}")
        return

    config_dir.mkdir(parents=True, exist_ok=True)

    default_config = Path(__file__).parent.parent / "configs" / "default.yaml"
    if default_config.exists():
        config_file.write_text(default_config.read_text())
        print(f"  ✓ Created config: {config_file}")
    else:
        print("  ⚠ Default config not found")


def download_model():
    """Download default Whisper model."""
    print("\nDownloading Whisper model (base.en)...")
    try:
        import whisper
        whisper.load_model("base.en")
        print("  ✓ Model downloaded")
    except Exception as e:
        print(f"  ⚠ Model download failed: {e}")
        print("  Model will be downloaded on first use")


def main():
    """Run installation."""
    print("=" * 50)
    print("VoxCode Installation")
    print("=" * 50)
    print()

    if not check_python():
        sys.exit(1)

    check_ffmpeg()
    install_dependencies()
    check_cuda()

    if not install_voxcode():
        sys.exit(1)

    create_config()
    download_model()

    print("\n" + "=" * 50)
    print("✓ Installation complete!")
    print("=" * 50)
    print("\nRun VoxCode:")
    print("  voxcode")
    print("\nOr run with debug output:")
    print("  voxcode --debug")
    print("\nConfigure:")
    print("  voxcode config --edit")
    print()


if __name__ == "__main__":
    main()
