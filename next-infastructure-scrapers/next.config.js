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
