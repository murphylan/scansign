'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  UserCheck,
  Vote,
  Gift,
  FileText,
  Plus,
  ArrowRight,
  Users,
  Calendar,
  TrendingUp,
  Monitor,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { listCheckinsAction } from '@/server/actions/checkinAction';

// 页面内部使用的类型
interface CheckinListItem {
  id: string;
  code: string;
  title: string;
  status: string;
  stats: {
    total: number;
    today: number;
  };
}

const quickCreateItems = [
  { name: '签到', description: '扫码签到，实时统计', href: '/checkins/new', icon: UserCheck, tint: 'bg-emerald-50', fg: 'text-emerald-600' },
  { name: '投票', description: '单选多选，实时结果', href: '/votes/new', icon: Vote, tint: 'bg-blue-50', fg: 'text-blue-600' },
  { name: '抽奖', description: '多种模式，精彩互动', href: '/lotteries/new', icon: Gift, tint: 'bg-amber-50', fg: 'text-amber-600' },
  { name: '表单', description: '信息收集，数据导出', href: '/forms/new', icon: FileText, tint: 'bg-violet-50', fg: 'text-violet-600' },
];

export default function DashboardPage() {
  const [recentCheckins, setRecentCheckins] = useState<CheckinListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentCheckins = useCallback(async () => {
    const res = await listCheckinsAction();
    if (res.success && res.data) {
      setRecentCheckins((res.data as CheckinListItem[]).slice(0, 5));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecentCheckins();
  }, [fetchRecentCheckins]);

  const totalParticipants = recentCheckins.reduce((sum, c) => sum + (c.stats?.total ?? 0), 0);
  const activeCount = recentCheckins.filter(c => c.status === 'active').length;

  const stats = [
    { label: '总签到人数', value: totalParticipants, icon: Users, tint: 'bg-emerald-50', fg: 'text-emerald-600' },
    { label: '进行中活动', value: activeCount, icon: TrendingUp, tint: 'bg-blue-50', fg: 'text-blue-600' },
    { label: '总活动数', value: recentCheckins.length, icon: Calendar, tint: 'bg-violet-50', fg: 'text-violet-600' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">首页</h1>
        <p className="mt-1 text-sm text-muted-foreground">欢迎使用 Sign</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between rounded-2xl bg-cell p-4 shadow-sm">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{s.value}</p>
            </div>
            <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', s.tint)}>
              <s.icon className={cn('h-6 w-6', s.fg)} strokeWidth={1.9} />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Create */}
      <div className="rounded-2xl bg-cell p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-semibold text-foreground">
          <Plus className="h-4 w-4" />
          快速创建
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickCreateItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-xl bg-muted/40 p-3.5 transition-colors active:bg-muted lg:flex-col lg:items-start"
            >
              <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', item.tint)}>
                <item.icon className={cn('h-[22px] w-[22px]', item.fg)} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="rounded-2xl bg-cell shadow-sm">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-[15px] font-semibold text-foreground">最近创建</h2>
          <Link href="/checkins" className="flex items-center gap-0.5 text-xs text-muted-foreground">
            查看全部 <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : recentCheckins.length === 0 ? (
          <div className="py-10 text-center">
            <UserCheck className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">暂无签到活动</p>
            <Link href="/checkins/new">
              <Button className="mt-4">创建第一个签到</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-2 [&>*:last-child]:after:hidden">
            {recentCheckins.map((checkin) => (
              <div
                key={checkin.id}
                className="weui-hairline-bottom weui-hairline-inset relative flex items-center justify-between gap-2 px-4 py-3"
              >
                <Link href={`/checkins/${checkin.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                    <UserCheck className="h-5 w-5 text-emerald-600" strokeWidth={1.9} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-medium">{checkin.title}</h4>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {checkin.stats?.total ?? 0} 人
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                          checkin.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : checkin.status === 'paused'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {checkin.status === 'active' ? '进行中' : checkin.status === 'paused' ? '已暂停' : checkin.status === 'ended' ? '已结束' : '草稿'}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <Link href={`/c/${checkin.code}/display`} target="_blank" className="hidden sm:block">
                    <Button variant="ghost" size="icon" title="打开大屏">
                      <Monitor className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/checkins/${checkin.id}`}>
                    <Button variant="ghost" size="icon" title="详情">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
