"use client";

import { useEffect, useState } from "react";
import { Button } from "./Button";

type Mode = "idle" | "listening" | "scan" | "enhance";

const demoPhrases = [
  'Add a new endpoint for active jobs.',
  "Rename `userId` to `accountId` everywhere in this file.",
  "Extract the error handling into a reusable helper.",
  "Generate a typesafe client for the metrics API.",
];

const enhancedSnippet = `export async function getActiveJobs(accountId: string) {
  const jobs = await db.job.findMany({
    where: { accountId, status: "active" },
    orderBy: { createdAt: "desc" },
  });

  return jobs.map((job) => ({
    id: job.id,
    title: job.title,
    createdAt: job.createdAt,
  }));
}`;

export function VoxcodeConsole() {
  const [mode, setMode] = useState<Mode>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const [cursorIndex, setCursorIndex] = useState(0);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  useEffect(() => {
    if (mode !== "listening") return;

    const phrase = demoPhrases[currentPhraseIndex];
    if (cursorIndex >= phrase.length) {
      const timeout = setTimeout(() => {
        setTranscript((prev) => (prev ? `${prev}\n${phrase}` : phrase));
        setCursorIndex(0);
        setCurrentPhraseIndex((prev) => (prev + 1) % demoPhrases.length);
      }, 600);
      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(() => {
      setTranscript((prev) => prev + phrase[cursorIndex]);
      setCursorIndex((prev) => prev + 1);
    }, 40);

    return () => clearTimeout(timeout);
  }, [cursorIndex, currentPhraseIndex, mode]);

  const isActive = mode !== "idle";

  return (
    <section
      aria-label="Voxcode live console"
      className="mx-auto mt-8 w-full max-w-6xl rounded-3xl border border-cyan-400/30 bg-slate-950/80 p-4 shadow-[0_0_70px_rgba(34,211,238,0.25)] backdrop-blur"
    >
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  isActive ? "bg-emerald-400" : "bg-slate-600"
                }`}
              />
              <span>
                Mode:{" "}
                <span className="font-semibold text-slate-100">
                  {mode === "idle"
                    ? "Idle"
                    : mode === "listening"
                    ? "Listening"
                    : mode === "scan"
                    ? "Deep scan"
                    : "Enhance"}
                </span>
              </span>
            </span>
            <span className="text-slate-500">
              Say: &quot;voxcode off&quot; · &quot;voxcode scan&quot; ·
              &quot;voxcode enhance&quot;
            </span>
          </div>

          <div className="h-32 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-[11px] font-mono text-slate-200">
            <p className="text-cyan-300/90">
              // Live transcript
              <span className="text-slate-300">
                {" "}
                (simulated for now — hook real Voxcode engine here)
              </span>
            </p>
            <pre className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed">
              {transcript || "Start a session to see your voice stream in here."}
            </pre>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Code preview</span>
            <span className="text-emerald-300">
              Auto-fix: 0 errors · Repo-aware
            </span>
          </div>

          <div className="h-32 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-[11px] font-mono leading-relaxed text-slate-200">
            <pre>{enhancedSnippet}</pre>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
            <Button
              variant={mode === "listening" ? "secondary" : "primary"}
              className="text-xs"
              onClick={() =>
                setMode((current) =>
                  current === "listening" ? "idle" : "listening",
                )
              }
            >
              {mode === "listening" ? "Voxcode off" : "Voxcode on"}
            </Button>
            <Button
              variant={mode === "scan" ? "secondary" : "ghost"}
              className="text-xs"
              onClick={() =>
                setMode((current) => (current === "scan" ? "idle" : "scan"))
              }
            >
              Deep scan
            </Button>
            <Button
              variant={mode === "enhance" ? "secondary" : "ghost"}
              className="text-xs"
              onClick={() =>
                setMode((current) =>
                  current === "enhance" ? "idle" : "enhance",
                )
              }
            >
              Enhance mode
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

