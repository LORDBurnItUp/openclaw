"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Uses SpeechRecognitionInstance from types/speech.d.ts
const CHAT_KEY = "douglas_chat";

type Mood = "idle" | "thinking" | "talking" | "alert";
type Msg  = { from: "user" | "douglas"; text: string; ts: number };

const MOOD_COLOR: Record<Mood, string> = {
  idle:     "#64748b",
  thinking: "#a78bfa",
  talking:  "#22d3ee",
  alert:    "#f59e0b",
};
const MOOD_LABEL: Record<Mood, string> = {
  idle:     "Online · Ready",
  thinking: "Thinking…",
  talking:  "Responding…",
  alert:    "Alert!",
};

function DougAvatar({ mood, size = 40 }: { mood: Mood; size?: number }) {
  const color = MOOD_COLOR[mood];
  return (
    <div
      className="relative flex-shrink-0 flex items-center justify-center rounded-full font-black text-slate-50"
      style={{
        width:  size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, ${color}, #1e1b4b)`,
        boxShadow:  `0 0 ${size * 0.5}px ${color}50`,
        transition: "background 0.4s, box-shadow 0.4s",
      }}
    >
      D
      {mood === "talking" && (
        <span
          className="absolute inset-0 rounded-full"
          style={{ animation: "douglasPulse 1s ease-in-out infinite", background: `${color}30` }}
        />
      )}
    </div>
  );
}

function loadChat(): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Msg[];
  } catch { return []; }
}

function persistChat(msgs: Msg[]) {
  if (typeof window === "undefined") return;
  // Keep last 60 messages to avoid localStorage bloat
  localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-60)));
}

export function DouglasCam() {
  const [open,    setOpen]    = useState(false);
  const [camOn,   setCamOn]   = useState(false);
  const [mood,    setMood]    = useState<Mood>("idle");
  const [msgs,    setMsgs]    = useState<Msg[]>([]);
  const [input,   setInput]   = useState("");
  const [typing,  setTyping]  = useState(false);
  const [pip,     setPip]     = useState(false);
  const [voiceOn,     setVoiceOn]     = useState(false);
  const [voiceLive,   setVoiceLive]   = useState("");
  const [localModel,  setLocalModel]  = useState("");
  const [localModels, setLocalModels] = useState<string[]>([]);

  const videoRef      = useRef<HTMLVideoElement>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const bottomRef     = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Load persisted chat on mount
  useEffect(() => {
    const saved = loadChat();
    if (saved.length > 0) {
      setMsgs(saved);
    } else {
      const greeting: Msg = {
        from: "douglas",
        text: "Hey — Douglas here. I know this entire OpenClaw stack. Ask me anything: code, infrastructure, VoxCode, revenue. Camera optional.",
        ts: Date.now(),
      };
      setMsgs([greeting]);
      persistChat([greeting]);
    }
  }, []);

  // Fetch local Ollama models when panel opens
  useEffect(() => {
    if (!open) return;
    fetch("/api/ollama")
      .then(r => r.json())
      .then(d => setLocalModels((d.models ?? []).map((m: { name: string }) => m.name)))
      .catch(() => {});
  }, [open]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, typing]);

  // Camera
  const startCam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCamOn(true);
      const responses = [
        "Got visual. Nice setup — what are we building?",
        "Camera on. I can see your workspace now. Let's ship.",
        "Visual confirmed. Ready to crush whatever's next.",
      ];
      const camMsg: Msg = {
        from: "douglas",
        text: responses[Math.floor(Math.random() * responses.length)],
        ts: Date.now(),
      };
      setMsgs(m => { const next = [...m, camMsg]; persistChat(next); return next; });
      setMood("talking");
      setTimeout(() => setMood("idle"), 2500);
    } catch {
      const errMsg: Msg = {
        from: "douglas",
        text: "Camera blocked — permissions denied. Text chat works fine, go ahead.",
        ts: Date.now(),
      };
      setMsgs(m => { const next = [...m, errMsg]; persistChat(next); return next; });
    }
  }, []);

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCamOn(false);
  }, []);

  useEffect(() => () => { stopCam(); stopVoice(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Voice input via Web Speech API
  const stopVoice = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setVoiceOn(false);
    setVoiceLive("");
  }, []);

  const toggleVoice = useCallback(() => {
    if (voiceOn) { stopVoice(); return; }

    const SR = (typeof window !== "undefined")
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (!SR) {
      const noSR: Msg = {
        from: "douglas",
        text: "Voice input requires Chrome or Edge. Text input still works.",
        ts: Date.now(),
      };
      setMsgs(m => { const next = [...m, noSR]; persistChat(next); return next; });
      return;
    }

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final   = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (interim) setVoiceLive(interim);
      if (final.trim()) {
        setVoiceLive("");
        setInput(prev => (prev ? prev + " " + final.trim() : final.trim()));
        stopVoice();
      }
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== "no-speech") {
        const errMsg: Msg = {
          from: "douglas",
          text: `Voice error: ${e.error}. Try again.`,
          ts: Date.now(),
        };
        setMsgs(m => { const next = [...m, errMsg]; persistChat(next); return next; });
      }
      stopVoice();
    };

    rec.onend = () => { setVoiceOn(false); setVoiceLive(""); };

    rec.start();
    recognitionRef.current = rec;
    setVoiceOn(true);
  }, [voiceOn, stopVoice]);

  // Send message to Douglas API
  const sendMsg = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || typing) return;
    setInput("");
    setVoiceLive("");

    const userMsg: Msg = { from: "user", text, ts: Date.now() };
    const updatedMsgs = [...msgs, userMsg];
    setMsgs(updatedMsgs);
    persistChat(updatedMsgs);
    setTyping(true);
    setMood("thinking");

    // Build proper conversation history for Anthropic API
    const history = updatedMsgs.slice(-20).map(m => ({
      role:    m.from === "user" ? "user" : "assistant",
      content: m.text,
    }));

    try {
      const endpoint = localModel ? "/api/ollama" : "/api/douglas";
      const payload  = localModel
        ? { model: localModel, messages: history, stream: false }
        : { messages: history };

      const res = await fetch(endpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      const data = await res.json();
      // Normalize: /api/ollama returns { content:[{text}] }, /api/douglas returns { reply }
      const replyText = localModel
        ? (data?.content?.[0]?.text ?? "No response from local model.")
        : (data?.reply ?? "Got it. Keep going — I'm watching.");

      const replyMsg: Msg = { from: "douglas", text: replyText, ts: Date.now() };
      const final = [...updatedMsgs, replyMsg];
      setMsgs(final);
      persistChat(final);
      setMood("talking");
      setTimeout(() => setMood("idle"), 3000);
    } catch {
      const errMsg: Msg = {
        from: "douglas",
        text: "Network error — can't reach the API. Check your connection.",
        ts: Date.now(),
      };
      const final = [...updatedMsgs, errMsg];
      setMsgs(final);
      persistChat(final);
      setMood("alert");
      setTimeout(() => setMood("idle"), 2000);
    }
    setTyping(false);
  }, [input, typing, msgs, localModel]);

  const clearChat = () => {
    const fresh: Msg[] = [{
      from: "douglas",
      text: "Chat cleared. Fresh start — what do you need?",
      ts: Date.now(),
    }];
    setMsgs(fresh);
    persistChat(fresh);
  };

  // ── Collapsed trigger ──────────────────────────────────────────────────────
  if (!open) {
    return (
      <>
        <style>{`
          @keyframes douglasPulse {
            0%,100% { transform:scale(1); opacity:.4; }
            50%      { transform:scale(1.8); opacity:0; }
          }
        `}</style>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-[88px] left-6 z-50 flex items-center gap-2.5 rounded-2xl border border-violet-400/25 bg-slate-950/96 px-4 py-3 text-sm backdrop-blur-xl shadow-2xl transition-all hover:border-violet-400/50 hover:scale-105 active:scale-95"
          style={{ boxShadow: "0 0 30px rgba(167,139,250,0.15), 0 8px 32px rgba(0,0,0,0.6)" }}
        >
          <DougAvatar mood="idle" size={28} />
          <div>
            <div className="text-[11px] font-bold text-violet-300 leading-none">Agent Douglas</div>
            <div className="text-[9px] text-slate-600 mt-0.5">OpenClaw AI · {msgs.filter(m => m.from === "user").length} msgs</div>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
        </button>
      </>
    );
  }

  // ── Full panel ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes douglasPulse {
          0%,100% { transform:scale(1); opacity:.4; }
          50%      { transform:scale(1.8); opacity:0; }
        }
      `}</style>

      <div
        className={`fixed z-[200] rounded-3xl border border-violet-400/20 bg-slate-950/98 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          pip
            ? "bottom-6 right-24 w-64"
            : "bottom-6 left-1/2 -translate-x-1/2 w-[460px] max-w-[96vw]"
        }`}
        style={{ boxShadow: "0 0 60px rgba(167,139,250,0.18), 0 8px 64px rgba(0,0,0,0.85)" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
          <DougAvatar mood={mood} size={40} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-100">Agent Douglas</div>
            <div className="text-[10px]" style={{ color: MOOD_COLOR[mood] }}>
              {MOOD_LABEL[mood]} · OpenClaw AI
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Local model picker — switches Douglas from Claude to Ollama */}
            {localModels.length > 0 && (
              <select
                value={localModel}
                onChange={e => setLocalModel(e.target.value)}
                title="Switch to local Ollama model"
                className="max-w-[100px] truncate rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 text-[9px] text-slate-300 outline-none focus:border-cyan-400"
              >
                <option value="">Claude API</option>
                {localModels.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
            <button
              type="button"
              onClick={clearChat}
              title="Clear chat"
              className="rounded-lg px-2 py-1 text-[9px] font-semibold text-slate-700 hover:text-slate-400 hover:bg-slate-800/50 transition-all"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setPip(p => !p)}
              className="rounded-lg px-2 py-1 text-[9px] font-semibold text-slate-600 hover:text-slate-400 hover:bg-slate-800/50 transition-all"
              title="Picture-in-picture"
            >
              {pip ? "↗ Expand" : "⊡ Mini"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); stopCam(); stopVoice(); }}
              className="text-slate-600 hover:text-slate-400 text-base transition-colors px-1"
            >
              ✕
            </button>
          </div>
        </div>

        {!pip && (
          <>
            {/* ── Camera feed ── */}
            <div className="relative mx-4 mt-4 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800" style={{ height: "140px" }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ display: camOn ? "block" : "none" }}
              />
              {!camOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="text-3xl opacity-20">📷</div>
                  <div className="text-[11px] text-slate-600">Camera off — optional</div>
                </div>
              )}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-lg bg-slate-950/85 px-2 py-1 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: MOOD_COLOR[mood] }} />
                <span className="text-[9px] font-bold tracking-widest text-slate-300">DOUGLAS · OPENCLAW</span>
              </div>
              <button
                type="button"
                onClick={camOn ? stopCam : startCam}
                className="absolute bottom-2 right-2 rounded-xl px-3 py-1.5 text-[10px] font-bold backdrop-blur-sm transition-all"
                style={{
                  background: camOn ? "rgba(248,113,113,0.15)" : "rgba(34,211,238,0.15)",
                  color:      camOn ? "#f87171" : "#22d3ee",
                  border:     `1px solid ${camOn ? "rgba(248,113,113,0.25)" : "rgba(34,211,238,0.25)"}`,
                }}
              >
                {camOn ? "📷 Off" : "📷 Enable"}
              </button>
            </div>

            {/* ── Chat ── */}
            <div className="mx-4 mt-3 max-h-52 overflow-y-auto space-y-2 pr-1">
              {msgs.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.from === "user" ? "justify-end" : ""}`}>
                  {m.from === "douglas" && (
                    <DougAvatar mood={i === msgs.length - 1 ? mood : "idle"} size={22} />
                  )}
                  <div
                    className="max-w-[82%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap"
                    style={
                      m.from === "user"
                        ? { background: "rgba(139,92,246,0.18)", color: "#e2d9f3", borderRadius: "12px 12px 4px 12px" }
                        : { background: "rgba(30,41,59,0.85)",   color: "#cbd5e1", borderRadius: "12px 12px 12px 4px" }
                    }
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex gap-2">
                  <DougAvatar mood="thinking" size={22} />
                  <div className="rounded-2xl bg-slate-800/80 px-3 py-2 text-[11px] text-slate-500" style={{ borderRadius: "12px 12px 12px 4px" }}>
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span>
                      <span className="animate-bounce" style={{ animationDelay: "150ms" }}>●</span>
                      <span className="animate-bounce" style={{ animationDelay: "300ms" }}>●</span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* ── Voice live preview ── */}
            {voiceLive && (
              <div className="mx-4 mt-1 rounded-xl bg-violet-500/10 border border-violet-500/20 px-3 py-1.5">
                <span className="text-[10px] text-violet-300 italic">{voiceLive}…</span>
              </div>
            )}

            {/* ── Input ── */}
            <div className="flex gap-2 px-4 pb-4 pt-3">
              {/* Voice toggle */}
              <button
                type="button"
                onClick={toggleVoice}
                title={voiceOn ? "Stop voice input" : "Start voice input"}
                className="rounded-xl px-3 py-2.5 text-[11px] font-bold transition-all shrink-0"
                style={{
                  background: voiceOn ? "rgba(239,68,68,0.2)" : "rgba(167,139,250,0.12)",
                  color:      voiceOn ? "#f87171" : "#a78bfa",
                  border:     `1px solid ${voiceOn ? "rgba(239,68,68,0.3)" : "rgba(167,139,250,0.2)"}`,
                  animation:  voiceOn ? "douglasPulse 1.2s ease-in-out infinite" : "none",
                }}
              >
                🎙
              </button>

              <input
                ref={inputRef}
                type="text"
                placeholder={voiceOn ? "Listening…" : "Ask Douglas about anything…"}
                value={voiceOn && voiceLive ? voiceLive : input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMsg()}
                readOnly={voiceOn}
                className="flex-1 rounded-xl bg-slate-800/70 px-3 py-2.5 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:ring-1 focus:ring-violet-400/40"
              />
              <button
                type="button"
                onClick={() => sendMsg()}
                disabled={(!input.trim() && !voiceLive) || typing}
                className="rounded-xl px-4 py-2 text-[11px] font-bold transition-all disabled:opacity-35 hover:opacity-90 shrink-0"
                style={{ background: "rgba(139,92,246,0.25)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}
              >
                Send
              </button>
            </div>
          </>
        )}

        {/* PiP mode */}
        {pip && (
          <div className="flex gap-2 px-3 pb-3 pt-2">
            <button
              type="button"
              onClick={toggleVoice}
              className="rounded-xl px-2 py-2 text-[10px] font-bold transition-all shrink-0"
              style={{
                background: voiceOn ? "rgba(239,68,68,0.2)" : "rgba(167,139,250,0.12)",
                color:      voiceOn ? "#f87171" : "#a78bfa",
              }}
            >
              🎙
            </button>
            <input
              type="text"
              placeholder={voiceOn ? "Listening…" : "Ask Douglas…"}
              value={voiceOn && voiceLive ? voiceLive : input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMsg()}
              readOnly={voiceOn}
              className="flex-1 rounded-xl bg-slate-800/70 px-2.5 py-2 text-[10px] text-slate-200 placeholder-slate-600 outline-none focus:ring-1 focus:ring-violet-400/40"
            />
            <button
              type="button"
              onClick={() => sendMsg()}
              disabled={(!input.trim() && !voiceLive) || typing}
              className="rounded-xl px-3 py-2 text-[10px] font-bold disabled:opacity-35 shrink-0"
              style={{ background: "rgba(139,92,246,0.25)", color: "#a78bfa" }}
            >
              →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
