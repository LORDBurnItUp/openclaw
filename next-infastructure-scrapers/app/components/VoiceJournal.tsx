"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface VoiceEntry {
  id: string;
  timestamp: number;
  text: string;
  wordCount: number;
  duration: number;
  processed?: string;
}

// Uses global SpeechRecognitionInstance / SpeechRecognitionEvent from types/speech.d.ts

const STORAGE_KEY = "vj_entries";

function loadEntries(): VoiceEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as VoiceEntry[];
  } catch {
    return [];
  }
}

function saveEntries(entries: VoiceEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export function VoiceJournal() {
  const [entries, setEntries] = useState<VoiceEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [search, setSearch] = useState("");
  const [supported, setSupported] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copyId, setCopyId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const startTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentSessionTextRef = useRef<string>("");
  const pulseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fakeDataRef = useRef<number[]>(Array.from({ length: 20 }, () => 0));

  // Load entries from localStorage on mount
  useEffect(() => {
    const stored = loadEntries();
    setEntries(stored);
  }, []);

  // Check Web Speech API support
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !("SpeechRecognition" in window) &&
      !("webkitSpeechRecognition" in window)
    ) {
      setSupported(false);
    }
  }, []);

  // Waveform animation
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const bars = 20;
    const barW = Math.floor((W - bars * 2) / bars);

    ctx.clearRect(0, 0, W, H);

    let data: number[];

    if (analyserRef.current) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      const step = Math.floor(bufferLength / bars);
      data = Array.from({ length: bars }, (_, i) => {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j];
        }
        return sum / step / 255;
      });
    } else {
      // Animate fake bars when recording but no analyser
      fakeDataRef.current = fakeDataRef.current.map((v) => {
        const target = isRecording ? Math.random() * 0.8 + 0.1 : 0;
        return v + (target - v) * 0.2;
      });
      data = fakeDataRef.current;
    }

    data.forEach((v, i) => {
      const barH = Math.max(2, v * H * 0.85);
      const x = i * (barW + 2);
      const y = (H - barH) / 2;

      const gradient = ctx.createLinearGradient(0, y, 0, y + barH);
      gradient.addColorStop(0, "rgba(34,211,238,0.9)");
      gradient.addColorStop(1, "rgba(34,211,238,0.2)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 2);
      ctx.fill();
    });

    animFrameRef.current = requestAnimationFrame(drawWaveform);
  }, [isRecording]);

  // Start/stop waveform animation
  useEffect(() => {
    if (isRecording) {
      animFrameRef.current = requestAnimationFrame(drawWaveform);
    } else {
      cancelAnimationFrame(animFrameRef.current);
      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      fakeDataRef.current = Array.from({ length: 20 }, () => 0);
    }
    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRecording, drawWaveform]);

  const startAudioContext = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
    } catch {
      // Mic not available, fall back to animated fake bars
      analyserRef.current = null;
    }
  }, []);

  const stopAudioContext = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    stopAudioContext();
    setIsRecording(false);
    setInterimText("");
    currentSessionTextRef.current = "";
  }, [stopAudioContext]);

  const startRecording = useCallback(async () => {
    if (!supported) return;

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    await startAudioContext();

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    startTimeRef.current = Date.now();
    currentSessionTextRef.current = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let finalSegment = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalSegment += transcript;
        } else {
          interim += transcript;
        }
      }

      if (finalSegment.trim()) {
        const duration = (Date.now() - startTimeRef.current) / 1000;
        const text = finalSegment.trim();
        const wordCount = text.split(/\s+/).filter(Boolean).length;

        const entry: VoiceEntry = {
          id: `vj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
          text,
          wordCount,
          duration,
        };

        setEntries((prev) => {
          const updated = [entry, ...prev];
          saveEntries(updated);
          return updated;
        });

        // Reset timer for next utterance
        startTimeRef.current = Date.now();
      }

      setInterimText(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        stopRecording();
      }
    };

    recognition.onend = () => {
      // Auto-restart if still recording (continuous mode)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // Already started or permission denied
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [supported, startAudioContext, stopRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveEntries(updated);
      return updated;
    });
    setConfirmDeleteId(null);
  }, []);

  const clearAll = useCallback(() => {
    setEntries([]);
    saveEntries([]);
    setConfirmClear(false);
  }, []);

  const copyToClipboard = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyId(id);
      setTimeout(() => setCopyId(null), 1500);
    } catch {
      // Clipboard not available
    }
  }, []);

  const processEntry = useCallback(async (entry: VoiceEntry) => {
    setProcessingId(entry.id);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Summarize this voice note and extract key action items: ${entry.text}`,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const reply = data.reply || data.content || data.message || "No reply received.";

      setEntries((prev) => {
        const updated = prev.map((e) =>
          e.id === entry.id ? { ...e, processed: reply } : e
        );
        saveEntries(updated);
        return updated;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setEntries((prev) => {
        const updated = prev.map((e) =>
          e.id === entry.id
            ? { ...e, processed: `Error: ${msg}` }
            : e
        );
        saveEntries(updated);
        return updated;
      });
    } finally {
      setProcessingId(null);
    }
  }, []);

  const exportEntries = useCallback(() => {
    const all = loadEntries();
    if (all.length === 0) return;
    const lines: string[] = [];
    lines.push("=== Voice Journal Export ===");
    lines.push(`Exported: ${new Date().toLocaleString()}`);
    lines.push("");
    all.forEach((e, i) => {
      lines.push(`--- Entry ${i + 1} ---`);
      lines.push(`Date: ${formatTimestamp(e.timestamp)}`);
      lines.push(`Duration: ${formatDuration(e.duration)}`);
      lines.push(`Words: ${e.wordCount}`);
      lines.push(`Text: ${e.text}`);
      if (e.processed) {
        lines.push(`AI Summary: ${e.processed}`);
      }
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voice-journal-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      stopAudioContext();
      cancelAnimationFrame(animFrameRef.current);
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
    };
  }, [stopAudioContext]);

  const filteredEntries = entries.filter((e) =>
    search.trim()
      ? e.text.toLowerCase().includes(search.trim().toLowerCase())
      : true
  );

  const totalWords = entries.reduce((s, e) => s + e.wordCount, 0);
  const totalMinutes = entries.reduce((s, e) => s + e.duration, 0) / 60;

  if (!supported) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 text-5xl">🎙️</div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">
          Voice Journal
        </h2>
        <p className="text-slate-400 max-w-sm">
          Your browser does not support the Web Speech API. Please use Chrome,
          Edge, or another Chromium-based browser to use Voice Journal.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-50">Voice Journal</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Speak your thoughts — auto-saved &amp; AI-ready
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportEntries}
            disabled={entries.length === 0}
            className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-cyan-400 hover:border-cyan-400/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export .txt
          </button>
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Are you sure?</span>
              <button
                onClick={clearAll}
                className="rounded-full bg-red-500/20 border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/30 transition-all"
              >
                Yes, clear all
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              disabled={entries.length === 0}
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-500 hover:text-red-400 hover:border-red-400/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400">{entries.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Total entries</div>
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 text-center">
          <div className="text-2xl font-bold text-violet-400">
            {totalWords.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Total words</div>
        </div>
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {totalMinutes.toFixed(1)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Minutes recorded</div>
        </div>
      </div>

      {/* Recording section */}
      <div
        className="rounded-3xl border bg-slate-900/70 backdrop-blur p-6 flex flex-col items-center gap-4"
        style={{
          borderColor: isRecording ? "rgba(34,211,238,0.3)" : "rgba(51,65,85,0.7)",
          boxShadow: isRecording
            ? "0 0 40px rgba(34,211,238,0.1)"
            : "none",
          transition: "all 0.3s ease",
        }}
      >
        {/* Waveform canvas */}
        <div
          className="w-full rounded-2xl overflow-hidden bg-slate-950/60 flex items-center justify-center"
          style={{ height: "64px" }}
        >
          <canvas
            ref={canvasRef}
            width={480}
            height={64}
            className="w-full h-full"
            style={{ display: "block" }}
          />
        </div>

        {/* Mic button */}
        <div className="relative flex items-center justify-center">
          {isRecording && (
            <>
              <span
                className="absolute h-24 w-24 rounded-full animate-ping"
                style={{
                  background: "transparent",
                  border: "2px solid rgba(34,211,238,0.5)",
                  animationDuration: "1.2s",
                }}
              />
              <span
                className="absolute h-28 w-28 rounded-full animate-ping"
                style={{
                  background: "transparent",
                  border: "2px solid rgba(34,211,238,0.25)",
                  animationDuration: "1.8s",
                  animationDelay: "0.3s",
                }}
              />
            </>
          )}
          <button
            onClick={toggleRecording}
            className="relative z-10 h-20 w-20 rounded-full flex items-center justify-center font-bold text-3xl transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: isRecording
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "linear-gradient(135deg, #1e293b, #0f172a)",
              border: isRecording
                ? "2px solid rgba(239,68,68,0.6)"
                : "2px solid rgba(34,211,238,0.4)",
              boxShadow: isRecording
                ? "0 0 30px rgba(239,68,68,0.4)"
                : "0 0 20px rgba(34,211,238,0.1)",
            }}
            title={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? "⏹" : "🎙"}
          </button>
        </div>

        {/* Status text */}
        <div className="text-center">
          {isRecording ? (
            <p className="text-sm font-semibold text-red-400 animate-pulse">
              Recording... speak now
            </p>
          ) : (
            <p className="text-xs text-slate-500">Tap the mic to start recording</p>
          )}
        </div>

        {/* Live transcript */}
        {(isRecording || interimText) && (
          <div className="w-full rounded-2xl border border-slate-700/50 bg-slate-950/60 px-4 py-3 min-h-[48px]">
            {interimText ? (
              <p className="text-sm text-cyan-400 italic">{interimText}</p>
            ) : (
              <p className="text-xs text-slate-600 italic">Listening...</p>
            )}
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">
          🔍
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entries..."
          className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20"
        />
      </div>

      {/* Entry list */}
      <div className="flex flex-col gap-3">
        {filteredEntries.length === 0 && (
          <div className="text-center py-12 text-slate-600 text-sm">
            {search ? "No entries match your search." : "No voice entries yet. Tap the mic to start!"}
          </div>
        )}
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 flex flex-col gap-3 transition-all hover:border-slate-700/70"
          >
            {/* Entry header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-slate-500">
                  {formatTimestamp(entry.timestamp)}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-600 bg-slate-800/60 rounded-full px-2 py-0.5">
                    {entry.wordCount} words
                  </span>
                  <span className="text-[11px] text-slate-600 bg-slate-800/60 rounded-full px-2 py-0.5">
                    {formatDuration(entry.duration)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Copy button */}
                <button
                  onClick={() => copyToClipboard(entry.id, entry.text)}
                  className="rounded-lg border border-slate-700/70 bg-slate-800/60 px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-cyan-400 hover:border-cyan-400/40 transition-all"
                  title="Copy to clipboard"
                >
                  {copyId === entry.id ? "Copied!" : "Copy"}
                </button>
                {/* Delete button */}
                {confirmDeleteId === entry.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="rounded-lg bg-red-500/20 border border-red-500/40 px-2.5 py-1.5 text-[11px] text-red-400 hover:bg-red-500/30 transition-all"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(entry.id)}
                    className="rounded-lg border border-slate-700/70 bg-slate-800/60 px-2.5 py-1.5 text-[11px] text-slate-500 hover:text-red-400 hover:border-red-400/40 transition-all"
                    title="Delete entry"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Chat bubble style text */}
            <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 px-4 py-3">
              <p className="text-sm text-slate-100 leading-relaxed">{entry.text}</p>
            </div>

            {/* AI processed result */}
            {entry.processed && (
              <div className="rounded-xl bg-violet-950/30 border border-violet-500/20 px-4 py-3">
                <p className="text-[11px] font-semibold text-violet-400 mb-1.5">
                  AI Summary &amp; Action Items
                </p>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {entry.processed}
                </p>
              </div>
            )}

            {/* AI Process button */}
            <button
              onClick={() => processEntry(entry)}
              disabled={processingId === entry.id}
              className="self-start rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-400 hover:bg-violet-500/20 hover:border-violet-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {processingId === entry.id ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 animate-spin rounded-full border border-violet-400 border-t-transparent" />
                  Processing...
                </span>
              ) : entry.processed ? (
                "Re-process with AI"
              ) : (
                "AI Process"
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
