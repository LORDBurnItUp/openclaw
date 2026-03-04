"""LLM Provider implementations."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import AsyncGenerator, TYPE_CHECKING

import anthropic
import httpx

if TYPE_CHECKING:
    from voxcode.core.config import AIConfig


logger = logging.getLogger(__name__)


class LLMProvider(ABC):
    """Abstract base for LLM providers."""

    @abstractmethod
    async def generate(self, prompt: str) -> str:
        """Generate response for prompt."""
        pass

    @abstractmethod
    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        """Stream response chunks."""
        pass


class OllamaProvider(LLMProvider):
    """Ollama local LLM provider."""

    def __init__(self, config: AIConfig) -> None:
        self.config = config
        self.host = config.ollama_host
        self.model = config.model

    async def generate(self, prompt: str) -> str:
        """Generate response using Ollama."""
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.host}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": self.config.temperature,
                        "num_predict": self.config.max_tokens,
                    }
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        """Stream response from Ollama."""
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.host}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": True,
                    "options": {
                        "temperature": self.config.temperature,
                        "num_predict": self.config.max_tokens,
                    }
                }
            ) as response:
                import json
                async for line in response.aiter_lines():
                    if line:
                        data = json.loads(line)
                        if chunk := data.get("response"):
                            yield chunk


class OpenAIProvider(LLMProvider):
    """OpenAI API provider."""

    def __init__(self, config: AIConfig) -> None:
        self.config = config
        self.api_key = config.api_key
        self.model = config.model or "gpt-4"
        self.api_base = config.api_base or "https://api.openai.com/v1"

    async def generate(self, prompt: str) -> str:
        """Generate response using OpenAI."""
        if not self.api_key:
            raise ValueError("OpenAI API key not configured")

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are a helpful coding assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": self.config.temperature,
                    "max_tokens": self.config.max_tokens,
                }
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        """Stream response from OpenAI."""
        if not self.api_key:
            raise ValueError("OpenAI API key not configured")

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are a helpful coding assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": self.config.temperature,
                    "max_tokens": self.config.max_tokens,
                    "stream": True,
                }
            ) as response:
                import json
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        data = json.loads(data_str)
                        if content := data["choices"][0]["delta"].get("content"):
                            yield content


class AnthropicProvider(LLMProvider):
    """Anthropic Claude API provider using official SDK."""

    def __init__(self, config: AIConfig) -> None:
        self.config = config
        self.model = config.model or "claude-sonnet-4-6"

        if not config.api_key:
            raise ValueError("Anthropic API key not configured")

        # Initialize async client with optional custom base URL
        client_kwargs: dict = {"api_key": config.api_key}
        if config.api_base:
            client_kwargs["base_url"] = config.api_base

        self.client = anthropic.AsyncAnthropic(**client_kwargs)

    async def generate(self, prompt: str) -> str:
        """Generate response using Anthropic SDK."""
        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=self.config.max_tokens,
                system="You are a helpful coding assistant. Provide concise, accurate code and explanations.",
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except anthropic.AuthenticationError:
            raise ValueError("Invalid Anthropic API key")
        except anthropic.RateLimitError as e:
            logger.warning(f"Rate limited by Anthropic API: {e}")
            raise
        except anthropic.APIStatusError as e:
            logger.error(f"Anthropic API error ({e.status_code}): {e.message}")
            raise

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        """Stream response from Anthropic using SDK streaming."""
        try:
            async with self.client.messages.stream(
                model=self.model,
                max_tokens=self.config.max_tokens,
                system="You are a helpful coding assistant.",
                messages=[{"role": "user", "content": prompt}],
            ) as stream:
                async for text in stream.text_stream:
                    yield text
        except anthropic.AuthenticationError:
            raise ValueError("Invalid Anthropic API key")
        except anthropic.RateLimitError as e:
            logger.warning(f"Rate limited by Anthropic API: {e}")
            raise
        except anthropic.APIStatusError as e:
            logger.error(f"Anthropic API error ({e.status_code}): {e.message}")
            raise


def get_provider(config: AIConfig) -> LLMProvider:
    """Get LLM provider instance based on config."""
    provider_map = {
        "ollama": OllamaProvider,
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
    }

    provider_class = provider_map.get(config.provider)
    if not provider_class:
        raise ValueError(f"Unknown provider: {config.provider}")

    return provider_class(config)
