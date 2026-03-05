"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { FeatureTabsUniverse } from "./components/FeatureTabsUniverse";
import { HowItWorks } from "./components/HowItWorks";
import { Pricing } from "./components/Pricing";
import { Faq } from "./components/Faq";
import { Footer } from "./components/Footer";
import { VoxcodeConsole } from "./components/VoxcodeConsole";
import { IntegrationsPanel } from "./components/IntegrationsPanel";
import { Download } from "./components/Download";

// Heavy WebGL/Canvas components — dynamically loaded, no SSR (SolidJS-inspired lazy evaluation)
const QuantumCore     = dynamic(() => import("./components/QuantumCore").then(m => ({ default: m.QuantumCore })), { ssr: false, loading: () => <div style={{ height: 600 }} /> });
const FuturisticScene = dynamic(() => import("./components/FuturisticScene").then(m => ({ default: m.FuturisticScene })), { ssr: false });
import { ClawBar } from "./components/ClawBar";
import { ClawAssistant } from "./components/ClawAssistant";
import { GhostHint } from "./components/GhostHint";
import { ClawTerminal } from "./components/ClawTerminal";
import { AmbientPlayer } from "./components/AmbientPlayer";
import { FGWallet } from "./components/FGWallet";
import { DouglasCam } from "./components/DouglasCam";
import { OllamaAgent } from "./components/OllamaAgent";
import { CinematicIntro } from "./components/CinematicIntro";
import { GemParticles } from "./components/GemParticles";

export default function Home() {
  const [introDone, setIntroDone] = useState(false);
  const [leapFlash, setLeapFlash] = useState(false);

  useEffect(() => {
    if (!introDone) return;
    setLeapFlash(true);
    const t = setTimeout(() => setLeapFlash(false), 2200);
    return () => clearTimeout(t);
  }, [introDone]);

  return (
    <>
      {/* ── Cinematic intro — fullscreen until done ── */}
      {!introDone && <CinematicIntro onDone={() => setIntroDone(true)} />}

      {/* ── Quantum Leap flash — fires the instant intro ends ── */}
      {leapFlash && (
        <div
          className="pointer-events-none fixed inset-0 z-[9998] flex flex-col items-center justify-center"
          style={{ animation: "leapFadeOut 2.2s ease-out forwards" }}
        >
          <div style={{ animation: "leapBurst 2.2s ease-out forwards", background: "radial-gradient(ellipse at center, rgba(34,211,238,0.6) 0%, rgba(0,255,128,0.3) 30%, rgba(128,0,255,0.15) 60%, transparent 80%)", position: "absolute", inset: 0 }} />
          <div className="relative flex flex-col items-center gap-3">
            <p className="text-4xl font-black tracking-[0.35em] text-cyan-200" style={{ textShadow: "0 0 30px rgba(34,211,238,1), 0 0 80px rgba(0,255,200,0.8), 0 0 120px rgba(128,0,255,0.6)", animation: "leapTitle 2.2s ease-out forwards" }}>
              QUANTUM LEAP
            </p>
            <p className="text-sm font-bold tracking-[0.5em] text-emerald-300" style={{ textShadow: "0 0 20px rgba(0,255,128,1)", animation: "leapSub 2.2s ease-out forwards" }}>
              ⚡ VOICE AI — ONLINE ⚡
            </p>
            <div className="mt-2 flex gap-2">
              {["TRANSCRIBE","ENHANCE","DEPLOY"].map(w => (
                <span key={w} className="rounded-full border border-cyan-400/50 px-3 py-1 text-[10px] font-semibold tracking-widest text-cyan-300" style={{ background: "rgba(34,211,238,0.1)", animation: "leapChip 2.2s ease-out forwards" }}>
                  {w}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Persistent floating gem particles (always visible after intro) ── */}
      {introDone && <GemParticles />}

      {/* ── Main site ── */}
      <div
        style={{
          opacity:   introDone ? 1 : 0,
          transform: introDone ? "none" : "translateY(40px) rotateY(6deg)",
          transition: introDone
            ? "opacity 1.2s ease, transform 1.4s cubic-bezier(0.22,1,0.36,1)"
            : "none",
          animation: introDone ? "siteFloat 6s ease-in-out infinite alternate" : "none",
        }}
      >
        <FuturisticScene />

        {/* RGB glow ring around the whole viewport */}
        <div
          className="pointer-events-none fixed inset-0 z-[35]"
          style={{ animation: introDone ? "rgbBorder 4s linear infinite" : "none" }}
        />

        <div className="min-h-screen bg-gradient-to-b from-slate-950/90 via-slate-950/90 to-slate-950/95 text-slate-50">
          <Navbar />
          <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-8">
            <HeroSection />
            <IntegrationsPanel />
            <VoxcodeConsole autoStart={introDone} />
            <FeatureTabsUniverse />
            <Suspense fallback={<div style={{ height: 600 }} />}>
              <QuantumCore />
            </Suspense>
            <HowItWorks />
            <Download />
            <Pricing />
            <Faq />
          </main>
          <Footer />

          {/* Global floating UI */}
          <ClawBar />
          <ClawAssistant />
          <GhostHint />
          <ClawTerminal />
          {/* New panels */}
          <AmbientPlayer />
          <FGWallet />
          <DouglasCam />
          <OllamaAgent />
        </div>
      </div>

      {/* Global keyframes */}
      <style>{`
        /* Gentle floating drift for the entire site */
        @keyframes siteFloat {
          0%   { transform: translateY(0px)   rotate(0deg)    scale(1);      }
          25%  { transform: translateY(-6px)  rotate(0.08deg) scale(1.001);  }
          50%  { transform: translateY(-10px) rotate(-0.05deg) scale(1.0015);}
          75%  { transform: translateY(-5px)  rotate(0.06deg) scale(1.001);  }
          100% { transform: translateY(0px)   rotate(0deg)    scale(1);      }
        }

        /* RGB border shimmer around viewport */
        @keyframes rgbBorder {
          0%   { box-shadow: inset 0 0 0 3px rgba(255,0,128,0.35),  inset 0 0 40px rgba(255,0,128,0.08);   }
          16%  { box-shadow: inset 0 0 0 3px rgba(255,64,0,0.35),   inset 0 0 40px rgba(255,64,0,0.08);    }
          33%  { box-shadow: inset 0 0 0 3px rgba(0,255,128,0.35),  inset 0 0 40px rgba(0,255,128,0.08);   }
          50%  { box-shadow: inset 0 0 0 3px rgba(0,128,255,0.35),  inset 0 0 40px rgba(0,128,255,0.08);   }
          66%  { box-shadow: inset 0 0 0 3px rgba(128,0,255,0.35),  inset 0 0 40px rgba(128,0,255,0.08);   }
          83%  { box-shadow: inset 0 0 0 3px rgba(255,255,0,0.35),  inset 0 0 40px rgba(255,255,0,0.08);   }
          100% { box-shadow: inset 0 0 0 3px rgba(255,0,128,0.35),  inset 0 0 40px rgba(255,0,128,0.08);   }
        }

        /* Parallax-style scroll glow on sections */
        section {
          transition: transform 0.1s linear;
        }

        /* Quantum Leap full-screen flash */
        @keyframes leapFadeOut {
          0%   { opacity: 1; }
          65%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes leapBurst {
          0%   { transform: scale(0.4); opacity: 0; }
          12%  { transform: scale(1.15); opacity: 1; }
          60%  { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.08); opacity: 0; }
        }
        @keyframes leapTitle {
          0%   { opacity: 0; transform: scale(0.5) translateY(20px); letter-spacing: 0.1em; }
          18%  { opacity: 1; transform: scale(1.06) translateY(0); letter-spacing: 0.35em; }
          70%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.95) translateY(-10px); }
        }
        @keyframes leapSub {
          0%,10% { opacity: 0; transform: translateY(10px); }
          25%    { opacity: 1; transform: translateY(0); }
          70%    { opacity: 1; }
          100%   { opacity: 0; }
        }
        @keyframes leapChip {
          0%,20% { opacity: 0; transform: scale(0.7); }
          35%    { opacity: 1; transform: scale(1.05); }
          70%    { opacity: 1; transform: scale(1); }
          100%   { opacity: 0; }
        }
      `}</style>
    </>
  );
}
