import type { Metadata } from "next";
import { Toaster } from "sonner";

import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  // 让文件约定的 opengraph-image、相对图片路径解析为绝对 URL（微信抓取需要绝对地址）
  metadataBase: new URL(SITE_URL),
  title: "Sign - 活动互动工具集",
  description: "签到、投票、抽奖、表单，一站式满足各类活动互动需求",
  openGraph: {
    type: "website",
    siteName: "Sign",
    title: "Sign - 活动互动工具集",
    description: "签到、投票、抽奖、表单，一站式满足各类活动互动需求",
    images: ["/og/default.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased min-h-screen" suppressHydrationWarning>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
