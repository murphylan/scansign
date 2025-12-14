import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许局域网 IP 访问开发服务器
  allowedDevOrigins: ["192.168.124.60"],
};

export default nextConfig;

