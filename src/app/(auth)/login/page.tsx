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
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
      {/* Logo 和标题 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mb-4">
          <span className="text-3xl font-bold text-white">M</span>
        </div>
        <h1 className="text-2xl font-bold text-white">欢迎回来</h1>
        <p className="text-white/60 mt-2">登录 Murphy 互动工具集</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* 登录表单 */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            邮箱地址
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            密码
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition"
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
          className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="mt-6 text-center text-white/60">
        还没有账户？{" "}
        <Link
          href="/register"
          className="text-violet-400 hover:text-violet-300 font-medium transition"
        >
          立即注册
        </Link>
      </div>
    </div>
  );
}
