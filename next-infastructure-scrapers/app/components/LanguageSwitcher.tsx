"use client";

import { useState, useEffect, useMemo, useRef } from "react";

// 180+ language codes (ISO 639-1 + common BCP-47 tags)
const LANG_CODES = [
  "af","ak","sq","am","ar","hy","as","ay","az","bm","eu","be","bn","bho","bs","bg",
  "ca","ceb","ny","zh","zh-TW","co","hr","cs","da","dv","doi","nl","en","eo","et",
  "ee","tl","fi","fr","fy","gl","ka","de","el","gn","gu","ht","ha","haw","he","hi",
  "hmn","hu","is","ig","ilo","id","ga","it","ja","jv","kn","kk","km","rw","kok","ko",
  "kri","ku","ckb","ky","lo","la","lv","ln","lt","lg","lb","mk","mai","mg","ms","ml",
  "mt","mi","mr","mni-Mtei","lus","mn","my","ne","no","ny","or","om","ps","fa","pl",
  "pt","pa","qu","ro","ru","sm","sa","gd","nso","sr","st","sn","sd","si","sk","sl",
  "so","es","su","sw","sv","tg","ta","tt","te","th","ti","ts","tr","tk","ak","uk",
  "ur","ug","uz","vi","cy","xh","yi","yo","zu",
];

interface LangEntry { code: string; name: string; nativeName: string; }

function buildLangList(): LangEntry[] {
  const enNames = new Intl.DisplayNames(["en"], { type: "language" });
  return LANG_CODES.map(code => {
    const name = (() => { try { return enNames.of(code) ?? code; } catch { return code; } })();
    const nativeName = (() => {
      try { return new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code; }
      catch { return name; }
    })();
    return { code, name, nativeName };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

const RTL_CODES = new Set(["ar","he","fa","ur","yi","dv","ckb","ps"]);

export function LanguageSwitcher() {
  const [open,     setOpen]     = useState(false);
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState("en");
  const dropRef = useRef<HTMLDivElement>(null);

  const langs = useMemo(buildLangList, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return langs;
    const q = search.toLowerCase();
    return langs.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q)
    );
  }, [langs, search]);

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem("voxcode-lang");
    if (saved) setSelected(saved);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const select = (code: string) => {
    setSelected(code);
    localStorage.setItem("voxcode-lang", code);
    document.documentElement.lang = code;
    document.documentElement.dir  = RTL_CODES.has(code) ? "rtl" : "ltr";
    setOpen(false);
    setSearch("");
  };

  const current = langs.find(l => l.code === selected) ?? langs.find(l => l.code === "en")!;

  return (
    <div className="relative" ref={dropRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-xl border border-slate-700/50 bg-slate-900/70 px-2.5 py-1.5 text-[10px] font-medium text-slate-400 hover:border-cyan-400/40 hover:text-slate-200 transition-all"
        title="Change language"
      >
        🌐 <span className="font-mono uppercase tracking-wider">{current.code.slice(0, 5)}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-slate-700/60 bg-slate-950/98 shadow-2xl backdrop-blur-xl z-[200]">
          {/* Search */}
          <div className="p-2.5 border-b border-slate-800/60">
            <input
              type="text"
              autoFocus
              placeholder="Search language…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl bg-slate-800/80 px-3 py-2 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:ring-1 focus:ring-cyan-400/40"
            />
          </div>

          {/* Language list */}
          <div className="max-h-[260px] overflow-y-auto p-1.5">
            {filtered.length === 0 && (
              <p className="py-4 text-center text-[11px] text-slate-600 italic">No languages found</p>
            )}
            {filtered.map(l => (
              <button
                key={l.code}
                type="button"
                onClick={() => select(l.code)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all hover:bg-slate-800/50 ${
                  selected === l.code ? "bg-cyan-400/10 text-cyan-300" : "text-slate-300"
                }`}
              >
                <span className="w-8 flex-shrink-0 font-mono text-[9px] uppercase tracking-widest text-slate-600">
                  {l.code}
                </span>
                <span className="flex-1 text-[11px]">{l.name}</span>
                <span className="text-[10px] text-slate-500 truncate max-w-[80px]">{l.nativeName}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-800/60 px-3 py-2">
            <p className="text-[9px] text-slate-700">{langs.length} languages available</p>
          </div>
        </div>
      )}
    </div>
  );
}
