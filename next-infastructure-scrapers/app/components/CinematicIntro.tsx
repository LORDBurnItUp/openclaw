"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, MeshDistortMaterial } from "@react-three/drei";
import {
  Suspense, useRef, useState, useEffect,
  useCallback, useMemo, memo,
} from "react";
import * as THREE from "three";

// ─── Phase timing ──────────────────────────────────────────────────────────────
const TP = {
  EARTH:   1.5,
  IMPACT:  2.5,
  EXPLODE: 2.8,
  SETTLE:  4.0,
  FLOAT:   5.0,
  DONE:    6.5,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const r01 = () => Math.random();
const rr  = (a: number, b: number) => a + r01() * (b - a);

// ─── Mouse state type ─────────────────────────────────────────────────────────
interface Mouse { x: number; y: number }

// ─── Drip particle ────────────────────────────────────────────────────────────
interface Drip {
  x: number; y: number; vy: number; vx: number;
  width: number; height: number; alpha: number;
  hue: number; goldRatio: number; phase: number;
}

// ─── Nebula canvas backdrop — atmospheric depth blobs ────────────────────────
const NebulaCanvas = memo(function NebulaCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);

  useEffect(() => {
    const cvs = canvasRef.current!;
    const ctx  = cvs.getContext("2d")!;
    let alive  = true;

    const resize = () => {
      cvs.width  = window.innerWidth;
      cvs.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const BLOBS = [
      { bx: 0.18, by: 0.22, r: 0.36, color: [120, 40, 220],  speed: 0.18 },
      { bx: 0.75, by: 0.55, r: 0.28, color: [0,  200, 230],  speed: 0.13 },
      { bx: 0.45, by: 0.80, r: 0.22, color: [80,  0,  180],  speed: 0.22 },
      { bx: 0.88, by: 0.18, r: 0.20, color: [0,  140, 200],  speed: 0.16 },
      { bx: 0.30, by: 0.50, r: 0.25, color: [160, 0,  120],  speed: 0.19 },
    ];

    const tick = (now: number) => {
      if (!alive) return;
      const t  = now / 1000;
      const W  = cvs.width, H = cvs.height;
      ctx.clearRect(0, 0, W, H);

      for (const b of BLOBS) {
        // Lissajous drift
        const dx = Math.sin(t * b.speed + b.bx * 6) * W * 0.08;
        const dy = Math.cos(t * b.speed * 0.7 + b.by * 5) * H * 0.06;
        const cx = b.bx * W + dx;
        const cy = b.by * H + dy;
        const rad = b.r * Math.min(W, H);

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        const [r, gr, bl] = b.color;
        g.addColorStop(0, `rgba(${r},${gr},${bl},0.18)`);
        g.addColorStop(0.5, `rgba(${r},${gr},${bl},0.07)`);
        g.addColorStop(1, `rgba(${r},${gr},${bl},0)`);

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    // Pause RAF when tab hidden — saves GPU/battery during intro
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafRef.current);
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0"
      style={{
        zIndex: 1,
        transform: "translate(calc(var(--mx, 0) * -14px), calc(var(--my, 0) * -9px))",
        transition: "transform 0.1s linear",
        opacity: 0.85,
      }}
    />
  );
});

// ─── Kings Dripping Swag — 2D canvas ──────────────────────────────────────────
function KingsDrippingCanvas({ startRef }: { startRef: React.MutableRefObject<number | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drips     = useRef<Drip[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;
    let raf = 0, alive = true;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const tick = (now: number) => {
      if (!alive) return;
      if (startRef.current === null) { raf = requestAnimationFrame(tick); return; }

      const t = (now - startRef.current) / 1000;
      const W = canvas.width, H = canvas.height, cx = W / 2;
      ctx.clearRect(0, 0, W, H);

      const SIGN_END  = TP.IMPACT;
      const FADE_FROM = TP.EARTH;

      if (t <= SIGN_END) {
        const fadeIn      = Math.min(1, t / 0.6);
        const fadeOut     = t > FADE_FROM ? Math.max(0, 1 - (t - FADE_FROM) / 0.8) : 1;
        const masterAlpha = fadeIn * fadeOut;

        if (masterAlpha > 0.005) {
          const line1Y = H * 0.26;
          const line2Y = line1Y + Math.min(70, H * 0.09);
          const fs1    = Math.min(68, Math.max(26, W * 0.053));
          const fs2    = Math.min(50, Math.max(20, W * 0.040));
          const hue    = (t * 80) % 360;
          const col1   = `hsl(${hue},100%,62%)`;
          const col2   = `hsl(${(hue + 120) % 360},100%,62%)`;
          const warp   = Math.sin(t * 1.3) * 1.8;

          ctx.save();
          ctx.globalAlpha = masterAlpha;

          for (let g = 3; g >= 0; g--) {
            ctx.font         = `900 ${fs1}px "Arial Black", Arial, sans-serif`;
            ctx.textAlign    = "center";
            ctx.textBaseline = "alphabetic";
            ctx.shadowBlur   = 10 + g * 16;
            ctx.shadowColor  = g === 0 ? "#ffd700" : col1;
            ctx.fillStyle    = g === 0 ? "#ffd700" : col1;
            ctx.fillText("KINGS DRIPPING SWAG", cx, line1Y + warp);
          }

          ctx.font        = `900 ${fs2}px "Arial Black", Arial, sans-serif`;
          ctx.shadowBlur  = 20;
          ctx.shadowColor = col2;
          ctx.fillStyle   = col2;
          ctx.fillText("AI DEVELOPMENT", cx, line2Y + warp * 0.7);

          const sepY = line1Y + (line2Y - line1Y) * 0.42;
          const sepW = Math.min(W * 0.5, 480);
          ctx.shadowBlur  = 6;
          ctx.shadowColor = "#ffd700";
          ctx.strokeStyle = "#ffd700";
          ctx.lineWidth   = 1.4;
          ctx.globalAlpha = masterAlpha * 0.55;
          ctx.beginPath();
          ctx.moveTo(cx - sepW / 2, sepY);
          ctx.lineTo(cx + sepW / 2, sepY);
          ctx.stroke();
          ctx.restore();

          if (masterAlpha > 0.1 && t < FADE_FROM * 0.9) {
            const count = r01() < 0.6 ? 2 : 3;
            for (let i = 0; i < count; i++) {
              const onLine1 = r01() < 0.6;
              const lineY   = onLine1 ? line1Y : line2Y;
              const lineW   = onLine1 ? Math.min(W * 0.52, 500) : Math.min(W * 0.36, 340);
              drips.current.push({
                x: cx + (r01() - 0.5) * lineW * 0.88,
                y: lineY + 3,
                vy: 0.4 + r01() * 1.3,
                vx: (r01() - 0.5) * 0.3,
                width: 1 + r01() * 2.5,
                height: 4 + r01() * 9,
                alpha: masterAlpha * (0.65 + r01() * 0.35),
                hue: (hue + r01() * 60 - 30 + 360) % 360,
                goldRatio: r01() < 0.55 ? 1 : 0,
                phase: r01() * Math.PI * 2,
              });
            }
          }
        }
      }

      for (let i = drips.current.length - 1; i >= 0; i--) {
        const d = drips.current[i];
        d.vy   += 0.055;
        d.vx   += Math.sin(t * 3.2 + d.phase) * 0.02;
        d.x    += d.vx;
        d.y    += d.vy;
        d.alpha -= 0.008 + d.vy * 0.003;
        if (d.alpha <= 0.01) { drips.current.splice(i, 1); continue; }

        const col = d.goldRatio > 0.5 ? "#ffd700" : `hsl(${d.hue},100%,62%)`;
        ctx.save();
        ctx.globalAlpha = d.alpha;
        ctx.shadowBlur  = 6;
        ctx.shadowColor = col;
        ctx.fillStyle   = col;
        ctx.beginPath();
        ctx.ellipse(d.x, d.y - d.height * 0.3, d.width, d.height * 0.5, 0, Math.PI, Math.PI * 2);
        ctx.lineTo(d.x + d.width * 0.8, d.y + d.height * 0.2);
        ctx.quadraticCurveTo(d.x, d.y + d.height, d.x - d.width * 0.8, d.y + d.height * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (t > SIGN_END + 1.5 && drips.current.length === 0) {
        window.removeEventListener("resize", resize);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      drips.current = [];
    };
  }, [startRef]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" style={{ zIndex: 10 }} />;
}

// ─── Camera rig — mouse parallax tilt ────────────────────────────────────────
function CameraRig({ mouseRef }: { mouseRef: React.MutableRefObject<Mouse> }) {
  useFrame((state) => {
    const m = mouseRef.current;
    state.camera.position.x += (m.x * 2.8 - state.camera.position.x) * 0.04;
    state.camera.position.y += (-m.y * 1.8 - state.camera.position.y) * 0.04;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

// ─── Warp stars ────────────────────────────────────────────────────────────────
const STAR_COUNT = 1800;
const STAR_COLORS = [
  [0.85, 0.95, 1.00],
  [0.13, 0.83, 0.93],
  [0.65, 0.55, 0.98],
  [0.55, 0.80, 1.00],
  [1.00, 1.00, 1.00],
];

const WarpStars = memo(function WarpStars({ phase }: { phase: number }) {
  const ref = useRef<THREE.Points>(null);

  const { geo, speeds } = useMemo(() => {
    const pos = new Float32Array(STAR_COUNT * 3);
    const col = new Float32Array(STAR_COUNT * 3);
    const spd = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      pos[i * 3]     = (r01() - 0.5) * 320;
      pos[i * 3 + 1] = (r01() - 0.5) * 320;
      pos[i * 3 + 2] = -r01() * 320;
      spd[i]         = 0.6 + r01() * 3.5;
      const c = STAR_COLORS[Math.floor(r01() * STAR_COLORS.length)];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    return { geo: g, speeds: spd };
  }, []);

  const mat = useMemo(() => new THREE.PointsMaterial({
    size: 1.4,
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), []);

  useFrame((_, dt) => {
    if (!ref.current || phase > 1) return;
    const multiplier = phase === 0 ? 2.2 : 11;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    // Increase point size during approach for trail illusion
    if (mat) mat.size = phase === 1 ? 2.8 : 1.4;
    for (let i = 0; i < STAR_COUNT; i++) {
      pos[i * 3 + 2] += speeds[i] * multiplier * dt;
      if (pos[i * 3 + 2] > 60) {
        pos[i * 3]     = (r01() - 0.5) * 320;
        pos[i * 3 + 1] = (r01() - 0.5) * 320;
        pos[i * 3 + 2] = -320;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  if (phase > 1) return null;
  return <points ref={ref} geometry={geo} material={mat} />;
});

// ─── Holographic energy orb ───────────────────────────────────────────────────
const HoloSphere = memo(function HoloSphere({ phase }: { phase: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const haloRef  = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  const shellGeo  = useMemo(() => new THREE.IcosahedronGeometry(1, 4), []);
  const shellMat  = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#22d3ee", wireframe: true, transparent: true,
    opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false,
  }), []);
  const haloGeo   = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);
  const haloMat   = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#a78bfa", transparent: true, opacity: 0.06,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
  }), []);
  const ringGeo   = useMemo(() => new THREE.TorusGeometry(1, 0.012, 6, 128), []);
  const ringMats  = useMemo(() => [
    new THREE.MeshBasicMaterial({ color: "#22d3ee", transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: "#a78bfa", transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: "#f472b6", transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }),
  ], []);

  useFrame((state) => {
    if (phase !== 1 && phase !== 2) return;
    const t    = state.clock.getElapsedTime();
    const prog = Math.min(1, (t - TP.EARTH) / 1.0);
    const sc   = 0.005 + prog * prog * 26;
    if (groupRef.current) groupRef.current.scale.setScalar(sc);
    if (shellRef.current) { shellRef.current.rotation.y = t * 0.55; shellRef.current.rotation.x = t * 0.22; }
    if (haloRef.current)  { haloRef.current.scale.setScalar(1.8 + Math.sin(t * 1.8) * 0.06); }
    const pulse = 0.5 + Math.sin(t * 3.5) * 0.3;
    if (ring1Ref.current) { ring1Ref.current.rotation.z = t * 0.9; (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = pulse * 0.8; }
    if (ring2Ref.current) { ring2Ref.current.rotation.x = t * 1.3; (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = pulse * 0.55; }
    if (ring3Ref.current) { ring3Ref.current.rotation.y = -t * 0.7; (ring3Ref.current.material as THREE.MeshBasicMaterial).opacity = pulse * 0.45; }
  });

  if (phase !== 1 && phase !== 2) return null;
  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial color="#0a0a2e" emissive="#22d3ee" emissiveIntensity={1.4} distort={0.55} speed={4} roughness={0.05} metalness={0.9} />
      </mesh>
      <mesh ref={shellRef} geometry={shellGeo} material={shellMat} scale={1.08} />
      <mesh ref={haloRef}  geometry={haloGeo}  material={haloMat}  scale={1.9} />
      <mesh ref={ring1Ref} geometry={ringGeo}  material={ringMats[0]} scale={1.18} rotation={[Math.PI / 2, 0, 0]} />
      <mesh ref={ring2Ref} geometry={ringGeo}  material={ringMats[1]} scale={1.32} rotation={[Math.PI / 4, 0, 0]} />
      <mesh ref={ring3Ref} geometry={ringGeo}  material={ringMats[2]} scale={1.48} rotation={[-Math.PI / 6, 0, 0]} />
      <pointLight position={[ 3,  4, 5]} color="#22d3ee" intensity={6} />
      <pointLight position={[-3, -3, 4]} color="#a78bfa" intensity={4} />
    </group>
  );
});

// ─── Shockwave rings ──────────────────────────────────────────────────────────
const SW_COLORS = ["#22d3ee","#a78bfa","#f472b6","#34d399","#fbbf24","#ffffff","#22d3ee"];
const SW_COUNT  = 7;

const ShockwaveRings = memo(function ShockwaveRings({ phase }: { phase: number }) {
  // Fix: single ref array instead of calling useRef inside Array.from (Hook violation)
  const meshRefs = useRef<(THREE.Mesh | null)[]>(Array(SW_COUNT).fill(null));

  const ringGeo = useMemo(() => new THREE.TorusGeometry(1, 0.04, 8, 128), []);
  const mats    = useMemo(() => SW_COLORS.map(c => new THREE.MeshBasicMaterial({
    color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  })), []);

  useFrame((state) => {
    if (phase !== 2) return;
    const ti = state.clock.getElapsedTime() - TP.IMPACT;
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const delay = i * 0.04;
      const tR    = Math.max(0, ti - delay);
      mesh.scale.setScalar(tR * 55 + i * 1.5 + 0.01);
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1.0 - tR * 4.0 - i * 0.1);
    });
  });

  if (phase !== 2) return null;
  return (
    <group>
      {SW_COLORS.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el; }}
          geometry={ringGeo}
          material={mats[i]}
        />
      ))}
    </group>
  );
});

// ─── Explosion particles ──────────────────────────────────────────────────────
const BURST = 600, AMBIENT = 200, TOTAL = BURST + AMBIENT;

const ExplosionParticles = memo(function ExplosionParticles({ phase }: { phase: number }) {
  const ref = useRef<THREE.Points>(null);

  const PALETTE = [
    [0.13,0.83,0.93],[0.65,0.55,0.98],[0.96,0.44,0.71],
    [0.20,0.83,0.60],[1.00,0.75,0.00],[1.00,0.88,0.40],
  ];

  const { geo, vx, vy, vz, fadeRate, floatPhase } = useMemo(() => {
    const pos = new Float32Array(TOTAL * 3);
    const col = new Float32Array(TOTAL * 3);
    const vx  = new Float32Array(TOTAL);
    const vy  = new Float32Array(TOTAL);
    const vz  = new Float32Array(TOTAL);
    const fr  = new Float32Array(TOTAL);
    const fp  = new Float32Array(TOTAL);
    const PAL = [[0.13,0.83,0.93],[0.65,0.55,0.98],[0.96,0.44,0.71],[0.20,0.83,0.60],[1.00,0.75,0.00],[1.00,0.88,0.40]];

    for (let i = 0; i < BURST; i++) {
      const ang = r01() * Math.PI * 2, pitch = (r01() - 0.5) * Math.PI, spd = rr(0.04, 0.4);
      vx[i] = Math.cos(ang) * Math.cos(pitch) * spd;
      vy[i] = Math.sin(pitch) * spd;
      vz[i] = Math.sin(ang) * Math.cos(pitch) * spd;
      fr[i] = rr(0.003, 0.01);
      const c = PAL[Math.floor(r01() * PAL.length)];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    for (let i = BURST; i < TOTAL; i++) {
      pos[i*3]=(r01()-0.5)*24; pos[i*3+1]=(r01()-0.5)*14; pos[i*3+2]=(r01()-0.5)*8;
      vx[i]=(r01()-0.5)*0.006; vy[i]=(r01()-0.5)*0.004;
      fr[i]=0; fp[i]=r01()*Math.PI*2;
      const c = PAL[Math.floor(r01() * PAL.length)];
      col[i*3]=c[0]; col[i*3+1]=c[1]; col[i*3+2]=c[2];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(col, 3));
    return { geo: g, vx, vy, vz, fadeRate: fr, floatPhase: fp };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mat = useMemo(() => new THREE.PointsMaterial({
    size: 0.22, vertexColors: true, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }), []);

  const alphas  = useRef(new Float32Array(BURST).fill(1));
  const spawned = useRef(false);

  useFrame((state, dt) => {
    if (!ref.current || phase < 3) return;
    if (!spawned.current) {
      const pos = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < BURST; i++) { pos[i*3]=0; pos[i*3+1]=0; pos[i*3+2]=0; }
      ref.current.geometry.attributes.position.needsUpdate = true;
      alphas.current.fill(1);
      spawned.current = true;
    }
    const t   = state.clock.getElapsedTime();
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    let alive = 0;
    for (let i = 0; i < BURST; i++) {
      if (alphas.current[i] <= 0) continue;
      pos[i*3]   += vx[i]*dt*60; pos[i*3+1] += vy[i]*dt*60; pos[i*3+2] += vz[i]*dt*60;
      vy[i]      -= 0.0005 * dt * 60;
      alphas.current[i] = Math.max(0, alphas.current[i] - fadeRate[i]*dt*60);
      alive++;
    }
    for (let i = BURST; i < TOTAL; i++) {
      pos[i*3]   += (vx[i] + Math.sin(t*0.4 + floatPhase[i])*0.003)*dt*60;
      pos[i*3+1] += (vy[i] + Math.cos(t*0.3 + floatPhase[i])*0.002)*dt*60;
      if (pos[i*3]   >  13) pos[i*3]   = -13;
      if (pos[i*3]   < -13) pos[i*3]   =  13;
      if (pos[i*3+1] >   8) pos[i*3+1] =  -8;
      if (pos[i*3+1] <  -8) pos[i*3+1] =   8;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
    (ref.current.material as THREE.PointsMaterial).opacity = Math.max(0.55, (alive / BURST) * 0.9 + 0.1);
  });

  if (phase < 3) return null;
  return <points ref={ref} geometry={geo} material={mat} />;
});

// ─── Three.js scene ───────────────────────────────────────────────────────────
interface SceneProps {
  onPhaseChange: (p: number) => void;
  onDoneReady:  () => void;
  mouseRef:     React.MutableRefObject<Mouse>;
}

function IntroScene({ onPhaseChange, onDoneReady, mouseRef }: SceneProps) {
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);
  const doneRef  = useRef(false);

  const advance = useCallback((next: number) => {
    if (next === phaseRef.current) return;
    phaseRef.current = next;
    setPhase(next);
    onPhaseChange(next);
  }, [onPhaseChange]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (t > TP.EARTH   && phaseRef.current < 1) advance(1);
    if (t > TP.IMPACT  && phaseRef.current < 2) advance(2);
    if (t > TP.EXPLODE && phaseRef.current < 3) advance(3);
    if (t > TP.SETTLE  && phaseRef.current < 4) advance(4);
    if (t > TP.FLOAT   && phaseRef.current < 5) advance(5);
    if (t > TP.DONE    && phaseRef.current < 6 && !doneRef.current) {
      doneRef.current = true;
      advance(6);
      onDoneReady();
    }
  });

  return (
    <>
      <ambientLight intensity={0.08} />
      <CameraRig mouseRef={mouseRef} />
      <WarpStars   phase={phase} />
      <HoloSphere  phase={phase} />
      <ShockwaveRings phase={phase} />
      <ExplosionParticles phase={phase} />
      {phase >= 3 && (
        <Sparkles count={120} scale={[22,14,8]} size={5} speed={0.25} color="#22d3ee" opacity={0.55} noise={0.5} />
      )}
      {phase >= 3 && (
        <Sparkles count={60} scale={[20,12,6]} size={3} speed={0.35} color="#a78bfa" opacity={0.4} noise={0.8} />
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CinematicIntro({ onDone }: { onDone: () => void }) {
  const [phase,     setPhase]     = useState(0);
  const [opacity,   setOpacity]   = useState(1);
  const [showFlash, setShowFlash] = useState(false);
  const doneFired  = useRef(false);
  const startRef   = useRef<number | null>(null);
  const mouseRef   = useRef<Mouse>({ x: 0, y: 0 });
  const wrapRef    = useRef<HTMLDivElement>(null);

  // Sync start time
  useEffect(() => { startRef.current = performance.now(); }, []);

  // Mouse tracking with lerp
  useEffect(() => {
    let tx = 0, ty = 0, rafId = 0;
    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth  - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const lerp = () => {
      mouseRef.current.x += (tx - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (ty - mouseRef.current.y) * 0.06;
      if (wrapRef.current) {
        wrapRef.current.style.setProperty("--mx", mouseRef.current.x.toFixed(3));
        wrapRef.current.style.setProperty("--my", mouseRef.current.y.toFixed(3));
      }
      rafId = requestAnimationFrame(lerp);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    rafId = requestAnimationFrame(lerp);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(rafId); };
  }, []);

  const handlePhaseChange = useCallback((p: number) => {
    setPhase(p);
    if (p === 2) setShowFlash(true);
    if (p >= 3)  setTimeout(() => setShowFlash(false), 380);
  }, []);

  const handleDoneReady = useCallback(() => {
    if (!doneFired.current) {
      doneFired.current = true;
      setOpacity(0);
      setTimeout(onDone, 900);
    }
  }, [onDone]);

  const handleSkip = useCallback(() => {
    if (!doneFired.current) {
      doneFired.current = true;
      setOpacity(0);
      setTimeout(onDone, 700);
    }
  }, [onDone]);

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ opacity, transition: "opacity 0.9s ease", background: "#00000f" }}
    >
      {/* ── Nebula backdrop — slowest layer, counter-parallax ── */}
      <NebulaCanvas />

      {/* ── Three.js 3D scene ── */}
      <Canvas
        className="absolute inset-0"
        style={{ zIndex: 5 }}
        camera={{ position: [0, 0, 12], fov: 72 }}
        gl={{ alpha: false, antialias: false, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <IntroScene
            onPhaseChange={handlePhaseChange}
            onDoneReady={handleDoneReady}
            mouseRef={mouseRef}
          />
        </Suspense>
      </Canvas>

      {/* ── Kings Dripping Swag 2D overlay ── */}
      <KingsDrippingCanvas startRef={startRef} />

      {/* ── Depth vignette ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 12,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,15,0.55) 100%)",
        }}
      />

      {/* ── Scan lines (phase 1 approach) ── */}
      {phase === 1 && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            zIndex: 14,
            transform: "translate(calc(var(--mx, 0) * 8px), calc(var(--my, 0) * 5px))",
            animation: "ciScanLines 0.08s steps(1) infinite, ciFadeHolo 1.0s ease both",
          }}
        />
      )}

      {/* ── Impact flash ── */}
      {showFlash && (
        <>
          <div className="pointer-events-none absolute inset-0" style={{ zIndex: 20, background: "white", animation: "ciFlash 0.38s ease-out forwards" }} />
          <div className="pointer-events-none absolute inset-0" style={{ zIndex: 21, background: "rgba(255,20,20,0.25)", animation: "ciChromaR 0.25s ease-out forwards" }} />
          <div className="pointer-events-none absolute inset-0" style={{ zIndex: 21, background: "rgba(20,20,255,0.25)", animation: "ciChromaB 0.25s ease-out forwards" }} />
        </>
      )}

      {/* ── RGB border glow ── */}
      {phase >= 3 && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ zIndex: 20, animation: "ciRgbBorder 3s linear infinite" }}
        />
      )}

      {/* ── VoxCode title — glassmorphism + 3D mouse tilt ── */}
      {phase >= 3 && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{
            zIndex: 30,
            perspective: "1200px",
            transform: "translate(calc(var(--mx, 0) * 22px), calc(var(--my, 0) * 14px))",
            animation: "vcCrashIn 1.1s cubic-bezier(0.2,1.4,0.4,1) forwards",
          }}
        >
          {/* 3D tilt card */}
          <div
            style={{
              transform: "perspective(1200px) rotateY(calc(var(--mx, 0) * -9deg)) rotateX(calc(var(--my, 0) * 6deg))",
              transition: "transform 0.08s linear",
              animation: "vcFloat 3.5s ease-in-out infinite alternate",
            }}
          >
            {/* Glassmorphism backdrop */}
            <div
              className="relative rounded-3xl px-12 py-8"
              style={{
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(18px)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: `
                  0 0 80px rgba(34,211,238,0.18),
                  0 0 160px rgba(167,139,250,0.12),
                  inset 0 1px 0 rgba(255,255,255,0.12)
                `,
              }}
            >
              {/* Ambient glow behind text */}
              <div
                className="absolute -inset-12 rounded-full blur-3xl opacity-40"
                style={{ animation: "vcRgbBg 3s linear infinite" }}
              />

              <div className="relative text-center">
                {/* Main title */}
                <div
                  className="text-[clamp(60px,12vw,110px)] font-black tracking-tighter leading-none select-none"
                  style={{
                    background: "linear-gradient(135deg,#22d3ee 0%,#a78bfa 40%,#f472b6 70%,#fbbf24 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    animation: "vcRgbText 2.5s linear infinite",
                    filter: "drop-shadow(0 0 40px rgba(34,211,238,0.9))",
                  }}
                >
                  VoxCode
                </div>

                {/* Tagline */}
                <div
                  className="mt-3 text-xs font-semibold tracking-[0.4em] uppercase"
                  style={{ color: "rgba(148,163,184,0.85)", animation: "vcFadeIn 1s 0.5s ease both" }}
                >
                  Voice · AI · Code
                </div>

                {/* Gem row */}
                <div
                  className="mt-4 flex justify-center gap-3"
                  style={{ animation: "vcFadeIn 1s 0.8s ease both" }}
                >
                  {["#ffd700","#a78bfa","#22d3ee","#f472b6","#34d399"].map((c, i) => (
                    <span
                      key={i}
                      className="inline-block h-3 w-3 rotate-45"
                      style={{
                        background: c,
                        boxShadow:  `0 0 12px ${c}, 0 0 24px ${c}`,
                        animation:  `vcGemPulse 1.2s ${i * 0.15}s ease-in-out infinite alternate`,
                      }}
                    />
                  ))}
                </div>

                {/* Depth shadow layer — gives 3D floating feel */}
                <div
                  className="absolute inset-0 rounded-xl opacity-30"
                  style={{
                    background: "linear-gradient(to bottom, transparent 60%, rgba(0,0,20,0.4) 100%)",
                    transform: "translateZ(-20px) translateY(calc(var(--my, 0) * 4px))",
                    filter: "blur(8px)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mid parallax layer — subtle depth fog ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 8,
          transform: "translate(calc(var(--mx, 0) * 6px), calc(var(--my, 0) * 4px))",
          background: "radial-gradient(ellipse 120% 80% at 50% 50%, transparent 30%, rgba(0,0,30,0.15) 100%)",
        }}
      />

      {/* ── Skip button ── */}
      <button
        type="button"
        onClick={handleSkip}
        className="absolute bottom-8 right-8 rounded-xl border border-slate-700/50 bg-slate-950/60 px-4 py-2 text-xs text-slate-500 hover:text-slate-300 backdrop-blur-sm transition-all"
        style={{ zIndex: 50 }}
      >
        Skip intro →
      </button>

      <style>{`
        @keyframes ciFlash    { from { opacity:1; } to { opacity:0; } }
        @keyframes ciChromaR  { 0% { opacity:0.6; transform:translate(-8px,0); } 100% { opacity:0; transform:translate(0,0); } }
        @keyframes ciChromaB  { 0% { opacity:0.6; transform:translate(8px,0);  } 100% { opacity:0; transform:translate(0,0); } }
        @keyframes ciScanLines {
          0%  { background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(34,211,238,0.04) 3px, rgba(34,211,238,0.04) 4px); }
          50% { background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(167,139,250,0.04) 3px, rgba(167,139,250,0.04) 4px); }
        }
        @keyframes ciFadeHolo { from { opacity:0; } to { opacity:1; } }
        @keyframes ciRgbBorder {
          0%   { box-shadow: inset 0 0 0 3px rgba(34,211,238,0.5);  }
          33%  { box-shadow: inset 0 0 0 3px rgba(167,139,250,0.5); }
          66%  { box-shadow: inset 0 0 0 3px rgba(244,114,182,0.5); }
          100% { box-shadow: inset 0 0 0 3px rgba(34,211,238,0.5);  }
        }
        @keyframes vcCrashIn {
          from { transform:translateY(-120vh) scale(5) rotate(12deg); opacity:0; filter:blur(30px); }
          70%  { transform:translateY(6%) scale(1.04) rotate(-1.5deg); opacity:1; filter:blur(0); }
          to   { transform:translateY(0) scale(1) rotate(0deg); opacity:1; }
        }
        @keyframes vcFloat {
          from { transform:translateY(0px) rotate(-0.4deg); }
          to   { transform:translateY(-14px) rotate(0.4deg); }
        }
        @keyframes vcRgbText {
          0%   { filter:drop-shadow(0 0 35px rgba(34,211,238,0.95));  }
          33%  { filter:drop-shadow(0 0 35px rgba(167,139,250,0.95)); }
          66%  { filter:drop-shadow(0 0 35px rgba(244,114,182,0.95)); }
          100% { filter:drop-shadow(0 0 35px rgba(34,211,238,0.95));  }
        }
        @keyframes vcRgbBg {
          0%   { background:radial-gradient(ellipse,rgba(34,211,238,0.28),transparent 70%);  }
          33%  { background:radial-gradient(ellipse,rgba(167,139,250,0.28),transparent 70%); }
          66%  { background:radial-gradient(ellipse,rgba(244,114,182,0.28),transparent 70%); }
          100% { background:radial-gradient(ellipse,rgba(34,211,238,0.28),transparent 70%);  }
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
