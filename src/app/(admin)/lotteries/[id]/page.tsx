'use client';

import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Gift,
  Trophy,
  Users,
  Monitor,
  Copy,
  ExternalLink,
  Settings,
  QrCode,
  Download,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/shared';

import {
  getLotteryAction,
  getLotteryWinnersAction,
  updateLotteryAction,
} from '@/server/actions/lotteryAction';
import { copyToClipboard } from '@/lib/utils/clipboard';

interface LotteryData {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  config: {
    mode: string;
    prizes: Array<{ id: string; name: string; count: number; remaining: number; probability: number }>;
  };
  stats: {
    winnersCount: number;
    participantCount: number;
  };
}

interface WinRecord {
  id: string;
  phone: string | null;
  prizeName: string;
  drawnAt: number;
}

export default function LotteryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [lottery, setLottery] = useState<LotteryData | null>(null);
  const [records, setRecords] = useState<WinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const fetchLottery = useCallback(async () => {
    const res = await getLotteryAction(resolvedParams.id);
    if (res.success && res.data) {
      setLottery(res.data as LotteryData);
    }
  }, [resolvedParams.id]);

  const fetchRecords = useCallback(async () => {
    const res = await getLotteryWinnersAction(resolvedParams.id);
    if (res.success && res.data) {
      setRecords(res.data as WinRecord[]);
    }
  }, [resolvedParams.id]);

  const generateQRCode = useCallback(async (code: string) => {
    try {
      const url = `${window.location.origin}/l/${code}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
      setQrCodeUrl(qrUrl);
    } catch {
      console.error('Failed to generate QR code');
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchLottery(), fetchRecords()]).finally(() => {
      setLoading(false);
    });
  }, [fetchLottery, fetchRecords]);

  useEffect(() => {
    if (lottery?.code) {
      generateQRCode(lottery.code);
    }
  }, [lottery?.code, generateQRCode]);

  // SSE 实时更新
  useEffect(() => {
    if (!lottery) return;

    const eventSource = new EventSource(`/api/lotteries/${resolvedParams.id}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'win' || data.type === 'reset') {
          fetchLottery();
          fetchRecords();
        }
      } catch {
        // ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, [lottery, resolvedParams.id, fetchLottery, fetchRecords]);

  const handleStatusChange = useCallback(async (status: 'active' | 'paused') => {
    const res = await updateLotteryAction(resolvedParams.id, { status });
    if (res.success) {
      toast.success(status === 'active' ? '已恢复' : '已暂停');
      fetchLottery();
    } else {
      toast.error(res.error || '操作失败');
    }
  }, [resolvedParams.id, fetchLottery]);

  const handleReset = useCallback(async () => {
    const res = await updateLotteryAction(resolvedParams.id, { reset: true });
    if (res.success) {
      toast.success('已重置');
      fetchLottery();
      fetchRecords();
    } else {
      toast.error(res.error || '重置失败');
    }
  }, [resolvedParams.id, fetchLottery, fetchRecords]);

  const copyLink = useCallback(async () => {
    if (!lottery) return;
    const url = `${window.location.origin}/l/${lottery.code}`;
    const success = await copyToClipboard(url);
    if (success) {
      toast.success('链接已复制');
    } else {
      toast.error('复制失败，请手动复制');
    }
  }, [lottery]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!lottery) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-xl font-semibold">抽奖不存在</h2>
        <Link href="/lotteries">
          <Button>返回列表</Button>
        </Link>
      </div>
    );
  }

  const mobileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/l/${lottery.code}`;
  const displayUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/l/${lottery.code}/display`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Link href="/lotteries">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{lottery.title}</h1>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  lottery.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : lottery.status === 'paused'
                    ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {lottery.status === 'active'
                  ? '进行中'
                  : lottery.status === 'paused'
                  ? '已暂停'
                  : '已结束'}
              </span>
              <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {lottery.config?.mode === 'wheel' ? '转盘' : lottery.config?.mode === 'slot' ? '老虎机' : lottery.config?.mode}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {lottery.description || '无描述'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-14">
          <ConfirmDialog
            trigger={
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <RotateCcw className="mr-1.5 h-4 w-4" />
                重置
              </Button>
            }
            title="重置抽奖"
            description="确定要重置抽奖吗？所有中奖记录将被清空，奖品数量将恢复。此操作无法撤销。"
            confirmText="重置"
            variant="danger"
            onConfirm={handleReset}
          />
          {lottery.status === 'active' ? (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange('paused')}>
              <Pause className="mr-1.5 h-4 w-4" />
              暂停
            </Button>
          ) : lottery.status === 'paused' ? (
            <Button size="sm" onClick={() => handleStatusChange('active')}>
              <Play className="mr-1.5 h-4 w-4" />
              恢复
            </Button>
          ) : null}
          <Link href={`/lotteries/${resolvedParams.id}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="mr-1.5 h-4 w-4" />
              设置
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats & Links */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* 中奖人数 */}
        <div className="flex items-center justify-between rounded-2xl bg-cell p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">中奖人数</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{lottery.stats?.winnersCount ?? 0}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50">
            <Trophy className="h-6 w-6 text-amber-600" strokeWidth={1.9} />
          </div>
        </div>

        {/* 参与人数 */}
        <div className="flex items-center justify-between rounded-2xl bg-cell p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">参与人数</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{lottery.stats?.participantCount ?? 0}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <Users className="h-6 w-6 text-blue-600" strokeWidth={1.9} />
          </div>
        </div>

        {/* 手机端链接 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm">
          <p className="mb-2 text-sm font-medium text-muted-foreground">手机端链接</p>
          <div className="flex items-center gap-1.5">
            <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
              /l/{lottery.code}
            </code>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyLink}>
              <Copy className="h-4 w-4" />
            </Button>
            <Link href={mobileUrl} target="_blank">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* 大屏展示 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm">
          <p className="mb-2 text-sm font-medium text-muted-foreground">大屏展示</p>
          <Link href={displayUrl} target="_blank">
            <Button className="w-full gap-2">
              <Monitor className="h-4 w-4" />
              打开大屏
            </Button>
          </Link>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 二维码 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
              <QrCode className="h-[18px] w-[18px] text-amber-600" strokeWidth={1.9} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">抽奖二维码</h2>
              <p className="text-xs text-muted-foreground">扫码参与抽奖</p>
            </div>
          </div>
          <div className="flex flex-col items-center">
            {qrCodeUrl ? (
              <>
                <div className="rounded-xl bg-white p-4">
                  <img src={qrCodeUrl} alt="抽奖二维码" className="h-48 w-48" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  扫码或访问 <code className="rounded bg-muted px-1">/l/{lottery.code}</code>
                </p>
                <a href={qrCodeUrl} download={`lottery-${lottery.code}.png`}>
                  <Button variant="outline" size="sm" className="mt-3 gap-2">
                    <Download className="h-4 w-4" />
                    下载二维码
                  </Button>
                </a>
              </>
            ) : (
              <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-muted">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        </div>

        {/* 奖品列表 */}
        <div className="overflow-hidden rounded-2xl bg-cell shadow-sm [&>*:last-child]:after:hidden">
          <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
              <Gift className="h-[18px] w-[18px] text-amber-600" strokeWidth={1.9} />
            </div>
            <h2 className="text-[15px] font-semibold text-foreground">奖品列表</h2>
          </div>
          {(lottery.config?.prizes ?? []).length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">暂无奖品</p>
          ) : (
            (lottery.config?.prizes ?? []).map((prize) => (
              <div
                key={prize.id}
                className="weui-hairline-bottom weui-hairline-inset relative flex items-center justify-between gap-2 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{prize.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">概率 {prize.probability}%</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums text-foreground">
                    {prize.remaining}/{prize.count}
                  </p>
                  <p className="text-xs text-muted-foreground">剩余</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 中奖记录 */}
        <div className="overflow-hidden rounded-2xl bg-cell shadow-sm">
          <div className="flex items-center justify-between px-4 pb-3 pt-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                <Trophy className="h-[18px] w-[18px] text-amber-600" strokeWidth={1.9} />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">中奖记录</h2>
                <p className="text-xs text-muted-foreground">最近中奖用户</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchRecords}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          {records.length === 0 ? (
            <div className="px-4 pb-4 text-center">
              <p className="text-sm text-muted-foreground">暂无中奖记录</p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto [&>*:last-child]:after:hidden">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="weui-hairline-bottom weui-hairline-inset relative flex items-center justify-between gap-2 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {record.phone || '匿名用户'}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(record.drawnAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600">
                    {record.prizeName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
