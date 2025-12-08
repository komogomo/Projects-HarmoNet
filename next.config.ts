import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    // Ensure Turbopack uses the workspace root (where node_modules/next exists)
    // instead of inferring the /app directory as the project root.
    root: __dirname,
  },
};

export default nextConfig;
