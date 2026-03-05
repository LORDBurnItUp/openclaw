"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef, useMemo, memo } from "react";
import * as THREE from "three";

// ─── Shared geometries (memoized for performance) ───────────────────────────────
const EARTH_GEOMETRY = new THREE.SphereGeometry(1.5, 48, 48);
const WIRE_GEOMETRY = new THREE.SphereGeometry(1.5, 24, 24);
const ATMOSPHERE_INNER_GEOMETRY = new THREE.SphereGeometry(1.5, 28, 28);
const ATMOSPHERE_OUTER_GEOMETRY = new THREE.SphereGeometry(1.5, 24, 24);
const SATELLITE_GEOMETRY = new THREE.SphereGeometry(1, 12, 12);
const SATELLITE_HALO_GEOMETRY = new THREE.SphereGeometry(1, 8, 8);

// Pre-create materials for reuse
const createEarthMaterial = () => new THREE.MeshStandardMaterial({
  color: "#0c4a6e",
  emissive: "#0284c7",
  emissiveIntensity: 0.3,
  roughness: 0.65,
  metalness: 0.15,
});

const createWireMaterial = () => new THREE.MeshBasicMaterial({
  color: "#22d3ee",
  wireframe: true,
  transparent: true,
  opacity: 0.07,
});

const createAtmosphereMaterial = (color: string, opacity: number) => new THREE.MeshBasicMaterial({
  color,
  transparent: true,
  opacity,
  side: THREE.BackSide,
});

const createSatelliteCoreMaterial = (color: string) => new THREE.MeshStandardMaterial({
  emissive: color,
  emissiveIntensity: 5,
  color,
});

const createSatelliteHaloMaterial = (color: string) => new THREE.MeshBasicMaterial({
  color,
  transparent: true,
  opacity: 0.12,
});

const createOrbitMaterial = (color: string, opacity: number) => new THREE.MeshBasicMaterial({
  color,
  transparent: true,
  opacity,
});

// ─── Stats data ────────────────────────────────────────────────────────────────
const STATS = [
  { label: "Engineers online", value: "2,847", icon: "👨‍💻", color: "#22d3ee" },
  { label: "Commands today",   value: "1.24M", icon: "⚡",  color: "#a78bfa" },
  { label: "Errors auto-fixed", value: "98.3%", icon: "🛡", color: "#34d399" },
  { label: "Countries",        value: "64",    icon: "🌍",  color: "#f59e0b" },
];

// ─── Spinning Earth (optimized) ───────────────────────────────────────────────
const Earth = memo(function Earth() {
  const coreRef  = useRef<THREE.Mesh>(null);
  const wireRef  = useRef<THREE.Mesh>(null);
  
  // Memoize materials to prevent recreation on every render
  const materials = useMemo(() => ({
    core: createEarthMaterial(),
    wire: createWireMaterial(),
    atmosphereInner: createAtmosphereMaterial("#0ea5e9", 0.04),
    atmosphereOuter: createAtmosphereMaterial("#38bdf8", 0.015),
  }), []);

  useFrame((state, delta) => {
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.1;
    if (wireRef.current) {
      wireRef.current.rotation.y += delta * 0.06;
      wireRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.12) * 0.04;
    }
  });

  return (
    <group>
      {/* Solid globe */}
      <mesh ref={coreRef} geometry={EARTH_GEOMETRY} material={materials.core} />

      {/* Wireframe shell */}
      <mesh ref={wireRef} geometry={WIRE_GEOMETRY} material={materials.wire} scale={1.003} />

      {/* Atmosphere — inner */}
      <mesh geometry={ATMOSPHERE_INNER_GEOMETRY} material={materials.atmosphereInner} scale={1.1} />

      {/* Atmosphere — outer halo */}
      <mesh geometry={ATMOSPHERE_OUTER_GEOMETRY} material={materials.atmosphereOuter} scale={1.22} />
    </group>
  );
});

// ─── Orbit ring (optimized) ───────────────────────────────────────────────────
const OrbitRing = memo(function OrbitRing({
  radius,
  tilt,
  color,
  speed,
  opacity,
}: {
  radius: number;
  tilt: number;
  color: string;
  speed: number;
  opacity: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  
  const geometry = useMemo(() => new THREE.TorusGeometry(radius, 0.005, 6, 128), [radius]);
  const material = useMemo(() => createOrbitMaterial(color, opacity), [color, opacity]);
  
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * speed;
  });
  
  return (
    <mesh ref={ref} geometry={geometry} material={material} rotation={[tilt, 0, 0]} />
  );
});

// ─── Orbiting satellite dot (optimized) ────────────────────────────────────
const Satellite = memo(function Satellite({
  orbitR,
  speed,
  phase,
  tiltY,
  color,
  size,
}: {
  orbitR: number;
  speed: number;
  phase: number;
  tiltY: number;
  color: string;
  size: number;
}) {
  const ref = useRef<THREE.Group>(null);
  
  const materials = useMemo(() => ({
    core: createSatelliteCoreMaterial(color),
    halo: createSatelliteHaloMaterial(color),
  }), [color]);
  
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed + phase;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    ref.current.position.set(
      cosT * orbitR,
      sinT * orbitR * Math.sin(tiltY),
      sinT * orbitR * Math.cos(tiltY),
    );
  });

  return (
    <group ref={ref}>
      {/* Core dot */}
      <mesh scale={size} geometry={SATELLITE_GEOMETRY} material={materials.core} />
      {/* Halo */}
      <mesh scale={size * 3} geometry={SATELLITE_HALO_GEOMETRY} material={materials.halo} />
    </group>
  );
});

// ─── Scene wrapper ─────────────────────────────────────────────────────────────
function Scene() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[6, 4, 5]}  intensity={1.6}  color="#38bdf8" />
      <directionalLight position={[-5, -3, -4]} intensity={0.5} color="#818cf8" />
      <pointLight position={[0, 0, 9]} intensity={0.6} color="#0ea5e9" />

      <Earth />

      {/* Orbit rings */}
      <OrbitRing radius={2.05} tilt={Math.PI / 4.2} color="#22d3ee" speed={0.28}  opacity={0.38} />
      <OrbitRing radius={2.35} tilt={-Math.PI / 5}  color="#818cf8" speed={-0.18} opacity={0.28} />
      <OrbitRing radius={2.65} tilt={Math.PI / 9}   color="#34d399" speed={0.14}  opacity={0.22} />

      {/* Cyan satellites */}
      <Satellite orbitR={2.05} speed={0.55} phase={0}          tiltY={0.8} color="#22d3ee" size={0.045} />
      <Satellite orbitR={2.05} speed={0.55} phase={Math.PI}    tiltY={0.8} color="#22d3ee" size={0.04}  />

      {/* Violet satellite */}
      <Satellite orbitR={2.35} speed={-0.38} phase={Math.PI / 2} tiltY={-0.6} color="#a78bfa" size={0.038} />

      {/* Green satellite */}
      <Satellite orbitR={2.65} speed={0.22} phase={Math.PI * 1.4} tiltY={0.3} color="#34d399" size={0.032} />

      {/* Amber satellite */}
      <Satellite orbitR={2.35} speed={-0.38} phase={Math.PI * 1.7} tiltY={-0.6} color="#f59e0b" size={0.03} />
    </>
  );
}

// ─── Exported component ────────────────────────────────────────────────────────
export function EarthDashboard() {
  return (
    <section id="earth" className="relative w-full overflow-hidden py-28">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="h-[600px] w-[600px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, #0284c7 0%, #0c4a6e 40%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-14 space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Live global network
          </p>
          <h2 className="text-3xl font-bold text-slate-50 sm:text-4xl md:text-5xl">
            Real engineers,{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-sky-400 bg-clip-text text-transparent">
              everywhere.
            </span>
          </h2>
          <p className="mx-auto max-w-xl text-sm text-slate-400 sm:text-base">
            VoxCode runs where you run — any OS, any IDE, any timezone on Earth.
          </p>
        </div>

        {/* Globe canvas */}
        <div className="relative mx-auto" style={{ height: "480px", maxWidth: "640px" }}>
          {/* Glow ring behind globe */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: "380px",
              height: "380px",
              background: "radial-gradient(circle, #0284c755 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          <Canvas
            camera={{ position: [0, 0, 5.2], fov: 42 }}
            gl={{ 
              alpha: true, 
              antialias: true,
              powerPreference: "high-performance",
            }}
            dpr={[1, 2]} // Limit pixel ratio for performance
            style={{ background: "transparent" }}
          >
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </Canvas>

          {/* Floating corner badges */}
          <div
            className="pointer-events-none absolute left-0 top-1/4 rounded-xl border border-cyan-400/20 bg-slate-900/80 px-3 py-2 text-xs backdrop-blur-sm"
            style={{ boxShadow: "0 0 20px rgba(34,211,238,0.1)" }}
          >
            <div className="text-cyan-300 font-semibold">🟢 Live</div>
            <div className="text-slate-400">All systems nominal</div>
          </div>

          <div
            className="pointer-events-none absolute right-0 top-1/3 rounded-xl border border-violet-400/20 bg-slate-900/80 px-3 py-2 text-xs backdrop-blur-sm"
            style={{ boxShadow: "0 0 20px rgba(167,139,250,0.1)" }}
          >
            <div className="text-violet-300 font-semibold">⚡ 1.24M</div>
            <div className="text-slate-400">commands today</div>
          </div>

          <div
            className="pointer-events-none absolute bottom-1/4 left-2 rounded-xl border border-emerald-400/20 bg-slate-900/80 px-3 py-2 text-xs backdrop-blur-sm"
            style={{ boxShadow: "0 0 20px rgba(52,211,153,0.1)" }}
          >
            <div className="text-emerald-300 font-semibold">🛡 98.3%</div>
            <div className="text-slate-400">errors auto-fixed</div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-2xl border bg-slate-900/70 px-5 py-5 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1"
              style={{
                borderColor: `${stat.color}25`,
                boxShadow: `0 0 30px ${stat.color}08`,
              }}
            >
              {/* Inner glow on hover */}
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(circle at center, ${stat.color}12, transparent 70%)`,
                }}
              />
              <div className="text-2xl">{stat.icon}</div>
              <div
                className="mt-1 text-2xl font-bold"
                style={{ color: stat.color }}
              >
                {stat.value}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Bottom tagline */}
        <p className="mt-10 text-center text-xs text-slate-500">
          * Stats are illustrative. Real telemetry coming in v2.
        </p>
      </div>
    </section>
  );
}
