"""Session recording and replay for VoxCode.

Features:
- Record voice sessions for later review
- Replay sessions for debugging/training
- Export sessions for sharing
- Session analytics
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np
import wave
import struct

from platformdirs import user_data_dir


@dataclass
class SessionEvent:
    """A single event in a session."""
    timestamp: float  # seconds from session start
    event_type: str
    data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "event_type": self.event_type,
            "data": self.data,
        }

    @classmethod
    def from_dict(cls, data: dict) -> SessionEvent:
        return cls(
            timestamp=data["timestamp"],
            event_type=data["event_type"],
            data=data.get("data", {}),
        )


@dataclass
class VoiceSegment:
    """A recorded voice segment."""
    start_time: float
    end_time: float
    audio_file: str  # path to audio file
    transcription: str = ""
    command_type: str = ""


@dataclass
class Session:
    """A complete VoxCode session."""
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    started_at: datetime = field(default_factory=datetime.now)
    ended_at: Optional[datetime] = None
    events: List[SessionEvent] = field(default_factory=list)
    voice_segments: List[VoiceSegment] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def duration(self) -> float:
        """Session duration in seconds."""
        if self.ended_at:
            return (self.ended_at - self.started_at).total_seconds()
        return (datetime.now() - self.started_at).total_seconds()

    @property
    def command_count(self) -> int:
        """Number of commands in session."""
        return len([e for e in self.events if e.event_type == "command"])

    @property
    def transcription_count(self) -> int:
        """Number of transcriptions."""
        return len(self.voice_segments)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "started_at": self.started_at.isoformat(),
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "duration": self.duration,
            "events": [e.to_dict() for e in self.events],
            "voice_segments": [asdict(v) for v in self.voice_segments],
            "metadata": self.metadata,
            "stats": {
                "command_count": self.command_count,
                "transcription_count": self.transcription_count,
            }
        }

    @classmethod
    def from_dict(cls, data: dict) -> Session:
        return cls(
            id=data["id"],
            started_at=datetime.fromisoformat(data["started_at"]),
            ended_at=datetime.fromisoformat(data["ended_at"]) if data.get("ended_at") else None,
            events=[SessionEvent.from_dict(e) for e in data.get("events", [])],
            voice_segments=[VoiceSegment(**v) for v in data.get("voice_segments", [])],
            metadata=data.get("metadata", {}),
        )

    def save(self, path: Path) -> None:
        """Save session to file."""
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def load(cls, path: Path) -> Session:
        """Load session from file."""
        with open(path) as f:
            data = json.load(f)
        return cls.from_dict(data)


class SessionRecorder:
    """Records VoxCode sessions for later analysis."""

    def __init__(self, sessions_dir: Path = None):
        self.sessions_dir = sessions_dir or Path(user_data_dir("voxcode")) / "sessions"
        self.sessions_dir.mkdir(parents=True, exist_ok=True)

        self._current_session: Optional[Session] = None
        self._start_time: float = 0
        self._audio_chunks: List[np.ndarray] = []

    @property
    def is_recording(self) -> bool:
        return self._current_session is not None

    def start_session(self, metadata: Dict[str, Any] = None) -> Session:
        """Start a new recording session."""
        import time

        self._current_session = Session(metadata=metadata or {})
        self._start_time = time.time()
        self._audio_chunks = []

        return self._current_session

    def end_session(self) -> Session:
        """End current session and save it."""
        if not self._current_session:
            raise RuntimeError("No active session")

        self._current_session.ended_at = datetime.now()

        # Save session
        session_path = self.sessions_dir / f"{self._current_session.id}.json"
        self._current_session.save(session_path)

        session = self._current_session
        self._current_session = None

        return session

    def record_event(self, event_type: str, data: Dict[str, Any] = None) -> None:
        """Record an event in the current session."""
        if not self._current_session:
            return

        import time
        timestamp = time.time() - self._start_time

        self._current_session.events.append(SessionEvent(
            timestamp=timestamp,
            event_type=event_type,
            data=data or {},
        ))

    def record_audio(
        self,
        audio: np.ndarray,
        sample_rate: int,
        transcription: str = "",
        command_type: str = "",
    ) -> None:
        """Record a voice segment."""
        if not self._current_session:
            return

        import time
        end_time = time.time() - self._start_time
        duration = len(audio) / sample_rate
        start_time = end_time - duration

        # Save audio to file
        audio_filename = f"{self._current_session.id}_{len(self._current_session.voice_segments)}.wav"
        audio_path = self.sessions_dir / "audio" / audio_filename
        audio_path.parent.mkdir(parents=True, exist_ok=True)

        self._save_wav(audio_path, audio, sample_rate)

        # Record segment
        self._current_session.voice_segments.append(VoiceSegment(
            start_time=start_time,
            end_time=end_time,
            audio_file=str(audio_path),
            transcription=transcription,
            command_type=command_type,
        ))

    def _save_wav(self, path: Path, audio: np.ndarray, sample_rate: int) -> None:
        """Save audio as WAV file."""
        # Normalize to 16-bit
        audio_int16 = (audio * 32767).astype(np.int16)

        with wave.open(str(path), 'w') as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(sample_rate)
            wav.writeframes(audio_int16.tobytes())

    def list_sessions(self, limit: int = 20) -> List[Dict]:
        """List recent sessions."""
        sessions = []

        for path in sorted(self.sessions_dir.glob("*.json"), reverse=True)[:limit]:
            try:
                session = Session.load(path)
                sessions.append({
                    "id": session.id,
                    "date": session.started_at.strftime("%Y-%m-%d %H:%M"),
                    "duration": f"{session.duration:.0f}s",
                    "commands": session.command_count,
                    "path": str(path),
                })
            except Exception:
                continue

        return sessions

    def get_session(self, session_id: str) -> Optional[Session]:
        """Get a session by ID."""
        path = self.sessions_dir / f"{session_id}.json"
        if path.exists():
            return Session.load(path)
        return None

    def delete_session(self, session_id: str) -> bool:
        """Delete a session and its audio files."""
        path = self.sessions_dir / f"{session_id}.json"
        if not path.exists():
            return False

        session = Session.load(path)

        # Delete audio files
        for segment in session.voice_segments:
            audio_path = Path(segment.audio_file)
            if audio_path.exists():
                audio_path.unlink()

        # Delete session file
        path.unlink()

        return True


class SessionReplayer:
    """Replay recorded sessions for debugging/training."""

    def __init__(self, session: Session):
        self.session = session
        self._current_index = 0
        self._playing = False

    async def play(self, speed: float = 1.0, callback=None) -> None:
        """
        Play session events in order.

        Args:
            speed: Playback speed multiplier
            callback: Called for each event with (event, audio_data) tuple
        """
        import asyncio

        self._playing = True
        self._current_index = 0

        prev_timestamp = 0

        for event in self.session.events:
            if not self._playing:
                break

            # Wait for appropriate time
            delay = (event.timestamp - prev_timestamp) / speed
            if delay > 0:
                await asyncio.sleep(delay)

            prev_timestamp = event.timestamp

            # Find matching audio segment if any
            audio_data = None
            for segment in self.session.voice_segments:
                if abs(segment.start_time - event.timestamp) < 0.5:
                    audio_data = self._load_audio(segment.audio_file)
                    break

            if callback:
                await callback(event, audio_data)

            self._current_index += 1

    def stop(self) -> None:
        """Stop playback."""
        self._playing = False

    def _load_audio(self, path: str) -> Optional[np.ndarray]:
        """Load audio from file."""
        try:
            with wave.open(path, 'r') as wav:
                frames = wav.readframes(wav.getnframes())
                audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32767
                return audio
        except Exception:
            return None

    @property
    def progress(self) -> float:
        """Get playback progress (0-1)."""
        if not self.session.events:
            return 1.0
        return self._current_index / len(self.session.events)


def format_session_summary(session: Session) -> str:
    """Format a session summary for display."""
    lines = [
        f"Session: {session.id}",
        f"Date: {session.started_at.strftime('%Y-%m-%d %H:%M:%S')}",
        f"Duration: {session.duration:.1f}s",
        f"Commands: {session.command_count}",
        f"Voice segments: {len(session.voice_segments)}",
        "",
        "Events:",
    ]

    for event in session.events[:10]:
        lines.append(f"  [{event.timestamp:6.1f}s] {event.event_type}: {event.data.get('text', '')[:50]}")

    if len(session.events) > 10:
        lines.append(f"  ... and {len(session.events) - 10} more events")

    return "\n".join(lines)
