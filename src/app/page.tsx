"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// 动态导入组件，禁用 SSR
const LoginContent = dynamic(() => import("@/components/login-content"), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
    </main>
  ),
});

export default function LoginPage() {
  return <LoginContent />;
}
