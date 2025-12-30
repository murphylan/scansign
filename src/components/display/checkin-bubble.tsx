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

interface BubbleItem extends CheckinRecord {
  x: number;
  y: number;
  size: number;
  color: string;
  isNew: boolean;
  velocity: { x: number; y: number };
}

interface CheckinBubbleProps {
  records: CheckinRecord[];
  className?: string;
}

// 气泡颜色
const bubbleColors = [
  'rgba(244, 63, 94, 0.8)',   // rose
  'rgba(139, 92, 246, 0.8)',  // violet
  'rgba(59, 130, 246, 0.8)',  // blue
  'rgba(20, 184, 166, 0.8)',  // teal
  'rgba(16, 185, 129, 0.8)',  // emerald
  'rgba(245, 158, 11, 0.8)',  // amber
  'rgba(236, 72, 153, 0.8)',  // pink
  'rgba(168, 85, 247, 0.8)',  // purple
];

export function CheckinBubble({ records, className }: CheckinBubbleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bubbles, setBubbles] = useState<BubbleItem[]>([]);
  // 使用 ref 存储时间戳，检测重复签到
  const recordTimestampsRef = useRef<Map<string, number>>(new Map());
  const animationRef = useRef<number>();

  // 处理新记录
  useEffect(() => {
    const containerWidth = containerRef.current?.clientWidth || 800;
    const containerHeight = containerRef.current?.clientHeight || 600;

    const newBubbles: BubbleItem[] = [];
    
    records.forEach((record, index) => {
      const prevTimestamp = recordTimestampsRef.current.get(record.id);
      // 新签到或重复签到（时间更新）
      const isNew = prevTimestamp === undefined || record.checkedInAt > prevTimestamp;
      
      // 更新时间戳
      recordTimestampsRef.current.set(record.id, record.checkedInAt);
      
      // 检查是否已存在
      const existing = bubbles.find(b => b.id === record.id);
      
      if (existing && !isNew) {
        // 已存在且不是重复签到，保持原位置
        newBubbles.push({
          ...existing,
          ...record,
          isNew: false,
        });
      } else {
        // 新气泡或重复签到，从底部飞入
        const size = 80 + Math.random() * 60;
        const startX = existing?.x ?? Math.random() * (containerWidth - size);
        newBubbles.push({
          ...record,
          x: startX,
          y: isNew ? containerHeight : (existing?.y ?? Math.random() * (containerHeight - size)),
          size,
          color: bubbleColors[index % bubbleColors.length],
          isNew,
          velocity: {
            x: (Math.random() - 0.5) * 2,
            y: isNew ? -3 - Math.random() * 2 : (existing?.velocity?.y ?? (Math.random() - 0.5) * 2),
          },
        });
      }
    });

    setBubbles(newBubbles);
  }, [records]);

  // 动画循环
  useEffect(() => {
    const containerWidth = containerRef.current?.clientWidth || 800;
    const containerHeight = containerRef.current?.clientHeight || 600;

    const animate = () => {
      setBubbles(prev => prev.map(bubble => {
        let { x, y, velocity, isNew } = bubble;
        
        // 更新位置
        x += velocity.x;
        y += velocity.y;
        
        // 边界碰撞
        if (x <= 0 || x >= containerWidth - bubble.size) {
          velocity = { ...velocity, x: -velocity.x * 0.8 };
          x = Math.max(0, Math.min(containerWidth - bubble.size, x));
        }
        if (y <= 0 || y >= containerHeight - bubble.size) {
          velocity = { ...velocity, y: -velocity.y * 0.8 };
          y = Math.max(0, Math.min(containerHeight - bubble.size, y));
        }
        
        // 逐渐减速并添加随机漂浮
        velocity = {
          x: velocity.x * 0.995 + (Math.random() - 0.5) * 0.1,
          y: velocity.y * 0.995 + (Math.random() - 0.5) * 0.1,
        };
        
        // 新气泡在一定时间后变为普通气泡
        if (isNew && y < containerHeight * 0.7) {
          isNew = false;
        }
        
        return { ...bubble, x, y, velocity, isNew };
      }));
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn('w-full h-full relative overflow-hidden', className)}
    >
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className={cn(
            'absolute rounded-full flex flex-col items-center justify-center text-white transition-transform',
            bubble.isNew && 'animate-pulse ring-4 ring-white/50'
          )}
          style={{
            left: bubble.x,
            top: bubble.y,
            width: bubble.size,
            height: bubble.size,
            backgroundColor: bubble.color,
            boxShadow: bubble.isNew 
              ? '0 0 40px rgba(255,255,255,0.6), inset 0 0 20px rgba(255,255,255,0.3)'
              : '0 8px 32px rgba(0,0,0,0.3), inset 0 0 20px rgba(255,255,255,0.2)',
            transform: `scale(${bubble.isNew ? 1.1 : 1})`,
          }}
        >
          <span className="text-lg md:text-xl font-bold truncate px-2 text-center">
            {bubble.participant?.name?.charAt(0) || '?'}
          </span>
          <span className="text-xs md:text-sm truncate px-2 max-w-full text-center opacity-80">
            {bubble.participant?.name?.slice(0, 4) || '匿名'}
          </span>
        </div>
      ))}
      
      {bubbles.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xl">
          等待签到中...
        </div>
      )}
    </div>
  );
}

