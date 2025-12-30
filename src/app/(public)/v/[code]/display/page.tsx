'use client';

import { useEffect, useState, use, useRef, useCallback } from 'react';
import { QRCodeWidget } from '@/components/display/qr-code-widget';
import { VoteChart } from '@/components/display/vote-charts';
import { Users, BarChart3 } from 'lucide-react';

import { getVoteByCodeAction } from '@/server/actions/publicAction';

interface VoteOption {
  id: string;
  title: string;
  count: number;
}

interface VoteData {
  id: string;
  code: string;
  title: string;
  description: string | null;
  display?: {
    chartType?: string;
    showPercentage?: boolean;
    showCount?: boolean;
    animation?: boolean;
    versusConfig?: unknown;
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
  config?: {
    options?: VoteOption[];
  };
  stats: {
    totalVotes: number;
    participantCount: number;
  };
}

export default function VoteDisplayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  
  const [vote, setVote] = useState<VoteData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<VoteOption[]>([]);
  const [stats, setStats] = useState({ totalVotes: 0, participantCount: 0 });
  
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchVote = useCallback(async () => {
    const res = await getVoteByCodeAction(resolvedParams.code);
    if (res.success && res.data) {
      const data = res.data as VoteData;
      setVote(data);
      setOptions((data.config?.options ?? []) as VoteOption[]);
      setStats(data.stats);
      // 生成二维码
      const url = `${window.location.origin}/v/${resolvedParams.code}`;
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`);
    } else {
      setError('投票不存在');
    }
    setLoading(false);
  }, [resolvedParams.code]);

  useEffect(() => {
    fetchVote();
  }, [fetchVote]);

  // SSE 连接
  useEffect(() => {
    if (!vote) return;

    const eventSource = new EventSource(`/api/votes/${vote.id}/stream`);
    eventSourceRef.current = eventSource;
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected' || data.type === 'new' || data.type === 'update' || data.type === 'reset') {
          if (data.options) {
            setOptions(data.options);
          }
          if (data.stats) {
            setStats(data.stats);
          }
        }
      } catch {
        // ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, [vote]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    );
  }

  if (error || !vote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">加载失败</h1>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  const background = vote.display?.background || { type: 'gradient', value: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%)' };
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
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/30" />
      
      {/* 主内容 */}
      <div className="relative z-10 min-h-screen flex flex-col p-8">
        {/* 顶部标题区域 */}
        <header className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold text-white drop-shadow-lg mb-4">
            {vote.title}
          </h1>
          {vote.description && (
            <p className="text-xl text-white/80">
              {vote.description}
            </p>
          )}
          
          {/* 统计 */}
          <div className="flex items-center justify-center gap-8 mt-6">
            <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-black/40 backdrop-blur-md text-white">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              <span className="text-2xl font-bold">{stats.totalVotes}</span>
              <span className="text-sm opacity-70">票</span>
            </div>
            <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-black/40 backdrop-blur-md text-white">
              <Users className="h-5 w-5 text-emerald-400" />
              <span className="text-2xl font-bold">{stats.participantCount}</span>
              <span className="text-sm opacity-70">人参与</span>
            </div>
          </div>
        </header>

        {/* 图表区域 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-4xl bg-black/30 backdrop-blur-md rounded-3xl p-8">
            {options.length === 0 ? (
              <div className="text-center text-white/60 py-12">
                暂无投票数据
              </div>
            ) : (
              <VoteChart
                chartType={(vote.display?.chartType || 'bar') as 'bar' | 'pie' | 'progress' | 'versus'}
                options={options}
                totalVotes={stats.totalVotes}
                showPercentage={vote.display?.showPercentage ?? true}
                showCount={vote.display?.showCount ?? true}
                animation={vote.display?.animation ?? true}
                versusConfig={vote.display?.versusConfig}
              />
            )}
          </div>
        </div>

        {/* 底部提示 */}
        <footer className="text-center mt-8">
          <p className="text-white/60">
            扫描二维码参与投票
          </p>
        </footer>
      </div>

      {/* 二维码 */}
      {qrCodeUrl && vote.display?.qrCode?.show && (
        <QRCodeWidget
          qrCodeUrl={qrCodeUrl}
          position={vote.display.qrCode.position}
          size={vote.display.qrCode.size}
        />
      )}
    </div>
  );
}
