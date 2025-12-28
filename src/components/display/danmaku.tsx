'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface DanmakuItem {
  id: string;
  text: string;
  color?: string;
}

interface DanmakuProps {
  items: DanmakuItem[];
  className?: string;
}

interface DanmakuBullet extends DanmakuItem {
  row: number;
  left: number;
  speed: number;
  visible: boolean;
}

export function Danmaku({ items, className }: DanmakuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bullets, setBullets] = useState<DanmakuBullet[]>([]);
  const processedIds = useRef<Set<string>>(new Set());
  const rowLastUsed = useRef<number[]>([]);

  // 初始化行使用时间
  useEffect(() => {
    const rows = 8;
    rowLastUsed.current = new Array(rows).fill(0);
  }, []);

  // 处理新消息
  useEffect(() => {
    const newItems = items.filter((item) => !processedIds.current.has(item.id));
    
    if (newItems.length === 0) return;

    newItems.forEach((item) => {
      processedIds.current.add(item.id);
      
      // 找到最早使用的行
      const now = Date.now();
      let bestRow = 0;
      let minTime = rowLastUsed.current[0];
      
      for (let i = 1; i < rowLastUsed.current.length; i++) {
        if (rowLastUsed.current[i] < minTime) {
          minTime = rowLastUsed.current[i];
          bestRow = i;
        }
      }
      
      // 更新行使用时间
      rowLastUsed.current[bestRow] = now;
      
      const bullet: DanmakuBullet = {
        ...item,
        row: bestRow,
        left: 100,
        speed: 3 + Math.random() * 2,
        visible: true,
      };
      
      setBullets((prev) => [...prev, bullet]);
    });
  }, [items]);

  // 动画循环
  useEffect(() => {
    const interval = setInterval(() => {
      setBullets((prev) =>
        prev
          .map((bullet) => ({
            ...bullet,
            left: bullet.left - bullet.speed * 0.1,
          }))
          .filter((bullet) => bullet.left > -50)
      );
    }, 16);

    return () => clearInterval(interval);
  }, []);

  // 清理过期的 processedIds（防止内存泄漏）
  useEffect(() => {
    const cleanup = setInterval(() => {
      if (processedIds.current.size > 1000) {
        const idsArray = Array.from(processedIds.current);
        processedIds.current = new Set(idsArray.slice(-500));
      }
    }, 60000);

    return () => clearInterval(cleanup);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}
    >
      {bullets.map((bullet) => (
        <div
          key={bullet.id}
          className="absolute whitespace-nowrap text-white text-2xl font-bold drop-shadow-lg"
          style={{
            top: `${10 + bullet.row * 10}%`,
            left: `${bullet.left}%`,
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          <span className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
            {bullet.text}
          </span>
        </div>
      ))}
    </div>
  );
}

