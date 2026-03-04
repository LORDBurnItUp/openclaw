const steps = [
  {
    title: "Speak in your own words",
    description:
      "Describe the function, change, or refactor you want. No special commands or scripts to memorize.",
    label: "1",
  },
  {
    title: "Voxcode understands your project",
    description:
      "The engine grounds your request in your existing types, files, and architecture before writing code.",
    label: "2",
  },
  {
    title: "IDE-ready code appears",
    description:
      "Voxcode sends self-correcting, import-aware changes to your editor so you can review and ship.",
    label: "3",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mx-auto w-full max-w-6xl space-y-6 py-16"
    >
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
          From voice to clean, shippable code.
        </h2>
        <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
          The entire loop—from your voice to a passing build—stays inside your
          development flow. No copy-paste gymnastics, no fragile transcripts.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.label}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
          >
            <div className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-400/40">
              {step.label}
            </div>
            <h3 className="mb-2 text-sm font-semibold text-slate-50">
              {step.title}
            </h3>
            <p className="text-xs text-slate-300 sm:text-sm">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

