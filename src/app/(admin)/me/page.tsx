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
} from "lucide-react";

import { useUser } from "@/components/auth/auth-guard";
import { useAuth } from "@/hooks/use-auth";
import { listCheckinsAction } from "@/server/actions/checkinAction";
import { listVotesAction } from "@/server/actions/voteAction";
import { listFormsAction } from "@/server/actions/formAction";
import { listLotteriesAction } from "@/server/actions/lotteryAction";

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

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* User Card */}
      <div className="bg-linear-to-br from-primary/10 via-amber-500/5 to-background rounded-2xl border border-border p-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-linear-to-br from-primary/60 to-amber-500/60 flex items-center justify-center shrink-0 shadow-md">
            <span className="text-xl font-bold text-white">
              {user.nickname?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">
              {user.nickname || user.email.split("@")[0]}
            </h2>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <div className="mt-1.5">
              {user.role === "ADMIN" ? (
                <span className="inline-flex items-center gap-1 text-xs bg-amber-500/20 text-amber-600 px-2.5 py-0.5 rounded-full font-medium">
                  <Crown className="h-3 w-3" />
                  管理员
                </span>
              ) : user.isPaid ? (
                <span className="inline-flex items-center text-xs bg-emerald-500/20 text-emerald-600 px-2.5 py-0.5 rounded-full font-medium">
                  付费用户
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-500/20 text-blue-600 px-2.5 py-0.5 rounded-full font-medium">
                  <Clock className="h-3 w-3" />
                  免费试用 · 剩余 {user.trialDaysRemaining} 天
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border p-3 text-center">
          <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-1.5">
            <Calendar className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-lg font-bold">{stats?.totalActivities ?? "-"}</p>
          <p className="text-[10px] text-muted-foreground">总活动</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-3 text-center">
          <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-lg font-bold">{stats?.activeActivities ?? "-"}</p>
          <p className="text-[10px] text-muted-foreground">进行中</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-3 text-center">
          <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-1.5">
            <Users className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-lg font-bold">{stats?.totalParticipants ?? "-"}</p>
          <p className="text-[10px] text-muted-foreground">总参与</p>
        </div>
      </div>

      {/* App Breakdown */}
      {stats && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">我的应用</h3>
          </div>
          {[
            { icon: UserCheck, label: "签到", count: stats.breakdown.checkins, color: "text-emerald-500", bg: "bg-emerald-500/10", href: "/apps?tab=checkins" },
            { icon: Vote, label: "投票", count: stats.breakdown.votes, color: "text-blue-500", bg: "bg-blue-500/10", href: "/apps?tab=votes" },
            { icon: FileText, label: "表单", count: stats.breakdown.forms, color: "text-purple-500", bg: "bg-purple-500/10", href: "/apps?tab=forms" },
            { icon: Gift, label: "抽奖", count: stats.breakdown.lotteries, color: "text-orange-500", bg: "bg-orange-500/10", href: "/apps?tab=lotteries" },
          ].map((item, i, arr) => (
            <Link key={item.label} href={item.href}>
              <div className={`flex items-center gap-3 px-4 py-3 active:bg-secondary transition-colors ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                <div className={`h-8 w-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <span className="flex-1 text-sm">{item.label}</span>
                <span className="text-sm font-semibold text-muted-foreground">{item.count}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Menu */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <Link href="/settings">
          <div className="flex items-center gap-3 px-4 py-3.5 active:bg-secondary transition-colors border-b border-border">
            <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Settings className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="flex-1 text-sm">账户设置</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
        <Link href="/settings">
          <div className="flex items-center gap-3 px-4 py-3.5 active:bg-secondary transition-colors border-b border-border">
            <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="flex-1 text-sm">修改密码</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-secondary transition-colors"
        >
          <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="flex-1 text-sm text-left">退出登录</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Version */}
      <div className="text-center py-4">
        <p className="text-[11px] text-muted-foreground">Murphy v1.0.0</p>
      </div>
    </div>
  );
}
