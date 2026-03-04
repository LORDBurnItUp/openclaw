"use client";

import { useEffect, useRef } from "react";

// Pure-CSS futuristic background — no Three.js overhead
// Layers: deep void → hex grid → aurora waves → scan beam → particles
export function FuturisticScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Particle pool ───────────────────────────────────────────────────────
    const PARTICLES = Array.from({ length: 120 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 0.5 + Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.18,
      vy: -0.1 - Math.random() * 0.25,
      alpha: 0.2 + Math.random() * 0.6,
      hue: Math.random() > 0.6 ? 185 : 270, // cyan or violet
    }));

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      t += 0.004;

      // ── 1. Deep void background ─────────────────────────────────────────
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, W, H);

      // ── 2. Aurora bands (top 60%) ───────────────────────────────────────
      const auroraY = H * 0.6;
      for (let i = 0; i < 4; i++) {
        const phase  = t + i * 1.1;
        const yOff   = Math.sin(phase * 0.7) * H * 0.06;
        const alpha  = 0.06 + Math.sin(phase * 0.5) * 0.03;
        const hue    = 185 + i * 22; // cyan → violet
        const grad   = ctx.createRadialGradient(
          W * (0.2 + i * 0.2 + Math.sin(phase) * 0.06), auroraY + yOff, 0,
          W * (0.2 + i * 0.2 + Math.sin(phase) * 0.06), auroraY + yOff, W * 0.55,
        );
        grad.addColorStop(0,   `hsla(${hue},90%,60%,${alpha})`);
        grad.addColorStop(0.5, `hsla(${hue},80%,40%,${alpha * 0.4})`);
        grad.addColorStop(1,   "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // ── 3. Hex grid floor (bottom 55%) ─────────────────────────────────
      const S  = 38; // hex size
      const SX = S * 1.732;
      const SY = S * 1.5;
      const rows = Math.ceil(H / SY) + 2;
      const cols = Math.ceil(W / SX) + 2;
      ctx.save();
      ctx.globalAlpha = 0.18 + Math.sin(t * 0.8) * 0.04;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cx = col * SX + (row % 2 === 0 ? 0 : SX / 2) - SX * 0.5;
          const cy = row * SY + H * 0.42;
          const pulse = Math.sin(t * 1.2 + col * 0.4 + row * 0.6) * 0.5 + 0.5;
          const hue = 185 + pulse * 90;
          ctx.strokeStyle = `hsl(${hue}, 85%, ${42 + pulse * 18}%)`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (Math.PI / 3) * k - Math.PI / 6;
            const px = cx + S * Math.cos(a);
            const py = cy + S * Math.sin(a);
            k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();

          // Occasional lit cell
          if (pulse > 0.88) {
            ctx.fillStyle = `hsla(${hue}, 90%, 65%, ${(pulse - 0.88) * 0.25})`;
            ctx.fill();
          }
        }
      }
      ctx.restore();

      // ── 4. Vertical scan beam ────────────────────────────────────────────
      const scanX = ((t * 60) % (W + 120)) - 60;
      const scanGrad = ctx.createLinearGradient(scanX - 40, 0, scanX + 40, 0);
      scanGrad.addColorStop(0,    "transparent");
      scanGrad.addColorStop(0.4,  "rgba(34,211,238,0.03)");
      scanGrad.addColorStop(0.5,  "rgba(34,211,238,0.09)");
      scanGrad.addColorStop(0.6,  "rgba(34,211,238,0.03)");
      scanGrad.addColorStop(1,    "transparent");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(scanX - 40, 0, 80, H);

      // Bright scan edge line
      ctx.strokeStyle = `rgba(34,211,238,${0.25 + Math.sin(t * 3) * 0.1})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, H);
      ctx.stroke();

      // ── 5. Horizontal data streams ───────────────────────────────────────
      for (let i = 0; i < 3; i++) {
        const sy   = H * (0.25 + i * 0.25);
        const offs = Math.sin(t * 0.6 + i * 2.2) * 30;
        ctx.strokeStyle = `rgba(167,139,250,${0.07 + Math.sin(t + i) * 0.03})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 18]);
        ctx.lineDashOffset = -t * 40;
        ctx.beginPath();
        ctx.moveTo(0, sy + offs);
        ctx.lineTo(W, sy - offs);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // ── 6. Particles ─────────────────────────────────────────────────────
      for (const p of PARTICLES) {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
        if (p.x < -5 || p.x > W + 5) { p.x = Math.random() * W; p.y = H * Math.random(); }

        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        glow.addColorStop(0, `hsla(${p.hue},90%,70%,${p.alpha})`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── 7. Vignette ──────────────────────────────────────────────────────
      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
      vig.addColorStop(0, "transparent");
      vig.addColorStop(1, "rgba(2,6,23,0.65)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10 block"
    />
  );
}
