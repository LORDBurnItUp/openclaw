"""System tray application."""

from __future__ import annotations

import logging
import threading
from pathlib import Path
from typing import TYPE_CHECKING, Callable

try:
    import pystray
    from PIL import Image, ImageDraw
except ImportError:
    pystray = None
    Image = None
    ImageDraw = None

if TYPE_CHECKING:
    from voxcode.core.engine import VoxEngine


logger = logging.getLogger(__name__)


def create_icon_image(color: str = "green", size: int = 64) -> Image.Image:
    """Create a simple icon image."""
    if Image is None:
        raise ImportError("Pillow not installed. Run: pip install pillow")

    # Create image
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw microphone shape
    colors = {
        "green": (76, 175, 80),      # Listening
        "red": (244, 67, 54),         # Recording/Speaking
        "yellow": (255, 193, 7),      # Processing
        "gray": (158, 158, 158),      # Idle
        "blue": (33, 150, 243),       # Command mode
    }
    fill_color = colors.get(color, colors["gray"])

    # Microphone body
    margin = size // 8
    mic_width = size // 3
    mic_height = size // 2
    mic_left = (size - mic_width) // 2
    mic_top = margin

    # Draw rounded rectangle for mic body
    draw.rounded_rectangle(
        [mic_left, mic_top, mic_left + mic_width, mic_top + mic_height],
        radius=mic_width // 2,
        fill=fill_color
    )

    # Draw arc for mic stand
    arc_top = mic_top + mic_height - size // 8
    arc_margin = margin
    draw.arc(
        [arc_margin, arc_top, size - arc_margin, size - margin * 2],
        start=0, end=180,
        fill=fill_color,
        width=3
    )

    # Draw stand
    center_x = size // 2
    draw.line(
        [center_x, size - margin * 2, center_x, size - margin],
        fill=fill_color,
        width=3
    )

    return img


class TrayApp:
    """
    System tray application for VoxCode.

    Shows status in tray and provides quick access to controls.
    """

    def __init__(self, engine: VoxEngine) -> None:
        if pystray is None:
            raise ImportError(
                "pystray not installed. Run: pip install pystray pillow"
            )

        self.engine = engine
        self._icon: pystray.Icon | None = None
        self._running = False

        # Create icons for different states
        self._icons = {
            "idle": create_icon_image("gray"),
            "listening": create_icon_image("green"),
            "recording": create_icon_image("red"),
            "processing": create_icon_image("yellow"),
            "command": create_icon_image("blue"),
        }

    def _create_menu(self) -> pystray.Menu:
        """Create the tray menu."""
        return pystray.Menu(
            pystray.MenuItem(
                "VoxCode",
                None,
                enabled=False
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                "Start Listening",
                self._on_start_listening,
                visible=lambda item: not self._is_listening()
            ),
            pystray.MenuItem(
                "Stop Listening",
                self._on_stop_listening,
                visible=lambda item: self._is_listening()
            ),
            pystray.MenuItem(
                "Dictation Mode",
                self._on_dictation_mode
            ),
            pystray.MenuItem(
                "Command Mode",
                self._on_command_mode
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                "Settings...",
                self._on_settings
            ),
            pystray.MenuItem(
                "About",
                self._on_about
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                "Quit",
                self._on_quit
            ),
        )

    def start(self) -> None:
        """Start the tray application."""
        if self._running:
            return

        logger.info("Starting system tray...")
        self._running = True

        self._icon = pystray.Icon(
            "voxcode",
            self._icons["idle"],
            "VoxCode - Idle",
            menu=self._create_menu()
        )

        # Subscribe to engine events for status updates
        self._subscribe_events()

        # Run in thread
        thread = threading.Thread(target=self._icon.run, daemon=True)
        thread.start()

    def stop(self) -> None:
        """Stop the tray application."""
        if not self._running:
            return

        logger.info("Stopping system tray...")
        self._running = False

        if self._icon:
            self._icon.stop()
            self._icon = None

    def update_status(self, status: str, tooltip: str | None = None) -> None:
        """Update tray icon and tooltip."""
        if not self._icon:
            return

        if status in self._icons:
            self._icon.icon = self._icons[status]

        if tooltip:
            self._icon.title = f"VoxCode - {tooltip}"

    def _subscribe_events(self) -> None:
        """Subscribe to engine events."""
        from voxcode.core.events import EventType

        @self.engine.bus.subscribe(EventType.MODE_CHANGED)
        def on_mode_changed(event):
            mode = event.data.get("new_mode", "IDLE")
            status_map = {
                "IDLE": ("idle", "Idle"),
                "LISTENING": ("listening", "Listening"),
                "DICTATION": ("recording", "Dictation"),
                "COMMAND": ("command", "Command Mode"),
                "PROCESSING": ("processing", "Processing..."),
            }
            status, tooltip = status_map.get(mode, ("idle", mode))
            self.update_status(status, tooltip)

        @self.engine.bus.subscribe(EventType.VOICE_START)
        def on_voice_start(event):
            self.update_status("recording", "Recording...")

        @self.engine.bus.subscribe(EventType.TRANSCRIPTION_START)
        def on_transcription(event):
            self.update_status("processing", "Transcribing...")

    def _is_listening(self) -> bool:
        """Check if engine is listening."""
        from voxcode.core.engine import VoxMode
        return self.engine.mode != VoxMode.IDLE

    def _on_start_listening(self, icon, item) -> None:
        """Handle start listening menu click."""
        import asyncio
        asyncio.run(self.engine.toggle_listening())

    def _on_stop_listening(self, icon, item) -> None:
        """Handle stop listening menu click."""
        import asyncio
        asyncio.run(self.engine.cancel())

    def _on_dictation_mode(self, icon, item) -> None:
        """Handle dictation mode menu click."""
        import asyncio
        asyncio.run(self.engine.start_dictation())

    def _on_command_mode(self, icon, item) -> None:
        """Handle command mode menu click."""
        import asyncio
        asyncio.run(self.engine.start_command_mode())

    def _on_settings(self, icon, item) -> None:
        """Handle settings menu click."""
        # Open config file or settings UI
        import subprocess
        import platform

        config_path = self.engine.config.config_dir / "config.yaml"
        config_path.parent.mkdir(parents=True, exist_ok=True)

        if not config_path.exists():
            self.engine.config.save(config_path)

        # Open in default editor
        if platform.system() == "Windows":
            subprocess.run(["notepad", str(config_path)])
        elif platform.system() == "Darwin":
            subprocess.run(["open", str(config_path)])
        else:
            subprocess.run(["xdg-open", str(config_path)])

    def _on_about(self, icon, item) -> None:
        """Handle about menu click."""
        # Show simple message
        import tkinter as tk
        from tkinter import messagebox

        root = tk.Tk()
        root.withdraw()

        messagebox.showinfo(
            "About VoxCode",
            "VoxCode v0.1.0\n\n"
            "Open-source voice coding assistant.\n\n"
            "Speak code. Ship faster.\n\n"
            "https://github.com/yourname/voxcode"
        )

        root.destroy()

    def _on_quit(self, icon, item) -> None:
        """Handle quit menu click."""
        import asyncio
        asyncio.run(self.engine.stop())
        self.stop()
