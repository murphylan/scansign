'use client';

import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!lottery) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">抽奖不存在</h2>
        <Link href="/lotteries">
          <Button>返回列表</Button>
        </Link>
      </div>
    );
  }

  const mobileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/l/${lottery.code}`;
  const displayUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/l/${lottery.code}/display`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/lotteries">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{lottery.title}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                  lottery.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : lottery.status === 'paused'
                    ? 'bg-yellow-500/10 text-yellow-500'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {lottery.status === 'active'
                  ? '进行中'
                  : lottery.status === 'paused'
                  ? '已暂停'
                  : '已结束'}
              </span>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded shrink-0">
                {lottery.config?.mode === 'wheel' ? '转盘' : lottery.config?.mode === 'slot' ? '老虎机' : lottery.config?.mode}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              {lottery.description || '无描述'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pl-0 sm:pl-14 flex-wrap">
          <ConfirmDialog
            trigger={
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <RotateCcw className="h-4 w-4 mr-1.5" />
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('paused')}
            >
              <Pause className="h-4 w-4 mr-1.5" />
              暂停
            </Button>
          ) : lottery.status === 'paused' ? (
            <Button size="sm" onClick={() => handleStatusChange('active')}>
              <Play className="h-4 w-4 mr-1.5" />
              恢复
            </Button>
          ) : null}
          <Link href={`/lotteries/${resolvedParams.id}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1.5" />
              设置
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="bg-linear-to-br from-orange-500/10 to-red-600/10 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">中奖人数</p>
                <p className="text-3xl font-bold mt-1">{lottery.stats?.winnersCount ?? 0}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-blue-500/10 to-indigo-600/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">参与人数</p>
                <p className="text-3xl font-bold mt-1">{lottery.stats?.participantCount ?? 0}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">手机端链接</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-secondary px-2 py-1 rounded truncate">
                  /l/{lottery.code}
                </code>
                <Button variant="ghost" size="icon" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Link href={mobileUrl} target="_blank">
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">大屏展示</p>
              <Link href={displayUrl} target="_blank">
                <Button className="w-full gap-2">
                  <Monitor className="h-4 w-4" />
                  打开大屏
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 二维码 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              抽奖二维码
            </CardTitle>
            <CardDescription>扫码参与抽奖</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {qrCodeUrl ? (
              <>
                <div className="p-4 bg-white rounded-xl">
                  <img src={qrCodeUrl} alt="抽奖二维码" className="w-48 h-48" />
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  扫码或访问 <code className="bg-secondary px-1 rounded">/l/{lottery.code}</code>
                </p>
                <a href={qrCodeUrl} download={`lottery-${lottery.code}.png`}>
                  <Button variant="outline" size="sm" className="mt-3 gap-2">
                    <Download className="h-4 w-4" />
                    下载二维码
                  </Button>
                </a>
              </>
            ) : (
              <div className="h-48 w-48 bg-secondary rounded-xl flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 奖品列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              奖品列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(lottery.config?.prizes ?? []).map((prize) => (
                <div
                  key={prize.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div>
                    <p className="font-medium">{prize.name}</p>
                    <p className="text-xs text-muted-foreground">
                      概率: {prize.probability}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {prize.remaining}/{prize.count}
                    </p>
                    <p className="text-xs text-muted-foreground">剩余</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 中奖记录 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                中奖记录
              </CardTitle>
              <CardDescription>最近中奖用户</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchRecords}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无中奖记录
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium">
                        {record.phone || '匿名用户'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.drawnAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500">
                        🎉 {record.prizeName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
