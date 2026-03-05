"use client";

import { useEffect, useRef } from "react";

interface P {
  x: number; y: number; vx: number; vy: number;
  size: number; type: "diamond" | "gem" | "rgb";
  r: number; rv: number; alpha: number;
  hue: number; gold: boolean;
  phase: number; amp: number;
}

const GOLD   = ["#ffd700","#ffb800","#ffc500","#ffe566","#ffcc00","#ff9900"];
const SILVER = ["#c8d8e8","#d4e8f8","#b0c8e0","#ddeeff","#90aec8","#cce0f5"];

function rnd<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function rr(a: number, b: number) { return a + Math.random() * (b - a); }

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, a: number, rot: number) {
  if (a < 0.02) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot);
  ctx.shadowBlur = s > 5 ? s * 5 : 0; ctx.shadowColor = col;
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(0, -s * 1.45); ctx.lineTo(s * 0.72, 0); ctx.lineTo(0, s * 1.45); ctx.lineTo(-s * 0.72, 0);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath();
  ctx.moveTo(0, -s * 0.5); ctx.lineTo(s * 0.25, 0); ctx.lineTo(0, s * 0.25); ctx.lineTo(-s * 0.25, 0);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, a: number, rot: number) {
  if (a < 0.02) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot);
  ctx.shadowBlur = s > 5 ? s * 6 : 0; ctx.shadowColor = col;
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = i * Math.PI / 3 - Math.PI / 6;
    i === 0 ? ctx.moveTo(Math.cos(ang) * s, Math.sin(ang) * s) : ctx.lineTo(Math.cos(ang) * s, Math.sin(ang) * s);
  }
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 0.5;
  [0, 2, 4].forEach(i => {
    const a1 = i * Math.PI / 3 - Math.PI / 6, a2 = (i + 3) * Math.PI / 3 - Math.PI / 6;
    ctx.beginPath(); ctx.moveTo(Math.cos(a1)*s,Math.sin(a1)*s); ctx.lineTo(Math.cos(a2)*s,Math.sin(a2)*s); ctx.stroke();
  });
  ctx.restore();
}

function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, hue: number, a: number) {
  if (a < 0.02) return;
  ctx.save(); ctx.globalAlpha = a;
  const col = `hsl(${hue},100%,65%)`;
  ctx.shadowBlur = s > 3 ? s * 8 : 0; ctx.shadowColor = col;
  const g = ctx.createRadialGradient(x, y, 0, x, y, s * 3);
  g.addColorStop(0, col); g.addColorStop(1, "transparent");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function initParticles(W: number, H: number): P[] {
  const ps: P[] = [];
  // Gold diamonds — reduced from 55 to 35 (-47% total)
  for (let i = 0; i < 35; i++) ps.push({
    x: Math.random() * W, y: Math.random() * H,
    vx: rr(-0.22, 0.22), vy: rr(-0.38, 0.12),
    size: rr(4, 13), type: "diamond",
    r: Math.random() * Math.PI * 2, rv: rr(-0.008, 0.008),
    alpha: rr(0.3, 0.75), hue: 0, gold: true,
    phase: Math.random() * Math.PI * 2, amp: rr(0.2, 0.65),
  });
  // Silver gems — reduced from 50 to 30
  for (let i = 0; i < 30; i++) ps.push({
    x: Math.random() * W, y: Math.random() * H,
    vx: rr(-0.18, 0.18), vy: rr(-0.32, 0.1),
    size: rr(3, 9), type: "gem",
    r: Math.random() * Math.PI * 2, rv: rr(-0.01, 0.01),
    alpha: rr(0.25, 0.7), hue: 0, gold: false,
    phase: Math.random() * Math.PI * 2, amp: rr(0.25, 0.55),
  });
  // RGB glows — reduced from 65 to 25
  for (let i = 0; i < 25; i++) ps.push({
    x: Math.random() * W, y: Math.random() * H,
    vx: rr(-0.28, 0.28), vy: rr(-0.45, 0.15),
    size: rr(2, 5.5), type: "rgb",
    r: 0, rv: 0,
    alpha: rr(0.2, 0.6), hue: Math.random() * 360, gold: false,
    phase: Math.random() * Math.PI * 2, amp: rr(0.3, 0.9),
  });
  return ps;
}

export function GemParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const psRef     = useRef<P[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;

    const resize = () => {
      const W = window.innerWidth, H = window.innerHeight;
      canvas.width = W; canvas.height = H;
      if (psRef.current.length === 0) psRef.current = initParticles(W, H);
    };
    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      psRef.current.forEach(p => {
        const dx = Math.sin(t * 0.45 + p.phase) * p.amp;
        p.x += p.vx + dx;
        p.y += p.vy;
        p.r += p.rv;

        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;

        const a = p.alpha * (0.5 + 0.35 * Math.sin(t * 0.9 + p.phase));

        if (p.type === "diamond") {
          drawDiamond(ctx, p.x, p.y, p.size, p.gold ? rnd(GOLD) : rnd(SILVER), a, p.r);
        } else if (p.type === "gem") {
          drawGem(ctx, p.x, p.y, p.size, rnd(SILVER), a, p.r);
        } else {
          drawGlow(ctx, p.x, p.y, p.size, (p.hue + t * 35) % 360, a);
        }
      });

      // Rare sparkle burst
      if (Math.random() < 0.012) {
        const sx = Math.random() * W, sy = Math.random() * H;
        const hue = Math.random() * 360;
        for (let r = 0; r < 3; r++) {
          ctx.save(); ctx.globalAlpha = 0.5 - r * 0.14;
          ctx.strokeStyle = `hsl(${hue},100%,70%)`;
          ctx.lineWidth = 1; ctx.beginPath();
          ctx.arc(sx, sy, 6 + r * 12, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    // Pause RAF when tab is hidden — saves CPU when user switches tabs
    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 block"
      style={{ zIndex: 40, willChange: "transform" }}
    />
  );
}
