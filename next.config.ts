import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,

  // Turbopack config (Next.js 16 default bundler)
  turbopack: {},
};

export default nextConfig;
