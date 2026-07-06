"use client";

import { useEffect, useState, useCallback } from "react";

import Link from "next/link";

import {
  Crown,
  Clock,
  Settings,
  Lock,
  LogOut,
  ChevronRight,
  UserCheck,
  Vote,
  Gift,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  CreditCard,
} from "lucide-react";

import { useUser } from "@/components/auth/auth-guard";
import { useAuth } from "@/hooks/use-auth";
import { listCheckinsAction } from "@/server/actions/checkinAction";
import { listVotesAction } from "@/server/actions/voteAction";
import { listFormsAction } from "@/server/actions/formAction";
import { listLotteriesAction } from "@/server/actions/lotteryAction";
import { subscriptionPlanLabel } from "@/lib/pricing";
import { cn } from "@/lib/utils";

interface Stats {
  totalActivities: number;
  activeActivities: number;
  totalParticipants: number;
  breakdown: { checkins: number; votes: number; forms: number; lotteries: number };
}

export default function MePage() {
  const user = useUser();
  const { logout } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  const fetchStats = useCallback(async () => {
    const [c, v, f, l] = await Promise.all([
      listCheckinsAction(),
      listVotesAction(),
      listFormsAction(),
      listLotteriesAction(),
    ]);

    const checkins = (c.success && c.data ? c.data : []) as Array<{ status: string; stats?: { total: number } }>;
    const votes = (v.success && v.data ? v.data : []) as Array<{ status: string; totalVotes?: number }>;
    const forms = (f.success && f.data ? f.data : []) as Array<{ status: string; responseCount?: number }>;
    const lotteries = (l.success && l.data ? l.data : []) as Array<{ status: string; participantCount?: number }>;

    const all = [...checkins, ...votes, ...forms, ...lotteries];

    const totalParticipants =
      checkins.reduce((s, i) => s + (i.stats?.total ?? 0), 0) +
      votes.reduce((s, i) => s + (i.totalVotes ?? 0), 0) +
      forms.reduce((s, i) => s + (i.responseCount ?? 0), 0) +
      lotteries.reduce((s, i) => s + (i.participantCount ?? 0), 0);

    setStats({
      totalActivities: all.length,
      activeActivities: all.filter((i) => i.status === "active").length,
      totalParticipants,
      breakdown: {
        checkins: checkins.length,
        votes: votes.length,
        forms: forms.length,
        lotteries: lotteries.length,
      },
    });
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const appItems = stats
    ? [
        { icon: UserCheck, label: "签到", count: stats.breakdown.checkins, tint: "bg-emerald-50", fg: "text-emerald-600", href: "/apps?tab=checkins" },
        { icon: Vote, label: "投票", count: stats.breakdown.votes, tint: "bg-blue-50", fg: "text-blue-600", href: "/apps?tab=votes" },
        { icon: FileText, label: "表单", count: stats.breakdown.forms, tint: "bg-violet-50", fg: "text-violet-600", href: "/apps?tab=forms" },
        { icon: Gift, label: "抽奖", count: stats.breakdown.lotteries, tint: "bg-amber-50", fg: "text-amber-600", href: "/apps?tab=lotteries" },
      ]
    : [];

  const menuItems = [
    { icon: CreditCard, label: "订阅与付款说明", href: "/me/billing" },
    { icon: Settings, label: "账户设置", href: "/settings" },
    { icon: Lock, label: "修改密码", href: "/settings" },
  ];

  return (
    <div className="-mx-4 -my-4 space-y-3 lg:-m-6">
      {/* 资料头 —— 企业级红色 */}
      <div className="bg-gradient-to-br from-primary to-[oklch(0.44_0.19_25)] px-4 pb-5 pt-5 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl font-bold ring-1 ring-white/25">
            {user.nickname?.charAt(0) || user.email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold">{user.nickname || user.email.split("@")[0]}</h2>
            <p className="truncate text-xs text-white/70">{user.email}</p>
          </div>
          {user.role === "ADMIN" ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium ring-1 ring-white/20">
              <Crown className="h-3.5 w-3.5" />
              管理员
            </span>
          ) : user.hasActivePaidSubscription ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium ring-1 ring-white/20">
              付费用户
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium ring-1 ring-white/20">
              <Clock className="h-3.5 w-3.5" />
              试用 {user.trialDaysRemaining} 天
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 px-4">
        {/* 数据概览 —— 上浮覆盖资料头 */}
        <div className="-mt-8 rounded-2xl bg-cell p-4 shadow-md">
          <div className="grid grid-cols-3 divide-x divide-border">
            {[
              { icon: Calendar, value: stats?.totalActivities ?? "-", label: "总活动" },
              { icon: TrendingUp, value: stats?.activeActivities ?? "-", label: "进行中" },
              { icon: Users, value: stats?.totalParticipants ?? "-", label: "总参与" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center px-1">
                <p className="text-2xl font-bold leading-tight text-foreground tabular-nums">{s.value}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 权益与到期 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm">
          <h3 className="mb-2 text-[13px] font-semibold text-muted-foreground">权益与到期</h3>
          {user.role === "ADMIN" ? (
            <p className="text-sm text-foreground">
              你当前为<span className="font-medium text-primary">运营管理员</span>，不显示试用/订阅到期日。
            </p>
          ) : user.hasActivePaidSubscription && user.subscriptionEndsAt ? (
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">当前套餐：</span>
                {subscriptionPlanLabel(user.subscriptionPlan)}
              </p>
              <p>
                <span className="text-muted-foreground">订阅到期日：</span>
                <span className="font-medium">
                  {new Date(user.subscriptionEndsAt).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })}
                </span>
              </p>
            </div>
          ) : user.hasActivePaidSubscription && !user.subscriptionEndsAt ? (
            <p className="text-sm">付费权益有效（未设置截止日期）。</p>
          ) : (
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">试用结束日：</span>
                <span className="font-medium">
                  {new Date(user.trialEndsAtIso).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })}
                </span>
              </p>
              <p className="text-muted-foreground">
                剩余试用约 <span className="font-medium text-foreground">{user.trialDaysRemaining}</span> 天 · 详情与付费请见「订阅与付款说明」
              </p>
            </div>
          )}
          <Link
            href="/me/billing"
            className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-primary/5 py-2.5 text-[13px] font-medium text-primary ring-1 ring-primary/15"
          >
            <CreditCard className="h-4 w-4" />
            查看定价与线下付款方式
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* 我的应用 */}
        {stats && (
          <div>
            <h3 className="mb-2 px-1 text-[13px] font-semibold text-muted-foreground">我的应用</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {appItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl bg-cell px-3.5 py-3 shadow-sm transition-colors active:bg-muted"
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", item.tint)}>
                    <item.icon className={cn("h-5 w-5", item.fg)} strokeWidth={1.9} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-lg font-bold leading-tight text-foreground tabular-nums">{item.count}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 菜单 */}
        <div className="overflow-hidden rounded-2xl bg-cell shadow-sm [&>*:last-child]:after:hidden">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="weui-hairline-bottom weui-hairline-inset relative flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-muted"
            >
              <item.icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.9} />
              <span className="flex-1 text-[15px] text-foreground">{item.label}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            </Link>
          ))}
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors active:bg-muted"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 text-destructive" strokeWidth={1.9} />
            <span className="flex-1 text-left text-[15px] text-destructive">退出登录</span>
          </button>
        </div>

        {/* 关于 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm">
          <h3 className="mb-2 text-[13px] font-semibold text-muted-foreground">关于我们</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Murphy Cloud 致力于为企业和个人提供高效、安全、易用的数字化解决方案。Sign 是 Murphy Cloud 旗下的活动互动 SaaS 产品，提供签到、投票、抽奖、表单等全场景互动能力。
          </p>
          <a
            href="https://murphylan.cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary"
          >
            访问官网
            <ChevronRight className="h-3 w-3" />
          </a>
        </div>

        <p className="pb-2 text-center text-[11px] text-muted-foreground">Murphy v1.0.0</p>
      </div>
    </div>
  );
}
