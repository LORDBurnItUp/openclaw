"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "./Button";
import { LanguageSwitcher } from "./LanguageSwitcher";

const NAV_ITEMS = [
  { href: "#features",      label: "Features" },
  { href: "#how-it-works",  label: "How it works" },
  { href: "#pricing",       label: "Pricing" },
  { href: "#faq",           label: "FAQ" },
];

const BRAND = Array.from("VoxCode");

export function Navbar() {
  const [phase, setPhase] = useState<"idle" | "entrance" | "slow">("idle");
  const [tilt, setTilt]   = useState({ x: 0, y: 0 });
  const headerRef = useRef<HTMLElement>(null);

  // 1. Entrance spin on mount, then switch to slow continuous
  useEffect(() => {
    setPhase("entrance");
    const t = setTimeout(() => setPhase("slow"), 950);
    return () => clearTimeout(t);
  }, []);

  // 2. Mouse-parallax tilt on the whole nav
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = headerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setTilt({
        x:  ((e.clientX - r.left) / r.width  - 0.5) * 5,
        y: -((e.clientY - r.top)  / r.height - 0.5) * 2.5,
      });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const badgeAnim =
    phase === "entrance" ? "voxSpin 0.95s cubic-bezier(0.34,1.56,0.64,1) both" :
    phase === "slow"     ? "voxSpinSlow 9s linear infinite" :
    "none";

  return (
    <header ref={headerRef} className="sticky top-4 z-30 flex justify-center px-4">
      <nav
        className="flex w-full max-w-6xl items-center justify-between rounded-full border border-slate-800/80 bg-slate-950/85 px-5 py-2.5 shadow-lg backdrop-blur-xl"
        style={{
          transform: `perspective(700px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
          transition: "transform 0.1s linear",
          transformStyle: "preserve-3d",
          boxShadow: "0 0 0 1px rgba(51,65,85,0.6), 0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* ── Brand ── */}
        <Link href="#top" className="flex items-center gap-2.5 cursor-pointer select-none">

          {/* Spinning V badge */}
          <span
            className="relative inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400 text-slate-950 text-sm font-black"
            style={{
              animation: badgeAnim,
              boxShadow: "0 0 20px rgba(34,211,238,0.55), 0 0 40px rgba(34,211,238,0.2)",
            }}
          >
            V
            {/* Pulse ring */}
            <span
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ animation: "voxGlow 2.5s ease-in-out infinite", background: "rgba(34,211,238,0.35)" }}
            />
          </span>

          {/* Letter-cascade "VoxCode" */}
          <span
            className="flex text-sm font-bold text-slate-100 tracking-tight"
            style={{ perspective: "300px", perspectiveOrigin: "center 50%" }}
          >
            {BRAND.map((ch, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  animation:
                    phase !== "idle"
                      ? `voxLetterIn 0.55s cubic-bezier(0.22,1,0.36,1) ${0.04 + i * 0.055}s both`
                      : "none",
                }}
              >
                {ch}
              </span>
            ))}
          </span>

          {/* Tagline */}
          <span
            className="hidden text-[10px] font-normal text-slate-500 sm:inline"
            style={{ animation: phase !== "idle" ? "voxFadeSlide 0.5s ease 0.5s both" : "none" }}
          >
            voice coding SaaS
          </span>
        </Link>

        {/* ── Nav links ── */}
        <div className="hidden items-center gap-5 text-xs font-medium md:flex">
          {NAV_ITEMS.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              className="text-slate-400 hover:text-cyan-300 transition-colors duration-150"
              style={{
                animation:
                  phase !== "idle"
                    ? `voxFadeSlide 0.4s ease ${0.25 + i * 0.05}s both`
                    : "none",
              }}
            >
              {item.label}
            </a>
          ))}
          <Link
            href="/login"
            className="text-slate-500 hover:text-cyan-300 transition-colors duration-150"
            style={{ animation: phase !== "idle" ? "voxFadeSlide 0.4s ease 0.55s both" : "none" }}
          >
            Login
          </Link>
        </div>

        {/* ── CTA ── */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button
            className="hidden text-xs md:inline-flex"
            style={
              { animation: phase !== "idle" ? "voxFadeSlide 0.4s ease 0.6s both" : "none" } as React.CSSProperties
            }
          >
            Start for $1/month
          </Button>
          <Button variant="ghost" className="text-xs md:hidden">
            Start
          </Button>
        </div>
      </nav>

      {/* ── Keyframes ── */}
      <style>{`
        /* Initial dramatic spin: 2 full rotations with elastic overshoot */
        @keyframes voxSpin {
          from { transform: rotate(0deg)   scale(0.35); opacity: 0; }
          12%  {                                         opacity: 1; }
          55%  { transform: rotate(800deg) scale(1.18); }
          to   { transform: rotate(720deg) scale(1); }
        }
        /* Then continues slowly — 720deg = 0deg visually, seamless */
        @keyframes voxSpinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        /* Expanding glow ring */
        @keyframes voxGlow {
          0%, 100% { transform: scale(1);   opacity: 0.35; }
          50%       { transform: scale(1.9); opacity: 0;    }
        }
        /* Letters drop in from above with 3-D flip */
        @keyframes voxLetterIn {
          from { opacity: 0; transform: translateY(-13px) rotateX(-80deg); }
          to   { opacity: 1; transform: translateY(0)     rotateX(0deg);   }
        }
        /* Generic slide-up fade for nav items + tagline */
        @keyframes voxFadeSlide {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}
