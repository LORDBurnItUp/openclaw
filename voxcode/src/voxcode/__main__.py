#!/usr/bin/env python3
"""VoxCode CLI - Voice coding assistant with AI superpowers."""

import asyncio
import os
import sys
from pathlib import Path

# Fix Windows console encoding for Unicode/emoji support
if sys.platform == "win32":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import typer
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table
from rich import print as rprint

from voxcode import __version__
from voxcode.core.config import Config

app = typer.Typer(
    name="voxcode",
    help="Voice coding assistant with AI superpowers",
    add_completion=False,
)
console = Console(force_terminal=True, legacy_windows=True)


def show_banner():
    """Display startup banner."""
    banner = """
[bold cyan]╔═══════════════════════════════════════════════════════════════╗[/]
[bold cyan]║[/] [bold white]VoxCode[/] [dim]v{}[/]                                              [bold cyan]║[/]
[bold cyan]║[/] [yellow]🎤 Speak code. Ship faster. No more typing.[/]                  [bold cyan]║[/]
[bold cyan]╚═══════════════════════════════════════════════════════════════╝[/]
""".format(__version__)
    console.print(banner)


@app.command()
def run(
    debug: bool = typer.Option(False, "--debug", "-d", help="Enable debug logging"),
    config_path: Path = typer.Option(None, "--config", "-c", help="Config file path"),
    model: str = typer.Option(None, "--model", "-m", help="Whisper model to use"),
    device: str = typer.Option(None, "--device", help="Device: cuda, cpu, mps, auto"),
    no_wake: bool = typer.Option(False, "--no-wake", help="Disable wake word activation"),
):
    """
    Start VoxCode voice assistant.

    Press Ctrl+Shift+V for push-to-talk, or say "Hey Vox" to activate.
    """
    show_banner()

    # Load config
    config = Config.load(config_path)

    # Apply CLI overrides
    if debug:
        config.log_level = "DEBUG"
    if model:
        config.voice.model = model
    if device:
        config.voice.device = device
    if no_wake:
        config.wake_word_enabled = False

    # Show status
    table = Table(show_header=False, box=None, padding=(0, 2))
    table.add_column(style="dim")
    table.add_column()
    table.add_row("Model", f"[cyan]{config.voice.model}[/]")
    table.add_row("Device", f"[cyan]{config.voice.device}[/]")
    table.add_row("AI Provider", f"[cyan]{config.ai.provider}[/]")
    table.add_row("Wake Word", f"[cyan]{config.wake_word if config.wake_word_enabled else 'disabled'}[/]")
    console.print(table)
    console.print()

    # Start engine
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
        transient=True,
    ) as progress:
        task = progress.add_task("Loading Whisper model...", total=None)

        async def start():
            from voxcode.core.engine import VoxEngine

            engine = VoxEngine(config)

            progress.update(task, description="Initializing VoxCode...")
            await engine.start()
            progress.update(task, visible=False)

            console.print("[green]✓[/] VoxCode is running!")
            console.print()
            console.print("[dim]Hotkeys:[/]")
            console.print(f"  [cyan]Ctrl+Shift+V[/]     Push-to-talk (hold)")
            console.print(f"  [cyan]Ctrl+Shift+Space[/] Toggle listening")
            console.print(f"  [cyan]Ctrl+Shift+C[/]     Command mode")
            console.print(f"  [cyan]Escape[/]           Cancel")
            console.print()
            console.print("[dim]Press Ctrl+C to exit[/]")
            console.print()

            # Keep running
            try:
                while True:
                    await asyncio.sleep(1)
            except KeyboardInterrupt:
                console.print("\n[yellow]Shutting down...[/]")
                await engine.stop()
                console.print("[green]✓[/] VoxCode stopped")

        asyncio.run(start())


@app.command()
def config(
    edit: bool = typer.Option(False, "--edit", "-e", help="Open config in editor"),
    show: bool = typer.Option(False, "--show", "-s", help="Show current config"),
    reset: bool = typer.Option(False, "--reset", help="Reset to default config"),
):
    """View or edit VoxCode configuration."""
    from platformdirs import user_config_dir
    import yaml

    config_dir = Path(user_config_dir("voxcode"))
    config_file = config_dir / "config.yaml"

    if reset:
        if config_file.exists():
            config_file.unlink()
        console.print("[green]✓[/] Config reset to defaults")
        return

    if show:
        if config_file.exists():
            console.print(config_file.read_text())
        else:
            console.print("[yellow]No config file found. Using defaults.[/]")
            config = Config()
            console.print(yaml.dump(config.model_dump(mode="json"), default_flow_style=False))
        return

    if edit:
        # Ensure config exists
        config = Config.load()
        config.save()

        # Open in editor
        import subprocess
        import platform

        if platform.system() == "Windows":
            subprocess.run(["notepad", str(config_file)])
        elif platform.system() == "Darwin":
            subprocess.run(["open", str(config_file)])
        else:
            editor = Path("/usr/bin/xdg-open")
            if editor.exists():
                subprocess.run(["xdg-open", str(config_file)])
            else:
                subprocess.run(["nano", str(config_file)])
        return

    # Default: show config location
    console.print(f"[dim]Config location:[/] [cyan]{config_file}[/]")
    console.print()
    console.print("Options:")
    console.print("  [cyan]voxcode config --show[/]   Show current config")
    console.print("  [cyan]voxcode config --edit[/]   Open config in editor")
    console.print("  [cyan]voxcode config --reset[/]  Reset to defaults")


@app.command()
def setup():
    """Interactive setup wizard for VoxCode."""
    show_banner()

    console.print("[bold]VoxCode Setup Wizard[/]\n")

    # Check dependencies
    console.print("[bold]1. Checking dependencies...[/]")

    checks = []

    # Python
    py_version = sys.version_info
    checks.append(("Python 3.10+", py_version >= (3, 10), f"{py_version.major}.{py_version.minor}"))

    # FFmpeg
    import subprocess
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        checks.append(("FFmpeg", True, "installed"))
    except (subprocess.CalledProcessError, FileNotFoundError):
        checks.append(("FFmpeg", False, "not found"))

    # Whisper
    try:
        import whisper
        checks.append(("Whisper", True, "installed"))
    except ImportError:
        checks.append(("Whisper", False, "not installed"))

    # CUDA
    try:
        import torch
        if torch.cuda.is_available():
            device = torch.cuda.get_device_name(0)
            checks.append(("CUDA", True, device[:30]))
        else:
            checks.append(("CUDA", None, "not available (CPU mode)"))
    except ImportError:
        checks.append(("PyTorch", False, "not installed"))

    # Display results
    for name, status, info in checks:
        if status is True:
            console.print(f"  [green]✓[/] {name}: {info}")
        elif status is False:
            console.print(f"  [red]✗[/] {name}: {info}")
        else:
            console.print(f"  [yellow]○[/] {name}: {info}")

    console.print()

    # Check for critical failures
    critical_missing = [name for name, status, _ in checks if status is False and name in ("Python 3.10+", "Whisper")]

    if critical_missing:
        console.print("[red]Missing critical dependencies:[/]")
        console.print("  pip install openai-whisper sounddevice pynput")
        return

    # Configure AI provider
    console.print("[bold]2. Configure AI provider[/]")
    console.print("  1. [cyan]Ollama[/] (local, free, private)")
    console.print("  2. [cyan]OpenAI[/] (cloud, requires API key)")
    console.print("  3. [cyan]Anthropic[/] (cloud, requires API key)")
    console.print()

    choice = typer.prompt("Select AI provider", default="1")

    config = Config.load()

    if choice == "1":
        config.ai.provider = "ollama"
        config.ai.model = "codellama"
        console.print()
        console.print("[dim]Make sure Ollama is running:[/]")
        console.print("  [cyan]ollama serve[/]")
        console.print("  [cyan]ollama pull codellama[/]")
    elif choice == "2":
        config.ai.provider = "openai"
        config.ai.model = "gpt-4"
        api_key = typer.prompt("OpenAI API key", hide_input=True)
        config.ai.api_key = api_key
    elif choice == "3":
        config.ai.provider = "anthropic"
        config.ai.model = "claude-3-sonnet-20240229"
        api_key = typer.prompt("Anthropic API key", hide_input=True)
        config.ai.api_key = api_key

    console.print()

    # Save config
    config.save()
    console.print("[green]✓[/] Configuration saved!")
    console.print()

    # Download Whisper model
    console.print("[bold]3. Downloading Whisper model...[/]")

    try:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Downloading base.en model...", total=None)
            import whisper
            whisper.load_model("base.en")
        console.print("[green]✓[/] Model downloaded!")
    except Exception as e:
        console.print(f"[yellow]⚠[/] Model download failed: {e}")
        console.print("   Model will be downloaded on first use.")

    console.print()
    console.print("[bold green]Setup complete![/]")
    console.print()
    console.print("Start VoxCode:")
    console.print("  [cyan]voxcode[/]")


@app.command()
def test():
    """Test voice recognition (record and transcribe)."""
    show_banner()

    console.print("[bold]Voice Recognition Test[/]\n")
    console.print("Recording will start when you press Enter.")
    console.print("Speak clearly, then press Enter again to stop.\n")

    input("Press Enter to start recording...")

    import numpy as np

    try:
        import sounddevice as sd
    except ImportError:
        console.print("[red]Error:[/] sounddevice not installed")
        console.print("  pip install sounddevice")
        return

    # Record
    console.print("[green]🎤 Recording...[/] (press Enter to stop)")

    sample_rate = 16000
    recording = []

    def callback(indata, frames, time, status):
        recording.append(indata.copy())

    stream = sd.InputStream(
        samplerate=sample_rate,
        channels=1,
        dtype=np.float32,
        callback=callback
    )

    with stream:
        input()

    console.print("[yellow]Processing...[/]")

    # Concatenate audio
    audio = np.concatenate(recording, axis=0).flatten()

    console.print(f"[dim]Recorded {len(audio)/sample_rate:.2f} seconds[/]\n")

    # Transcribe
    try:
        import whisper

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
            transient=True,
        ) as progress:
            progress.add_task("Transcribing...", total=None)
            model = whisper.load_model("base.en")
            result = model.transcribe(audio, fp16=False)

        text = result["text"].strip()

        console.print(Panel(
            f"[bold]{text}[/]",
            title="Transcription",
            border_style="green"
        ))

    except ImportError:
        console.print("[red]Error:[/] whisper not installed")
        console.print("  pip install openai-whisper")
    except Exception as e:
        console.print(f"[red]Error:[/] {e}")


@app.command()
def models():
    """List and download Whisper models."""
    console.print("[bold]Available Whisper Models[/]\n")

    models_info = [
        ("tiny", "39M", "~1GB VRAM", "Fastest, least accurate"),
        ("tiny.en", "39M", "~1GB VRAM", "English only, faster"),
        ("base", "74M", "~1GB VRAM", "Good balance"),
        ("base.en", "74M", "~1GB VRAM", "English only, recommended"),
        ("small", "244M", "~2GB VRAM", "Better accuracy"),
        ("small.en", "244M", "~2GB VRAM", "English only"),
        ("medium", "769M", "~5GB VRAM", "High accuracy"),
        ("medium.en", "769M", "~5GB VRAM", "English only"),
        ("large", "1550M", "~10GB VRAM", "Best accuracy"),
        ("large-v2", "1550M", "~10GB VRAM", "Latest large"),
        ("large-v3", "1550M", "~10GB VRAM", "Newest, best"),
    ]

    table = Table()
    table.add_column("Model", style="cyan")
    table.add_column("Size")
    table.add_column("VRAM")
    table.add_column("Notes")

    for name, size, vram, notes in models_info:
        table.add_row(name, size, vram, notes)

    console.print(table)
    console.print()
    console.print("Download a model:")
    console.print("  [cyan]voxcode models --download base.en[/]")


@app.command("version")
def show_version():
    """Show VoxCode version."""
    console.print(f"VoxCode [cyan]v{__version__}[/]")


def main():
    """Entry point."""
    app()


if __name__ == "__main__":
    main()
