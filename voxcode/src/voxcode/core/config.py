"""Configuration management for VoxCode."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Literal

import yaml
from pydantic import BaseModel, Field
from platformdirs import user_config_dir, user_data_dir


class VoiceConfig(BaseModel):
    """Voice/Whisper configuration."""

    model: Literal["tiny", "tiny.en", "base", "base.en", "small", "small.en",
                   "medium", "medium.en", "large", "large-v2", "large-v3"] = "base.en"
    language: str = "en"
    device: Literal["cuda", "cpu", "mps", "auto"] = "auto"
    compute_type: Literal["float16", "float32", "int8"] = "float16"

    # Audio settings
    sample_rate: int = 16000
    channels: int = 1
    chunk_duration: float = 0.5  # seconds

    # VAD (Voice Activity Detection)
    vad_threshold: float = 0.5
    silence_duration: float = 1.0  # seconds of silence to stop recording
    min_speech_duration: float = 0.3  # minimum speech to process


class AIConfig(BaseModel):
    """AI/LLM configuration."""

    provider: Literal["ollama", "openai", "anthropic", "local"] = "ollama"
    model: str = "codellama"
    api_key: str | None = None
    api_base: str | None = None

    # Generation settings
    temperature: float = 0.3
    max_tokens: int = 2048

    # Ollama specific
    ollama_host: str = "http://localhost:11434"


class HotkeyConfig(BaseModel):
    """Hotkey configuration."""

    push_to_talk: str = "ctrl+shift+v"
    toggle_listening: str = "ctrl+shift+space"
    command_mode: str = "ctrl+shift+c"
    cancel: str = "escape"


class IDEConfig(BaseModel):
    """IDE integration configuration."""

    default: Literal["vscode", "jetbrains", "neovim", "system"] = "vscode"
    auto_detect: bool = True

    # VS Code specific
    vscode_cli: str = "code"

    # JetBrains specific
    jetbrains_cli: str | None = None


class DictationConfig(BaseModel):
    """Dictation behavior configuration."""

    auto_punctuate: bool = True
    auto_capitalize: bool = True
    code_mode_patterns: list[str] = Field(
        default_factory=lambda: [
            r"\.py$", r"\.js$", r"\.ts$", r"\.jsx$", r"\.tsx$",
            r"\.go$", r"\.rs$", r"\.java$", r"\.cpp$", r"\.c$",
            r"\.rb$", r"\.php$", r"\.swift$", r"\.kt$"
        ]
    )

    # Code formatting
    snake_case_threshold: float = 0.7  # confidence to use snake_case
    camel_case_languages: list[str] = Field(
        default_factory=lambda: ["java", "javascript", "typescript", "csharp"]
    )


class Config(BaseModel):
    """Main VoxCode configuration."""

    voice: VoiceConfig = Field(default_factory=VoiceConfig)
    ai: AIConfig = Field(default_factory=AIConfig)
    hotkeys: HotkeyConfig = Field(default_factory=HotkeyConfig)
    ide: IDEConfig = Field(default_factory=IDEConfig)
    dictation: DictationConfig = Field(default_factory=DictationConfig)

    # Wake word
    wake_word: str = "hey vox"
    wake_word_enabled: bool = True

    # Logging
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    log_file: Path | None = None

    # Paths
    config_dir: Path = Field(default_factory=lambda: Path(user_config_dir("voxcode")))
    data_dir: Path = Field(default_factory=lambda: Path(user_data_dir("voxcode")))
    models_dir: Path | None = None

    @classmethod
    def load(cls, path: Path | None = None) -> Config:
        """Load configuration from file."""
        if path is None:
            path = Path(user_config_dir("voxcode")) / "config.yaml"

        if path.exists():
            with open(path) as f:
                data = yaml.safe_load(f) or {}
            return cls.model_validate(data)

        return cls()

    def save(self, path: Path | None = None) -> None:
        """Save configuration to file."""
        if path is None:
            path = self.config_dir / "config.yaml"

        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, "w") as f:
            yaml.dump(self.model_dump(mode="json"), f, default_flow_style=False)

    def ensure_dirs(self) -> None:
        """Ensure all required directories exist."""
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        if self.models_dir:
            self.models_dir.mkdir(parents=True, exist_ok=True)
        else:
            self.models_dir = self.data_dir / "models"
            self.models_dir.mkdir(parents=True, exist_ok=True)


# Default configuration template
DEFAULT_CONFIG_YAML = """
# VoxCode Configuration
# Edit this file to customize your experience

voice:
  model: "base.en"       # tiny, base, small, medium, large (+ .en variants)
  language: "en"
  device: "auto"         # cuda, cpu, mps, auto

  # Voice detection
  vad_threshold: 0.5
  silence_duration: 1.0  # seconds of silence to stop

ai:
  provider: "ollama"     # ollama, openai, anthropic
  model: "codellama"     # for anthropic: claude-sonnet-4-6, claude-opus-4-6, claude-haiku-4-5
  # api_key: "sk-..."    # for openai/anthropic

hotkeys:
  push_to_talk: "ctrl+shift+v"
  toggle_listening: "ctrl+shift+space"
  command_mode: "ctrl+shift+c"
  cancel: "escape"

ide:
  default: "vscode"
  auto_detect: true

dictation:
  auto_punctuate: true
  auto_capitalize: true

# Wake word activation
wake_word: "hey vox"
wake_word_enabled: true

log_level: "INFO"
"""
