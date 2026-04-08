"use client";

// 1. React
import { useCallback, useState } from "react";

// 2. Next.js
import Link from "next/link";

// 3. Third-party
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";

// 4. Hooks
import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
  // 1. Hooks
  const { login, isPending, error } = useAuth();

  // 2. State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 3. Callbacks
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await login({ email, password });
    },
    [email, password, login]
  );

  // 4. Render
  return (
    <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-primary/20">
      {/* Logo 和标题 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-linear-to-br from-primary to-amber-500 flex items-center justify-center">
            <span className="text-sm font-bold text-white">R</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">欢迎回来</h1>
        </div>
        <p className="text-muted-foreground mt-1">登录 Rally 活动互动平台</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* 登录表单 */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            邮箱地址
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            密码
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 px-4 rounded-lg bg-linear-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <LogIn className="h-5 w-5" />
              登录
            </>
          )}
        </button>
      </form>

      {/* 注册链接 */}
      <div className="mt-6 text-center text-muted-foreground">
        还没有账户？{" "}
        <Link
          href="/register"
          className="text-primary hover:text-primary/80 font-medium transition"
        >
          立即注册
        </Link>
      </div>
    </div>
  );
}
