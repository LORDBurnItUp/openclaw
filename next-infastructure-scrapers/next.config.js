/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  compress: true,

  // React Compiler — SolidJS-style auto-memoization without migrating frameworks
  reactCompiler: true,
  experimental: {
    optimizePackageImports: ["three", "@react-three/fiber", "@react-three/drei"],
  },

  async headers() {
    return [
      // ── Security headers — applied to all routes ──────────────────────────
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",        value: "DENY" },
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "X-XSS-Protection",        value: "1; mode=block" },
          { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",      value: "camera=(self), microphone=(self), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "media-src 'self' blob:",
              // Supabase realtime/DB, Ollama local, CrowdSec CTI, ipify for client IP
              "connect-src 'self' http://localhost:11434 https://*.supabase.co wss://*.supabase.co https://cti.api.crowdsec.net https://api.ipify.org ws://localhost:*",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
      // ── Cache headers ─────────────────────────────────────────────────────
      {
        source: "/_next/static/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/api/(.*)",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

module.exports = nextConfig;
