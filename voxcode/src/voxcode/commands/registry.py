"""Command registry for extensible commands."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable, Coroutine, TYPE_CHECKING

if TYPE_CHECKING:
    from voxcode.commands.parser import CommandResult


logger = logging.getLogger(__name__)


class Command(ABC):
    """Base class for executable commands."""

    name: str
    description: str
    aliases: list[str] = []

    @abstractmethod
    async def execute(self, result: CommandResult) -> Any:
        """Execute the command."""
        pass


class FunctionCommand(Command):
    """Command wrapping a simple function."""

    def __init__(
        self,
        name: str,
        func: Callable[..., Coroutine[Any, Any, Any]] | Callable[..., Any],
        description: str = "",
        aliases: list[str] | None = None
    ) -> None:
        self.name = name
        self.func = func
        self.description = description
        self.aliases = aliases or []

    async def execute(self, result: CommandResult) -> Any:
        """Execute the wrapped function."""
        import asyncio

        if asyncio.iscoroutinefunction(self.func):
            return await self.func(result)
        else:
            return self.func(result)


@dataclass
class CommandRegistry:
    """Registry for available commands."""

    _commands: dict[str, Command] = field(default_factory=dict)

    def register(self, command: Command) -> None:
        """Register a command."""
        self._commands[command.name] = command

        # Register aliases
        for alias in command.aliases:
            self._commands[alias] = command

        logger.debug(f"Registered command: {command.name}")

    def register_function(
        self,
        name: str,
        func: Callable,
        description: str = "",
        aliases: list[str] | None = None
    ) -> None:
        """Register a function as a command."""
        self.register(FunctionCommand(name, func, description, aliases))

    def get(self, name: str) -> Command | None:
        """Get a command by name."""
        return self._commands.get(name)

    def list_commands(self) -> list[str]:
        """List all registered command names."""
        return list(set(
            cmd.name for cmd in self._commands.values()
        ))

    def decorator(
        self,
        name: str | None = None,
        description: str = "",
        aliases: list[str] | None = None
    ) -> Callable:
        """Decorator to register a function as a command."""
        def wrapper(func: Callable) -> Callable:
            cmd_name = name or func.__name__
            self.register_function(cmd_name, func, description, aliases)
            return func
        return wrapper


# Default registry with built-in commands
_default_registry: CommandRegistry | None = None


def get_default_registry() -> CommandRegistry:
    """Get the default command registry with built-in commands."""
    global _default_registry

    if _default_registry is None:
        _default_registry = CommandRegistry()
        _register_builtin_commands(_default_registry)

    return _default_registry


def _register_builtin_commands(registry: CommandRegistry) -> None:
    """Register built-in commands."""

    @registry.decorator("save", "Save current file", ["save_file"])
    async def save_command(result):
        from voxcode.ide.manager import get_ide_manager
        manager = get_ide_manager()
        await manager.execute_command("workbench.action.files.save")

    @registry.decorator("undo", "Undo last action")
    async def undo_command(result):
        from voxcode.ide.manager import get_ide_manager
        manager = get_ide_manager()
        await manager.execute_command("undo")

    @registry.decorator("redo", "Redo last undone action")
    async def redo_command(result):
        from voxcode.ide.manager import get_ide_manager
        manager = get_ide_manager()
        await manager.execute_command("redo")

    @registry.decorator("copy", "Copy selection")
    async def copy_command(result):
        from voxcode.ide.manager import get_ide_manager
        manager = get_ide_manager()
        await manager.execute_command("editor.action.clipboardCopyAction")

    @registry.decorator("paste", "Paste from clipboard")
    async def paste_command(result):
        from voxcode.ide.manager import get_ide_manager
        manager = get_ide_manager()
        await manager.execute_command("editor.action.clipboardPasteAction")

    @registry.decorator("format", "Format document", ["format_code", "format_document"])
    async def format_command(result):
        from voxcode.ide.manager import get_ide_manager
        manager = get_ide_manager()
        await manager.execute_command("editor.action.formatDocument")

    @registry.decorator("comment", "Toggle comment", ["toggle_comment"])
    async def comment_command(result):
        from voxcode.ide.manager import get_ide_manager
        manager = get_ide_manager()
        await manager.execute_command("editor.action.commentLine")

    @registry.decorator("run", "Run current file", ["run_code", "execute"])
    async def run_command(result):
        from voxcode.ide.manager import get_ide_manager
        manager = get_ide_manager()
        await manager.execute_command("workbench.action.debug.run")

    @registry.decorator("test", "Run tests", ["run_tests"])
    async def test_command(result):
        from voxcode.ide.manager import get_ide_manager
        manager = get_ide_manager()
        await manager.execute_command("testing.runAll")

    @registry.decorator("goto_line", "Go to line number")
    async def goto_line_command(result):
        from voxcode.ide.manager import get_ide_manager
        manager = get_ide_manager()

        # Extract line number from parameters
        groups = result.parameters.get("groups", ())
        line_num = None
        for g in groups:
            if g and g.isdigit():
                line_num = int(g)
                break

        if line_num:
            await manager.goto_line(line_num)

    @registry.decorator("goto_definition", "Go to definition", ["go_to_def"])
    async def goto_definition_command(result):
        from voxcode.ide.manager import get_ide_manager
        manager = get_ide_manager()
        await manager.execute_command("editor.action.revealDefinition")

    @registry.decorator("find", "Find in file", ["search"])
    async def find_command(result):
        from voxcode.ide.manager import get_ide_manager
        manager = get_ide_manager()

        search_text = result.target
        if search_text:
            await manager.find_text(search_text)
        else:
            await manager.execute_command("actions.find")

    @registry.decorator("terminal", "Open terminal", ["open_terminal"])
    async def terminal_command(result):
        from voxcode.ide.manager import get_ide_manager
        manager = get_ide_manager()
        await manager.execute_command("workbench.action.terminal.toggleTerminal")
