"""AI Assistant for code generation and queries."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, AsyncGenerator

from voxcode.core.events import EventBus, Event, EventType
from voxcode.ai.providers import get_provider
from voxcode.ai.prompts import build_prompt

if TYPE_CHECKING:
    from voxcode.core.config import AIConfig
    from voxcode.intelligence.context import EditorContext
    from voxcode.commands.parser import CommandType


logger = logging.getLogger(__name__)


@dataclass
class AIResponse:
    """Response from AI assistant."""
    text: str = ""
    code: str | None = None
    explanation: str | None = None
    commands: list[str] = field(default_factory=list)
    confidence: float = 1.0

    @classmethod
    def from_text(cls, text: str) -> AIResponse:
        """Parse AI response text into structured response."""
        response = cls(text=text)

        # Extract code blocks
        import re
        code_pattern = r"```(?:\w+)?\n(.*?)```"
        code_matches = re.findall(code_pattern, text, re.DOTALL)
        if code_matches:
            response.code = "\n\n".join(code_matches)

        # Extract explanation (text outside code blocks)
        explanation = re.sub(code_pattern, "", text, flags=re.DOTALL).strip()
        if explanation:
            response.explanation = explanation

        return response


class AIAssistant:
    """
    AI Assistant for code-related tasks.

    Supports multiple LLM providers:
    - Ollama (local)
    - OpenAI
    - Anthropic (Claude)

    Capabilities:
    - Code generation
    - Code explanation
    - Refactoring suggestions
    - Bug fixing
    - Question answering
    """

    def __init__(self, config: AIConfig, bus: EventBus) -> None:
        self.config = config
        self.bus = bus
        self._provider = get_provider(config)

    async def process(
        self,
        query: str,
        context: EditorContext | None = None,
        command_type: CommandType | None = None,
    ) -> AIResponse:
        """
        Process a query and return AI response.

        Args:
            query: User's request or question
            context: Current editor context
            command_type: Type of command being processed

        Returns:
            AIResponse with code, explanation, etc.
        """
        await self.bus.emit(Event(
            type=EventType.AI_REQUEST,
            source="assistant",
            data={"query": query, "command_type": command_type}
        ))

        try:
            # Build prompt with context
            prompt = build_prompt(query, context, command_type)

            # Get response from provider
            response_text = await self._provider.generate(prompt)

            # Parse response
            response = AIResponse.from_text(response_text)

            await self.bus.emit(Event(
                type=EventType.AI_RESPONSE,
                source="assistant",
                data={"response": response}
            ))

            return response

        except Exception as e:
            logger.error(f"AI processing failed: {e}")
            await self.bus.emit(Event(
                type=EventType.AI_ERROR,
                source="assistant",
                data={"error": str(e), "query": query}
            ))
            return AIResponse(text=f"Error: {e}")

    async def stream(
        self,
        query: str,
        context: EditorContext | None = None,
        command_type: CommandType | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream AI response for real-time output.

        Yields chunks of response text as they're generated.
        """
        await self.bus.emit(Event(
            type=EventType.AI_REQUEST,
            source="assistant",
            data={"query": query, "streaming": True}
        ))

        try:
            prompt = build_prompt(query, context, command_type)

            async for chunk in self._provider.stream(prompt):
                await self.bus.emit(Event(
                    type=EventType.AI_STREAM_CHUNK,
                    source="assistant",
                    data={"chunk": chunk}
                ))
                yield chunk

        except Exception as e:
            logger.error(f"AI streaming failed: {e}")
            await self.bus.emit(Event(
                type=EventType.AI_ERROR,
                source="assistant",
                data={"error": str(e)}
            ))
            yield f"Error: {e}"

    async def explain_code(self, code: str, language: str | None = None) -> str:
        """Get explanation for code snippet."""
        prompt = f"""Explain this code concisely:

```{language or ''}
{code}
```

Explain what it does, key concepts, and any potential issues."""

        response = await self._provider.generate(prompt)
        return response

    async def fix_code(
        self,
        code: str,
        error: str | None = None,
        language: str | None = None
    ) -> AIResponse:
        """Fix code with optional error message."""
        prompt = f"""Fix this code:

```{language or ''}
{code}
```
"""
        if error:
            prompt += f"\nError message: {error}"

        prompt += "\n\nProvide the fixed code and explain what was wrong."

        response_text = await self._provider.generate(prompt)
        return AIResponse.from_text(response_text)

    async def refactor_code(
        self,
        code: str,
        instruction: str,
        language: str | None = None
    ) -> AIResponse:
        """Refactor code based on instruction."""
        prompt = f"""Refactor this code:

```{language or ''}
{code}
```

Instruction: {instruction}

Provide the refactored code and explain the changes."""

        response_text = await self._provider.generate(prompt)
        return AIResponse.from_text(response_text)

    async def generate_code(
        self,
        description: str,
        language: str | None = None,
        context: str | None = None
    ) -> AIResponse:
        """Generate code from description."""
        prompt = f"Generate {language or 'code'} for: {description}"

        if context:
            prompt += f"\n\nContext (existing code):\n```\n{context}\n```"

        prompt += "\n\nProvide only the code, no explanations unless necessary."

        response_text = await self._provider.generate(prompt)
        return AIResponse.from_text(response_text)

    async def answer_question(
        self,
        question: str,
        context: str | None = None
    ) -> str:
        """Answer a coding question."""
        prompt = question

        if context:
            prompt = f"""Given this code context:

```
{context}
```

{question}"""

        response = await self._provider.generate(prompt)
        return response

    def change_provider(self, provider_name: str, **kwargs) -> None:
        """Change the LLM provider."""
        from voxcode.core.config import AIConfig

        new_config = AIConfig(
            provider=provider_name,
            model=kwargs.get("model", self.config.model),
            api_key=kwargs.get("api_key", self.config.api_key),
            api_base=kwargs.get("api_base", self.config.api_base),
        )

        self.config = new_config
        self._provider = get_provider(new_config)
        logger.info(f"Changed AI provider to: {provider_name}")
