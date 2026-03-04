"""JetBrains IDE integration adapter (placeholder)."""

from __future__ import annotations

from voxcode.core.events import EventBus
from voxcode.ide.manager import IDEAdapter, IDEInfo
from voxcode.intelligence.context import EditorContext


class JetBrainsAdapter(IDEAdapter):
    """
    JetBrains IDE integration.

    TODO: Implement via:
    - JetBrains Gateway API
    - IDE plugin with WebSocket server
    - Keyboard simulation fallback
    """

    def __init__(self, bus: EventBus) -> None:
        self.bus = bus
        self._connected = False
        self._info = IDEInfo(name="JetBrains")

    async def detect(self) -> bool:
        """Detect if JetBrains IDE is running."""
        # TODO: Check for running JetBrains processes
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
