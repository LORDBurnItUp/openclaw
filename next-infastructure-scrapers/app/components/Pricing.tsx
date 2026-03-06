const STRIPE_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "#pricing";
const PAYPAL_LINK = "https://paypal.me/aiautomatingthefuture";
const PAYPAL_EMAIL = "ai.automating.thefuture@gmail.com";

const INCLUDED = [
  "IDE-ready voice-to-code · VS Code + JetBrains*",
  "Auto-fix mode · syntax, type, and import errors",
  "Repo-aware suggestions that learn your codebase",
  "Keyboard shortcut · Ctrl+Shift+V from anywhere",
  "Priority access to new languages and IDEs",
  "Desktop app · Windows, macOS, Linux",
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="mx-auto flex w-full max-w-6xl flex-col items-center py-20"
    >
      <div className="mb-10 space-y-3 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
          One plan. No surprises.
        </h2>
        <p className="max-w-xl text-sm text-slate-300 sm:text-base">
          Start voice coding for less than a coffee. Cancel any time — no lock-in, no usage maze.
        </p>
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Pricing card */}
        <div className="rounded-3xl border border-cyan-400/30 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 shadow-2xl shadow-cyan-500/20 backdrop-blur">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-50">Solo Dev Plan</h3>
              <p className="mt-1 text-[11px] text-slate-400">
                For individual engineers and indie hackers.
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-end justify-end gap-1">
                <span className="text-4xl font-bold text-slate-50">$10</span>
                <span className="text-xs text-slate-400 mb-1">/month</span>
              </div>
              <p className="text-[10px] text-slate-500">Cancel anytime</p>
            </div>
          </div>

          <ul className="mt-6 space-y-2.5">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[12px] text-slate-300">
                <span className="mt-0.5 h-4 w-4 rounded-full bg-cyan-400/15 border border-cyan-400/40 flex items-center justify-center shrink-0">
                  <svg className="h-2.5 w-2.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="mt-6 space-y-2.5">
            <a
              href={STRIPE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2.5 rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 active:bg-cyan-200 transition-colors shadow-md shadow-cyan-400/20"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
              </svg>
              Pay with Card — Stripe
            </a>

            <a
              href={PAYPAL_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2.5 rounded-full border border-slate-700 bg-slate-800/60 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700/80 hover:border-slate-600 transition-colors"
            >
              <svg className="h-4 w-4 text-[#009cde]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" />
              </svg>
              Pay with PayPal
            </a>
          </div>

          <p className="mt-4 text-[10px] text-slate-600 text-center">
            Secure checkout · PayPal: {PAYPAL_EMAIL}
          </p>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-5 pt-1 text-[10px] text-slate-600">
          {[
            { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", label: "256-bit SSL" },
            { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", label: "Cancel anytime" },
            { icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", label: "Auto-updates" },
          ].map((b) => (
            <span key={b.label} className="flex items-center gap-1">
              <svg className="h-3 w-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={b.icon} />
              </svg>
              {b.label}
            </span>
          ))}
        </div>

        <p className="text-center text-[10px] text-slate-700">
          *JetBrains support in active development. Your subscription auto-unlocks new IDE integrations.
        </p>
      </div>
    </section>
  );
}
