import { NextResponse } from "next/server";

const CROWDSEC_API   = "https://cti.api.crowdsec.net/v2/smoke";
const CROWDSEC_KEY   = process.env.CROWDSEC_API_KEY ?? "";

// ── GET /api/security — health check ────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    ok:      true,
    service: "VoxShield",
    crowdsec: CROWDSEC_KEY.length > 0 ? "configured" : "no-key",
  });
}

// ── POST /api/security — IP reputation via CrowdSec CTI ─────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ip   = (body.ip ?? "").trim();

    if (!ip) {
      return NextResponse.json({ error: "ip required" }, { status: 400 });
    }

    // Graceful degradation — no key means no lookup, not a crash
    if (!CROWDSEC_KEY) {
      return NextResponse.json({
        ip,
        score:           0,
        behaviors:       [],
        classifications: [],
        note:            "CrowdSec API key not configured — set CROWDSEC_API_KEY in .env",
      });
    }

    const res = await fetch(`${CROWDSEC_API}/${ip}`, {
      headers: { "x-api-key": CROWDSEC_KEY, Accept: "application/json" },
      signal:  AbortSignal.timeout(3000),
    });

    if (res.status === 404) {
      // IP not in CrowdSec DB → no known threats
      return NextResponse.json({ ip, score: 0, behaviors: [], classifications: [], known: false });
    }

    if (!res.ok) {
      throw new Error(`CrowdSec responded ${res.status}`);
    }

    const data = await res.json();

    // Normalise the CrowdSec v2 smoke response
    const score          = data?.scores?.overall?.total      ?? 0;
    const behaviors      = data?.behaviors      ?? [];
    const classifications = data?.classifications ?? { false_positives: [], classifications: [] };

    return NextResponse.json({ ip, score, behaviors, classifications, known: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg.includes("fetch") || msg.includes("timeout") ? "CrowdSec unreachable" : msg },
      { status: 503 }
    );
  }
}
