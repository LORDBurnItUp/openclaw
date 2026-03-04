"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense } from "react";

function FloatingOrbs() {
  return (
    <>
      {Array.from({ length: 40 }).map((_, index) => {
        const x = (Math.random() - 0.5) * 8;
        const y = (Math.random() - 0.5) * 4;
        const z = (Math.random() - 0.5) * 6;
        const scale = 0.05 + Math.random() * 0.1;
        return (
          <mesh key={index} position={[x, y, z]} scale={scale}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial
              emissive="#22d3ee"
              emissiveIntensity={1.2}
              color="#0ea5e9"
              roughness={0.2}
              metalness={0.7}
            />
          </mesh>
        );
      })}
    </>
  );
}

export function FuturisticScene() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 4], fov: 55 }}>
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[2, 3, 4]} intensity={1.2} />
        <Suspense fallback={null}>
          <FloatingOrbs />
        </Suspense>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.4}
        />
      </Canvas>
    </div>
  );
}

