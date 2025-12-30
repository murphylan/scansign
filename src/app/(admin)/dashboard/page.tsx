'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Share2,
} from 'lucide-react';

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
  {
    name: '签到',
    description: '扫码签到，实时统计',
    href: '/checkins/new',
    icon: UserCheck,
    color: 'from-emerald-500 to-green-600',
    available: true,
  },
  {
    name: '投票',
    description: '单选多选，实时结果',
    href: '/votes/new',
    icon: Vote,
    color: 'from-blue-500 to-indigo-600',
    available: false,
  },
  {
    name: '抽奖',
    description: '多种模式，精彩互动',
    href: '/lotteries/new',
    icon: Gift,
    color: 'from-orange-500 to-red-600',
    available: false,
  },
  {
    name: '表单',
    description: '信息收集，数据导出',
    href: '/forms/new',
    icon: FileText,
    color: 'from-purple-500 to-pink-600',
    available: false,
  },
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">控制台</h1>
        <p className="text-muted-foreground mt-1">
          欢迎使用 Murphy 互动工具集
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-linear-to-br from-emerald-500/10 to-green-600/10 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总签到人数</p>
                <p className="text-3xl font-bold mt-1">{totalParticipants}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-blue-500/10 to-indigo-600/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">进行中活动</p>
                <p className="text-3xl font-bold mt-1">{activeCount}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-purple-500/10 to-pink-600/10 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总活动数</p>
                <p className="text-3xl font-bold mt-1">{recentCheckins.length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Create */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            快速创建
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickCreateItems.map((item) => (
              <Link
                key={item.name}
                href={item.available ? item.href : '#'}
                className={`group relative overflow-hidden rounded-xl border border-border p-4 transition-all duration-300 ${
                  item.available
                    ? 'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 cursor-pointer'
                    : 'opacity-60 cursor-not-allowed'
                }`}
                onClick={(e) => !item.available && e.preventDefault()}
              >
                <div
                  className={`absolute inset-0 bg-linear-to-br ${item.color} opacity-0 group-hover:opacity-5 transition-opacity`}
                />
                <div className="relative">
                  <div
                    className={`h-10 w-10 rounded-lg bg-linear-to-br ${item.color} flex items-center justify-center mb-3`}
                  >
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.available ? item.description : '即将推出'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>最近创建</CardTitle>
          <Link href="/checkins">
            <Button variant="ghost" size="sm" className="gap-1">
              查看全部 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : recentCheckins.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">暂无签到活动</p>
              <Link href="/checkins/new">
                <Button className="mt-4">创建第一个签到</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCheckins.map((checkin) => (
                <div
                  key={checkin.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium">{checkin.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {checkin.stats?.total ?? 0} 人
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            checkin.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : checkin.status === 'paused'
                              ? 'bg-yellow-500/10 text-yellow-500'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {checkin.status === 'active'
                            ? '进行中'
                            : checkin.status === 'paused'
                            ? '已暂停'
                            : checkin.status === 'ended'
                            ? '已结束'
                            : '草稿'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/c/${checkin.code}/display`} target="_blank">
                      <Button variant="ghost" size="icon" title="打开大屏">
                        <Monitor className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" title="分享">
                      <Share2 className="h-4 w-4" />
                    </Button>
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
        </CardContent>
      </Card>
    </div>
  );
}
