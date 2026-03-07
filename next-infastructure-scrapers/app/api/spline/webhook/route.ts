import { NextRequest, NextResponse } from "next/server";
import { validateWebhookPayload, setSceneVariable } from "../../../lib/spline-api";

// ═══════════════════════════════════════════════════════════════════════════
// /api/spline/webhook — Spline Webhook Receiver
// Handles Webhook Called Events from Spline scenes.
// Validates payloads, updates scene variables, and relays to Slack/Discord.
// ═══════════════════════════════════════════════════════════════════════════

const WEBHOOK_LOG: Array<{ event: string; ts: number; data: Record<string, unknown> }> = [];
const MAX_LOG_SIZE = 100;

// ── CORS ─────────────────────────────────────────────────────────────────
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Spline-Webhook-Secret",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// ── GET — Webhook log viewer ─────────────────────────────────────────────
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "Spline Webhook Receiver",
      totalReceived: WEBHOOK_LOG.length,
      recent: WEBHOOK_LOG.slice(-20).reverse(),
      ts: Date.now(),
    },
    { headers: corsHeaders() }
  );
}

// ── POST — Receive webhook events ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Optional secret validation
    const secret = process.env.SPLINE_WEBHOOK_SECRET;
    if (secret) {
      const provided = req.headers.get("x-spline-webhook-secret") ?? "";
      if (provided !== secret) {
        return NextResponse.json(
          { ok: false, error: "Invalid webhook secret" },
          { status: 401, headers: corsHeaders() }
        );
      }
    }

    const body = await req.json();
    const validation = validateWebhookPayload(body);

    if (!validation.valid) {
      return NextResponse.json(
        { ok: false, error: validation.error },
        { status: 400, headers: corsHeaders() }
      );
    }

    const { event } = validation;

    // Log the event
    WEBHOOK_LOG.push({
      event: event.event,
      ts: Date.now(),
      data: event.data,
    });

    // Trim log
    while (WEBHOOK_LOG.length > MAX_LOG_SIZE) WEBHOOK_LOG.shift();

    console.log(`[Spline Webhook] Event received: ${event.event}`, JSON.stringify(event.data).slice(0, 200));

    // ── Process specific event types ─────────────────────────────────
    switch (event.event) {
      case "api_updated":
        await handleApiUpdated(event.data);
        break;

      case "variable_changed":
        await handleVariableChanged(event.data);
        break;

      case "scene_loaded":
        console.log(`[Spline Webhook] Scene loaded: ${event.sceneId ?? "unknown"}`);
        break;

      case "user_interaction":
        await handleUserInteraction(event.data);
        break;

      default:
        console.log(`[Spline Webhook] Unhandled event type: ${event.event}`);
    }

    // ── Relay to Slack if configured ─────────────────────────────────
    await relayToSlack(event.event, event.data);

    return NextResponse.json(
      {
        ok: true,
        received: event.event,
        processedAt: Date.now(),
      },
      { headers: corsHeaders() }
    );
  } catch (err) {
    console.error("[Spline Webhook] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Webhook processing failed" },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Event Handlers
// ═══════════════════════════════════════════════════════════════════════════

async function handleApiUpdated(data: Record<string, unknown>) {
  // Update scene variables based on API response data
  const variable = data.variable as string | undefined;
  const value = data.value;

  if (variable && value !== undefined) {
    const type = typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "string";
    setSceneVariable(variable, type, value as string | number | boolean, "status");
  }
}

async function handleVariableChanged(data: Record<string, unknown>) {
  const name = data.name as string | undefined;
  const value = data.value;
  const varType = data.type as string | undefined;

  if (name && value !== undefined) {
    setSceneVariable(
      name,
      (varType as "number" | "string" | "boolean") ?? "string",
      value as string | number | boolean,
      "scene-vars"
    );
  }
}

async function handleUserInteraction(data: Record<string, unknown>) {
  console.log("[Spline Webhook] User interaction:", data.type, data.objectName ?? "unknown object");
}

// ── Slack relay ──────────────────────────────────────────────────────────
async function relayToSlack(eventType: string, data: Record<string, unknown>) {
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackUrl) return;

  try {
    await fetch(slackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🎨 *Spline Webhook* — \`${eventType}\`\n\`\`\`${JSON.stringify(data, null, 2).slice(0, 500)}\`\`\``,
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Non-critical — don't crash on Slack relay failure
  }
}
