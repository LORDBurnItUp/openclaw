"""Live terminal UI with audio visualization and real-time transcription."""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import Callable

from rich.console import Console, Group
from rich.live import Live
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
from rich.table import Table
from rich.text import Text
from rich.layout import Layout
from rich.style import Style
from rich import box

from voxcode.core.events import EventBus, Event, EventType


console = Console()


# Color themes
THEMES = {
    "default": {
        "primary": "cyan",
        "secondary": "yellow",
        "success": "green",
        "error": "red",
        "muted": "dim white",
        "accent": "magenta",
        "border": "blue",
    },
    "dracula": {
        "primary": "#bd93f9",
        "secondary": "#f1fa8c",
        "success": "#50fa7b",
        "error": "#ff5555",
        "muted": "#6272a4",
        "accent": "#ff79c6",
        "border": "#44475a",
    },
    "monokai": {
        "primary": "#66d9ef",
        "secondary": "#e6db74",
        "success": "#a6e22e",
        "error": "#f92672",
        "muted": "#75715e",
        "accent": "#ae81ff",
        "border": "#49483e",
    },
    "nord": {
        "primary": "#88c0d0",
        "secondary": "#ebcb8b",
        "success": "#a3be8c",
        "error": "#bf616a",
        "muted": "#4c566a",
        "accent": "#b48ead",
        "border": "#3b4252",
    },
    "ocean": {
        "primary": "#00bcd4",
        "secondary": "#ffc107",
        "success": "#4caf50",
        "error": "#f44336",
        "muted": "#607d8b",
        "accent": "#9c27b0",
        "border": "#263238",
    },
}


@dataclass
class UIState:
    """Current UI state."""
    mode: str = "idle"
    audio_level: float = 0.0
    transcription: str = ""
    partial_transcription: str = ""
    command_history: list[str] = field(default_factory=list)
    ai_response: str = ""
    is_speaking: bool = False
    error: str | None = None
    theme: str = "default"

    @property
    def colors(self) -> dict:
        return THEMES.get(self.theme, THEMES["default"])


class AudioVisualizer:
    """Beautiful audio level visualization."""

    BARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"]
    WAVE_CHARS = ["░", "▒", "▓", "█"]

    def __init__(self, width: int = 40, theme: dict = None):
        self.width = width
        self.history: list[float] = [0.0] * width
        self.theme = theme or THEMES["default"]

    def update(self, level: float) -> None:
        """Update with new audio level (0-1)."""
        self.history.pop(0)
        self.history.append(min(1.0, level))

    def render_bars(self) -> Text:
        """Render as vertical bars."""
        text = Text()

        for level in self.history:
            idx = int(level * (len(self.BARS) - 1))
            char = self.BARS[idx]

            # Color based on level
            if level > 0.8:
                color = self.theme["error"]
            elif level > 0.5:
                color = self.theme["secondary"]
            elif level > 0.2:
                color = self.theme["success"]
            else:
                color = self.theme["muted"]

            text.append(char, style=color)

        return text

    def render_wave(self) -> Text:
        """Render as animated wave."""
        text = Text()

        for i, level in enumerate(self.history):
            # Add wave motion
            wave = (time.time() * 10 + i) % (2 * 3.14159)
            import math
            wobble = (math.sin(wave) + 1) / 2 * 0.2
            level = min(1.0, level + wobble)

            idx = int(level * (len(self.WAVE_CHARS) - 1))
            char = self.WAVE_CHARS[idx]

            # Gradient color
            hue = int(level * 120)  # 0=red, 60=yellow, 120=green
            text.append(char, style=f"color({hue})")

        return text


class LiveUI:
    """
    Beautiful live terminal UI for VoxCode.

    Features:
    - Real-time audio visualization
    - Live transcription display
    - Mode indicator with animations
    - Command history
    - AI response streaming
    - Multiple themes
    """

    def __init__(self, bus: EventBus, theme: str = "default"):
        self.bus = bus
        self.state = UIState(theme=theme)
        self.visualizer = AudioVisualizer(width=50, theme=self.state.colors)
        self._live: Live | None = None
        self._running = False

        # Register event handlers
        self._register_handlers()

    def _register_handlers(self):
        """Register event handlers."""

        @self.bus.subscribe(EventType.VOICE_START)
        async def on_voice_start(event: Event):
            self.state.is_speaking = True
            self.state.mode = "listening"
            self.state.partial_transcription = ""

        @self.bus.subscribe(EventType.VOICE_DATA)
        async def on_voice_data(event: Event):
            energy = event.data.get("energy", 0)
            self.state.audio_level = min(1.0, energy * 20)
            self.visualizer.update(self.state.audio_level)

        @self.bus.subscribe(EventType.VOICE_END)
        async def on_voice_end(event: Event):
            self.state.is_speaking = False
            self.state.mode = "processing"

        @self.bus.subscribe(EventType.TRANSCRIPTION_COMPLETE)
        async def on_transcription(event: Event):
            text = event.data.get("text", "")
            self.state.transcription = text
            self.state.partial_transcription = ""
            self.state.command_history.append(text)
            if len(self.state.command_history) > 10:
                self.state.command_history.pop(0)

        @self.bus.subscribe(EventType.AI_RESPONSE)
        async def on_ai_response(event: Event):
            response = event.data.get("response")
            if response:
                self.state.ai_response = response.text[:500]

        @self.bus.subscribe(EventType.AI_STREAM_CHUNK)
        async def on_ai_chunk(event: Event):
            chunk = event.data.get("chunk", "")
            self.state.ai_response += chunk

        @self.bus.subscribe(EventType.MODE_CHANGED)
        async def on_mode_changed(event: Event):
            self.state.mode = event.data.get("new_mode", "idle").lower()

        @self.bus.subscribe(EventType.ERROR)
        async def on_error(event: Event):
            self.state.error = str(event.data.get("error", "Unknown error"))

    def _build_layout(self) -> Panel:
        """Build the UI layout."""
        colors = self.state.colors

        # Mode indicator
        mode_icons = {
            "idle": "💤",
            "listening": "🎙️",
            "processing": "⚡",
            "dictation": "📝",
            "command": "🎯",
        }
        mode_colors = {
            "idle": colors["muted"],
            "listening": colors["success"],
            "processing": colors["secondary"],
            "dictation": colors["primary"],
            "command": colors["accent"],
        }

        mode_icon = mode_icons.get(self.state.mode, "❓")
        mode_color = mode_colors.get(self.state.mode, colors["muted"])
        mode_text = Text()
        mode_text.append(f" {mode_icon} ", style=f"bold {mode_color}")
        mode_text.append(self.state.mode.upper(), style=f"bold {mode_color}")

        # Audio visualizer
        audio_section = Table(show_header=False, box=None, padding=0)
        audio_section.add_column(width=60)

        if self.state.is_speaking:
            audio_section.add_row(self.visualizer.render_bars())
        else:
            audio_section.add_row(Text("▁" * 50, style=colors["muted"]))

        # Transcription display
        trans_text = Text()
        if self.state.partial_transcription:
            trans_text.append(self.state.partial_transcription, style=f"italic {colors['muted']}")
        elif self.state.transcription:
            trans_text.append(self.state.transcription, style=f"bold {colors['primary']}")
        else:
            trans_text.append("Speak or press Ctrl+Shift+V...", style=colors["muted"])

        trans_panel = Panel(
            trans_text,
            title="[bold]Transcription[/]",
            border_style=colors["border"],
            padding=(0, 1),
        )

        # Command history
        history_text = Text()
        for i, cmd in enumerate(reversed(self.state.command_history[-5:])):
            style = colors["primary"] if i == 0 else colors["muted"]
            history_text.append(f"› {cmd[:60]}...\n" if len(cmd) > 60 else f"› {cmd}\n", style=style)

        if not history_text.plain:
            history_text.append("No commands yet", style=colors["muted"])

        # AI Response
        ai_text = Text()
        if self.state.ai_response:
            ai_text.append(self.state.ai_response[:300], style=colors["secondary"])
            if len(self.state.ai_response) > 300:
                ai_text.append("...", style=colors["muted"])
        else:
            ai_text.append("AI responses will appear here", style=colors["muted"])

        ai_panel = Panel(
            ai_text,
            title="[bold]AI Response[/]",
            border_style=colors["border"],
            padding=(0, 1),
        )

        # Error display
        error_section = None
        if self.state.error:
            error_section = Panel(
                Text(self.state.error, style=colors["error"]),
                title="[bold red]Error[/]",
                border_style=colors["error"],
            )

        # Build main content
        content = Table(show_header=False, box=None, expand=True, padding=0)
        content.add_column(ratio=1)
        content.add_row(mode_text)
        content.add_row(audio_section)
        content.add_row(trans_panel)
        content.add_row(ai_panel)

        if error_section:
            content.add_row(error_section)

        # Hotkey hints
        hints = Text()
        hints.append(" Ctrl+Shift+V ", style=f"bold {colors['primary']} on {colors['border']}")
        hints.append(" talk  ", style=colors["muted"])
        hints.append(" Ctrl+Shift+C ", style=f"bold {colors['accent']} on {colors['border']}")
        hints.append(" command  ", style=colors["muted"])
        hints.append(" Esc ", style=f"bold {colors['error']} on {colors['border']}")
        hints.append(" cancel ", style=colors["muted"])

        content.add_row(hints)

        # Main panel
        return Panel(
            content,
            title=f"[bold {colors['primary']}]🎤 VoxCode[/]",
            subtitle=f"[{colors['muted']}]Theme: {self.state.theme}[/]",
            border_style=colors["border"],
            box=box.ROUNDED,
            padding=(1, 2),
        )

    async def start(self):
        """Start the live UI."""
        self._running = True

        with Live(
            self._build_layout(),
            console=console,
            refresh_per_second=10,
            transient=False,
        ) as live:
            self._live = live

            while self._running:
                live.update(self._build_layout())
                await asyncio.sleep(0.1)

    def stop(self):
        """Stop the live UI."""
        self._running = False

    def set_theme(self, theme: str):
        """Change color theme."""
        if theme in THEMES:
            self.state.theme = theme
            self.visualizer.theme = THEMES[theme]


class MinimalUI:
    """
    Minimal status line UI for low-profile operation.

    Shows only essential info in a single line.
    """

    def __init__(self, bus: EventBus):
        self.bus = bus
        self.state = UIState()
        self._running = False

        self._register_handlers()

    def _register_handlers(self):
        @self.bus.subscribe(EventType.MODE_CHANGED)
        async def on_mode(event: Event):
            self.state.mode = event.data.get("new_mode", "idle")
            self._update_status()

        @self.bus.subscribe(EventType.TRANSCRIPTION_COMPLETE)
        async def on_transcription(event: Event):
            self.state.transcription = event.data.get("text", "")
            self._update_status()

    def _update_status(self):
        """Update status line."""
        if not self._running:
            return

        icons = {"idle": "💤", "listening": "🎙️", "processing": "⚡"}
        icon = icons.get(self.state.mode.lower(), "❓")

        text = self.state.transcription[:50] if self.state.transcription else ""
        console.print(f"\r{icon} [{self.state.mode}] {text}", end="")

    def start(self):
        self._running = True
        self._update_status()

    def stop(self):
        self._running = False
        console.print()  # New line


async def demo_ui():
    """Demo the UI with simulated events."""
    from voxcode.core.events import get_event_bus

    bus = get_event_bus()
    ui = LiveUI(bus, theme="dracula")

    async def simulate():
        await asyncio.sleep(2)

        # Simulate speaking
        await bus.emit(Event(type=EventType.MODE_CHANGED, source="demo", data={"new_mode": "listening"}))
        await bus.emit(Event(type=EventType.VOICE_START, source="demo", data={}))

        for i in range(50):
            import random
            energy = random.random() * 0.5 + 0.2
            await bus.emit(Event(type=EventType.VOICE_DATA, source="demo", data={"energy": energy}))
            await asyncio.sleep(0.05)

        await bus.emit(Event(type=EventType.VOICE_END, source="demo", data={}))
        await bus.emit(Event(type=EventType.MODE_CHANGED, source="demo", data={"new_mode": "processing"}))

        await asyncio.sleep(1)

        await bus.emit(Event(
            type=EventType.TRANSCRIPTION_COMPLETE,
            source="demo",
            data={"text": "Create a function to calculate fibonacci numbers"}
        ))

        await asyncio.sleep(2)
        ui.stop()

    await asyncio.gather(ui.start(), simulate())


if __name__ == "__main__":
    asyncio.run(demo_ui())
