"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LogIn, Loader2, Phone, KeyRound, User, Lock } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";

const RESEND_SECONDS = 60;
const PHONE_RE = /^1[3-9]\d{9}$/;

type Mode = "code" | "password";

export default function LoginPage() {
  const { sendCode, loginWithCode, loginWithPassword, isPending, error, setError } =
    useAuth();

  const [mode, setMode] = useState<Mode>("code");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const switchMode = useCallback(
    (next: Mode) => {
      setMode(next);
      setError(null);
    },
    [setError]
  );

  const startCountdown = useCallback(() => {
    setCountdown(RESEND_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  const handleSendCode = useCallback(async () => {
    if (!PHONE_RE.test(phone) || countdown > 0 || sending) return;
    setSending(true);
    const ok = await sendCode(phone);
    setSending(false);
    if (ok) startCountdown();
  }, [phone, countdown, sending, sendCode, startCountdown]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (mode === "code") {
        await loginWithCode({ phone, code, nickname: nickname || undefined });
      } else {
        await loginWithPassword({ phone, password });
      }
    },
    [mode, phone, code, nickname, password, loginWithCode, loginWithPassword]
  );

  const phoneValid = PHONE_RE.test(phone);
  const canSubmit =
    mode === "code"
      ? phoneValid && code.length === 6
      : phoneValid && password.length >= 6;

  const tabClass = (active: boolean) =>
    `flex-1 py-2 text-sm font-medium rounded-lg transition ${
      active
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-primary/20">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-linear-to-br from-primary to-amber-500 flex items-center justify-center">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">登录 / 注册</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          {mode === "code"
            ? "手机号验证码登录，未注册将自动创建账户"
            : "已注册用户可用手机号 + 密码登录"}
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 p-1 mb-6 rounded-xl bg-secondary">
        <button
          type="button"
          onClick={() => switchMode("code")}
          className={tabClass(mode === "code")}
        >
          验证码登录
        </button>
        <button
          type="button"
          onClick={() => switchMode("password")}
          className={tabClass(mode === "password")}
        >
          密码登录
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 手机号（两种模式共用） */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Phone className="h-4 w-4 text-muted-foreground" />
            手机号
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
            placeholder="请输入手机号"
            required
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          />
        </div>

        {mode === "code" ? (
          <>
            {/* 验证码 + 获取按钮 */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                验证码
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6 位验证码"
                  required
                  className="flex-1 px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={!phoneValid || countdown > 0 || sending}
                  className="shrink-0 px-4 rounded-lg border border-primary/30 bg-primary/5 text-sm font-medium text-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {countdown > 0 ? `${countdown}s 后重发` : sending ? "发送中..." : "获取验证码"}
                </button>
              </div>
            </div>

            {/* 昵称（选填，仅首次注册用得上） */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <User className="h-4 w-4 text-muted-foreground" />
                昵称（选填）
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="首次注册时的显示名称"
                maxLength={50}
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
            </div>
          </>
        ) : (
          /* 密码 */
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Lock className="h-4 w-4 text-muted-foreground" />
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !canSubmit}
          className="w-full py-3 px-4 rounded-lg bg-linear-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <LogIn className="h-5 w-5" />
              {mode === "code" ? "登录 / 注册" : "登录"}
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {mode === "code" ? (
          "首次使用将自动注册并开通试用"
        ) : (
          <>
            没有账号？
            <button
              type="button"
              onClick={() => switchMode("code")}
              className="text-primary hover:underline"
            >
              用验证码登录 / 注册
            </button>
            （密码可登录后在「账户设置」里设置）
          </>
        )}
      </p>
    </div>
  );
}
