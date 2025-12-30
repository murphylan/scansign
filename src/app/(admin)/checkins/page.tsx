'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Users,
  Monitor,
  Share2,
  ArrowRight,
  Pause,
  Play,
  UserCheck,
  Copy,
  ExternalLink,
} from 'lucide-react';

import {
  listCheckinsAction,
  updateCheckinAction,
  deleteCheckinAction,
} from '@/server/actions/checkinAction';
import { DeleteConfirm } from '@/components/shared';

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
  createdAt: number;
}

export default function CheckinsPage() {
  const [checkins, setCheckins] = useState<CheckinListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetchCheckins = useCallback(async () => {
    const res = await listCheckinsAction();
    if (res.success && res.data) {
      setCheckins(res.data as CheckinListItem[]);
    } else {
      toast.error(res.error || '获取签到列表失败');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  const handleStatusChange = useCallback(async (id: string, status: 'active' | 'paused') => {
    setPendingId(id);
    const res = await updateCheckinAction(id, { status });
    if (res.success) {
      toast.success(status === 'active' ? '已恢复' : '已暂停');
      fetchCheckins();
    } else {
      toast.error(res.error || '操作失败');
    }
    setPendingId(null);
  }, [fetchCheckins]);

  const handleDelete = useCallback(async (id: string) => {
    setPendingId(id);
    const res = await deleteCheckinAction(id);
    if (res.success) {
      toast.success('已删除');
      fetchCheckins();
    } else {
      toast.error(res.error || '删除失败');
    }
    setPendingId(null);
  }, [fetchCheckins]);

  const copyLink = useCallback((code: string) => {
    const url = `${window.location.origin}/c/${code}`;
    navigator.clipboard.writeText(url);
    toast.success('链接已复制');
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">签到管理</h1>
          <p className="text-muted-foreground mt-1">
            创建和管理扫码签到活动
          </p>
        </div>
        <Link href="/checkins/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            创建签到
          </Button>
        </Link>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            签到列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : checkins.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">暂无签到活动</h3>
              <p className="text-muted-foreground mb-4">
                创建您的第一个签到活动
              </p>
              <Link href="/checkins/new">
                <Button>创建签到</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {checkins.map((checkin) => (
                <div
                  key={checkin.id}
                  className="group flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/30 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center shrink-0">
                      <UserCheck className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{checkin.title}</h4>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            checkin.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : checkin.status === 'paused'
                              ? 'bg-yellow-500/10 text-yellow-500'
                              : checkin.status === 'ended'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-blue-500/10 text-blue-500'
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
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {checkin.stats?.total ?? 0} 人签到
                        </span>
                        <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">
                          /{checkin.code}
                        </span>
                        <span>
                          创建于 {new Date(checkin.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="复制链接"
                      onClick={() => copyLink(checkin.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Link href={`/c/${checkin.code}`} target="_blank">
                      <Button variant="ghost" size="icon" title="手机端预览">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/c/${checkin.code}/display`} target="_blank">
                      <Button variant="ghost" size="icon" title="打开大屏">
                        <Monitor className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" title="分享">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    
                    {checkin.status === 'active' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="暂停"
                        disabled={pendingId === checkin.id}
                        onClick={() => handleStatusChange(checkin.id, 'paused')}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : checkin.status === 'paused' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="恢复"
                        disabled={pendingId === checkin.id}
                        onClick={() => handleStatusChange(checkin.id, 'active')}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    ) : null}

                    <DeleteConfirm
                      entityName={checkin.title}
                      isLoading={pendingId === checkin.id}
                      onConfirm={() => handleDelete(checkin.id)}
                    />

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
