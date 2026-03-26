import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Upstream ASMP TypeScript SDK (package identifier on npm is unchanged from upstream)
  transpilePackages: ["scp-sdk"],
};

export default nextConfig;
