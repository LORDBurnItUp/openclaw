"""System-wide keyboard/input adapter."""

from __future__ import annotations

import asyncio
import logging
import platform
from pathlib import Path
from typing import Any

try:
    from pynput import keyboard
    from pynput.keyboard import Key, Controller
except ImportError:
    keyboard = None
    Key = None
    Controller = None

try:
    import pyperclip
except ImportError:
    pyperclip = None

from voxcode.core.events import EventBus
from voxcode.ide.manager import IDEAdapter, IDEInfo
from voxcode.intelligence.context import EditorContext


logger = logging.getLogger(__name__)


# Key name mapping
KEY_MAP = {
    "ctrl": Key.ctrl if Key else None,
    "control": Key.ctrl if Key else None,
    "alt": Key.alt if Key else None,
    "shift": Key.shift if Key else None,
    "enter": Key.enter if Key else None,
    "return": Key.enter if Key else None,
    "tab": Key.tab if Key else None,
    "space": Key.space if Key else None,
    "backspace": Key.backspace if Key else None,
    "delete": Key.delete if Key else None,
    "escape": Key.esc if Key else None,
    "esc": Key.esc if Key else None,
    "up": Key.up if Key else None,
    "down": Key.down if Key else None,
    "left": Key.left if Key else None,
    "right": Key.right if Key else None,
    "home": Key.home if Key else None,
    "end": Key.end if Key else None,
    "pageup": Key.page_up if Key else None,
    "pagedown": Key.page_down if Key else None,
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


class SystemAdapter(IDEAdapter):
    """
    System-wide input adapter using keyboard simulation.

    Works with any application by simulating keyboard input.
    Limited context awareness but universal compatibility.
    """

    def __init__(self, bus: EventBus) -> None:
        if Controller is None:
            raise ImportError("pynput not installed. Run: pip install pynput")

        self.bus = bus
        self._controller = Controller()
        self._connected = False
        self._info = IDEInfo(
            name="System",
            version=platform.system()
        )

    async def connect(self) -> bool:
        """Connect (always succeeds for system adapter)."""
        self._connected = True
        logger.info("System keyboard adapter ready")
        return True

    async def disconnect(self) -> None:
        """Disconnect."""
        self._connected = False

    async def get_context(self) -> EditorContext:
        """Get context (limited for system adapter)."""
        # Try to get clipboard content as context
        ctx = EditorContext()

        if pyperclip:
            try:
                ctx.file_content = pyperclip.paste() or ""
            except Exception:
                pass

        return ctx

    async def type_text(self, text: str) -> None:
        """Type text using keyboard simulation."""
        await asyncio.to_thread(self._type_text_sync, text)

    def _type_text_sync(self, text: str) -> None:
        """Synchronous text typing."""
        # For long text, use clipboard paste (faster)
        if len(text) > 100 and pyperclip:
            try:
                old_clipboard = pyperclip.paste()
                pyperclip.copy(text)
                self._press_keys_sync(["ctrl", "v"])
                # Restore clipboard
                pyperclip.copy(old_clipboard)
                return
            except Exception:
                pass

        # Type character by character
        self._controller.type(text)

    async def insert_code(self, code: str, position: tuple[int, int] | None = None) -> None:
        """Insert code (just types it for system adapter)."""
        if position:
            # Can't reliably position cursor in unknown apps
            logger.warning("Position ignored in system adapter")

        await self.type_text(code)

    async def execute_command(self, command: str, args: dict | None = None) -> Any:
        """Execute command via keyboard shortcuts."""
        # Map VS Code commands to universal shortcuts
        shortcuts = {
            "workbench.action.files.save": ["ctrl", "s"],
            "undo": ["ctrl", "z"],
            "redo": ["ctrl", "y"],
            "editor.action.clipboardCopyAction": ["ctrl", "c"],
            "editor.action.clipboardPasteAction": ["ctrl", "v"],
            "actions.find": ["ctrl", "f"],
            "workbench.action.terminal.toggleTerminal": ["ctrl", "`"],
        }

        if command in shortcuts:
            await press_keys(shortcuts[command])
            return True

        logger.warning(f"Unknown command for system adapter: {command}")
        return None

    async def goto_line(self, line: int) -> None:
        """Go to line (uses Ctrl+G which works in many editors)."""
        await press_keys(["ctrl", "g"])
        await asyncio.sleep(0.1)
        await self.type_text(str(line))
        await press_keys(["enter"])

    async def find_text(self, text: str) -> None:
        """Open find dialog."""
        await press_keys(["ctrl", "f"])
        await asyncio.sleep(0.1)
        await self.type_text(text)

    def _press_keys_sync(self, keys: list[str]) -> None:
        """Press key combination synchronously."""
        pressed = []

        try:
            for key in keys:
                key_obj = KEY_MAP.get(key.lower())
                if key_obj:
                    self._controller.press(key_obj)
                    pressed.append(key_obj)
                elif len(key) == 1:
                    self._controller.press(key)
                    pressed.append(key)

        finally:
            # Release in reverse order
            for key_obj in reversed(pressed):
                self._controller.release(key_obj)

    @property
    def is_connected(self) -> bool:
        return self._connected

    @property
    def info(self) -> IDEInfo:
        return self._info


# Module-level helper functions

async def type_text(text: str) -> None:
    """Type text using system keyboard."""
    if Controller is None:
        raise ImportError("pynput not installed")

    controller = Controller()
    await asyncio.to_thread(controller.type, text)


async def press_keys(keys: list[str]) -> None:
    """Press key combination."""
    if Controller is None:
        raise ImportError("pynput not installed")

    controller = Controller()

    def _press():
        pressed = []
        try:
            for key in keys:
                key_obj = KEY_MAP.get(key.lower())
                if key_obj:
                    controller.press(key_obj)
                    pressed.append(key_obj)
                elif len(key) == 1:
                    controller.press(key)
                    pressed.append(key)
        finally:
            for key_obj in reversed(pressed):
                controller.release(key_obj)

    await asyncio.to_thread(_press)


async def copy_to_clipboard(text: str) -> None:
    """Copy text to clipboard."""
    if pyperclip is None:
        raise ImportError("pyperclip not installed")

    await asyncio.to_thread(pyperclip.copy, text)


async def paste_from_clipboard() -> str:
    """Get text from clipboard."""
    if pyperclip is None:
        raise ImportError("pyperclip not installed")

    return await asyncio.to_thread(pyperclip.paste)
