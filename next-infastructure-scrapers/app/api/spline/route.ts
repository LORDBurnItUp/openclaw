import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "../../lib/rate-limiter";
import {
  validateSplineRequest,
  buildSplineResponse,
  CHANNEL_REGISTRY,
  VALID_CHANNELS,
  getSceneVariables,
  setSceneVariable,
  type SplineChannel,
} from "../../lib/spline-api";

// ═══════════════════════════════════════════════════════════════════════════
// /api/spline — Spline Real-time API Proxy
// Spline scenes call this endpoint via their Real-time API config.
// We fan out to external services and return structured JSON for variable mapping.
// ═══════════════════════════════════════════════════════════════════════════

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 60; // generous for real-time polling

// ── CORS headers for Spline cross-origin requests ────────────────────────
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Spline-Scene",
  };
}

// ── OPTIONS — CORS preflight ─────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// ── GET — Channel discovery + health ─────────────────────────────────────
export async function GET() {
  const channels = VALID_CHANNELS.map((ch) => ({
    id: ch,
    ...CHANNEL_REGISTRY[ch],
    status: "active",
  }));

  return NextResponse.json(
    {
      ok: true,
      service: "Spline Real-time API Proxy",
      version: "1.0.0",
      engine: "OpenClaw",
      channels,
      variables: getSceneVariables(),
      ts: Date.now(),
    },
    { headers: corsHeaders() }
  );
}

// ── POST — Channel router ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limit
  const clientIp = getClientIp(req);
  const rl = rateLimit(clientIp, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX);
  if (!rl.success) {
    return NextResponse.json(
      buildSplineResponse("status", {}, false, "Rate limited. Try again shortly."),
      { status: 429, headers: { ...corsHeaders(), "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    );
  }

  try {
    const body = await req.json();
    const validation = validateSplineRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        buildSplineResponse("status", {}, false, validation.error),
        { status: 400, headers: corsHeaders() }
      );
    }

    const { channel, payload } = validation.req;
    const result = await handleChannel(channel, payload ?? {});

    return NextResponse.json(result, { headers: corsHeaders() });
  } catch (err) {
    console.error("[Spline API] Route error:", err);
    return NextResponse.json(
      buildSplineResponse("status", {}, false, "Internal server error"),
      { status: 500, headers: corsHeaders() }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Channel Handlers
// ═══════════════════════════════════════════════════════════════════════════

async function handleChannel(channel: SplineChannel, payload: Record<string, unknown>) {
  switch (channel) {
    case "status":
      return handleStatus();
    case "weather":
      return handleWeather(payload);
    case "ai-text":
      return handleAiText(payload);
    case "scene-vars":
      return handleSceneVars(payload);
    case "openclaw":
      return handleOpenClaw(payload);
    default:
      return buildSplineResponse(channel, {}, false, `Unknown channel: ${channel}`);
  }
}

// ── STATUS — System health data for Spline variables ─────────────────────
async function handleStatus() {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();

  const data = {
    systemStatus: "online",
    uptime: Math.round(uptime),
    uptimeFormatted: formatUptime(uptime),
    memoryUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
    memoryTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
    memoryHealth: Math.round((1 - memUsage.heapUsed / memUsage.heapTotal) * 100),
    activeChannels: VALID_CHANNELS.length,
    variableCount: getSceneVariables().length,
    engine: "OpenClaw v2.0",
    nodeVersion: process.version,
  };

  // Update scene variables so Spline can bind them
  setSceneVariable("systemStatus",  "string", data.systemStatus, "status");
  setSceneVariable("uptime",        "number", data.uptime,       "status");
  setSceneVariable("memoryHealth",  "number", data.memoryHealth, "status");

  return buildSplineResponse("status", data);
}

// ── WEATHER — Free weather data from wttr.in ─────────────────────────────
async function handleWeather(payload: Record<string, unknown>) {
  const city = ((payload.city as string) ?? "New York").slice(0, 100);

  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`wttr.in responded ${res.status}`);

    const raw = await res.json();
    const current = raw?.current_condition?.[0] ?? {};

    const data = {
      city,
      tempC: Number(current.temp_C ?? 0),
      tempF: Number(current.temp_F ?? 32),
      feelsLikeC: Number(current.FeelsLikeC ?? 0),
      humidity: Number(current.humidity ?? 0),
      description: current.weatherDesc?.[0]?.value ?? "Unknown",
      windSpeedKmph: Number(current.windspeedKmph ?? 0),
      windDir: current.winddir16Point ?? "N",
      visibility: Number(current.visibility ?? 10),
      uvIndex: Number(current.uvIndex ?? 0),
      cloudcover: Number(current.cloudcover ?? 0),
      pressure: Number(current.pressure ?? 1013),
    };

    setSceneVariable("weatherCity",   "string", city,             "weather");
    setSceneVariable("weatherTempC",  "number", data.tempC,       "weather");
    setSceneVariable("weatherDesc",   "string", data.description, "weather");
    setSceneVariable("weatherHumidity","number", data.humidity,    "weather");

    return buildSplineResponse("weather", data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return buildSplineResponse("weather", { city, error: msg }, false, `Weather fetch failed: ${msg}`);
  }
}

// ── AI-TEXT — Proxy to Anthropic Claude ───────────────────────────────────
async function handleAiText(payload: Record<string, unknown>) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return buildSplineResponse("ai-text", {}, false, "Anthropic API key not configured");
  }

  const prompt = ((payload.prompt as string) ?? "").slice(0, 2000);
  if (!prompt) {
    return buildSplineResponse("ai-text", {}, false, "Missing 'prompt' in payload");
  }

  const maxTokens = Math.min(Number(payload.maxTokens ?? 300), 600);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        system: "You are a concise assistant embedded in a 3D Spline scene. Keep responses short and punchy (2-4 sentences max). Be creative and engaging.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Spline AI-Text] Anthropic error:", errText);
      return buildSplineResponse("ai-text", {}, false, "AI request failed");
    }

    const result = await res.json();
    const text = result.content?.[0]?.text ?? "No response generated.";

    setSceneVariable("aiResponse", "string", text, "ai-text");
    setSceneVariable("aiModel",    "string", "claude-sonnet-4-6", "ai-text");

    return buildSplineResponse("ai-text", {
      text,
      model: "claude-sonnet-4-6",
      promptLength: prompt.length,
      responseLength: text.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return buildSplineResponse("ai-text", {}, false, `AI text error: ${msg}`);
  }
}

// ── SCENE-VARS — Get/set Spline variable state ──────────────────────────
async function handleSceneVars(payload: Record<string, unknown>) {
  // If payload contains "set" array, update variables
  const updates = payload.set as Array<{ name: string; type: string; value: unknown }> | undefined;

  if (updates && Array.isArray(updates)) {
    for (const u of updates.slice(0, 50)) {
      if (u.name && u.type && u.value !== undefined) {
        setSceneVariable(
          String(u.name).slice(0, 100),
          u.type as "number" | "string" | "boolean",
          u.value as string | number | boolean,
          "scene-vars"
        );
      }
    }
  }

  return buildSplineResponse("scene-vars", {
    variables: getSceneVariables(),
    count: getSceneVariables().length,
  });
}

// ── OPENCLAW — Forward to OpenClaw command processor ─────────────────────
async function handleOpenClaw(payload: Record<string, unknown>) {
  const command = (payload.command as string) ?? "status";
  const context = ((payload.context as string) ?? "").slice(0, 5000);

  try {
    // Internal fetch to our own OpenClaw route
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/openclaw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, context }),
    });

    const data = await res.json();

    setSceneVariable("openclawResult", "string", data.result ?? "No result", "openclaw");
    setSceneVariable("openclawCommand", "string", command, "openclaw");

    return buildSplineResponse("openclaw", {
      command,
      result: data.result,
      type: data.type,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return buildSplineResponse("openclaw", {}, false, `OpenClaw error: ${msg}`);
  }
}

// ── Utility ──────────────────────────────────────────────────────────────
function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}
