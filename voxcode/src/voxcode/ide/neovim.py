"""Neovim integration adapter (placeholder)."""

from __future__ import annotations

from voxcode.core.events import EventBus
from voxcode.ide.manager import IDEAdapter, IDEInfo
from voxcode.intelligence.context import EditorContext


class NeovimAdapter(IDEAdapter):
    """
    Neovim integration via remote plugin.

    TODO: Implement via:
    - pynvim remote plugin API
    - Neovim socket connection
    """

    def __init__(self, bus: EventBus) -> None:
        self.bus = bus
        self._connected = False
        self._info = IDEInfo(name="Neovim")

    async def detect(self) -> bool:
        """Detect if Neovim is running with remote plugin."""
        # TODO: Check for NVIM_LISTEN_ADDRESS
        return False

    async def connect(self) -> bool:
        return False

    async def disconnect(self) -> None:
        self._connected = False

    async def get_context(self) -> EditorContext:
        return EditorContext()

    async def type_text(self, text: str) -> None:
        pass

    async def insert_code(self, code: str, position: tuple[int, int] | None = None) -> None:
        pass

    async def execute_command(self, command: str, args: dict | None = None):
        return None

    async def goto_line(self, line: int) -> None:
        pass

    async def find_text(self, text: str) -> None:
        pass

    @property
    def is_connected(self) -> bool:
        return self._connected

    @property
    def info(self) -> IDEInfo:
        return self._info
