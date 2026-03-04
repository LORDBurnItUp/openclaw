import { Badge } from "./Badge";

const STRIPE_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "#pricing";
const PAYPAL_LINK = "https://paypal.me/aiautomatingthefuture";

export function HeroSection() {
  return (
    <section
      id="top"
      className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 pt-32 pb-20 md:flex-row md:items-center md:gap-16"
    >
      {/* Left */}
      <div className="flex-1 space-y-7">
        <Badge>Voice coding SaaS · $1/month · Works everywhere</Badge>

        <h1 className="text-balance text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl md:text-6xl leading-[1.08]">
          Bulletproof voice coding
          <span className="block bg-gradient-to-r from-cyan-300 to-sky-400 bg-clip-text text-transparent">
            for real engineers.
          </span>
        </h1>

        <p className="max-w-xl text-balance text-sm leading-relaxed text-slate-300 sm:text-base">
          VoxCode turns what you say into IDE-ready, self-correcting code. No
          brittle transcripts. No mystery glue. Just production-grade changes
          that compile, improve over time, and stay aligned with your project.
        </p>

        {/* Shortcut callout */}
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-[11px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Press{" "}
          <kbd className="font-mono text-cyan-300 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded-md text-[10px]">
            Ctrl+Shift+V
          </kbd>{" "}
          anywhere · works system-wide
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
          <a
            href={STRIPE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 active:bg-cyan-200 transition-colors shadow-lg shadow-cyan-400/20"
          >
            Start for $1/month
          </a>
          <a
            href={PAYPAL_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-6 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700/80 transition-colors"
          >
            Pay with PayPal
          </a>
          <a
            href="#download"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download app
          </a>
        </div>

        <p className="text-xs text-slate-500">
          IDE-ready · Auto-fix errors · Repo-aware ·{" "}
          <span className="text-cyan-400/80">Ctrl+Shift+V</span> global shortcut
        </p>
      </div>

      {/* Right — live demo card */}
      <div className="flex-1">
        <div className="relative mx-auto max-w-md rounded-2xl border border-cyan-400/30 bg-slate-900/70 p-4 shadow-2xl shadow-cyan-500/20 backdrop-blur">
          <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-cyan-400/5 to-transparent" />

          <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              Live session · VS Code
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px]">
              <span className="h-5 w-5 rounded-full border border-slate-700 bg-slate-900/80 flex items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
              </span>
              Listening
            </span>
          </div>

          <div className="mb-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-[11px] font-mono leading-relaxed text-slate-200">
            <p className="text-cyan-300/90">
              // You:{" "}
              <span className="text-slate-300">
                &quot;Add a typesafe endpoint that returns active jobs.&quot;
              </span>
            </p>
            <p className="mt-3 text-emerald-300/90">// VoxCode output</p>
            <pre className="mt-1 overflow-x-auto text-[11px]">
{`export async function getActiveJobs() {
  const jobs = await db.job.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
  });
  return jobs;
}`}
            </pre>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-300">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-10 animate-pulse rounded-full bg-cyan-400/80" />
              Auto-fix:{" "}
              <span className="text-emerald-300 font-medium">0 errors</span>
            </span>
            <span className="text-[10px] text-slate-500">Learns from your repo</span>
          </div>

          {/* Platform tags */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {["Windows", "macOS", "Linux", "VS Code", "JetBrains"].map((p) => (
              <span
                key={p}
                className="text-[9px] font-medium text-slate-500 border border-slate-800 bg-slate-900/60 rounded-full px-2 py-0.5"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
