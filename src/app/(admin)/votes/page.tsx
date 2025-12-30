'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Vote as VoteIcon,
  Monitor,
  Share2,
  ArrowRight,
  Pause,
  Play,
  Copy,
  ExternalLink,
  Users,
  BarChart3,
} from 'lucide-react';

import {
  listVotesAction,
  updateVoteAction,
  deleteVoteAction,
} from '@/server/actions/voteAction';
import { DeleteConfirm } from '@/components/shared';

interface VoteListItem {
  id: string;
  code: string;
  title: string;
  status: string;
  voteType: string;
  options: unknown[];
  totalVotes: number;
}

export default function VotesPage() {
  const [votes, setVotes] = useState<VoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetchVotes = useCallback(async () => {
    const res = await listVotesAction();
    if (res.success && res.data) {
      setVotes(res.data as VoteListItem[]);
    } else {
      toast.error(res.error || '获取投票列表失败');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVotes();
  }, [fetchVotes]);

  const handleStatusChange = useCallback(async (id: string, status: 'active' | 'paused') => {
    setPendingId(id);
    const res = await updateVoteAction(id, { status });
    if (res.success) {
      toast.success(status === 'active' ? '已恢复' : '已暂停');
      fetchVotes();
    } else {
      toast.error(res.error || '操作失败');
    }
    setPendingId(null);
  }, [fetchVotes]);

  const handleDelete = useCallback(async (id: string) => {
    setPendingId(id);
    const res = await deleteVoteAction(id);
    if (res.success) {
      toast.success('已删除');
      fetchVotes();
    } else {
      toast.error(res.error || '删除失败');
    }
    setPendingId(null);
  }, [fetchVotes]);

  const copyLink = useCallback((code: string) => {
    const url = `${window.location.origin}/v/${code}`;
    navigator.clipboard.writeText(url);
    toast.success('链接已复制');
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">投票管理</h1>
          <p className="text-muted-foreground mt-1">
            创建和管理投票活动
          </p>
        </div>
        <Link href="/votes/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            创建投票
          </Button>
        </Link>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VoteIcon className="h-5 w-5" />
            投票列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : votes.length === 0 ? (
            <div className="text-center py-12">
              <VoteIcon className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">暂无投票活动</h3>
              <p className="text-muted-foreground mb-4">
                创建您的第一个投票活动
              </p>
              <Link href="/votes/new">
                <Button>创建投票</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {votes.map((vote) => (
                <div
                  key={vote.id}
                  className="group flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/30 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                      <VoteIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{vote.title}</h4>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            vote.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : vote.status === 'paused'
                              ? 'bg-yellow-500/10 text-yellow-500'
                              : vote.status === 'ended'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-blue-500/10 text-blue-500'
                          }`}
                        >
                          {vote.status === 'active'
                            ? '进行中'
                            : vote.status === 'paused'
                            ? '已暂停'
                            : vote.status === 'ended'
                            ? '已结束'
                            : '草稿'}
                        </span>
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                          {vote.voteType === 'single' ? '单选' : '多选'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-3.5 w-3.5" />
                          {(vote.options as unknown[])?.length ?? 0} 个选项
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {vote.totalVotes ?? 0} 票
                        </span>
                        <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">
                          /v/{vote.code}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="复制链接"
                      onClick={() => copyLink(vote.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Link href={`/v/${vote.code}`} target="_blank">
                      <Button variant="ghost" size="icon" title="手机端预览">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/v/${vote.code}/display`} target="_blank">
                      <Button variant="ghost" size="icon" title="打开大屏">
                        <Monitor className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" title="分享">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    
                    {vote.status === 'active' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="暂停"
                        disabled={pendingId === vote.id}
                        onClick={() => handleStatusChange(vote.id, 'paused')}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : vote.status === 'paused' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="恢复"
                        disabled={pendingId === vote.id}
                        onClick={() => handleStatusChange(vote.id, 'active')}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    ) : null}

                    <DeleteConfirm
                      entityName={vote.title}
                      isLoading={pendingId === vote.id}
                      onConfirm={() => handleDelete(vote.id)}
                    />

                    <Link href={`/votes/${vote.id}`}>
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
