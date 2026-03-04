"""Command-line interface for VoxCode."""

from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn

app = typer.Typer(
    name="voxcode",
    help="Voice coding assistant with AI superpowers",
    add_completion=False,
)
console = Console()


@app.command()
def run(
    config: Path | None = typer.Option(
        None, "--config", "-c",
        help="Path to config file"
    ),
    no_tray: bool = typer.Option(
        False, "--no-tray",
        help="Disable system tray"
    ),
    debug: bool = typer.Option(
        False, "--debug", "-d",
        help="Enable debug logging"
    ),
):
    """Start VoxCode voice assistant."""
    # Setup logging
    log_level = logging.DEBUG if debug else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S"
    )

    console.print(Panel.fit(
        "[bold green]VoxCode[/] - Voice Coding Assistant\n"
        "[dim]Speak code. Ship faster.[/]",
        border_style="green"
    ))

    try:
        from voxcode.core.config import Config
        from voxcode.core.engine import VoxEngine
        from voxcode.ui.hotkeys import HotkeyManager

        # Load config
        cfg = Config.load(config)
        cfg.ensure_dirs()

        console.print(f"[dim]Config: {cfg.config_dir}[/]")
        console.print(f"[dim]Voice model: {cfg.voice.model}[/]")
        console.print(f"[dim]AI provider: {cfg.ai.provider}[/]")

        # Create engine
        engine = VoxEngine(cfg)

        # Setup hotkeys
        hotkey_manager = HotkeyManager(cfg.hotkeys)

        def on_push_start():
            asyncio.run(engine.start_dictation())

        def on_push_end():
            asyncio.run(engine.cancel())

        def on_toggle():
            asyncio.run(engine.toggle_listening())

        def on_command():
            asyncio.run(engine.start_command_mode())

        def on_cancel():
            asyncio.run(engine.cancel())

        hotkey_manager.set_callbacks(
            on_push_to_talk_start=on_push_start,
            on_push_to_talk_end=on_push_end,
            on_toggle=on_toggle,
            on_command_mode=on_command,
            on_cancel=on_cancel,
        )

        # Start tray if enabled
        tray = None
        if not no_tray:
            try:
                from voxcode.ui.tray import TrayApp
                tray = TrayApp(engine)
                tray.start()
            except ImportError:
                console.print("[yellow]System tray disabled (pystray not installed)[/]")

        # Start engine
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Loading Whisper model...", total=None)
            asyncio.run(engine.start())
            progress.update(task, description="[green]Ready![/]")

        # Start hotkey listener
        hotkey_manager.start()

        console.print("\n[green][OK][/] VoxCode is running!")
        console.print(f"  [dim]Push-to-talk:[/] {cfg.hotkeys.push_to_talk}")
        console.print(f"  [dim]Toggle:[/] {cfg.hotkeys.toggle_listening}")
        console.print(f"  [dim]Command mode:[/] {cfg.hotkeys.command_mode}")
        console.print("\n[dim]Press Ctrl+C to quit[/]\n")

        # Keep running
        try:
            while True:
                asyncio.run(asyncio.sleep(1))
        except KeyboardInterrupt:
            console.print("\n[yellow]Shutting down...[/]")

        # Cleanup
        hotkey_manager.stop()
        asyncio.run(engine.stop())
        if tray:
            tray.stop()

        console.print("[green]Goodbye![/]")

    except ImportError as e:
        console.print(f"[red]Missing dependency:[/] {e}")
        console.print("Run: [cyan]pip install voxcode[all][/]")
        raise typer.Exit(1)

    except Exception as e:
        console.print(f"[red]Error:[/] {e}")
        if debug:
            console.print_exception()
        raise typer.Exit(1)


@app.command()
def config(
    show: bool = typer.Option(
        False, "--show", "-s",
        help="Show current configuration"
    ),
    init: bool = typer.Option(
        False, "--init",
        help="Initialize default configuration"
    ),
    edit: bool = typer.Option(
        False, "--edit", "-e",
        help="Open configuration in editor"
    ),
):
    """Manage VoxCode configuration."""
    from voxcode.core.config import Config, DEFAULT_CONFIG_YAML

    cfg = Config()
    config_path = cfg.config_dir / "config.yaml"

    if init:
        config_path.parent.mkdir(parents=True, exist_ok=True)
        config_path.write_text(DEFAULT_CONFIG_YAML)
        console.print(f"[green][OK][/] Created config: {config_path}")
        return

    if show:
        if config_path.exists():
            console.print(config_path.read_text())
        else:
            console.print("[yellow]No config file found. Run:[/]")
            console.print(f"  [cyan]voxcode config --init[/]")
        return

    if edit:
        import subprocess
        import platform

        if not config_path.exists():
            config_path.parent.mkdir(parents=True, exist_ok=True)
            config_path.write_text(DEFAULT_CONFIG_YAML)

        if platform.system() == "Windows":
            subprocess.run(["notepad", str(config_path)])
        elif platform.system() == "Darwin":
            subprocess.run(["open", str(config_path)])
        else:
            subprocess.run(["xdg-open", str(config_path)])
        return

    # Default: show config location
    console.print(f"Config directory: {cfg.config_dir}")
    console.print(f"Data directory: {cfg.data_dir}")

    if config_path.exists():
        console.print(f"[green][OK][/] Config file exists")
    else:
        console.print(f"[yellow]![/] No config file. Run: [cyan]voxcode config --init[/]")


@app.command()
def transcribe(
    audio_file: Path = typer.Argument(
        ..., help="Audio file to transcribe"
    ),
    model: str = typer.Option(
        "base.en", "--model", "-m",
        help="Whisper model to use"
    ),
    output: Path | None = typer.Option(
        None, "--output", "-o",
        help="Output file (default: stdout)"
    ),
):
    """Transcribe an audio file."""
    if not audio_file.exists():
        console.print(f"[red]File not found:[/] {audio_file}")
        raise typer.Exit(1)

    console.print(f"Transcribing: {audio_file}")
    console.print(f"Model: {model}")

    try:
        from voxcode.core.config import VoiceConfig
        from voxcode.voice.transcriber import Transcriber
        from voxcode.core.events import EventBus

        config = VoiceConfig(model=model)
        bus = EventBus()
        transcriber = Transcriber(config, bus)

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Loading model...", total=None)
            transcriber.load_model()
            progress.update(task, description="Transcribing...")

            text = transcriber.transcribe_file(audio_file)

        if output:
            output.write_text(text)
            console.print(f"[green][OK][/] Saved to: {output}")
        else:
            console.print("\n" + "-" * 40)
            console.print(text)
            console.print("-" * 40)

    except Exception as e:
        console.print(f"[red]Error:[/] {e}")
        raise typer.Exit(1)


@app.command()
def test_mic(
    duration: float = typer.Option(
        3.0, "--duration", "-d",
        help="Recording duration in seconds"
    ),
):
    """Test microphone input."""
    console.print("[cyan]Testing microphone...[/]")
    console.print(f"Recording for {duration} seconds. Speak now!")

    try:
        import numpy as np
        import sounddevice as sd

        sample_rate = 16000
        audio = sd.rec(
            int(duration * sample_rate),
            samplerate=sample_rate,
            channels=1,
            dtype=np.float32
        )
        sd.wait()

        # Calculate audio stats
        energy = np.sqrt(np.mean(audio ** 2))
        max_amplitude = np.max(np.abs(audio))

        console.print(f"\n[green][OK][/] Recording complete!")
        console.print(f"  Average energy: {energy:.4f}")
        console.print(f"  Max amplitude: {max_amplitude:.4f}")

        if max_amplitude < 0.01:
            console.print("[yellow][!] Very low audio level. Check your microphone.[/]")
        elif max_amplitude > 0.9:
            console.print("[yellow][!] Audio may be clipping. Lower your input volume.[/]")
        else:
            console.print("[green][OK] Audio levels look good![/]")

    except Exception as e:
        console.print(f"[red]Error:[/] {e}")
        raise typer.Exit(1)


@app.command()
def version():
    """Show version information."""
    from voxcode import __version__

    console.print(f"VoxCode v{__version__}")

    # Show installed components
    components = []

    try:
        import whisper
        components.append("[green][OK][/] whisper")
    except ImportError:
        components.append("[red][X][/] whisper")

    try:
        import sounddevice
        components.append("[green][OK][/] sounddevice")
    except ImportError:
        components.append("[red][X][/] sounddevice")

    try:
        import pynput
        components.append("[green][OK][/] pynput")
    except ImportError:
        components.append("[red][X][/] pynput")

    try:
        import pystray
        components.append("[green][OK][/] pystray")
    except ImportError:
        components.append("[yellow][-][/] pystray (optional)")

    try:
        import tree_sitter_languages
        components.append("[green][OK][/] tree-sitter")
    except ImportError:
        components.append("[yellow][-][/] tree-sitter (optional)")

    console.print("\nComponents:")
    for comp in components:
        console.print(f"  {comp}")


if __name__ == "__main__":
    app()
