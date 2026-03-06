import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "../../lib/rate-limiter";

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute (OpenClaw commands)

// OpenClaw command processor — handles ClawBar AI commands
// Commands: deep_scan, enhance, voice_process, status

const OPENCLAW_SYSTEM = `You are the OpenClaw command processor — a concise, technical AI engine embedded in the VoxCode voice coding platform.

You process structured commands from the ClawBar control interface. Each command has a type and optional context.

Commands you handle:
- deep_scan: Analyze code or context for issues, patterns, and improvements. Return findings as a tight bullet list.
- enhance: Suggest improvements to code or text. Be specific and actionable.
- voice_process: Process a voice transcript and extract structured intent (what the user is trying to do, what code to write, what changes to make).
- status: Report system status — what's running, what's healthy, what needs attention.

Rules:
- Always respond in 5–10 lines max unless outputting code
- Use bullet points for lists
- For code output, use markdown code fences with language tags
- Be surgical and precise — no padding, no summaries of what you're about to do, just do it
- If context is empty or unclear, say so in one line and suggest what to provide`;

type CommandType = "deep_scan" | "enhance" | "voice_process" | "status";

export async function POST(req: NextRequest) {
  // Apply rate limiting
  const clientIp = getClientIp(req);
  const rateLimitResult = rateLimit(clientIp, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { result: "Too many requests. Please wait a moment.", type: "error" },
      { 
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimitResult.resetIn / 1000)),
        }
      }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { result: "OpenClaw engine offline — ANTHROPIC_API_KEY not configured.", type: "error" },
      { status: 200 }
    );
  }

  try {
    const body = await req.json();
    const VALID_COMMANDS: CommandType[] = ["deep_scan", "enhance", "voice_process", "status"];
    const rawCommand = body.command ?? "status";
    const command: CommandType = VALID_COMMANDS.includes(rawCommand) ? rawCommand : "status";
    const rawContext: string = body.context ?? "";
    const context: string = rawContext.length > 10000 ? rawContext.slice(0, 10000) : rawContext;

    const commandPrompts: Record<CommandType, string> = {
      deep_scan: `Run a deep scan on the following content. Identify issues, anti-patterns, improvement opportunities, and security concerns:\n\n${context || "(no content provided — describe what you want scanned)"}`,
      enhance: `Enhance the following code or text. Make it cleaner, faster, and more maintainable. Show the improved version:\n\n${context || "(no content provided — paste what you want enhanced)"}`,
      voice_process: `Process this voice transcript and extract structured coding intent. What is the user trying to build or change? Output: intent summary, suggested code/changes, and any clarifying questions:\n\n${context || "(no transcript provided)"}`,
      status: `Report OpenClaw system status. Cover: voice engine readiness, API connectivity, memory system, revenue tracking, and any active alerts. Context:\n\n${context || "No additional context."}`,
    };

    const userPrompt = commandPrompts[command] ?? commandPrompts.status;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        system: OPENCLAW_SYSTEM,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("OpenClaw API error:", err);
      return NextResponse.json(
        { result: "Command failed — API error. Try again.", type: "error" },
        { status: 200 }
      );
    }

    const data = await res.json();
    const result = data.content?.[0]?.text ?? "No result.";
    return NextResponse.json({ result, command, type: "success" });
  } catch (e) {
    console.error("OpenClaw route error:", e);
    return NextResponse.json(
      { result: "OpenClaw command processor crashed. Check server logs.", type: "error" },
      { status: 200 }
    );
  }
}
