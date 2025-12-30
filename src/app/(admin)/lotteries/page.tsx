'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Gift,
  Monitor,
  Share2,
  ArrowRight,
  Pause,
  Play,
  Copy,
  ExternalLink,
  Trophy,
  Users,
} from 'lucide-react';

import {
  listLotteriesAction,
  updateLotteryAction,
  deleteLotteryAction,
} from '@/server/actions/lotteryAction';
import { DeleteConfirm } from '@/components/shared';

interface LotteryListItem {
  id: string;
  code: string;
  title: string;
  status: string;
  config?: {
    mode?: string;
  };
  prizes?: unknown[];
  participantCount: number;
}

export default function LotteriesPage() {
  const [lotteries, setLotteries] = useState<LotteryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetchLotteries = useCallback(async () => {
    const res = await listLotteriesAction();
    if (res.success && res.data) {
      setLotteries(res.data as LotteryListItem[]);
    } else {
      toast.error(res.error || '获取抽奖列表失败');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLotteries();
  }, [fetchLotteries]);

  const handleStatusChange = useCallback(async (id: string, status: 'active' | 'paused') => {
    setPendingId(id);
    const res = await updateLotteryAction(id, { status });
    if (res.success) {
      toast.success(status === 'active' ? '已恢复' : '已暂停');
      fetchLotteries();
    } else {
      toast.error(res.error || '操作失败');
    }
    setPendingId(null);
  }, [fetchLotteries]);

  const handleDelete = useCallback(async (id: string) => {
    setPendingId(id);
    const res = await deleteLotteryAction(id);
    if (res.success) {
      toast.success('已删除');
      fetchLotteries();
    } else {
      toast.error(res.error || '删除失败');
    }
    setPendingId(null);
  }, [fetchLotteries]);

  const copyLink = useCallback((code: string) => {
    const url = `${window.location.origin}/l/${code}`;
    navigator.clipboard.writeText(url);
    toast.success('链接已复制');
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">抽奖管理</h1>
          <p className="text-muted-foreground mt-1">
            创建和管理抽奖活动
          </p>
        </div>
        <Link href="/lotteries/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            创建抽奖
          </Button>
        </Link>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            抽奖列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : lotteries.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">暂无抽奖活动</h3>
              <p className="text-muted-foreground mb-4">
                创建您的第一个抽奖活动
              </p>
              <Link href="/lotteries/new">
                <Button>创建抽奖</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {lotteries.map((lottery) => (
                <div
                  key={lottery.id}
                  className="group flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/30 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0">
                      <Gift className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{lottery.title}</h4>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            lottery.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : lottery.status === 'paused'
                              ? 'bg-yellow-500/10 text-yellow-500'
                              : lottery.status === 'ended'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-blue-500/10 text-blue-500'
                          }`}
                        >
                          {lottery.status === 'active'
                            ? '进行中'
                            : lottery.status === 'paused'
                            ? '已暂停'
                            : lottery.status === 'ended'
                            ? '已结束'
                            : '草稿'}
                        </span>
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                          {lottery.config?.mode === 'wheel' ? '转盘' : lottery.config?.mode === 'slot' ? '老虎机' : lottery.config?.mode}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3.5 w-3.5" />
                          {(lottery.prizes as unknown[])?.length ?? 0} 个奖品
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {lottery.participantCount ?? 0} 人参与
                        </span>
                        <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">
                          /l/{lottery.code}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="复制链接"
                      onClick={() => copyLink(lottery.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Link href={`/l/${lottery.code}`} target="_blank">
                      <Button variant="ghost" size="icon" title="手机端预览">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/l/${lottery.code}/display`} target="_blank">
                      <Button variant="ghost" size="icon" title="打开大屏">
                        <Monitor className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" title="分享">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    
                    {lottery.status === 'active' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="暂停"
                        disabled={pendingId === lottery.id}
                        onClick={() => handleStatusChange(lottery.id, 'paused')}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : lottery.status === 'paused' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="恢复"
                        disabled={pendingId === lottery.id}
                        onClick={() => handleStatusChange(lottery.id, 'active')}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    ) : null}

                    <DeleteConfirm
                      entityName={lottery.title}
                      isLoading={pendingId === lottery.id}
                      onConfirm={() => handleDelete(lottery.id)}
                    />

                    <Link href={`/lotteries/${lottery.id}`}>
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
