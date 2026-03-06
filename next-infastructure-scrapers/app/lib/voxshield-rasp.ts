// VoxShield RASP — Runtime Application Self-Protection
// Runs entirely client-side. No external agent required.

export type ThreatLevel = "info" | "warn" | "critical";

export interface ThreatEvent {
  id:       string;
  ts:       number;
  level:    ThreatLevel;
  type:     "dom_injection" | "suspicious_request" | "xss_pattern" | "csp_violation" | "clipboard";
  detail:   string;
  resolved: boolean;
}

interface RASPConfig {
  onThreat:  (e: ThreatEvent) => void;
  onResolve: (id: string) => void;
}

// ── Pattern libraries ────────────────────────────────────────────────────────

const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on(?:load|error|click|mouseover|focus|blur|change|submit)\s*=/i,
  /data\s*:\s*text\/html/i,
  /<\s*iframe/i,
  /expression\s*\(/i,
  /vbscript\s*:/i,
];

const SQLI_PATTERNS = [
  /union\s+select/i,
  /drop\s+table/i,
  /insert\s+into/i,
  /delete\s+from/i,
  /1\s*=\s*1\s*--/,
  /'\s*or\s*'/i,
  /;\s*--/,
  /\/\*.*\*\//,
];

const SUSPICIOUS_TLDS = /\.(ru|cn|tk|pw|top|xyz|gq|ml|cf|ga)$/i;

const PAYLOAD_PATTERNS = [
  /%3Cscript/i,
  /%27.*union/i,
  /UNION%20SELECT/i,
  /%3Cscript%3E/i,
];

// ── Helpers ──────────────────────────────────────────────────────────────────

let _seq = 0;
function mkId() { return `vs-${Date.now()}-${++_seq}`; }

// ── Main RASP class ──────────────────────────────────────────────────────────

export class VoxShieldRASP {
  private cfg:     RASPConfig;
  private obs:     MutationObserver | null = null;
  private origFetch: typeof fetch | null   = null;
  private timers:  Map<string, ReturnType<typeof setTimeout>> = new Map();
  private cspHandler:       ((e: SecurityPolicyViolationEvent) => void) | null = null;
  private clipboardHandler: ((e: ClipboardEvent) => void) | null = null;

  constructor(cfg: RASPConfig) {
    this.cfg = cfg;
  }

  start() {
    this._initDOMObserver();
    this._initFetchInterceptor();
    this._initCSPSink();
    this._initClipboardMonitor();
  }

  stop() {
    this.obs?.disconnect();
    this.obs = null;
    if (this.origFetch) {
      window.fetch = this.origFetch;
      this.origFetch = null;
    }
    if (this.cspHandler) {
      window.removeEventListener("securitypolicyviolation", this.cspHandler);
      this.cspHandler = null;
    }
    if (this.clipboardHandler) {
      window.removeEventListener("paste", this.clipboardHandler);
      this.clipboardHandler = null;
    }
    this.timers.forEach(t => clearTimeout(t));
    this.timers.clear();
  }

  // ── 1. DOM Injection Monitor ───────────────────────────────────────────────
  private _initDOMObserver() {
    if (typeof MutationObserver === "undefined") return;

    this.obs = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes)) {
          if (!(node instanceof Element)) continue;

          const tag = node.tagName?.toLowerCase();

          if (tag === "script") {
            const src = (node as HTMLScriptElement).src;
            const inline = (node as HTMLScriptElement).textContent ?? "";
            const isSelf = src.startsWith(location.origin) || src.startsWith("/_next");
            if (!isSelf) {
              this._emit({
                level:  "critical",
                type:   "dom_injection",
                detail: `External script injected: ${src || "(inline " + inline.slice(0, 60) + "…)"}`,
              });
            }
          } else if (tag === "iframe") {
            const src = (node as HTMLIFrameElement).src;
            this._emit({
              level:  "warn",
              type:   "dom_injection",
              detail: `Iframe inserted: ${src || "(no src)"}`,
            });
          } else if (tag === "object" || tag === "embed") {
            this._emit({
              level:  "warn",
              type:   "dom_injection",
              detail: `${tag} element inserted — potential plugin injection`,
            });
          }

          // Inline event attributes
          const attrs = Array.from(node.attributes ?? []);
          for (const attr of attrs) {
            if (/^on[a-z]+$/i.test(attr.name)) {
              this._emit({
                level:  "warn",
                type:   "dom_injection",
                detail: `Inline event handler detected: ${attr.name}="${attr.value.slice(0, 60)}"`,
              });
            }
          }
        }
      }
    });

    this.obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["onload","onerror","onclick","onmouseover"] });
  }

  // ── 2. Fetch Interceptor ───────────────────────────────────────────────────
  private _initFetchInterceptor() {
    if (typeof window === "undefined") return;
    this.origFetch = window.fetch;
    const rasp     = this;
    const orig     = this.origFetch;

    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;

      try {
        const parsed = new URL(url, location.origin);

        // External origin check
        if (parsed.origin !== location.origin) {
          // Suspicious TLD
          if (SUSPICIOUS_TLDS.test(parsed.hostname)) {
            rasp._emit({
              level:  "warn",
              type:   "suspicious_request",
              detail: `Request to suspicious TLD: ${parsed.hostname}`,
            });
          }

          // Payload in URL
          const raw = parsed.href;
          for (const p of PAYLOAD_PATTERNS) {
            if (p.test(raw)) {
              rasp._emit({
                level:  "critical",
                type:   "suspicious_request",
                detail: `Encoded payload detected in outbound URL: ${parsed.hostname}${parsed.pathname.slice(0, 60)}`,
              });
              break;
            }
          }

          // Large POST to unknown origin (potential data exfiltration)
          const body = init?.body;
          if (init?.method?.toUpperCase() === "POST" && body) {
            const size = typeof body === "string" ? body.length : 0;
            if (size > 50_000) {
              rasp._emit({
                level:  "warn",
                type:   "suspicious_request",
                detail: `Large POST (${(size / 1024).toFixed(1)}KB) to external origin: ${parsed.hostname}`,
              });
            }
          }
        }
      } catch { /* invalid URL — skip */ }

      return orig(input, init);
    } as typeof fetch;
  }

  // ── 3. CSP Violation Sink ─────────────────────────────────────────────────
  private _initCSPSink() {
    if (typeof window === "undefined") return;
    this.cspHandler = (e: SecurityPolicyViolationEvent) => {
      this._emit({
        level:  "warn",
        type:   "csp_violation",
        detail: `CSP blocked: ${e.violatedDirective} — ${e.blockedURI || "(inline)"}`,
      });
    };
    window.addEventListener("securitypolicyviolation", this.cspHandler);
  }

  // ── 4. Clipboard Monitor ──────────────────────────────────────────────────
  private _initClipboardMonitor() {
    if (typeof window === "undefined") return;
    this.clipboardHandler = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text") ?? "";
      const hit  = scanInput(text);
      if (hit) {
        this._emit({ level: hit.level, type: "clipboard", detail: `Suspicious paste: ${hit.detail}` });
      }
    };
    window.addEventListener("paste", this.clipboardHandler);
  }

  // ── Emit helper ───────────────────────────────────────────────────────────
  private _emit(partial: Pick<ThreatEvent, "level" | "type" | "detail">) {
    const event: ThreatEvent = { ...partial, id: mkId(), ts: Date.now(), resolved: false };
    this.cfg.onThreat(event);

    // Auto-resolve after 8s for non-critical events
    if (event.level !== "critical") {
      const t = setTimeout(() => {
        this.cfg.onResolve(event.id);
        this.timers.delete(event.id);
      }, 8_000);
      this.timers.set(event.id, t);
    }
  }
}

// ── Standalone input scanner (used by VoxShield panel for paste events) ─────

export function scanInput(value: string): Pick<ThreatEvent, "level" | "detail"> | null {
  for (const p of XSS_PATTERNS) {
    if (p.test(value)) {
      return { level: "warn", detail: `XSS pattern matched: ${value.slice(0, 80)}` };
    }
  }
  for (const p of SQLI_PATTERNS) {
    if (p.test(value)) {
      return { level: "warn", detail: `SQL injection pattern matched: ${value.slice(0, 80)}` };
    }
  }
  return null;
}
