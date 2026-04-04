import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "192.168.*.*",
    "172.20.*.*",
    "10.*.*.*",
  ],
};

export default nextConfig;

