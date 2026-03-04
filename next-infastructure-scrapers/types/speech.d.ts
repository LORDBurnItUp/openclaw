// Shared Web Speech API ambient declarations — globally available, no import needed

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { readonly transcript: string; readonly confidence: number };
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult:  ((e: SpeechRecognitionEvent) => void) | null;
  onerror:   ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend:     (() => void) | null;
  onstart:   (() => void) | null;
}

// Merge into the global Window interface (ambient file — no exports needed)
interface Window {
  SpeechRecognition:       new () => SpeechRecognitionInstance;
  webkitSpeechRecognition: new () => SpeechRecognitionInstance;
}
