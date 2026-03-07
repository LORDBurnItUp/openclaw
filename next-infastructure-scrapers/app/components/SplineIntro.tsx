"use client";

import { Application } from "@splinetool/runtime";
import type { SplineEvent } from "@splinetool/runtime";
import { useEffect, useRef, useState, useCallback } from "react";

interface SplineIntroProps {
  splineUrl?: string;
  onDone: () => void;
  autoCompleteMs?: number;
}

// Default Spline URL - quantum/neural themed scene
const DEFAULT_SPLINE_URL = "https://prod.spline.design/kMWi1sxpCPiTM5ha/scene.splinecode";

export function SplineIntro({
  splineUrl = DEFAULT_SPLINE_URL,
  onDone,
  autoCompleteMs = 6000,
}: SplineIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onDoneRef = useRef(onDone);
  const hasCompletedRef = useRef(false);

  // Keep onDone callback ref updated
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (appRef.current) {
      appRef.current.dispose();
      appRef.current = null;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isMounted = true;

    const initSpline = async () => {
      try {
        const app = new Application(canvas);
        appRef.current = app;

        await app.load(splineUrl);

        if (!isMounted) {
          cleanup();
          return;
        }

        setIsLoading(false);

        // ── Code API: Push initial variables into the Spline scene ──
        try {
          app.setVariable("systemStatus", "online");
          app.setVariable("agentCount", 7);
          app.setVariable("aiModel", "claude-sonnet-4-6");
          app.setVariable("memoryHealth", 98);
          app.setVariable("engineName", "OpenClaw v2.0");
        } catch {
          // Variables may not exist in scene — non-critical
        }

        // ── Code API: Listen for mouse interactions ──
        app.addEventListener("mouseDown", (e: SplineEvent) => {
          if (e.target) {
            console.log("[SplineIntro] Object clicked:", e.target.name);
          }
        });

        // ── Code API: Poll /api/spline for real-time data ──
        const dataPollInterval = setInterval(async () => {
          if (!appRef.current) return;
          try {
            const res = await fetch("/api/spline", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ channel: "status" }),
            });
            const data = await res.json();
            if (data.ok && appRef.current) {
              try {
                appRef.current.setVariable("memoryHealth", data.data.memoryHealth ?? 98);
                appRef.current.setVariable("uptime", data.data.uptimeFormatted ?? "0s");
                appRef.current.setVariable("agentCount", data.data.variableCount ?? 0);
              } catch {
                // Variables may not exist — non-critical
              }
            }
          } catch {
            // Silent — polling failure shouldn't break intro
          }
        }, 10_000);

        // Set up auto-complete timer
        const autoCompleteTimer = setTimeout(() => {
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            onDoneRef.current();
          }
        }, autoCompleteMs);

        return () => {
          clearTimeout(autoCompleteTimer);
          clearInterval(dataPollInterval);
        };
      } catch (err) {
        if (!isMounted) return;
        
        console.error("Failed to load Spline scene:", err);
        setError(err instanceof Error ? err.message : "Failed to load scene");
        setIsLoading(false);
        
        // Still call onDone after a delay even on error
        setTimeout(() => {
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            onDoneRef.current();
          }
        }, 3000);
      }
    };

    initSpline();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [splineUrl, autoCompleteMs, cleanup]);

  // Handle skip button click
  const handleSkip = useCallback(() => {
    if (!hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onDoneRef.current();
    }
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "#030305",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {/* ── Technical Overlays ── */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {/* Grain/Noise */}
        <div className="noise-overlay" />
        {/* Scanlines */}
        <div className="scanline-overlay" />
        {/* Vignette */}
        <div className="vignette-overlay" />
      </div>

      {/* ── HUD Elements ── */}
      {!isLoading && !error && (
        <div className="hud-container pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-8 md:p-16">
          <div className="flex justify-between">
            <div className="hud-bracket-tl border-l-2 border-t-2 border-cyan-500/30 p-4">
              <p className="text-[10px] font-bold tracking-[0.3em] text-cyan-500/60 uppercase">System Status</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[12px] font-mono text-emerald-500/80">Neural Core Active</p>
              </div>
            </div>
            <div className="hud-bracket-tr border-r-2 border-t-2 border-cyan-500/30 p-4 text-right">
              <p className="text-[10px] font-bold tracking-[0.3em] text-cyan-500/60 uppercase">Encoding Stream</p>
              <p className="text-[12px] font-mono text-cyan-400/80">0% ... 42% ... 89%</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 text-center">
             <div className="glitch-text text-4xl md:text-6xl font-black tracking-[0.4em] text-white opacity-40">
                VOX<span className="text-cyan-400">CODE</span>
             </div>
             <div className="h-[1px] w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
             <p className="text-[10px] tracking-[0.5em] text-cyan-500/40 uppercase">Orchestrating the Machine</p>
          </div>

          <div className="flex justify-between items-end">
            <div className="hud-bracket-bl border-l-2 border-b-2 border-cyan-500/30 p-4">
              <p className="text-[10px] font-bold tracking-[0.3em] text-cyan-500/60 uppercase">Coordinates</p>
              <p className="text-[12px] font-mono text-cyan-400/70">40.7128° N, 74.0060° W</p>
            </div>
          </div>
        </div>
      )}

      {/* Spline Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          filter: isLoading ? "blur(20px) scale(1.1)" : "none",
          transition: "filter 2s cubic-bezier(0.19, 1, 0.22, 1)",
        }}
      />

      {/* Loading Overlay */}
      {isLoading && !error && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(10, 10, 15, 0.9)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
          }}
        >
          {/* Loading Spinner */}
          <div className="relative">
            <div
              style={{
                width: "80px",
                height: "80px",
                border: "1px solid rgba(34, 211, 238, 0.1)",
                borderTop: "1px solid #22d3ee",
                borderRadius: "50%",
                animation: "spin 2s linear infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                right: "10px",
                bottom: "10px",
                border: "1px solid rgba(128, 0, 255, 0.1)",
                borderBottom: "1px solid #a855f7",
                borderRadius: "50%",
                animation: "spin 1.5s linear infinite reverse",
              }}
            />
          </div>
          
          {/* Loading Text */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                color: "#22d3ee",
                fontSize: "0.75rem",
                fontWeight: 700,
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.4em",
                textTransform: "uppercase",
              }}
            >
              Initializing Neural Core
            </div>
            <div className="loading-dots flex gap-1">
               {[1,2,3].map(i => (
                 <div key={i} className={`h-1 w-1 bg-cyan-500/50 rounded-full animate-pulse delay-${i*200}`} />
               ))}
            </div>
          </div>

          <style jsx>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .loading-dots div:nth-child(1) { animation-delay: 0ms; }
            .loading-dots div:nth-child(2) { animation-delay: 300ms; }
            .loading-dots div:nth-child(3) { animation-delay: 600ms; }
          `}</style>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(10, 10, 15, 0.95)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
          }}
        >
          <div style={{ color: "#f87171", fontSize: "1rem" }}>
            {error}
          </div>
          <button
            onClick={handleSkip}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#22d3ee",
              color: "#0a0a0f",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Continue
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <button
          onClick={handleSkip}
          className="group"
          style={{
            position: "absolute",
            bottom: "3rem",
            right: "3rem",
            padding: "0.75rem 2rem",
            background: "rgba(34, 211, 238, 0.05)",
            color: "#67e8f9",
            border: "1px solid rgba(34, 211, 238, 0.2)",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontFamily: "monospace",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            transition: "all 0.5s cubic-bezier(0.19, 1, 0.22, 1)",
            zIndex: 100,
            backdropFilter: "blur(4px)",
            boxShadow: "0 0 20px rgba(0,0,0,0.5)",
          }}
        >
          <span className="relative z-10 transition-colors group-hover:text-white">Skip Handshake</span>
          <div className="absolute inset-0 bg-cyan-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        </button>
      )}

      {/* ── Global Component Styles ── */}
      <style jsx global>{`
        .noise-overlay {
          position: absolute;
          inset: 0;
          background-image: url("https://grainy-gradients.vercel.app/noise.svg");
          opacity: 0.05;
          mix-blend-mode: overlay;
        }
        .scanline-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(18, 16, 16, 0) 50%,
            rgba(0, 0, 0, 0.1) 50%
          );
          background-size: 100% 4px;
          z-index: 100;
          pointer-events: none;
        }
        .vignette-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%);
        }
        .hud-bracket-tl { border-bottom: none; border-right: none; width: 120px; }
        .hud-bracket-tr { border-bottom: none; border-left: none; width: 120px; }
        .hud-bracket-bl { border-top: none; border-right: none; width: 120px; }
        
        .glitch-text {
          animation: glitch 5s infinite;
        }
        @keyframes glitch {
          0%, 90%, 100% { transform: translate(0); text-shadow: none; }
          91% { transform: translate(-2px, -1px); text-shadow: 2px 0 #f0f, -2px 0 #0ff; }
          93% { transform: translate(2px, 1px); text-shadow: -2px 0 #f0f, 2px 0 #0ff; }
          95% { transform: translate(-1px, 2px); }
        }
      `}</style>
    </div>
  );
}

export default SplineIntro;
