"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// WebcamArena — 10 camera feeds (5 left + 5 right) for P2P video chat
// Slot 0 = Douglas (AI agent), rest are user cams
// ═══════════════════════════════════════════════════════════════════════════

interface CamSlot {
  id: number;
  label: string;
  status: "empty" | "live" | "connecting" | "offline";
  position: "left" | "right";
  isAI?: boolean;
  muted?: boolean;
}

const INITIAL_SLOTS: CamSlot[] = [
  // Left side (5) — Douglas is slot 0
  { id: 0, label: "Agent Douglas", status: "live", position: "left", isAI: true },
  { id: 1, label: "Cam 2", status: "empty", position: "left" },
  { id: 2, label: "Cam 3", status: "empty", position: "left" },
  { id: 3, label: "Cam 4", status: "empty", position: "left" },
  { id: 4, label: "Cam 5", status: "empty", position: "left" },
  // Right side (5)
  { id: 5, label: "Cam 6", status: "empty", position: "right" },
  { id: 6, label: "Cam 7", status: "empty", position: "right" },
  { id: 7, label: "Cam 8", status: "empty", position: "right" },
  { id: 8, label: "Cam 9", status: "empty", position: "right" },
  { id: 9, label: "Cam 10", status: "empty", position: "right" },
];

const STATUS_COLORS: Record<string, string> = {
  live: "#22c55e",
  connecting: "#fbbf24",
  empty: "#475569",
  offline: "#ef4444",
};
const STATUS_LABELS: Record<string, string> = {
  live: "LIVE",
  connecting: "CONNECTING",
  empty: "EMPTY",
  offline: "OFFLINE",
};

function DougAvatarAI({ size = 44 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-full font-black text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: "linear-gradient(135deg, #a78bfa, #1e1b4b)",
        boxShadow: "0 0 20px rgba(167,139,250,0.5)",
      }}
    >
      D
      <span
        className="absolute inset-0 rounded-full"
        style={{ animation: "douglasAIPulse 2s ease-in-out infinite", background: "rgba(167,139,250,0.25)" }}
      />
    </div>
  );
}

function CamCard({
  slot,
  activeMyCam,
  onActivate,
}: {
  slot: CamSlot;
  activeMyCam: number | null;
  onActivate: (id: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMySlot = activeMyCam === slot.id;

  return (
    <div
      className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.03]"
      style={{
        border: `1px solid ${slot.status === "live" ? "rgba(34,211,238,0.2)" : "rgba(71,85,105,0.2)"}`,
        background: "rgba(8,8,18,0.85)",
        backdropFilter: "blur(12px)",
        boxShadow: slot.status === "live"
          ? "0 0 20px rgba(34,211,238,0.08), inset 0 1px 0 rgba(255,255,255,0.03)"
          : "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      {/* Camera viewport */}
      <div className="relative" style={{ height: 90 }}>
        {slot.isAI ? (
          /* Douglas AI visual */
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(167,139,250,0.08), rgba(30,27,75,0.3))",
            }}
          >
            <DougAvatarAI size={44} />
            {/* AI wave bars */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-[2px]">
              {[3, 5, 8, 6, 10, 7, 4, 9, 5, 3, 7, 6].map((h, i) => (
                <span
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 2,
                    height: h * 1.2,
                    background: `rgba(167,139,250,${0.4 + (i % 3) * 0.15})`,
                    animation: `aiWave ${0.6 + i * 0.05}s ease-in-out ${i * 40}ms infinite alternate`,
                  }}
                />
              ))}
            </div>
          </div>
        ) : slot.status === "live" && isMySlot ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          /* Empty slot */
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1"
            style={{ background: "rgba(15,23,42,0.6)" }}
          >
            <span className="text-xl opacity-20">📷</span>
            <span className="text-[8px] text-slate-700 tracking-wider">
              {slot.status === "empty" ? "AVAILABLE" : STATUS_LABELS[slot.status]}
            </span>
          </div>
        )}

        {/* Status indicator */}
        <div
          className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md px-1.5 py-0.5"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: STATUS_COLORS[slot.status],
              boxShadow: `0 0 6px ${STATUS_COLORS[slot.status]}`,
              animation: slot.status === "live" ? "camPulse 2s ease-in-out infinite" : "none",
            }}
          />
          <span className="text-[7px] font-bold tracking-widest text-slate-400">{STATUS_LABELS[slot.status]}</span>
        </div>

        {/* Slot number */}
        <div
          className="absolute top-1.5 right-1.5 rounded-md px-1.5 py-0.5 text-[7px] font-bold text-slate-500"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          #{slot.id + 1}
        </div>
      </div>

      {/* Label + actions */}
      <div className="flex items-center justify-between px-2.5 py-2">
        <div>
          <div className="text-[10px] font-bold text-slate-300 truncate max-w-[80px]">{slot.label}</div>
          <div className="text-[7px] text-slate-600 mt-0.5">{slot.isAI ? "AI Agent · OpenClaw" : "User Slot"}</div>
        </div>
        {!slot.isAI && (
          <button
            onClick={() => onActivate(slot.id)}
            className="rounded-lg px-2 py-1 text-[8px] font-bold transition-all"
            style={{
              background: isMySlot ? "rgba(239,68,68,0.15)" : "rgba(34,211,238,0.1)",
              color: isMySlot ? "#f87171" : "#22d3ee",
              border: `1px solid ${isMySlot ? "rgba(239,68,68,0.25)" : "rgba(34,211,238,0.2)"}`,
            }}
          >
            {isMySlot ? "Leave" : "Join"}
          </button>
        )}
        {slot.isAI && (
          <span
            className="rounded-lg px-2 py-1 text-[8px] font-bold"
            style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}
          >
            1v1
          </span>
        )}
      </div>
    </div>
  );
}

export function WebcamArena() {
  const [slots, setSlots] = useState<CamSlot[]>(INITIAL_SLOTS);
  const [myCam, setMyCam] = useState<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const activateCam = useCallback(async (slotId: number) => {
    // If already in this slot, leave
    if (myCam === slotId) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setSlots((s) => s.map((slot) => (slot.id === slotId ? { ...slot, status: "empty" as const } : slot)));
      setMyCam(null);
      return;
    }

    // Leave previous slot
    if (myCam !== null) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setSlots((s) => s.map((slot) => (slot.id === myCam ? { ...slot, status: "empty" as const } : slot)));
    }

    // Join new slot
    setSlots((s) => s.map((slot) => (slot.id === slotId ? { ...slot, status: "connecting" as const } : slot)));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setSlots((s) => s.map((slot) => (slot.id === slotId ? { ...slot, status: "live" as const, label: "You" } : slot)));
      setMyCam(slotId);
    } catch {
      setSlots((s) => s.map((slot) => (slot.id === slotId ? { ...slot, status: "empty" as const } : slot)));
    }
  }, [myCam]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const leftSlots = slots.filter((s) => s.position === "left");
  const rightSlots = slots.filter((s) => s.position === "right");

  return (
    <>
      {/* Left column */}
      <div
        className="fixed left-0 top-1/2 -translate-y-1/2 z-[55] flex flex-col gap-2 pl-2"
        style={{ width: 150 }}
      >
        <div className="text-[8px] font-bold tracking-[0.2em] text-slate-600 text-center mb-1">
          ◄ SQUAD LEFT
        </div>
        {leftSlots.map((slot) => (
          <CamCard key={slot.id} slot={slot} activeMyCam={myCam} onActivate={activateCam} />
        ))}
      </div>

      {/* Right column */}
      <div
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[55] flex flex-col gap-2 pr-2"
        style={{ width: 150 }}
      >
        <div className="text-[8px] font-bold tracking-[0.2em] text-slate-600 text-center mb-1">
          SQUAD RIGHT ►
        </div>
        {rightSlots.map((slot) => (
          <CamCard key={slot.id} slot={slot} activeMyCam={myCam} onActivate={activateCam} />
        ))}
      </div>

      <style>{`
        @keyframes douglasAIPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50%      { transform: scale(1.6); opacity: 0; }
        }
        @keyframes aiWave {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
        @keyframes camPulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}
