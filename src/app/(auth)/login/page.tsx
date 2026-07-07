"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LogIn, Loader2, Phone, KeyRound, User } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";

const RESEND_SECONDS = 60;
const PHONE_RE = /^1[3-9]\d{9}$/;

export default function LoginPage() {
  const { sendCode, loginWithCode, isPending, error } = useAuth();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
      await loginWithCode({ phone, code, nickname: nickname || undefined });
    },
    [phone, code, nickname, loginWithCode]
  );

  const phoneValid = PHONE_RE.test(phone);

  return (
    <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-primary/20">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-linear-to-br from-primary to-amber-500 flex items-center justify-center">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">登录 / 注册</h1>
        </div>
        <p className="text-muted-foreground mt-1">手机号验证码登录，未注册将自动创建账户</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 手机号 */}
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

        <button
          type="submit"
          disabled={isPending || !phoneValid || code.length !== 6}
          className="w-full py-3 px-4 rounded-lg bg-linear-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <LogIn className="h-5 w-5" />
              登录 / 注册
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        首次使用将自动注册并开通试用
      </p>
    </div>
  );
}
