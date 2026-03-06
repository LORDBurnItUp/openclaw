import { NextResponse } from "next/server";

// ── GET /api/health — uptime check for monitoring tools ─────────────────────
export async function GET() {
  const services = {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    crowdsec:  !!process.env.CROWDSEC_API_KEY,
    supabase:  !!process.env.SUPABASE_URL,
    stripe:    !!process.env.STRIPE_SECRET_KEY,
  };

  const allCritical = services.anthropic; // AI is the core dependency

  return NextResponse.json(
    {
      status:    allCritical ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      version:   process.env.npm_package_version ?? "0.1.0",
      services,
    },
    { status: allCritical ? 200 : 503 }
  );
}
