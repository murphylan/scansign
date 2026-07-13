"use client";

import { useCallback, useState } from "react";

import { User, Save, Loader2, Check, Crown, Clock, Lock } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useUser } from "@/components/auth/auth-guard";

export default function SettingsPage() {
  const user = useUser();
  const { changeNickname, setPassword, isPending } = useAuth();

  const [nickname, setNickname] = useState(user.nickname || "");
  const [nicknameSuccess, setNicknameSuccess] = useState(false);

  const [password, setPasswordInput] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleNicknameSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setNicknameSuccess(false);

      const success = await changeNickname({ nickname });

      if (success) {
        setNicknameSuccess(true);
        setTimeout(() => setNicknameSuccess(false), 3000);
      }
    },
    [nickname, changeNickname]
  );

  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordSuccess(false);

      if (password.length < 6) {
        toast.error("密码至少 6 位");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("两次输入的密码不一致");
        return;
      }

      const success = await setPassword({ password });

      if (success) {
        setPasswordSuccess(true);
        setPasswordInput("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(false), 3000);
      }
    },
    [password, confirmPassword, setPassword]
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">账户设置</h1>
        <p className="text-muted-foreground mt-1">管理您的账户信息</p>
      </div>

      {/* 账户信息 */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5" />
          账户信息
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">手机号</label>
            <p className="font-medium">{user.phone}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">账户类型</label>
            <div className="mt-1">
              {user.role === "ADMIN" ? (
                <span className="inline-flex items-center gap-1 text-sm bg-amber-500/20 text-amber-600 px-3 py-1 rounded-full">
                  <Crown className="h-4 w-4" />
                  管理员
                </span>
              ) : user.hasActivePaidSubscription ? (
                <span className="inline-flex items-center gap-1 text-sm bg-emerald-500/20 text-emerald-600 px-3 py-1 rounded-full">
                  付费用户
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm bg-blue-500/20 text-blue-600 px-3 py-1 rounded-full">
                  <Clock className="h-4 w-4" />
                  免费试用 · 剩余 {user.trialDaysRemaining} 天
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 修改昵称 */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5" />
          修改昵称
        </h2>

        <form onSubmit={handleNicknameSubmit} className="space-y-4">
          {nicknameSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm flex items-center gap-2">
              <Check className="h-4 w-4" />
              昵称修改成功
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入您的昵称"
              className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            保存
          </button>
        </form>
      </div>

      {/* 设置密码 */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <Lock className="h-5 w-5" />
          设置密码
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          设置后即可用「手机号 + 密码」登录，验证码登录仍然可用。
        </p>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm flex items-center gap-2">
              <Check className="h-4 w-4" />
              密码设置成功
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">新密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="6 - 64 位"
              autoComplete="new-password"
              className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
              autoComplete="new-password"
              className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || !password || !confirmPassword}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            保存密码
          </button>
        </form>
      </div>
    </div>
  );
}
