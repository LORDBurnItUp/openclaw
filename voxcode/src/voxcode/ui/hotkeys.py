"""Global hotkey management."""

from __future__ import annotations

import logging
import threading
from typing import Callable, TYPE_CHECKING

try:
    from pynput import keyboard
    from pynput.keyboard import Key, KeyCode
except ImportError:
    keyboard = None
    Key = None
    KeyCode = None

if TYPE_CHECKING:
    from voxcode.core.config import HotkeyConfig


logger = logging.getLogger(__name__)


# Key name to pynput key mapping
KEY_NAMES = {
    "ctrl": Key.ctrl if Key else None,
    "control": Key.ctrl if Key else None,
    "alt": Key.alt if Key else None,
    "shift": Key.shift if Key else None,
    "cmd": Key.cmd if Key else None,
    "command": Key.cmd if Key else None,
    "win": Key.cmd if Key else None,
    "space": Key.space if Key else None,
    "enter": Key.enter if Key else None,
    "tab": Key.tab if Key else None,
    "escape": Key.esc if Key else None,
    "esc": Key.esc if Key else None,
    "backspace": Key.backspace if Key else None,
    "delete": Key.delete if Key else None,
    "f1": Key.f1 if Key else None,
    "f2": Key.f2 if Key else None,
    "f3": Key.f3 if Key else None,
    "f4": Key.f4 if Key else None,
    "f5": Key.f5 if Key else None,
    "f6": Key.f6 if Key else None,
    "f7": Key.f7 if Key else None,
    "f8": Key.f8 if Key else None,
    "f9": Key.f9 if Key else None,
    "f10": Key.f10 if Key else None,
    "f11": Key.f11 if Key else None,
    "f12": Key.f12 if Key else None,
}


def parse_hotkey(hotkey_str: str) -> set:
    """Parse hotkey string like 'ctrl+shift+v' into key set."""
    keys = set()
    parts = hotkey_str.lower().replace(" ", "").split("+")

    for part in parts:
        if part in KEY_NAMES and KEY_NAMES[part]:
            keys.add(KEY_NAMES[part])
        elif len(part) == 1:
            keys.add(KeyCode.from_char(part))
        else:
            logger.warning(f"Unknown key: {part}")

    return keys


class HotkeyManager:
    """
    Manages global hotkeys for VoxCode.

    Features:
    - Push-to-talk (hold key)
    - Toggle listening
    - Command mode activation
    """

    def __init__(self, config: HotkeyConfig) -> None:
        if keyboard is None:
            raise ImportError("pynput not installed. Run: pip install pynput")

        self.config = config

        # Parse hotkeys
        self._push_to_talk_keys = parse_hotkey(config.push_to_talk)
        self._toggle_keys = parse_hotkey(config.toggle_listening)
        self._command_keys = parse_hotkey(config.command_mode)
        self._cancel_keys = parse_hotkey(config.cancel)

        # Current pressed keys
        self._pressed: set = set()

        # Callbacks
        self._on_push_to_talk_start: Callable | None = None
        self._on_push_to_talk_end: Callable | None = None
        self._on_toggle: Callable | None = None
        self._on_command_mode: Callable | None = None
        self._on_cancel: Callable | None = None

        # State
        self._push_to_talk_active = False
        self._listener: keyboard.Listener | None = None
        self._running = False

    def set_callbacks(
        self,
        on_push_to_talk_start: Callable | None = None,
        on_push_to_talk_end: Callable | None = None,
        on_toggle: Callable | None = None,
        on_command_mode: Callable | None = None,
        on_cancel: Callable | None = None,
    ) -> None:
        """Set callback functions for hotkey events."""
        self._on_push_to_talk_start = on_push_to_talk_start
        self._on_push_to_talk_end = on_push_to_talk_end
        self._on_toggle = on_toggle
        self._on_command_mode = on_command_mode
        self._on_cancel = on_cancel

    def start(self) -> None:
        """Start listening for hotkeys."""
        if self._running:
            return

        logger.info("Starting hotkey listener...")
        logger.info(f"  Push-to-talk: {self.config.push_to_talk}")
        logger.info(f"  Toggle: {self.config.toggle_listening}")
        logger.info(f"  Command mode: {self.config.command_mode}")

        self._running = True
        self._listener = keyboard.Listener(
            on_press=self._on_press,
            on_release=self._on_release
        )
        self._listener.start()

    def stop(self) -> None:
        """Stop listening for hotkeys."""
        if not self._running:
            return

        logger.info("Stopping hotkey listener...")
        self._running = False

        if self._listener:
            self._listener.stop()
            self._listener = None

        self._pressed.clear()

    def _on_press(self, key) -> None:
        """Handle key press."""
        # Normalize key
        if hasattr(key, "char") and key.char:
            self._pressed.add(KeyCode.from_char(key.char.lower()))
        else:
            self._pressed.add(key)

        # Check for hotkey matches
        self._check_hotkeys()

    def _on_release(self, key) -> None:
        """Handle key release."""
        # Check push-to-talk release
        if self._push_to_talk_active:
            if not self._push_to_talk_keys.issubset(self._pressed):
                self._push_to_talk_active = False
                if self._on_push_to_talk_end:
                    self._call_callback(self._on_push_to_talk_end)

        # Remove from pressed
        if hasattr(key, "char") and key.char:
            self._pressed.discard(KeyCode.from_char(key.char.lower()))
        else:
            self._pressed.discard(key)

    def _check_hotkeys(self) -> None:
        """Check if any hotkey combination is pressed."""
        # Push-to-talk (hold)
        if self._push_to_talk_keys.issubset(self._pressed):
            if not self._push_to_talk_active:
                self._push_to_talk_active = True
                if self._on_push_to_talk_start:
                    self._call_callback(self._on_push_to_talk_start)
            return

        # Toggle (press)
        if self._toggle_keys.issubset(self._pressed):
            if self._on_toggle:
                self._call_callback(self._on_toggle)
            self._pressed.clear()  # Prevent repeat
            return

        # Command mode
        if self._command_keys.issubset(self._pressed):
            if self._on_command_mode:
                self._call_callback(self._on_command_mode)
            self._pressed.clear()
            return

        # Cancel
        if self._cancel_keys.issubset(self._pressed):
            if self._on_cancel:
                self._call_callback(self._on_cancel)
            self._pressed.clear()
            return

    def _call_callback(self, callback: Callable) -> None:
        """Call callback in separate thread to not block listener."""
        thread = threading.Thread(target=callback, daemon=True)
        thread.start()

    @property
    def is_push_to_talk_active(self) -> bool:
        """Check if push-to-talk is currently active."""
        return self._push_to_talk_active
