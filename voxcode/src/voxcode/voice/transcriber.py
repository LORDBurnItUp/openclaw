"""Whisper-based speech transcription."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING
import numpy as np

try:
    import whisper
except ImportError:
    whisper = None

from voxcode.core.events import EventBus, Event, EventType

if TYPE_CHECKING:
    from voxcode.core.config import VoiceConfig


logger = logging.getLogger(__name__)


class Transcriber:
    """
    Speech-to-text transcription using OpenAI Whisper.

    Features:
    - Multiple model sizes (tiny to large)
    - GPU acceleration support
    - Language detection/forcing
    - Code-optimized vocabulary boost
    """

    def __init__(self, config: VoiceConfig, bus: EventBus) -> None:
        if whisper is None:
            raise ImportError(
                "openai-whisper not installed. Run: pip install openai-whisper"
            )

        self.config = config
        self.bus = bus
        self._model = None
        self._model_name = config.model

    def load_model(self, model_name: str | None = None) -> None:
        """Load the Whisper model."""
        model_name = model_name or self._model_name

        logger.info(f"Loading Whisper model: {model_name}")

        # Determine device
        device = self.config.device
        if device == "auto":
            import torch
            if torch.cuda.is_available():
                device = "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                device = "mps"
            else:
                device = "cpu"

        logger.info(f"Using device: {device}")

        self._model = whisper.load_model(model_name, device=device)
        self._model_name = model_name

        logger.info(f"Model loaded: {model_name}")

    def transcribe(
        self,
        audio: np.ndarray,
        language: str | None = None,
        prompt: str | None = None,
        code_mode: bool = False
    ) -> str:
        """
        Transcribe audio to text.

        Args:
            audio: Audio data as numpy array (float32, mono)
            language: Force language (or auto-detect)
            prompt: Initial prompt for context
            code_mode: Enable code-optimized transcription

        Returns:
            Transcribed text
        """
        if self._model is None:
            self.load_model()

        # Ensure correct format
        if audio.dtype != np.float32:
            audio = audio.astype(np.float32)

        # Normalize
        if audio.max() > 1.0:
            audio = audio / np.max(np.abs(audio))

        # Build transcription options
        options = {
            "language": language or self.config.language,
            "task": "transcribe",
            "fp16": self.config.compute_type == "float16",
        }

        # Add code-mode prompt
        if code_mode:
            code_prompt = self._get_code_prompt()
            options["initial_prompt"] = code_prompt + (prompt or "")
        elif prompt:
            options["initial_prompt"] = prompt

        logger.debug(f"Transcribing {len(audio)/self.config.sample_rate:.2f}s audio")

        # Transcribe
        result = self._model.transcribe(audio, **options)
        text = result["text"].strip()

        logger.debug(f"Transcription: {text[:100]}...")

        return text

    def transcribe_file(self, path: Path | str) -> str:
        """Transcribe from audio file."""
        if self._model is None:
            self.load_model()

        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {path}")

        logger.info(f"Transcribing file: {path}")

        result = self._model.transcribe(
            str(path),
            language=self.config.language,
            fp16=self.config.compute_type == "float16"
        )

        return result["text"].strip()

    def _get_code_prompt(self) -> str:
        """Get code-optimized prompt for better transcription."""
        return """
Programming terminology and code:
function, class, method, variable, parameter, argument, return, import, export,
async, await, def, const, let, var, if, else, elif, for, while, try, except,
catch, finally, throw, raise, lambda, arrow function, callback, promise,
interface, type, struct, enum, tuple, list, dict, array, map, set, object,
null, None, undefined, true, false, boolean, string, integer, float, number,
API, REST, HTTP, GET, POST, PUT, DELETE, JSON, XML, SQL, database, query,
git, commit, push, pull, merge, branch, repository, npm, pip, yarn,
React, Vue, Angular, Node, Python, JavaScript, TypeScript, Go, Rust,
"""

    @property
    def is_loaded(self) -> bool:
        """Check if model is loaded."""
        return self._model is not None

    @property
    def model_name(self) -> str:
        """Get current model name."""
        return self._model_name


class StreamingTranscriber:
    """
    Real-time streaming transcription.

    Uses faster-whisper for streaming support.
    """

    def __init__(self, config: VoiceConfig, bus: EventBus) -> None:
        self.config = config
        self.bus = bus
        self._model = None

    def load_model(self) -> None:
        """Load the streaming model."""
        try:
            from faster_whisper import WhisperModel
        except ImportError:
            raise ImportError(
                "faster-whisper not installed. Run: pip install faster-whisper"
            )

        device = self.config.device
        if device == "auto":
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"

        compute_type = self.config.compute_type
        if device == "cpu" and compute_type == "float16":
            compute_type = "int8"  # float16 not supported on CPU

        logger.info(f"Loading faster-whisper model: {self.config.model}")

        self._model = WhisperModel(
            self.config.model,
            device=device,
            compute_type=compute_type
        )

    def transcribe_stream(self, audio_generator):
        """
        Transcribe audio stream in real-time.

        Yields partial transcriptions as they become available.
        """
        if self._model is None:
            self.load_model()

        buffer = np.array([], dtype=np.float32)
        chunk_size = int(self.config.sample_rate * 5)  # 5 second chunks

        for chunk in audio_generator:
            buffer = np.concatenate([buffer, chunk])

            if len(buffer) >= chunk_size:
                segments, _ = self._model.transcribe(
                    buffer,
                    language=self.config.language,
                    vad_filter=True
                )

                for segment in segments:
                    yield segment.text

                # Keep last second for overlap
                buffer = buffer[-self.config.sample_rate:]
