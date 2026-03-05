import { NextResponse } from "next/server";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

// ── GET /api/ollama — list local models ──────────────────────────────────────
export async function GET() {
  try {
    const res  = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2500) });
    const data = await res.json();
    return NextResponse.json({ ok: true, models: data.models ?? [] });
  } catch {
    return NextResponse.json(
      { ok: false, models: [], error: "Ollama not running locally" },
      { status: 503 }
    );
  }
}

// ── POST /api/ollama — chat (non-stream) or streaming SSE ────────────────────
export async function POST(req: Request) {
  try {
    const body        = await req.json();
    const wantsStream = body.stream === true;

    // ── Non-streaming path — backwards-compatible with DouglasCam ─────────────
    if (!wantsStream) {
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
      const data    = await res.json();
      const content = data?.message?.content ?? "";
      return NextResponse.json({
        content: [{ type: "text", text: content }],
        model:   body.model ?? "unknown",
        source:  "ollama",
      });
    }

    // ── Streaming path — used by OllamaAgent ─────────────────────────────────
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...body, stream: true }),
      signal:  AbortSignal.timeout(120_000),
    });

    if (!ollamaRes.ok || !ollamaRes.body) {
      return NextResponse.json({ error: "Ollama stream failed" }, { status: 503 });
    }

    // Pipe Ollama NDJSON stream → SSE text/event-stream
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer  = writable.getWriter();
    const encoder = new TextEncoder();
    const reader  = ollamaRes.body.getReader();
    const decoder = new TextDecoder();

    (async () => {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const json  = JSON.parse(line);
              const token = json?.message?.content ?? "";
              if (token) {
                await writer.write(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
              }
              if (json?.done) {
                await writer.write(encoder.encode("data: [DONE]\n\n"));
              }
            } catch { /* skip malformed NDJSON */ }
          }
        }
      } finally {
        await writer.close().catch(() => {});
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
      },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg.includes("fetch") ? "Ollama not running locally" : msg },
      { status: 503 }
    );
  }
}
