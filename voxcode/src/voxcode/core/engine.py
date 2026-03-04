"""Main VoxCode engine - orchestrates all components."""

from __future__ import annotations

import asyncio
import logging
from enum import Enum, auto
from typing import TYPE_CHECKING

from voxcode.core.config import Config
from voxcode.core.events import EventBus, Event, EventType, get_event_bus

if TYPE_CHECKING:
    from voxcode.voice.transcriber import Transcriber
    from voxcode.voice.recorder import AudioRecorder
    from voxcode.commands.parser import CommandParser
    from voxcode.ai.assistant import AIAssistant
    from voxcode.ide.manager import IDEManager
    from voxcode.intelligence.analyzer import CodeAnalyzer


logger = logging.getLogger(__name__)


class VoxMode(Enum):
    """Operating modes for VoxCode."""

    IDLE = auto()           # Not listening
    LISTENING = auto()      # Listening for wake word
    DICTATION = auto()      # Transcribing to text
    COMMAND = auto()        # Processing voice command
    PROCESSING = auto()     # AI/command processing


class VoxEngine:
    """
    Main VoxCode engine that orchestrates all components.

    The engine manages:
    - Voice recording and transcription
    - Command parsing and execution
    - AI assistant interactions
    - IDE integrations
    - Mode switching and hotkeys
    """

    def __init__(self, config: Config | None = None) -> None:
        self.config = config or Config.load()
        self.config.ensure_dirs()

        self.bus = get_event_bus()
        self.mode = VoxMode.IDLE

        # Components (lazy loaded)
        self._transcriber: Transcriber | None = None
        self._recorder: AudioRecorder | None = None
        self._command_parser: CommandParser | None = None
        self._ai_assistant: AIAssistant | None = None
        self._ide_manager: IDEManager | None = None
        self._code_analyzer: CodeAnalyzer | None = None

        # State
        self._running = False
        self._current_transcription = ""

        # Setup logging
        self._setup_logging()

    def _setup_logging(self) -> None:
        """Configure logging based on config."""
        logging.basicConfig(
            level=getattr(logging, self.config.log_level),
            format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%H:%M:%S"
        )

    @property
    def transcriber(self) -> Transcriber:
        """Lazy-load transcriber."""
        if self._transcriber is None:
            from voxcode.voice.transcriber import Transcriber
            self._transcriber = Transcriber(self.config.voice, self.bus)
        return self._transcriber

    @property
    def recorder(self) -> AudioRecorder:
        """Lazy-load audio recorder."""
        if self._recorder is None:
            from voxcode.voice.recorder import AudioRecorder
            self._recorder = AudioRecorder(self.config.voice, self.bus)
        return self._recorder

    @property
    def command_parser(self) -> CommandParser:
        """Lazy-load command parser."""
        if self._command_parser is None:
            from voxcode.commands.parser import CommandParser
            self._command_parser = CommandParser(self.config, self.bus)
        return self._command_parser

    @property
    def ai_assistant(self) -> AIAssistant:
        """Lazy-load AI assistant."""
        if self._ai_assistant is None:
            from voxcode.ai.assistant import AIAssistant
            self._ai_assistant = AIAssistant(self.config.ai, self.bus)
        return self._ai_assistant

    @property
    def ide_manager(self) -> IDEManager:
        """Lazy-load IDE manager."""
        if self._ide_manager is None:
            from voxcode.ide.manager import IDEManager
            self._ide_manager = IDEManager(self.config.ide, self.bus)
        return self._ide_manager

    @property
    def code_analyzer(self) -> CodeAnalyzer:
        """Lazy-load code analyzer."""
        if self._code_analyzer is None:
            from voxcode.intelligence.analyzer import CodeAnalyzer
            self._code_analyzer = CodeAnalyzer(self.bus)
        return self._code_analyzer

    async def start(self) -> None:
        """Start the VoxCode engine."""
        if self._running:
            logger.warning("Engine already running")
            return

        logger.info("Starting VoxCode engine...")
        self._running = True

        # Initialize components
        await self._init_components()

        # Register event handlers
        self._register_handlers()

        # Emit start event
        await self.bus.emit(Event(
            type=EventType.ENGINE_START,
            source="engine",
            data={"config": self.config.model_dump()}
        ))

        # Start listening if wake word enabled
        if self.config.wake_word_enabled:
            await self.set_mode(VoxMode.LISTENING)
        else:
            await self.set_mode(VoxMode.IDLE)

        logger.info("VoxCode engine started")

    async def stop(self) -> None:
        """Stop the VoxCode engine."""
        if not self._running:
            return

        logger.info("Stopping VoxCode engine...")
        self._running = False

        # Stop recording if active
        if self._recorder:
            self.recorder.stop()

        await self.set_mode(VoxMode.IDLE)

        await self.bus.emit(Event(
            type=EventType.ENGINE_STOP,
            source="engine"
        ))

        logger.info("VoxCode engine stopped")

    async def _init_components(self) -> None:
        """Initialize all components."""
        # Load Whisper model
        logger.info(f"Loading Whisper model: {self.config.voice.model}")
        await asyncio.to_thread(self.transcriber.load_model)

        # Initialize IDE connection
        await self.ide_manager.connect()

    def _register_handlers(self) -> None:
        """Register event handlers."""

        @self.bus.subscribe(EventType.VOICE_END)
        async def on_voice_end(event: Event) -> None:
            """Handle end of voice input."""
            if self.mode not in (VoxMode.DICTATION, VoxMode.COMMAND):
                return

            audio_data = event.data.get("audio")
            if audio_data is None:
                return

            # Transcribe
            await self.bus.emit(Event(
                type=EventType.TRANSCRIPTION_START,
                source="engine"
            ))

            try:
                text = await asyncio.to_thread(
                    self.transcriber.transcribe,
                    audio_data
                )

                await self.bus.emit(Event(
                    type=EventType.TRANSCRIPTION_COMPLETE,
                    source="engine",
                    data={"text": text}
                ))

                # Handle based on mode
                await self._handle_transcription(text)

            except Exception as e:
                logger.error(f"Transcription error: {e}")
                await self.bus.emit(Event(
                    type=EventType.TRANSCRIPTION_ERROR,
                    source="engine",
                    data={"error": str(e)}
                ))

        @self.bus.subscribe(EventType.COMMAND_DETECTED)
        async def on_command(event: Event) -> None:
            """Handle detected command."""
            command = event.data.get("command")
            if command:
                await self.execute_command(command)

    async def _handle_transcription(self, text: str) -> None:
        """Handle transcribed text based on current mode."""
        if not text.strip():
            return

        # Check for wake word
        if self.mode == VoxMode.LISTENING:
            if self.config.wake_word.lower() in text.lower():
                await self.set_mode(VoxMode.COMMAND)
                # Remove wake word from text
                text = text.lower().replace(self.config.wake_word.lower(), "").strip()
                if text:
                    await self._process_command(text)
            return

        # Command mode - parse as command
        if self.mode == VoxMode.COMMAND:
            await self._process_command(text)
            return

        # Dictation mode - output text
        if self.mode == VoxMode.DICTATION:
            await self._output_dictation(text)
            return

    async def _process_command(self, text: str) -> None:
        """Process a voice command."""
        await self.set_mode(VoxMode.PROCESSING)

        try:
            # Parse the command
            result = await self.command_parser.parse(text)

            if result.requires_ai:
                # Get context from IDE
                context = await self.ide_manager.get_context()

                # Send to AI
                response = await self.ai_assistant.process(
                    text,
                    context=context,
                    command_type=result.command_type
                )

                # Execute AI response
                await self._execute_ai_response(response)
            else:
                # Execute command directly
                await self.command_parser.execute(result)

        except Exception as e:
            logger.error(f"Command processing error: {e}")
            await self.bus.emit(Event(
                type=EventType.COMMAND_ERROR,
                source="engine",
                data={"error": str(e), "text": text}
            ))

        finally:
            # Return to listening mode
            if self.config.wake_word_enabled:
                await self.set_mode(VoxMode.LISTENING)
            else:
                await self.set_mode(VoxMode.IDLE)

    async def _output_dictation(self, text: str) -> None:
        """Output dictated text to active window."""
        # Get current context to determine formatting
        context = await self.ide_manager.get_context()

        # Format text based on context (code vs prose)
        if context.is_code_file:
            text = self._format_for_code(text, context)

        # Type the text
        await self.ide_manager.type_text(text)

    def _format_for_code(self, text: str, context) -> str:
        """Format dictated text for code context."""
        # Convert spoken words to code conventions
        replacements = {
            " equals ": " = ",
            " equal ": " = ",
            " not equals ": " != ",
            " greater than ": " > ",
            " less than ": " < ",
            " plus ": " + ",
            " minus ": " - ",
            " times ": " * ",
            " divided by ": " / ",
            " open paren ": "(",
            " close paren ": ")",
            " open bracket ": "[",
            " close bracket ": "]",
            " open brace ": "{",
            " close brace ": "}",
            " colon ": ": ",
            " semicolon ": "; ",
            " comma ": ", ",
            " dot ": ".",
            " arrow ": " -> ",
            " fat arrow ": " => ",
            " new line ": "\n",
            " tab ": "\t",
        }

        for spoken, code in replacements.items():
            text = text.replace(spoken, code)

        return text

    async def _execute_ai_response(self, response) -> None:
        """Execute an AI-generated response."""
        if response.code:
            # Insert code into IDE
            await self.ide_manager.insert_code(response.code)

        if response.explanation:
            # Show explanation (could be notification, panel, etc.)
            logger.info(f"AI: {response.explanation}")

        if response.commands:
            # Execute any generated commands
            for cmd in response.commands:
                await self.ide_manager.execute_command(cmd)

    async def set_mode(self, mode: VoxMode) -> None:
        """Set the operating mode."""
        if mode == self.mode:
            return

        old_mode = self.mode
        self.mode = mode

        await self.bus.emit(Event(
            type=EventType.MODE_CHANGED,
            source="engine",
            data={"old_mode": old_mode.name, "new_mode": mode.name}
        ))

        # Handle mode transitions
        if mode == VoxMode.LISTENING:
            await self.bus.emit(Event(
                type=EventType.LISTENING_START,
                source="engine"
            ))
            self.recorder.start()

        elif mode == VoxMode.DICTATION:
            self.recorder.start()

        elif mode == VoxMode.COMMAND:
            self.recorder.start()

        elif mode == VoxMode.IDLE:
            await self.bus.emit(Event(
                type=EventType.LISTENING_STOP,
                source="engine"
            ))
            self.recorder.stop()

        logger.debug(f"Mode: {old_mode.name} -> {mode.name}")

    async def execute_command(self, command: str) -> None:
        """Execute a text command directly."""
        await self._process_command(command)

    async def toggle_listening(self) -> None:
        """Toggle listening on/off."""
        if self.mode == VoxMode.IDLE:
            await self.set_mode(VoxMode.LISTENING)
        else:
            await self.set_mode(VoxMode.IDLE)

    async def start_dictation(self) -> None:
        """Start dictation mode."""
        await self.set_mode(VoxMode.DICTATION)

    async def start_command_mode(self) -> None:
        """Start command mode."""
        await self.set_mode(VoxMode.COMMAND)

    async def cancel(self) -> None:
        """Cancel current operation."""
        self.recorder.stop()
        if self.config.wake_word_enabled:
            await self.set_mode(VoxMode.LISTENING)
        else:
            await self.set_mode(VoxMode.IDLE)
