'use client';

import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!vote) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">投票不存在</h2>
        <Link href="/votes">
          <Button>返回列表</Button>
        </Link>
      </div>
    );
  }

  const mobileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/v/${vote.code}`;
  const displayUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/v/${vote.code}/display`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/votes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{vote.title}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  vote.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : vote.status === 'paused'
                    ? 'bg-yellow-500/10 text-yellow-500'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {vote.status === 'active'
                  ? '进行中'
                  : vote.status === 'paused'
                  ? '已暂停'
                  : '已结束'}
              </span>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                {vote.config?.voteType === 'single' ? '单选' : '多选'}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              {vote.description || '无描述'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ConfirmDialog
            trigger={
              <Button variant="outline" className="text-destructive hover:text-destructive">
                <RotateCcw className="h-4 w-4 mr-2" />
                重置结果
              </Button>
            }
            title="重置投票结果"
            description="确定要重置投票结果吗？所有投票数据将被清空，此操作无法撤销。"
            confirmText="重置"
            variant="danger"
            onConfirm={handleReset}
          />
          {vote.status === 'active' ? (
            <Button
              variant="outline"
              onClick={() => handleStatusChange('paused')}
            >
              <Pause className="h-4 w-4 mr-2" />
              暂停
            </Button>
          ) : vote.status === 'paused' ? (
            <Button onClick={() => handleStatusChange('active')}>
              <Play className="h-4 w-4 mr-2" />
              恢复
            </Button>
          ) : null}
          <Link href={`/votes/${resolvedParams.id}/settings`}>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              设置
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-linear-to-br from-blue-500/10 to-indigo-600/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总票数</p>
                <p className="text-3xl font-bold mt-1">{vote.stats?.totalVotes ?? 0}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-emerald-500/10 to-green-600/10 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">参与人数</p>
                <p className="text-3xl font-bold mt-1">{vote.stats?.participantCount ?? 0}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-emerald-500" />
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
                  /v/{vote.code}
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
              投票二维码
            </CardTitle>
            <CardDescription>扫码参与投票</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {qrCodeUrl ? (
              <>
                <div className="p-4 bg-white rounded-xl">
                  <img src={qrCodeUrl} alt="投票二维码" className="w-48 h-48" />
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  扫码或访问 <code className="bg-secondary px-1 rounded">/v/{vote.code}</code>
                </p>
                <a href={qrCodeUrl} download={`vote-${vote.code}.png`}>
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

        {/* 投票结果 */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <VoteIcon className="h-5 w-5" />
                投票结果
              </CardTitle>
              <CardDescription>实时投票数据</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchVote}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {(vote.config?.options?.length ?? 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无选项
              </div>
            ) : (
              <div className="bg-secondary/30 rounded-xl p-6">
                <BarChart
                  options={vote.config.options}
                  totalVotes={vote.stats?.totalVotes ?? 0}
                  showPercentage
                  showCount
                  animation
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
