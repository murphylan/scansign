'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { UserCheck } from 'lucide-react';

interface CheckinRecord {
  id: string;
  participant: {
    name: string | null;
    phone: string | null;
  };
  department?: string | null;
  checkedInAt: number;
}

interface CheckinListProps {
  records: CheckinRecord[];
  className?: string;
  showDepartment?: boolean;
  welcomeTemplate?: string;
}

// 随机颜色渐变
const gradients = [
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-cyan-500 to-teal-600',
  'from-emerald-500 to-green-600',
  'from-amber-500 to-orange-600',
];

export function CheckinList({ records, className, showDepartment, welcomeTemplate }: CheckinListProps) {
  const [displayRecords, setDisplayRecords] = useState<(CheckinRecord & { colorIndex: number; isNew: boolean })[]>([]);
  // 使用 ref 存储时间戳，检测重复签到
  const recordTimestampsRef = useRef<Map<string, number>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newRecords = records.map((record, index) => {
      const prevTimestamp = recordTimestampsRef.current.get(record.id);
      // 新签到或重复签到（时间更新）都视为 isNew
      const isNew = prevTimestamp === undefined || record.checkedInAt > prevTimestamp;
      
      // 更新时间戳
      recordTimestampsRef.current.set(record.id, record.checkedInAt);
      
      return {
        ...record,
        colorIndex: index % gradients.length,
        isNew,
      };
    });
    
    setDisplayRecords(newRecords);
    
    // 清除 isNew 标记
    const timer = setTimeout(() => {
      setDisplayRecords(prev => prev.map(r => ({ ...r, isNew: false })));
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [records]);

  // 自动滚动到最新
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [displayRecords]);

  const getWelcomeText = (name: string | null) => {
    const template = welcomeTemplate || '🎉 欢迎 {{name}} 签到成功！';
    return template.replace('{{name}}', name || '新朋友');
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className={cn('w-full h-full flex flex-col', className)}>
      <div 
        ref={listRef}
        className="flex-1 overflow-hidden space-y-3 p-4"
      >
        {displayRecords.map((record, index) => (
          <div
            key={record.id}
            className={cn(
              'flex items-center gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 transition-all duration-500',
              record.isNew && 'animate-slide-in-left ring-2 ring-white/50 bg-white/20'
            )}
            style={{
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {/* 头像 */}
            <div className={cn(
              'h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0 bg-linear-to-br',
              gradients[record.colorIndex]
            )}>
              {record.participant?.name?.charAt(0) || <UserCheck className="h-8 w-8" />}
            </div>
            
            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-xl font-semibold truncate">
                {getWelcomeText(record.participant?.name)}
              </p>
              <div className="flex items-center gap-3 mt-1">
                {showDepartment && record.department && (
                  <span className="text-white/60 text-sm">
                    {record.department}
                  </span>
                )}
                <span className="text-white/40 text-sm">
                  {formatTime(record.checkedInAt)}
                </span>
              </div>
            </div>

            {/* 新签到标记 */}
            {record.isNew && (
              <div className="shrink-0 px-3 py-1 rounded-full bg-emerald-500 text-white text-sm font-medium animate-pulse">
                NEW
              </div>
            )}
          </div>
        ))}
        
        {displayRecords.length === 0 && (
          <div className="flex items-center justify-center h-full text-white/50 text-xl">
            等待签到中...
          </div>
        )}
      </div>
    </div>
  );
}

