'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface CheckinRecord {
  id: string;
  participant: {
    name: string | null;
    phone: string | null;
  };
  department?: string | null;
  checkedInAt: number;
}

interface CheckinGridProps {
  records: CheckinRecord[];
  className?: string;
  showDepartment?: boolean;
}

// 随机颜色渐变
const gradients = [
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-cyan-500 to-teal-600',
  'from-emerald-500 to-green-600',
  'from-amber-500 to-orange-600',
  'from-red-500 to-rose-600',
  'from-fuchsia-500 to-pink-600',
];

export function CheckinGrid({ records, className, showDepartment }: CheckinGridProps) {
  const [animatedRecords, setAnimatedRecords] = useState<(CheckinRecord & { colorIndex: number; isNew: boolean })[]>([]);
  // 使用 ref 存储时间戳，检测重复签到
  const recordTimestampsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const newAnimated = records.map((record, index) => {
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
    
    setAnimatedRecords(newAnimated);
    
    // 清除 isNew 标记
    const timer = setTimeout(() => {
      setAnimatedRecords(prev => prev.map(r => ({ ...r, isNew: false })));
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [records]);

  return (
    <div className={cn('w-full h-full p-4', className)}>
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 auto-rows-min">
        {animatedRecords.map((record) => (
          <div
            key={record.id}
            className={cn(
              'aspect-square rounded-2xl flex flex-col items-center justify-center text-white p-3 transition-all duration-500',
              `bg-linear-to-br ${gradients[record.colorIndex]}`,
              record.isNew && 'animate-bounce-in scale-110'
            )}
            style={{
              boxShadow: record.isNew ? '0 0 30px rgba(255,255,255,0.5)' : '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            <div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl md:text-3xl font-bold mb-2">
              {record.participant?.name?.charAt(0) || '?'}
            </div>
            <p className="font-semibold text-sm md:text-base text-center truncate w-full">
              {record.participant?.name || '匿名'}
            </p>
            {showDepartment && record.department && (
              <p className="text-xs text-white/70 truncate w-full text-center">
                {record.department}
              </p>
            )}
          </div>
        ))}
      </div>
      
      {animatedRecords.length === 0 && (
        <div className="flex items-center justify-center h-full text-white/50 text-xl">
          等待签到中...
        </div>
      )}
    </div>
  );
}

