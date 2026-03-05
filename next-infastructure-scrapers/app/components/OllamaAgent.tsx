"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type AgentMode = "chat" | "explain" | "review" | "generate" | "debug";

interface OllamaModel { name: string; modified_at?: string; size?: number; }
interface ChatMsg { role: "user" | "assistant"; content: string; ts: number; }

// ── Mode config ───────────────────────────────────────────────────────────────
const MODES: { id: AgentMode; icon: string; label: string }[] = [
  { id: "chat",     icon: "💬", label: "Chat"          },
  { id: "explain",  icon: "🔍", label: "Explain Code"  },
  { id: "review",   icon: "📋", label: "Review Code"   },
  { id: "generate", icon: "⚡", label: "Generate"      },
  { id: "debug",    icon: "🐛", label: "Debug"         },
];

const SYSTEM_PROMPTS: Record<AgentMode, string> = {
  chat:     "You are a helpful AI assistant. Be concise and direct.",
  explain:  "You are a senior software engineer. Explain the provided code clearly: what it does, how it works, key patterns used, and any issues. Start with plain language, then add technical detail.",
  review:   "You are an expert code reviewer. Review the code for: bugs, security issues, performance problems, style violations, and improvements. Use clear sections for each category.",
  generate: "You are an expert programmer. Generate clean, production-ready code based on the specification. Default to TypeScript unless told otherwise. Include comments for complex logic.",
  debug:    "You are a debugging expert. Analyze the provided code and bug description. Identify the root cause, explain why it happens, and provide a corrected version with explanation.",
};

const CODE_MODES: AgentMode[] = ["explain", "review", "debug"];

// ── Code block renderer (no extra library) ────────────────────────────────────
function renderContent(text: string): React.ReactNode {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const code = part.replace(/^```\w*\n?/, "").replace(/```$/, "");
      return (
        <pre
          key={i}
          style={{
            background:   "rgba(0,0,0,0.55)",
            border:       "1px solid rgba(34,211,238,0.2)",
            borderRadius: 8,
            padding:      "10px 12px",
            fontSize:     11,
            overflowX:    "auto",
            color:        "#22d3ee",
            fontFamily:   "monospace",
            margin:       "6px 0",
            lineHeight:   1.5,
          }}
        >
          <code>{code}</code>
        </pre>
      );
    }
    return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>;
  });
}

// ── Bytes → human-readable ────────────────────────────────────────────────────
function fmtSize(bytes?: number) {
  if (!bytes) return "";
  const gb = bytes / 1e9;
  return gb >= 1 ? `${gb.toFixed(1)}GB` : `${(bytes / 1e6).toFixed(0)}MB`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function OllamaAgent() {
  const [open,          setOpen]          = useState(false);
  const [models,        setModels]        = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [ollamaOnline,  setOllamaOnline]  = useState(false);
  const [modelsLoaded,  setModelsLoaded]  = useState(false);
  const [mode,          setMode]          = useState<AgentMode>("chat");
  const [messages,      setMessages]      = useState<ChatMsg[]>([]);
  const [input,         setInput]         = useState("");
  const [codeInput,     setCodeInput]     = useState("");
  const [streaming,     setStreaming]     = useState(false);
  const [streamBuffer,  setStreamBuffer]  = useState("");
  const [responseTime,  setResponseTime]  = useState<number | null>(null);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamBuffer]);

  // Load models when panel first opens
  useEffect(() => {
    if (!open || modelsLoaded) return;
    fetch("/api/ollama")
      .then(r => r.json())
      .then(data => {
        setModels(data.models ?? []);
        setOllamaOnline(data.ok ?? false);
        if (data.models?.length > 0) setSelectedModel(data.models[0].name);
        setModelsLoaded(true);
      })
      .catch(() => { setOllamaOnline(false); setModelsLoaded(true); });
  }, [open, modelsLoaded]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || !selectedModel) return;

    // Append code if using a code-aware mode
    const userContent = CODE_MODES.includes(mode) && codeInput.trim()
      ? `${text}\n\n\`\`\`\n${codeInput.trim()}\n\`\`\``
      : text;

    const userMsg: ChatMsg = { role: "user", content: userContent, ts: Date.now() };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput("");
    setStreaming(true);
    setStreamBuffer("");
    setResponseTime(null);
    const t0 = performance.now();

    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPTS[mode] },
      ...nextMsgs.slice(-14).map(m => ({ role: m.role, content: m.content })),
    ];

    try {
      const res = await fetch("/api/ollama", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ model: selectedModel, messages: apiMessages, stream: true }),
      });

      if (!res.ok || !res.body) throw new Error("Stream init failed");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let assembled = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") { reader.cancel(); break; }
          try {
            const obj = JSON.parse(payload);
            if (obj.token) { assembled += obj.token; setStreamBuffer(assembled); }
          } catch { /* skip */ }
        }
      }

      const elapsed = Math.round(performance.now() - t0);
      setResponseTime(elapsed);
      setMessages(m => [...m, { role: "assistant", content: assembled || "(no response)", ts: Date.now() }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "⚠ Could not reach Ollama. Make sure it is running on port 11434.", ts: Date.now() }]);
    }

    setStreaming(false);
    setStreamBuffer("");
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [input, codeInput, streaming, selectedModel, mode, messages]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[150] flex items-center gap-2 rounded-2xl border border-violet-400/30 bg-slate-950/95 px-4 py-3 text-sm font-semibold text-slate-100 backdrop-blur-xl shadow-2xl transition-all hover:border-violet-400/60 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]"
      >
        <span className="text-base">🤖</span>
        <span>OllamaAgent</span>
        <span className={`h-2 w-2 rounded-full ${ollamaOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-[150] flex w-[460px] max-w-[96vw] flex-col rounded-3xl border border-violet-400/25 bg-slate-950/97 shadow-2xl backdrop-blur-xl"
      style={{ maxHeight: "80vh", boxShadow: "0 0 60px rgba(139,92,246,0.18), 0 25px 50px rgba(0,0,0,0.5)" }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <span className="text-lg">🤖</span>
        <span className="font-bold text-slate-100 text-sm">OllamaAgent</span>
        <span className="ml-1 text-[10px] font-semibold tracking-wider text-violet-400">BEST CODING EDITION</span>

        {/* Online dot */}
        <span className={`ml-auto h-2 w-2 rounded-full ${ollamaOnline ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} title={ollamaOnline ? "Ollama online" : "Ollama offline"} />

        {/* Response time badge */}
        {responseTime !== null && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] text-slate-400">{responseTime}ms</span>
        )}

        {/* Model selector */}
        {models.length > 0 ? (
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="ml-1 max-w-[120px] truncate rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 outline-none focus:border-violet-400"
          >
            {models.map(m => (
              <option key={m.name} value={m.name}>{m.name} {fmtSize(m.size)}</option>
            ))}
          </select>
        ) : modelsLoaded ? (
          <span className="ml-1 text-[10px] text-red-400">No models — run: ollama pull codellama</span>
        ) : (
          <span className="ml-1 text-[10px] text-slate-500">Loading…</span>
        )}

        {/* Close */}
        <button onClick={() => setOpen(false)} className="ml-1 rounded-lg p-1 text-slate-500 hover:text-slate-200 transition-colors">✕</button>
      </div>

      {/* ── Mode tabs ── */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-800 px-3 py-2 scrollbar-none">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-[10px] font-semibold transition-all ${
              mode === m.id
                ? "bg-violet-600/30 border border-violet-400/50 text-violet-200"
                : "border border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300"
            }`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* ── Code input (only for explain / review / debug) ── */}
      {CODE_MODES.includes(mode) && (
        <div className="border-b border-slate-800 px-3 py-2">
          <label className="mb-1 block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Paste code here
          </label>
          <textarea
            value={codeInput}
            onChange={e => setCodeInput(e.target.value)}
            placeholder="// Paste your code for analysis…"
            rows={5}
            className="w-full resize-y rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 font-mono text-[11px] text-slate-200 outline-none placeholder-slate-700 focus:border-violet-400/50"
          />
        </div>
      )}

      {/* ── Message history ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ minHeight: 120 }}>
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <span className="text-3xl">🤖</span>
            <p className="text-[11px] text-slate-500">
              {ollamaOnline
                ? `${selectedModel || "Select a model"} ready — ask anything`
                : "Ollama not detected. Start it with: ollama serve"}
            </p>
            {!ollamaOnline && (
              <p className="text-[10px] text-slate-600">Then pull a model: ollama pull codellama</p>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[90%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed ${
                m.role === "user"
                  ? "bg-violet-600/20 border border-violet-400/25 text-slate-100"
                  : "bg-slate-900/80 border border-slate-800 text-slate-200"
              }`}
            >
              {m.role === "assistant" ? renderContent(m.content) : m.content}
            </div>
          </div>
        ))}

        {/* Streaming bubble */}
        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl border border-violet-400/20 bg-slate-900/80 px-3 py-2 text-[11px] leading-relaxed text-slate-200">
              {streamBuffer
                ? renderContent(streamBuffer)
                : (
                  <span className="flex items-center gap-2 text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: "0.15s" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: "0.3s" }} />
                  </span>
                )}
              <span className="ml-0.5 inline-block h-[10px] w-0.5 animate-pulse rounded-full bg-violet-400 align-text-bottom" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input row ── */}
      <div className="border-t border-slate-800 px-3 py-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={2}
            placeholder={
              mode === "generate" ? "Describe what to build…"
              : mode === "chat"   ? "Ask anything… (Enter to send)"
              : "Describe the issue or what to analyze… (Enter to send)"
            }
            disabled={streaming}
            className="flex-1 resize-none rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-[12px] text-slate-100 outline-none placeholder-slate-700 focus:border-violet-400/50 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim() || !selectedModel}
            className="flex-shrink-0 self-end rounded-xl bg-violet-600 px-4 py-2 text-[12px] font-semibold text-white transition-all hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {streaming ? "…" : "Send"}
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[9px] text-slate-700">Shift+Enter for newline · Enter to send</span>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setStreamBuffer(""); setResponseTime(null); }}
              className="text-[9px] text-slate-700 hover:text-slate-500 transition-colors"
            >
              clear history
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
