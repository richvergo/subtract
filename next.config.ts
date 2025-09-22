import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true, // Enable strict mode for proper hydration
  eslint: {
    ignoreDuringBuilds: true, // Temporarily disable ESLint during builds for testing
  },
  /* config options here */
};

export default nextConfig;
