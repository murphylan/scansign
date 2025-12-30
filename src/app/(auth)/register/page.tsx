"use client";

// 1. React
import { useCallback, useState } from "react";

// 2. Next.js
import Link from "next/link";

// 3. Third-party
import { Eye, EyeOff, UserPlus, Loader2, Gift } from "lucide-react";

// 4. Hooks
import { useAuth } from "@/hooks/use-auth";

export default function RegisterPage() {
  // 1. Hooks
  const { register, isPending, error, setError } = useAuth();

  // 2. State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 3. Callbacks
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (password !== confirmPassword) {
        setError("两次输入的密码不一致");
        return;
      }

      if (password.length < 6) {
        setError("密码至少需要6个字符");
        return;
      }

      await register({
        email,
        password,
        nickname: nickname || undefined,
      });
    },
    [email, password, confirmPassword, nickname, register, setError]
  );

  // 4. Render
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
      {/* Logo 和标题 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mb-4">
          <span className="text-3xl font-bold text-white">M</span>
        </div>
        <h1 className="text-2xl font-bold text-white">创建账户</h1>
        <p className="text-white/60 mt-2">加入 Murphy 互动工具集</p>
      </div>

      {/* 免费试用提示 */}
      <div className="mb-6 p-4 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-3">
        <Gift className="h-5 w-5 text-emerald-400 flex-shrink-0" />
        <p className="text-emerald-200 text-sm">
          新用户注册即可享受 <span className="font-bold">3 天免费试用</span>
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* 注册表单 */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            邮箱地址 <span className="text-red-400">*</span>
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
            昵称 <span className="text-white/40">(可选)</span>
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="您的昵称"
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            密码 <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少6个字符"
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

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            确认密码 <span className="text-red-400">*</span>
          </label>
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="再次输入密码"
            required
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
          />
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
              <UserPlus className="h-5 w-5" />
              注册
            </>
          )}
        </button>
      </form>

      {/* 登录链接 */}
      <div className="mt-6 text-center text-white/60">
        已有账户？{" "}
        <Link
          href="/login"
          className="text-violet-400 hover:text-violet-300 font-medium transition"
        >
          立即登录
        </Link>
      </div>
    </div>
  );
}
