"""Voice Activity Detection (VAD) module."""

from __future__ import annotations

import numpy as np
from collections import deque
from dataclasses import dataclass
from enum import Enum, auto


class VADState(Enum):
    """Voice activity states."""
    SILENCE = auto()
    SPEECH_START = auto()
    SPEECH = auto()
    SPEECH_END = auto()


@dataclass
class VADResult:
    """Result from VAD processing."""
    state: VADState
    energy: float
    is_speech: bool
    confidence: float


class VoiceActivityDetector:
    """
    Energy-based Voice Activity Detection.

    Features:
    - Adaptive threshold based on noise floor
    - Hysteresis for stable transitions
    - Hangover time to prevent choppy cuts
    """

    def __init__(
        self,
        sample_rate: int = 16000,
        frame_duration_ms: int = 30,
        energy_threshold: float = 0.02,
        speech_pad_ms: int = 300,
        min_speech_ms: int = 250,
    ) -> None:
        self.sample_rate = sample_rate
        self.frame_size = int(sample_rate * frame_duration_ms / 1000)

        # Thresholds
        self.energy_threshold = energy_threshold
        self.speech_pad_frames = int(speech_pad_ms / frame_duration_ms)
        self.min_speech_frames = int(min_speech_ms / frame_duration_ms)

        # Adaptive noise estimation
        self._noise_floor = energy_threshold
        self._noise_history: deque = deque(maxlen=50)

        # State tracking
        self._state = VADState.SILENCE
        self._speech_frames = 0
        self._silence_frames = 0
        self._hangover_frames = 0

    def process(self, audio_chunk: np.ndarray) -> VADResult:
        """
        Process an audio chunk and detect voice activity.

        Args:
            audio_chunk: Audio data (float32)

        Returns:
            VADResult with current state and metrics
        """
        # Calculate energy (RMS)
        energy = np.sqrt(np.mean(audio_chunk ** 2))

        # Update noise floor estimate (during silence)
        if self._state == VADState.SILENCE:
            self._noise_history.append(energy)
            if len(self._noise_history) >= 10:
                self._noise_floor = np.percentile(list(self._noise_history), 30)

        # Dynamic threshold
        threshold = max(self.energy_threshold, self._noise_floor * 3)

        # Detect speech
        is_speech = energy > threshold
        confidence = min(1.0, energy / threshold) if threshold > 0 else 0.0

        # State machine
        prev_state = self._state

        if self._state == VADState.SILENCE:
            if is_speech:
                self._speech_frames = 1
                self._state = VADState.SPEECH_START

        elif self._state == VADState.SPEECH_START:
            if is_speech:
                self._speech_frames += 1
                if self._speech_frames >= self.min_speech_frames:
                    self._state = VADState.SPEECH
            else:
                self._silence_frames += 1
                if self._silence_frames >= 3:  # Quick rejection
                    self._state = VADState.SILENCE
                    self._speech_frames = 0
                    self._silence_frames = 0

        elif self._state == VADState.SPEECH:
            if is_speech:
                self._silence_frames = 0
            else:
                self._silence_frames += 1
                if self._silence_frames >= self.speech_pad_frames:
                    self._state = VADState.SPEECH_END
                    self._hangover_frames = 0

        elif self._state == VADState.SPEECH_END:
            self._hangover_frames += 1
            if is_speech:
                # Resume speech
                self._state = VADState.SPEECH
                self._silence_frames = 0
            elif self._hangover_frames >= 5:
                # Confirmed end
                self._state = VADState.SILENCE
                self._speech_frames = 0
                self._silence_frames = 0

        return VADResult(
            state=self._state,
            energy=float(energy),
            is_speech=is_speech,
            confidence=confidence
        )

    def reset(self) -> None:
        """Reset VAD state."""
        self._state = VADState.SILENCE
        self._speech_frames = 0
        self._silence_frames = 0
        self._hangover_frames = 0
        self._noise_history.clear()

    @property
    def is_speech(self) -> bool:
        """Check if currently in speech."""
        return self._state in (VADState.SPEECH_START, VADState.SPEECH)

    @property
    def state(self) -> VADState:
        """Get current state."""
        return self._state


class WebRTCVAD:
    """
    WebRTC-based Voice Activity Detection.

    More accurate but requires webrtcvad package.
    """

    def __init__(
        self,
        sample_rate: int = 16000,
        frame_duration_ms: int = 30,
        aggressiveness: int = 2,
    ) -> None:
        try:
            import webrtcvad
        except ImportError:
            raise ImportError("webrtcvad not installed. Run: pip install webrtcvad")

        if sample_rate not in (8000, 16000, 32000, 48000):
            raise ValueError("WebRTC VAD requires sample rate of 8000, 16000, 32000, or 48000")

        if frame_duration_ms not in (10, 20, 30):
            raise ValueError("WebRTC VAD requires frame duration of 10, 20, or 30 ms")

        self.sample_rate = sample_rate
        self.frame_duration_ms = frame_duration_ms
        self.frame_size = int(sample_rate * frame_duration_ms / 1000)

        self._vad = webrtcvad.Vad(aggressiveness)

    def is_speech(self, audio_chunk: np.ndarray) -> bool:
        """
        Check if audio chunk contains speech.

        Args:
            audio_chunk: Audio data (float32 or int16)

        Returns:
            True if speech detected
        """
        # Convert to int16 if needed
        if audio_chunk.dtype == np.float32:
            audio_chunk = (audio_chunk * 32767).astype(np.int16)

        # Ensure correct size
        if len(audio_chunk) != self.frame_size:
            # Pad or truncate
            if len(audio_chunk) < self.frame_size:
                audio_chunk = np.pad(audio_chunk, (0, self.frame_size - len(audio_chunk)))
            else:
                audio_chunk = audio_chunk[:self.frame_size]

        return self._vad.is_speech(audio_chunk.tobytes(), self.sample_rate)
