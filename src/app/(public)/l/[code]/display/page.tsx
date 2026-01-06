'use client';

import { useEffect, useState, use, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { QRCodeWidget } from '@/components/display/qr-code-widget';
import { LotteryWheel } from '@/components/display/lottery-wheel';
import { LotterySlot } from '@/components/display/lottery-slot';
import { LotteryCard } from '@/components/display/lottery-card';
import { LotteryGrid } from '@/components/display/lottery-grid';
import { Button } from '@/components/ui/button';
import { Gift, Trophy, Users, Sparkles, Play } from 'lucide-react';

import {
  getLotteryByCodeAction,
  getLotteryRecordsByCodeAction,
  getLotteryParticipantsAction,
  hostDrawAction,
} from '@/server/actions/publicAction';

interface Prize {
  id: string;
  name: string;
  count: number;
  remaining: number;
  probability: number;
  isDefault?: boolean;
}

interface WinRecord {
  id: string;
  phone: string | null;
  name?: string;
  prizeName: string;
  drawnAt: number;
}

interface LotteryData {
  id: string;
  code: string;
  title: string;
  description: string | null;
  config?: {
    mode?: string;
    prizes?: Prize[];
  };
  display?: {
    showPrizeList?: boolean;
    showWinners?: boolean;
    qrCode?: {
      show: boolean;
      position: string;
      size: string;
    };
    background?: {
      type: string;
      value: string;
    };
  };
  stats: {
    winnersCount: number;
    participantCount: number;
  };
}

// 数字滚动动画组件
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    if (displayValue === value) return;
    
    const diff = value - displayValue;
    const step = Math.ceil(Math.abs(diff) / 10);
    const timer = setInterval(() => {
      setDisplayValue(prev => {
        if (prev === value) {
          clearInterval(timer);
          return value;
        }
        return prev < value ? Math.min(prev + step, value) : Math.max(prev - step, value);
      });
    }, 50);
    
    return () => clearInterval(timer);
  }, [value, displayValue]);
  
  return <span className={className}>{displayValue}</span>;
}

export default function LotteryDisplayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  
  const [lottery, setLottery] = useState<LotteryData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [recentWinners, setRecentWinners] = useState<WinRecord[]>([]);
  
  // 抽奖状态
  const [spinning, setSpinning] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [drawCount, setDrawCount] = useState(1);
  const [latestWinners, setLatestWinners] = useState<Array<{name: string; phone: string | null; prizeName: string}>>([]);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [availableCount, setAvailableCount] = useState(0);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchLottery = useCallback(async () => {
    const res = await getLotteryByCodeAction(resolvedParams.code);
    if (res.success && res.data) {
      const data = res.data as LotteryData;
      setLottery(data);
      setPrizes((data.config?.prizes ?? []) as Prize[]);
      setParticipantCount(data.stats.participantCount);
      const url = `${window.location.origin}/l/${resolvedParams.code}`;
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`);
    } else {
      setError('抽奖不存在');
    }
    setLoading(false);
  }, [resolvedParams.code]);

  const fetchRecords = useCallback(async () => {
    const res = await getLotteryRecordsByCodeAction(resolvedParams.code, 10);
    if (res.success && res.data) {
      setRecentWinners(res.data as WinRecord[]);
    }
  }, [resolvedParams.code]);

  const fetchParticipants = useCallback(async () => {
    const res = await getLotteryParticipantsAction(resolvedParams.code);
    if (res.success && res.data) {
      const participants = res.data as Array<{hasWon: boolean}>;
      setParticipantCount(participants.length);
      setAvailableCount(participants.filter(p => !p.hasWon).length);
    }
  }, [resolvedParams.code]);

  useEffect(() => {
    fetchLottery();
    fetchRecords();
    fetchParticipants();
    
    // 定期刷新参与者数量
    const interval = setInterval(fetchParticipants, 3000);
    return () => clearInterval(interval);
  }, [fetchLottery, fetchRecords, fetchParticipants]);

  // SSE 连接 - 实时更新
  useEffect(() => {
    if (!lottery) return;

    const eventSource = new EventSource(`/api/lotteries/${lottery.id}/stream`);
    eventSourceRef.current = eventSource;
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          if (data.prizes) setPrizes(data.prizes);
          if (data.stats) setParticipantCount(data.stats.participantCount);
        }
        
        if (data.type === 'join') {
          fetchParticipants();
        }
        
        if (data.type === 'win') {
          if (data.prizes) setPrizes(data.prizes);
          fetchRecords();
          fetchParticipants();
        }
        
        if (data.type === 'reset') {
          if (data.prizes) setPrizes(data.prizes);
          setRecentWinners([]);
          fetchParticipants();
        }
      } catch {
        // ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, [lottery, fetchParticipants, fetchRecords]);

  // 主持人开始抽奖
  const handleDraw = useCallback(async () => {
    if (!selectedPrize || spinning) return;
    
    setSpinning(true);
    setShowWinnerAnimation(false);
    setLatestWinners([]);
    
    setTimeout(async () => {
      const res = await hostDrawAction(resolvedParams.code, selectedPrize.id, drawCount);
      
      if (res.success && res.data) {
        const winners = res.data.winners;
        setLatestWinners(winners.map((w: { name: string; phone: string | null; prizeName: string }) => ({
          name: w.name,
          phone: w.phone,
          prizeName: w.prizeName,
        })));
        
        setPrizes(prev => prev.map(p => 
          p.id === selectedPrize.id 
            ? { ...p, remaining: res.data!.remainingPrizes }
            : p
        ));
        
        fetchParticipants();
        fetchRecords();
        
        setTimeout(() => {
          setSpinning(false);
          setShowWinnerAnimation(true);
        }, 3000);
      } else {
        setSpinning(false);
        toast.error(res.error || '抽奖失败');
      }
    }, 2000);
  }, [selectedPrize, drawCount, spinning, resolvedParams.code, fetchParticipants, fetchRecords]);

  const closeWinnerAnimation = useCallback(() => {
    setShowWinnerAnimation(false);
    setLatestWinners([]);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-orange-600 via-red-600 to-pink-600">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    );
  }

  if (error || !lottery) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-orange-600 via-red-600 to-pink-600 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">加载失败</h1>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  const background = lottery.display?.background || { type: 'gradient', value: 'linear-gradient(135deg, #c75a2d 0%, #a83232 50%, #9b2d5e 100%)' };
  const backgroundStyle = background.type === 'gradient'
    ? { background: background.value }
    : background.type === 'image'
    ? { 
        backgroundImage: `url(${background.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { backgroundColor: background.value };

  const displayPrizes = prizes.length > 0 ? prizes : [
    { id: '1', name: '一等奖', count: 1, remaining: 1, probability: 33 },
    { id: '2', name: '二等奖', count: 3, remaining: 3, probability: 33 },
    { id: '3', name: '三等奖', count: 5, remaining: 5, probability: 34 },
  ];

  return (
    <div 
      className="h-screen w-screen overflow-hidden relative"
      style={backgroundStyle}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <Sparkles
            key={i}
            className="absolute text-yellow-300/20 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              width: 16 + Math.random() * 16,
              height: 16 + Math.random() * 16,
            }}
          />
        ))}
      </div>
      
      {/* 中奖弹窗 */}
      {showWinnerAnimation && latestWinners.length > 0 && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeWinnerAnimation}
        >
          <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-3xl p-8 text-white text-center shadow-2xl animate-bounce max-w-lg mx-4">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-4">恭喜中奖！</h2>
            <div className="space-y-3">
              {latestWinners.map((winner, index) => (
                <div key={index} className="bg-white/20 rounded-xl p-4">
                  <p className="text-2xl font-bold">
                    {winner.name}
                    {winner.phone && (
                      <span className="text-lg ml-2 opacity-80">
                        ({winner.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')})
                      </span>
                    )}
                  </p>
                  <p className="text-xl mt-1">
                    获得 <span className="text-yellow-200 font-bold">{winner.prizeName}</span>
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm opacity-70">点击任意位置关闭</p>
          </div>
        </div>
      )}
      
      {/* 主内容 - 固定一屏 */}
      <div className="relative z-10 h-full flex flex-col p-4 lg:p-6">
        {/* 顶部标题 */}
        <header className="text-center shrink-0 py-2">
          <h1 className="text-3xl lg:text-5xl font-bold text-white drop-shadow-lg">
            🎰 {lottery.title}
          </h1>
        </header>

        {/* 主区域 */}
        <div className="flex-1 flex items-center justify-center gap-4 lg:gap-8 min-h-0">
          {/* 左侧：签到统计 */}
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 lg:p-6 text-white flex flex-col items-center justify-center min-w-[140px] lg:min-w-[180px]">
            <Users className="h-8 w-8 lg:h-12 lg:w-12 text-blue-400 mb-2" />
            <p className="text-sm lg:text-base text-white/70 mb-1">已签到</p>
            <AnimatedNumber 
              value={participantCount} 
              className="text-4xl lg:text-6xl font-bold text-white"
            />
            <p className="text-lg lg:text-xl text-white/80 mt-1">人</p>
          </div>

          {/* 中间：转盘 + 控制 */}
          <div className="flex flex-col items-center gap-3 lg:gap-4">
            {/* 抽奖动画 */}
            <div className="bg-black/30 backdrop-blur-md rounded-2xl p-3 lg:p-5">
              {(() => {
                const mode = lottery.config?.mode || 'wheel';
                switch (mode) {
                  case 'slot':
                    return (
                      <LotterySlot
                        prizes={displayPrizes}
                        spinning={spinning}
                      />
                    );
                  case 'card':
                    return (
                      <LotteryCard
                        prizes={displayPrizes}
                        spinning={spinning}
                        cardCount={9}
                      />
                    );
                  case 'grid':
                    return (
                      <LotteryGrid
                        prizes={displayPrizes}
                        spinning={spinning}
                      />
                    );
                  case 'wheel':
                  default:
                    return (
                      <LotteryWheel
                        prizes={displayPrizes}
                        spinning={spinning}
                        size={280}
                      />
                    );
                }
              })()}
            </div>

            {/* 控制面板 */}
            <div className="bg-black/40 backdrop-blur-md rounded-xl p-3 lg:p-4 w-full max-w-sm">
              {/* 选择奖项 */}
              <div className="flex flex-wrap gap-2 mb-3 justify-center">
                {prizes.filter(p => p.remaining > 0).map((prize) => (
                  <button
                    key={prize.id}
                    onClick={() => { setSelectedPrize(prize); setDrawCount(1); }}
                    className={`px-3 py-1.5 rounded-lg text-white text-sm transition-all ${
                      selectedPrize?.id === prize.id
                        ? 'bg-yellow-500 shadow-lg'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {prize.name} ({prize.remaining})
                  </button>
                ))}
              </div>

              {/* 抽取人数 + 按钮 */}
              <div className="flex items-center gap-2">
                {selectedPrize && (
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-xs shrink-0">每次抽</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 5].filter(n => n <= selectedPrize.remaining).map((n) => (
                        <button
                          key={n}
                          onClick={() => setDrawCount(n)}
                          className={`w-8 h-8 rounded-lg text-white text-sm transition-all ${
                            drawCount === n ? 'bg-yellow-500' : 'bg-white/10'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <span className="text-white/60 text-xs shrink-0">人</span>
                  </div>
                )}
                <Button
                  onClick={handleDraw}
                  disabled={!selectedPrize || spinning || availableCount === 0}
                  className="flex-1 h-10 font-bold bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white"
                >
                  {spinning ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      开始抽奖
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* 右侧：奖项 + 中奖名单 */}
          <div className="flex flex-col gap-3 lg:gap-4 min-w-[160px] lg:min-w-[200px] max-h-full">
            {/* 奖项设置 */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-3 lg:p-4 text-white">
              <h3 className="text-sm lg:text-base font-medium mb-2 flex items-center gap-2">
                <Gift className="h-4 w-4 text-yellow-400" />
                奖项
              </h3>
              <div className="space-y-1.5">
                {prizes.map((prize, index) => (
                  <div
                    key={prize.id}
                    className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                      prize.remaining === 0 ? 'bg-white/5 opacity-50' : 'bg-white/10'
                    }`}
                  >
                    <span>{prize.name}</span>
                    <span className={prize.remaining === 0 ? 'text-red-400' : 'text-white/60'}>
                      {prize.remaining}/{prize.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 中奖名单 */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-3 lg:p-4 text-white flex-1 min-h-0 overflow-hidden">
              <h3 className="text-sm lg:text-base font-medium mb-2 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-400" />
                中奖名单
              </h3>
              {recentWinners.length === 0 ? (
                <p className="text-white/50 text-center py-2 text-sm">等待抽奖...</p>
              ) : (
                <div className="space-y-1.5 overflow-y-auto max-h-[200px]">
                  {recentWinners.slice(0, 6).map((winner) => (
                    <div
                      key={winner.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/10 text-sm"
                    >
                      <span className="truncate max-w-[80px]">
                        {winner.name || (winner.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') ?? '幸运用户')}
                      </span>
                      <span className="text-yellow-300 text-xs shrink-0">{winner.prizeName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部提示 */}
        <footer className="text-center shrink-0 py-2">
          <p className="text-white/50 text-sm">扫描二维码签到参与抽奖</p>
        </footer>
      </div>

      {/* 二维码 */}
      {qrCodeUrl && lottery.display?.qrCode?.show !== false && (
        <QRCodeWidget
          qrCodeUrl={qrCodeUrl}
          position={(lottery.display?.qrCode?.position as import('@/types/common').QRPosition) || 'bottom-right'}
          size={(lottery.display?.qrCode?.size as 'sm' | 'md' | 'lg') || 'sm'}
        />
      )}
    </div>
  );
}
