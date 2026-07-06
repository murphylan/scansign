'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MobilePage,
  NavBar,
  SectionTitle,
  BottomAction,
  LoadingScreen,
  Cells,
  Field,
  ResultScreen,
  bareInputClass,
} from '@/components/mobile';
import { useSSE } from '@/hooks/use-sse';
import {
  Vote as VoteIcon,
  Phone,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart } from '@/components/display/vote-charts';

import {
  getVoteByCodeAction,
  checkVotePhoneAction,
  submitVoteAction,
} from '@/server/actions/publicAction';
import { getDeviceId } from '@/lib/utils/fingerprint';

interface VoteOption {
  id: string;
  title: string;
  description?: string;
  count: number;
}

interface VoteData {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  config: {
    voteType: string;
    minSelect?: number;
    maxSelect?: number;
    requirePhone?: boolean;
    allowChange?: boolean;
    options: VoteOption[];
    showResult?: {
      realtime?: boolean;
      afterVote?: boolean;
    };
  };
  stats: {
    totalVotes: number;
    participantCount: number;
  };
}

export default function VoteMobilePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vote, setVote] = useState<VoteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 表单状态
  const [phone, setPhone] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  // 已投票状态
  const [hasVoted, setHasVoted] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);

  // 成功状态
  const [success, setSuccess] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultOptions, setResultOptions] = useState<VoteOption[]>([]);
  const [resultStats, setResultStats] = useState<{ totalVotes: number; participantCount: number } | null>(null);

  // 个人第二屏：实时票数（复用大屏 SSE），键为选项 id
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const [liveTotal, setLiveTotal] = useState<number | null>(null);

  const fetchVote = useCallback(async () => {
    const res = await getVoteByCodeAction(resolvedParams.code);
    if (res.success && res.data) {
      setVote(res.data as VoteData);
    } else {
      setError(res.error || '投票不存在或已结束');
    }
    setLoading(false);
  }, [resolvedParams.code]);

  useEffect(() => {
    fetchVote();
  }, [fetchVote]);

  const realtime = vote?.config.showResult?.realtime ?? false;

  // 实时票数订阅：投票中开启实时结果、或投票成功后展示结果时连接
  useSSE(
    vote && ((realtime && !success) || (success && showResult))
      ? `/api/votes/${vote.id}/stream`
      : null,
    useCallback((data: unknown) => {
      const d = data as {
        options?: Array<{ id: string; count: number }>;
        stats?: { totalVotes?: number };
      };
      if (Array.isArray(d.options)) {
        setLiveCounts(Object.fromEntries(d.options.map((o) => [o.id, o.count])));
      }
      if (typeof d.stats?.totalVotes === 'number') setLiveTotal(d.stats.totalVotes);
    }, [])
  );

  // 检查手机号是否已投票
  const checkPhone = useCallback(async () => {
    if (!vote?.config.requirePhone) return;
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) return;

    setCheckingPhone(true);
    const res = await checkVotePhoneAction(resolvedParams.code, phone);
    if (res.success && res.data?.voted) {
      setHasVoted(true);
      if (res.data.selectedOptions) {
        setSelectedOptions(res.data.selectedOptions as string[]);
      }
    } else {
      setHasVoted(false);
      setSelectedOptions([]);
    }
    setCheckingPhone(false);
  }, [phone, resolvedParams.code, vote?.config.requirePhone]);

  const handleOptionSelect = useCallback((optionId: string) => {
    if (vote?.config.voteType === 'single') {
      setSelectedOptions([optionId]);
    } else {
      if (selectedOptions.includes(optionId)) {
        setSelectedOptions(selectedOptions.filter((id) => id !== optionId));
      } else {
        const maxSelect = vote?.config.maxSelect || vote?.config.options.length || 999;
        if (selectedOptions.length < maxSelect) {
          setSelectedOptions([...selectedOptions, optionId]);
        }
      }
    }
  }, [vote, selectedOptions]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vote) return;

    if (selectedOptions.length === 0) {
      setError('请选择至少一个选项');
      return;
    }

    // 验证多选数量
    if (vote.config.voteType === 'multiple') {
      if (vote.config.minSelect && selectedOptions.length < vote.config.minSelect) {
        setError(`请至少选择 ${vote.config.minSelect} 个选项`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    // 获取设备 ID 用于防止重复投票
    const deviceId = getDeviceId();

    const res = await submitVoteAction(resolvedParams.code, {
      phone: vote.config.requirePhone ? phone : undefined,
      selectedOptions,
      deviceId,
    });

    if (res.success) {
      setSuccess(true);
      toast.success('投票成功');

      // 显示结果
      if (vote.config.showResult?.afterVote) {
        setShowResult(true);
        // 重新获取投票数据以显示结果
        const newRes = await getVoteByCodeAction(resolvedParams.code);
        if (newRes.success && newRes.data) {
          const newVote = newRes.data as VoteData;
          setResultOptions(newVote.config.options);
          setResultStats(newVote.stats);
        }
      }
    } else {
      setError(res.error || '投票失败');
      toast.error(res.error || '投票失败');
    }

    setSubmitting(false);
  }, [vote, selectedOptions, resolvedParams.code, phone]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error && !vote) {
    return (
      <ResultScreen
        tone="neutral"
        icon={<AlertCircle />}
        title="无法加载"
        description={error}
      />
    );
  }

  if (success) {
    // 合并实时票数
    const mergedOptions = resultOptions.map((o) => ({
      ...o,
      count: liveCounts[o.id] ?? o.count,
    }));
    const totalVotes = liveTotal ?? resultStats?.totalVotes ?? 0;
    return (
      <ResultScreen
        tone="success"
        icon={<CheckCircle2 />}
        title={hasVoted ? '投票已更新' : '投票成功'}
        description={`感谢您参与 ${vote?.title ?? ''}`}
      >
        {showResult && mergedOptions.length > 0 && (
          <div className="rounded-xl bg-cell p-4 text-left shadow-sm">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-base font-medium text-foreground">实时结果</h3>
              <span className="text-xs text-muted-foreground">
                共 {resultStats?.participantCount || 0} 人参与
              </span>
            </div>
            <BarChart
              options={mergedOptions}
              totalVotes={totalVotes}
              showPercentage
              showCount
            />
          </div>
        )}
      </ResultScreen>
    );
  }

  const options = vote?.config?.options ?? [];
  const canEdit = !hasVoted || (vote?.config.allowChange ?? false);

  return (
    <MobilePage>
      <NavBar title={vote?.title} />

      {/* 头部品牌 */}
      <div className="flex flex-col items-center px-6 pb-2 pt-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <VoteIcon className="h-8 w-8 text-white" />
        </div>
        {vote?.description && (
          <p className="mt-3 text-sm text-muted-foreground">{vote.description}</p>
        )}
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>
            {vote?.config.voteType === 'single'
              ? '单选'
              : `多选（${vote?.config.minSelect || 1}-${vote?.config.maxSelect || options.length}项）`}
          </span>
          {realtime && <span>· 实时结果</span>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        {/* 手机号 */}
        {vote?.config.requirePhone && (
          <>
            <SectionTitle>身份信息</SectionTitle>
            <Cells>
              <Field label="手机号" required htmlFor="phone" icon={<Phone className="h-4 w-4 text-muted-foreground" />}>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={checkPhone}
                  maxLength={11}
                  required
                  className={bareInputClass}
                />
              </Field>
            </Cells>
            {checkingPhone && (
              <p className="flex items-center gap-1 px-5 pt-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                检查中...
              </p>
            )}
            {hasVoted && !checkingPhone && (
              <p className="px-5 pt-2 text-xs text-blue-500">
                {vote.config.allowChange ? '您已投票，可以修改选择' : '您已投票'}
              </p>
            )}
          </>
        )}

        {/* 选项 */}
        <SectionTitle>
          请选择
          {vote?.config.voteType === 'multiple' &&
            ` · 已选 ${selectedOptions.length}/${vote.config.maxSelect || options.length}`}
        </SectionTitle>
        <Cells>
          {options.map((option) => {
            const isSelected = selectedOptions.includes(option.id);
            const disabled = !canEdit;
            const liveCount = liveCounts[option.id] ?? option.count;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleOptionSelect(option.id)}
                disabled={disabled}
                className={cn(
                  'weui-hairline-bottom weui-hairline-inset relative flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors',
                  isSelected ? 'bg-primary/5' : 'active:bg-muted',
                  disabled && 'cursor-not-allowed opacity-60'
                )}
              >
                <div
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                  )}
                >
                  {isSelected && <Check className="h-4 w-4 text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-base', isSelected && 'font-medium text-primary')}>
                    {option.title}
                  </p>
                  {option.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{option.description}</p>
                  )}
                </div>
                {realtime && (
                  <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                    {liveCount} 票
                  </span>
                )}
              </button>
            );
          })}
        </Cells>

        {error && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex-1" />

        {canEdit && (
          <BottomAction sticky>
            <Button
              type="submit"
              className="h-12 w-full text-base font-medium"
              disabled={submitting || selectedOptions.length === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  提交中...
                </>
              ) : hasVoted ? (
                '更新投票'
              ) : (
                '提交投票'
              )}
            </Button>
          </BottomAction>
        )}
      </form>
    </MobilePage>
  );
}
