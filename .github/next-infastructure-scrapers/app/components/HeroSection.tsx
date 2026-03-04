import { Badge } from "./Badge";
import { Button } from "./Button";

export function HeroSection() {
  return (
    <section
      id="top"
      className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 pt-32 pb-20 md:flex-row md:items-center md:gap-16"
    >
      <div className="flex-1 space-y-6">
        <Badge>Intelligent voice engine • $5/month</Badge>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl md:text-6xl">
          Bulletproof voice coding
          <span className="block text-cyan-300">
            for real engineers.
          </span>
        </h1>
        <p className="max-w-xl text-balance text-sm leading-relaxed text-slate-300 sm:text-base">
          Voxcode turns what you say into IDE-ready, self-correcting code. No
          brittle transcripts. No mystery glue. Just production-grade changes
          that compile, improve over time, and stay aligned with your project.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button>
            Start for $5/month
          </Button>
          <Button variant="secondary">
            See how it works
          </Button>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          IDE-ready code · Auto-fix common errors · Learns your repo session by
          session.
        </p>
      </div>

      <div className="flex-1">
        <div className="relative mx-auto max-w-md rounded-2xl border border-cyan-400/30 bg-slate-900/70 p-4 shadow-2xl shadow-cyan-500/20 backdrop-blur">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Live session · vs-code
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-5 w-5 rounded-full border border-slate-700 bg-slate-900/80">
                <span className="mx-auto mt-1 block h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
              </span>
              Listening
            </span>
          </div>

          <div className="mb-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-[11px] font-mono leading-relaxed text-slate-200">
            <p className="text-cyan-300/90">
              // You:
              <span className="text-slate-300">
                {" "}
                &quot;Add a typesafe endpoint that returns active jobs.&quot;
              </span>
            </p>
            <p className="mt-3 text-emerald-300/90">// Voxcode output</p>
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
            <span className="text-xs text-slate-500">
              Learns from your repo over time
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

