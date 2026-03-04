"""IDE Manager - handles all IDE interactions."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Any

from voxcode.core.events import EventBus, Event, EventType

if TYPE_CHECKING:
    from voxcode.core.config import IDEConfig
    from voxcode.intelligence.context import EditorContext


logger = logging.getLogger(__name__)


@dataclass
class IDEInfo:
    """Information about connected IDE."""
    name: str
    version: str | None = None
    workspace: Path | None = None
    active_file: Path | None = None


class IDEAdapter(ABC):
    """Abstract base for IDE adapters."""

    @abstractmethod
    async def connect(self) -> bool:
        """Connect to the IDE."""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Disconnect from the IDE."""
        pass

    @abstractmethod
    async def get_context(self) -> EditorContext:
        """Get current editor context."""
        pass

    @abstractmethod
    async def type_text(self, text: str) -> None:
        """Type text at current cursor position."""
        pass

    @abstractmethod
    async def insert_code(self, code: str, position: tuple[int, int] | None = None) -> None:
        """Insert code at position (or current cursor)."""
        pass

    @abstractmethod
    async def execute_command(self, command: str, args: dict | None = None) -> Any:
        """Execute an IDE command."""
        pass

    @abstractmethod
    async def goto_line(self, line: int) -> None:
        """Go to a specific line."""
        pass

    @abstractmethod
    async def find_text(self, text: str) -> None:
        """Open find dialog with text."""
        pass

    @property
    @abstractmethod
    def is_connected(self) -> bool:
        """Check if connected to IDE."""
        pass

    @property
    @abstractmethod
    def info(self) -> IDEInfo:
        """Get IDE info."""
        pass


class IDEManager:
    """
    Manages IDE connections and provides unified interface.

    Supports:
    - VS Code (via extension API or CLI)
    - JetBrains IDEs (via plugin or CLI)
    - Neovim (via remote plugin)
    - System-wide (keyboard simulation)
    """

    def __init__(self, config: IDEConfig, bus: EventBus) -> None:
        self.config = config
        self.bus = bus

        self._adapter: IDEAdapter | None = None
        self._fallback_adapter: IDEAdapter | None = None

    async def connect(self) -> bool:
        """Connect to IDE (auto-detect or configured)."""
        if self.config.auto_detect:
            self._adapter = await self._detect_ide()

        if self._adapter is None:
            self._adapter = self._create_adapter(self.config.default)

        if self._adapter:
            success = await self._adapter.connect()
            if success:
                await self.bus.emit(Event(
                    type=EventType.IDE_CONNECTED,
                    source="ide_manager",
                    data={"ide": self._adapter.info}
                ))
                return True

        # Fallback to system adapter
        logger.warning("Using system-wide keyboard adapter")
        from voxcode.ide.system import SystemAdapter
        self._adapter = SystemAdapter(self.bus)
        await self._adapter.connect()
        return True

    async def disconnect(self) -> None:
        """Disconnect from IDE."""
        if self._adapter:
            await self._adapter.disconnect()
            await self.bus.emit(Event(
                type=EventType.IDE_DISCONNECTED,
                source="ide_manager"
            ))
            self._adapter = None

    async def _detect_ide(self) -> IDEAdapter | None:
        """Auto-detect running IDE."""
        # Try VS Code first
        try:
            from voxcode.ide.vscode import VSCodeAdapter
            adapter = VSCodeAdapter(self.bus)
            if await adapter.detect():
                return adapter
        except Exception as e:
            logger.debug(f"VS Code detection failed: {e}")

        # Try JetBrains
        try:
            from voxcode.ide.jetbrains import JetBrainsAdapter
            adapter = JetBrainsAdapter(self.bus)
            if await adapter.detect():
                return adapter
        except Exception as e:
            logger.debug(f"JetBrains detection failed: {e}")

        return None

    def _create_adapter(self, ide_type: str) -> IDEAdapter | None:
        """Create adapter for specific IDE type."""
        if ide_type == "vscode":
            from voxcode.ide.vscode import VSCodeAdapter
            return VSCodeAdapter(self.bus)
        elif ide_type == "jetbrains":
            from voxcode.ide.jetbrains import JetBrainsAdapter
            return JetBrainsAdapter(self.bus)
        elif ide_type == "neovim":
            from voxcode.ide.neovim import NeovimAdapter
            return NeovimAdapter(self.bus)
        elif ide_type == "system":
            from voxcode.ide.system import SystemAdapter
            return SystemAdapter(self.bus)
        return None

    async def get_context(self) -> EditorContext:
        """Get current editor context."""
        if self._adapter:
            return await self._adapter.get_context()

        from voxcode.intelligence.context import EditorContext
        return EditorContext()

    async def type_text(self, text: str) -> None:
        """Type text at current position."""
        if self._adapter:
            await self._adapter.type_text(text)

    async def insert_code(self, code: str, position: tuple[int, int] | None = None) -> None:
        """Insert code."""
        if self._adapter:
            await self._adapter.insert_code(code, position)

    async def execute_command(self, command: str, args: dict | None = None) -> Any:
        """Execute IDE command."""
        if self._adapter:
            return await self._adapter.execute_command(command, args)

    async def goto_line(self, line: int) -> None:
        """Go to line."""
        if self._adapter:
            await self._adapter.goto_line(line)

    async def find_text(self, text: str) -> None:
        """Find text."""
        if self._adapter:
            await self._adapter.find_text(text)

    @property
    def is_connected(self) -> bool:
        """Check connection status."""
        return self._adapter is not None and self._adapter.is_connected

    @property
    def info(self) -> IDEInfo | None:
        """Get IDE info."""
        return self._adapter.info if self._adapter else None


# Global instance
_manager: IDEManager | None = None


def get_ide_manager() -> IDEManager:
    """Get the global IDE manager instance."""
    global _manager
    if _manager is None:
        from voxcode.core.config import Config, IDEConfig
        from voxcode.core.events import get_event_bus

        config = Config.load()
        _manager = IDEManager(config.ide, get_event_bus())

    return _manager
