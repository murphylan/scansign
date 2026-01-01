'use client';

import { useEffect, useState, use, useRef, useCallback } from 'react';
import { QRCodeWidget } from '@/components/display/qr-code-widget';
import { LotteryWheel } from '@/components/display/lottery-wheel';
import { LotterySlot } from '@/components/display/lottery-slot';
import { Gift, Trophy, Users, Sparkles } from 'lucide-react';

import {
  getLotteryByCodeAction,
  getLotteryRecordsByCodeAction,
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
  const [stats, setStats] = useState({ participantCount: 0, winnersCount: 0 });
  const [recentWinners, setRecentWinners] = useState<WinRecord[]>([]);
  const [latestWinner, setLatestWinner] = useState<WinRecord | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchLottery = useCallback(async () => {
    const res = await getLotteryByCodeAction(resolvedParams.code);
    if (res.success && res.data) {
      const data = res.data as LotteryData;
      setLottery(data);
      setPrizes((data.config?.prizes ?? []) as Prize[]);
      setStats(data.stats);
      // 生成二维码
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

  useEffect(() => {
    fetchLottery();
    fetchRecords();
  }, [fetchLottery, fetchRecords]);

  // SSE 连接
  useEffect(() => {
    if (!lottery) return;

    const eventSource = new EventSource(`/api/lotteries/${lottery.id}/stream`);
    eventSourceRef.current = eventSource;
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          if (data.prizes) setPrizes(data.prizes);
          if (data.stats) setStats(data.stats);
        }
        
        if (data.type === 'win') {
          if (data.prizes) setPrizes(data.prizes);
          if (data.stats) setStats(data.stats);
          if (data.record) {
            setLatestWinner(data.record);
            setRecentWinners((prev) => [data.record, ...prev].slice(0, 10));
            // 5秒后清除最新中奖提示
            setTimeout(() => setLatestWinner(null), 5000);
          }
        }
        
        if (data.type === 'reset') {
          if (data.prizes) setPrizes(data.prizes);
          if (data.stats) setStats(data.stats);
          setRecentWinners([]);
          setLatestWinner(null);
        }
      } catch {
        // ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, [lottery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-orange-600 via-red-600 to-pink-600">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    );
  }

  if (error || !lottery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-orange-600 via-red-600 to-pink-600 text-white">
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

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={backgroundStyle}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <Sparkles
            key={i}
            className="absolute text-yellow-300/30 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              width: 20 + Math.random() * 20,
              height: 20 + Math.random() * 20,
            }}
          />
        ))}
      </div>
      
      {/* 主内容 */}
      <div className="relative z-10 min-h-screen flex flex-col p-8">
        {/* 顶部标题区域 */}
        <header className="text-center mb-8">
          <h1 className="text-5xl md:text-7xl font-bold text-white drop-shadow-lg mb-4">
            🎰 {lottery.title}
          </h1>
          {lottery.description && (
            <p className="text-xl text-white/80">
              {lottery.description}
            </p>
          )}
          
          {/* 统计 */}
          <div className="flex items-center justify-center gap-8 mt-6">
            <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-black/40 backdrop-blur-md text-white">
              <Users className="h-5 w-5 text-blue-400" />
              <span className="text-2xl font-bold">{stats.participantCount}</span>
              <span className="text-sm opacity-70">人参与</span>
            </div>
            <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-black/40 backdrop-blur-md text-white">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span className="text-2xl font-bold">{stats.winnersCount}</span>
              <span className="text-sm opacity-70">人中奖</span>
            </div>
          </div>
        </header>

        {/* 中奖弹幕 */}
        {latestWinner && (
          <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce">
            <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-2xl px-12 py-8 text-white text-center shadow-2xl">
              <p className="text-2xl mb-2">🎉 恭喜</p>
              <p className="text-4xl font-bold mb-2">
                {latestWinner.phone ? latestWinner.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '幸运用户'}
              </p>
              <p className="text-2xl">
                中得 <span className="font-bold text-yellow-200">{latestWinner.prizeName}</span>
              </p>
            </div>
          </div>
        )}

        {/* 主区域 */}
        <div className="flex-1 flex items-center justify-center gap-12">
          {/* 转盘/老虎机展示 */}
          <div className="bg-black/30 backdrop-blur-md rounded-3xl p-8">
            {lottery.config?.mode === 'wheel' ? (
              <LotteryWheel
                prizes={prizes}
                spinning={false}
                size={400}
              />
            ) : lottery.config?.mode === 'slot' ? (
              <LotterySlot
                prizes={prizes}
                spinning={false}
              />
            ) : null}
          </div>

          {/* 奖品和中奖者列表 */}
          <div className="space-y-6">
            {/* 奖品列表 */}
            {lottery.display?.showPrizeList && (
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 text-white min-w-[300px]">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-yellow-400" />
                  奖品列表
                </h3>
                <div className="space-y-3">
                  {prizes.filter(p => !p.isDefault).map((prize) => (
                    <div
                      key={prize.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/10"
                    >
                      <span className="font-medium">{prize.name}</span>
                      <span className={`text-sm ${prize.remaining === 0 ? 'text-red-400' : 'text-white/60'}`}>
                        {prize.remaining}/{prize.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 中奖名单 */}
            {lottery.display?.showWinners && recentWinners.length > 0 && (
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 text-white min-w-[300px] max-h-[300px] overflow-hidden">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  中奖名单
                </h3>
                <div className="space-y-2">
                  {recentWinners.slice(0, 6).map((winner, index) => (
                    <div
                      key={winner.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <span>
                        {winner.phone 
                          ? winner.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
                          : '幸运用户'
                        }
                      </span>
                      <span className="text-yellow-300 text-sm">
                        {winner.prizeName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部提示 */}
        <footer className="text-center mt-8">
          <p className="text-white/60">
            扫描二维码参与抽奖
          </p>
        </footer>
      </div>

      {/* 二维码 */}
      {qrCodeUrl && lottery.display?.qrCode?.show && (
        <QRCodeWidget
          qrCodeUrl={qrCodeUrl}
          position={lottery.display.qrCode.position as import('@/types/common').QRPosition}
          size={lottery.display.qrCode.size as 'sm' | 'md' | 'lg'}
        />
      )}
    </div>
  );
}
