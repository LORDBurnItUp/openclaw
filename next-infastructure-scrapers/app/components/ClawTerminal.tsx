"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Config ────────────────────────────────────────────────────────────────────
const STRIPE_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "#pricing";

const SECTIONS: Record<string, string> = {
  hero:     "#top",
  top:      "#top",
  features: "#features",
  earth:    "#earth",
  works:    "#how-it-works",
  howitworks: "#how-it-works",
  download: "#download",
  pricing:  "#pricing",
  faq:      "#faq",
  // Dashboard tabs — teleport to login/dashboard
  home:       "/login#home",
  profile:    "/login#profile",
  messages:   "/login#messages",
  friends:    "/login#friends",
  groups:     "/login#groups",
  forum:      "/login#forum",
  "about-us": "/login#about",
  "ai-files": "/login#ai-files",
  "mission-control": "/login#mission-control",
  memory:     "/login#memory",
  dashboard:  "/login",
};

const ALL_CMDS = [
  "help", "goto", "ls", "buy", "login", "status",
  "version", "clear", "whoami", "about", "exit",
  "dashboard", "home", "profile", "messages", "friends",
  "groups", "forum", "memory", "mission-control", "ai-files",
];

// ─── Types ─────────────────────────────────────────────────────────────────────
type LineType = "cmd" | "out" | "err" | "ok" | "blank" | "title" | "dim";
interface Line { type: LineType; text?: string; }

// ─── Boot screen ───────────────────────────────────────────────────────────────
const BOOT: Line[] = [
  { type: "title", text: "╔═══════════════════════════════════════╗" },
  { type: "title", text: "║   VOXCODE CLI  v1.0.0                ║" },
  { type: "title", text: "║   SaaS Voice Coding Infrastructure    ║" },
  { type: "title", text: "╚═══════════════════════════════════════╝" },
  { type: "blank" },
  { type: "dim",   text: "  © 2026 Kings From Earth Development" },
  { type: "dim",   text: "  https://KingsFromEarthDevelopment.com" },
  { type: "blank" },
  { type: "out",   text: "  Type 'help' for commands. Press [Esc] to close." },
  { type: "blank" },
];

// ─── Component ─────────────────────────────────────────────────────────────────
export function ClawTerminal() {
  const [open, setOpen]           = useState(false);
  const [lines, setLines]         = useState<Line[]>(BOOT);
  const [input, setInput]         = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx]     = useState(-1);
  const [teleporting, setTeleporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  // Keyboard shortcut: Ctrl+` opens terminal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") { e.preventDefault(); setOpen(o => !o); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const push = useCallback((...newLines: Line[]) => {
    setLines(prev => [...prev, ...newLines]);
  }, []);

  const teleportTo = useCallback((selector: string) => {
    setTeleporting(true);
    setTimeout(() => {
      document.querySelector(selector)?.scrollIntoView({ behavior: "smooth" });
    }, 280);
    setTimeout(() => setTeleporting(false), 750);
  }, []);

  const processCommand = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/\s+/);
    const cmd   = parts[0].toLowerCase();
    const args  = parts.slice(1);

    push({ type: "cmd", text: trimmed });

    switch (cmd) {

      case "help":
        push(
          { type: "blank" },
          { type: "out", text: "  ┌─ Available Commands ─────────────────────┐" },
          { type: "out", text: "  │                                           │" },
          { type: "out", text: "  │  goto <section>   teleport to a section  │" },
          { type: "out", text: "  │  ls               list all sections       │" },
          { type: "out", text: "  │  buy              open Stripe checkout    │" },
          { type: "out", text: "  │  login            sign in to account      │" },
          { type: "out", text: "  │  status           system health check     │" },
          { type: "out", text: "  │  whoami           current user info       │" },
          { type: "out", text: "  │  version          show version            │" },
          { type: "out", text: "  │  about            about VoxCode          │" },
          { type: "out", text: "  │  clear            clear terminal          │" },
          { type: "out", text: "  │  exit             close terminal          │" },
          { type: "out", text: "  │                                           │" },
          { type: "out", text: "  │  Shortcut: Ctrl+` to toggle              │" },
          { type: "out", text: "  └───────────────────────────────────────────┘" },
          { type: "blank" },
        );
        break;

      case "ls":
      case "sections":
        push(
          { type: "blank" },
          { type: "out", text: "  Page sections:" },
          { type: "blank" },
          { type: "out", text: "  hero        →  #top" },
          { type: "out", text: "  features    →  #features" },
          { type: "out", text: "  earth       →  #earth" },
          { type: "out", text: "  works       →  #how-it-works" },
          { type: "out", text: "  download    →  #download" },
          { type: "out", text: "  pricing     →  #pricing" },
          { type: "out", text: "  faq         →  #faq" },
          { type: "blank" },
          { type: "dim",  text: "  Usage: goto <section>" },
          { type: "blank" },
        );
        break;

      case "goto":
      case "go":
      case "cd": {
        const dest = args[0]?.toLowerCase();
        if (!dest) {
          push(
            { type: "err",  text: "  Error: section name required" },
            { type: "dim",  text: "  Usage: goto <section>" },
            { type: "dim",  text: `  Sections: ${Object.keys(SECTIONS).filter(k => !["top","howitworks"].includes(k)).join("  ")}` },
          );
        } else {
          const target = SECTIONS[dest];
          if (!target) {
            push(
              { type: "err", text: `  Unknown section: '${dest}'` },
              { type: "dim", text: `  Available: ${Object.keys(SECTIONS).filter(k => !["top","howitworks"].includes(k)).join("  ")}` },
            );
          } else if (target.startsWith("/")) {
            // Dashboard navigation — redirect to login/dashboard
            push(
              { type: "ok",  text: `  🌀 Warping to ${dest}...` },
              { type: "dim", text: "  Entering black hole tunnel..." },
            );
            setTeleporting(true);
            setTimeout(() => { window.location.href = target; }, 800);
            return;
          } else {
            push(
              { type: "ok",  text: `  ⚡ Teleporting to ${dest}...` },
              { type: "dim", text: "  Engaging warp drive..." },
            );
            setTimeout(() => teleportTo(target), 180);
            setTimeout(() => {
              push({ type: "ok", text: `  ✓ Arrived at ${dest}.` }, { type: "blank" });
            }, 900);
            return;
          }
        }
        break;
      }

      case "buy":
      case "subscribe":
      case "pay":
        push(
          { type: "ok",  text: "  Opening Stripe checkout..." },
          { type: "dim", text: "  $1/month · Cancel anytime" },
        );
        setTimeout(() => window.open(STRIPE_LINK, "_blank"), 450);
        break;

      case "login":
      case "signin":
      case "auth":
        push({ type: "ok", text: "  Navigating to login portal..." });
        setTimeout(() => { window.location.href = "/login"; }, 500);
        break;

      case "status":
        push(
          { type: "blank" },
          { type: "ok",  text: "  ● VOICE ENGINE      online    ↑ 99.97%" },
          { type: "ok",  text: "  ● AI CORE           online    ↑ 100%" },
          { type: "ok",  text: "  ● ERROR SHIELD      active    ↑ 98.3%" },
          { type: "ok",  text: "  ● REPO SYNC         running   ↑ 99.9%" },
          { type: "out", text: "  ● LATENCY           ~182ms avg" },
          { type: "out", text: "  ● UPTIME            47d 11h 32m" },
          { type: "blank" },
          { type: "dim", text: "  Last incident: none in 47 days" },
          { type: "blank" },
        );
        break;

      case "whoami":
        push(
          { type: "blank" },
          { type: "out", text: "  user:      guest" },
          { type: "out", text: "  plan:      free (run 'buy' to upgrade)" },
          { type: "out", text: "  shell:     voxcode-bash 1.0" },
          { type: "dim", text: "  tip:       run 'login' to see your subscription" },
          { type: "blank" },
        );
        break;

      case "version":
        push(
          { type: "blank" },
          { type: "out", text: "  voxcode cli     v1.0.0" },
          { type: "out", text: "  next.js          16.1.6" },
          { type: "out", text: "  react            19.2.3" },
          { type: "out", text: "  three.js         0.171.x" },
          { type: "out", text: "  node.js          20.x LTS" },
          { type: "blank" },
        );
        break;

      case "about":
        push(
          { type: "blank" },
          { type: "title", text: "  VoxCode — SaaS Voice Coding Infrastructure" },
          { type: "blank" },
          { type: "out",   text: "  Built by Kings From Earth Development" },
          { type: "out",   text: "  $1/month · Cancel anytime · Works everywhere" },
          { type: "dim",   text: "  https://KingsFromEarthDevelopment.com" },
          { type: "blank" },
        );
        break;

      case "clear":
      case "cls":
        setLines([...BOOT]);
        return;

      case "exit":
      case "close":
      case "quit":
      case "q":
        push({ type: "dim", text: "  Session terminated. Goodbye." }, { type: "blank" });
        setTimeout(() => setOpen(false), 500);
        return;

      default:
        push(
          { type: "err", text: `  command not found: ${cmd}` },
          { type: "dim", text: "  type 'help' for available commands" },
        );
    }
    push({ type: "blank" });
  }, [push, teleportTo]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = input;
      if (val.trim()) {
        setCmdHistory(prev => [val, ...prev.slice(0, 49)]);
        setHistIdx(-1);
      }
      processCommand(val);
      setInput("");

    } else if (e.key === "Tab") {
      e.preventDefault();
      const matches = ALL_CMDS.filter(c => c.startsWith(input.toLowerCase()));
      if (matches.length === 1) {
        setInput(matches[0]);
      } else if (matches.length > 1) {
        push({ type: "dim", text: "  " + matches.join("   ") }, { type: "blank" });
      }

    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(next);
      if (cmdHistory[next]) setInput(cmdHistory[next]);

    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setInput(next === -1 ? "" : (cmdHistory[next] ?? ""));

    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }, [input, cmdHistory, histIdx, processCommand, push]);

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const lineStyle = (type: LineType): React.CSSProperties => {
    switch (type) {
      case "err":   return { color: "#f87171" };
      case "ok":    return { color: "#34d399" };
      case "cmd":   return { color: "#e2e8f0" };
      case "title": return { color: "#22d3ee", fontWeight: 700 };
      case "dim":   return { color: "#475569" };
      default:      return { color: "#94a3b8" };
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Teleport flash overlay */}
      {teleporting && (
        <div
          className="pointer-events-none fixed inset-0 z-[100]"
          style={{ animation: "teleportFlash 0.75s ease both" }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, rgba(34,211,238,0.22), rgba(14,165,233,0.28))",
            }}
          />
          {/* Scanlines */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34,211,238,0.04) 2px, rgba(34,211,238,0.04) 4px)",
            }}
          />
          {/* Center burst */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: "300px",
              height: "300px",
              background: "radial-gradient(circle, rgba(34,211,238,0.35) 0%, transparent 70%)",
              animation: "teleportBurst 0.75s ease both",
            }}
          />
        </div>
      )}

      {/* Trigger button — bottom-left */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="VoxCode CLI (Ctrl+`)"
          className="fixed bottom-6 left-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/90 font-mono text-xs font-bold text-cyan-400 shadow-lg backdrop-blur transition-all duration-200 hover:scale-110 hover:border-cyan-400/60"
          style={{ boxShadow: "0 0 24px rgba(34,211,238,0.1)", letterSpacing: "-0.05em" }}
        >
          &gt;_
        </button>
      )}

      {/* Terminal window */}
      {open && (
        <div
          className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-[660px] overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/96 shadow-2xl backdrop-blur-xl"
          style={{
            boxShadow: "0 0 100px rgba(34,211,238,0.14), 0 40px 80px rgba(0,0,0,0.65)",
            animation: "termOpen 0.32s cubic-bezier(0.22,1,0.36,1) both",
          }}
        >
          {/* Title bar */}
          <div className="flex items-center justify-between border-b border-slate-800/70 bg-slate-900/70 px-4 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                voxcode — bash — 80×24
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[9px] text-slate-600">Ctrl+` to toggle</span>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-600 hover:text-slate-300 transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          {/* Output area */}
          <div
            className="h-60 overflow-y-auto px-4 py-3 font-mono text-[11.5px] leading-5"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(34,211,238,0.012) 19px, rgba(34,211,238,0.012) 20px)",
            }}
          >
            {lines.map((line, i) => {
              if (line.type === "blank") return <div key={i} className="h-2.5" />;
              if (line.type === "cmd") {
                return (
                  <div key={i} className="flex items-start gap-1.5 py-0.5">
                    <span className="shrink-0 text-cyan-400">voxcode ~&gt;</span>
                    <span className="text-slate-100">{line.text}</span>
                  </div>
                );
              }
              return (
                <div key={i} className="py-[1px]" style={lineStyle(line.type)}>
                  {line.text}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div className="flex items-center gap-2 border-t border-slate-800/60 bg-slate-900/50 px-4 py-2.5">
            <span className="shrink-0 font-mono text-[11.5px] text-cyan-400">voxcode ~&gt;</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent font-mono text-[11.5px] text-slate-100 outline-none placeholder-slate-700"
              placeholder="type a command..."
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <span className="h-4 w-0.5 animate-pulse rounded-full bg-cyan-400" />
          </div>
        </div>
      )}

      <style>{`
        @keyframes teleportFlash {
          0%   { opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes teleportBurst {
          0%   { transform: translate(-50%,-50%) scale(0); opacity: 0.8; }
          100% { transform: translate(-50%,-50%) scale(4);  opacity: 0;   }
        }
        @keyframes termOpen {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
