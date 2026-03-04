"use client";

import { useState, useEffect, useCallback } from "react";

interface HintData {
  title: string;
  badge: string;
  severity: "error" | "warning";
  file: string;
  bad: string;
  good: string;
  hint: string;
}

const HINTS: HintData[] = [
  {
    title: "Type Mismatch",
    badge: "TS2345",
    severity: "error",
    file: "src/api/auth/route.ts:47",
    bad: "const id = req.userId;",
    good: "const id = req.user.id;",
    hint: "Property 'userId' doesn't exist on Request. VoxCode scanned 3 references — all patched automatically.",
  },
  {
    title: "Stale Closure",
    badge: "react-hooks/exhaustive-deps",
    severity: "warning",
    file: "src/components/DataFeed.tsx:31",
    bad: "useEffect(() => { load() }, [])",
    good: "useEffect(() => { load() }, [load])",
    hint: "load() is defined outside this effect but missing from deps. Wrap with useCallback to prevent stale data bugs.",
  },
  {
    title: "Unhandled Promise",
    badge: "no-floating-promises",
    severity: "error",
    file: "src/workers/sync.ts:14",
    bad: "db.save(payload)",
    good: "await db.save(payload)",
    hint: "Promise returned from db.save() is floating unhandled. Silent data loss risk detected. VoxCode added await.",
  },
  {
    title: "Undefined Property",
    badge: "TS2339",
    severity: "error",
    file: "src/lib/billing.ts:88",
    bad: "total += item.amt",
    good: "total += item.amount",
    hint: "Property 'amt' does not exist on LineItem. The correct field is 'amount'. 4 usages updated in this file.",
  },
];

export function GhostHint() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [idx, setIdx] = useState(0);
  const [applied, setApplied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      setApplied(false);
    }, 420);
  }, []);

  const applyFix = useCallback(() => {
    setApplied(true);
    setTimeout(() => {
      dismiss();
      setTimeout(() => setIdx((i) => (i + 1) % HINTS.length), 500);
    }, 1100);
  }, [dismiss]);

  // First appearance — 14s after load
  useEffect(() => {
    if (dismissed) return;
    const t = setTimeout(() => setVisible(true), 14000);
    return () => clearTimeout(t);
  }, [dismissed]);

  // Cycle every 28s after each dismiss
  useEffect(() => {
    if (dismissed || visible) return;
    const t = setTimeout(() => setVisible(true), 28000);
    return () => clearTimeout(t);
  }, [visible, dismissed]);

  // Auto-dismiss after 15s
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(dismiss, 15000);
    return () => clearTimeout(t);
  }, [visible, dismiss]);

  // Tab = apply fix
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Tab" && !applied) {
        e.preventDefault();
        applyFix();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, applied, applyFix]);

  if (!visible && !exiting) return null;

  const hint = HINTS[idx];
  const isError = hint.severity === "error";
  const accentColor = isError ? "#ef4444" : "#fbbf24";

  return (
    <div
      className="fixed right-0 top-[28%] z-[65] w-[340px] max-w-[calc(100vw-12px)]"
      style={{
        animation: exiting
          ? "ghostOut 0.42s cubic-bezier(0.4,0,1,1) both"
          : "ghostIn 0.5s cubic-bezier(0.22,1,0.36,1) both",
      }}
    >
      {/* Main panel */}
      <div
        className="rounded-l-2xl border-l border-t border-b bg-slate-950/97 p-4 shadow-2xl backdrop-blur-xl"
        style={{
          borderColor: "rgba(51,65,85,0.8)",
          boxShadow: `0 0 50px ${isError ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.1)"}, 0 20px 60px rgba(0,0,0,0.55)`,
        }}
      >
        {/* Header row */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="shrink-0 inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold"
              style={{
                background: `${accentColor}18`,
                color: accentColor,
                border: `1px solid ${accentColor}35`,
              }}
            >
              {isError ? "ERR" : "WARN"} · {hint.badge}
            </span>
            <span className="truncate text-[10px] font-semibold text-cyan-400">
              VoxCode detected
            </span>
          </div>
          <button
            onClick={() => { setDismissed(true); dismiss(); }}
            className="shrink-0 text-slate-600 hover:text-slate-300 transition-colors text-base leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>

        {/* File path */}
        <p className="mb-2 font-mono text-[10px] text-slate-600">{hint.file}</p>

        {/* Title */}
        <p className="mb-3 text-sm font-bold text-slate-100">{hint.title}</p>

        {/* Diff */}
        <div className="mb-3 space-y-1 rounded-xl border border-slate-800/60 bg-slate-900/80 p-3 font-mono text-[11px]">
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-red-400">−</span>
            <span
              className="text-red-300/80 transition-all duration-500"
              style={{
                textDecoration: applied ? "line-through" : "none",
                opacity: applied ? 0.4 : 1,
              }}
            >
              {hint.bad}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-emerald-400">+</span>
            <span
              className="transition-all duration-500"
              style={{
                color: applied ? "#34d399" : "rgba(52,211,153,0.5)",
                fontWeight: applied ? 600 : 400,
              }}
            >
              {hint.good}
            </span>
          </div>
        </div>

        {/* AI hint */}
        <p className="mb-4 text-[11px] leading-relaxed text-slate-400">
          <span className="font-semibold text-cyan-400">AI: </span>
          {hint.hint}
        </p>

        {/* CTA */}
        {applied ? (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <span className="text-base">✓</span>
            Fix applied — 0 errors remaining
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={applyFix}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-950 transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #22d3ee, #0ea5e9)",
                boxShadow: "0 0 18px rgba(34,211,238,0.45)",
              }}
            >
              Apply fix
            </button>
            <span className="text-[10px] text-slate-600">
              or press{" "}
              <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 font-mono text-[10px] text-slate-400">
                Tab
              </kbd>
            </span>
          </div>
        )}
      </div>

      {/* Edge accent bar */}
      <div
        className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full"
        style={{ background: `linear-gradient(180deg, transparent, ${accentColor}, transparent)` }}
      />

      <style>{`
        @keyframes ghostIn {
          from { opacity: 0; transform: translateX(105%) scale(0.96); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes ghostOut {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(105%) scale(0.96); }
        }
      `}</style>
    </div>
  );
}
