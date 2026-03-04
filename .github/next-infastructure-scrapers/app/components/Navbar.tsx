import Link from "next/link";
import { Button } from "./Button";

const navItems = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  return (
    <header className="sticky top-4 z-30 flex justify-center px-4">
      <nav className="flex w-full max-w-6xl items-center justify-between rounded-full border border-slate-800/80 bg-slate-950/80 px-4 py-2.5 shadow-lg shadow-slate-950/60 backdrop-blur">
        <Link
          href="#top"
          className="flex items-center gap-2 text-sm font-semibold text-slate-100 cursor-pointer"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 text-slate-950 text-xs font-black">
            V
          </span>
          <span className="tracking-tight">
            Voxcode
            <span className="ml-2 text-xs font-normal text-slate-400">
              IDE voice engine
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 text-xs font-medium text-slate-300 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="cursor-pointer text-slate-300 hover:text-cyan-300 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button className="hidden text-xs md:inline-flex">
            Start for $5/month
          </Button>
          <Button variant="ghost" className="text-xs md:hidden">
            Start
          </Button>
        </div>
      </nav>
    </header>
  );
}

