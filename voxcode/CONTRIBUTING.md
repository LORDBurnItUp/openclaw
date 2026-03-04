# Contributing to VoxCode

Thank you for your interest in contributing to VoxCode! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs actual behavior
- **Environment details**: OS, Python version, VoxCode version
- **Error messages** or logs if applicable
- **Screenshots** for UI issues

### Suggesting Features

Feature requests are welcome! Please include:

- **Clear description** of the feature
- **Use case** - why would this be useful?
- **Possible implementation** approach (optional)

### Pull Requests

1. **Fork** the repository
2. **Create a branch** for your feature (`git checkout -b feature/amazing-feature`)
3. **Make your changes** following our code style
4. **Write tests** for new functionality
5. **Run the test suite** to ensure nothing is broken
6. **Commit** with clear messages
7. **Push** to your fork
8. **Open a Pull Request**

## Development Setup

### Prerequisites

- Python 3.10 or higher
- FFmpeg (for audio processing)
- Git

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/voxcode.git
cd voxcode

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install in development mode with all dependencies
pip install -e ".[dev,all]"

# Download Whisper model
python -c "import whisper; whisper.load_model('base.en')"
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=voxcode

# Run specific test file
pytest tests/test_config.py -v
```

### Code Style

We use the following tools to maintain code quality:

```bash
# Format code with black
black src/

# Lint with ruff
ruff check src/

# Type check with mypy
mypy src/voxcode
```

### Pre-commit Hooks (Optional)

```bash
pip install pre-commit
pre-commit install
```

## Code Guidelines

### Python Style

- Follow [PEP 8](https://pep8.org/)
- Use type hints for function signatures
- Maximum line length: 100 characters
- Use descriptive variable names

### Documentation

- Add docstrings to public functions and classes
- Keep comments concise and meaningful
- Update README if adding new features

### Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor" not "Moves cursor")
- Keep first line under 72 characters
- Reference issues when applicable (`Fix #123`)

### Example

```
Add support for custom wake words

- Allow users to configure wake word in config.yaml
- Add wake word detection threshold setting
- Update documentation with new options

Fixes #42
```

## Architecture Overview

```
src/voxcode/
├── __init__.py          # Package exports
├── __main__.py          # CLI entry point
├── ai/                  # AI integration (Ollama, OpenAI, Anthropic)
├── commands/            # Voice command parsing and registry
├── core/                # Core engine, config, events
├── ide/                 # IDE adapters (VS Code, JetBrains, etc.)
├── intelligence/        # Code context analysis
├── ui/                  # Terminal UI components
└── voice/               # Voice recording, transcription, TTS
```

### Key Components

- **VoxEngine** (`core/engine.py`): Main orchestrator
- **EventBus** (`core/events.py`): Pub/sub event system
- **VoiceRecorder** (`voice/recorder.py`): Audio capture
- **Transcriber** (`voice/transcriber.py`): Whisper integration
- **CommandParser** (`commands/parser.py`): Natural language parsing
- **AIAssistant** (`ai/assistant.py`): LLM integration

## Testing Guidelines

- Write tests for new functionality
- Use pytest fixtures for common setups
- Mock external services (APIs, audio devices)
- Aim for meaningful coverage, not 100%

### Test Structure

```python
# tests/test_feature.py
import pytest
from voxcode.module import Feature

@pytest.fixture
def feature():
    return Feature()

def test_feature_does_something(feature):
    result = feature.do_something()
    assert result == expected
```

## Need Help?

- Check the [README](README.md) for documentation
- Open an issue for questions
- Join discussions on GitHub

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
