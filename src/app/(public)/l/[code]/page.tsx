'use client';

import { useEffect, useState, use, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchLottery = useCallback(async () => {
    const res = await getLotteryByCodeAction(resolvedParams.code);
    if (res.success && res.data) {
      const data = res.data as LotteryData;
      setLottery(data);
    } else {
      setError(res.error || '抽奖活动不存在或已结束');
    }
    setLoading(false);
  }, [resolvedParams.code]);

  useEffect(() => {
    fetchLottery();
  }, [fetchLottery]);

  // SSE 监听中奖结果
  useEffect(() => {
    if (!lottery || !participantId) return;

    const eventSource = new EventSource(`/api/lotteries/${lottery.id}/stream?participantId=${participantId}`);
    eventSourceRef.current = eventSource;
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'win' && data.participantId === participantId) {
          // 当前用户中奖
          setWinResult({
            won: true,
            prizeName: data.prizeName,
          });
          toast.success(`🎉 恭喜中奖：${data.prizeName}`);
        }
      } catch {
        // ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, [lottery, participantId]);

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background to-secondary/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error && !lottery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background to-secondary/30 p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">无法加载</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const prizes = lottery?.config.prizes ?? [];

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-secondary/30 px-4 py-6 overflow-x-hidden">
      <div className="w-full max-w-sm mx-auto space-y-4">
        {/* Header */}
        <div className="text-center animate-fade-in-up">
          <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-primary to-amber-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Gift className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{lottery?.title}</h1>
          {lottery?.description && (
            <p className="text-muted-foreground mt-1 text-sm">{lottery.description}</p>
          )}
        </div>

        {/* 中奖结果 */}
        {winResult && (
          <Card className="bg-linear-to-r from-primary to-amber-500 border-0 animate-bounce">
            <CardContent className="pt-6 text-center">
              <PartyPopper className="h-12 w-12 text-white mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-white">🎉 恭喜中奖！</h3>
              <p className="text-white/90 text-xl mt-2">{winResult.prizeName}</p>
              <p className="text-white/70 text-sm mt-3">请联系工作人员领取奖品</p>
            </CardContent>
          </Card>
        )}

        {/* 签到表单 */}
        {!joined && !winResult && (
          <Card className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-primary" />
                签到参与抽奖
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lottery?.config.requireName && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    姓名
                  </Label>
                  <Input
                    type="text"
                    placeholder="请输入您的姓名"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={joining}
                    className="h-11"
                  />
                </div>
              )}
              
              {lottery?.config.requirePhone && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4" />
                    手机号
                  </Label>
                  <Input
                    type="tel"
                    placeholder="请输入手机号"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={11}
                    disabled={joining}
                    className="h-11"
                  />
                </div>
              )}
              
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <Button
                className="w-full h-12 text-base font-bold"
                onClick={handleJoin}
                disabled={joining}
              >
                {joining ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    签到中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    立即签到
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 已签到状态 */}
        {joined && !winResult && (
          <Card className="animate-fade-in-up">
            <CardContent className="pt-6 text-center">
              <div className="relative inline-block">
                <div className="h-16 w-16 rounded-full bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full animate-ping" />
              </div>
              <h3 className="text-lg font-semibold mt-3 mb-2">签到成功</h3>
              <p className="text-muted-foreground text-sm">请关注大屏幕</p>
              <p className="text-muted-foreground text-sm">等待主持人开奖</p>
              
              {(name || phone) && (
                <div className="mt-4 p-3 rounded-lg bg-secondary">
                  <p className="text-sm">
                    {name && <span className="block">姓名：{name}</span>}
                    {phone && <span className="block">手机：{phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</span>}
                  </p>
                </div>
              )}
              
              <div className="mt-4 flex items-center justify-center gap-1 text-primary">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 奖品列表 */}
        <Card className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-amber-500" />
              奖项设置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {prizes.map((prize, index) => (
                <div
                  key={prize.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="font-medium text-sm">{prize.name}</span>
                  </div>
                  <span className="text-muted-foreground text-sm">{prize.count} 名</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 底部提示 */}
        <p className="text-center text-muted-foreground text-xs pb-2">
          祝您好运 🍀
        </p>
      </div>
    </div>
  );
}
