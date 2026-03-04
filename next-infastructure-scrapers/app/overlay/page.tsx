"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Declare the desktop bridge injected by Electron preload
declare global {
  interface Window {
    voxcodeDesktop?: {
      hide:      () => void;
      show:      () => void;
      resize:    (w: number, h: number) => void;
      quit:      () => void;
      isDesktop: boolean;
    };
  }
}

type VoxMode = "idle" | "listening" | "processing" | "done";

// Web Speech API types declared globally in types/speech.d.ts

const MODE_COLOR: Record<VoxMode, string> = {
  idle:       "bg-slate-600",
  listening:  "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]",
  processing: "bg-violet-400 animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.9)]",
  done:       "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]",
};
const MODE_LABEL: Record<VoxMode, string> = {
  idle: "Ready", listening: "Listening", processing: "Processing", done: "Done",
};
const MODE_TEXT: Record<VoxMode, string> = {
  idle: "text-slate-400", listening: "text-cyan-300",
  processing: "text-violet-300", done: "text-emerald-300",
};

// Waveform bars
function WaveBar({ active, i }: { active: boolean; i: number }) {
  const h = [3, 5, 8, 5, 10, 7, 4, 9, 6, 3][i % 10];
  return (
    <span
      className="w-0.5 rounded-full transition-all duration-200"
      style={{
        height: active ? `${h * 2}px` : "3px",
        background: active
          ? `rgba(34,211,238,${0.5 + (i % 3) * 0.2})`
          : "rgba(100,116,139,0.5)",
        animation: active
          ? `overlayWave ${0.6 + i * 0.07}s ease-in-out ${i * 60}ms infinite alternate`
          : "none",
      }}
    />
  );
}

export default function OverlayPage() {
  const [mode, setMode]           = useState<VoxMode>("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim]     = useState("");
  const [expanded, setExpanded]   = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const recogRef = useRef<SpeechRecognitionInstance | null>(null);
  const modeRef  = useRef<VoxMode>("idle");
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Detect desktop environment
  useEffect(() => {
    setIsDesktop(!!window.voxcodeDesktop);
  }, []);

  // Ctrl+Shift+V global toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "V") {
        e.preventDefault();
        setMode(m => m === "listening" ? "idle" : "listening");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Resize overlay when expanded/collapsed
  useEffect(() => {
    window.voxcodeDesktop?.resize(520, expanded ? 200 : 58);
  }, [expanded]);

  const stopSTT = useCallback(() => {
    if (recogRef.current) {
      recogRef.current.onend = null; recogRef.current.onresult = null;
      try { recogRef.current.abort(); } catch { /* ignore */ }
      recogRef.current = null;
    }
    setInterim("");
  }, []);

  const startSTT = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    stopSTT();
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    recogRef.current = r;
    r.onresult = (e) => {
      let fin = "", intm = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t; else intm += t;
      }
      if (fin) {
        setTranscript(p => p ? `${p}\n${fin.trim()}` : fin.trim());
        setInterim("");
      } else setInterim(intm);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed") setMode("idle");
    };
    r.onend = () => {
      setInterim("");
      if (modeRef.current === "listening")
        setTimeout(() => { if (modeRef.current === "listening") startSTT(); }, 150);
    };
    try { r.start(); } catch { /* ignore */ }
  }, [stopSTT]);

  useEffect(() => {
    if (mode === "listening") { startSTT(); setExpanded(true); }
    else { stopSTT(); if (mode === "idle") { setTranscript(""); setInterim(""); } }
    return stopSTT;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; }
        body { background: transparent !important; overflow: hidden; user-select: none; }
        @keyframes overlayWave {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
      `}</style>

      <div className="flex h-screen flex-col items-center justify-start gap-0 p-0">
        {/* ── Main pill bar ─────────────────────────────────────────────── */}
        <div
          className="mt-0 flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-700/70 bg-slate-950/90 px-4 py-2 backdrop-blur-2xl"
          style={{
            height: "58px",
            boxShadow: mode === "listening"
              ? "0 0 30px rgba(34,211,238,0.25), 0 8px 32px rgba(0,0,0,0.6)"
              : "0 8px 32px rgba(0,0,0,0.6)",
            borderColor: mode === "listening" ? "rgba(34,211,238,0.4)"
              : mode === "processing" ? "rgba(139,92,246,0.4)"
              : "rgba(51,65,85,0.7)",
            transition: "border-color 0.3s, box-shadow 0.3s",
          }}
        >
          {/* Brand */}
          <button
            type="button"
            onClick={() => setMode(m => m === "listening" ? "idle" : "listening")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-950 text-sm font-black"
              style={{ background: "linear-gradient(135deg,#22d3ee,#0ea5e9)", boxShadow: "0 0 16px rgba(34,211,238,0.5)" }}
            >
              V
            </span>
            <span className="text-xs font-bold text-slate-100 tracking-tight">VoxCode</span>
          </button>

          {/* Waveform */}
          <div className="flex items-center gap-[2px]" style={{ height: "20px", width: "80px" }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <WaveBar key={i} active={mode === "listening"} i={i} />
            ))}
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${MODE_COLOR[mode]}`} />
            <span className={`text-[11px] font-medium ${MODE_TEXT[mode]}`}>{MODE_LABEL[mode]}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="rounded-lg p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
              title="Expand / collapse"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={expanded ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
              </svg>
            </button>
            {isDesktop && (
              <button
                type="button"
                onClick={() => window.voxcodeDesktop?.hide()}
                className="rounded-lg p-1 text-slate-600 hover:text-slate-400 hover:bg-slate-800/60 transition-colors"
                title="Hide (Ctrl+Shift+V to show)"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Expanded transcript panel ─────────────────────────────────── */}
        {expanded && (
          <div
            className="mt-1 w-full flex-1 overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/90 p-3 font-mono text-[11px] backdrop-blur-2xl"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-cyan-400/80">// Live transcript</span>
              {(transcript || interim) && (
                <button
                  type="button"
                  onClick={() => { setTranscript(""); setInterim(""); }}
                  className="text-[10px] text-slate-600 hover:text-slate-400"
                >
                  clear
                </button>
              )}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "110px" }}>
              {!transcript && !interim && (
                <span className="text-slate-600 italic">
                  {mode === "listening" ? "Listening…" : "Click V or press Ctrl+Shift+V to start"}
                </span>
              )}
              {transcript && <pre className="whitespace-pre-wrap text-slate-100">{transcript}</pre>}
              {interim && (
                <span className="text-cyan-300/80">
                  {transcript ? "\n" : ""}
                  {interim}
                  <span className="ml-0.5 inline-block h-[10px] w-0.5 animate-pulse rounded-full bg-cyan-400 align-text-bottom" />
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
