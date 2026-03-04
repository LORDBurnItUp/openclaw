"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type VoxMode = "idle" | "listening" | "processing" | "done";
type CommandId = "listen" | "deep_scan" | "enhance" | "status";

function ClawIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path d="M10 2.5C7 4.5 5.5 8 7.5 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 2.5C10 6.5 9.5 10 8 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 2.5C13 4.5 14.5 8 12.5 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="2" r="1.3" fill="currentColor" />
    </svg>
  );
}

const WAVE_HEIGHTS = [3, 5, 8, 5, 10, 7, 4, 9, 6, 3, 7, 5];

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[2px] h-5 w-20" aria-hidden>
      {WAVE_HEIGHTS.map((h, i) => (
        <span
          key={i}
          className="w-0.5 rounded-full transition-all duration-200"
          style={{
            height: active ? `${h * 2}px` : "3px",
            background: active
              ? `rgba(34,211,238,${0.5 + (i % 3) * 0.2})`
              : "rgba(100,116,139,0.5)",
            animation: active ? `clawWave ${0.7 + i * 0.08}s ease-in-out infinite alternate` : "none",
            animationDelay: `${i * 70}ms`,
          }}
        />
      ))}
    </div>
  );
}

const modeLabel: Record<VoxMode, string> = {
  idle:       "Ready",
  listening:  "Listening",
  processing: "Processing",
  done:       "Done",
};
const modeColor: Record<VoxMode, string> = {
  idle:       "text-slate-400",
  listening:  "text-cyan-300",
  processing: "text-violet-300",
  done:       "text-emerald-300",
};
const modeDot: Record<VoxMode, string> = {
  idle:       "bg-slate-600",
  listening:  "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)] animate-pulse",
  processing: "bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.9)] animate-pulse",
  done:       "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]",
};
const modeBorder: Record<VoxMode, string> = {
  idle:       "border-slate-700/80",
  listening:  "border-cyan-400/60 shadow-[0_0_40px_rgba(34,211,238,0.25)]",
  processing: "border-violet-400/60 shadow-[0_0_40px_rgba(139,92,246,0.25)]",
  done:       "border-emerald-400/60 shadow-[0_0_40px_rgba(52,211,153,0.25)]",
};

const COMMANDS: { id: CommandId; label: string; sub: string; icon: string }[] = [
  { id: "listen",    label: "Start listening",   sub: "Ctrl+Shift+V · Voice → Code",      icon: "🎙" },
  { id: "deep_scan", label: "Deep scan",          sub: "AI analysis of current context",   icon: "🔍" },
  { id: "enhance",   label: "Enhance mode",       sub: "AI improvement suggestions",       icon: "⚡" },
  { id: "status",    label: "System status",      sub: "OpenClaw health check",            icon: "📊" },
];

export function ClawBar() {
  const [mode, setMode]       = useState<VoxMode>("idle");
  const [open, setOpen]       = useState(false);
  const [pos, setPos]         = useState({ x: 0, y: 0 });
  const [dragged, setDragged] = useState(false);
  const [result, setResult]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const barRef  = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, sx: 0, sy: 0, sl: 0, st: 0 });

  // Keyboard shortcut Ctrl+Shift+V
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "V") {
        e.preventDefault();
        setMode(m => (m === "listening" ? "idle" : "listening"));
      }
      if (e.key === "Escape") { setOpen(false); setResult(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    e.preventDefault();
    const rect = barRef.current!.getBoundingClientRect();
    dragRef.current = { active: true, sx: e.clientX, sy: e.clientY, sl: rect.left, st: rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    setDragged(true);
    setPos({
      x: dragRef.current.sl + (e.clientX - dragRef.current.sx),
      y: dragRef.current.st + (e.clientY - dragRef.current.sy),
    });
  }, []);

  const onPointerUp = useCallback(() => { dragRef.current.active = false; }, []);

  const toggle = () => setMode(m => (m === "listening" ? "idle" : "listening"));

  // Fire an AI command via /api/openclaw
  const runCommand = useCallback(async (id: CommandId) => {
    if (id === "listen") {
      setMode(m => (m === "listening" ? "idle" : "listening"));
      setOpen(false);
      return;
    }

    setMode("processing");
    setLoading(true);
    setResult(null);
    setOpen(false);

    const contextMap: Record<CommandId, string> = {
      listen:    "",
      deep_scan: "Scanning the OpenClaw + VoxCode platform. Check infrastructure health, code patterns, potential issues.",
      enhance:   "Suggest top 5 improvements for the OpenClaw SaaS platform — UI, performance, monetization, and reliability.",
      status:    "Report current status of: Voice Journal, Douglas AI, ClawBar, API endpoints (/api/chat, /api/douglas, /api/openclaw), and revenue tracking.",
    };

    try {
      const res = await fetch("/api/openclaw", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ command: id, context: contextMap[id] }),
      });
      const data = await res.json();
      setResult(data?.result ?? "No result returned.");
      setMode("done");
      setTimeout(() => setMode("idle"), 8000);
    } catch {
      setResult("Failed to reach OpenClaw engine. Check your connection.");
      setMode("idle");
    }
    setLoading(false);
  }, []);

  const posStyle: React.CSSProperties = dragged
    ? { position: "fixed", left: pos.x, top: pos.y }
    : { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)" };

  return (
    <div
      ref={barRef}
      className="z-50 select-none"
      style={{ ...posStyle, touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      role="presentation"
    >
      {/* AI result panel — expands upward */}
      {result && (
        <div
          data-no-drag
          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-96 max-w-[94vw] rounded-2xl border border-violet-400/30 bg-slate-950/98 shadow-2xl shadow-violet-500/10 backdrop-blur-2xl p-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-violet-400 tracking-widest uppercase">OpenClaw Result</span>
            <button
              data-no-drag
              type="button"
              onClick={() => { setResult(null); setMode("idle"); }}
              className="text-slate-600 hover:text-slate-400 text-sm transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto pr-1">
            {result}
          </div>
        </div>
      )}

      {/* Command palette — expands upward */}
      {open && !result && (
        <div
          data-no-drag
          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-80 rounded-2xl border border-slate-700/80 bg-slate-950/98 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl p-2 space-y-0.5"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
            <div className="flex items-center gap-2">
              <ClawIcon className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-100">OpenClaw Commands</span>
            </div>
            <kbd className="text-[10px] text-slate-500 bg-slate-800/80 border border-slate-700 px-1.5 py-0.5 rounded-md font-mono">
              ⌃⇧V
            </kbd>
          </div>

          {COMMANDS.map(cmd => (
            <button
              key={cmd.id}
              type="button"
              disabled={loading}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-800/70 active:bg-slate-700/80 transition-colors group disabled:opacity-40"
              onClick={() => runCommand(cmd.id)}
            >
              <span className="text-base leading-none">{cmd.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-100 group-hover:text-cyan-300 transition-colors">
                  {cmd.label}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{cmd.sub}</p>
              </div>
              <span className="text-[10px] text-slate-700 group-hover:text-slate-400 transition-colors">↵</span>
            </button>
          ))}

          <div className="border-t border-slate-800/80 mt-1 pt-1.5 px-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-600">OpenClaw · AI Engine · Sonnet</span>
            <span className={`text-[10px] font-medium ${modeColor[mode]}`}>{modeLabel[mode]}</span>
          </div>
        </div>
      )}

      {/* Main floating pill */}
      <div
        className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 border backdrop-blur-2xl cursor-grab active:cursor-grabbing transition-all duration-300 bg-slate-950/90 ${modeBorder[mode]}`}
      >
        {/* Claw icon + brand */}
        <button
          data-no-drag
          type="button"
          onClick={toggle}
          aria-label="Toggle VoxCode voice"
          className="flex items-center gap-2 cursor-pointer group shrink-0"
        >
          <span
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ${
              mode === "listening"
                ? "bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
                : mode === "processing"
                ? "bg-violet-400 text-slate-950 shadow-[0_0_12px_rgba(139,92,246,0.8)]"
                : mode === "done"
                ? "bg-emerald-400 text-slate-950 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                : "bg-slate-800/80 text-slate-300 group-hover:bg-slate-700"
            }`}
          >
            {loading ? (
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <ClawIcon className="h-4 w-4" />
            )}
          </span>
          <span className="text-xs font-semibold text-slate-100 tracking-tight hidden sm:block">
            OpenClaw
          </span>
        </button>

        <span className="h-4 w-px bg-slate-700/80 shrink-0" />
        <Waveform active={mode === "listening"} />
        <span className="h-4 w-px bg-slate-700/80 shrink-0" />

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`h-2 w-2 rounded-full transition-all duration-300 ${modeDot[mode]}`} />
          <span className={`text-xs font-medium hidden sm:block transition-colors duration-200 ${modeColor[mode]}`}>
            {modeLabel[mode]}
          </span>
        </div>

        <span className="h-4 w-px bg-slate-700/80 shrink-0" />

        <button
          data-no-drag
          type="button"
          onClick={e => { e.stopPropagation(); setOpen(v => !v); setResult(null); }}
          aria-label="Open commands"
          className="rounded-full p-1 text-slate-500 hover:bg-slate-800/80 hover:text-slate-200 transition-colors cursor-pointer shrink-0"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d={open ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
          </svg>
        </button>
      </div>
    </div>
  );
}
