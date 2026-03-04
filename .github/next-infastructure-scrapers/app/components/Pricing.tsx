import { Button } from "./Button";

export function Pricing() {
  return (
    <section
      id="pricing"
      className="mx-auto flex w-full max-w-6xl flex-col items-center py-16"
    >
      <div className="mb-8 space-y-3 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
          One plan. Built for working developers.
        </h2>
        <p className="max-w-xl text-sm text-slate-300 sm:text-base">
          Start with Voxcode for the price of a coffee. No usage maze, no
          surprises—just a dependable voice engine in your IDE.
        </p>
      </div>

      <div className="w-full max-w-md rounded-3xl border border-cyan-400/30 bg-slate-950/80 p-6 shadow-xl shadow-cyan-500/30">
        <div className="flex items-baseline justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-50">Solo Dev</h3>
            <p className="mt-1 text-xs text-slate-400">
              Ideal for individual engineers and indie hackers.
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-end justify-end gap-1">
              <span className="text-3xl font-semibold text-slate-50">$5</span>
              <span className="text-xs text-slate-400">/month</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Cancel anytime • No long-term lock-in
            </p>
          </div>
        </div>

        <ul className="mt-6 space-y-2 text-xs text-slate-200 sm:text-sm">
          <li>• IDE-ready voice-to-code for VS Code and JetBrains*</li>
          <li>• Auto-fix mode for common syntax and type errors</li>
          <li>• Learns from your project structure over time</li>
          <li>• Priority access to new language and IDE support</li>
        </ul>

        <Button className="mt-6 w-full">
          Start for $5/month
        </Button>

        <p className="mt-3 text-[11px] text-slate-500">
          *Initial integrations focused on VS Code. Additional IDEs are rolling
          out—your account will unlock them automatically.
        </p>
      </div>
    </section>
  );
}

