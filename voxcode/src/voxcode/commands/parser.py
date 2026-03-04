"""Natural language command parser."""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any

from voxcode.core.config import Config
from voxcode.core.events import EventBus, Event, EventType
from voxcode.commands.registry import CommandRegistry, get_default_registry


logger = logging.getLogger(__name__)


class CommandType(Enum):
    """Types of commands."""
    DICTATION = auto()      # Just type text
    IDE_ACTION = auto()     # IDE command (save, run, etc.)
    CODE_ACTION = auto()    # Code manipulation (create function, etc.)
    GIT_ACTION = auto()     # Git commands
    AI_QUERY = auto()       # Question for AI
    AI_GENERATE = auto()    # Generate code with AI
    AI_REFACTOR = auto()    # Refactor with AI
    AI_EXPLAIN = auto()     # Explain code
    SYSTEM = auto()         # System commands (open, close, etc.)
    NAVIGATION = auto()     # Go to, find, etc.


@dataclass
class CommandResult:
    """Parsed command result."""
    command_type: CommandType
    action: str | None = None
    target: str | None = None
    parameters: dict[str, Any] = field(default_factory=dict)
    raw_text: str = ""
    confidence: float = 1.0
    requires_ai: bool = False

    def __repr__(self) -> str:
        return f"CommandResult({self.command_type.name}, action={self.action}, target={self.target})"


class CommandParser:
    """
    Parses natural language into executable commands.

    Uses pattern matching and NLP to understand voice commands.
    """

    def __init__(self, config: Config, bus: EventBus) -> None:
        self.config = config
        self.bus = bus
        self.registry = get_default_registry()

        # Build pattern matchers
        self._patterns = self._build_patterns()

    def _build_patterns(self) -> list[tuple[re.Pattern, CommandType, str]]:
        """Build regex patterns for command matching."""
        patterns = [
            # IDE Actions
            (r"^(save|save file|save all)$", CommandType.IDE_ACTION, "save"),
            (r"^(undo|undo that)$", CommandType.IDE_ACTION, "undo"),
            (r"^(redo|redo that)$", CommandType.IDE_ACTION, "redo"),
            (r"^(copy|copy that|copy selection)$", CommandType.IDE_ACTION, "copy"),
            (r"^(cut|cut that|cut selection)$", CommandType.IDE_ACTION, "cut"),
            (r"^(paste|paste that)$", CommandType.IDE_ACTION, "paste"),
            (r"^(select all|select everything)$", CommandType.IDE_ACTION, "select_all"),
            (r"^(format|format code|format document)$", CommandType.IDE_ACTION, "format"),
            (r"^(comment|comment out|toggle comment)$", CommandType.IDE_ACTION, "comment"),
            (r"^(run|run code|run file|execute)$", CommandType.IDE_ACTION, "run"),
            (r"^(debug|start debug|debug this)$", CommandType.IDE_ACTION, "debug"),
            (r"^(stop|stop running|terminate)$", CommandType.IDE_ACTION, "stop"),
            (r"^(build|build project)$", CommandType.IDE_ACTION, "build"),
            (r"^(test|run tests|run test)$", CommandType.IDE_ACTION, "test"),

            # Navigation
            (r"^go to (line )?(\d+)$", CommandType.NAVIGATION, "goto_line"),
            (r"^go to (definition|def)$", CommandType.NAVIGATION, "goto_definition"),
            (r"^go to (file|open) (.+)$", CommandType.NAVIGATION, "goto_file"),
            (r"^find (.+)$", CommandType.NAVIGATION, "find"),
            (r"^search (.+)$", CommandType.NAVIGATION, "search"),
            (r"^(next|go next|next result)$", CommandType.NAVIGATION, "next"),
            (r"^(previous|go previous|prev result)$", CommandType.NAVIGATION, "previous"),
            (r"^(back|go back)$", CommandType.NAVIGATION, "back"),
            (r"^(forward|go forward)$", CommandType.NAVIGATION, "forward"),

            # Git Actions
            (r"^git (status|show status)$", CommandType.GIT_ACTION, "status"),
            (r"^git (add|stage)( all)?$", CommandType.GIT_ACTION, "add"),
            (r"^git commit (.+)$", CommandType.GIT_ACTION, "commit"),
            (r"^git (push|push changes)$", CommandType.GIT_ACTION, "push"),
            (r"^git (pull|pull changes)$", CommandType.GIT_ACTION, "pull"),
            (r"^git (diff|show diff)$", CommandType.GIT_ACTION, "diff"),
            (r"^git (log|show log|history)$", CommandType.GIT_ACTION, "log"),
            (r"^git (branch|branches|show branches)$", CommandType.GIT_ACTION, "branch"),
            (r"^git checkout (.+)$", CommandType.GIT_ACTION, "checkout"),

            # Code Actions (require AI)
            (r"^(create|make|add|write) (a )?(function|method|def) (.+)$", CommandType.AI_GENERATE, "create_function"),
            (r"^(create|make|add|write) (a )?(class) (.+)$", CommandType.AI_GENERATE, "create_class"),
            (r"^(create|make|add|write) (a )?(variable|var|const) (.+)$", CommandType.CODE_ACTION, "create_variable"),
            (r"^(import|add import) (.+)$", CommandType.CODE_ACTION, "add_import"),
            (r"^(delete|remove) (this )?(line|selection)$", CommandType.CODE_ACTION, "delete"),
            (r"^(rename|change name) (.+) to (.+)$", CommandType.CODE_ACTION, "rename"),

            # AI Queries
            (r"^(explain|what does|how does) (.+)$", CommandType.AI_EXPLAIN, "explain"),
            (r"^(what is|define) (.+)$", CommandType.AI_QUERY, "define"),
            (r"^(how do i|how to|show me how) (.+)$", CommandType.AI_QUERY, "how_to"),
            (r"^(why|why does|why is) (.+)$", CommandType.AI_QUERY, "why"),

            # AI Generation
            (r"^(generate|write|create) (.+)$", CommandType.AI_GENERATE, "generate"),
            (r"^(implement|add) (.+)$", CommandType.AI_GENERATE, "implement"),
            (r"^(complete|finish|autocomplete)( this)?$", CommandType.AI_GENERATE, "complete"),

            # AI Refactor
            (r"^(refactor|improve|clean up|optimize) (.+)?$", CommandType.AI_REFACTOR, "refactor"),
            (r"^(simplify|make simpler) (.+)?$", CommandType.AI_REFACTOR, "simplify"),
            (r"^(fix|fix this|fix error|fix bug)( .+)?$", CommandType.AI_REFACTOR, "fix"),
            (r"^(convert|change) (.+) to (.+)$", CommandType.AI_REFACTOR, "convert"),
            (r"^(add|insert) (error handling|try catch|validation)$", CommandType.AI_REFACTOR, "add_error_handling"),
            (r"^(add|insert) (types|type annotations|typing)$", CommandType.AI_REFACTOR, "add_types"),
            (r"^(add|insert) (tests|unit tests)$", CommandType.AI_GENERATE, "add_tests"),
            (r"^(add|insert) (docs|docstring|documentation)$", CommandType.AI_REFACTOR, "add_docs"),

            # System
            (r"^(open|launch) (.+)$", CommandType.SYSTEM, "open"),
            (r"^(close|quit|exit)( .+)?$", CommandType.SYSTEM, "close"),
            (r"^(new file|create file)( .+)?$", CommandType.SYSTEM, "new_file"),
            (r"^(new folder|create folder) (.+)$", CommandType.SYSTEM, "new_folder"),
            (r"^(terminal|open terminal|show terminal)$", CommandType.SYSTEM, "terminal"),
            (r"^(settings|preferences|options)$", CommandType.SYSTEM, "settings"),
        ]

        return [(re.compile(p, re.IGNORECASE), t, a) for p, t, a in patterns]

    async def parse(self, text: str) -> CommandResult:
        """Parse natural language text into a command."""
        text = text.strip()
        logger.debug(f"Parsing: {text}")

        # Try exact pattern matches
        for pattern, cmd_type, action in self._patterns:
            match = pattern.match(text)
            if match:
                result = CommandResult(
                    command_type=cmd_type,
                    action=action,
                    raw_text=text,
                    requires_ai=cmd_type in (
                        CommandType.AI_QUERY,
                        CommandType.AI_GENERATE,
                        CommandType.AI_REFACTOR,
                        CommandType.AI_EXPLAIN,
                    )
                )

                # Extract parameters from capture groups
                groups = match.groups()
                if groups:
                    result.parameters["groups"] = groups
                    # Set target to last meaningful group
                    for g in reversed(groups):
                        if g and not g.isspace():
                            result.target = g
                            break

                logger.info(f"Matched command: {result}")
                await self.bus.emit(Event(
                    type=EventType.COMMAND_DETECTED,
                    source="parser",
                    data={"command": result, "text": text}
                ))
                return result

        # No pattern match - determine if AI query or dictation
        if self._looks_like_question(text):
            return CommandResult(
                command_type=CommandType.AI_QUERY,
                action="query",
                target=text,
                raw_text=text,
                requires_ai=True
            )

        if self._looks_like_command(text):
            return CommandResult(
                command_type=CommandType.AI_GENERATE,
                action="generate",
                target=text,
                raw_text=text,
                requires_ai=True
            )

        # Default to dictation
        return CommandResult(
            command_type=CommandType.DICTATION,
            action="type",
            target=text,
            raw_text=text,
            requires_ai=False
        )

    def _looks_like_question(self, text: str) -> bool:
        """Check if text looks like a question."""
        question_starters = [
            "what", "why", "how", "when", "where", "who", "which",
            "can you", "could you", "would you", "will you",
            "is it", "are there", "do you", "does this",
        ]
        text_lower = text.lower()
        return (
            text.endswith("?") or
            any(text_lower.startswith(q) for q in question_starters)
        )

    def _looks_like_command(self, text: str) -> bool:
        """Check if text looks like a command/instruction."""
        command_starters = [
            "create", "make", "add", "write", "generate",
            "delete", "remove", "change", "update", "modify",
            "fix", "refactor", "improve", "optimize",
            "implement", "build", "setup", "configure",
            "please", "i want", "i need", "let's",
        ]
        text_lower = text.lower()
        return any(text_lower.startswith(c) for c in command_starters)

    async def execute(self, result: CommandResult) -> None:
        """Execute a parsed command."""
        logger.info(f"Executing: {result}")

        await self.bus.emit(Event(
            type=EventType.COMMAND_EXECUTING,
            source="parser",
            data={"command": result}
        ))

        try:
            # Look up in registry
            if result.action:
                command = self.registry.get(result.action)
                if command:
                    await command.execute(result)
                    return

            # Fallback to event-based execution
            await self.bus.emit(Event(
                type=EventType.IDE_ACTION,
                source="parser",
                data={
                    "action": result.action,
                    "target": result.target,
                    "parameters": result.parameters
                }
            ))

            await self.bus.emit(Event(
                type=EventType.COMMAND_COMPLETE,
                source="parser",
                data={"command": result}
            ))

        except Exception as e:
            logger.error(f"Command execution failed: {e}")
            await self.bus.emit(Event(
                type=EventType.COMMAND_ERROR,
                source="parser",
                data={"command": result, "error": str(e)}
            ))
