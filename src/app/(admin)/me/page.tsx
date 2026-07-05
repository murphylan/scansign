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
        { icon: UserCheck, label: "签到", count: stats.breakdown.checkins, color: "text-emerald-500", bg: "bg-emerald-500/10", href: "/apps?tab=checkins" },
        { icon: Vote, label: "投票", count: stats.breakdown.votes, color: "text-blue-500", bg: "bg-blue-500/10", href: "/apps?tab=votes" },
        { icon: FileText, label: "表单", count: stats.breakdown.forms, color: "text-purple-500", bg: "bg-purple-500/10", href: "/apps?tab=forms" },
        { icon: Gift, label: "抽奖", count: stats.breakdown.lotteries, color: "text-orange-500", bg: "bg-orange-500/10", href: "/apps?tab=lotteries" },
      ]
    : [];

  const menuItems = [
    { icon: CreditCard, label: "订阅与付款说明", href: "/me/billing" },
    { icon: Settings, label: "账户设置", href: "/settings" },
    { icon: Lock, label: "修改密码", href: "/settings" },
  ];

  return (
    <div className="space-y-3">
      {/* User Card -- compact horizontal */}
      <div className="bg-linear-to-br from-primary/10 via-amber-500/5 to-background rounded-2xl border border-border px-4 py-3 flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-linear-to-br from-primary/60 to-amber-500/60 flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-lg font-bold text-white">
            {user.nickname?.charAt(0) || user.email.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold truncate">
            {user.nickname || user.email.split("@")[0]}
          </h2>
          <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
        </div>
        {user.role === "ADMIN" ? (
          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full font-medium shrink-0">
            <Crown className="h-3 w-3" />
            管理员
          </span>
        ) : user.hasActivePaidSubscription ? (
          <span className="inline-flex items-center text-[10px] bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-full font-medium shrink-0">
            付费用户
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/20 text-blue-600 px-2 py-0.5 rounded-full font-medium shrink-0">
            <Clock className="h-3 w-3" />
            试用 {user.trialDaysRemaining} 天
          </span>
        )}
      </div>

      {/* 权益与到期 */}
      <div className="bg-card rounded-2xl border border-border p-3 space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground px-1">权益与到期</h3>
        {user.role === "ADMIN" ? (
          <p className="text-sm text-foreground px-1">
            你当前为<span className="font-medium text-amber-600">运营管理员</span>
            ，不显示试用/订阅到期日。
          </p>
        ) : user.hasActivePaidSubscription && user.subscriptionEndsAt ? (
          <div className="space-y-1 px-1 text-sm">
            <p>
              <span className="text-muted-foreground">当前套餐：</span>
              {subscriptionPlanLabel(user.subscriptionPlan)}
            </p>
            <p>
              <span className="text-muted-foreground">订阅到期日：</span>
              <span className="font-medium">
                {new Date(user.subscriptionEndsAt).toLocaleDateString("zh-CN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })}
              </span>
            </p>
          </div>
        ) : user.hasActivePaidSubscription && !user.subscriptionEndsAt ? (
          <p className="text-sm px-1">付费权益有效（未设置截止日期）。</p>
        ) : (
          <div className="space-y-1 px-1 text-sm">
            <p>
              <span className="text-muted-foreground">试用结束日：</span>
              <span className="font-medium">
                {new Date(user.trialEndsAtIso).toLocaleDateString("zh-CN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })}
              </span>
            </p>
            <p className="text-muted-foreground">
              剩余试用约 <span className="font-medium text-foreground">{user.trialDaysRemaining}</span>{" "}
              天 · 详情与付费请见「订阅与付款说明」
            </p>
          </div>
        )}
        <Link
          href="/me/billing"
          className="flex items-center justify-center gap-1 text-xs text-primary font-medium py-2 rounded-xl border border-dashed border-primary/30 bg-primary/5"
        >
          <CreditCard className="h-3.5 w-3.5" />
          查看定价与线下付款方式
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Stats -- 3-col grid, compact */}
      <div className="bg-card rounded-2xl border border-border p-3">
        <div className="grid grid-cols-3 divide-x divide-border">
          {[
            { icon: Calendar, value: stats?.totalActivities ?? "-", label: "总活动", color: "text-blue-500", bg: "bg-blue-500/10" },
            { icon: TrendingUp, value: stats?.activeActivities ?? "-", label: "进行中", color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { icon: Users, value: stats?.totalParticipants ?? "-", label: "总参与", color: "text-purple-500", bg: "bg-purple-500/10" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center py-1">
              <div className={`h-7 w-7 rounded-full ${s.bg} flex items-center justify-center mb-1`}>
                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
              </div>
              <p className="text-base font-bold leading-tight">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* App Breakdown -- 2x2 grid */}
      {stats && (
        <div className="bg-card rounded-2xl border border-border p-3">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-1">我的应用</h3>
          <div className="grid grid-cols-2 gap-2">
            {appItems.map((item) => (
              <Link key={item.label} href={item.href}>
                <div className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 active:bg-secondary transition-colors">
                  <div className={`h-8 w-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-bold leading-tight">{item.count}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Menu -- 2-col grid + logout full width */}
      <div className="bg-card rounded-2xl border border-border p-3">
        <div className="grid grid-cols-2 gap-2">
          {menuItems.map((item) => (
            <Link key={item.label} href={item.href}>
              <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 active:bg-secondary transition-colors">
                <div className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="text-sm">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 mt-2 active:bg-secondary transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">退出登录</span>
        </button>
      </div>

      {/* About */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <h3 className="text-xs font-semibold text-muted-foreground mb-2">关于我们</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Murphy Cloud 致力于为企业和个人提供高效、安全、易用的数字化解决方案。Sign 是 Murphy Cloud 旗下的活动互动 SaaS 产品，提供签到、投票、抽奖、表单等全场景互动能力。
        </p>
        <a
          href="https://murphylan.cloud"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-2"
        >
          访问官网
          <ChevronRight className="h-3 w-3" />
        </a>
      </div>

      {/* Version */}
      <div className="text-center py-2">
        <p className="text-[10px] text-muted-foreground">Murphy v1.0.0</p>
      </div>
    </div>
  );
}
