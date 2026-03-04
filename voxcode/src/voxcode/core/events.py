"""Event system for VoxCode components."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Any, Callable, Coroutine
from collections import defaultdict


class EventType(Enum):
    """Types of events in VoxCode."""

    # Voice events
    VOICE_START = auto()
    VOICE_END = auto()
    VOICE_DATA = auto()
    TRANSCRIPTION_START = auto()
    TRANSCRIPTION_COMPLETE = auto()
    TRANSCRIPTION_ERROR = auto()

    # Command events
    COMMAND_DETECTED = auto()
    COMMAND_EXECUTING = auto()
    COMMAND_COMPLETE = auto()
    COMMAND_ERROR = auto()

    # AI events
    AI_REQUEST = auto()
    AI_RESPONSE = auto()
    AI_STREAM_CHUNK = auto()
    AI_ERROR = auto()

    # IDE events
    IDE_CONNECTED = auto()
    IDE_DISCONNECTED = auto()
    IDE_CONTEXT_CHANGED = auto()
    IDE_ACTION = auto()

    # System events
    ENGINE_START = auto()
    ENGINE_STOP = auto()
    CONFIG_CHANGED = auto()
    ERROR = auto()

    # Mode events
    MODE_CHANGED = auto()
    LISTENING_START = auto()
    LISTENING_STOP = auto()


@dataclass
class Event:
    """An event in the VoxCode system."""

    type: EventType
    data: dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    source: str = "unknown"

    def __repr__(self) -> str:
        return f"Event({self.type.name}, source={self.source}, data_keys={list(self.data.keys())})"


# Type alias for event handlers
EventHandler = Callable[[Event], Coroutine[Any, Any, None]] | Callable[[Event], None]


class EventBus:
    """Central event bus for VoxCode."""

    def __init__(self) -> None:
        self._handlers: dict[EventType, list[EventHandler]] = defaultdict(list)
        self._global_handlers: list[EventHandler] = []
        self._history: list[Event] = []
        self._history_limit = 1000

    def subscribe(
        self,
        event_type: EventType | None = None,
        handler: EventHandler | None = None
    ) -> Callable[[EventHandler], EventHandler]:
        """
        Subscribe to events. Can be used as a decorator.

        @bus.subscribe(EventType.VOICE_END)
        async def on_voice_end(event):
            ...
        """
        def decorator(fn: EventHandler) -> EventHandler:
            if event_type is None:
                self._global_handlers.append(fn)
            else:
                self._handlers[event_type].append(fn)
            return fn

        if handler is not None:
            return decorator(handler)
        return decorator

    def unsubscribe(
        self,
        event_type: EventType | None,
        handler: EventHandler
    ) -> None:
        """Unsubscribe a handler from events."""
        if event_type is None:
            if handler in self._global_handlers:
                self._global_handlers.remove(handler)
        else:
            if handler in self._handlers[event_type]:
                self._handlers[event_type].remove(handler)

    async def emit(self, event: Event) -> None:
        """Emit an event to all subscribers."""
        # Store in history
        self._history.append(event)
        if len(self._history) > self._history_limit:
            self._history = self._history[-self._history_limit:]

        # Call type-specific handlers
        handlers = self._handlers.get(event.type, []) + self._global_handlers

        for handler in handlers:
            try:
                result = handler(event)
                if asyncio.iscoroutine(result):
                    await result
            except Exception as e:
                # Emit error event (but don't recurse)
                if event.type != EventType.ERROR:
                    error_event = Event(
                        type=EventType.ERROR,
                        data={"error": str(e), "original_event": event},
                        source="event_bus"
                    )
                    await self.emit(error_event)

    def emit_sync(self, event: Event) -> None:
        """Emit an event synchronously (for non-async contexts)."""
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(self.emit(event))
        else:
            loop.run_until_complete(self.emit(event))

    def get_history(
        self,
        event_type: EventType | None = None,
        limit: int = 100
    ) -> list[Event]:
        """Get recent event history."""
        if event_type is None:
            return self._history[-limit:]
        return [e for e in self._history if e.type == event_type][-limit:]


# Global event bus instance
_global_bus: EventBus | None = None


def get_event_bus() -> EventBus:
    """Get the global event bus instance."""
    global _global_bus
    if _global_bus is None:
        _global_bus = EventBus()
    return _global_bus
