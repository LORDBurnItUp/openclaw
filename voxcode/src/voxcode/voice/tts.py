"""Text-to-Speech for VoxCode voice feedback.

Provides voice feedback using:
- System TTS (pyttsx3) - offline, fast
- Edge TTS (edge-tts) - high quality, free, online
- Google TTS (gtts) - good quality, free, online
"""

from __future__ import annotations

import asyncio
import logging
import tempfile
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class TTSProvider(ABC):
    """Abstract TTS provider."""

    @abstractmethod
    async def speak(self, text: str) -> None:
        """Speak text aloud."""
        pass

    @abstractmethod
    async def speak_to_file(self, text: str, path: Path) -> None:
        """Save spoken text to audio file."""
        pass


class SystemTTS(TTSProvider):
    """
    System TTS using pyttsx3.

    - Works offline
    - Uses system voices
    - Fast, but quality varies
    """

    def __init__(self, voice: str = None, rate: int = 180):
        self.voice = voice
        self.rate = rate
        self._engine = None

    def _get_engine(self):
        if self._engine is None:
            try:
                import pyttsx3
                self._engine = pyttsx3.init()
                self._engine.setProperty('rate', self.rate)

                if self.voice:
                    voices = self._engine.getProperty('voices')
                    for v in voices:
                        if self.voice.lower() in v.name.lower():
                            self._engine.setProperty('voice', v.id)
                            break
            except ImportError:
                raise ImportError("pyttsx3 not installed. Run: pip install pyttsx3")

        return self._engine

    async def speak(self, text: str) -> None:
        """Speak text using system TTS."""
        def _speak():
            engine = self._get_engine()
            engine.say(text)
            engine.runAndWait()

        await asyncio.to_thread(_speak)

    async def speak_to_file(self, text: str, path: Path) -> None:
        """Save to audio file."""
        def _save():
            engine = self._get_engine()
            engine.save_to_file(text, str(path))
            engine.runAndWait()

        await asyncio.to_thread(_save)

    def list_voices(self) -> list:
        """List available system voices."""
        engine = self._get_engine()
        return [
            {"id": v.id, "name": v.name, "languages": v.languages}
            for v in engine.getProperty('voices')
        ]


class EdgeTTS(TTSProvider):
    """
    Microsoft Edge TTS.

    - High quality neural voices
    - Free (no API key)
    - Requires internet
    - 300+ voices in 70+ languages
    """

    # Popular voices
    VOICES = {
        "en-us-female": "en-US-JennyNeural",
        "en-us-male": "en-US-GuyNeural",
        "en-gb-female": "en-GB-SoniaNeural",
        "en-gb-male": "en-GB-RyanNeural",
        "es-female": "es-ES-ElviraNeural",
        "es-male": "es-ES-AlvaroNeural",
        "fr-female": "fr-FR-DeniseNeural",
        "fr-male": "fr-FR-HenriNeural",
        "de-female": "de-DE-KatjaNeural",
        "de-male": "de-DE-ConradNeural",
        "ja-female": "ja-JP-NanamiNeural",
        "ja-male": "ja-JP-KeitaNeural",
        "zh-female": "zh-CN-XiaoxiaoNeural",
        "zh-male": "zh-CN-YunxiNeural",
    }

    def __init__(self, voice: str = "en-US-JennyNeural", rate: str = "+0%"):
        self.voice = self.VOICES.get(voice, voice)
        self.rate = rate

    async def speak(self, text: str) -> None:
        """Speak using Edge TTS."""
        try:
            import edge_tts
        except ImportError:
            raise ImportError("edge-tts not installed. Run: pip install edge-tts")

        # Create temp file
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            temp_path = Path(f.name)

        try:
            # Generate speech
            communicate = edge_tts.Communicate(text, self.voice, rate=self.rate)
            await communicate.save(str(temp_path))

            # Play audio
            await self._play_audio(temp_path)

        finally:
            temp_path.unlink(missing_ok=True)

    async def speak_to_file(self, text: str, path: Path) -> None:
        """Save to audio file."""
        try:
            import edge_tts
        except ImportError:
            raise ImportError("edge-tts not installed. Run: pip install edge-tts")

        communicate = edge_tts.Communicate(text, self.voice, rate=self.rate)
        await communicate.save(str(path))

    async def _play_audio(self, path: Path) -> None:
        """Play audio file."""
        import platform
        import subprocess

        if platform.system() == "Windows":
            # Use Windows Media Player
            await asyncio.to_thread(
                subprocess.run,
                ["powershell", "-c", f"(New-Object Media.SoundPlayer '{path}').PlaySync()"],
                capture_output=True
            )
        elif platform.system() == "Darwin":
            # macOS
            await asyncio.to_thread(subprocess.run, ["afplay", str(path)], capture_output=True)
        else:
            # Linux - try various players
            for player in ["aplay", "paplay", "ffplay"]:
                try:
                    cmd = [player]
                    if player == "ffplay":
                        cmd.extend(["-nodisp", "-autoexit"])
                    cmd.append(str(path))
                    await asyncio.to_thread(subprocess.run, cmd, capture_output=True)
                    break
                except FileNotFoundError:
                    continue

    @classmethod
    async def list_voices(cls) -> list:
        """List all available Edge voices."""
        try:
            import edge_tts
        except ImportError:
            return []

        voices = await edge_tts.list_voices()
        return [
            {
                "name": v["ShortName"],
                "locale": v["Locale"],
                "gender": v["Gender"],
            }
            for v in voices
        ]


class VoiceFeedback:
    """
    High-level voice feedback manager.

    Provides contextual voice responses for VoxCode actions.
    """

    def __init__(self, provider: TTSProvider = None, enabled: bool = True):
        self.provider = provider or SystemTTS()
        self.enabled = enabled

        # Response templates
        self.responses = {
            "listening": ["I'm listening", "Go ahead", "Yes?"],
            "processing": ["Processing", "Working on it", "One moment"],
            "done": ["Done", "Complete", "Finished"],
            "error": ["Sorry, there was an error", "Something went wrong"],
            "not_understood": ["I didn't catch that", "Could you repeat that?"],
            "cancelled": ["Cancelled", "Never mind"],
        }

    async def respond(self, response_type: str, custom_text: str = None) -> None:
        """Speak a contextual response."""
        if not self.enabled:
            return

        if custom_text:
            text = custom_text
        elif response_type in self.responses:
            import random
            text = random.choice(self.responses[response_type])
        else:
            text = response_type

        try:
            await self.provider.speak(text)
        except Exception as e:
            logger.warning(f"TTS failed: {e}")

    async def speak(self, text: str) -> None:
        """Speak arbitrary text."""
        if not self.enabled:
            return

        try:
            await self.provider.speak(text)
        except Exception as e:
            logger.warning(f"TTS failed: {e}")

    async def announce_transcription(self, text: str) -> None:
        """Optionally echo back transcription for confirmation."""
        # For accessibility or hands-free confirmation
        await self.speak(f"You said: {text}")

    async def read_code(self, code: str, language: str = None) -> None:
        """Read code aloud in a developer-friendly way."""
        # Convert code symbols to words for better pronunciation
        code_words = code.replace("(", " open paren ")
        code_words = code_words.replace(")", " close paren ")
        code_words = code_words.replace("{", " open brace ")
        code_words = code_words.replace("}", " close brace ")
        code_words = code_words.replace("[", " open bracket ")
        code_words = code_words.replace("]", " close bracket ")
        code_words = code_words.replace(":", " colon ")
        code_words = code_words.replace(";", " semicolon ")
        code_words = code_words.replace("==", " equals ")
        code_words = code_words.replace("!=", " not equals ")
        code_words = code_words.replace("=>", " arrow ")
        code_words = code_words.replace("->", " arrow ")
        code_words = code_words.replace("\n", " new line ")

        await self.speak(code_words)


# Convenience functions
_feedback: Optional[VoiceFeedback] = None


def get_voice_feedback() -> VoiceFeedback:
    """Get global voice feedback instance."""
    global _feedback
    if _feedback is None:
        # Try Edge TTS first (better quality), fall back to system
        try:
            import edge_tts
            _feedback = VoiceFeedback(EdgeTTS())
        except ImportError:
            _feedback = VoiceFeedback(SystemTTS())
    return _feedback


async def speak(text: str) -> None:
    """Speak text using global feedback instance."""
    await get_voice_feedback().speak(text)


async def respond(response_type: str) -> None:
    """Speak contextual response."""
    await get_voice_feedback().respond(response_type)
