"""Prompt building for AI assistant."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from voxcode.intelligence.context import EditorContext
    from voxcode.commands.parser import CommandType


SYSTEM_PROMPT = """You are VoxCode, an AI coding assistant activated by voice.

Guidelines:
- Be concise - users are speaking, not typing
- Provide working code that can be inserted directly
- When asked to create/write/generate, output code in markdown code blocks
- When asked questions, give brief but complete answers
- Match the style and conventions of existing code when context is provided
- For refactoring, preserve functionality unless asked to change it

Output format:
- Code should be in ```language\ncode\n``` blocks
- Keep explanations brief unless specifically asked for details
- If multiple options exist, suggest the most common/recommended one first"""


def build_prompt(
    query: str,
    context: EditorContext | None = None,
    command_type: CommandType | None = None,
) -> str:
    """
    Build a prompt for the AI model.

    Args:
        query: User's request
        context: Current editor context
        command_type: Type of command being processed

    Returns:
        Formatted prompt string
    """
    parts = [SYSTEM_PROMPT, ""]

    # Add context if available
    if context and context.is_code_file:
        parts.append("## Current Context")

        if context.file_path:
            parts.append(f"File: {context.file_path.name}")

        if context.language:
            parts.append(f"Language: {context.language}")

        if context.current_class:
            parts.append(f"In class: {context.current_class}")

        if context.current_function:
            parts.append(f"In function: {context.current_function}")

        # Add surrounding code
        if context.file_content:
            code_window = context.get_context_window(before=30, after=10)
            if code_window:
                parts.append(f"\nCode context:\n```{context.language or ''}\n{code_window}\n```")

        # Add selection if present
        if context.selection and context.selection.text:
            parts.append(f"\nSelected code:\n```{context.language or ''}\n{context.selection.text}\n```")

        # Add errors if present
        if context.errors:
            parts.append("\nCurrent errors:")
            for err in context.errors[:3]:
                parts.append(f"- Line {err.get('line', '?')}: {err.get('message', '')}")

        parts.append("")

    # Add command-specific instructions
    if command_type:
        from voxcode.commands.parser import CommandType

        if command_type == CommandType.AI_GENERATE:
            parts.append("Generate the requested code. Output only the code in a code block.")

        elif command_type == CommandType.AI_REFACTOR:
            parts.append("Refactor the code as requested. Show the complete refactored code.")

        elif command_type == CommandType.AI_EXPLAIN:
            parts.append("Explain the code concisely. Focus on what it does and why.")

        elif command_type == CommandType.AI_QUERY:
            parts.append("Answer the question concisely but completely.")

        parts.append("")

    # Add the user's query
    parts.append(f"## Request\n{query}")

    return "\n".join(parts)


def build_completion_prompt(
    code_before: str,
    code_after: str,
    language: str | None = None
) -> str:
    """Build prompt for code completion."""
    return f"""Complete the code at the cursor position (marked with <CURSOR>).

```{language or ''}
{code_before}<CURSOR>{code_after}
```

Output only the code to insert at the cursor position, nothing else."""


def build_fix_prompt(
    code: str,
    error_message: str,
    language: str | None = None
) -> str:
    """Build prompt for fixing code errors."""
    return f"""Fix this code error:

Error: {error_message}

```{language or ''}
{code}
```

Provide the corrected code and briefly explain the fix."""


def build_refactor_prompt(
    code: str,
    instruction: str,
    language: str | None = None
) -> str:
    """Build prompt for refactoring."""
    return f"""Refactor this code:

```{language or ''}
{code}
```

Instruction: {instruction}

Provide the refactored code."""


def build_test_prompt(
    code: str,
    language: str | None = None,
    test_framework: str | None = None
) -> str:
    """Build prompt for generating tests."""
    framework_hint = f" using {test_framework}" if test_framework else ""

    return f"""Generate unit tests{framework_hint} for this code:

```{language or ''}
{code}
```

Include tests for:
- Normal cases
- Edge cases
- Error handling (if applicable)"""


def build_doc_prompt(
    code: str,
    language: str | None = None,
    doc_style: str | None = None
) -> str:
    """Build prompt for generating documentation."""
    style_hint = f" in {doc_style} style" if doc_style else ""

    return f"""Add documentation{style_hint} to this code:

```{language or ''}
{code}
```

Add appropriate docstrings/comments for functions, classes, and complex logic."""
