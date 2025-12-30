'use client';

import { useEffect, useState, use, useRef, useCallback } from 'react';
import { QRCodeWidget } from '@/components/display/qr-code-widget';
import { Danmaku } from '@/components/display/danmaku';
import { StatsWidget } from '@/components/display/stats-widget';
import { Users } from 'lucide-react';

import {
  getCheckinByCodeAction,
  getCheckinRecordsByCodeAction,
} from '@/server/actions/publicAction';

interface DanmakuItem {
  id: string;
  text: string;
}

interface CheckinData {
  id: string;
  code: string;
  title: string;
  description: string | null;
  display: {
    welcomeTemplate?: string;
    showStats?: boolean;
    showRecentList?: boolean;
    showDepartment?: boolean;
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
    total: number;
    today: number;
    byDepartment?: Record<string, number>;
  };
}

interface CheckinRecord {
  id: string;
  participant: {
    name: string | null;
    phone: string | null;
  };
  department: string | null;
  checkedInAt: number;
}

export default function CheckinDisplayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  
  const [checkin, setCheckin] = useState<CheckinData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [danmakuItems, setDanmakuItems] = useState<DanmakuItem[]>([]);
  const [recentRecords, setRecentRecords] = useState<CheckinRecord[]>([]);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchCheckin = useCallback(async () => {
    const res = await getCheckinByCodeAction(resolvedParams.code);
    if (res.success && res.data) {
      setCheckin(res.data as CheckinData);
      // 生成二维码
      const url = `${window.location.origin}/c/${resolvedParams.code}`;
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`);
    } else {
      setError('签到不存在');
    }
    setLoading(false);
  }, [resolvedParams.code]);

  const fetchRecords = useCallback(async () => {
    const res = await getCheckinRecordsByCodeAction(resolvedParams.code, 10);
    if (res.success && res.data) {
      setRecentRecords(res.data as CheckinRecord[]);
    }
  }, [resolvedParams.code]);

  useEffect(() => {
    fetchCheckin();
    fetchRecords();
  }, [fetchCheckin, fetchRecords]);

  // 用于在 SSE 回调中访问最新的 recentRecords 和 checkin
  // 使用 Map 存储 id -> timestamp 映射，方便检测重复签到
  const recordTimestampsRef = useRef<Map<string, number>>(new Map());
  
  const checkinRef = useRef<CheckinData | null>(null);
  checkinRef.current = checkin;
  
  // 弹幕 ID 计数器，用于重复签到时生成唯一 ID
  const danmakuIdRef = useRef(0);

  // SSE 连接 - 只依赖 checkin.id，避免 checkin 更新时重建连接
  useEffect(() => {
    if (!checkin?.id) return;

    const checkinId = checkin.id;
    const eventSource = new EventSource(`/api/checkins/${checkinId}/stream`);
    eventSourceRef.current = eventSource;
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected' || data.type === 'update') {
          // 更新统计
          if (typeof data.checkinCount === 'number') {
            setCheckin((prev) => prev ? {
              ...prev,
              stats: {
                ...prev.stats,
                total: data.checkinCount,
              },
            } : prev);
          }
          
          // 更新最近签到列表
          if (Array.isArray(data.latestRecords) && data.latestRecords.length > 0) {
            const newRecords: CheckinRecord[] = data.latestRecords.map((r: { id: string; name?: string; phone?: string; checkinTime: number }) => ({
              id: r.id,
              participant: {
                name: r.name,
                phone: r.phone,
              },
              checkedInAt: r.checkinTime,
            }));
            
            // 检查是否有新签到或重复签到（用于弹幕）
            const itemsForDanmaku: CheckinRecord[] = [];
            
            newRecords.forEach((record) => {
              const prevTimestamp = recordTimestampsRef.current.get(record.id);
              
              if (prevTimestamp === undefined) {
                // 新签到：之前没有这条记录
                itemsForDanmaku.push(record);
              } else if (record.checkedInAt > prevTimestamp) {
                // 重复签到：同一记录但时间更新了（说明用户再次签到）
                itemsForDanmaku.push(record);
              }
              
              // 更新时间戳记录
              recordTimestampsRef.current.set(record.id, record.checkedInAt);
            });
            
            // 添加弹幕 - 使用 ref 获取最新的 display 配置
            itemsForDanmaku.forEach((record) => {
              const template = checkinRef.current?.display?.welcomeTemplate || '🎉 欢迎 {{name}} 加入！';
              const text = template.replace('{{name}}', record.participant?.name || '新朋友');
              // 使用唯一 ID（record.id + 时间戳），确保重复签到也能显示弹幕
              danmakuIdRef.current += 1;
              const uniqueId = `${record.id}-${danmakuIdRef.current}`;
              setDanmakuItems((prev) => [
                ...prev,
                { id: uniqueId, text },
              ]);
            });
            
            setRecentRecords(newRecords);
          }
        }
      } catch {
        // ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, [checkin?.id]); // 只依赖 id，避免 checkin 更新时重建连接

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    );
  }

  if (error || !checkin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">加载失败</h1>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  const background = checkin.display?.background || { type: 'gradient', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
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
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* 顶部标题区域 */}
        <header className="p-8 text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white drop-shadow-lg mb-4">
            {checkin.title}
          </h1>
          {checkin.description && (
            <p className="text-xl md:text-2xl text-white/80">
              {checkin.description}
            </p>
          )}
        </header>

        {/* 中间弹幕区域 */}
        <div className="flex-1 relative">
          <Danmaku items={danmakuItems} />
        </div>

        {/* 底部统计和列表 */}
        <footer className="p-8">
          <div className="flex items-end justify-between gap-8">
            {/* 最近签到 */}
            {checkin.display?.showRecentList && recentRecords.length > 0 && (
              <div className="flex-1 max-w-md">
                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4">
                  <h3 className="text-white/80 text-sm font-medium mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    最近签到
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-hidden">
                    {recentRecords.slice(0, 5).map((record, index) => (
                      <div
                        key={record.id}
                        className="flex items-center gap-3 text-white animate-fade-in-up"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="h-8 w-8 rounded-full bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center text-sm font-medium">
                          {record.participant?.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {record.participant?.name || '匿名用户'}
                          </p>
                          {checkin.display?.showDepartment && record.department && (
                            <p className="text-xs text-white/60 truncate">
                              {record.department}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-white/40">
                          {formatTime(record.checkedInAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 统计 */}
            {checkin.display?.showStats && (
              <StatsWidget
                total={checkin.stats.total}
                today={checkin.stats.today}
                byDepartment={checkin.stats.byDepartment}
              />
            )}
          </div>
        </footer>
      </div>

      {/* 二维码 */}
      {qrCodeUrl && checkin.display?.qrCode?.show && (
        <QRCodeWidget
          qrCodeUrl={qrCodeUrl}
          position={checkin.display.qrCode.position as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'}
          size={checkin.display.qrCode.size as 'sm' | 'md' | 'lg'}
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
