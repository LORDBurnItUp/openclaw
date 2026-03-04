const features = [
  {
    title: "Error shield by default",
    description:
      "Voxcode auto-fixes common syntax, type, and import issues before code ever lands in your editor.",
  },
  {
    title: "IDE-native output",
    description:
      "Optimized for VS Code, JetBrains, and more. Voxcode writes code the way real projects are structured.",
  },
  {
    title: "Learns your repo",
    description:
      "Every session improves suggestions using your own patterns, naming, and architecture.",
  },
  {
    title: "Hands-free refactors",
    description:
      "Describe a change in plain language and let Voxcode generate safe, reviewable diffs.",
  },
];

export function FeatureGrid() {
  return (
    <section
      id="features"
      className="mx-auto w-full max-w-6xl space-y-6 py-16"
    >
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
          Built for production, not demos.
        </h2>
        <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
          Voxcode is a voice engine tuned for serious engineering work, not
          one-off code snippets. Stable, predictable, and comfortable to ship.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/60 hover:shadow-cyan-500/30"
          >
            <h3 className="mb-2 text-sm font-semibold text-slate-50">
              {feature.title}
            </h3>
            <p className="text-xs text-slate-300 sm:text-sm">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

