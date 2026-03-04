"""Audio recording with voice activity detection."""

from __future__ import annotations

import logging
import threading
import queue
from typing import TYPE_CHECKING
import numpy as np

try:
    import sounddevice as sd
except ImportError:
    sd = None

from voxcode.core.events import EventBus, Event, EventType

if TYPE_CHECKING:
    from voxcode.core.config import VoiceConfig


logger = logging.getLogger(__name__)


class AudioRecorder:
    """
    Records audio from microphone with voice activity detection.

    Features:
    - Continuous recording with VAD
    - Auto-stops after silence threshold
    - Noise floor calibration
    - Push-to-talk support
    """

    def __init__(self, config: VoiceConfig, bus: EventBus) -> None:
        if sd is None:
            raise ImportError("sounddevice not installed. Run: pip install sounddevice")

        self.config = config
        self.bus = bus

        self.sample_rate = config.sample_rate
        self.channels = config.channels
        self.chunk_size = int(config.sample_rate * config.chunk_duration)

        # State
        self._recording = False
        self._speaking = False
        self._audio_buffer: list[np.ndarray] = []
        self._silence_frames = 0
        self._stream: sd.InputStream | None = None
        self._thread: threading.Thread | None = None
        self._queue: queue.Queue = queue.Queue()

        # VAD parameters
        self.vad_threshold = config.vad_threshold
        self.silence_frames_threshold = int(
            config.silence_duration / config.chunk_duration
        )
        self.min_speech_frames = int(
            config.min_speech_duration / config.chunk_duration
        )

        # Noise calibration
        self._noise_floor = 0.01
        self._calibrated = False

    def start(self) -> None:
        """Start recording audio."""
        if self._recording:
            return

        logger.info("Starting audio recording...")
        self._recording = True
        self._audio_buffer = []
        self._silence_frames = 0
        self._speaking = False

        # Start stream in thread
        self._thread = threading.Thread(target=self._record_thread, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        """Stop recording audio."""
        if not self._recording:
            return

        logger.info("Stopping audio recording...")
        self._recording = False

        if self._stream:
            self._stream.stop()
            self._stream.close()
            self._stream = None

        if self._thread:
            self._thread.join(timeout=1.0)
            self._thread = None

        # Process any remaining audio
        if self._audio_buffer and len(self._audio_buffer) >= self.min_speech_frames:
            self._emit_audio()

    def _record_thread(self) -> None:
        """Recording thread."""
        try:
            self._stream = sd.InputStream(
                samplerate=self.sample_rate,
                channels=self.channels,
                dtype=np.float32,
                blocksize=self.chunk_size,
                callback=self._audio_callback
            )
            self._stream.start()

            # Calibrate noise floor
            if not self._calibrated:
                self._calibrate_noise()

            # Keep thread alive while recording
            while self._recording:
                try:
                    # Process any queued audio
                    chunk = self._queue.get(timeout=0.1)
                    self._process_chunk(chunk)
                except queue.Empty:
                    continue

        except Exception as e:
            logger.error(f"Recording error: {e}")
            self.bus.emit_sync(Event(
                type=EventType.ERROR,
                source="recorder",
                data={"error": str(e)}
            ))

    def _audio_callback(
        self,
        indata: np.ndarray,
        frames: int,
        time_info,
        status
    ) -> None:
        """Callback for audio stream."""
        if status:
            logger.warning(f"Audio status: {status}")

        # Queue audio for processing
        self._queue.put(indata.copy())

    def _process_chunk(self, chunk: np.ndarray) -> None:
        """Process an audio chunk."""
        # Calculate energy
        energy = np.sqrt(np.mean(chunk ** 2))

        # Voice activity detection
        is_speech = energy > (self._noise_floor * self.vad_threshold * 10)

        if is_speech:
            if not self._speaking:
                # Speech started
                self._speaking = True
                self.bus.emit_sync(Event(
                    type=EventType.VOICE_START,
                    source="recorder",
                    data={"energy": float(energy)}
                ))

            self._audio_buffer.append(chunk)
            self._silence_frames = 0

            # Emit voice data event
            self.bus.emit_sync(Event(
                type=EventType.VOICE_DATA,
                source="recorder",
                data={"energy": float(energy), "chunk_size": len(chunk)}
            ))

        else:
            if self._speaking:
                self._silence_frames += 1
                self._audio_buffer.append(chunk)  # Include some silence

                if self._silence_frames >= self.silence_frames_threshold:
                    # Speech ended
                    self._speaking = False
                    if len(self._audio_buffer) >= self.min_speech_frames:
                        self._emit_audio()
                    else:
                        self._audio_buffer = []

    def _emit_audio(self) -> None:
        """Emit captured audio."""
        if not self._audio_buffer:
            return

        # Concatenate all chunks
        audio = np.concatenate(self._audio_buffer)
        self._audio_buffer = []

        logger.debug(f"Emitting audio: {len(audio)} samples ({len(audio)/self.sample_rate:.2f}s)")

        self.bus.emit_sync(Event(
            type=EventType.VOICE_END,
            source="recorder",
            data={
                "audio": audio,
                "sample_rate": self.sample_rate,
                "duration": len(audio) / self.sample_rate
            }
        ))

    def _calibrate_noise(self, duration: float = 0.5) -> None:
        """Calibrate noise floor."""
        logger.info("Calibrating noise floor...")

        samples = []
        frames_needed = int(duration / self.config.chunk_duration)

        for _ in range(frames_needed):
            try:
                chunk = self._queue.get(timeout=0.2)
                energy = np.sqrt(np.mean(chunk ** 2))
                samples.append(energy)
            except queue.Empty:
                break

        if samples:
            self._noise_floor = np.mean(samples) * 1.5  # Add margin
            self._calibrated = True
            logger.info(f"Noise floor: {self._noise_floor:.6f}")

    @property
    def is_recording(self) -> bool:
        """Check if currently recording."""
        return self._recording

    @property
    def is_speaking(self) -> bool:
        """Check if speech detected."""
        return self._speaking
