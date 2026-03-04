"""Code context management."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class CursorPosition:
    """Cursor position in a file."""
    line: int
    column: int
    file_path: Path | None = None


@dataclass
class Selection:
    """Selected text in editor."""
    text: str
    start: CursorPosition
    end: CursorPosition


@dataclass
class EditorContext:
    """Full editor context for AI assistance."""

    # File info
    file_path: Path | None = None
    file_content: str = ""
    language: str | None = None

    # Cursor and selection
    cursor: CursorPosition | None = None
    selection: Selection | None = None

    # Visible range
    visible_start_line: int = 0
    visible_end_line: int = 0

    # Code structure
    current_function: str | None = None
    current_class: str | None = None
    symbols: list[Any] = field(default_factory=list)
    imports: list[str] = field(default_factory=list)

    # Related files
    open_files: list[Path] = field(default_factory=list)
    recent_files: list[Path] = field(default_factory=list)

    # Diagnostics
    errors: list[dict] = field(default_factory=list)
    warnings: list[dict] = field(default_factory=list)

    @property
    def is_code_file(self) -> bool:
        """Check if this is a code file."""
        return self.language is not None

    @property
    def current_line_content(self) -> str:
        """Get content of current line."""
        if not self.cursor or not self.file_content:
            return ""

        lines = self.file_content.split("\n")
        if 0 <= self.cursor.line < len(lines):
            return lines[self.cursor.line]
        return ""

    @property
    def surrounding_context(self) -> str:
        """Get lines surrounding cursor."""
        if not self.cursor or not self.file_content:
            return ""

        lines = self.file_content.split("\n")
        start = max(0, self.cursor.line - 10)
        end = min(len(lines), self.cursor.line + 10)

        context_lines = []
        for i in range(start, end):
            marker = ">>>" if i == self.cursor.line else "   "
            context_lines.append(f"{marker} {i+1:4d} | {lines[i]}")

        return "\n".join(context_lines)

    def get_context_window(self, before: int = 50, after: int = 20) -> str:
        """Get a window of code around cursor."""
        if not self.cursor or not self.file_content:
            return self.file_content[:2000] if self.file_content else ""

        lines = self.file_content.split("\n")
        start = max(0, self.cursor.line - before)
        end = min(len(lines), self.cursor.line + after)

        return "\n".join(lines[start:end])

    def to_prompt_context(self) -> str:
        """Convert to context string for AI prompts."""
        parts = []

        # File info
        if self.file_path:
            parts.append(f"File: {self.file_path.name}")
        if self.language:
            parts.append(f"Language: {self.language}")

        # Position
        if self.cursor:
            parts.append(f"Cursor: line {self.cursor.line + 1}, column {self.cursor.column + 1}")

        # Scope
        if self.current_class:
            parts.append(f"In class: {self.current_class}")
        if self.current_function:
            parts.append(f"In function: {self.current_function}")

        # Selection
        if self.selection:
            parts.append(f"Selected: {len(self.selection.text)} characters")

        # Errors
        if self.errors:
            parts.append(f"Errors: {len(self.errors)}")
            for err in self.errors[:3]:
                parts.append(f"  - Line {err.get('line', '?')}: {err.get('message', 'Unknown error')}")

        # Code context
        parts.append("\n--- Code Context ---")
        parts.append(self.surrounding_context)

        return "\n".join(parts)


class ContextBuilder:
    """Builds rich context from various sources."""

    def __init__(self) -> None:
        self._file_cache: dict[Path, str] = {}

    def build_context(
        self,
        file_path: Path | None = None,
        content: str | None = None,
        cursor_line: int = 0,
        cursor_column: int = 0,
        selection_text: str | None = None,
    ) -> EditorContext:
        """Build editor context from available information."""
        ctx = EditorContext()

        if file_path:
            ctx.file_path = file_path
            ctx.language = self._detect_language(file_path)

            # Load content if not provided
            if content is None and file_path.exists():
                content = self._read_file(file_path)

        if content:
            ctx.file_content = content

        ctx.cursor = CursorPosition(
            line=cursor_line,
            column=cursor_column,
            file_path=file_path
        )

        if selection_text:
            ctx.selection = Selection(
                text=selection_text,
                start=ctx.cursor,
                end=CursorPosition(line=cursor_line, column=cursor_column)
            )

        return ctx

    def _detect_language(self, path: Path) -> str | None:
        """Detect language from file extension."""
        ext_map = {
            ".py": "python",
            ".js": "javascript",
            ".ts": "typescript",
            ".jsx": "javascript",
            ".tsx": "typescript",
            ".go": "go",
            ".rs": "rust",
            ".java": "java",
            ".cpp": "cpp",
            ".c": "c",
            ".rb": "ruby",
            ".php": "php",
        }
        return ext_map.get(path.suffix.lower())

    def _read_file(self, path: Path) -> str:
        """Read file with caching."""
        if path not in self._file_cache:
            try:
                self._file_cache[path] = path.read_text(encoding="utf-8", errors="replace")
            except Exception:
                self._file_cache[path] = ""
        return self._file_cache[path]

    def clear_cache(self) -> None:
        """Clear file cache."""
        self._file_cache.clear()


def extract_code_block(text: str) -> str | None:
    """Extract code from markdown code block."""
    # Look for ```language\ncode\n```
    pattern = r"```(?:\w+)?\n(.*?)```"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()

    # Look for indented code
    lines = text.split("\n")
    code_lines = []
    in_code = False

    for line in lines:
        if line.startswith("    ") or line.startswith("\t"):
            code_lines.append(line[4:] if line.startswith("    ") else line[1:])
            in_code = True
        elif in_code and not line.strip():
            code_lines.append("")
        elif in_code:
            break

    if code_lines:
        return "\n".join(code_lines).strip()

    return None
