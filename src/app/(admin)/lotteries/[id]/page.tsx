'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
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
import { Lottery, WinRecord } from '@/types/lottery';
import { LotteryWheel } from '@/components/display/lottery-wheel';

export default function LotteryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [lottery, setLottery] = useState<Lottery | null>(null);
  const [records, setRecords] = useState<WinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  async function fetchLottery() {
    try {
      const res = await fetch(`/api/lotteries/${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setLottery(data.data);
      }
    } catch {
      console.error('Failed to fetch lottery');
    }
  }

  async function fetchRecords() {
    try {
      const res = await fetch(`/api/lotteries/${resolvedParams.id}/records?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.data?.records || []);
      }
    } catch {
      console.error('Failed to fetch records');
    }
  }

  async function fetchQRCode() {
    if (!lottery) return;
    try {
      const res = await fetch(`/api/lotteries/${resolvedParams.id}/qrcode`);
      if (res.ok) {
        const data = await res.json();
        setQrCodeUrl(data.data?.qrCodeUrl);
      }
    } catch {
      console.error('Failed to fetch QR code');
    }
  }

  useEffect(() => {
    Promise.all([fetchLottery(), fetchRecords()]).finally(() => {
      setLoading(false);
    });
  }, [resolvedParams.id]);

  useEffect(() => {
    if (lottery) {
      fetchQRCode();
    }
  }, [lottery]);

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
  }, [lottery, resolvedParams.id]);

  async function handleStatusChange(status: 'active' | 'paused') {
    try {
      const res = await fetch(`/api/lotteries/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchLottery();
      }
    } catch {
      console.error('Failed to update status');
    }
  }

  async function handleReset() {
    if (!confirm('确定要重置抽奖吗？所有中奖记录将被清空，奖品数量将恢复。')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/lotteries/${resolvedParams.id}?action=reset`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchLottery();
        fetchRecords();
      }
    } catch {
      console.error('Failed to reset lottery');
    }
  }

  function copyLink() {
    if (!lottery) return;
    const url = `${window.location.origin}/l/${lottery.code}`;
    navigator.clipboard.writeText(url);
  }

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
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/lotteries">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{lottery.title}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                {lottery.config.mode === 'wheel' ? '转盘' : lottery.config.mode === 'slot' ? '老虎机' : lottery.config.mode}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              {lottery.description || '无描述'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            className="text-destructive hover:text-destructive"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            重置
          </Button>
          {lottery.status === 'active' ? (
            <Button
              variant="outline"
              onClick={() => handleStatusChange('paused')}
            >
              <Pause className="h-4 w-4 mr-2" />
              暂停
            </Button>
          ) : lottery.status === 'paused' ? (
            <Button onClick={() => handleStatusChange('active')}>
              <Play className="h-4 w-4 mr-2" />
              恢复
            </Button>
          ) : null}
          <Link href={`/lotteries/${resolvedParams.id}/settings`}>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              设置
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-orange-500/10 to-red-600/10 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">中奖人数</p>
                <p className="text-3xl font-bold mt-1">{lottery.stats.winnersCount}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">参与人数</p>
                <p className="text-3xl font-bold mt-1">{lottery.stats.participantCount}</p>
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
              {lottery.config.prizes.map((prize) => (
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

