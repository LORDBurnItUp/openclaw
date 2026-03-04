export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 text-[11px] text-slate-500 sm:flex-row">
        <p>© {new Date().getFullYear()} Voxcode. Built for working engineers.</p>
        <div className="flex gap-4">
          <a href="#top" className="cursor-pointer hover:text-cyan-300">
            Back to top
          </a>
          <span className="text-slate-600">Docs · Status · Security (coming soon)</span>
        </div>
      </div>
    </footer>
  );
}

