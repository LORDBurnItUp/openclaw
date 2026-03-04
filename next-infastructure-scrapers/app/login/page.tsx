"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { VoiceJournal } from "../components/VoiceJournal";

type View = "login" | "dashboard";
type Tab = "overview" | "voice" | "activity" | "settings";

const MOCK_STATS = [
  { label: "Commands today",    value: "1,284",    icon: "⚡", color: "#22d3ee" },
  { label: "Sessions / month",  value: "247",      icon: "📡", color: "#a78bfa" },
  { label: "Errors auto-fixed", value: "3,891",    icon: "🛡",  color: "#34d399" },
  { label: "Files modified",    value: "512",      icon: "📁", color: "#f59e0b" },
  { label: "Member since",      value: "Jan 2026", icon: "🗓", color: "#f472b6" },
  { label: "Next billing",      value: "Apr 3",    icon: "💳", color: "#94a3b8" },
];

const MOCK_ACTIVITY = [
  { time: "2m ago",  action: "Fixed TS2345 in api/jobs.ts",     status: "fixed" },
  { time: "18m ago", action: "Generated 3 endpoints from voice", status: "generated" },
  { time: "1h ago",  action: "Repo DNA scan completed",          status: "scanned" },
  { time: "3h ago",  action: "Error shield caught 14 issues",    status: "fixed" },
  { time: "6h ago",  action: "Session started · VS Code",        status: "session" },
];

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "voice",    label: "Voice Journal" },
  { id: "activity", label: "Activity" },
  { id: "settings", label: "Settings" },
];

// ── Settings panel ──────────────────────────────────────────────────────────

function SettingsPanel({
  onSignOut,
}: {
  onSignOut: () => void;
}) {
  const [notifs, setNotifs] = useState(false);
  const [lang, setLang] = useState("en");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("vj_notifs");
    if (stored !== null) setNotifs(stored === "true");
    const storedLang = localStorage.getItem("voxcode_lang");
    if (storedLang) setLang(storedLang);
  }, []);

  const toggleNotifs = () => {
    const next = !notifs;
    setNotifs(next);
    localStorage.setItem("vj_notifs", String(next));
  };

  const handleExport = () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("vj_entries");
    const entries = raw ? JSON.parse(raw) : [];
    if (entries.length === 0) {
      alert("No voice entries to export.");
      return;
    }
    const lines: string[] = [];
    lines.push("=== Voice Journal Export ===");
    lines.push(`Exported: ${new Date().toLocaleString()}`);
    lines.push("");
    entries.forEach((e: { timestamp: number; text: string; wordCount: number; duration: number; processed?: string }, i: number) => {
      lines.push(`--- Entry ${i + 1} ---`);
      lines.push(`Date: ${new Date(e.timestamp).toLocaleString()}`);
      lines.push(`Words: ${e.wordCount}`);
      lines.push(`Duration: ${e.duration.toFixed(1)}s`);
      lines.push(`Text: ${e.text}`);
      if (e.processed) lines.push(`AI Summary: ${e.processed}`);
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voice-journal-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    // Clear storage and sign out
    localStorage.removeItem("vj_entries");
    localStorage.removeItem("vj_notifs");
    localStorage.removeItem("voxcode_lang");
    onSignOut();
  };

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <h3 className="text-lg font-bold text-slate-50 mb-1">Settings</h3>

      {/* Notifications toggle */}
      <div
        className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-900/70 px-5 py-4"
      >
        <div>
          <p className="text-sm font-semibold text-slate-200">Notification preferences</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Receive activity alerts and reminders
          </p>
        </div>
        <button
          onClick={toggleNotifs}
          className="relative h-6 w-11 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:ring-offset-2 focus:ring-offset-slate-950"
          style={{
            background: notifs
              ? "linear-gradient(135deg, #22d3ee, #0ea5e9)"
              : "#1e293b",
            border: notifs ? "none" : "1px solid rgba(100,116,139,0.5)",
          }}
          aria-pressed={notifs}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300"
            style={{ left: notifs ? "calc(100% - 22px)" : "2px" }}
          />
        </button>
      </div>

      {/* Language */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-900/70 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-200">Language</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Display language (from localStorage key{" "}
            <code className="font-mono text-cyan-400">voxcode_lang</code>)
          </p>
        </div>
        <span className="text-sm font-bold text-cyan-400 uppercase tracking-wide">
          {lang}
        </span>
      </div>

      {/* Export data */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-900/70 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-200">Export my data</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Download all voice journal entries as .txt
          </p>
        </div>
        <button
          onClick={handleExport}
          className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-400 hover:bg-cyan-400/20 hover:border-cyan-400/60 transition-all"
        >
          Export
        </button>
      </div>

      {/* Delete account */}
      <div className="flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-red-400">Delete account</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Permanently remove all data and sign out
          </p>
        </div>
        <div className="flex items-center gap-2">
          {deleteConfirm && (
            <button
              onClick={() => setDeleteConfirm(false)}
              className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-all"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleDeleteAccount}
            className="rounded-full border border-red-500/50 bg-red-500/15 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/25 hover:border-red-500/70 transition-all"
          >
            {deleteConfirm ? "Are you sure? Confirm" : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [view, setView]         = useState<View>("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [fieldErr, setFieldErr] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) { setFieldErr("Please fill in both fields."); return; }
    setFieldErr("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setView("dashboard");
  };

  const handleSignOut = () => {
    setView("login");
    setEmail("");
    setPassword("");
    setActiveTab("overview");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      {/* Animated background */}
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.04) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full opacity-25"
          style={{
            background: "radial-gradient(circle, #0284c7 0%, #0c4a6e 40%, transparent 70%)",
            filter: "blur(90px)",
          }}
        />
        <div
          className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #7c3aed, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-300 transition-colors"
        >
          ← Back to VoxCode
        </Link>

        {/* ── Login form ──────────────────────────────────────────────────── */}
        {view === "login" && (
          <div
            className="w-full max-w-sm rounded-3xl border border-slate-800/70 bg-slate-900/80 p-8 backdrop-blur-xl"
            style={{ boxShadow: "0 0 80px rgba(34,211,238,0.07), 0 30px 60px rgba(0,0,0,0.4)" }}
          >
            {/* Logo */}
            <div className="mb-8 flex flex-col items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-slate-950 font-black text-lg"
                style={{ background: "linear-gradient(135deg, #22d3ee, #0ea5e9)" }}
              >
                V
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold text-slate-50">Sign in to VoxCode</h1>
                <p className="mt-1 text-xs text-slate-400">
                  Access your subscription &amp; dashboard
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20"
                />
              </div>

              {fieldErr && (
                <p className="text-xs text-red-400">{fieldErr}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full py-3.5 text-sm font-bold text-slate-950 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                style={{
                  background: "linear-gradient(135deg, #22d3ee, #0ea5e9)",
                  boxShadow: "0 0 30px rgba(34,211,238,0.35)",
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    Authenticating...
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <div className="mt-6 space-y-2 text-center text-xs text-slate-600">
              <p>
                No account?{" "}
                <Link href="/#pricing" className="text-cyan-400 hover:underline">
                  Get started for $1/month
                </Link>
              </p>
              <p>
                <button className="hover:text-slate-400 transition-colors">
                  Forgot password?
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ── Subscription dashboard ──────────────────────────────────────── */}
        {view === "dashboard" && (
          <div className="w-full max-w-2xl space-y-5">
            {/* User header card */}
            <div
              className="flex items-center justify-between rounded-3xl border border-slate-800/70 bg-slate-900/80 p-6 backdrop-blur"
              style={{ boxShadow: "0 0 40px rgba(34,211,238,0.06)" }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full text-slate-950 text-xl font-black"
                  style={{ background: "linear-gradient(135deg, #22d3ee, #818cf8)" }}
                >
                  {email[0]?.toUpperCase() ?? "U"}
                </div>
                <div>
                  <p className="font-semibold text-slate-50">
                    {email || "engineer@example.com"}
                  </p>
                  <p className="text-xs text-slate-400">Pro Developer Plan</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-emerald-400"
                  style={{
                    background: "rgba(52,211,153,0.1)",
                    border: "1px solid rgba(52,211,153,0.25)",
                  }}
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Active
                </span>
                <p className="text-[10px] text-slate-600">$1.00 / month</p>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-slate-800/70">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "px-4 py-3 text-sm font-medium transition-all",
                    activeTab === tab.id
                      ? "text-cyan-400 border-b-2 border-cyan-400 -mb-px"
                      : "text-slate-400 hover:text-cyan-400 border-b-2 border-transparent -mb-px",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Overview tab ──────────────────────────────────────────────── */}
            {activeTab === "overview" && (
              <div className="space-y-5">
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {MOCK_STATS.map((stat) => (
                    <div
                      key={stat.label}
                      className="group relative overflow-hidden rounded-2xl border bg-slate-900/70 p-4 transition-all duration-300 hover:-translate-y-0.5"
                      style={{
                        borderColor: `${stat.color}20`,
                        boxShadow: `0 0 20px ${stat.color}06`,
                      }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        style={{
                          background: `radial-gradient(circle at 50% 0%, ${stat.color}10, transparent 70%)`,
                        }}
                      />
                      <div className="text-xl">{stat.icon}</div>
                      <div
                        className="mt-1 text-xl font-bold"
                        style={{ color: stat.color }}
                      >
                        {stat.value}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Plan management */}
                <div
                  className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-6"
                  style={{ boxShadow: "0 0 50px rgba(34,211,238,0.07)" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        Current plan
                      </p>
                      <p className="mt-1 text-2xl font-bold text-slate-50">
                        Pro Developer
                      </p>
                      <p className="text-sm text-cyan-400">
                        $1 / month — All features unlocked
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link
                        href="/#pricing"
                        className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300 transition-colors"
                      >
                        Upgrade
                      </Link>
                      <button className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors">
                        Cancel plan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Voice Journal tab ─────────────────────────────────────────── */}
            {activeTab === "voice" && (
              <div>
                <VoiceJournal />
              </div>
            )}

            {/* ── Activity tab ──────────────────────────────────────────────── */}
            {activeTab === "activity" && (
              <div
                className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6 backdrop-blur"
              >
                <h3 className="mb-4 text-sm font-semibold text-slate-200">
                  Recent activity
                </h3>
                <div className="space-y-3">
                  {MOCK_ACTIVITY.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                      <span
                        className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          background:
                            item.status === "fixed"
                              ? "#34d399"
                              : item.status === "generated"
                              ? "#22d3ee"
                              : item.status === "scanned"
                              ? "#a78bfa"
                              : "#64748b",
                        }}
                      />
                      <span className="flex-1 text-slate-300">{item.action}</span>
                      <span className="shrink-0 text-slate-600">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Settings tab ──────────────────────────────────────────────── */}
            {activeTab === "settings" && (
              <SettingsPanel onSignOut={handleSignOut} />
            )}

            {/* Sign out */}
            <div className="text-center pt-2">
              <button
                onClick={handleSignOut}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
