'use client';

import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Vote as VoteIcon,
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
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart } from '@/components/display/vote-charts';
import { ConfirmDialog } from '@/components/shared';

import {
  getVoteAction,
  updateVoteAction,
} from '@/server/actions/voteAction';
import { copyToClipboard } from '@/lib/utils/clipboard';

interface VoteData {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  config: {
    voteType: string;
    options: Array<{ id: string; title: string; count: number }>;
  };
  stats: {
    totalVotes: number;
    participantCount: number;
  };
}

export default function VoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [vote, setVote] = useState<VoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const fetchVote = useCallback(async () => {
    const res = await getVoteAction(resolvedParams.id);
    if (res.success && res.data) {
      setVote(res.data as VoteData);
    }
  }, [resolvedParams.id]);

  const generateQRCode = useCallback(async (code: string) => {
    try {
      const url = `${window.location.origin}/v/${code}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
      setQrCodeUrl(qrUrl);
    } catch {
      console.error('Failed to generate QR code');
    }
  }, []);

  useEffect(() => {
    fetchVote().finally(() => setLoading(false));
  }, [fetchVote]);

  useEffect(() => {
    if (vote?.code) {
      generateQRCode(vote.code);
    }
  }, [vote?.code, generateQRCode]);

  // SSE 实时更新
  useEffect(() => {
    if (!vote) return;

    const eventSource = new EventSource(`/api/votes/${resolvedParams.id}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new' || data.type === 'update' || data.type === 'reset') {
          if (data.options && data.stats) {
            setVote((prev) => prev ? {
              ...prev,
              config: { ...prev.config, options: data.options },
              stats: data.stats,
            } : prev);
          }
        }
      } catch {
        // ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, [vote, resolvedParams.id]);

  const handleStatusChange = useCallback(async (status: 'active' | 'paused') => {
    const res = await updateVoteAction(resolvedParams.id, { status });
    if (res.success) {
      toast.success(status === 'active' ? '已恢复' : '已暂停');
      fetchVote();
    } else {
      toast.error(res.error || '操作失败');
    }
  }, [resolvedParams.id, fetchVote]);

  const handleReset = useCallback(async () => {
    const res = await updateVoteAction(resolvedParams.id, { reset: true });
    if (res.success) {
      toast.success('已重置');
      fetchVote();
    } else {
      toast.error(res.error || '重置失败');
    }
  }, [resolvedParams.id, fetchVote]);

  const copyLink = useCallback(async () => {
    if (!vote) return;
    const url = `${window.location.origin}/v/${vote.code}`;
    const success = await copyToClipboard(url);
    if (success) {
      toast.success('链接已复制');
    } else {
      toast.error('复制失败，请手动复制');
    }
  }, [vote]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!vote) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-xl font-semibold">投票不存在</h2>
        <Link href="/votes">
          <Button>返回列表</Button>
        </Link>
      </div>
    );
  }

  const mobileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/v/${vote.code}`;
  const displayUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/v/${vote.code}/display`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/votes">
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold tracking-tight">{vote.title}</h1>
            <span
              className={cn(
                'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                vote.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : vote.status === 'paused'
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {vote.status === 'active'
                ? '进行中'
                : vote.status === 'paused'
                ? '已暂停'
                : '已结束'}
            </span>
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {vote.config?.voteType === 'single' ? '单选' : '多选'}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {vote.description || '无描述'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  重置
                </Button>
              }
              title="重置投票结果"
              description="确定要重置投票结果吗？所有投票数据将被清空，此操作无法撤销。"
              confirmText="重置"
              variant="danger"
              onConfirm={handleReset}
            />
            {vote.status === 'active' ? (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange('paused')}>
                <Pause className="mr-1.5 h-4 w-4" />
                暂停
              </Button>
            ) : vote.status === 'paused' ? (
              <Button size="sm" onClick={() => handleStatusChange('active')}>
                <Play className="mr-1.5 h-4 w-4" />
                恢复
              </Button>
            ) : null}
            <Link href={`/votes/${resolvedParams.id}/settings`}>
              <Button variant="outline" size="sm">
                <Settings className="mr-1.5 h-4 w-4" />
                设置
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between rounded-2xl bg-cell p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">总票数</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{vote.stats?.totalVotes ?? 0}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
            <BarChart3 className="h-6 w-6 text-blue-600" strokeWidth={1.9} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-cell p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">参与人数</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{vote.stats?.participantCount ?? 0}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <Users className="h-6 w-6 text-emerald-600" strokeWidth={1.9} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl bg-cell p-4 shadow-sm">
        <h2 className="mb-3 text-[15px] font-semibold text-foreground">快速操作</h2>
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">手机端链接</p>
            <div className="flex items-center gap-1 rounded-xl bg-muted/60 px-3 py-2">
              <code className="flex-1 truncate text-xs">/v/{vote.code}</code>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyLink}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Link href={mobileUrl} target="_blank">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
          <Link href={displayUrl} target="_blank" className="block">
            <Button className="w-full gap-2">
              <Monitor className="h-4 w-4" />
              打开大屏
            </Button>
          </Link>
        </div>
      </div>

      {/* QR Code + Results */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* 二维码 */}
        <div className="rounded-2xl bg-cell p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <QrCode className="h-[18px] w-[18px] text-blue-600" strokeWidth={1.9} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">投票二维码</h2>
              <p className="text-xs text-muted-foreground">扫码参与投票</p>
            </div>
          </div>
          <div className="flex flex-col items-center">
            {qrCodeUrl ? (
              <>
                <div className="rounded-2xl bg-white p-4">
                  <img src={qrCodeUrl} alt="投票二维码" className="h-48 w-48" />
                </div>
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  扫码或访问{' '}
                  <code className="rounded bg-muted px-1">/v/{vote.code}</code>
                </p>
                <a href={qrCodeUrl} download={`vote-${vote.code}.png`}>
                  <Button variant="outline" size="sm" className="mt-3 gap-2">
                    <Download className="h-4 w-4" />
                    下载二维码
                  </Button>
                </a>
              </>
            ) : (
              <div className="flex h-48 w-48 items-center justify-center rounded-2xl bg-muted">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        </div>

        {/* 投票结果 */}
        <div className="overflow-hidden rounded-2xl bg-cell shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                <VoteIcon className="h-[18px] w-[18px] text-blue-600" strokeWidth={1.9} />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">投票结果</h2>
                <p className="text-xs text-muted-foreground">实时投票数据</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchVote}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4">
            {(vote.config?.options?.length ?? 0) === 0 ? (
              <div className="py-10 text-center">
                <BarChart3 className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">暂无选项</p>
              </div>
            ) : (
              <div className="rounded-xl bg-muted/40 p-4">
                <BarChart
                  options={vote.config.options}
                  totalVotes={vote.stats?.totalVotes ?? 0}
                  showPercentage
                  showCount
                  animation
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
