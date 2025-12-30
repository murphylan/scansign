'use client';

import { useEffect, useState, use, useRef, useCallback } from 'react';
import { QRCodeWidget } from '@/components/display/qr-code-widget';
import { FileText, Download, Clock } from 'lucide-react';

import {
  getFormByCodeAction,
  getFormResponsesByCodeAction,
} from '@/server/actions/publicAction';

interface FormResponse {
  id: string;
  phone: string | null;
  submittedAt: number;
}

interface FormData {
  id: string;
  code: string;
  title: string;
  description: string | null;
  display?: {
    showStats?: boolean;
    showRecentResponses?: boolean;
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
    responseCount: number;
  };
}

export default function FormDisplayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  
  const [form, setForm] = useState<FormData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentResponses, setRecentResponses] = useState<FormResponse[]>([]);
  const [stats, setStats] = useState({ responseCount: 0, todayCount: 0 });
  
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchForm = useCallback(async () => {
    const res = await getFormByCodeAction(resolvedParams.code);
    if (res.success && res.data) {
      const data = res.data as FormData;
      setForm(data);
      setStats({ responseCount: data.stats.responseCount, todayCount: 0 });
      // 生成二维码
      const url = `${window.location.origin}/f/${resolvedParams.code}`;
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`);
    } else {
      setError('表单不存在');
    }
    setLoading(false);
  }, [resolvedParams.code]);

  const fetchResponses = useCallback(async () => {
    const res = await getFormResponsesByCodeAction(resolvedParams.code, 5);
    if (res.success && res.data) {
      setRecentResponses(res.data as FormResponse[]);
    }
  }, [resolvedParams.code]);

  useEffect(() => {
    fetchForm();
    fetchResponses();
  }, [fetchForm, fetchResponses]);

  // SSE 连接
  useEffect(() => {
    if (!form) return;

    const eventSource = new EventSource(`/api/forms/${form.id}/stream`);
    eventSourceRef.current = eventSource;
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected' || data.type === 'new') {
          if (data.stats) {
            setStats(data.stats);
          }
          if (data.response) {
            setRecentResponses((prev) => [data.response, ...prev].slice(0, 5));
          }
        }
      } catch {
        // ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, [form]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-purple-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-purple-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">加载失败</h1>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  const background = form.display?.background || { type: 'gradient', value: 'linear-gradient(135deg, #4c1d95 0%, #6b2184 50%, #4c1d95 100%)' };
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
            {form.title}
          </h1>
          {form.description && (
            <p className="text-xl text-white/80">
              {form.description}
            </p>
          )}
        </header>

        {/* 中间区域 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="grid gap-8 md:grid-cols-2 max-w-4xl w-full">
            {/* 统计卡片 */}
            {form.display?.showStats !== false && (
              <div className="bg-black/40 backdrop-blur-md rounded-3xl p-8 text-white text-center">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-6">
                  <Download className="h-10 w-10" />
                </div>
                <div className="text-7xl font-bold mb-2">{stats.responseCount}</div>
                <div className="text-2xl text-white/70">份提交</div>
                
                {stats.todayCount > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <div className="text-3xl font-bold text-purple-300">{stats.todayCount}</div>
                    <div className="text-sm text-white/50">今日提交</div>
                  </div>
                )}
              </div>
            )}

            {/* 最近提交 */}
            {form.display?.showRecentResponses !== false && recentResponses.length > 0 && (
              <div className="bg-black/40 backdrop-blur-md rounded-3xl p-6 text-white">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  最近提交
                </h3>
                <div className="space-y-3">
                  {recentResponses.map((response, index) => (
                    <div
                      key={response.id}
                      className="flex items-center gap-4 p-3 rounded-xl bg-white/10 animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {response.phone || '匿名用户'}
                        </p>
                        <p className="text-sm text-white/60">
                          {formatTime(response.submittedAt)}
                        </p>
                      </div>
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
            扫描二维码填写表单
          </p>
        </footer>
      </div>

      {/* 二维码 */}
      {qrCodeUrl && form.display?.qrCode?.show && (
        <QRCodeWidget
          qrCodeUrl={qrCodeUrl}
          position={form.display.qrCode.position}
          size={form.display.qrCode.size}
        />
      )}
    </div>
  );
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  } else {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
