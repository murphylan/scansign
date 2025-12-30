import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许局域网 IP 访问开发服务器
  allowedDevOrigins: [
    "192.168.*.*",      // 匹配所有 192.168 开头的局域网 IP
    "172.20.*.*",       // 匹配 172.20 开头的 IP（热点等）
    "10.*.*.*",         // 匹配 10 开头的内网 IP
  ],
};

export default nextConfig;

