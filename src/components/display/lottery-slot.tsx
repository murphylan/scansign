'use client';

import { useEffect, useState, useRef } from 'react';
import { Prize, WHEEL_COLORS } from '@/types/lottery';
import { cn } from '@/lib/utils';

interface LotterySlotProps {
  prizes: Prize[];
  spinning: boolean;
  targetPrizeId?: string;
  duration?: number;
  onSpinEnd?: () => void;
}

export function LotterySlot({
  prizes,
  spinning,
  targetPrizeId,
  duration = 3000,
  onSpinEnd,
}: LotterySlotProps) {
  const [slots, setSlots] = useState<Prize[][]>([[], [], []]);
  const [results, setResults] = useState<number[]>([0, 0, 0]);
  const [animating, setAnimating] = useState([false, false, false]);
  const prevSpinning = useRef(false);

  // 初始化老虎机
  useEffect(() => {
    if (prizes.length === 0) return;
    
    // 为每个轮子创建奖品列表（多次重复以便滚动）
    const createSlot = () => {
      const items: Prize[] = [];
      for (let i = 0; i < 10; i++) {
        items.push(...prizes);
      }
      return items;
    };
    
    setSlots([createSlot(), createSlot(), createSlot()]);
  }, [prizes]);

  // 开始旋转
  useEffect(() => {
    if (spinning && !prevSpinning.current && prizes.length > 0) {
      setAnimating([true, true, true]);

      // 找到目标奖品索引
      let targetIndex = 0;
      if (targetPrizeId) {
        targetIndex = prizes.findIndex(p => p.id === targetPrizeId);
        if (targetIndex === -1) targetIndex = 0;
      }

      // 计算每个轮子停止的位置
      const baseOffset = prizes.length * 5; // 至少转5圈
      const finalPositions = [
        baseOffset + targetIndex,
        baseOffset + prizes.length + targetIndex,
        baseOffset + prizes.length * 2 + targetIndex,
      ];

      // 依次停止每个轮子
      const stopDelays = [
        duration * 0.5,
        duration * 0.7,
        duration,
      ];

      finalPositions.forEach((pos, i) => {
        setTimeout(() => {
          setResults(prev => {
            const next = [...prev];
            next[i] = pos;
            return next;
          });
          setAnimating(prev => {
            const next = [...prev];
            next[i] = false;
            return next;
          });

          if (i === 2) {
            onSpinEnd?.();
          }
        }, stopDelays[i]);
      });
    }
    prevSpinning.current = spinning;
  }, [spinning, targetPrizeId, prizes, duration, onSpinEnd]);

  if (prizes.length === 0) {
    return (
      <div className="text-center text-white/60 py-12">
        请添加奖品
      </div>
    );
  }

  const itemHeight = 80;

  return (
    <div className="flex items-center gap-4">
      {[0, 1, 2].map((slotIndex) => (
        <div 
          key={slotIndex}
          className="relative w-32 h-24 overflow-hidden rounded-xl bg-black/50 border-4 border-yellow-500/50"
        >
          <div
            className={cn(
              'absolute left-0 right-0',
              animating[slotIndex] && 'animate-slot-spin'
            )}
            style={{
              top: animating[slotIndex] 
                ? 0 
                : -(results[slotIndex] * itemHeight) + 22,
              transition: animating[slotIndex] 
                ? 'none' 
                : 'top 0.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)',
            }}
          >
            {slots[slotIndex].map((prize, i) => (
              <div
                key={`${prize.id}-${i}`}
                className="h-20 flex items-center justify-center text-white font-bold text-lg"
                style={{
                  backgroundColor: WHEEL_COLORS[prizes.findIndex(p => p.id === prize.id) % WHEEL_COLORS.length],
                }}
              >
                {prize.name.slice(0, 4)}
              </div>
            ))}
          </div>

          {/* 高亮中间行 */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-20 border-y-4 border-yellow-400 pointer-events-none" />
        </div>
      ))}
    </div>
  );
}

