"use client";

import { useState } from "react";
import { Button } from "./Button";

const SERVICES = ["slack", "telegram", "discord"] as const;

export function IntegrationsPanel() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, string> | null>(null);
  const [channel, setChannel] = useState<"all" | "slack" | "telegram" | "discord">("all");

  const send = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), channel }),
      });
      const data = await res.json();
      setResults(data.results || null);
    } catch (e) {
      setResults({ error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      aria-label="Integrations"
      className="mx-auto mt-8 w-full max-w-6xl rounded-3xl border border-violet-400/30 bg-slate-950/80 p-4 shadow-[0_0_70px_rgba(139,92,246,0.2)] backdrop-blur"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-100">
            Integrations — Slack · Telegram · Discord
          </h2>
          <span className="text-[11px] text-slate-500">
            Send messages from VoxCode to your channels
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label htmlFor="integrations-msg" className="block text-[11px] text-slate-400">
              Message
            </label>
            <input
              id="integrations-msg"
              type="text"
              placeholder="VoxCode alert: job complete"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
              disabled={loading}
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as typeof channel)}
              className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-200 focus:border-violet-500 focus:outline-none"
              disabled={loading}
            >
              <option value="all">All</option>
              <option value="slack">Slack</option>
              <option value="telegram">Telegram</option>
              <option value="discord">Discord</option>
            </select>
            <Button
              variant="primary"
              onClick={send}
              disabled={loading || !message.trim()}
              className="text-xs"
            >
              {loading ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>

        {results && (
          <div className="flex flex-wrap gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-[11px]">
            {SERVICES.map((s) => {
              const r = results[s];
              if (!r) return null;
              const ok = r === "ok";
              return (
                <span
                  key={s}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 ${
                    ok ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-amber-400"}`} />
                  {s}: {ok ? "sent" : r}
                </span>
              );
            })}
            {results.error && (
              <span className="text-red-400">{results.error}</span>
            )}
          </div>
        )}

        <p className="text-[11px] text-slate-500">
          Add DISCORD_WEBHOOK_URL, SLACK_WEBHOOK_URL, and/or TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
          to <code className="rounded bg-slate-800 px-1">.env.local</code> in this app.
        </p>
      </div>
    </section>
  );
}
