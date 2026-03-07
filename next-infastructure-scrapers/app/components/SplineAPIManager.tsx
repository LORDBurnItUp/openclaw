"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// SplineAPIManager — Floating Real-time API Control Panel
// Glassmorphism + cyberpunk aesthetic matching existing VoxCode panels
// ═══════════════════════════════════════════════════════════════════════════

interface ChannelInfo {
  id: string;
  label: string;
  icon: string;
  description: string;
  status: string;
}

interface VariableInfo {
  name: string;
  type: string;
  value: string | number | boolean;
  source: string;
  lastUpdated: number;
}

interface RequestLog {
  channel: string;
  status: "ok" | "error" | "pending";
  ts: number;
  duration: number;
  responsePreview?: string;
}

interface WebhookLog {
  event: string;
  ts: number;
  data: Record<string, unknown>;
}

type PanelTab = "channels" | "variables" | "test" | "webhooks";

export function SplineAPIManager() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>("channels");
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [variables, setVariables] = useState<VariableInfo[]>([]);
  const [requestLog, setRequestLog] = useState<RequestLog[]>([]);
  const [webhookLog, setWebhookLog] = useState<WebhookLog[]>([]);
  const [testChannel, setTestChannel] = useState("status");
  const [testPayload, setTestPayload] = useState("{}");
  const [testResult, setTestResult] = useState<string>("");
  const [testLoading, setTestLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [pulse, setPulse] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch channel status + variables ─────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/spline");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setChannels(data.channels ?? []);
      setVariables(data.variables ?? []);
      setConnected(true);
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    } catch {
      setConnected(false);
    }
  }, []);

  // ── Fetch webhook log ────────────────────────────────────────────────
  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/spline/webhook");
      if (!res.ok) return;
      const data = await res.json();
      setWebhookLog(data.recent ?? []);
    } catch {
      /* silent */
    }
  }, []);

  // ── Poll when panel is open ──────────────────────────────────────────
  useEffect(() => {
    if (open) {
      fetchStatus();
      fetchWebhooks();
      pollRef.current = setInterval(() => {
        fetchStatus();
        fetchWebhooks();
      }, 8000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, fetchStatus, fetchWebhooks]);

  // ── Test a channel ───────────────────────────────────────────────────
  const runTest = async () => {
    setTestLoading(true);
    setTestResult("");
    const startTs = Date.now();

    try {
      let parsedPayload: Record<string, unknown> = {};
      try {
        parsedPayload = JSON.parse(testPayload);
      } catch {
        parsedPayload = {};
      }

      const res = await fetch("/api/spline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: testChannel, payload: parsedPayload }),
      });

      const data = await res.json();
      const duration = Date.now() - startTs;

      setTestResult(JSON.stringify(data, null, 2));

      setRequestLog((prev) => [
        { channel: testChannel, status: data.ok ? "ok" : "error", ts: Date.now(), duration, responsePreview: JSON.stringify(data).slice(0, 120) },
        ...prev.slice(0, 49),
      ]);

      // Refresh variables after test
      fetchStatus();
    } catch (err) {
      setTestResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setRequestLog((prev) => [
        { channel: testChannel, status: "error", ts: Date.now(), duration: Date.now() - startTs },
        ...prev.slice(0, 49),
      ]);
    } finally {
      setTestLoading(false);
    }
  };

  // ── Suggested payloads per channel ───────────────────────────────────
  const suggestedPayloads: Record<string, string> = {
    status: "{}",
    weather: '{"city": "New York"}',
    "ai-text": '{"prompt": "What is the meaning of OpenClaw?", "maxTokens": 200}',
    "scene-vars": '{"set": [{"name": "demo", "type": "string", "value": "hello"}]}',
    openclaw: '{"command": "status", "context": "System check"}',
  };

  // ── Toggle button (always visible) ───────────────────────────────────
  const toggleBtn = (
    <button
      onClick={() => setOpen(!open)}
      aria-label="Toggle Spline API Manager"
      style={{
        position: "fixed",
        bottom: "7rem",
        left: "1.25rem",
        zIndex: 9990,
        width: 52,
        height: 52,
        borderRadius: "50%",
        border: `2px solid ${connected ? "rgba(34,211,238,0.5)" : "rgba(255,80,80,0.5)"}`,
        background: open
          ? "rgba(34,211,238,0.15)"
          : "rgba(10,10,20,0.85)",
        backdropFilter: "blur(12px)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.4rem",
        transition: "all 0.4s cubic-bezier(0.19,1,0.22,1)",
        boxShadow: connected
          ? `0 0 20px rgba(34,211,238,${pulse ? 0.5 : 0.15}), inset 0 0 12px rgba(34,211,238,0.08)`
          : "0 0 15px rgba(255,80,80,0.2)",
        transform: open ? "scale(1.1)" : "scale(1)",
      }}
      title="Spline Real-time API Manager"
    >
      <span style={{ filter: pulse ? "brightness(1.8)" : "none", transition: "filter 0.3s" }}>🎨</span>
      {/* Connection dot */}
      <span
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: connected ? "#22d3ee" : "#ff5050",
          boxShadow: connected ? "0 0 8px #22d3ee" : "0 0 8px #ff5050",
          animation: connected ? "nonePulse 2s ease-in-out infinite" : "none",
        }}
      />
    </button>
  );

  if (!open) return toggleBtn;

  // Tab definitions
  const tabs: { id: PanelTab; label: string; icon: string }[] = [
    { id: "channels", label: "Channels", icon: "📡" },
    { id: "variables", label: "Variables", icon: "🎛" },
    { id: "test", label: "Test", icon: "⚡" },
    { id: "webhooks", label: "Webhooks", icon: "🪝" },
  ];

  return (
    <>
      {toggleBtn}

      {/* ── Main Panel ── */}
      <div
        style={{
          position: "fixed",
          bottom: "1.25rem",
          left: "4.5rem",
          width: 420,
          maxHeight: "80vh",
          zIndex: 9989,
          background: "rgba(8,8,18,0.92)",
          backdropFilter: "blur(24px) saturate(1.4)",
          border: "1px solid rgba(34,211,238,0.15)",
          borderRadius: 16,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 60px rgba(0,0,0,0.6), 0 0 40px rgba(34,211,238,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
          animation: "splineSlideIn 0.4s cubic-bezier(0.19,1,0.22,1)",
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "16px 20px 12px",
            borderBottom: "1px solid rgba(34,211,238,0.1)",
            background: "linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(128,0,255,0.04) 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18, animation: "splineIconFloat 3s ease-in-out infinite" }}>🎨</span>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    background: "linear-gradient(135deg, #22d3ee, #a78bfa)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  SPLINE API MANAGER
                </h3>
                <p style={{ margin: 0, fontSize: 10, color: "rgba(148,163,184,0.7)", letterSpacing: "0.15em" }}>
                  REAL-TIME · {connected ? "CONNECTED" : "OFFLINE"}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: connected ? "#22d3ee" : "#ef4444",
                  boxShadow: connected ? "0 0 12px #22d3ee" : "0 0 12px #ef4444",
                }}
              />
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 6,
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: 12,
                  padding: "2px 8px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "all 0.25s",
                  background: activeTab === tab.id ? "rgba(34,211,238,0.12)" : "transparent",
                  color: activeTab === tab.id ? "#22d3ee" : "rgba(148,163,184,0.6)",
                  borderBottom: activeTab === tab.id ? "2px solid #22d3ee" : "2px solid transparent",
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 16px", maxHeight: "55vh" }}>
          {/* ── Channels Tab ── */}
          {activeTab === "channels" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {channels.length === 0 && (
                <p style={{ color: "#64748b", fontSize: 12, textAlign: "center", padding: 20 }}>
                  Loading channels...
                </p>
              )}
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  style={{
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(34,211,238,0.08)",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    transition: "all 0.25s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(34,211,238,0.06)";
                    e.currentTarget.style.borderColor = "rgba(34,211,238,0.2)";
                    e.currentTarget.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    e.currentTarget.style.borderColor = "rgba(34,211,238,0.08)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                  onClick={() => {
                    setActiveTab("test");
                    setTestChannel(ch.id);
                    setTestPayload(suggestedPayloads[ch.id] || "{}");
                  }}
                >
                  <span style={{ fontSize: 22 }}>{ch.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.02em" }}>
                      {ch.label}
                    </div>
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                      {ch.description}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: 20,
                      background: ch.status === "active" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                      color: ch.status === "active" ? "#22c55e" : "#ef4444",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {ch.status}
                  </div>
                </div>
              ))}

              {/* Recent requests */}
              {requestLog.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.15em", marginBottom: 8 }}>
                    RECENT REQUESTS
                  </p>
                  {requestLog.slice(0, 8).map((log, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 10px",
                        fontSize: 10,
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                      }}
                    >
                      <span style={{ color: log.status === "ok" ? "#22c55e" : "#ef4444", fontSize: 8 }}>●</span>
                      <span style={{ color: "#94a3b8", fontFamily: "monospace", minWidth: 70 }}>{log.channel}</span>
                      <span style={{ color: "#64748b", fontFamily: "monospace" }}>{log.duration}ms</span>
                      <span style={{ color: "#475569", fontSize: 9, marginLeft: "auto" }}>
                        {new Date(log.ts).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Variables Tab ── */}
          {activeTab === "variables" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.15em", margin: 0 }}>
                  SCENE VARIABLES ({variables.length})
                </p>
                <button
                  onClick={fetchStatus}
                  style={{
                    background: "rgba(34,211,238,0.1)",
                    border: "1px solid rgba(34,211,238,0.2)",
                    borderRadius: 4,
                    color: "#22d3ee",
                    cursor: "pointer",
                    fontSize: 9,
                    padding: "2px 8px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                  }}
                >
                  ↻ REFRESH
                </button>
              </div>
              {variables.length === 0 && (
                <p style={{ color: "#475569", fontSize: 11, textAlign: "center", padding: 20 }}>No variables set yet</p>
              )}
              {variables.map((v, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 8,
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    borderRadius: 8,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,211,238,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", fontFamily: "monospace" }}>
                      {v.name}
                    </div>
                    <div style={{ fontSize: 9, color: "#64748b", marginTop: 1 }}>
                      via <span style={{ color: "#22d3ee" }}>{v.source}</span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: v.type === "number" ? "rgba(168,85,247,0.12)" : v.type === "boolean" ? "rgba(251,191,36,0.12)" : "rgba(34,211,238,0.12)",
                      color: v.type === "number" ? "#a855f7" : v.type === "boolean" ? "#fbbf24" : "#22d3ee",
                      fontWeight: 700,
                      fontFamily: "monospace",
                    }}
                  >
                    {v.type}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: "#a78bfa",
                      fontWeight: 700,
                      maxWidth: 120,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {String(v.value).slice(0, 30)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Test Tab ── */}
          {activeTab === "test" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.15em", display: "block", marginBottom: 6 }}>
                  CHANNEL
                </label>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {["status", "weather", "ai-text", "scene-vars", "openclaw"].map((ch) => (
                    <button
                      key={ch}
                      onClick={() => {
                        setTestChannel(ch);
                        setTestPayload(suggestedPayloads[ch] || "{}");
                      }}
                      style={{
                        padding: "5px 10px",
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: "monospace",
                        border: "1px solid",
                        borderColor: testChannel === ch ? "rgba(34,211,238,0.4)" : "rgba(255,255,255,0.08)",
                        borderRadius: 6,
                        background: testChannel === ch ? "rgba(34,211,238,0.12)" : "transparent",
                        color: testChannel === ch ? "#22d3ee" : "#94a3b8",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.15em", display: "block", marginBottom: 6 }}>
                  PAYLOAD
                </label>
                <textarea
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  spellCheck={false}
                  style={{
                    width: "100%",
                    height: 70,
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(34,211,238,0.1)",
                    borderRadius: 8,
                    color: "#e2e8f0",
                    fontFamily: "monospace",
                    fontSize: 11,
                    padding: 10,
                    resize: "vertical",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(34,211,238,0.3)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(34,211,238,0.1)"; }}
                />
              </div>

              <button
                onClick={runTest}
                disabled={testLoading}
                style={{
                  padding: "10px 0",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.15em",
                  border: "1px solid rgba(34,211,238,0.3)",
                  borderRadius: 8,
                  background: testLoading
                    ? "rgba(34,211,238,0.05)"
                    : "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(128,0,255,0.1))",
                  color: testLoading ? "#64748b" : "#22d3ee",
                  cursor: testLoading ? "wait" : "pointer",
                  transition: "all 0.3s",
                  textTransform: "uppercase",
                }}
              >
                {testLoading ? "⏳ SENDING..." : "⚡ FIRE REQUEST"}
              </button>

              {testResult && (
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.15em", display: "block", marginBottom: 6 }}>
                    RESPONSE
                  </label>
                  <pre
                    style={{
                      width: "100%",
                      maxHeight: 200,
                      overflow: "auto",
                      background: "rgba(0,0,0,0.5)",
                      border: "1px solid rgba(34,211,238,0.08)",
                      borderRadius: 8,
                      color: "#a78bfa",
                      fontFamily: "monospace",
                      fontSize: 10,
                      padding: 12,
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                  >
                    {testResult}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* ── Webhooks Tab ── */}
          {activeTab === "webhooks" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.15em", margin: 0 }}>
                  WEBHOOK EVENTS ({webhookLog.length})
                </p>
                <button
                  onClick={fetchWebhooks}
                  style={{
                    background: "rgba(34,211,238,0.1)",
                    border: "1px solid rgba(34,211,238,0.2)",
                    borderRadius: 4,
                    color: "#22d3ee",
                    cursor: "pointer",
                    fontSize: 9,
                    padding: "2px 8px",
                    fontWeight: 700,
                  }}
                >
                  ↻
                </button>
              </div>

              {/* Webhook URL hint */}
              <div
                style={{
                  padding: "10px 12px",
                  background: "rgba(168,85,247,0.06)",
                  border: "1px solid rgba(168,85,247,0.12)",
                  borderRadius: 8,
                  fontSize: 10,
                  color: "#a78bfa",
                }}
              >
                <strong>Webhook URL:</strong>
                <code style={{ display: "block", marginTop: 4, color: "#22d3ee", wordBreak: "break-all", fontSize: 9 }}>
                  {typeof window !== "undefined" ? window.location.origin : ""}/api/spline/webhook
                </code>
                <p style={{ margin: "6px 0 0", color: "#64748b", lineHeight: 1.4 }}>
                  Configure this URL in your Spline scene&apos;s Webhook settings to receive events here.
                </p>
              </div>

              {webhookLog.length === 0 && (
                <p style={{ color: "#475569", fontSize: 11, textAlign: "center", padding: 20 }}>
                  No webhook events received yet
                </p>
              )}
              {webhookLog.map((wh, i) => (
                <div
                  key={i}
                  style={{
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", fontFamily: "monospace" }}>
                      {wh.event}
                    </span>
                    <span style={{ fontSize: 9, color: "#475569" }}>
                      {new Date(wh.ts).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre
                    style={{
                      fontSize: 9,
                      color: "#64748b",
                      fontFamily: "monospace",
                      margin: "4px 0 0",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      maxHeight: 60,
                      overflow: "hidden",
                    }}
                  >
                    {JSON.stringify(wh.data, null, 1).slice(0, 200)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid rgba(34,211,238,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 9,
            color: "#475569",
          }}
        >
          <span>Spline RT v1.0 · OpenClaw Engine</span>
          <span style={{ fontFamily: "monospace" }}>
            {variables.length} vars · {requestLog.length} reqs
          </span>
        </div>
      </div>

      {/* ── Animations ── */}
      <style>{`
        @keyframes splineSlideIn {
          from { opacity: 0; transform: translateX(-20px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes splineIconFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes nonePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}

export default SplineAPIManager;
