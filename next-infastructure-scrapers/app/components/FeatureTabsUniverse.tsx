"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Tab {
  id: string;
  icon: string;
  label: string;
  accent: string;
  dim: string;
  headline: string;
  body: string;
  items: string[];
}

// ─── Data ──────────────────────────────────────────────────────────────────────
const TABS: Tab[] = [
  {
    id: "voice",
    icon: "⚡",
    label: "Voice Engine",
    accent: "#22d3ee",
    dim: "#0e7490",
    headline: "Zero-latency voice-to-code",
    body: "Sub-200ms real-time transcription. Continuous stream mode. Automatic hotword detection. You talk — it ships instantly.",
    items: ["Sub-200ms latency", "Continuous stream", "Hotword detection", "Custom vocab training"],
  },
  {
    id: "shield",
    icon: "🛡",
    label: "Error Shield",
    accent: "#a78bfa",
    dim: "#5b21b6",
    headline: "Fix before it lands",
    body: "Auto-corrects syntax, type errors, and bad imports before code touches your editor. Ship clean code, always.",
    items: ["Syntax auto-fix", "Type inference", "Import resolution", "Safe diff generation"],
  },
  {
    id: "repo",
    icon: "🧬",
    label: "Repo DNA",
    accent: "#34d399",
    dim: "#065f46",
    headline: "Learns your codebase",
    body: "Every session maps your architecture, naming conventions, and patterns. Gets smarter with every commit.",
    items: ["Pattern recognition", "Naming conventions", "Architecture mapping", "Commit-aware context"],
  },
  {
    id: "ide",
    icon: "🖥",
    label: "IDE Native",
    accent: "#f59e0b",
    dim: "#78350f",
    headline: "Built for real IDEs",
    body: "VS Code, JetBrains, Neovim, Cursor. Direct extension integration — not a browser tab, not a web overlay.",
    items: ["VS Code extension", "JetBrains plugin", "Neovim LSP bridge", "Cursor compatible"],
  },
  {
    id: "ai",
    icon: "🤖",
    label: "AI Core",
    accent: "#f472b6",
    dim: "#831843",
    headline: "Claude-powered intelligence",
    body: "Anthropic's Claude under the hood. Best-in-class reasoning, 200K context window, and repo-aware code generation.",
    items: ["Claude AI engine", "200K token context", "Repo-aware prompts", "On-device privacy layer"],
  },
];

// ─── Floating particle dots ─────────────────────────────────────────────────
// Pre-generated particle configurations to avoid Math.random() in render
const PARTICLE_CONFIGS = Array.from({ length: 18 }).map(() => ({
  width: 2 + Math.random() * 4,
  height: 2 + Math.random() * 4,
  opacity: 0.15 + Math.random() * 0.25,
  left: 5 + Math.random() * 90,
  top: 5 + Math.random() * 90,
  duration: 4 + Math.random() * 6,
  delay: Math.random() * 4,
}));

function ParticleDots({ accent }: { accent: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      {PARTICLE_CONFIGS.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${p.width}px`,
            height: `${p.height}px`,
            background: accent,
            opacity: p.opacity,
            left: `${p.left}%`,
            top: `${p.top}%`,
            animation: `floatDot ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Panel content ─────────────────────────────────────────────────────────────
function PanelContent({ tab, mouse }: { tab: Tab; mouse: { x: number; y: number } }) {
  return (
    <div className="relative flex h-full flex-col justify-between gap-6 md:flex-row md:items-center">
      {/* Left: headline + body */}
      <div
        className="flex-1 space-y-4 transition-transform duration-150"
        style={{
          transform: `translate(${mouse.x * -8}px, ${mouse.y * -5}px)`,
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
            style={{
              backgroundColor: `${tab.accent}18`,
              borderColor: `${tab.accent}40`,
              boxShadow: `0 0 30px ${tab.accent}30`,
            }}
          >
            {tab.icon}
          </div>
          <h3
            className="text-xl font-bold sm:text-2xl"
            style={{ color: tab.accent }}
          >
            {tab.headline}
          </h3>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">
          {tab.body}
        </p>
      </div>

      {/* Right: feature pills */}
      <div
        className="flex flex-col justify-center gap-2.5 min-w-[220px] transition-transform duration-100"
        style={{
          transform: `translate(${mouse.x * 10}px, ${mouse.y * 6}px)`,
        }}
      >
        {tab.items.map((item, i) => (
          <div
            key={item}
            className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium"
            style={{
              borderColor: `${tab.accent}30`,
              backgroundColor: `${tab.accent}0d`,
              color: tab.accent,
              animationDelay: `${i * 70}ms`,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: tab.accent, boxShadow: `0 0 6px ${tab.accent}` }}
            />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────
export function FeatureTabsUniverse() {
  const [active, setActive] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [animDir, setAnimDir] = useState<"right" | "left">("right");
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const sectionRef = useRef<HTMLElement>(null);

  const handleTabClick = useCallback(
    (idx: number) => {
      if (idx === active) return;
      setAnimDir(idx > active ? "right" : "left");
      setActive(idx);
      setAnimKey((k) => k + 1);
    },
    [active],
  );

  // Mouse parallax — RAF-throttled to cap at 60fps instead of 200+ setState/sec
  useEffect(() => {
    let pending = false;
    let latestE: MouseEvent | null = null;
    const onMove = (e: MouseEvent) => {
      latestE = e;
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        if (latestE && sectionRef.current) {
          const rect = sectionRef.current.getBoundingClientRect();
          setMouse({
            x: ((latestE.clientX - rect.left) / rect.width  - 0.5) * 2,
            y: ((latestE.clientY - rect.top)  / rect.height - 0.5) * 2,
          });
        }
        pending = false;
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Auto-cycle tabs
  useEffect(() => {
    const t = setInterval(() => {
      setAnimDir("right");
      setActive((a) => (a + 1) % TABS.length);
      setAnimKey((k) => k + 1);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const tab = TABS[active];

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative w-full overflow-hidden py-24"
      style={{ perspective: "1400px" }}
    >
      {/* ── Parallax layer 1: radial glow (slowest) ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 55% at ${50 + mouse.x * 6}% ${50 + mouse.y * 6}%, ${tab.dim}55, transparent 70%)`,
          transition: "background 0.8s ease",
        }}
      />

      {/* ── Parallax layer 2: floating accent orb ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          transform: `translate(${mouse.x * -22}px, ${mouse.y * -14}px)`,
          transition: "transform 0.12s linear",
          background: `radial-gradient(circle 160px at ${58 + mouse.x * 18}% ${42 + mouse.y * 18}%, ${tab.accent}22, transparent)`,
        }}
      />

      {/* ── Parallax layer 3: grid mesh (fastest) ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          transform: `translate(${mouse.x * -38}px, ${mouse.y * -26}px) rotateX(${mouse.y * 4}deg) rotateY(${mouse.x * 4}deg)`,
          transition: "transform 0.07s linear",
          backgroundImage: `linear-gradient(${tab.accent}22 1px, transparent 1px), linear-gradient(90deg, ${tab.accent}22 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          opacity: 0.45,
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-4">
        {/* Section header */}
        <div className="mb-12 space-y-3 text-center">
          <p
            className="text-xs font-semibold uppercase tracking-widest transition-colors duration-500"
            style={{ color: tab.accent }}
          >
            Core features
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
            Built for{" "}
            <span
              className="transition-colors duration-500"
              style={{ color: tab.accent }}
            >
              production
            </span>
            , not demos.
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-slate-400 sm:text-base">
            Every layer engineered for real engineering work — not one-off code snippets.
          </p>
        </div>

        {/* Tab pill row */}
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => handleTabClick(i)}
              aria-label={`Switch to ${t.label} tab`}
              className="relative rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300"
              style={{
                color: i === active ? "#020617" : t.accent,
                backgroundColor: i === active ? t.accent : "transparent",
                borderColor: `${t.accent}${i === active ? "ff" : "35"}`,
                borderWidth: "1.5px",
                boxShadow: i === active ? `0 0 28px ${t.accent}55, 0 0 8px ${t.accent}30` : "none",
                transform: i === active ? "scale(1.1) translateY(-2px)" : "scale(1)",
              }}
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mb-8 mx-auto h-0.5 w-48 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${((active + 1) / TABS.length) * 100}%`,
              background: `linear-gradient(90deg, ${tab.dim}, ${tab.accent})`,
            }}
          />
        </div>

        {/* 3D panel */}
        <div
          className="relative min-h-[260px]"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            key={animKey}
            className="relative overflow-hidden rounded-3xl border p-8 backdrop-blur-xl min-h-[240px]"
            style={{
              background: `linear-gradient(135deg, ${tab.accent}10 0%, ${tab.dim}1a 50%, transparent 100%)`,
              borderColor: `${tab.accent}35`,
              boxShadow: `0 0 100px ${tab.accent}20, 0 0 40px ${tab.accent}10, inset 0 0 60px ${tab.accent}06`,
              animation: `tabEnter${animDir === "right" ? "R" : "L"} 0.5s cubic-bezier(0.22,1,0.36,1) both`,
            }}
          >
            <ParticleDots accent={tab.accent} />
            <PanelContent tab={tab} mouse={mouse} />
          </div>
        </div>

        {/* Tab indicators */}
        <div className="mt-6 flex justify-center gap-2">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              aria-label={`Go to ${t.label} tab`}
              onClick={() => handleTabClick(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === active ? "28px" : "8px",
                height: "8px",
                background: i === active ? t.accent : `${t.accent}30`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Injected keyframes */}
      <style>{`
        @keyframes tabEnterR {
          from {
            opacity: 0;
            transform: perspective(900px) rotateY(-28deg) translateX(60px) scale(0.92);
          }
          to {
            opacity: 1;
            transform: perspective(900px) rotateY(0deg) translateX(0) scale(1);
          }
        }
        @keyframes tabEnterL {
          from {
            opacity: 0;
            transform: perspective(900px) rotateY(28deg) translateX(-60px) scale(0.92);
          }
          to {
            opacity: 1;
            transform: perspective(900px) rotateY(0deg) translateX(0) scale(1);
          }
        }
        @keyframes floatDot {
          from { transform: translateY(0px) translateX(0px); }
          to   { transform: translateY(-14px) translateX(8px); }
        }
        @keyframes featureItemIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </section>
  );
}
