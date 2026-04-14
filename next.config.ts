import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,

  // Pin the app root so hosted builds do not accidentally inherit
  // the parent workspace lockfile.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
