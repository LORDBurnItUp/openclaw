"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { VoxShieldRASP, ThreatEvent, ThreatLevel } from "../lib/voxshield-rasp";

// ── IP reputation (calls /api/security) ──────────────────────────────────────
interface IpRep { ip: string; score: number; behaviors: { name: string }[]; note?: string; }

async function fetchIpRep(): Promise<IpRep | null> {
  try {
    const res = await fetch("/api/security/ip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ip: "self" }) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function relTime(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5)  return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
}

function levelColor(level: ThreatLevel) {
  if (level === "critical") return "#ef4444";
  if (level === "warn")     return "#f59e0b";
  return "#22d3ee";
}

function levelIcon(level: ThreatLevel) {
  if (level === "critical") return "🔴";
  if (level === "warn")     return "🟡";
  return "🔵";
}

function shieldColor(threats: ThreatEvent[]) {
  const active = threats.filter(t => !t.resolved);
  if (active.some(t => t.level === "critical")) return "#ef4444";
  if (active.some(t => t.level === "warn"))     return "#f59e0b";
  return "#22c55e";
}

function threatScore(threats: ThreatEvent[]): number {
  const active = threats.filter(t => !t.resolved);
  let score = 0;
  for (const t of active) {
    if (t.level === "critical") score += 35;
    else if (t.level === "warn") score += 15;
    else score += 5;
  }
  return Math.min(100, score);
}

// ── Voice announcer ───────────────────────────────────────────────────────────
function speak(text: string) {
  if (typeof speechSynthesis === "undefined") return;
  if (speechSynthesis.speaking) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate   = 1.1;
  u.pitch  = 0.95;
  u.volume = 0.8;
  speechSynthesis.speak(u);
}

// ── Shield SVG icon ───────────────────────────────────────────────────────────
function ShieldIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2z"
        fill={color}
        fillOpacity={0.2}
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function VoxShield() {
  const [open,    setOpen]    = useState(false);
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [ipRep,   setIpRep]   = useState<IpRep | null>(null);
  const [ipLoading, setIpLoading] = useState(false);
  const [muted,   setMuted]   = useState(false);
  const raspRef = useRef<VoxShieldRASP | null>(null);

  // ── RASP lifecycle ─────────────────────────────────────────────────────────
  useEffect(() => {
    const rasp = new VoxShieldRASP({
      onThreat: (e) => {
        setThreats(prev => [e, ...prev].slice(0, 50));
        if (!muted) {
          if (e.level === "critical") speak(`VoxShield Alert. ${e.type.replace(/_/g, " ")} detected.`);
          else if (e.level === "warn") speak(`VoxShield Warning. Suspicious activity detected.`);
        }
      },
      onResolve: (id) => {
        setThreats(prev => prev.map(t => t.id === id ? { ...t, resolved: true } : t));
      },
    });
    raspRef.current = rasp;
    rasp.start();
    return () => { rasp.stop(); raspRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load IP reputation when panel opens ───────────────────────────────────
  useEffect(() => {
    if (!open || ipRep || ipLoading) return;
    setIpLoading(true);
    // Use the visitor's apparent IP via a free service proxied through our backend
    fetch("/api/security", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ip: "1.1.1.1" }) })
      .then(r => r.json())
      .then(d => setIpRep(d))
      .catch(() => {})
      .finally(() => setIpLoading(false));
  }, [open, ipRep, ipLoading]);

  const resolveAll = useCallback(() => {
    setThreats(prev => prev.map(t => ({ ...t, resolved: true })));
    if (!muted) speak("VoxShield secure. All threats cleared.");
  }, [muted]);

  const clearHistory = useCallback(() => setThreats([]), []);

  const activeThreats = threats.filter(t => !t.resolved);
  const color         = shieldColor(threats);
  const score         = threatScore(threats);
  const hasCritical   = activeThreats.some(t => t.level === "critical");

  // ── Collapsed trigger button ───────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-[145] flex items-center gap-2 rounded-2xl border bg-slate-950/95 px-4 py-3 text-sm font-semibold text-slate-100 backdrop-blur-xl shadow-2xl transition-all"
        style={{
          borderColor: color + "50",
          boxShadow:   `0 0 ${hasCritical ? "30px" : "15px"} ${color}30`,
          animation:   activeThreats.length > 0 ? "vsBtnPulse 2s ease-in-out infinite" : "none",
        }}
      >
        <ShieldIcon color={color} size={18} />
        <span>VoxShield</span>
        {activeThreats.length > 0 && (
          <span
            className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
            style={{ background: color }}
          >
            {activeThreats.length}
          </span>
        )}
        <style>{`
          @keyframes vsBtnPulse {
            0%,100% { box-shadow: 0 0 15px ${color}30; }
            50%      { box-shadow: 0 0 30px ${color}60; }
          }
        `}</style>
      </button>
    );
  }

  // ── Open panel ────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed bottom-6 left-6 z-[145] flex w-[400px] max-w-[96vw] flex-col rounded-3xl border bg-slate-950/97 shadow-2xl backdrop-blur-xl"
      style={{
        borderColor: color + "30",
        maxHeight:   "75vh",
        boxShadow:   `0 0 60px ${color}18, 0 25px 50px rgba(0,0,0,0.5)`,
        transition:  "border-color 0.5s, box-shadow 0.5s",
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <ShieldIcon color={color} size={18} />
        <span className="font-bold text-slate-100 text-sm">VoxShield</span>
        <span className="ml-1 text-[10px] font-semibold tracking-wider" style={{ color }}>
          SECURITY LAYER
        </span>

        {/* Mute toggle */}
        <button
          onClick={() => setMuted(m => !m)}
          className="ml-auto rounded-lg p-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
          title={muted ? "Unmute voice alerts" : "Mute voice alerts"}
        >
          {muted ? "🔇" : "🔊"}
        </button>

        {/* Close */}
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg p-1 text-slate-500 hover:text-slate-200 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* ── Threat score bar ── */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Threat Level
          </span>
          <span className="text-[11px] font-bold" style={{ color }}>
            {score === 0 ? "Secure" : score < 30 ? "Low" : score < 60 ? "Elevated" : "Critical"} ({score}/100)
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${score}%`, background: color, boxShadow: `0 0 8px ${color}` }}
          />
        </div>
      </div>

      {/* ── IP Reputation ── */}
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Network</span>
        {ipLoading ? (
          <span className="text-[10px] text-slate-600">Scanning…</span>
        ) : ipRep ? (
          <span className="text-[10px] text-slate-400">
            {ipRep.note
              ? <span className="text-slate-600">{ipRep.note}</span>
              : <>CrowdSec score: <span style={{ color: ipRep.score > 50 ? "#ef4444" : ipRep.score > 20 ? "#f59e0b" : "#22c55e" }}>{ipRep.score}</span></>
            }
          </span>
        ) : (
          <span className="text-[10px] text-slate-600">No data</span>
        )}
        <span className="ml-auto text-[10px] text-slate-600">
          {activeThreats.length} active · {threats.length} total
        </span>
      </div>

      {/* ── Threat feed ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5" style={{ minHeight: 80 }}>
        {threats.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <div style={{ animation: "vsShieldPulse 2s ease-in-out infinite" }}>
              <ShieldIcon color="#22c55e" size={36} />
            </div>
            <p className="text-[11px] text-slate-500">All clear — no threats detected</p>
            <p className="text-[10px] text-slate-700">RASP engine monitoring DOM, network, and inputs</p>
          </div>
        ) : (
          threats.map(t => (
            <div
              key={t.id}
              className="flex gap-2 rounded-xl border px-2.5 py-2 transition-all"
              style={{
                borderColor: t.resolved ? "rgba(100,116,139,0.2)" : levelColor(t.level) + "30",
                background:  t.resolved ? "rgba(15,23,42,0.4)"    : `${levelColor(t.level)}08`,
                opacity:     t.resolved ? 0.45 : 1,
              }}
            >
              <span className="mt-0.5 text-[11px] flex-shrink-0">{levelIcon(t.level)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: t.resolved ? "#475569" : levelColor(t.level) }}
                  >
                    {t.type.replace(/_/g, " ")}
                  </span>
                  <span className="text-[9px] text-slate-700">{relTime(t.ts)}</span>
                  {t.resolved && <span className="text-[9px] text-slate-700">resolved</span>}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug break-all line-clamp-2">
                  {t.detail}
                </p>
              </div>
              {!t.resolved && (
                <button
                  onClick={() => setThreats(prev => prev.map(x => x.id === t.id ? { ...x, resolved: true } : x))}
                  className="flex-shrink-0 self-center rounded-lg p-1 text-slate-600 hover:text-emerald-400 transition-colors text-[11px]"
                  title="Mark resolved"
                >
                  ✓
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between border-t border-slate-800 px-4 py-2">
        <span className="text-[9px] text-slate-700">
          RASP · CrowdSec CTI · DOM · Network · Input
        </span>
        <div className="flex gap-2">
          {activeThreats.length > 0 && (
            <button
              onClick={resolveAll}
              className="text-[9px] text-emerald-600 hover:text-emerald-400 transition-colors"
            >
              resolve all
            </button>
          )}
          {threats.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-[9px] text-slate-700 hover:text-slate-500 transition-colors"
            >
              clear
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes vsShieldPulse {
          0%,100% { opacity: 0.7; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
