import { Badge } from "./Badge";

const PLATFORMS = [
  {
    name: "Windows",
    ext: ".exe installer",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
      </svg>
    ),
    color: "text-blue-400",
    badge: "Recommended",
    href: process.env.NEXT_PUBLIC_DOWNLOAD_WIN ?? "#download",
  },
  {
    name: "macOS",
    ext: ".dmg · Apple Silicon + Intel",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
      </svg>
    ),
    color: "text-slate-300",
    badge: null,
    href: process.env.NEXT_PUBLIC_DOWNLOAD_MAC ?? "#download",
  },
  {
    name: "Linux",
    ext: ".AppImage · deb · rpm",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M12.504 0c-.155 0-.315.008-.48.021C7.309.358 3.926 3.749 3.17 8.016a9.049 9.049 0 0 0-.003.058C3.17 8.08 2.93 8.98 3.03 10.12c.097 1.123.54 2.09 1.17 2.85-.273.3-.51.62-.69.96-.384.738-.568 1.56-.568 2.37 0 1.037.288 2.063.865 2.96.576.897 1.43 1.634 2.535 2.08-1.296 1.21-2.13 2.73-2.13 4.44 0 .11.009.22.021.33C4.338 22.11 5.944 24 8.484 24h.024c1.02 0 1.95-.252 2.754-.693 0 0 .252-.145.54-.344.29-.2.636-.481.99-.84.354-.36.7-.783.983-1.252.14-.234.262-.481.364-.737.1-.256.178-.517.215-.776.038-.259.052-.517.052-.774 0-.258-.014-.515-.052-.771-.037-.258-.115-.519-.215-.775-.1-.256-.222-.503-.363-.737-.283-.469-.63-.893-.984-1.252-.354-.358-.7-.64-.99-.84-.288-.2-.54-.344-.54-.344a6.198 6.198 0 0 0-2.754-.693H8.46c-.858 0-1.68.197-2.415.545-.075-.295-.12-.597-.12-.9 0-.672.196-1.29.566-1.77.37-.48.91-.84 1.554-.99l.03-.006c.264-.06.534-.09.804-.09.168 0 .336.012.5.036l.01.002c.77.11 1.44.507 1.892 1.065.268.33.453.708.554 1.11.049.194.074.392.074.59v.024c0 .036-.004.072-.008.108.72-.372 1.5-.576 2.29-.576.36 0 .72.042 1.07.126.01.002.016.004.023.006.83.198 1.55.668 2.07 1.315.52.648.83 1.473.83 2.379 0 .618-.134 1.208-.378 1.74.55-.054 1.09-.234 1.574-.532.72-.45 1.27-1.134 1.57-1.944.03-.085.056-.174.08-.264.024-.09.043-.18.057-.272.013-.092.02-.185.02-.278 0-.093-.007-.186-.02-.278-.014-.092-.033-.183-.057-.272-.024-.09-.05-.179-.08-.264-.15-.41-.367-.786-.646-1.11-.28-.322-.616-.59-.994-.79.378-.43.696-.924.936-1.47.24-.544.39-1.13.39-1.73 0-.917-.246-1.793-.69-2.55-.444-.757-1.078-1.393-1.848-1.835A5.97 5.97 0 0 0 12.504 0zm0 1.2c.707 0 1.383.116 2.013.33.63.213 1.2.52 1.698.9.498.38.924.84 1.248 1.36.325.52.54 1.095.63 1.7.09.604.07 1.225-.06 1.824-.13.6-.376 1.163-.72 1.656-.345.493-.79.916-1.31 1.22-.52.303-1.1.483-1.7.516-.6.033-1.2-.084-1.74-.34-.54-.256-1.016-.644-1.384-1.13-.368-.487-.62-1.065-.73-1.676-.11-.61-.073-1.24.11-1.828.184-.59.508-1.13.955-1.563.448-.433 1.013-.748 1.63-.907.308-.08.624-.12.94-.12z" />
      </svg>
    ),
    color: "text-orange-400",
    badge: null,
    href: process.env.NEXT_PUBLIC_DOWNLOAD_LINUX ?? "#download",
  },
];

export function Download() {
  return (
    <section id="download" className="mx-auto w-full max-w-6xl py-20 space-y-10">
      {/* Header */}
      <div className="text-center space-y-4">
        <Badge>Desktop App · v1.0</Badge>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
          Download VoxCode.
          <span className="block text-cyan-300">Works everywhere you code.</span>
        </h2>
        <p className="max-w-xl mx-auto text-sm text-slate-300 sm:text-base">
          A native desktop app for Windows, macOS, and Linux. Runs silently in your system tray,
          ready with <kbd className="text-xs bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded-md text-cyan-300 font-mono">Ctrl+Shift+V</kbd> from anywhere.
        </p>
      </div>

      {/* Platform cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PLATFORMS.map((p) => (
          <a
            key={p.name}
            href={p.href}
            className="group relative flex flex-col items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center hover:border-cyan-400/50 hover:bg-slate-900/90 hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-cyan-500/10"
          >
            {p.badge && (
              <span className="absolute top-3 right-3 text-[10px] font-semibold text-cyan-300 bg-cyan-400/10 border border-cyan-400/30 px-2 py-0.5 rounded-full">
                {p.badge}
              </span>
            )}
            <span className={`${p.color} transition-transform duration-200 group-hover:scale-110`}>
              {p.icon}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-50 group-hover:text-cyan-300 transition-colors">
                {p.name}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{p.ext}</p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1.5 text-xs text-slate-400 group-hover:text-cyan-300 transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </span>
          </a>
        ))}
      </div>

      {/* Quick install */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Quick install via terminal</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { label: "Windows (winget)", cmd: "winget install VoxCode.Voxcode" },
            { label: "macOS (brew)", cmd: "brew install --cask voxcode" },
            { label: "Linux (snap)", cmd: "sudo snap install voxcode" },
            { label: "npm (global)", cmd: "npm install -g @voxcode/voxcode" },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <p className="text-[10px] text-slate-500">{item.label}</p>
              <code className="block rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-[11px] font-mono text-cyan-300 select-all">
                {item.cmd}
              </code>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-600">
        Requires subscription · $1/month · Cancel anytime · Auto-updates included
      </p>
    </section>
  );
}
