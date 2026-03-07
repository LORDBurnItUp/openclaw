"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { VoiceJournal } from "../components/VoiceJournal";
import { BlackHoleTransition } from "../components/BlackHoleTransition";
import { WebcamArena } from "../components/WebcamArena";

// ═══════════════════════════════════════════════════════════════════════════
// LOGIN PAGE — Black Hole → Futuristic Universe Dashboard
// Features: 10 tabs, webcam arena, terminal teleport, advanced UI
// ═══════════════════════════════════════════════════════════════════════════

type View = "login" | "warping" | "dashboard";
type Tab =
  | "home"
  | "profile"
  | "messages"
  | "friends"
  | "groups"
  | "forum"
  | "about"
  | "ai-files"
  | "mission-control"
  | "memory"
  | "settings"
  | "voice";

const TAB_DEFS: { id: Tab; label: string; icon: string; color: string }[] = [
  { id: "home",            label: "Home",            icon: "🏠", color: "#22d3ee" },
  { id: "profile",         label: "Profile",         icon: "👤", color: "#a78bfa" },
  { id: "messages",        label: "Messages",        icon: "💬", color: "#34d399" },
  { id: "friends",         label: "Friends",         icon: "👥", color: "#f59e0b" },
  { id: "groups",          label: "Groups",          icon: "🌐", color: "#f472b6" },
  { id: "forum",           label: "Forum",           icon: "📝", color: "#fb923c" },
  { id: "about",           label: "About Us",        icon: "ℹ️",  color: "#60a5fa" },
  { id: "ai-files",        label: "AI File System",  icon: "🗂️", color: "#c084fc" },
  { id: "mission-control", label: "Mission Control", icon: "🚀", color: "#22d3ee" },
  { id: "memory",          label: "Memory",          icon: "🧠", color: "#f87171" },
  { id: "voice",           label: "Voice Journal",   icon: "🎙", color: "#fbbf24" },
  { id: "settings",        label: "Settings",        icon: "⚙️", color: "#94a3b8" },
];

// ── Mock data ─────────────────────────────────────────────────────────
const MOCK_MESSAGES = [
  { from: "Douglas", text: "System check complete. All agents nominal.", ts: Date.now() - 120000, avatar: "D" },
  { from: "VoxShield", text: "14 threats neutralized in last 24h.", ts: Date.now() - 600000, avatar: "🛡" },
  { from: "OpenClaw", text: "New scrapers deployed. 3 pipelines active.", ts: Date.now() - 3600000, avatar: "🦀" },
];

const MOCK_FRIENDS = [
  { name: "Agent Douglas", status: "online", role: "AI Partner", color: "#a78bfa" },
  { name: "VoxShield", status: "online", role: "Security Agent", color: "#22d3ee" },
  { name: "OpenClaw", status: "online", role: "Scraper Engine", color: "#f59e0b" },
  { name: "Quantum Core", status: "idle", role: "Computation", color: "#34d399" },
  { name: "Neural Net", status: "offline", role: "ML Pipeline", color: "#f87171" },
];

const MOCK_GROUPS = [
  { name: "Kings From Earth", members: 12, icon: "👑", color: "#fbbf24" },
  { name: "OpenClaw Ops", members: 7, icon: "🦀", color: "#f59e0b" },
  { name: "VoxCode Beta", members: 34, icon: "🎙", color: "#22d3ee" },
  { name: "AI Research Lab", members: 19, icon: "🧪", color: "#a78bfa" },
];

const MOCK_FORUM_POSTS = [
  { title: "How to optimize Spline scene variables", author: "Douglas", replies: 7, ts: "2h ago" },
  { title: "WebRTC mesh for 10-cam arena", author: "VoxShield", replies: 12, ts: "5h ago" },
  { title: "Black hole shader techniques", author: "Quantum", replies: 23, ts: "1d ago" },
  { title: "Memory system persistence layer", author: "OpenClaw", replies: 9, ts: "2d ago" },
];

const MOCK_FILES = [
  { name: "openclaw-engine/", type: "dir", size: "—", mod: "2h ago" },
  { name: "neural-weights.bin", type: "file", size: "1.2GB", mod: "4h ago" },
  { name: "spline-scenes/", type: "dir", size: "—", mod: "6h ago" },
  { name: "memory-snapshot.json", type: "file", size: "48MB", mod: "1d ago" },
  { name: "agent-configs/", type: "dir", size: "—", mod: "2d ago" },
  { name: "voice-journal-export.txt", type: "file", size: "892KB", mod: "3d ago" },
];

const MOCK_MISSIONS = [
  { name: "Deploy Spline RT API", status: "complete", progress: 100, color: "#22c55e" },
  { name: "WebRTC Arena Integration", status: "active", progress: 45, color: "#22d3ee" },
  { name: "Memory Persistence Layer", status: "active", progress: 72, color: "#a78bfa" },
  { name: "Neural Voice Enhancement", status: "queued", progress: 0, color: "#64748b" },
];

const MOCK_MEMORY = [
  { key: "last_login", value: new Date().toISOString(), type: "timestamp" },
  { key: "agent_count", value: "7", type: "number" },
  { key: "total_commands", value: "14,291", type: "counter" },
  { key: "uptime", value: "47d 11h 32m", type: "duration" },
  { key: "threat_level", value: "LOW", type: "enum" },
  { key: "neural_health", value: "98.7%", type: "percentage" },
  { key: "spline_scene_id", value: "kMWi1sxpCPiTM5ha", type: "string" },
  { key: "voice_entries", value: "127", type: "counter" },
];

const MOCK_STATS = [
  { label: "Commands today", value: "1,284", icon: "⚡", color: "#22d3ee" },
  { label: "Sessions / month", value: "247", icon: "📡", color: "#a78bfa" },
  { label: "Errors auto-fixed", value: "3,891", icon: "🛡", color: "#34d399" },
  { label: "Files modified", value: "512", icon: "📁", color: "#f59e0b" },
  { label: "Member since", value: "Jan 2026", icon: "🗓", color: "#f472b6" },
  { label: "Next billing", value: "Apr 3", icon: "💳", color: "#94a3b8" },
];

// ── Terminal Command Engine for tab navigation ────────────────────────
function useTerminalNav(setTab: (t: Tab) => void) {
  const [termOpen, setTermOpen] = useState(false);
  const [termLines, setTermLines] = useState<{ type: string; text: string }[]>([
    { type: "dim", text: "Terminal ready. Type 'goto <tab>' to teleport." },
    { type: "dim", text: "Available: home, profile, messages, friends, groups, forum, about, ai-files, mission-control, memory" },
  ]);
  const [termInput, setTermInput] = useState("");
  const [teleporting, setTeleporting] = useState(false);

  const processCmd = useCallback((raw: string) => {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) return;

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0];
    const arg = parts.slice(1).join(" ");

    setTermLines((p) => [...p, { type: "cmd", text: raw }]);

    if (cmd === "goto" || cmd === "go" || cmd === "cd" || cmd === "teleport") {
      const tabMap: Record<string, Tab> = {};
      TAB_DEFS.forEach((t) => {
        tabMap[t.id] = t.id;
        tabMap[t.label.toLowerCase()] = t.id;
      });
      // Special aliases
      tabMap["about us"] = "about";
      tabMap["ai"] = "ai-files";
      tabMap["files"] = "ai-files";
      tabMap["ai file system"] = "ai-files";
      tabMap["mission"] = "mission-control";
      tabMap["missions"] = "mission-control";
      tabMap["mem"] = "memory";
      tabMap["msg"] = "messages";
      tabMap["settings"] = "settings";
      tabMap["voice"] = "voice";

      const target = tabMap[arg];
      if (target) {
        setTermLines((p) => [
          ...p,
          { type: "ok", text: `  ⚡ Teleporting to ${target}...` },
          { type: "dim", text: "  Engaging warp drive..." },
        ]);
        setTeleporting(true);
        setTimeout(() => {
          setTab(target);
          setTeleporting(false);
          setTermLines((p) => [...p, { type: "ok", text: `  ✓ Arrived at ${target}.` }]);
        }, 700);
      } else {
        setTermLines((p) => [
          ...p,
          { type: "err", text: `  Unknown tab: '${arg}'` },
          { type: "dim", text: `  Available: ${TAB_DEFS.map((t) => t.id).join(", ")}` },
        ]);
      }
    } else if (cmd === "help") {
      setTermLines((p) => [
        ...p,
        { type: "out", text: "  goto <tab>  — teleport to a dashboard tab" },
        { type: "out", text: "  ls          — list all tabs" },
        { type: "out", text: "  status      — system health" },
        { type: "out", text: "  clear       — clear terminal" },
        { type: "out", text: "  exit        — close terminal" },
      ]);
    } else if (cmd === "ls" || cmd === "tabs") {
      TAB_DEFS.forEach((t) => {
        setTermLines((p) => [...p, { type: "out", text: `  ${t.icon} ${t.id.padEnd(18)} ${t.label}` }]);
      });
    } else if (cmd === "status") {
      setTermLines((p) => [
        ...p,
        { type: "ok", text: "  ● ALL SYSTEMS ONLINE" },
        { type: "out", text: `  ● UPTIME: 47d 11h 32m` },
        { type: "out", text: `  ● AGENTS: 7 active` },
        { type: "out", text: `  ● MEMORY: 98.7% health` },
      ]);
    } else if (cmd === "clear" || cmd === "cls") {
      setTermLines([{ type: "dim", text: "Terminal cleared." }]);
    } else if (cmd === "exit" || cmd === "close") {
      setTermOpen(false);
    } else {
      setTermLines((p) => [
        ...p,
        { type: "err", text: `  command not found: ${cmd}` },
        { type: "dim", text: "  Type 'help' for available commands" },
      ]);
    }
  }, [setTab]);

  return { termOpen, setTermOpen, termLines, termInput, setTermInput, processCmd, teleporting };
}

// ── Settings Panel ─────────────────────────────────────────────────────
function SettingsPanel({ onSignOut }: { onSignOut: () => void }) {
  const [notifs, setNotifs] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <h3 className="text-lg font-bold text-slate-50 mb-1">Settings</h3>
      <div className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-900/70 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-200">Notifications</p>
          <p className="text-xs text-slate-500 mt-0.5">Receive activity alerts</p>
        </div>
        <button
          onClick={() => setNotifs(!notifs)}
          className="relative h-6 w-11 rounded-full transition-all duration-300"
          style={{
            background: notifs ? "linear-gradient(135deg, #22d3ee, #0ea5e9)" : "#1e293b",
            border: notifs ? "none" : "1px solid rgba(100,116,139,0.5)",
          }}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300"
            style={{ left: notifs ? "calc(100% - 22px)" : "2px" }}
          />
        </button>
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-red-400">Sign Out</p>
          <p className="text-xs text-slate-500 mt-0.5">End your current session</p>
        </div>
        <div className="flex items-center gap-2">
          {deleteConfirm && (
            <button
              onClick={() => setDeleteConfirm(false)}
              className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-all"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => { if (!deleteConfirm) { setDeleteConfirm(true); } else { onSignOut(); } }}
            className="rounded-full border border-red-500/50 bg-red-500/15 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/25 transition-all"
          >
            {deleteConfirm ? "Confirm Sign Out" : "Sign Out"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab Background Visuals ─────────────────────────────────────────────
function TabBackgrounds({ activeTab }: { activeTab: string }) {
  if (activeTab === "ai-files") {
    // Data stream / matrix rain effect
    return (
      <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-gradient-to-b from-transparent via-cyan-400 to-transparent w-[2px]"
            style={{
              left: `${(i + 1) * 5}%`,
              height: `${20 + Math.random() * 50}%`,
              top: "-50%",
              animation: `dataStreamDrop ${1.5 + Math.random() * 2}s linear ${Math.random() * 2}s infinite`
            }}
          />
        ))}
        {/* Floating hex data blocks */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`hex${i}`}
            className="absolute rounded border border-cyan-500/30 flex items-center justify-center font-mono text-[10px] text-cyan-500/60 backdrop-blur-sm"
            style={{
              left: `${Math.random() * 90}%`,
              bottom: `-50px`,
              width: 50 + Math.random() * 40,
              height: 50 + Math.random() * 40,
              animation: `dataBlockFloat ${8 + Math.random() * 6}s linear ${Math.random() * 4}s infinite`,
              boxShadow: "inset 0 0 10px rgba(34,211,238,0.1)"
            }}
          >
            0x{Math.floor(Math.random()*16777215).toString(16).padEnd(6, '0')}
          </div>
        ))}
      </div>
    );
  }

  if (activeTab === "mission-control") {
    // Holographic radar sweeping
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-40 mix-blend-screen">
        <div className="absolute rounded-full border border-cyan-500/20 w-[600px] h-[600px] flex items-center justify-center">
          <div className="absolute rounded-full border border-cyan-500/30 w-[400px] h-[400px]" />
          <div className="absolute rounded-full border border-cyan-500/40 w-[200px] h-[200px]" />
          {/* Sweeping line */}
          <div
            className="absolute w-[300px] h-[300px] origin-bottom-right right-1/2 top-1/2"
            style={{
              background: "conic-gradient(from 180deg at 100% 100%, transparent 270deg, rgba(34,211,238,0.3) 360deg)",
              animation: "radarSweep 3.5s linear infinite"
            }}
          />
          {/* Radar blips */}
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-cyan-400"
              style={{
                left: `${30 + Math.random() * 40}%`,
                top: `${30 + Math.random() * 40}%`,
                animation: `radarBlip 3.5s ${i * 0.8}s ease-out infinite`
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === "memory") {
    // Brain synapses / neural net
    return (
      <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden mix-blend-screen">
         {[...Array(15)].map((_, i) => {
           const size = 40 + Math.random() * 80;
           return (
             <div
               key={i}
               className="absolute rounded-full"
               style={{
                 left: `${Math.random() * 100}%`,
                 top: `${Math.random() * 100}%`,
                 width: size,
                 height: size,
                 background: "radial-gradient(circle, rgba(248,113,113,0.35) 0%, transparent 70%)",
                 animation: `synapsePulse ${1.5 + Math.random() * 3}s ease-in-out ${Math.random() * 2}s infinite alternate`
               }}
             />
           );
         })}
      </div>
    );
  }

  // Generic faint subtle grid background for others
  return (
    <div className="absolute inset-0 pointer-events-none opacity-5">
      <div className="w-full h-full" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function LoginPage() {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErr, setFieldErr] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showCams, setShowCams] = useState(true);

  const terminal = useTerminalNav(setActiveTab);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) { setFieldErr("Please fill in both fields."); return; }
    setFieldErr("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setView("warping");
  };

  const handleWarpComplete = useCallback(() => {
    setView("dashboard");
  }, []);

  const handleSignOut = () => {
    setView("login");
    setEmail("");
    setPassword("");
    setActiveTab("home");
  };

  // Keyboard: Ctrl+` opens terminal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") { e.preventDefault(); terminal.setTermOpen((o) => !o); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [terminal]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      {/* ── Black hole transition ── */}
      <BlackHoleTransition active={view === "warping"} onComplete={handleWarpComplete} />

      {/* ── Animated background ── */}
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.04) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full opacity-25"
          style={{
            background: view === "dashboard"
              ? "radial-gradient(circle, #7c3aed 0%, #0c4a6e 40%, transparent 70%)"
              : "radial-gradient(circle, #0284c7 0%, #0c4a6e 40%, transparent 70%)",
            filter: "blur(90px)",
            transition: "background 2s",
          }}
        />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8">
        {/* ── LOGIN VIEW ── */}
        {view === "login" && (
          <>
            <Link
              href="/"
              className="mb-8 flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-300 transition-colors"
            >
              ← Back to VoxCode
            </Link>

            <div
              className="w-full max-w-sm rounded-3xl border border-slate-800/70 bg-slate-900/80 p-8 backdrop-blur-xl"
              style={{
                boxShadow: "0 0 80px rgba(34,211,238,0.07), 0 30px 60px rgba(0,0,0,0.4)",
                animation: "loginFloat 4s ease-in-out infinite alternate",
              }}
            >
              <div className="mb-8 flex flex-col items-center gap-3">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full text-slate-950 font-black text-xl"
                  style={{
                    background: "linear-gradient(135deg, #22d3ee, #a78bfa)",
                    boxShadow: "0 0 30px rgba(34,211,238,0.4), 0 0 60px rgba(167,139,250,0.2)",
                  }}
                >
                  V
                </div>
                <div className="text-center">
                  <h1 className="text-xl font-bold text-slate-50">Enter the Universe</h1>
                  <p className="mt-1 text-xs text-slate-400">Authenticate to access the future</p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20"
                />
                {fieldErr && <p className="text-xs text-red-400">{fieldErr}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full py-3.5 text-sm font-bold text-slate-950 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                  style={{
                    background: "linear-gradient(135deg, #22d3ee, #a78bfa)",
                    boxShadow: "0 0 30px rgba(34,211,238,0.35), 0 0 60px rgba(167,139,250,0.15)",
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                      Warping...
                    </span>
                  ) : (
                    "🌀 Enter Black Hole"
                  )}
                </button>
              </form>

              <div className="mt-6 space-y-2 text-center text-xs text-slate-600">
                <p>
                  No account?{" "}
                  <Link href="/#pricing" className="text-cyan-400 hover:underline">
                    Get started for $1/month
                  </Link>
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── DASHBOARD VIEW — THE FUTURE ── */}
        {view === "dashboard" && (
          <div
            className="w-full max-w-4xl space-y-4"
            style={{ animation: "dashboardReveal 1s ease-out forwards" }}
          >
            {/* User header */}
            <div
              className="flex items-center justify-between rounded-3xl border border-slate-800/50 bg-slate-900/70 p-5 backdrop-blur-xl"
              style={{ boxShadow: "0 0 40px rgba(128,0,255,0.06), 0 0 80px rgba(34,211,238,0.04)" }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full text-slate-950 text-xl font-black"
                  style={{ background: "linear-gradient(135deg, #22d3ee, #a78bfa)" }}
                >
                  {email[0]?.toUpperCase() ?? "U"}
                </div>
                <div>
                  <p className="font-semibold text-slate-50">{email || "commander@voxcode.ai"}</p>
                  <p className="text-xs text-slate-400">Pro Developer · Future Universe</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCams((s) => !s)}
                  className="rounded-xl px-3 py-2 text-[10px] font-bold transition-all"
                  style={{
                    background: showCams ? "rgba(34,211,238,0.1)" : "rgba(255,255,255,0.05)",
                    color: showCams ? "#22d3ee" : "#64748b",
                    border: `1px solid ${showCams ? "rgba(34,211,238,0.2)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  📷 {showCams ? "Cams ON" : "Cams OFF"}
                </button>
                <button
                  onClick={() => terminal.setTermOpen((o) => !o)}
                  className="rounded-xl px-3 py-2 text-[10px] font-bold text-cyan-400 transition-all"
                  style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)" }}
                >
                  &gt;_ Terminal
                </button>
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-emerald-400"
                  style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)" }}
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Online
                </span>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-800/40 bg-slate-900/50 p-1.5 backdrop-blur">
              {TAB_DEFS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold transition-all"
                  style={{
                    background: activeTab === tab.id ? `${tab.color}18` : "transparent",
                    color: activeTab === tab.id ? tab.color : "#64748b",
                    border: activeTab === tab.id ? `1px solid ${tab.color}30` : "1px solid transparent",
                  }}
                >
                  <span>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Teleport flash */}
            {terminal.teleporting && (
              <div
                className="pointer-events-none fixed inset-0 z-[100]"
                style={{ animation: "teleportFlash 0.75s ease both" }}
              >
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.22), rgba(128,0,255,0.28))" }} />
              </div>
            )}

            {/* ── TAB CONTENT ── */}
            <div
              className="relative overflow-hidden rounded-3xl border border-slate-800/40 bg-slate-900/60 p-6 backdrop-blur-xl min-h-[400px]"
              style={{ boxShadow: "0 0 50px rgba(0,0,0,0.3)" }}
            >
              <TabBackgrounds activeTab={activeTab} />
              
              <div className="relative z-10 space-y-2">
              {/* HOME */}
              {activeTab === "home" && (
                <div className="space-y-5">
                  <h2 className="text-2xl font-black" style={{ background: "linear-gradient(135deg, #22d3ee, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Welcome to the Future
                  </h2>
                  <p className="text-sm text-slate-400">You have passed through the singularity. All systems are at your command.</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {MOCK_STATS.map((stat) => (
                      <div
                        key={stat.label}
                        className="group relative overflow-hidden rounded-2xl border bg-slate-900/70 p-4 transition-all duration-300 hover:-translate-y-0.5"
                        style={{ borderColor: `${stat.color}20`, boxShadow: `0 0 20px ${stat.color}06` }}
                      >
                        <div className="text-xl">{stat.icon}</div>
                        <div className="mt-1 text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PROFILE */}
              {activeTab === "profile" && (
                <div className="space-y-5">
                  <div className="flex items-center gap-5">
                    <div
                      className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-black text-slate-950"
                      style={{ background: "linear-gradient(135deg, #22d3ee, #a78bfa)", boxShadow: "0 0 40px rgba(34,211,238,0.3)" }}
                    >
                      {email[0]?.toUpperCase() ?? "U"}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{email || "commander@voxcode.ai"}</h2>
                      <p className="text-sm text-slate-400">Pro Developer Plan · $1/month</p>
                      <p className="text-xs text-violet-400 mt-1">Rank: Universe Commander</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Total Commands", value: "14,291" },
                      { label: "Active Sessions", value: "3" },
                      { label: "AI Conversations", value: "847" },
                      { label: "Files Processed", value: "2,103" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-slate-800/50 bg-slate-900/50 p-4">
                        <div className="text-lg font-bold text-cyan-400">{s.value}</div>
                        <div className="text-[10px] text-slate-500 mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MESSAGES */}
              {activeTab === "messages" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-100">Messages</h2>
                  {MOCK_MESSAGES.map((m, i) => (
                    <div
                      key={i}
                      className="flex gap-3 rounded-2xl border border-slate-800/50 bg-slate-900/50 p-4 transition-all hover:border-cyan-400/20"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold" style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(167,139,250,0.2))" }}>
                        {m.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-200">{m.from}</span>
                          <span className="text-[10px] text-slate-600">{new Date(m.ts).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{m.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* FRIENDS */}
              {activeTab === "friends" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-100">Friends ({MOCK_FRIENDS.length})</h2>
                  {MOCK_FRIENDS.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-800/50 bg-slate-900/50 p-4 transition-all hover:border-violet-400/20">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-white" style={{ background: `linear-gradient(135deg, ${f.color}, #1e1b4b)` }}>
                        {f.name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-200">{f.name}</div>
                        <div className="text-[10px] text-slate-500">{f.role}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: f.status === "online" ? "#22c55e" : f.status === "idle" ? "#fbbf24" : "#64748b" }} />
                        <span className="text-[10px] text-slate-500 capitalize">{f.status}</span>
                      </div>
                      <button className="rounded-lg px-3 py-1.5 text-[10px] font-bold text-cyan-400" style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)" }}>
                        Chat
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* GROUPS */}
              {activeTab === "groups" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-100">Groups</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {MOCK_GROUPS.map((g, i) => (
                      <div key={i} className="rounded-2xl border border-slate-800/50 bg-slate-900/50 p-5 transition-all hover:border-cyan-400/20 hover:-translate-y-1 cursor-pointer">
                        <div className="text-3xl mb-2">{g.icon}</div>
                        <div className="text-sm font-bold text-slate-200">{g.name}</div>
                        <div className="text-[10px] text-slate-500 mt-1">{g.members} members</div>
                        <div className="mt-3 h-1 rounded-full bg-slate-800" style={{ overflow: "hidden" }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(g.members * 3, 100)}%`, background: g.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FORUM */}
              {activeTab === "forum" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-100">Forum</h2>
                    <button className="rounded-xl px-4 py-2 text-[11px] font-bold text-cyan-400" style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)" }}>
                      + New Post
                    </button>
                  </div>
                  {MOCK_FORUM_POSTS.map((p, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-800/50 bg-slate-900/50 p-4 transition-all hover:border-orange-400/20 cursor-pointer">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-200">{p.title}</div>
                        <div className="text-[10px] text-slate-500 mt-1">by {p.author} · {p.ts}</div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <span>💬</span> {p.replies}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ABOUT US */}
              {activeTab === "about" && (
                <div className="space-y-5">
                  <h2 className="text-2xl font-black" style={{ background: "linear-gradient(135deg, #22d3ee, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    About Kings From Earth Development
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    We build the future of voice-powered development tools. VoxCode and OpenClaw represent
                    a new paradigm — where AI agents, 3D interfaces, and neural pipelines converge into a single
                    platform that makes coding feel like commanding a starship.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Founded", value: "2026", icon: "🏗️" },
                      { label: "Team", value: "Distributed", icon: "🌍" },
                      { label: "Users", value: "10K+", icon: "👥" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-slate-800/50 bg-slate-900/50 p-4 text-center">
                        <div className="text-2xl mb-1">{s.icon}</div>
                        <div className="text-lg font-bold text-cyan-400">{s.value}</div>
                        <div className="text-[10px] text-slate-500">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">https://KingsFromEarthDevelopment.com</p>
                </div>
              )}

              {/* AI FILE SYSTEM */}
              {activeTab === "ai-files" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-100">AI File System</h2>
                    <span className="text-[10px] text-slate-500 font-mono">/openclaw/universe/</span>
                  </div>
                  <div className="rounded-xl border border-slate-800/50 overflow-hidden">
                    <div className="grid grid-cols-[1fr_80px_100px] gap-2 px-4 py-2 text-[9px] font-bold text-slate-600 tracking-wider bg-slate-900/60 border-b border-slate-800/50">
                      <span>NAME</span><span>SIZE</span><span>MODIFIED</span>
                    </div>
                    {MOCK_FILES.map((f, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_100px] gap-2 px-4 py-3 text-[11px] border-b border-slate-800/30 hover:bg-slate-800/20 transition-all cursor-pointer">
                        <span className="font-mono" style={{ color: f.type === "dir" ? "#22d3ee" : "#e2e8f0" }}>
                          {f.type === "dir" ? "📁 " : "📄 "}{f.name}
                        </span>
                        <span className="text-slate-500">{f.size}</span>
                        <span className="text-slate-600">{f.mod}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MISSION CONTROL */}
              {activeTab === "mission-control" && (
                <div className="space-y-5">
                  <h2 className="text-lg font-bold text-slate-100">🚀 Mission Control</h2>
                  {MOCK_MISSIONS.map((m, i) => (
                    <div key={i} className="rounded-2xl border border-slate-800/50 bg-slate-900/50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-slate-200">{m.name}</span>
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase"
                          style={{
                            background: `${m.color}18`,
                            color: m.color,
                            border: `1px solid ${m.color}30`,
                          }}
                        >
                          {m.status}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${m.progress}%`, background: m.color }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1">{m.progress}% complete</div>
                    </div>
                  ))}
                </div>
              )}

              {/* MEMORY */}
              {activeTab === "memory" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-100">🧠 Memory Store</h2>
                    <span className="text-[10px] text-slate-500">{MOCK_MEMORY.length} entries</span>
                  </div>
                  {MOCK_MEMORY.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-800/50 bg-slate-900/50 p-3 hover:border-red-400/20 transition-all">
                      <span className="text-[10px] font-bold font-mono text-red-400 min-w-[120px]">{m.key}</span>
                      <span className="text-[10px] font-mono text-slate-300 flex-1">{m.value}</span>
                      <span
                        className="rounded px-1.5 py-0.5 text-[8px] font-bold"
                        style={{
                          background: m.type === "counter" ? "rgba(34,211,238,0.1)" : m.type === "timestamp" ? "rgba(167,139,250,0.1)" : "rgba(148,163,184,0.1)",
                          color: m.type === "counter" ? "#22d3ee" : m.type === "timestamp" ? "#a78bfa" : "#94a3b8",
                        }}
                      >
                        {m.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* VOICE JOURNAL */}
              {activeTab === "voice" && <VoiceJournal />}

              {/* SETTINGS */}
              {activeTab === "settings" && <SettingsPanel onSignOut={handleSignOut} />}
              </div>
            </div>

            {/* Sign out footer */}
            <div className="text-center pt-2">
              <button onClick={handleSignOut} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Webcam Arena — visible only in dashboard ── */}
      {view === "dashboard" && showCams && <WebcamArena />}

      {/* ── Terminal overlay ── */}
      {terminal.termOpen && view === "dashboard" && (
        <div
          className="fixed inset-x-4 bottom-4 z-[200] mx-auto max-w-[660px] overflow-hidden rounded-2xl border border-cyan-400/20 bg-slate-950/96 shadow-2xl backdrop-blur-xl"
          style={{ boxShadow: "0 0 100px rgba(34,211,238,0.14), 0 40px 80px rgba(0,0,0,0.65)", animation: "termOpen 0.32s cubic-bezier(0.22,1,0.36,1) both" }}
        >
          <div className="flex items-center justify-between border-b border-slate-800/70 bg-slate-900/70 px-4 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
              </div>
              <span className="font-mono text-[11px] text-slate-400">universe-terminal — teleport — 80×24</span>
            </div>
            <button onClick={() => terminal.setTermOpen(false)} className="text-slate-600 hover:text-slate-300 transition-colors">×</button>
          </div>

          <div className="h-48 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-5" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(34,211,238,0.012) 19px, rgba(34,211,238,0.012) 20px)" }}>
            {terminal.termLines.map((line, i) => {
              if (line.type === "cmd") {
                return (
                  <div key={i} className="flex gap-1.5 py-0.5">
                    <span className="text-cyan-400">universe ~&gt;</span>
                    <span className="text-slate-100">{line.text}</span>
                  </div>
                );
              }
              return (
                <div key={i} className="py-[1px]" style={{ color: line.type === "err" ? "#f87171" : line.type === "ok" ? "#34d399" : line.type === "dim" ? "#475569" : "#94a3b8" }}>
                  {line.text}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 border-t border-slate-800/60 bg-slate-900/50 px-4 py-2.5">
            <span className="shrink-0 font-mono text-[11.5px] text-cyan-400">universe ~&gt;</span>
            <input
              value={terminal.termInput}
              onChange={(e) => terminal.setTermInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  terminal.processCmd(terminal.termInput);
                  terminal.setTermInput("");
                }
                if (e.key === "Escape") terminal.setTermOpen(false);
              }}
              className="flex-1 bg-transparent font-mono text-[11.5px] text-slate-100 outline-none placeholder-slate-700"
              placeholder="goto home | goto messages | help ..."
              autoFocus
            />
            <span className="h-4 w-0.5 animate-pulse rounded-full bg-cyan-400" />
          </div>
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes loginFloat {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-8px); }
        }
        @keyframes dashboardReveal {
          0%   { opacity: 0; transform: translateY(30px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes termOpen {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes teleportFlash {
          0%   { opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes dataStreamDrop {
          0%   { transform: translateY(0); opacity: 0; }
          10%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(800px); opacity: 0; }
        }
        @keyframes dataBlockFloat {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-600px) rotate(180deg); opacity: 0; }
        }
        @keyframes radarSweep {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes radarBlip {
          0%, 20% { opacity: 0; transform: scale(0.5); }
          25% { opacity: 1; transform: scale(1.5); box-shadow: 0 0 10px #22d3ee; }
          50% { opacity: 0; transform: scale(1); }
          100% { opacity: 0; }
        }
        @keyframes synapsePulse {
          from { transform: scale(0.8); opacity: 0.3; }
          to   { transform: scale(1.2); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
