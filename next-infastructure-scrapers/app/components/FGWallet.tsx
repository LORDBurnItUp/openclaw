"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tx {
  id:      string;
  type:    "send" | "receive" | "earn" | "reward";
  amount:  number;
  peer:    string;
  note:    string;
  ts:      number;
}

interface Wallet {
  balance: number;
  address: string;
  txs:     Tx[];
}

// ─── Persistence ──────────────────────────────────────────────────────────────
function loadWallet(): Wallet {
  try {
    const addr = localStorage.getItem("fg-address") ||
      `FG-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const balance = parseFloat(localStorage.getItem("fg-balance") ?? "250");
    const txs: Tx[] = JSON.parse(localStorage.getItem("fg-txs") ?? "[]");
    return { balance, address: addr, txs };
  } catch {
    return { balance: 250, address: "FG-GUEST", txs: [] };
  }
}

function saveWallet(w: Wallet) {
  localStorage.setItem("fg-balance", String(w.balance));
  localStorage.setItem("fg-address", w.address);
  localStorage.setItem("fg-txs",     JSON.stringify(w.txs.slice(0, 100)));
}

// ─── Coin animation ───────────────────────────────────────────────────────────
function Coin({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-black text-slate-950 select-none"
      style={{
        width:  size,
        height: size,
        fontSize: size * 0.4,
        background: "linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)",
        boxShadow: `0 0 ${size * 0.5}px rgba(251,191,36,0.5), inset 0 1px 0 rgba(255,255,255,0.4)`,
      }}
    >
      FG
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function FGWallet() {
  const [open,    setOpen]    = useState(false);
  const [tab,     setTab]     = useState<"send" | "history" | "earn">("send");
  const [wallet,  setWallet]  = useState<Wallet>({ balance: 250, address: "FG-GUEST", txs: [] });
  const [toAddr,  setToAddr]  = useState("");
  const [amount,  setAmount]  = useState("");
  const [note,    setNote]    = useState("");
  const [status,  setStatus]  = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [bounced, setBounced] = useState(false);

  useEffect(() => {
    const w = loadWallet();
    setWallet(w);
    if (!localStorage.getItem("fg-address")) saveWallet(w);
  }, []);

  // Coin bounce on open
  useEffect(() => {
    if (!open) return;
    setBounced(true);
    const t = setTimeout(() => setBounced(false), 600);
    return () => clearTimeout(t);
  }, [open]);

  const mutate = useCallback((fn: (w: Wallet) => Wallet) => {
    setWallet(prev => {
      const next = fn(prev);
      saveWallet(next);
      return next;
    });
  }, []);

  const sendFG = () => {
    setStatus(null);
    const amt = parseInt(amount);
    const peer = toAddr.trim().toUpperCase();

    if (!peer)                  return setStatus({ type: "err", msg: "Enter a recipient address." });
    if (isNaN(amt) || amt <= 0) return setStatus({ type: "err", msg: "Enter a valid amount (> 0)." });
    if (amt > wallet.balance)   return setStatus({ type: "err", msg: `Not enough FG. Balance: ${wallet.balance}` });
    if (peer === wallet.address) return setStatus({ type: "err", msg: "Cannot send to yourself." });

    const tx: Tx = {
      id: crypto.randomUUID().slice(0, 8),
      type: "send",
      amount: amt,
      peer,
      note: note.trim() || "Transfer",
      ts: Date.now(),
    };

    mutate(w => ({ ...w, balance: w.balance - amt, txs: [tx, ...w.txs] }));
    setToAddr(""); setAmount(""); setNote("");
    setStatus({ type: "ok", msg: `✓ Sent ${amt} FG to ${peer}` });
  };

  const claimDaily = () => {
    setStatus(null);
    const lastClaim = parseInt(localStorage.getItem("fg-lastclaim") ?? "0");
    const now = Date.now();
    if (now - lastClaim < 20 * 60 * 60 * 1000) {
      const next = new Date(lastClaim + 20 * 60 * 60 * 1000);
      return setStatus({ type: "err", msg: `Next reward at ${next.toLocaleTimeString()}` });
    }
    const amt = Math.floor(Math.random() * 50) + 25;
    localStorage.setItem("fg-lastclaim", String(now));
    const tx: Tx = {
      id: crypto.randomUUID().slice(0, 8),
      type: "earn",
      amount: amt,
      peer: "SYSTEM",
      note: "Daily reward",
      ts: now,
    };
    mutate(w => ({ ...w, balance: w.balance + amt, txs: [tx, ...w.txs] }));
    setStatus({ type: "ok", msg: `⭐ Claimed ${amt} FG!` });
  };

  const simulateReceive = () => {
    setStatus(null);
    const amt    = Math.floor(Math.random() * 30) + 10;
    const senders = ["FG-ALPHA7", "FG-NOVA42", "FG-X9ZK", "FG-ORBIT3"];
    const peer   = senders[Math.floor(Math.random() * senders.length)];
    const tx: Tx = {
      id: crypto.randomUUID().slice(0, 8),
      type: "receive",
      amount: amt,
      peer,
      note: "Friend transfer",
      ts: Date.now(),
    };
    mutate(w => ({ ...w, balance: w.balance + amt, txs: [tx, ...w.txs] }));
    setStatus({ type: "ok", msg: `↘ Received ${amt} FG from ${peer}` });
  };

  const TX_ICON: Record<Tx["type"], string> = {
    send: "↗", receive: "↘", earn: "⭐", reward: "🎁",
  };
  const TX_COLOR: Record<Tx["type"], string> = {
    send: "#f87171", receive: "#34d399", earn: "#fbbf24", reward: "#a78bfa",
  };

  return (
    <>
      {/* ── Floating trigger ─────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 rounded-2xl border border-amber-400/25 bg-slate-950/96 px-4 py-3 backdrop-blur-xl shadow-2xl transition-all hover:border-amber-400/50 hover:scale-105 active:scale-95"
        style={{ boxShadow: "0 0 30px rgba(251,191,36,0.12), 0 8px 32px rgba(0,0,0,0.6)" }}
      >
        <Coin size={28} />
        <div>
          <div className="text-xs font-bold text-amber-400 leading-none">
            {wallet.balance.toLocaleString()}
          </div>
          <div className="text-[9px] font-semibold text-amber-600 tracking-wider">FORUM GOLD</div>
        </div>
      </button>

      {/* ── Wallet modal ─────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-amber-400/20 bg-slate-950 overflow-hidden shadow-2xl"
            style={{ boxShadow: "0 0 80px rgba(251,191,36,0.12), 0 40px 80px rgba(0,0,0,0.8)" }}
          >
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-slate-800 px-6 py-5">
              <Coin size={bounced ? 52 : 48} />
              <div className="flex-1">
                <div
                  className="text-2xl font-black text-amber-400 leading-none transition-all duration-300"
                >
                  {wallet.balance.toLocaleString()} FG
                </div>
                <div className="mt-0.5 text-[10px] text-slate-600 font-mono">
                  Address: <span className="text-slate-400 tracking-wider">{wallet.address}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-600 hover:text-slate-300 text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800">
              {(["send", "earn", "history"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setStatus(null); }}
                  className="flex-1 py-3 text-[11px] font-semibold capitalize transition-all"
                  style={{
                    color:        tab === t ? "#fbbf24" : "#64748b",
                    borderBottom: tab === t ? "2px solid #fbbf24" : "2px solid transparent",
                  }}
                >
                  {t === "send" ? "↗ Send" : t === "earn" ? "⭐ Earn" : "📋 History"}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* ── Send tab ── */}
              {tab === "send" && (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Recipient address (e.g. FG-ALPHA7)"
                    value={toAddr}
                    onChange={e => setToAddr(e.target.value)}
                    className="w-full rounded-xl bg-slate-800/70 px-3 py-2.5 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:ring-1 focus:ring-amber-400/40 font-mono"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Amount of FG"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      min={1}
                      className="flex-1 rounded-xl bg-slate-800/70 px-3 py-2.5 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:ring-1 focus:ring-amber-400/40"
                    />
                    <input
                      type="text"
                      placeholder="Note (optional)"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      className="flex-1 rounded-xl bg-slate-800/70 px-3 py-2.5 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:ring-1 focus:ring-amber-400/40"
                    />
                  </div>

                  {/* Quick amounts */}
                  <div className="flex gap-1.5">
                    {[10, 25, 50, 100].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setAmount(String(n))}
                        className="flex-1 rounded-lg bg-slate-800/50 py-1.5 text-[10px] font-semibold text-amber-600 hover:bg-amber-400/10 hover:text-amber-400 transition-all border border-slate-700/40"
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={sendFG}
                    className="w-full rounded-xl py-2.5 text-[11px] font-bold transition-all hover:opacity-90 active:scale-98"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#0c0a09" }}
                  >
                    Send Forum Gold →
                  </button>

                  {/* Your address box */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                    <div className="text-[9px] text-slate-600 mb-1 uppercase tracking-wider">Your address — share with friends</div>
                    <div className="font-mono text-sm font-bold text-amber-400 tracking-widest">{wallet.address}</div>
                  </div>
                </div>
              )}

              {/* ── Earn tab ── */}
              {tab === "earn" && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4 text-center">
                    <div className="text-3xl mb-2">⭐</div>
                    <div className="text-sm font-bold text-amber-400 mb-1">Daily Reward</div>
                    <div className="text-[11px] text-slate-500 mb-3">Claim 25–75 FG once every 20 hours</div>
                    <button
                      type="button"
                      onClick={claimDaily}
                      className="rounded-xl px-6 py-2.5 text-[11px] font-bold transition-all hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", color: "#0c0a09" }}
                    >
                      Claim Daily Reward
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-center">
                    <div className="text-3xl mb-2">👥</div>
                    <div className="text-sm font-bold text-slate-300 mb-1">Simulate Receive</div>
                    <div className="text-[11px] text-slate-500 mb-3">Test incoming FG from a friend</div>
                    <button
                      type="button"
                      onClick={simulateReceive}
                      className="rounded-xl border border-slate-700 px-6 py-2.5 text-[11px] font-semibold text-slate-300 hover:border-slate-500 transition-all"
                    >
                      Simulate Receive
                    </button>
                  </div>
                </div>
              )}

              {/* ── History tab ── */}
              {tab === "history" && (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {wallet.txs.length === 0 && (
                    <p className="py-6 text-center text-[11px] text-slate-600 italic">No transactions yet.</p>
                  )}
                  {wallet.txs.map(tx => (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 rounded-xl bg-slate-900/60 px-3 py-2.5 border border-slate-800/60"
                    >
                      <span
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-base font-bold"
                        style={{ background: `${TX_COLOR[tx.type]}15`, color: TX_COLOR[tx.type] }}
                      >
                        {TX_ICON[tx.type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-slate-300 truncate font-medium">
                          {tx.note}
                          {tx.peer !== "SYSTEM" && (
                            <span className="ml-1 text-slate-600 font-mono text-[9px]">• {tx.peer}</span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-600">
                          {new Date(tx.ts).toLocaleString()}
                        </div>
                      </div>
                      <div
                        className="text-xs font-bold flex-shrink-0"
                        style={{ color: TX_COLOR[tx.type] }}
                      >
                        {tx.type === "send" ? "−" : "+"}{tx.amount.toLocaleString()} FG
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Status message */}
              {status && (
                <div
                  className={`mt-3 rounded-xl px-3 py-2 text-[11px] font-medium ${
                    status.type === "ok"
                      ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                      : "bg-red-400/10 text-red-400 border border-red-400/20"
                  }`}
                >
                  {status.msg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
