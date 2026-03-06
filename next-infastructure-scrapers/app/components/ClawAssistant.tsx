"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function ClawIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path d="M10 2.5C7 4.5 5.5 8 7.5 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 2.5C10 6.5 9.5 10 8 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 2.5C13 4.5 14.5 8 12.5 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="2" r="1.3" fill="currentColor" />
    </svg>
  );
}

const STARTERS = [
  "What makes VoxCode different?",
  "How does the $1/month plan work?",
  "Which IDEs are supported?",
  "How do I download it?",
];

export function ClawAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply ?? "Sorry, something went wrong." }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const empty = messages.length === 0;

  return (
    <>
      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-80 sm:w-96 rounded-2xl border border-slate-700/80 bg-slate-950/98 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl flex flex-col overflow-hidden claw-fade-up">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800/80 bg-slate-900/60">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 text-slate-950 shrink-0">
              <ClawIcon className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-100">VoxCode Assistant</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Online · Ask me anything
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[220px] max-h-[340px]">
            {empty && (
              <div className="space-y-3 claw-fade-up">
                <p className="text-[11px] text-slate-400 text-center pt-2">
                  Hi! I&apos;m the VoxCode AI. Ask me about features, pricing, or how to get started.
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="text-left text-[11px] text-slate-300 border border-slate-800 hover:border-cyan-400/50 hover:bg-cyan-400/5 rounded-xl px-3 py-2 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <span className="h-5 w-5 rounded-full bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center mr-1.5 mt-0.5 shrink-0">
                    <ClawIcon className="h-3 w-3 text-cyan-300" />
                  </span>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-cyan-400/15 border border-cyan-400/30 text-slate-100 rounded-br-sm"
                      : "bg-slate-800/70 border border-slate-700/60 text-slate-200 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <span className="h-5 w-5 rounded-full bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center mr-1.5 mt-0.5 shrink-0">
                  <ClawIcon className="h-3 w-3 text-cyan-300" />
                </span>
                <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-800/80 bg-slate-900/40"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about VoxCode…"
              disabled={loading}
              className="flex-1 bg-transparent text-[12px] text-slate-100 placeholder:text-slate-600 focus:outline-none min-w-0"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="h-7 w-7 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-300 transition-colors shrink-0"
              aria-label="Send"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open VoxCode assistant"
        className={`fixed bottom-6 right-5 z-50 h-12 w-12 rounded-full border flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
          open
            ? "bg-slate-800 border-slate-600 text-slate-300"
            : "bg-cyan-400 border-cyan-300/50 text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.5)]"
        }`}
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <ClawIcon className="h-5 w-5" />
        )}
      </button>
    </>
  );
}
