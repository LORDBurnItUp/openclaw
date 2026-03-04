# VoxCode 🎤⚡

**The Ultimate Free & Open-Source Voice Coding Assistant**

> Speak code. Ship faster. No more typing. Better than WhisperFlow.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://python.org)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)]()

VoxCode is a **100% FREE**, privacy-first, locally-running voice assistant designed specifically for developers. It understands code context, executes IDE commands, and integrates with AI models for intelligent assistance.

---

## 🚀 Why VoxCode is Better Than WhisperFlow

| Feature | VoxCode | WhisperFlow |
|---------|---------|-------------|
| **Price** | FREE Forever | $15/month |
| **Privacy** | 100% Local | Cloud-based |
| **AI Integration** | Ollama, OpenAI, Claude | Limited |
| **Multi-Language** | 10+ coding languages | English only |
| **IDE Support** | VS Code, JetBrains, Neovim, System | VS Code only |
| **Open Source** | Yes, MIT License | No |
| **Offline Mode** | Yes | No |
| **Custom Wake Words** | Yes | No |
| **Session Recording** | Yes | No |
| **Voice Feedback (TTS)** | Yes | No |
| **Themes** | 5+ beautiful themes | No |
| **Real-time Audio Viz** | Yes | No |

---

## ✨ Features

### 🎙️ Voice-to-Code
- Speak naturally, get perfectly formatted code
- Smart dictation that knows code vs prose
- Automatic punctuation and capitalization
- Code-aware vocabulary boosting

### 🧠 Code Intelligence
- Understands your codebase context
- Knows current function, class, imports
- Context-aware code generation
- Error detection and fixing

### ⚡ IDE Commands
- "Create a new function" → generates function
- "Run tests" → executes test suite
- "Git commit" → stages and commits
- 50+ voice commands built-in

### 🤖 AI Assistant (100% Free Options)
- **Ollama** - Local, private, free (recommended)
- **OpenAI** - GPT-4 (requires API key)
- **Anthropic** - Claude (requires API key)

### 🌍 Multi-Language Support
- **Programming in YOUR language**
- Spanish, French, German, Portuguese
- Chinese, Japanese, Korean
- Russian, Arabic, Hindi
- Auto-translation of coding terms

### 🎨 Beautiful Terminal UI
- Live audio visualization
- Real-time transcription display
- 5 color themes: Default, Dracula, Monokai, Nord, Ocean
- Minimal mode for low-profile operation

### 📹 Session Recording
- Record voice sessions for review
- Replay for debugging/training
- Export for sharing
- Session analytics

### 🔊 Voice Feedback (TTS)
- VoxCode talks back to you
- Confirmation of commands
- Error announcements
- Multiple voice options

### 🔒 Privacy First
- Whisper runs 100% locally
- No data sent to cloud (unless you choose cloud AI)
- Your code stays on your machine

---

## 📦 One-Click Installation

### Windows
```batch
# Download and run
git clone https://github.com/yourname/voxcode
cd voxcode
install.bat
```

### macOS / Linux
```bash
# Download and run
git clone https://github.com/yourname/voxcode
cd voxcode
chmod +x install.sh
./install.sh
```

### Using pip
```bash
pip install voxcode
voxcode setup
```

---

## 🎯 Quick Start

```bash
# Start VoxCode
voxcode

# Interactive setup wizard
voxcode setup

# Test your microphone
voxcode test

# Configure settings
voxcode config --edit
```

---

## 🎤 Voice Commands

### Dictation Mode (default)
Just speak - text appears in your editor. VoxCode automatically detects code vs prose context.

### Command Mode
Say **"Hey Vox"** or press **Ctrl+Shift+C** to enter command mode:

**Code Generation:**
- "Create function calculate total that takes items and tax rate"
- "Add a class called User with name and email"
- "Write a test for the login function"

**IDE Actions:**
- "Save file"
- "Undo" / "Redo"
- "Run the tests"
- "Format code"
- "Comment this line"

**Git Commands:**
- "Git status"
- "Git commit added new feature"
- "Git push"

**AI Queries:**
- "Explain this code"
- "Fix the error on line 42"
- "Refactor this to use async await"
- "What does this function do?"

**Navigation:**
- "Go to line 100"
- "Find TODO"
- "Go to definition"

---

## ⌨️ Hotkeys

| Key | Action |
|-----|--------|
| `Ctrl+Shift+V` | Push-to-talk (hold to speak) |
| `Ctrl+Shift+Space` | Toggle listening on/off |
| `Ctrl+Shift+C` | Enter command mode |
| `Escape` | Cancel current operation |

---

## ⚙️ Configuration

Edit `~/.voxcode/config.yaml`:

```yaml
voice:
  model: "base.en"      # tiny, base, small, medium, large
  language: "en"
  device: "auto"        # cuda, cpu, mps, auto

ai:
  provider: "ollama"    # ollama (free), openai, anthropic
  model: "codellama"

hotkeys:
  push_to_talk: "ctrl+shift+v"
  toggle: "ctrl+shift+space"

wake_word: "hey vox"
wake_word_enabled: true
```

---

## 🎨 Themes

Change your theme in the config or via command:

```yaml
# In config.yaml
theme: "dracula"  # default, dracula, monokai, nord, ocean
```

---

## 🤖 Setting Up Free Local AI (Ollama)

1. **Install Ollama** (free):
   ```bash
   # Windows: Download from https://ollama.com
   # macOS: brew install ollama
   # Linux: curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Pull a coding model**:
   ```bash
   ollama pull codellama
   # Or for general use:
   ollama pull llama2
   ```

3. **Start Ollama**:
   ```bash
   ollama serve
   ```

4. **Configure VoxCode**:
   ```yaml
   ai:
     provider: "ollama"
     model: "codellama"
   ```

Now you have **100% free, 100% private AI coding assistance!**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      VoxCode Engine                         │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│   Voice     │    Code     │   Command   │       AI         │
│   Engine    │ Intelligence│   Parser    │    Assistant     │
│  (Whisper)  │  (Context)  │   (NLP)     │   (LLM/Local)    │
├─────────────┴─────────────┴─────────────┴──────────────────┤
│                    IDE Integration Layer                    │
│         VS Code  │  JetBrains  │  Neovim  │  System        │
├─────────────────────────────────────────────────────────────┤
│    Live UI  │  Session Recording  │  TTS Feedback  │ Themes │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Requirements

- **Python 3.10+**
- **FFmpeg** (for audio processing)
- **Microphone** (obviously!)
- **CUDA** (optional, for GPU acceleration)

---

## 🛠️ Development

```bash
# Clone the repo
git clone https://github.com/yourname/voxcode
cd voxcode

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black src/
ruff check src/
```

---

## 📱 Mobile & Web (Coming Soon)

While VoxCode is currently a desktop application, we're exploring:
- **PWA (Progressive Web App)** - Voice coding in your browser
- **Mobile companion app** - Control your desktop from your phone
- **VS Code Web extension** - For GitHub Codespaces

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - Use it, modify it, ship it. Free forever.

---

## 🙏 Acknowledgments

- [OpenAI Whisper](https://github.com/openai/whisper) - Speech recognition
- [Ollama](https://ollama.com) - Local LLM runtime
- [Rich](https://github.com/Textualize/rich) - Beautiful terminal UI
- [Typer](https://github.com/tiangolo/typer) - CLI framework

---

## ⭐ Star History

If you find VoxCode useful, please star the repo!

---

**Built with 🔥 by developers, for developers.**

*VoxCode - Because typing is so 2020.*
