import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No output override — Hostinger's Git deployment handles node_modules automatically
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
