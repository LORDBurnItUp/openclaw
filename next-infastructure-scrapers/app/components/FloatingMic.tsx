"use client";

import { useState } from "react";

const baseClasses =
  "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/60 bg-cyan-400/10 shadow-[0_0_40px_rgba(34,211,238,0.65)] backdrop-blur cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-cyan-400/20 active:scale-95";

export function FloatingMic() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Toggle Voxcode command palette"
        className={baseClasses}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/70 bg-slate-950`}
        >
          <span className="absolute inset-0 rounded-full bg-cyan-400/20 blur-md" />
          <span className="relative h-4 w-2 rounded-full bg-cyan-300" />
        </span>
      </button>

      {open ? (
        <div className="fixed bottom-24 right-6 z-40 w-72 rounded-2xl border border-slate-800 bg-slate-950/95 p-3 text-[11px] text-slate-200 shadow-xl shadow-slate-950/80 backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-50">
              Voxcode commands
            </span>
            <button
              type="button"
              className="cursor-pointer text-xs text-slate-500 hover:text-slate-200"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
          <p className="mb-2 text-[11px] text-slate-400">
            Click a mode or use phrases like{" "}
            <span className="text-cyan-300">&quot;voxcode off&quot;</span>,{" "}
            <span className="text-cyan-300">&quot;voxcode scan&quot;</span>,{" "}
            <span className="text-cyan-300">&quot;voxcode enhance&quot;</span>.
          </p>
          <div className="space-y-1">
            <button
              type="button"
              className={`w-full rounded-lg border px-2 py-1 text-left text-[11px] cursor-pointer transition-colors ${
                listening
                  ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200"
                  : "border-slate-700 bg-slate-900/60 hover:border-cyan-400/60 hover:bg-cyan-400/10"
              }`}
              onClick={() => setListening((value) => !value)}
            >
              {listening ? "Voxcode off" : "Voxcode on"} – start / stop listening
            </button>
            <button
              type="button"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-left text-[11px] cursor-pointer hover:border-cyan-400/60 hover:bg-cyan-400/10"
            >
              Deep scan – inspect current file for issues
            </button>
            <button
              type="button"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-left text-[11px] cursor-pointer hover:border-cyan-400/60 hover:bg-cyan-400/10"
            >
              Enhance mode – improve the last change
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

