"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "./Button";

type Mode = "idle" | "listening" | "scan" | "enhance";

// Web Speech API types are declared globally in types/speech.d.ts

// ─── Static code preview ──────────────────────────────────────────────────────
const CODE_PREVIEW = `export async function getActiveJobs(accountId: string) {
  const jobs = await db.job.findMany({
    where: { accountId, status: "active" },
    orderBy: { createdAt: "desc" },
  });
  return jobs.map((j) => ({
    id: j.id, title: j.title, createdAt: j.createdAt,
  }));
}`;

// ─── Component ────────────────────────────────────────────────────────────────
interface VoxcodeConsoleProps {
  autoStart?: boolean;
}

export function VoxcodeConsole({ autoStart }: VoxcodeConsoleProps) {
  const [mode, setMode]               = useState<Mode>("idle");
  const [finalText, setFinalText]     = useState("");
  const [interimText, setInterimText] = useState("");
  const [statusMsg, setStatusMsg]     = useState("");
  const [supported, setSupported]     = useState(true);
  const [quantumFlash, setQuantumFlash] = useState(false);

  const recogRef  = useRef<SpeechRecognitionInstance | null>(null);
  const modeRef   = useRef<Mode>("idle");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync so STT callbacks always see the current mode
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Auto-scroll transcript box as new words arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [finalText, interimText]);

  // Detect browser support on first render
  useEffect(() => {
    if (typeof window !== "undefined")
      setSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  // ── Quantum Leap: auto-start voice when intro completes ─────────────────────
  useEffect(() => {
    if (!autoStart) return;
    // Brief delay so the site fade-in animation has started
    const t = setTimeout(() => {
      setQuantumFlash(true);
      setStatusMsg("⚡ QUANTUM LEAP — Voice AI Online");
      setMode("listening");
      setTimeout(() => setQuantumFlash(false), 1800);
    }, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // ── Stop / cleanup ──────────────────────────────────────────────────────────
  const stopRecognition = useCallback(() => {
    if (recogRef.current) {
      recogRef.current.onend    = null;
      recogRef.current.onresult = null;
      recogRef.current.onerror  = null;
      recogRef.current.onstart  = null;
      try { recogRef.current.abort(); } catch { /* ignore */ }
      recogRef.current = null;
    }
    setInterimText("");
  }, []);

  // ── Start / create instance ─────────────────────────────────────────────────
  const startRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }

    stopRecognition();

    const r          = new SR();
    r.continuous     = true;   // keep listening after silence
    r.interimResults = true;   // stream partial words in real-time
    r.lang           = "en-US";
    recogRef.current = r;

    r.onstart = () => setStatusMsg("Listening…");

    r.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "", committed = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) committed += t;
        else                       interim   += t;
      }
      if (committed) {
        // Commit final words to the permanent transcript
        setFinalText(prev => {
          const line = committed.trim();
          return prev ? `${prev}\n${line}` : line;
        });
        setInterimText("");
      } else {
        // Show partial words in cyan while still speaking
        setInterimText(interim);
      }
    };

    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "not-allowed" || e.error === "permission-denied") {
        setStatusMsg("Mic blocked — click the lock icon in your browser bar and allow the microphone.");
        setMode("idle");
      } else if (e.error === "no-speech" || e.error === "aborted") {
        // normal; ignore
      } else {
        setStatusMsg(`Error: ${e.error}`);
      }
    };

    r.onend = () => {
      setInterimText("");
      // Auto-restart so it stays live — no need to click again after a pause
      if (modeRef.current === "listening") {
        setTimeout(() => {
          if (modeRef.current === "listening") startRecognition();
        }, 150);
      } else {
        setStatusMsg("");
      }
    };

    try { r.start(); }
    catch (err) { setStatusMsg("Could not access microphone."); console.error(err); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopRecognition]);

  // ── Wire mode → start / stop ────────────────────────────────────────────────
  useEffect(() => {
    if (mode === "listening") startRecognition();
    else { stopRecognition(); if (mode === "idle") setStatusMsg(""); }
    return stopRecognition;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <section
      aria-label="VoxCode live console"
      className="relative mx-auto mt-8 w-full max-w-6xl rounded-3xl border border-cyan-400/30 bg-slate-950/80 p-4 shadow-[0_0_70px_rgba(34,211,238,0.25)] backdrop-blur overflow-hidden"
    >
      {/* Quantum Leap flash overlay */}
      {quantumFlash && (
        <div
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl"
          style={{
            background: "radial-gradient(ellipse at center, rgba(34,211,238,0.35) 0%, rgba(0,255,128,0.15) 50%, transparent 80%)",
            animation: "qlFlash 1.8s ease-out forwards",
          }}
        >
          <span
            className="text-base font-black tracking-widest text-cyan-300"
            style={{ textShadow: "0 0 20px rgba(34,211,238,1), 0 0 40px rgba(0,255,128,0.8)", animation: "qlText 1.8s ease-out forwards" }}
          >
            ⚡ QUANTUM LEAP
          </span>
          <span className="mt-1 text-[10px] font-semibold tracking-[0.3em] text-emerald-300" style={{ textShadow: "0 0 12px rgba(0,255,128,0.9)" }}>
            VOICE AI ONLINE
          </span>
        </div>
      )}
      <style>{`
        @keyframes qlFlash {
          0%   { opacity: 1; }
          60%  { opacity: 0.7; }
          100% { opacity: 0; }
        }
        @keyframes qlText {
          0%   { opacity: 0; transform: scale(0.7) translateY(8px); }
          20%  { opacity: 1; transform: scale(1.08) translateY(0); }
          80%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.95); }
        }
      `}</style>
      <div className="flex flex-col gap-4 md:flex-row">

        {/* ── Left: live transcript ─────────────────────────────────────────── */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                mode === "listening" ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
              }`} />
              <span>
                Mode:{" "}
                <span className="font-semibold text-slate-100">
                  {mode === "idle" ? "Idle"
                    : mode === "listening" ? "Listening"
                    : mode === "scan"      ? "Deep scan"
                    : "Enhance"}
                </span>
              </span>
            </span>
            {(finalText || interimText) && (
              <button
                type="button"
                onClick={() => { setFinalText(""); setInterimText(""); }}
                className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
              >
                clear
              </button>
            )}
          </div>

          {/* Transcript box */}
          <div className="h-36 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-[11px] font-mono">
            <p className="text-cyan-300/90 mb-2">
              {"// Live transcript "}
              <span className="text-slate-500">
                {supported
                  ? mode === "listening"
                    ? "(speak now — words appear as you talk)"
                    : "(click Voxcode on, then speak)"
                  : "(needs Chrome or Edge)"}
              </span>
            </p>

            {!supported && (
              <p className="text-amber-400/80 text-[10px] mb-1">
                ⚠ Speech recognition not available. Switch to Chrome or Edge.
              </p>
            )}
            {statusMsg && !finalText && !interimText && (
              <p className={`text-[10px] italic ${
                statusMsg.includes("blocked") || statusMsg.includes("Error")
                  ? "text-red-400/80" : "text-slate-500"
              }`}>{statusMsg}</p>
            )}
            {!finalText && !interimText && !statusMsg && mode === "idle" && (
              <p className="text-slate-600 italic">
                Start a session to see your voice stream here.
              </p>
            )}

            {/* Committed / final words — white */}
            {finalText && (
              <pre className="whitespace-pre-wrap leading-relaxed text-slate-100">
                {finalText}
              </pre>
            )}

            {/* Partial words streaming in real-time — cyan with blinking cursor */}
            {interimText && (
              <span className="text-cyan-300/80">
                {finalText ? "\n" : ""}
                {interimText}
                <span className="ml-0.5 inline-block h-[11px] w-0.5 animate-pulse rounded-full bg-cyan-400 align-text-bottom" />
              </span>
            )}

            {/* Pulse dot when listening but no speech yet */}
            {mode === "listening" && !interimText && !statusMsg && (
              <span className="inline-flex items-center gap-1.5 text-slate-500 italic">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Listening…
              </span>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Right: code preview + controls ───────────────────────────────── */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Code preview</span>
            <span className="text-emerald-300">Auto-fix: 0 errors · Repo-aware</span>
          </div>

          <div className="h-36 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-[11px] font-mono leading-relaxed text-slate-200">
            <pre>{CODE_PREVIEW}</pre>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
            <Button
              variant={mode === "listening" ? "secondary" : "primary"}
              className="text-xs"
              onClick={() => setMode(m => (m === "listening" ? "idle" : "listening"))}
            >
              {mode === "listening" ? "Voxcode off" : "Voxcode on"}
            </Button>
            <Button
              variant={mode === "scan" ? "secondary" : "ghost"}
              className="text-xs"
              onClick={() => setMode(m => (m === "scan" ? "idle" : "scan"))}
            >
              Deep scan
            </Button>
            <Button
              variant={mode === "enhance" ? "secondary" : "ghost"}
              className="text-xs"
              onClick={() => setMode(m => (m === "enhance" ? "idle" : "enhance"))}
            >
              Enhance mode
            </Button>
          </div>
          {!supported && (
            <p className="text-[10px] text-amber-400/60">
              Live speech-to-text requires Chrome or Edge
            </p>
          )}
        </div>

      </div>
    </section>
  );
}
