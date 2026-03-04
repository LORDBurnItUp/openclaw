"""VS Code integration adapter."""

from __future__ import annotations

import asyncio
import json
import logging
import subprocess
from pathlib import Path
from typing import Any

from voxcode.core.events import EventBus
from voxcode.ide.manager import IDEAdapter, IDEInfo
from voxcode.intelligence.context import EditorContext


logger = logging.getLogger(__name__)


class VSCodeAdapter(IDEAdapter):
    """
    VS Code integration via CLI and extension.

    Methods:
    - CLI (code command) for file operations
    - Extension WebSocket for real-time context
    - Keyboard simulation for typing
    """

    def __init__(self, bus: EventBus) -> None:
        self.bus = bus
        self._connected = False
        self._info = IDEInfo(name="VS Code")
        self._workspace: Path | None = None
        self._ws_client = None  # WebSocket client for extension

    async def detect(self) -> bool:
        """Detect if VS Code is running."""
        try:
            # Check if code CLI is available
            result = await asyncio.to_thread(
                subprocess.run,
                ["code", "--version"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                version = result.stdout.strip().split("\n")[0]
                self._info = IDEInfo(name="VS Code", version=version)
                return True
        except Exception as e:
            logger.debug(f"VS Code not detected: {e}")

        return False

    async def connect(self) -> bool:
        """Connect to VS Code."""
        if not await self.detect():
            return False

        self._connected = True
        logger.info("Connected to VS Code")

        # Try to connect to VoxCode extension WebSocket
        await self._connect_extension()

        return True

    async def _connect_extension(self) -> None:
        """Connect to VoxCode VS Code extension."""
        try:
            import websockets

            # Extension runs WebSocket server on this port
            uri = "ws://localhost:17720"
            self._ws_client = await websockets.connect(uri)
            logger.info("Connected to VoxCode VS Code extension")

        except ImportError:
            logger.debug("websockets not installed, using CLI mode")
        except Exception as e:
            logger.debug(f"Extension not available: {e}")

    async def disconnect(self) -> None:
        """Disconnect from VS Code."""
        if self._ws_client:
            await self._ws_client.close()
            self._ws_client = None
        self._connected = False

    async def get_context(self) -> EditorContext:
        """Get current editor context."""
        ctx = EditorContext()

        # Try extension first
        if self._ws_client:
            try:
                await self._ws_client.send(json.dumps({"type": "getContext"}))
                response = await asyncio.wait_for(
                    self._ws_client.recv(),
                    timeout=1.0
                )
                data = json.loads(response)

                ctx.file_path = Path(data.get("file", "")) if data.get("file") else None
                ctx.file_content = data.get("content", "")
                ctx.language = data.get("language")
                ctx.cursor = data.get("cursor")
                ctx.selection = data.get("selection")

                return ctx

            except Exception as e:
                logger.debug(f"Extension context failed: {e}")

        # Fallback: get workspace info from CLI
        try:
            result = await asyncio.to_thread(
                subprocess.run,
                ["code", "--status"],
                capture_output=True,
                text=True
            )
            # Parse output for active window info
            # This is limited but better than nothing

        except Exception as e:
            logger.debug(f"CLI status failed: {e}")

        return ctx

    async def type_text(self, text: str) -> None:
        """Type text at current cursor."""
        if self._ws_client:
            try:
                await self._ws_client.send(json.dumps({
                    "type": "typeText",
                    "text": text
                }))
                return
            except Exception as e:
                logger.debug(f"Extension type failed: {e}")

        # Fallback to keyboard simulation
        from voxcode.ide.system import type_text
        await type_text(text)

    async def insert_code(self, code: str, position: tuple[int, int] | None = None) -> None:
        """Insert code at position."""
        if self._ws_client:
            try:
                await self._ws_client.send(json.dumps({
                    "type": "insertCode",
                    "code": code,
                    "position": position
                }))
                return
            except Exception as e:
                logger.debug(f"Extension insert failed: {e}")

        # Fallback to typing
        await self.type_text(code)

    async def execute_command(self, command: str, args: dict | None = None) -> Any:
        """Execute VS Code command."""
        # Try extension
        if self._ws_client:
            try:
                await self._ws_client.send(json.dumps({
                    "type": "executeCommand",
                    "command": command,
                    "args": args or {}
                }))

                response = await asyncio.wait_for(
                    self._ws_client.recv(),
                    timeout=5.0
                )
                return json.loads(response).get("result")

            except Exception as e:
                logger.debug(f"Extension command failed: {e}")

        # Try CLI for some commands
        if command.startswith("workbench.action.files"):
            if "save" in command:
                # Use keyboard shortcut
                from voxcode.ide.system import press_keys
                await press_keys(["ctrl", "s"])
                return True

        # Map common commands to keyboard shortcuts
        shortcuts = {
            "undo": ["ctrl", "z"],
            "redo": ["ctrl", "y"],
            "editor.action.clipboardCopyAction": ["ctrl", "c"],
            "editor.action.clipboardPasteAction": ["ctrl", "v"],
            "editor.action.formatDocument": ["shift", "alt", "f"],
            "editor.action.commentLine": ["ctrl", "/"],
            "workbench.action.terminal.toggleTerminal": ["ctrl", "`"],
            "editor.action.revealDefinition": ["f12"],
            "actions.find": ["ctrl", "f"],
        }

        if command in shortcuts:
            from voxcode.ide.system import press_keys
            await press_keys(shortcuts[command])
            return True

        logger.warning(f"Cannot execute command without extension: {command}")
        return None

    async def goto_line(self, line: int) -> None:
        """Go to line number."""
        if self._ws_client:
            try:
                await self._ws_client.send(json.dumps({
                    "type": "gotoLine",
                    "line": line
                }))
                return
            except Exception:
                pass

        # Use Ctrl+G shortcut
        from voxcode.ide.system import press_keys, type_text
        await press_keys(["ctrl", "g"])
        await asyncio.sleep(0.1)
        await type_text(str(line))
        await press_keys(["enter"])

    async def find_text(self, text: str) -> None:
        """Open find with text."""
        if self._ws_client:
            try:
                await self._ws_client.send(json.dumps({
                    "type": "find",
                    "text": text
                }))
                return
            except Exception:
                pass

        # Use Ctrl+F shortcut
        from voxcode.ide.system import press_keys, type_text
        await press_keys(["ctrl", "f"])
        await asyncio.sleep(0.1)
        await type_text(text)

    @property
    def is_connected(self) -> bool:
        return self._connected

    @property
    def info(self) -> IDEInfo:
        return self._info
