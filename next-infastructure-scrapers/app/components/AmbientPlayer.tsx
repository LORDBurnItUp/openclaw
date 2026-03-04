"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Mood = "chill" | "sleep" | "focus";

const MOODS: Record<Mood, { label: string; emoji: string; baseHz: number; bpm: number; color: string; desc: string }> = {
  chill: { label: "Chill",  emoji: "🌊", baseHz: 110, bpm: 68, color: "#22d3ee", desc: "Lo-fi waves" },
  sleep: { label: "Sleep",  emoji: "🌙", baseHz: 55,  bpm: 48, color: "#818cf8", desc: "Deep drift"  },
  focus: { label: "Focus",  emoji: "⚡", baseHz: 140, bpm: 90, color: "#34d399", desc: "Flow state"  },
};

const PENTA = [0, 2, 4, 7, 9]; // pentatonic intervals in semitones

function buildReverb(ctx: AudioContext): ConvolverNode {
  const sr  = ctx.sampleRate;
  const len = sr * 3.5;
  const buf = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  return conv;
}

export function AmbientPlayer() {
  const [playing,  setPlaying]  = useState(false);
  const [mood,     setMood]     = useState<Mood>("chill");
  const [volume,   setVolume]   = useState(0.32);
  const [expanded, setExpanded] = useState(false);
  const [viz,      setViz]      = useState([3, 5, 8, 5, 10, 7, 4, 9, 6, 3]);

  const ctxRef    = useRef<AudioContext | null>(null);
  const gainRef   = useRef<GainNode | null>(null);
  const nodesRef  = useRef<AudioNode[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const vizTimRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAll = useCallback(() => {
    if (timerRef.current)  { clearInterval(timerRef.current);  timerRef.current  = null; }
    if (vizTimRef.current) { clearInterval(vizTimRef.current); vizTimRef.current = null; }
    nodesRef.current.forEach(n => {
      try { (n as OscillatorNode).stop?.(); } catch { /* already stopped */ }
      try { n.disconnect(); }              catch { /* already disconnected */ }
    });
    nodesRef.current = [];
  }, []);

  const startAll = useCallback((m: Mood, vol: number) => {
    stopAll();
    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") ctx.resume();

    const master = ctx.createGain();
    master.gain.setValueAtTime(vol, ctx.currentTime);
    gainRef.current = master;

    const reverb     = buildReverb(ctx);
    const revGain    = ctx.createGain();
    revGain.gain.setValueAtTime(0.35, ctx.currentTime);
    master.connect(reverb);
    reverb.connect(revGain);
    revGain.connect(ctx.destination);
    master.connect(ctx.destination);

    const cfg = MOODS[m];
    const nodes: AudioNode[] = [master, reverb, revGain];

    // ── Drone pad (3 detuned sines + 1 sawtooth sub) ────────────────────────
    const droneFreqs = [cfg.baseHz * 0.5, cfg.baseHz, cfg.baseHz * 1.5, cfg.baseHz * 2];
    droneFreqs.forEach((freq, idx) => {
      const osc  = ctx.createOscillator();
      const gn   = ctx.createGain();
      const filt = ctx.createBiquadFilter();

      osc.type = idx === 0 ? "sawtooth" : "sine";
      osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 1.5, ctx.currentTime);
      gn.gain.setValueAtTime(idx === 0 ? 0.07 : 0.045, ctx.currentTime);

      filt.type = "lowpass";
      filt.frequency.setValueAtTime(600 + idx * 200, ctx.currentTime);

      // Slow LFO for tremolo
      const lfo  = ctx.createOscillator();
      const lGn  = ctx.createGain();
      lfo.frequency.setValueAtTime(0.12 + idx * 0.05, ctx.currentTime);
      lGn.gain.setValueAtTime(0.6,  ctx.currentTime);
      lfo.connect(lGn);
      lGn.connect(osc.frequency);

      osc.connect(filt); filt.connect(gn); gn.connect(master);
      osc.start(); lfo.start();
      nodes.push(osc, gn, filt, lfo, lGn);
    });

    // ── Melody notes (pentatonic, random timing) ─────────────────────────────
    const beatMs = (60 / cfg.bpm) * 1000 * 2;
    const playNote = () => {
      const c2 = ctxRef.current;
      if (!c2) return;
      const semi  = PENTA[Math.floor(Math.random() * PENTA.length)];
      const oct   = Math.random() > 0.65 ? 2 : 1;
      const freq  = cfg.baseHz * Math.pow(2, semi / 12) * oct;
      const n     = c2.createOscillator();
      const ng    = c2.createGain();
      n.type = "sine";
      n.frequency.setValueAtTime(freq, c2.currentTime);
      ng.gain.setValueAtTime(0, c2.currentTime);
      ng.gain.linearRampToValueAtTime(0.055, c2.currentTime + 0.25);
      ng.gain.linearRampToValueAtTime(0,     c2.currentTime + 2.8);
      n.connect(ng); ng.connect(master);
      n.start(); n.stop(c2.currentTime + 3.2);
    };

    timerRef.current = setInterval(playNote, beatMs + Math.random() * 800);
    nodesRef.current = nodes;

    // ── Visualizer update ─────────────────────────────────────────────────────
    vizTimRef.current = setInterval(() => {
      setViz(() => Array.from({ length: 10 }, (_, i) => 3 + Math.random() * (m === "sleep" ? 7 : m === "focus" ? 12 : 9)));
    }, 180);
  }, [stopAll]);

  useEffect(() => {
    if (playing) startAll(mood, volume);
    else         stopAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, mood]);

  useEffect(() => {
    if (gainRef.current && ctxRef.current)
      gainRef.current.gain.setTargetAtTime(volume, ctxRef.current.currentTime, 0.08);
  }, [volume]);

  useEffect(() => () => stopAll(), [stopAll]);

  const cfg = MOODS[mood];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className="rounded-2xl border border-slate-700/60 bg-slate-950/96 backdrop-blur-xl shadow-2xl transition-all duration-300"
        style={{
          boxShadow: playing
            ? `0 0 40px ${cfg.color}18, 0 8px 32px rgba(0,0,0,0.7)`
            : "0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        {/* ── Mini bar ── */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Play/pause */}
          <button
            type="button"
            onClick={() => setPlaying(p => !p)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-black text-slate-950 transition-transform hover:scale-110 active:scale-95"
            style={{
              background: playing
                ? `linear-gradient(135deg, ${cfg.color}, #0ea5e9)`
                : "rgba(100,116,139,0.35)",
            }}
          >
            {playing ? "⏸" : "▶"}
          </button>

          {/* Waveform viz */}
          <div className="flex items-center gap-[2px]" style={{ height: "20px", width: "60px" }}>
            {viz.map((h, i) => (
              <span
                key={i}
                className="w-[4px] rounded-full transition-all duration-200"
                style={{
                  height: playing ? `${h}px` : "3px",
                  background: playing ? cfg.color : "rgba(100,116,139,0.4)",
                  opacity:    playing ? 0.6 + (i % 3) * 0.15 : 1,
                }}
              />
            ))}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-slate-200 truncate">
              {cfg.emoji} {cfg.label} · <span className="text-slate-500">{cfg.desc}</span>
            </div>
            <div className="text-[10px] text-slate-600">{playing ? "♪ Playing ambient" : "Paused"}</div>
          </div>

          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="text-[10px] text-slate-600 hover:text-slate-400 px-1"
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>

        {/* ── Expanded panel ── */}
        {expanded && (
          <div className="border-t border-slate-800/60 px-4 pb-4 pt-3 space-y-3">
            {/* Mood buttons */}
            <div className="flex gap-1.5">
              {(Object.keys(MOODS) as Mood[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMood(m); if (playing) startAll(m, volume); }}
                  className="flex-1 rounded-xl py-1.5 text-[10px] font-semibold transition-all"
                  style={{
                    background:   mood === m ? `${MOODS[m].color}18` : "rgba(30,41,59,0.5)",
                    color:        mood === m ? MOODS[m].color : "#64748b",
                    border:       `1px solid ${mood === m ? MOODS[m].color + "35" : "rgba(100,116,139,0.15)"}`,
                  }}
                >
                  {MOODS[m].emoji} {MOODS[m].label}
                </button>
              ))}
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-600">🔈</span>
              <input
                type="range" min={0} max={1} step={0.01} value={volume}
                onChange={e => setVolume(+e.target.value)}
                className="flex-1"
                style={{ accentColor: cfg.color }}
              />
              <span className="text-[10px] text-slate-500 w-7 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
