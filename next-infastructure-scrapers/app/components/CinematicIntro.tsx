"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Particle ─────────────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; type: "diamond" | "gem" | "rgb";
  r: number; rv: number; alpha: number; fade: number;
  hue: number; gold: boolean;
  drift: boolean; floatPhase: number; floatAmp: number;
}

const GOLD   = ["#ffd700","#ffb800","#ffc500","#ffe566","#ffaa00","#ffcc44"];
const SILVER = ["#c8d8e8","#dde8f5","#b0c8e0","#d0e0f4","#90b8d0","#c0d8f0"];

function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function r01() { return Math.random(); }
function rr(a: number, b: number) { return a + r01() * (b - a); }

// Draw a 4-point diamond with inner sparkle
function dDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, a: number, rot: number) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot);
  ctx.shadowBlur = s * 5; ctx.shadowColor = col;
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(0, -s * 1.5); ctx.lineTo(s * 0.75, 0); ctx.lineTo(0, s * 1.5); ctx.lineTo(-s * 0.75, 0);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath();
  ctx.moveTo(0, -s * 0.55); ctx.lineTo(s * 0.28, 0); ctx.lineTo(0, s * 0.28); ctx.lineTo(-s * 0.28, 0);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Draw a hexagonal gem
function dGem(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, a: number, rot: number) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot);
  ctx.shadowBlur = s * 6; ctx.shadowColor = col;
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = i * Math.PI / 3 - Math.PI / 6;
    i === 0 ? ctx.moveTo(Math.cos(ang) * s, Math.sin(ang) * s) : ctx.lineTo(Math.cos(ang) * s, Math.sin(ang) * s);
  }
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 0.6;
  [0, 2, 4].forEach(i => {
    const a1 = i * Math.PI / 3 - Math.PI / 6;
    const a2 = (i + 3) * Math.PI / 3 - Math.PI / 6;
    ctx.beginPath(); ctx.moveTo(Math.cos(a1) * s, Math.sin(a1) * s);
    ctx.lineTo(Math.cos(a2) * s, Math.sin(a2) * s); ctx.stroke();
  });
  ctx.restore();
}

// Draw a glowing RGB dot
function dRgb(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, hue: number, a: number) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = a;
  const col = `hsl(${hue},100%,65%)`;
  ctx.shadowBlur = s * 8; ctx.shadowColor = col;
  const g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.5);
  g.addColorStop(0, col); g.addColorStop(1, "transparent");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ─── Stars ────────────────────────────────────────────────────────────────────
interface Star { x: number; y: number; z: number; pz: number; }

// ─── Main component ───────────────────────────────────────────────────────────
export function CinematicIntro({ onDone }: { onDone: () => void }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const phaseRef    = useRef(0); // 0=warp 1=approach 2=impact 3=explode 4=settle 5=float 6=done
  const shakeRef    = useRef(0);
  const particleRef = useRef<Particle[]>([]);
  const [cssPhase,  setCssPhase]  = useState(0);
  const [opacity,   setOpacity]   = useState(1);
  const doneFired   = useRef(false);

  const spawnExplosion = useCallback((W: number, H: number) => {
    const cx = W / 2, cy = H / 2;
    const ps: Particle[] = [];

    // Burst particles
    for (let i = 0; i < 380; i++) {
      const ang   = r01() * Math.PI * 2;
      const speed = rr(3, 18);
      const isDiamond = r01() < 0.45;
      const isGem     = !isDiamond && r01() < 0.55;
      ps.push({
        x: cx, y: cy,
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed - rr(0, 5),
        size:  isDiamond ? rr(5, 14) : isGem ? rr(4, 10) : rr(2, 5),
        type:  isDiamond ? "diamond" : isGem ? "gem" : "rgb",
        r: r01() * Math.PI * 2, rv: rr(-0.18, 0.18),
        alpha: 1, fade: rr(0.006, 0.016),
        hue: rr(0, 360), gold: r01() < 0.6,
        drift: false, floatPhase: 0, floatAmp: 0,
      });
    }

    // Persistent floating particles
    for (let i = 0; i < 120; i++) {
      const isDiamond = r01() < 0.5;
      ps.push({
        x: rr(0, W), y: rr(0, H),
        vx: rr(-0.25, 0.25), vy: rr(-0.4, 0.1),
        size: isDiamond ? rr(4, 11) : rr(3, 8),
        type: isDiamond ? "diamond" : "gem",
        r: r01() * Math.PI * 2, rv: rr(-0.012, 0.012),
        alpha: rr(0.35, 0.8), fade: 0,
        hue: 0, gold: r01() < 0.55,
        drift: true, floatPhase: r01() * Math.PI * 2, floatAmp: rr(0.2, 0.7),
      });
    }

    // Persistent RGB glows
    for (let i = 0; i < 60; i++) {
      ps.push({
        x: rr(0, W), y: rr(0, H),
        vx: rr(-0.3, 0.3), vy: rr(-0.5, 0.2),
        size: rr(2, 6),
        type: "rgb",
        r: 0, rv: 0,
        alpha: rr(0.3, 0.7), fade: 0,
        hue: rr(0, 360), gold: false,
        drift: true, floatPhase: r01() * Math.PI * 2, floatAmp: rr(0.3, 1.0),
      });
    }

    particleRef.current = ps;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    // Star field
    const STARS: Star[] = Array.from({ length: 600 }, () => ({
      x: (r01() - 0.5) * 2, y: (r01() - 0.5) * 2,
      z: r01(), pz: r01(),
    }));

    const start = performance.now();
    let raf = 0;
    let impactDone = false;

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2;

      // ── Phase gating ─────────────────────────────────────────────────────────
      if (t > 3.2 && phaseRef.current < 1)  { phaseRef.current = 1; }
      if (t > 4.8 && phaseRef.current < 2)  { phaseRef.current = 2; shakeRef.current = 1; }
      if (t > 5.1 && phaseRef.current < 3)  {
        phaseRef.current = 3;
        if (!impactDone) { spawnExplosion(W, H); impactDone = true; }
        setCssPhase(3);
      }
      if (t > 7.5 && phaseRef.current < 4)  { phaseRef.current = 4; setCssPhase(4); }
      if (t > 9.5 && phaseRef.current < 5)  { phaseRef.current = 5; setCssPhase(5); }
      if (t > 11.5 && phaseRef.current < 6 && !doneFired.current) {
        phaseRef.current = 6;
        doneFired.current = true;
        setOpacity(0);
        setTimeout(onDone, 900);
      }

      // ── Screen shake ──────────────────────────────────────────────────────────
      let sx = 0, sy = 0;
      if (shakeRef.current > 0) {
        sx = (r01() - 0.5) * shakeRef.current * 24;
        sy = (r01() - 0.5) * shakeRef.current * 24;
        shakeRef.current = Math.max(0, shakeRef.current - 0.028);
      }

      // ── Clear ─────────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = `rgba(0,0,8,${Math.min(1, t / 0.4)})`;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(sx, sy);

      // ── Star warp ─────────────────────────────────────────────────────────────
      const ph = phaseRef.current;
      if (ph <= 1) {
        const spd = ph === 0
          ? 0.012 + t * 0.005
          : 0.025 + (t - 3.2) * 0.055;
        STARS.forEach(s => {
          s.pz = s.z; s.z -= spd;
          if (s.z <= 0) { s.z = 1; s.x = (r01() - 0.5) * 2; s.y = (r01() - 0.5) * 2; s.pz = 1; }
          const px = (s.x / s.pz) * cx + cx, py = (s.y / s.pz) * cy + cy;
          const nx = (s.x / s.z)  * cx + cx, ny = (s.y / s.z)  * cy + cy;
          const br = Math.floor((1 - s.z) * 220) + 35;
          const lw = Math.max(0.5, (1 - s.z) * 2.8);
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${br},${br},${Math.min(255, br + 90)},${(1 - s.z) * 0.95})`;
          ctx.lineWidth = lw;
          ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
        });
      }

      // ── Earth approach ────────────────────────────────────────────────────────
      if (ph === 1) {
        const prog = Math.min(1, (t - 3.2) / 1.6);
        const earthR = 60 + prog * 380;
        const ea = prog;

        // Outer atmosphere glow
        for (let layer = 3; layer >= 0; layer--) {
          const lr = earthR * (1.4 + layer * 0.18);
          const la = ea * (0.15 - layer * 0.03);
          const ag = ctx.createRadialGradient(cx, cy, earthR * 0.95, cx, cy, lr);
          ag.addColorStop(0, `rgba(80,180,255,${la * 1.2})`);
          ag.addColorStop(0.5, `rgba(40,100,220,${la * 0.5})`);
          ag.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(cx, cy, lr, 0, Math.PI * 2); ctx.fill();
        }

        // Earth body
        const eg = ctx.createRadialGradient(cx - earthR * 0.28, cy - earthR * 0.28, 0, cx, cy, earthR);
        eg.addColorStop(0,   `rgba(100,170,255,${ea})`);
        eg.addColorStop(0.35,`rgba(30,90,200,${ea})`);
        eg.addColorStop(0.65,`rgba(15,55,140,${ea})`);
        eg.addColorStop(1,   `rgba(4,18,55,${ea})`);
        ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(cx, cy, earthR, 0, Math.PI * 2); ctx.fill();

        // Cloud wisps
        ctx.save(); ctx.globalAlpha = ea * 0.28;
        const clouds: [number,number,number,number][] = [
          [0.18, -0.28, 0.35, 0.08],
          [-0.15, 0.12, 0.28, 0.07],
          [0.35,  0.18, 0.22, 0.06],
          [-0.28,-0.10, 0.32, 0.07],
        ];
        clouds.forEach(([dx, dy, rx, ry]) => {
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.beginPath();
          ctx.ellipse(cx + dx * earthR, cy + dy * earthR, earthR * rx, earthR * ry, Math.atan2(dy, dx), 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();

        // Surface glitter
        if (prog > 0.5) {
          const gp = (prog - 0.5) * 2;
          for (let i = 0; i < 18; i++) {
            const ang = (i / 18) * Math.PI * 2 + t * 0.3;
            const dist = earthR * (0.4 + Math.sin(t * 2 + i) * 0.35);
            const gx = cx + Math.cos(ang) * dist, gy = cy + Math.sin(ang) * dist * 0.7;
            const hue = (i * 40 + t * 60) % 360;
            ctx.save(); ctx.globalAlpha = gp * (0.4 + Math.sin(t * 4 + i) * 0.3);
            ctx.shadowBlur = 12; ctx.shadowColor = `hsl(${hue},100%,70%)`;
            ctx.fillStyle = `hsl(${hue},100%,70%)`;
            ctx.beginPath(); ctx.arc(gx, gy, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
          }
        }
      }

      // ── Impact flash + shockwave ──────────────────────────────────────────────
      if (ph === 2) {
        const ti = t - 4.8;
        const fa = Math.max(0, 1 - ti * 3.5);
        ctx.fillStyle = `rgba(255,255,255,${fa})`; ctx.fillRect(0, 0, W, H);

        // RGB shockwaves
        for (let ring = 0; ring < 5; ring++) {
          const ringR = ti * 700 + ring * 120;
          const ra = Math.max(0, (0.9 - ti * 3) - ring * 0.15);
          const hue = (ring * 72 + t * 300) % 360;
          ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${hue},100%,70%,${ra})`;
          ctx.lineWidth = 6 - ring; ctx.stroke();
        }
      }

      // ── Particles ─────────────────────────────────────────────────────────────
      if (ph >= 3) {
        // Spawn fresh ambient glows
        if (ph < 6 && r01() < 0.4) {
          particleRef.current.push({
            x: r01() * W, y: H + 5,
            vx: (r01() - 0.5) * 1.2, vy: -(rr(0.5, 2.5)),
            size: rr(2, 5), type: "rgb",
            r: 0, rv: 0, alpha: rr(0.4, 0.8), fade: rr(0.003, 0.007),
            hue: rr(0, 360), gold: false,
            drift: false, floatPhase: 0, floatAmp: 0,
          });
        }

        particleRef.current = particleRef.current.filter(p => p.drift || p.alpha > 0.01);
        particleRef.current.forEach(p => {
          if (p.drift) {
            const drift = Math.sin(t * 0.55 + p.floatPhase) * p.floatAmp;
            p.x += p.vx + drift; p.y += p.vy;
            p.r += p.rv;
            if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
            if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
            const fa = p.alpha * (0.55 + Math.sin(t * 1.1 + p.floatPhase) * 0.3);
            const col = p.type === "diamond"
              ? (p.gold ? rnd(GOLD) : rnd(SILVER))
              : rnd(SILVER);
            if (p.type === "diamond")      dDiamond(ctx, p.x, p.y, p.size, col, fa, p.r);
            else if (p.type === "gem")     dGem(ctx, p.x, p.y, p.size, col, fa, p.r);
            else                           dRgb(ctx, p.x, p.y, p.size, (p.hue + t * 40) % 360, fa);
          } else {
            p.x += p.vx; p.y += p.vy; p.vy += 0.08;
            p.r += p.rv; p.alpha -= p.fade;
            const col = p.type === "diamond"
              ? (p.gold ? rnd(GOLD) : rnd(SILVER))
              : p.type === "gem" ? rnd(SILVER) : "";
            if (p.type === "diamond")  dDiamond(ctx, p.x, p.y, p.size, col, p.alpha, p.r);
            else if (p.type === "gem") dGem(ctx, p.x, p.y, p.size, col, p.alpha, p.r);
            else                       dRgb(ctx, p.x, p.y, p.size, (p.hue + t * 50) % 360, p.alpha);
          }
        });
      }

      // ── RGB border glow ───────────────────────────────────────────────────────
      if (ph >= 3) {
        const hue  = (t * 55) % 360;
        const bAlp = ph === 5 ? 0.18 : 0.4;
        ctx.save();
        for (let b = 0; b < 3; b++) {
          const h2 = (hue + b * 120) % 360;
          ctx.strokeStyle = `hsla(${h2},100%,65%,${bAlp - b * 0.08})`;
          ctx.lineWidth = 5 - b * 1.5;
          ctx.strokeRect(2 + b, 2 + b, W - 4 - b * 2, H - 4 - b * 2);
        }
        ctx.restore();
      }

      ctx.restore();

      if (phaseRef.current < 6) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [onDone, spawnExplosion]);

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ opacity, transition: "opacity 0.9s ease", background: "#00000f" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block" />

      {/* ── VoxCode crash-in title ── */}
      {cssPhase >= 3 && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{
            animation: "vcCrashIn 1.1s cubic-bezier(0.2,1.4,0.4,1) forwards",
            perspective: "800px",
          }}
        >
          <div style={{ animation: "vcFloat 3.5s ease-in-out infinite alternate" }}>
            {/* Outer RGB glow ring */}
            <div
              className="absolute -inset-8 rounded-full blur-3xl opacity-60"
              style={{ animation: "vcRgbBg 3s linear infinite" }}
            />
            <div className="relative text-center">
              <div
                className="text-[clamp(60px,12vw,110px)] font-black tracking-tighter leading-none select-none"
                style={{
                  background: "linear-gradient(135deg,#22d3ee 0%,#a78bfa 40%,#f472b6 70%,#fbbf24 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  animation: "vcRgbText 2.5s linear infinite",
                  filter: "drop-shadow(0 0 40px rgba(34,211,238,0.9))",
                }}
              >
                VoxCode
              </div>
              <div
                className="mt-3 text-xs font-semibold tracking-[0.4em] uppercase"
                style={{ color: "rgba(148,163,184,0.8)", animation: "vcFadeIn 1s 0.5s ease both" }}
              >
                Voice · AI · Code
              </div>
              {/* Gem row */}
              <div className="mt-4 flex justify-center gap-3" style={{ animation: "vcFadeIn 1s 0.8s ease both" }}>
                {["#ffd700","#a78bfa","#22d3ee","#f472b6","#34d399"].map((c, i) => (
                  <span
                    key={i}
                    className="inline-block h-3 w-3 rotate-45"
                    style={{
                      background: c,
                      boxShadow: `0 0 12px ${c}, 0 0 24px ${c}`,
                      animation: `vcGemPulse 1.2s ${i * 0.15}s ease-in-out infinite alternate`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skip */}
      <button
        type="button"
        onClick={() => { if (!doneFired.current) { doneFired.current = true; setOpacity(0); setTimeout(onDone, 700); }}}
        className="absolute bottom-8 right-8 rounded-xl border border-slate-700/50 bg-slate-950/60 px-4 py-2 text-xs text-slate-500 hover:text-slate-300 backdrop-blur-sm transition-all"
      >
        Skip intro →
      </button>

      <style>{`
        @keyframes vcCrashIn {
          from { transform: translateY(-120vh) scale(5) rotate(12deg); opacity:0; filter:blur(30px); }
          70%  { transform: translateY(6%)     scale(1.04) rotate(-1.5deg); opacity:1; filter:blur(0); }
          to   { transform: translateY(0)      scale(1)    rotate(0deg);    opacity:1; }
        }
        @keyframes vcFloat {
          from { transform: translateY(0px)    rotate(-0.4deg); }
          to   { transform: translateY(-14px)  rotate(0.4deg);  }
        }
        @keyframes vcRgbText {
          0%   { filter: drop-shadow(0 0 35px rgba(34,211,238,0.95)); }
          33%  { filter: drop-shadow(0 0 35px rgba(167,139,250,0.95)); }
          66%  { filter: drop-shadow(0 0 35px rgba(244,114,182,0.95)); }
          100% { filter: drop-shadow(0 0 35px rgba(34,211,238,0.95)); }
        }
        @keyframes vcRgbBg {
          0%   { background: radial-gradient(ellipse,rgba(34,211,238,0.3),transparent 70%); }
          33%  { background: radial-gradient(ellipse,rgba(167,139,250,0.3),transparent 70%); }
          66%  { background: radial-gradient(ellipse,rgba(244,114,182,0.3),transparent 70%); }
          100% { background: radial-gradient(ellipse,rgba(34,211,238,0.3),transparent 70%); }
        }
        @keyframes vcGemPulse {
          from { transform:rotate(45deg) scale(0.85); }
          to   { transform:rotate(45deg) scale(1.3);  }
        }
        @keyframes vcFadeIn {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0);    }
        }
      `}</style>
    </div>
  );
}
