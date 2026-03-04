const faqs = [
  {
    question: "How is Voxcode different from generic speech-to-code tools?",
    answer:
      "Voxcode is tuned for IDE-ready output. It grounds your requests in your existing project, auto-fixes common issues, and optimizes for code you can actually ship—not just impress in a demo.",
  },
  {
    question: "Will Voxcode break my codebase?",
    answer:
      "Voxcode is designed to generate changes that compile and respect your existing architecture. You stay in control of every change and can review everything before merging.",
  },
  {
    question: "Which IDEs are supported?",
    answer:
      "We focus on VS Code first, with JetBrains support in active development. Additional IDEs will follow, and your $5/month plan automatically unlocks new integrations.",
  },
  {
    question: "Does Voxcode learn from my private code?",
    answer:
      "Voxcode uses your repo to improve suggestions and stay consistent with your patterns. Training and adaptation are designed with privacy and team boundaries in mind.",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      className="mx-auto w-full max-w-6xl space-y-6 py-16"
    >
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
          Questions, meet answers.
        </h2>
        <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
          If you build and ship real products, Voxcode is designed for you. Here
          are a few of the questions we hear most often.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-200"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-slate-50">
              <span>{item.question}</span>
              <span className="text-xs text-slate-400 group-open:hidden">
                +
              </span>
              <span className="hidden text-xs text-slate-400 group-open:inline">
                —
              </span>
            </summary>
            <p className="mt-2 text-xs text-slate-300 sm:text-sm">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

