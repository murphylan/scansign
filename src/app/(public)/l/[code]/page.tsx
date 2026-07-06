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
  Cell,
  Field,
  ResultScreen,
  bareInputClass,
} from '@/components/mobile';
import { useSSE } from '@/hooks/use-sse';
import {
  Gift,
  Phone,
  User,
  Loader2,
  AlertCircle,
  Trophy,
  PartyPopper,
  CheckCircle,
  Users,
} from 'lucide-react';

import {
  getLotteryByCodeAction,
  joinLotteryAction,
} from '@/server/actions/publicAction';

interface Prize {
  id: string;
  name: string;
  count: number;
  remaining: number;
}

interface LotteryData {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  config: {
    mode: string;
    requirePhone?: boolean;
    requireName?: boolean;
    prizes: Prize[];
  };
  stats: {
    participantCount: number;
    winnersCount: number;
  };
}

interface WinResult {
  won: boolean;
  prizeName?: string;
}

export default function LotteryMobilePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);

  const [loading, setLoading] = useState(true);
  const [lottery, setLottery] = useState<LotteryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 表单状态
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);

  // 中奖状态（通过 SSE 接收）
  const [winResult, setWinResult] = useState<WinResult | null>(null);

  // 个人第二屏：实时参与人数（复用大屏 SSE）
  const [liveCount, setLiveCount] = useState<number | null>(null);

  const fetchLottery = useCallback(async () => {
    const res = await getLotteryByCodeAction(resolvedParams.code);
    if (res.success && res.data) {
      const data = res.data as LotteryData;
      setLottery(data);
      setLiveCount(data.stats.participantCount);
    } else {
      setError(res.error || '抽奖活动不存在或已结束');
    }
    setLoading(false);
  }, [resolvedParams.code]);

  useEffect(() => {
    fetchLottery();
  }, [fetchLottery]);

  // SSE：加入后监听中奖结果 + 实时参与人数
  useSSE(
    lottery && participantId
      ? `/api/lotteries/${lottery.id}/stream?participantId=${participantId}`
      : null,
    useCallback(
      (data: unknown) => {
        const d = data as {
          type?: string;
          participantId?: string;
          prizeName?: string;
          participantCount?: number;
        };
        if (typeof d.participantCount === 'number') setLiveCount(d.participantCount);
        if (d.type === 'win' && d.participantId === participantId) {
          setWinResult({ won: true, prizeName: d.prizeName });
          toast.success(`🎉 恭喜中奖：${d.prizeName}`);
        }
      },
      [participantId]
    )
  );

  const handleJoin = useCallback(async () => {
    if (!lottery) return;

    if (lottery.config.requirePhone && !phone) {
      toast.error('请输入手机号');
      return;
    }

    if (lottery.config.requireName && !name) {
      toast.error('请输入姓名');
      return;
    }

    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      toast.error('请输入正确的手机号');
      return;
    }

    setJoining(true);
    setError(null);

    const res = await joinLotteryAction(resolvedParams.code, {
      phone: phone || undefined,
      name: name || undefined,
    });

    if (res.success && res.data) {
      setJoined(true);
      setParticipantId(res.data.participantId);
      toast.success('签到成功，请等待主持人开奖');
    } else {
      setError(res.error || '签到失败');
      toast.error(res.error || '签到失败');
    }

    setJoining(false);
  }, [lottery, phone, name, resolvedParams.code]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error && !lottery) {
    return (
      <ResultScreen
        tone="neutral"
        icon={<AlertCircle />}
        title="无法加载"
        description={error}
      />
    );
  }

  const prizes = lottery?.config.prizes ?? [];

  // 中奖 —— 个人第二屏
  if (winResult) {
    return (
      <ResultScreen
        tone="gold"
        icon={<PartyPopper />}
        title="🎉 恭喜中奖！"
        description="请联系工作人员领取奖品"
      >
        <div className="rounded-xl bg-cell p-6 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">您抽中了</p>
          <p className="mt-1 text-3xl font-bold text-primary">{winResult.prizeName}</p>
        </div>
      </ResultScreen>
    );
  }

  return (
    <MobilePage>
      <NavBar title={lottery?.title} />

      {/* 头部品牌 */}
      <div className="flex flex-col items-center px-6 pb-2 pt-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <Gift className="h-8 w-8 text-white" />
        </div>
        {lottery?.description && (
          <p className="mt-3 text-sm text-muted-foreground">{lottery.description}</p>
        )}
      </div>

      {/* 已加入：个人第二屏（实时参与人数 + 等待开奖） */}
      {joined ? (
        <div className="px-4 pt-2">
          <div className="rounded-xl bg-cell p-6 text-center shadow-sm animate-fade-in-up">
            <div className="relative mx-auto inline-block">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-emerald-500" />
            </div>
            <h3 className="mt-3 text-lg font-semibold">已参与抽奖</h3>
            <p className="mt-1 text-sm text-muted-foreground">请关注大屏幕，等待主持人开奖</p>

            <div className="mt-5 rounded-xl bg-muted/60 p-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm">现场已参与</span>
              </div>
              <p className="mt-1 text-4xl font-bold text-primary tabular-nums">
                {liveCount ?? '—'}
                <span className="ml-1 text-base font-normal text-muted-foreground">人</span>
              </p>
            </div>

            {(name || phone) && (
              <div className="mt-4 text-sm text-muted-foreground">
                {name && <span className="mr-3">姓名：{name}</span>}
                {phone && <span>手机：{phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</span>}
              </div>
            )}

            <div className="mt-4 flex items-center justify-center gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      ) : (
        /* 未加入：签到表单 */
        <>
          {(lottery?.config.requireName || lottery?.config.requirePhone) && (
            <>
              <SectionTitle>签到参与抽奖</SectionTitle>
              <Cells>
                {lottery?.config.requireName && (
                  <Field label="姓名" required htmlFor="name" icon={<User className="h-4 w-4 text-muted-foreground" />}>
                    <Input
                      id="name"
                      placeholder="请输入您的姓名"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={joining}
                      className={bareInputClass}
                    />
                  </Field>
                )}
                {lottery?.config.requirePhone && (
                  <Field label="手机号" required htmlFor="phone" icon={<Phone className="h-4 w-4 text-muted-foreground" />}>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="请输入手机号"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={11}
                      disabled={joining}
                      className={bareInputClass}
                    />
                  </Field>
                )}
              </Cells>
            </>
          )}

          {error && (
            <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <BottomAction>
            <Button
              className="h-12 w-full text-base font-medium"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  签到中...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  立即签到
                </>
              )}
            </Button>
          </BottomAction>
        </>
      )}

      {/* 奖项列表 */}
      <SectionTitle>
        <span className="inline-flex items-center gap-1.5">
          <Trophy className="h-4 w-4 text-accent" />
          奖项设置
        </span>
      </SectionTitle>
      <Cells>
        {prizes.map((prize, index) => (
          <Cell
            key={prize.id}
            icon={
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </span>
            }
            title={prize.name}
            value={`${prize.count} 名`}
          />
        ))}
      </Cells>

      <p className="py-6 text-center text-xs text-muted-foreground">祝您好运 🍀</p>
    </MobilePage>
  );
}
