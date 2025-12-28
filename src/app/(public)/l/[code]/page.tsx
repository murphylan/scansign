'use client';

import { useEffect, useState, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Gift,
  Phone,
  Loader2,
  AlertCircle,
  Trophy,
  PartyPopper,
} from 'lucide-react';
import { Lottery, Prize, DrawResult } from '@/types/lottery';
import { LotteryWheel } from '@/components/display/lottery-wheel';
import { LotterySlot } from '@/components/display/lottery-slot';
import { cn } from '@/lib/utils';

export default function LotteryMobilePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  
  const [loading, setLoading] = useState(true);
  const [lottery, setLottery] = useState<Lottery | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 表单状态
  const [phone, setPhone] = useState('');
  const [canDraw, setCanDraw] = useState(true);
  const [remainingDraws, setRemainingDraws] = useState(1);
  const [checkingPhone, setCheckingPhone] = useState(false);
  
  // 抽奖状态
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<DrawResult | null>(null);
  const [targetPrizeId, setTargetPrizeId] = useState<string | undefined>();

  useEffect(() => {
    async function fetchLottery() {
      try {
        const res = await fetch(`/api/lotteries/code/${resolvedParams.code}`);
        if (res.ok) {
          const data = await res.json();
          setLottery(data.data);
          setRemainingDraws(data.data.config.maxDrawsPerUser);
        } else {
          setError('抽奖活动不存在或已结束');
        }
      } catch {
        setError('加载失败，请刷新重试');
      } finally {
        setLoading(false);
      }
    }
    fetchLottery();
  }, [resolvedParams.code]);

  // 检查手机号抽奖次数
  async function checkPhone() {
    if (!lottery?.config.requirePhone) return;
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) return;
    
    setCheckingPhone(true);
    try {
      const res = await fetch(`/api/lotteries/${lottery.id}/draw?phone=${phone}`);
      if (res.ok) {
        const data = await res.json();
        setCanDraw(data.data?.canDraw ?? true);
        setRemainingDraws(data.data?.remainingDraws ?? 0);
      }
    } catch {
      // ignore
    } finally {
      setCheckingPhone(false);
    }
  }

  async function handleDraw() {
    if (!lottery) return;
    
    if (lottery.config.requirePhone && !phone) {
      setError('请输入手机号');
      return;
    }
    
    if (!canDraw) {
      setError('您的抽奖次数已用完');
      return;
    }
    
    setError(null);
    setSpinning(true);
    setResult(null);
    
    try {
      const res = await fetch(`/api/lotteries/${lottery.id}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.data) {
        // 设置目标奖品用于动画
        if (data.data.won && data.data.prize) {
          setTargetPrizeId(data.data.prize.id);
        } else {
          // 未中奖时随机选一个奖品作为动画目标
          const randomPrize = lottery.config.prizes[Math.floor(Math.random() * lottery.config.prizes.length)];
          setTargetPrizeId(randomPrize?.id);
        }
        
        // 等待动画结束后显示结果
        setTimeout(() => {
          setResult(data.data);
          setSpinning(false);
          if (data.data.remainingDraws !== undefined) {
            setRemainingDraws(data.data.remainingDraws);
            setCanDraw(data.data.remainingDraws > 0);
          }
        }, lottery.config.animation.duration);
      } else {
        setError(data.error || '抽奖失败');
        setSpinning(false);
      }
    } catch {
      setError('抽奖失败，请重试');
      setSpinning(false);
    }
  }

  function resetAndDrawAgain() {
    setResult(null);
    setTargetPrizeId(undefined);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-600 to-red-700">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-white/80">加载中...</p>
        </div>
      </div>
    );
  }

  if (error && !lottery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-600 to-red-700 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">无法加载</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-600 via-red-600 to-red-700 p-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center animate-fade-in-up">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Gift className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{lottery?.title}</h1>
          {lottery?.description && (
            <p className="text-white/80 mt-2">{lottery.description}</p>
          )}
          <p className="text-white/60 mt-1 text-sm">
            剩余抽奖次数：{remainingDraws}
          </p>
        </div>

        {/* 抽奖区域 */}
        <Card className="animate-fade-in-up bg-black/20 backdrop-blur border-white/20" style={{ animationDelay: '0.1s' }}>
          <CardContent className="pt-6 flex flex-col items-center">
            {/* 转盘/老虎机 */}
            {lottery?.config.mode === 'wheel' ? (
              <LotteryWheel
                prizes={lottery.config.prizes}
                spinning={spinning}
                targetPrizeId={targetPrizeId}
                duration={lottery.config.animation.duration}
                size={280}
              />
            ) : lottery?.config.mode === 'slot' ? (
              <LotterySlot
                prizes={lottery.config.prizes}
                spinning={spinning}
                targetPrizeId={targetPrizeId}
                duration={lottery.config.animation.duration}
              />
            ) : null}

            {/* 结果展示 */}
            {result && (
              <div className={cn(
                'mt-6 p-4 rounded-xl text-center w-full',
                result.won 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                  : 'bg-white/10'
              )}>
                {result.won ? (
                  <>
                    <PartyPopper className="h-10 w-10 text-white mx-auto mb-2" />
                    <h3 className="text-xl font-bold text-white">
                      🎉 恭喜中奖！
                    </h3>
                    <p className="text-white/90 text-lg mt-1">
                      {result.prize?.name}
                    </p>
                  </>
                ) : (
                  <>
                    <Trophy className="h-10 w-10 text-white/50 mx-auto mb-2" />
                    <h3 className="text-lg font-medium text-white">
                      很遗憾，未中奖
                    </h3>
                    <p className="text-white/60 text-sm mt-1">
                      下次好运！
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 手机号输入 */}
        {lottery?.config.requirePhone && !result && (
          <Card className="animate-fade-in-up bg-black/20 backdrop-blur border-white/20" style={{ animationDelay: '0.2s' }}>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-white">
                  <Phone className="h-4 w-4" />
                  手机号
                </Label>
                <Input
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={checkPhone}
                  maxLength={11}
                  disabled={spinning}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
                {checkingPhone && (
                  <p className="text-xs text-white/60 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    检查中...
                  </p>
                )}
                {!canDraw && !checkingPhone && phone && (
                  <p className="text-xs text-yellow-300">
                    您的抽奖次数已用完
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/20 text-white text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* 抽奖按钮 */}
        {!result ? (
          <Button
            className="w-full h-14 text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-lg animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
            onClick={handleDraw}
            disabled={spinning || !canDraw}
          >
            {spinning ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                抽奖中...
              </>
            ) : !canDraw ? (
              '抽奖次数已用完'
            ) : (
              '🎰 开始抽奖'
            )}
          </Button>
        ) : remainingDraws > 0 ? (
          <Button
            className="w-full h-14 text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-lg"
            onClick={resetAndDrawAgain}
          >
            🎰 再抽一次 ({remainingDraws}次)
          </Button>
        ) : null}

        {/* 奖品列表 */}
        <Card className="animate-fade-in-up bg-black/20 backdrop-blur border-white/20" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              奖品列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lottery?.config.prizes.filter(p => !p.isDefault).map((prize) => (
                <div
                  key={prize.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/10"
                >
                  <span className="text-white font-medium">{prize.name}</span>
                  <span className="text-white/60 text-sm">
                    剩余 {prize.remaining}/{prize.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

