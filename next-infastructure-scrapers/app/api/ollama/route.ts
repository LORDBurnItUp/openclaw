import { NextResponse } from "next/server";

const OLLAMA_BASE = "http://localhost:11434";

// ─── GET /api/ollama — list local models ──────────────────────────────────────
export async function GET() {
  try {
    const res  = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(2500),
    });
    const data = await res.json();
    return NextResponse.json({ ok: true, models: data.models ?? [] });
  } catch {
    return NextResponse.json(
      { ok: false, models: [], error: "Ollama not running locally" },
      { status: 503 }
    );
  }
}

// ─── POST /api/ollama — chat via local Ollama model ───────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // body: { model: string, messages: {role,content}[], stream?: boolean }

    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...body, stream: false }),
      signal:  AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json(
        { error: `Ollama responded ${res.status}: ${txt}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    // Normalize to match our existing chat API shape
    const content = data?.message?.content ?? "";
    return NextResponse.json({
      content: [{ type: "text", text: content }],
      model:   body.model ?? "unknown",
      source:  "ollama",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg.includes("fetch") ? "Ollama not running locally" : msg },
      { status: 503 }
    );
  }
}
