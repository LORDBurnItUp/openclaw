"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef, memo, useCallback } from "react";
import * as THREE from "three";

// ─── Shared geometries (memoized for performance) ───────────────────────────────
const ICOSAHEDRON_OUTER_GEOMETRY = new THREE.IcosahedronGeometry(1.35, 1);
const ICOSAHEDRON_INNER_GEOMETRY = new THREE.IcosahedronGeometry(0.82, 1);
const SPHERE_GLOW_GEOMETRY = new THREE.SphereGeometry(1.35, 20, 20);
const OCTAHEDRON_GEOMETRY = new THREE.OctahedronGeometry(1, 0);
const SPHERE_SMALL_GEOMETRY = new THREE.SphereGeometry(1, 6, 6);

// Pre-create reusable materials
const createOuterMaterial = () => new THREE.MeshStandardMaterial({
  color: "#22d3ee",
  emissive: "#0ea5e9",
  emissiveIntensity: 0.55,
  wireframe: true,
  transparent: true,
  opacity: 0.45,
});

const createInnerCoreMaterial = () => new THREE.MeshStandardMaterial({
  color: "#0c4a6e",
  emissive: "#22d3ee",
  emissiveIntensity: 0.9,
  roughness: 0.1,
  metalness: 0.85,
});

const createGlowMaterial = () => new THREE.MeshBasicMaterial({
  color: "#22d3ee",
  transparent: true,
  opacity: 0.07,
  side: THREE.BackSide,
});

const createQubitCoreMaterial = (color: string) => new THREE.MeshStandardMaterial({
  color,
  emissive: color,
  emissiveIntensity: 4,
});

const createQubitHaloMaterial = (color: string) => new THREE.MeshBasicMaterial({
  color,
  transparent: true,
  opacity: 0.15,
});

const createRingMaterial = (color: string, opacity: number) => new THREE.MeshBasicMaterial({
  color,
  transparent: true,
  opacity,
});

const createBoltMaterial = () => new THREE.MeshBasicMaterial({
  color: "#22d3ee",
  transparent: true,
  opacity: 0.8,
});

// ─── Quantum stats ────────────────────────────────────────────────────────────
const QSTATS = [
  { label: "Qubit coherence",  value: "99.97%", color: "#22d3ee" },
  { label: "Gate fidelity",    value: "99.4%",  color: "#a78bfa" },
  { label: "Entangled pairs",  value: "2,048",  color: "#34d399" },
  { label: "Error rate",       value: "0.003%", color: "#f59e0b" },
];

// ─── Central processor core (optimized) ───────────────────────────────────────
const ProcessorCore = memo(function ProcessorCore() {
  const outerRef  = useRef<THREE.Mesh>(null);
  const innerRef  = useRef<THREE.Mesh>(null);
  const glowRef   = useRef<THREE.Mesh>(null);

  // Memoize materials
  const materials = useMemo(() => ({
    outer: createOuterMaterial(),
    inner: createInnerCoreMaterial(),
    glow: createGlowMaterial(),
  }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (outerRef.current) {
      outerRef.current.rotation.y  = t * 0.18;
      outerRef.current.rotation.x  = Math.sin(t * 0.4) * 0.12;
    }
    if (innerRef.current) {
      innerRef.current.rotation.y  = -t * 0.3;
      innerRef.current.rotation.z  = t * 0.15;
    }
    if (glowRef.current) {
      const pulse = 0.92 + Math.sin(t * 2.2) * 0.08;
      glowRef.current.scale.setScalar(pulse);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.06 + Math.sin(t * 1.8) * 0.03;
    }
  });

  return (
    <group>
      {/* Outer wireframe shell */}
      <mesh ref={outerRef} geometry={ICOSAHEDRON_OUTER_GEOMETRY} material={materials.outer} />

      {/* Inner solid core */}
      <mesh ref={innerRef} geometry={ICOSAHEDRON_INNER_GEOMETRY} material={materials.inner} />

      {/* Atmosphere glow */}
      <mesh ref={glowRef} geometry={SPHERE_GLOW_GEOMETRY} material={materials.glow} scale={1.9} />
    </group>
  );
});

// ─── Qubit node (optimized) ───────────────────────────────────────────────────
const Qubit = memo(function Qubit({
  orbitR, speed, phase, tilt, color,
}: {
  orbitR: number; speed: number; phase: number; tilt: number; color: string;
}) {
  const ref  = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  const materials = useMemo(() => ({
    core: createQubitCoreMaterial(color),
    halo: createQubitHaloMaterial(color),
  }), [color]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed + phase;
    ref.current.position.set(
      Math.cos(t) * orbitR,
      Math.sin(t * 0.7) * orbitR * Math.sin(tilt),
      Math.sin(t) * orbitR * Math.cos(tilt),
    );
    if (coreRef.current) {
      const p = 0.8 + Math.sin(state.clock.elapsedTime * 3.5 + phase) * 0.2;
      coreRef.current.scale.setScalar(p);
    }
  });

  return (
    <group ref={ref}>
      {/* Qubit core */}
      <mesh ref={coreRef} geometry={OCTAHEDRON_GEOMETRY} scale={0.075} material={materials.core} />
      {/* Halo */}
      <mesh geometry={SPHERE_SMALL_GEOMETRY} scale={0.22} material={materials.halo} />
    </group>
  );
});

// ─── Orbit ring (optimized) ─────────────────────────────────────────────────
const Ring = memo(function Ring({
  radius, tilt, color, speed, opacity,
}: {
  radius: number; tilt: number; color: string; speed: number; opacity: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  
  const geometry = useMemo(() => new THREE.TorusGeometry(radius, 0.006, 6, 128), [radius]);
  const material = useMemo(() => createRingMaterial(color, opacity), [color, opacity]);
  
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * speed;
  });
  
  return (
    <mesh ref={ref} geometry={geometry} material={material} rotation={[tilt, 0, 0]} />
  );
});

// ─── Lightning bolt (optimized) ────────────────────────────────────────────
const LightningBolt = memo(function LightningBolt({
  from, to, color, seed,
}: {
  from: THREE.Vector3; to: THREE.Vector3; color: string; seed: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const buildBolt = (s: number) => {
      const pts: THREE.Vector3[] = [];
      const segments = 8; // Reduced from 10
      for (let i = 0; i <= segments; i++) {
        const t2 = i / segments;
        const base = new THREE.Vector3().lerpVectors(from, to, t2);
        if (i > 0 && i < segments) {
          const rng = Math.sin(s + i * 137.5) * 0.5;
          base.x += rng * 0.35;
          base.y += Math.sin(s * 2 + i * 97) * 0.28;
          base.z += Math.cos(s * 3 + i * 73) * 0.25;
        }
        pts.push(base);
      }
      return new THREE.CatmullRomCurve3(pts);
    };
    const curve = buildBolt(seed);
    return new THREE.TubeGeometry(curve, 16, 0.008, 4, false); // Reduced segments from 20
  }, [from, to, seed]);

  const material = useMemo(() => {
    const mat = createBoltMaterial();
    mat.color = new THREE.Color(color);
    return mat;
  }, [color]);

  useFrame((state) => {
    if (meshRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 8 + seed) * 0.5 + 0.5;
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + pulse * 0.7;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} />
  );
});

// ─── Lightning system ─────────────────────────────────────────────────────────
function LightningSystem() {
  const bolts = useMemo(() => {
    const anchors: THREE.Vector3[] = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3( 1.35,  0.8, 0.4),
      new THREE.Vector3(-1.35,  0.5,-0.3),
      new THREE.Vector3( 0.6, -1.2, 0.9),
      new THREE.Vector3(-0.4,  1.3,-0.7),
      new THREE.Vector3( 1.1, -0.3,-1.1),
      new THREE.Vector3(-0.9, -0.9, 1.0),
    ];

    return [
      { from: anchors[0], to: anchors[1], color: "#22d3ee", seed: 1.1 },
      { from: anchors[0], to: anchors[2], color: "#a78bfa", seed: 2.3 },
      { from: anchors[0], to: anchors[3], color: "#22d3ee", seed: 3.7 },
      { from: anchors[0], to: anchors[4], color: "#f472b6", seed: 0.9 },
      { from: anchors[0], to: anchors[5], color: "#34d399", seed: 4.2 },
      { from: anchors[0], to: anchors[6], color: "#a78bfa", seed: 5.5 },
      { from: anchors[1], to: anchors[3], color: "#22d3ee", seed: 6.1 },
      { from: anchors[2], to: anchors[5], color: "#a78bfa", seed: 7.3 },
    ];
  }, []);

  // Animate which bolts are visible
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const flicker = Math.sin(state.clock.elapsedTime * 6 + i * 2.3) > 0.1;
      child.visible = flicker;
    });
  });

  return (
    <group ref={groupRef}>
      {bolts.map((b, i) => (
        <LightningBolt key={i} {...b} />
      ))}
    </group>
  );
}

// ─── Point lights that pulse ──────────────────────────────────────────────────
function PulsingLights() {
  const l1 = useRef<THREE.PointLight>(null);
  const l2 = useRef<THREE.PointLight>(null);
  const l3 = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (l1.current) l1.current.intensity = 2.5 + Math.sin(t * 2.1) * 1.5;
    if (l2.current) l2.current.intensity = 1.8 + Math.sin(t * 3.4 + 1) * 1.2;
    if (l3.current) l3.current.intensity = 2.0 + Math.sin(t * 1.7 + 2) * 1.0;
  });

  return (
    <>
      <pointLight ref={l1} position={[ 3,  2, 2]} color="#22d3ee" intensity={3} distance={10} />
      <pointLight ref={l2} position={[-3, -2, 2]} color="#a78bfa" intensity={2} distance={10} />
      <pointLight ref={l3} position={[ 0,  3,-3]} color="#f472b6" intensity={2} distance={10} />
    </>
  );
}

// ─── Full quantum scene ───────────────────────────────────────────────────────
function QuantumScene() {
  const QUBITS = [
    { orbitR: 2.0, speed: 0.55, phase: 0,            tilt: 0.8,  color: "#22d3ee" },
    { orbitR: 2.0, speed: 0.55, phase: Math.PI,      tilt: 0.8,  color: "#22d3ee" },
    { orbitR: 2.4, speed:-0.38, phase: Math.PI / 2,  tilt:-0.6,  color: "#a78bfa" },
    { orbitR: 2.7, speed: 0.22, phase: Math.PI*1.4,  tilt: 0.3,  color: "#34d399" },
    { orbitR: 2.4, speed:-0.38, phase: Math.PI*1.7,  tilt:-0.6,  color: "#f472b6" },
    { orbitR: 1.8, speed: 0.70, phase: Math.PI*0.7,  tilt: 1.2,  color: "#f59e0b" },
  ];

  return (
    <>
      <ambientLight intensity={0.15} />
      <PulsingLights />
      <ProcessorCore />

      <Ring radius={2.0} tilt={Math.PI/4.2}  color="#22d3ee" speed={ 0.28} opacity={0.35} />
      <Ring radius={2.4} tilt={-Math.PI/5}   color="#a78bfa" speed={-0.18} opacity={0.28} />
      <Ring radius={2.7} tilt={Math.PI/9}    color="#34d399" speed={ 0.14} opacity={0.22} />
      <Ring radius={1.7} tilt={-Math.PI/3.5} color="#f472b6" speed={-0.32} opacity={0.20} />

      {QUBITS.map((q, i) => <Qubit key={i} {...q} />)}

      <LightningSystem />
    </>
  );
}

// ─── Exported section ─────────────────────────────────────────────────────────
export function QuantumCore() {
  return (
    <section id="quantum" className="relative w-full overflow-hidden py-28">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="h-[700px] w-[700px] rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, #0284c7 0%, #4c1d95 40%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-14 space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Quantum AI Core
          </p>
          <h2 className="text-3xl font-bold text-slate-50 sm:text-4xl md:text-5xl">
            Powered by{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              quantum intelligence.
            </span>
          </h2>
          <p className="mx-auto max-w-xl text-sm text-slate-400 sm:text-base">
            VoxCode runs on a distributed quantum compute fabric — sub-millisecond voice
            processing, infinite entanglement, zero latency.
          </p>
        </div>

        {/* Canvas */}
        <div className="relative mx-auto" style={{ height: "500px", maxWidth: "680px" }}>
          {/* Radial glow behind canvas */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: "420px",
              height: "420px",
              background: "radial-gradient(circle, rgba(34,211,238,0.12) 0%, rgba(139,92,246,0.08) 50%, transparent 70%)",
              filter: "blur(30px)",
            }}
          />

          <Canvas
            camera={{ position: [0, 0, 5.8], fov: 44 }}
            gl={{
              alpha: true,
              // Disable antialias on mobile — halves GPU cost
              antialias: typeof window !== "undefined" ? window.innerWidth >= 768 : true,
              powerPreference: "high-performance",
            }}
            dpr={[1, 1.5]} // Cap at 1.5x — was 2x
            className="rounded-2xl"
          >
            <Suspense fallback={null}>
              <QuantumScene />
            </Suspense>
          </Canvas>

          {/* Corner data badges */}
          <div
            className="pointer-events-none absolute left-0 top-1/4 rounded-xl border border-cyan-400/20 bg-slate-950/85 px-3 py-2 text-xs backdrop-blur-sm"
            style={{ boxShadow: "0 0 20px rgba(34,211,238,0.12)" }}
          >
            <div className="font-semibold text-cyan-300">⚡ Entangled</div>
            <div className="text-slate-400">2,048 qubits active</div>
          </div>

          <div
            className="pointer-events-none absolute right-0 top-1/3 rounded-xl border border-violet-400/20 bg-slate-950/85 px-3 py-2 text-xs backdrop-blur-sm"
            style={{ boxShadow: "0 0 20px rgba(167,139,250,0.12)" }}
          >
            <div className="font-semibold text-violet-300">🌀 Coherence</div>
            <div className="text-slate-400">99.97% stable</div>
          </div>

          <div
            className="pointer-events-none absolute bottom-1/4 left-2 rounded-xl border border-emerald-400/20 bg-slate-950/85 px-3 py-2 text-xs backdrop-blur-sm"
            style={{ boxShadow: "0 0 20px rgba(52,211,153,0.12)" }}
          >
            <div className="font-semibold text-emerald-300">🔬 Gate fidelity</div>
            <div className="text-slate-400">99.4% accuracy</div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {QSTATS.map((s) => (
            <div
              key={s.label}
              className="group relative overflow-hidden rounded-2xl border bg-slate-900/70 px-5 py-5 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1"
              style={{ borderColor: `${s.color}25`, boxShadow: `0 0 30px ${s.color}08` }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `radial-gradient(circle at center, ${s.color}15, transparent 70%)` }}
              />
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="mt-1 text-xs text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-slate-600">
          * Simulated quantum compute layer. Real AI inference via Anthropic Claude.
        </p>
      </div>
    </section>
  );
}
