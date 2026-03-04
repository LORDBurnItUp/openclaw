import { NextRequest, NextResponse } from "next/server";

type Channel = "all" | "slack" | "telegram" | "discord";

async function sendSlack(text: string): Promise<{ ok: boolean; error?: string }> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return { ok: false, error: "not configured" };

  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID || process.env.SLACK_DEFAULT_CHANNEL;

  if (token && channel) {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ channel, text }),
    });
    const data = await res.json();
    return { ok: data.ok, error: data.error };
  }

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return { ok: res.ok };
}

async function sendTelegram(text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { ok: false, error: "not configured" };

  const params = new URLSearchParams({ chat_id: chatId, text });
  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage?${params}`,
    { method: "POST" }
  );
  const data = await res.json();
  return { ok: data.ok === true, error: data.description };
}

async function sendDiscord(text: string): Promise<{ ok: boolean; error?: string }> {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return { ok: false, error: "not configured" };

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text, username: "VoxCode" }),
  });
  return { ok: res.ok };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const channel: Channel = body?.channel || "all";

    if (!message) {
      return NextResponse.json(
        { error: "message required", results: null },
        { status: 400 }
      );
    }

    const results: Record<string, string> = {};
    const sendSlack_ = channel === "all" || channel === "slack";
    const sendTelegram_ = channel === "all" || channel === "telegram";
    const sendDiscord_ = channel === "all" || channel === "discord";

    if (sendSlack_) {
      const r = await sendSlack(message);
      results.slack = r.ok ? "ok" : r.error || "error";
    }
    if (sendTelegram_) {
      const r = await sendTelegram(message);
      results.telegram = r.ok ? "ok" : r.error || "error";
    }
    if (sendDiscord_) {
      const r = await sendDiscord(message);
      results.discord = r.ok ? "ok" : r.error || "error";
    }

    const sent = Object.entries(results).filter(([, v]) => v === "ok").map(([k]) => k);
    return NextResponse.json({
      ok: sent.length > 0,
      sent,
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { error: String(e), results: null },
      { status: 500 }
    );
  }
}
