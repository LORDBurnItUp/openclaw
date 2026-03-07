"use client";

import { useEffect, useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// BlackHoleTransition — Cosmic warp animation between login → dashboard
// Sucks everything into a singularity, then explodes into the future
// ═══════════════════════════════════════════════════════════════════════════

interface BlackHoleTransitionProps {
  active: boolean;
  onComplete: () => void;
}

export function BlackHoleTransition({ active, onComplete }: BlackHoleTransitionProps) {
  const [phase, setPhase] = useState<"idle" | "collapse" | "singularity" | "warp" | "arrive">("idle");

  useEffect(() => {
    if (!active) return;
    setPhase("collapse");

    const t1 = setTimeout(() => setPhase("singularity"), 1200);
    const t2 = setTimeout(() => setPhase("warp"), 2200);
    const t3 = setTimeout(() => setPhase("arrive"), 3600);
    const t4 = setTimeout(() => {
      setPhase("idle");
      onComplete();
    }, 4800);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [active, onComplete]);

  if (phase === "idle") return null;

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none overflow-hidden">
      {/* Phase 1: Gravitational collapse — everything spirals inward */}
      {(phase === "collapse" || phase === "singularity") && (
        <>
          {/* Radial distortion rings */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 rounded-full border"
              style={{
                width: `${(i + 1) * 150}px`,
                height: `${(i + 1) * 150}px`,
                transform: "translate(-50%, -50%)",
                borderColor: `rgba(${120 + i * 15}, ${50 + i * 20}, ${200 + i * 7}, ${0.3 - i * 0.03})`,
                animation: `bhRingCollapse 1.5s ${i * 0.1}s cubic-bezier(0.55, 0.06, 0.68, 0.19) forwards`,
              }}
            />
          ))}

          {/* Accretion disk glow */}
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              width: 600,
              height: 600,
              transform: "translate(-50%, -50%)",
              background: "conic-gradient(from 0deg, rgba(34,211,238,0.4), rgba(168,85,247,0.5), rgba(239,68,68,0.3), rgba(34,211,238,0.4))",
              borderRadius: "50%",
              filter: "blur(30px)",
              animation: "bhAccretionSpin 1.5s linear forwards, bhAccretionCollapse 1.8s 0.3s cubic-bezier(0.55, 0.06, 0.68, 0.19) forwards",
            }}
          />

          {/* Dark vignette pulling inward */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.95) 70%)",
              animation: "bhVignette 1.8s ease-in forwards",
            }}
          />

          {/* Particle debris */}
          {[...Array(30)].map((_, i) => {
            const angle = (i / 30) * 360;
            const dist = 200 + Math.random() * 400;
            const x = Math.cos((angle * Math.PI) / 180) * dist;
            const y = Math.sin((angle * Math.PI) / 180) * dist;
            return (
              <div
                key={`p${i}`}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: 2 + Math.random() * 4,
                  height: 2 + Math.random() * 4,
                  borderRadius: "50%",
                  background: i % 3 === 0 ? "#22d3ee" : i % 3 === 1 ? "#a78bfa" : "#f59e0b",
                  boxShadow: `0 0 ${6 + Math.random() * 10}px currentColor`,
                  transform: `translate(${x}px, ${y}px)`,
                  animation: `bhParticle 1.5s ${i * 0.04}s cubic-bezier(0.55, 0.06, 0.68, 0.19) forwards`,
                }}
              />
            );
          })}
        </>
      )}

      {/* Phase 2: Singularity — total darkness with a single point of light */}
      {phase === "singularity" && (
        <>
          <div className="absolute inset-0 bg-black" style={{ animation: "bhDarken 0.5s ease-in forwards" }} />
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#fff",
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 30px #22d3ee, 0 0 60px #a78bfa, 0 0 120px rgba(255,255,255,0.5)",
              animation: "bhSingularity 1s ease-in-out forwards",
            }}
          />
        </>
      )}

      {/* Phase 3: Warp tunnel — hyperspace through spacetime */}
      {phase === "warp" && (
        <>
          <div className="absolute inset-0 bg-black" />
          {/* Starfield streaks */}
          {[...Array(60)].map((_, i) => {
            const angle = (i / 60) * 360;
            return (
              <div
                key={`s${i}`}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: 1,
                  height: 1,
                  background: i % 4 === 0 ? "#22d3ee" : i % 4 === 1 ? "#a78bfa" : i % 4 === 2 ? "#34d399" : "#fff",
                  transformOrigin: "center",
                  transform: `rotate(${angle}deg) translateY(-2px)`,
                  animation: `bhStarStreak 1.4s ${i * 0.015}s ease-in forwards`,
                  boxShadow: "0 0 4px currentColor",
                }}
              />
            );
          })}

          {/* Warp tunnel rings */}
          {[...Array(12)].map((_, i) => (
            <div
              key={`w${i}`}
              className="absolute left-1/2 top-1/2 rounded-full border"
              style={{
                width: 10 + i * 5,
                height: 10 + i * 5,
                transform: "translate(-50%, -50%)",
                borderColor: `rgba(34, 211, 238, ${0.6 - i * 0.04})`,
                animation: `bhWarpRing 1.4s ${i * 0.08}s ease-out forwards`,
              }}
            />
          ))}

          {/* Center glow expanding */}
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              background: "radial-gradient(circle, #fff 0%, #22d3ee 30%, #a78bfa 60%, transparent 100%)",
              animation: "bhCenterExpand 1.4s ease-out forwards",
            }}
          />
        </>
      )}

      {/* Phase 4: Arrival — new universe materialize */}
      {phase === "arrive" && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at 50% 50%, rgba(34,211,238,0.3) 0%, rgba(128,0,255,0.15) 40%, rgba(0,0,0,0.95) 80%)",
              animation: "bhArrival 1.2s ease-out forwards",
            }}
          />
          {/* "Welcome to the future" text */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ animation: "bhTextReveal 1.2s ease-out forwards" }}
          >
            <p
              className="text-3xl font-black tracking-[0.35em] text-cyan-200"
              style={{
                textShadow: "0 0 30px rgba(34,211,238,1), 0 0 80px rgba(0,255,200,0.6), 0 0 120px rgba(128,0,255,0.4)",
              }}
            >
              UNIVERSE SHIFT
            </p>
            <p
              className="mt-3 text-sm font-bold tracking-[0.5em] text-violet-300"
              style={{ textShadow: "0 0 20px rgba(167,139,250,1)" }}
            >
              ⚡ FUTURE SYSTEMS ONLINE ⚡
            </p>
            <div className="mt-4 flex gap-2">
              {["NEURAL", "QUANTUM", "SINGULARITY"].map((w) => (
                <span
                  key={w}
                  className="rounded-full border border-cyan-400/50 px-3 py-1 text-[10px] font-semibold tracking-widest text-cyan-300"
                  style={{ background: "rgba(34,211,238,0.1)" }}
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes bhRingCollapse {
          0%   { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(0) rotate(720deg); opacity: 0; }
        }
        @keyframes bhAccretionSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes bhAccretionCollapse {
          0%   { width: 600px; height: 600px; opacity: 1; }
          100% { width: 0px; height: 0px; opacity: 0; }
        }
        @keyframes bhVignette {
          0%   { background: radial-gradient(circle, transparent 60%, rgba(0,0,0,0.3) 100%); }
          100% { background: radial-gradient(circle, rgba(0,0,0,0.9) 0%, rgba(0,0,0,1) 30%); }
        }
        @keyframes bhParticle {
          0%   { opacity: 1; }
          100% { transform: translate(0, 0); opacity: 0; }
        }
        @keyframes bhDarken {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes bhSingularity {
          0%   { width: 6px; height: 6px; box-shadow: 0 0 30px #22d3ee; }
          50%  { width: 12px; height: 12px; box-shadow: 0 0 60px #22d3ee, 0 0 120px #a78bfa, 0 0 200px #fff; }
          100% { width: 4px; height: 4px; box-shadow: 0 0 100px #fff, 0 0 200px #22d3ee; }
        }
        @keyframes bhStarStreak {
          0%   { height: 1px; opacity: 0; }
          20%  { opacity: 1; }
          100% { height: 300px; opacity: 0; transform: rotate(inherit) translateY(-350px); }
        }
        @keyframes bhWarpRing {
          0%   { opacity: 0; }
          20%  { opacity: 1; }
          100% { width: 3000px; height: 3000px; opacity: 0; }
        }
        @keyframes bhCenterExpand {
          0%   { width: 20px; height: 20px; opacity: 1; }
          100% { width: 4000px; height: 4000px; opacity: 0; }
        }
        @keyframes bhArrival {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes bhTextReveal {
          0%   { opacity: 0; transform: scale(0.7); }
          30%  { opacity: 1; transform: scale(1.05); }
          80%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
