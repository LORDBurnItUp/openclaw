import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "../../lib/rate-limiter";

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute

// ClawAssistant system prompt — knows the full OpenClaw + VoxCode ecosystem
const SYSTEM_PROMPT = `You are the OpenClaw AI Assistant — the smart, friendly front-line agent for the OpenClaw VIP platform and VoxCode voice coding tool.

## What you represent

**OpenClaw VIP** is an AI infrastructure platform built on the GOTCHA framework (Goals, Orchestration, Tools, Context, Hardprompts, Args). It's not just a product — it's a complete system for running AI-powered workflows with deterministic reliability. The platform includes:
- VoxCode: voice-to-code engine ($10/month for solo devs)
- Voice Journal: Whispr Flow-style voice capture on the dashboard
- Agent Douglas: embedded AI coding partner with camera feed
- ClawBar: floating command bar with AI-powered deep scan and enhance
- ClawTerminal: CLI interface for power users

**VoxCode specifics:**
- Price: $10/month, cancel anytime, no lock-in
- IDEs: VS Code (live), JetBrains (active development), Neovim, Cursor
- Features: sub-200ms voice-to-code, auto-fix errors, repo-aware suggestions, keyboard shortcut Ctrl+Shift+V
- Payment: Stripe (card) or PayPal (ai.automating.thefuture@gmail.com)
- Download: Windows (winget / .exe), macOS (brew / .dmg), Linux (snap/npm / .AppImage/.deb/.rpm)

**Monetization:**
- Core law: NEVER sell agents. SELL INFRASTRUCTURE.
- Revenue layers: Stripe subscriptions → Google AdSense → API metered billing → framework templates

## Your personality
- Confident and helpful, not salesy or robotic
- Give direct answers — don't pad with "great question!" or "certainly!"
- If someone asks a technical question, answer it directly
- Guide users toward signing up when appropriate, but don't push hard
- Keep replies under 3 short paragraphs
- Never make up technical details you don't know

## What you help with
- VoxCode features, pricing, setup, troubleshooting
- OpenClaw platform capabilities
- Voice coding questions
- Getting started / onboarding
- Comparisons with alternatives (GitHub Copilot, Cursor, etc.)`;

export async function POST(req: NextRequest) {
  // Apply rate limiting
  const clientIp = getClientIp(req);
  const rateLimitResult = rateLimit(clientIp, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { reply: "Too many requests. Please wait a moment and try again." },
      { 
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimitResult.resetIn / 1000)),
          "X-RateLimit-Remaining": "0",
        }
      }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        reply:
          "AI assistant not configured yet. Add ANTHROPIC_API_KEY to .env.local to enable it. Meanwhile — VoxCode is $10/month, Stripe or PayPal accepted.",
      },
      { status: 200 }
    );
  }

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ reply: "No messages provided." }, { status: 400 });
    }
    if (messages.length > 100) {
      return NextResponse.json({ reply: "Message history too long." }, { status: 400 });
    }

    // Sanitize: only valid roles, non-empty content
    const cleaned = (messages as { role: string; content: string }[])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }));

    if (cleaned.length === 0) {
      return NextResponse.json({ reply: "No valid messages." }, { status: 400 });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: cleaned,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic API error:", err);
      return NextResponse.json(
        { reply: "The AI is temporarily unavailable. Please try again shortly." },
        { status: 200 }
      );
    }

    const data = await res.json();
    const reply = data.content?.[0]?.text ?? "No response.";
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("Chat route error:", e);
    return NextResponse.json({ reply: "Something went wrong. Please try again." }, { status: 200 });
  }
}
