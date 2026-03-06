"use client";

import { useState, useEffect, useCallback, useRef } from "react";

declare global {
  interface Window {
    voxcodeDesktop?: {
      hide:      () => void;
      show:      () => void;
      resize:    (w: number, h: number) => void;
      quit:      () => void;
      type:      (text: string) => void;
      onToggle:  (cb: () => void) => (() => void);
      isDesktop: boolean;
    };
  }
}

type VoxMode = "idle" | "listening" | "processing" | "done";

const MODE_DOT: Record<VoxMode, string> = {
  idle:       "bg-slate-600",
  listening:  "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]",
  processing: "bg-violet-400 animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.9)]",
  done:       "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]",
};
const MODE_LABEL: Record<VoxMode, string> = {
  idle: "Ready", listening: "Listening…", processing: "Processing", done: "Typed ✓",
};
const MODE_TEXT: Record<VoxMode, string> = {
  idle: "text-slate-400", listening: "text-cyan-300",
  processing: "text-violet-300", done: "text-emerald-300",
};
const BAR_GLOW: Record<VoxMode, string> = {
  idle:       "rgba(51,65,85,0.7)",
  listening:  "rgba(34,211,238,0.5)",
  processing: "rgba(139,92,246,0.5)",
  done:       "rgba(52,211,153,0.4)",
};

// ── Live waveform bars ────────────────────────────────────────────────────────
const BAR_HEIGHTS = [3, 5, 8, 5, 10, 7, 4, 9, 6, 3, 7, 5, 8, 4, 9];

function WaveBar({ active, i }: { active: boolean; i: number }) {
  const h = BAR_HEIGHTS[i % BAR_HEIGHTS.length];
  return (
    <span
      className="w-[2px] rounded-full transition-all duration-150"
      style={{
        height: active ? `${h * 2.2}px` : "3px",
        background: active
          ? `rgba(34,211,238,${0.45 + (i % 4) * 0.14})`
          : "rgba(100,116,139,0.4)",
        animation: active
          ? `overlayWave ${0.5 + i * 0.06}s ease-in-out ${i * 55}ms infinite alternate`
          : "none",
      }}
    />
  );
}

// ── Typing feedback flash ─────────────────────────────────────────────────────
function TypedFlash({ text }: { text: string }) {
  return (
    <div
      className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-emerald-400/30 bg-slate-950/90 px-3 py-0.5 text-[10px] text-emerald-300"
      style={{ animation: "typedFlash 1.8s ease-out forwards" }}
    >
      ✓ &quot;{text.length > 40 ? text.slice(0, 40) + "…" : text}&quot; typed
    </div>
  );
}

// ── Main overlay ──────────────────────────────────────────────────────────────
export default function OverlayPage() {
  const [mode,        setMode]       = useState<VoxMode>("idle");
  const [transcript,  setTranscript] = useState("");
  const [interim,     setInterim]    = useState("");
  const [expanded,    setExpanded]   = useState(false);
  const [autoType,    setAutoType]   = useState(true);   // auto-type toggle
  const [isDesktop,   setIsDesktop]  = useState(false);
  const [typedFlash,  setTypedFlash] = useState<string | null>(null);

  const recogRef  = useRef<SpeechRecognitionInstance | null>(null);
  const modeRef   = useRef<VoxMode>("idle");
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // ── Detect desktop env ─────────────────────────────────────────────────────
  useEffect(() => { setIsDesktop(!!window.voxcodeDesktop); }, []);

  // ── Resize overlay when expanded/collapsed ────────────────────────────────
  useEffect(() => {
    window.voxcodeDesktop?.resize(540, expanded ? 210 : 62);
  }, [expanded]);

  // ── Global toggle from Electron globalShortcut (Ctrl+Shift+V) ─────────────
  useEffect(() => {
    if (!window.voxcodeDesktop) return;
    const cleanup = window.voxcodeDesktop.onToggle(() => {
      setMode(m => m === "listening" ? "idle" : "listening");
    });
    return cleanup;
  }, []);

  // ── Also handle Ctrl+Shift+V from within the overlay window ───────────────
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

  // ── Speech recognition ─────────────────────────────────────────────────────
  const stopSTT = useCallback(() => {
    if (recogRef.current) {
      recogRef.current.onend    = null;
      recogRef.current.onresult = null;
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
    r.continuous      = true;
    r.interimResults  = true;
    r.lang            = "en-US";
    recogRef.current  = r;

    r.onresult = (e: SpeechRecognitionEvent) => {
      let fin = "", intm = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t; else intm += t;
      }

      if (fin) {
        const trimmed = fin.trim();
        setTranscript(p => p ? `${p} ${trimmed}` : trimmed);
        setInterim("");

        // ── AUTO-TYPE: send finalized text to main → paste into focused app ──
        if (autoType && window.voxcodeDesktop) {
          window.voxcodeDesktop.type(trimmed);
          setTypedFlash(trimmed);
          setTimeout(() => setTypedFlash(null), 2000);
          setMode("done");
          // Return to listening after a brief "done" state
          setTimeout(() => {
            if (modeRef.current === "done") setMode("listening");
          }, 1200);
        }
      } else {
        setInterim(intm);
      }
    };

    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "not-allowed") setMode("idle");
    };

    r.onend = () => {
      setInterim("");
      if (modeRef.current === "listening" || modeRef.current === "done") {
        setTimeout(() => {
          if (modeRef.current === "listening" || modeRef.current === "done") startSTT();
        }, 150);
      }
    };

    try { r.start(); } catch { /* ignore */ }
  }, [stopSTT, autoType]);

  useEffect(() => {
    if (mode === "listening") {
      startSTT();
      setExpanded(true);
    } else if (mode === "idle") {
      stopSTT();
      setTranscript("");
      setInterim("");
    }
    return stopSTT;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const isActive = mode === "listening" || mode === "done";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; }
        body {
          background: transparent !important;
          overflow: hidden;
          user-select: none;
          -webkit-user-select: none;
        }
        /* Drag the entire bar — individual buttons override with no-drag */
        .drag-region  { -webkit-app-region: drag; }
        .no-drag      { -webkit-app-region: no-drag; }

        @keyframes overlayWave {
          from { transform: scaleY(0.25); }
          to   { transform: scaleY(1); }
        }
        @keyframes typedFlash {
          0%   { opacity: 0; transform: translateX(-50%) translateY(4px); }
          15%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          75%  { opacity: 1; }
          100% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
        }
        @keyframes barPulse {
          0%, 100% { box-shadow: 0 0 16px rgba(34,211,238,0.3); }
          50%       { box-shadow: 0 0 32px rgba(34,211,238,0.6), 0 0 8px rgba(139,92,246,0.3); }
        }
      `}</style>

      <div className="relative flex h-screen flex-col items-center justify-start gap-0 p-0">

        {/* ── Main pill bar — draggable ──────────────────────────────────── */}
        <div
          className="drag-region mt-0 flex w-full items-center justify-between gap-2 rounded-2xl border bg-slate-950/88 px-4 py-2 backdrop-blur-2xl"
          style={{
            height: "62px",
            borderColor: BAR_GLOW[mode],
            boxShadow: isActive
              ? `0 0 28px ${BAR_GLOW[mode]}, 0 8px 32px rgba(0,0,0,0.65)`
              : "0 8px 32px rgba(0,0,0,0.65)",
            transition: "border-color 0.25s, box-shadow 0.25s",
            animation: mode === "listening" ? "barPulse 2s ease-in-out infinite" : "none",
          }}
        >
          {/* Brand + mic toggle */}
          <button
            type="button"
            className="no-drag flex items-center gap-2 cursor-pointer"
            onClick={() => setMode(m => m === "listening" ? "idle" : "listening")}
            title="Click or Ctrl+Shift+V to toggle voice"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-950 text-sm font-black shrink-0"
              style={{
                background: isActive
                  ? "linear-gradient(135deg,#22d3ee,#0ea5e9)"
                  : "linear-gradient(135deg,#475569,#1e293b)",
                boxShadow: isActive ? "0 0 18px rgba(34,211,238,0.7)" : "none",
                transition: "all 0.3s",
              }}
            >
              {/* Mic icon */}
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 16a7 7 0 0 0 7-7h-2a5 5 0 0 1-10 0H5a7 7 0 0 0 7 7zm-1 3h2v2h-2v-2z"/>
              </svg>
            </span>
            <span className="text-xs font-bold text-slate-100 tracking-tight">VoxCode</span>
          </button>

          {/* Live waveform */}
          <div className="no-drag flex items-center gap-[2px]" style={{ height: "22px", width: "90px" }}>
            {Array.from({ length: 15 }).map((_, i) => (
              <WaveBar key={i} active={mode === "listening"} i={i} />
            ))}
          </div>

          {/* Status pill */}
          <div className="no-drag flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full shrink-0 ${MODE_DOT[mode]}`} />
            <span className={`text-[11px] font-medium min-w-[60px] ${MODE_TEXT[mode]}`}>
              {MODE_LABEL[mode]}
            </span>
          </div>

          {/* Auto-type + expand + hide controls */}
          <div className="no-drag flex items-center gap-0.5">
            {/* Auto-type toggle */}
            <button
              type="button"
              onClick={() => setAutoType(v => !v)}
              className={`rounded-lg px-1.5 py-1 text-[9px] font-bold transition-colors ${
                autoType
                  ? "text-cyan-300 bg-cyan-400/15 border border-cyan-400/30"
                  : "text-slate-600 hover:text-slate-400 border border-transparent"
              }`}
              title={autoType ? "Auto-type ON — spoken text types into your app" : "Auto-type OFF"}
            >
              TYPE
            </button>

            {/* Expand panel */}
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="rounded-lg p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
              title="Expand / collapse transcript"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={expanded ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
              </svg>
            </button>

            {/* Hide (desktop only) */}
            {isDesktop && (
              <button
                type="button"
                onClick={() => window.voxcodeDesktop?.hide()}
                className="rounded-lg p-1 text-slate-600 hover:text-slate-400 hover:bg-slate-800/60 transition-colors"
                title="Hide  (Ctrl+Shift+V to show again)"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Typed-text flash badge ─────────────────────────────────────── */}
        {typedFlash && <TypedFlash text={typedFlash} />}

        {/* ── Expanded transcript panel ──────────────────────────────────── */}
        {expanded && (
          <div
            className="no-drag mt-1 w-full flex-1 overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/90 p-3 font-mono text-[11px] backdrop-blur-2xl"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.55)" }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-cyan-400/70 text-[10px]">
                // live transcript
                {autoType && (
                  <span className="ml-2 text-emerald-400/70">· auto-typing ON</span>
                )}
              </span>
              {(transcript || interim) && (
                <button
                  type="button"
                  onClick={() => { setTranscript(""); setInterim(""); }}
                  className="text-[10px] text-slate-600 hover:text-slate-400 cursor-pointer"
                >
                  clear
                </button>
              )}
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: "120px" }}>
              {!transcript && !interim && (
                <span className="text-slate-600 italic">
                  {mode === "listening"
                    ? "Speak now — text will type into your active app…"
                    : "Click the mic or press Ctrl+Shift+V to start"}
                </span>
              )}
              {transcript && (
                <pre className="whitespace-pre-wrap break-words text-slate-100">{transcript}</pre>
              )}
              {interim && (
                <span className="text-cyan-300/70 italic">
                  {transcript ? " " : ""}
                  {interim}
                  {/* blinking cursor */}
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
