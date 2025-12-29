import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许局域网 IP 访问开发服务器（支持多个 IP 和通配符）
  allowedDevOrigins: [
    "192.168.31.207",   // 当前局域网 IP
    "192.168.*.*",      // 匹配所有 192.168 开头的局域网 IP
  ],
};

export default nextConfig;

