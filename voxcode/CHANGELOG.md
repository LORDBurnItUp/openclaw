# Changelog

All notable changes to VoxCode will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-04

### Added

#### Core Features
- **Voice-to-Code Engine** - Speak naturally, get perfectly formatted code
- **OpenAI Whisper Integration** - Local speech recognition (tiny to large models)
- **Voice Activity Detection (VAD)** - Smart recording with energy-based detection
- **Push-to-Talk & Always-On Modes** - Flexible voice input options

#### AI Integration
- **Ollama Support** - 100% free, local, private AI assistance
- **OpenAI GPT-4 Support** - Cloud-based AI (requires API key)
- **Anthropic Claude Support** - Cloud-based AI (requires API key)
- **Streaming Responses** - Real-time AI output

#### IDE Support
- **VS Code Integration** - Full command support via extension API
- **JetBrains IDEs** - Support for IntelliJ, PyCharm, WebStorm, etc.
- **Neovim Integration** - Remote plugin support
- **System-wide Mode** - Works with any application via keyboard simulation

#### Voice Commands
- 40+ built-in voice commands
- Navigation: "go to line", "find", "go to definition"
- Editing: "save", "undo", "redo", "format code"
- Git: "git status", "git commit", "git push"
- AI Queries: "explain this", "fix error", "refactor"

#### Multi-Language Support
- 10+ languages with programming term translations
- English, Spanish, French, German, Portuguese
- Chinese, Japanese, Korean, Russian, Arabic, Hindi
- Language-specific wake words

#### User Interface
- Beautiful terminal UI with Rich library
- 5 color themes: Default, Dracula, Monokai, Nord, Ocean
- Live audio visualization (bar and wave modes)
- Minimal mode for low-profile operation

#### Session Recording
- Record voice sessions for review
- Replay sessions for debugging/training
- Export sessions for sharing
- Session analytics and summaries

#### Text-to-Speech Feedback
- System TTS (pyttsx3) - offline, fast
- Edge TTS - high quality neural voices (free)
- Contextual voice responses
- Code reading with symbol pronunciation

#### Configuration
- YAML-based configuration
- Customizable hotkeys
- Wake word configuration
- Per-language settings

### Technical
- Async architecture with asyncio
- Event-driven design with EventBus
- Pydantic for configuration validation
- Modular adapter pattern for IDE integrations

## [Unreleased]

### Planned
- Mobile companion app for Android
- WebSocket API for remote control
- Browser extension support
- Voice macros and custom commands

---

[0.1.0]: https://github.com/LORDBurnitdown/voxcode/releases/tag/v0.1.0
