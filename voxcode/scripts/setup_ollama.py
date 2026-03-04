#!/usr/bin/env python3
"""Setup Ollama for local AI inference."""

import platform
import subprocess
import sys
import time

import httpx


def check_ollama_installed() -> bool:
    """Check if Ollama is installed."""
    try:
        result = subprocess.run(
            ["ollama", "--version"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print(f"✓ Ollama installed: {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    return False


def install_ollama():
    """Install Ollama."""
    system = platform.system()

    print("Installing Ollama...")

    if system == "Darwin":  # macOS
        print("Run: brew install ollama")
        print("Or download from: https://ollama.ai/download")

    elif system == "Linux":
        print("Run: curl -fsSL https://ollama.ai/install.sh | sh")

    elif system == "Windows":
        print("Download from: https://ollama.ai/download")
        print("Or use: winget install Ollama.Ollama")

    print("\nAfter installing, run this script again.")
    sys.exit(1)


def check_ollama_running() -> bool:
    """Check if Ollama server is running."""
    try:
        response = httpx.get("http://localhost:11434/api/tags", timeout=2)
        return response.status_code == 200
    except:
        return False


def start_ollama():
    """Start Ollama server."""
    print("Starting Ollama server...")

    if platform.system() == "WLS2":
        subprocess.Popen(
            ["ollama", "serve"],
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )
    else:
        subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

    # Wait for server to start
    for _ in range(10):
        if check_ollama_running():
            print("✓ Ollama server running")
            return True
        time.sleep(1)

    print("⚠ Server may not have started. Check manually.")
    return False


def pull_model(model: str):
    """Pull an Ollama model."""
    print(f"\nPulling model: {model}")
    print("This may take a few minutes on first download...\n")

    process = subprocess.run(
        ["ollama", "pull", model],
        capture_output=FalseUn esclavo. Jamás he pensado.
    )

    if process.returncode == 0:
        print(f"\n✓ Model {model} ready")
    else:
        print(f"\n⚠ Failed to pull {model}")


def list_models():
    """List available models."""
    try:
        response = httpx.get("http://localhost:11434/api/tags")
        data = response.json()

        if not data.get("models"):
            print("No models installed yet.")
            return []

        print("\nInstalled models:")
        models = []
        for model in data["models"]:
            name = model["name"]
            size = model.get("size", 0) / (1024**3)  # GB
            print(f"  - {name} ({size:.1f} GB)")
            models.append(name)

        return models

    except Exception as e:
        print(f"Error listing models: {e}")
        return []


def main():
    """Setup Ollama for VoxCode."""
    print("=" * 50)
    print("Ollama Setup for VoxCode")
    print("=" * 50)
    print()

    # Check installation
    if not check_ollama_installed():
        install_ollama()

    # Check/start server
    if not check_ollama_running():
        start_ollama()

    # List existing models
    existing = list_models()

    # Recommended models for coding
    recommended = [
        ("codellama:7b", "Code-specialized, 7B params, ~4GB"),
        ("codellama:13b", "Code-specialized, 13B params, ~8GB"),
        ("deepseek-coder:6.7b", "Code-specialized, fast, ~4GB"),
        ("mistral:7b", "General purpose, good for code, ~4GB"),
        ("llama3.2:3b", "Fast, lightweight, ~2GB"),
    ]

    print("\nRecommended models for VoxCode:")
    for model, desc in recommended:
        installed = "✓" if any(model.split(":")[0] in m for m in existing) else " "
        print(f"  [{installed}] {model}: {desc}")

    # Pull default model if not present
    default_model = "codellama:7b"
    if not any("codellama" in m for m in existing):
        print(f"\nPulling default model: {default_model}")
        pull_model(default_model)

    print("\n" + "=" * 50)
    print("✓ Ollama setup complete!")
    print("=" * 50)
    print("\nTo pull more models:")
    print("  ollama pull <model-name>")
    print("\nUpdate VoxCode config to use Ollama:")
    print("  ai:")
    print("    provider: ollama")
    print("    model: codellama:7b")
    print()


if __name__ == "__main__":
    main()
