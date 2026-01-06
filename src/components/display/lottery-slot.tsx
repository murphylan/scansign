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
  const [offsets, setOffsets] = useState<number[]>([0, 0, 0]);
  const [stopped, setStopped] = useState<boolean[]>([false, false, false]);
  const [winner, setWinner] = useState<boolean>(false);
  const prevSpinning = useRef(false);
  const animationRefs = useRef<NodeJS.Timeout[]>([]);

  const itemHeight = 80;
  const visibleItems = 1;

  // 初始化老虎机
  useEffect(() => {
    if (prizes.length === 0) return;
    
    // 为每个轮子创建奖品列表（多次重复以便滚动）
    const createSlot = () => {
      const items: Prize[] = [];
      for (let i = 0; i < 20; i++) {
        items.push(...prizes);
      }
      return items;
    };
    
    setSlots([createSlot(), createSlot(), createSlot()]);
    setOffsets([0, 0, 0]);
    setStopped([false, false, false]);
    setWinner(false);
  }, [prizes]);

  // 开始旋转
  useEffect(() => {
    if (spinning && !prevSpinning.current && prizes.length > 0) {
      setStopped([false, false, false]);
      setWinner(false);

      // 找到目标奖品索引
      let targetIndex = 0;
      if (targetPrizeId) {
        targetIndex = prizes.findIndex(p => p.id === targetPrizeId);
        if (targetIndex === -1) targetIndex = 0;
      }

      // 每个轮子的最终位置
      const baseOffset = prizes.length * 8; // 转8圈
      const finalOffsets = [
        baseOffset + targetIndex,
        baseOffset + prizes.length + targetIndex,
        baseOffset + prizes.length * 2 + targetIndex,
      ];

      // 快速滚动动画
      const slotCount = 3;
      const speeds = [30, 35, 40]; // 每个轮子的速度略有不同
      const stopTimes = [
        duration * 0.5,
        duration * 0.7,
        duration * 0.95,
      ];

      // 为每个轮子创建滚动动画
      for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
        let currentOffset = offsets[slotIndex];
        const finalOffset = finalOffsets[slotIndex];
        const speed = speeds[slotIndex];
        const stopTime = stopTimes[slotIndex];

        const startTime = Date.now();

        const animate = () => {
          const elapsed = Date.now() - startTime;
          
          if (elapsed >= stopTime) {
            // 停止在最终位置
            setOffsets(prev => {
              const next = [...prev];
              next[slotIndex] = finalOffset;
              return next;
            });
            setStopped(prev => {
              const next = [...prev];
              next[slotIndex] = true;
              return next;
            });

            // 如果是最后一个轮子停止
            if (slotIndex === slotCount - 1) {
              setTimeout(() => {
                setWinner(true);
                onSpinEnd?.();
              }, 300);
            }
            return;
          }

          // 计算当前偏移
          const progress = elapsed / stopTime;
          // 使用缓动函数
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentPos = Math.floor(easeOut * finalOffset);
          
          setOffsets(prev => {
            const next = [...prev];
            next[slotIndex] = currentPos;
            return next;
          });

          animationRefs.current[slotIndex] = setTimeout(animate, speed);
        };

        // 延迟启动每个轮子
        setTimeout(animate, slotIndex * 100);
      }
    }

    prevSpinning.current = spinning;

    return () => {
      animationRefs.current.forEach(ref => clearTimeout(ref));
    };
  }, [spinning, targetPrizeId, prizes, duration, onSpinEnd, offsets]);

  if (prizes.length === 0) {
    // 显示默认奖品
    const defaultPrizes = [
      { id: '1', name: '一等奖', count: 1, remaining: 1, probability: 33 },
      { id: '2', name: '二等奖', count: 3, remaining: 3, probability: 33 },
      { id: '3', name: '三等奖', count: 5, remaining: 5, probability: 34 },
    ];
    
    return (
      <div className="relative p-6 bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border-4 border-yellow-500/50 shadow-2xl">
        {/* 顶部装饰 */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
          <span className="text-white font-bold text-sm">🎰 LUCKY SLOT 🎰</span>
        </div>

        <div className="flex items-center justify-center gap-3 mt-4">
          {[0, 1, 2].map((slotIndex) => (
            <div 
              key={slotIndex}
              className="relative w-24 h-24 overflow-hidden rounded-xl bg-black border-4 border-yellow-400/30"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="text-center p-2"
                  style={{
                    backgroundColor: WHEEL_COLORS[slotIndex % WHEEL_COLORS.length],
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="text-white font-bold text-sm">
                    {defaultPrizes[slotIndex]?.name || '?'}
                  </span>
                </div>
              </div>
              {/* 高亮边框 */}
              <div className="absolute inset-0 border-4 border-yellow-400/50 rounded-lg pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-6 bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border-4 border-yellow-500/50 shadow-2xl">
      {/* 顶部装饰 */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
        <span className="text-white font-bold text-sm">🎰 LUCKY SLOT 🎰</span>
      </div>

      {/* 中奖提示 */}
      {winner && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl animate-bounce">
          🎉
        </div>
      )}

      <div className="flex items-center justify-center gap-3 mt-4">
        {[0, 1, 2].map((slotIndex) => (
          <div 
            key={slotIndex}
            className={cn(
              "relative w-24 h-24 overflow-hidden rounded-xl bg-black",
              "border-4 transition-all duration-300",
              stopped[slotIndex] && winner ? "border-yellow-400 shadow-yellow-400/50 shadow-lg" : "border-yellow-400/30"
            )}
          >
            {/* 滚动的奖品 */}
            <div
              className="absolute left-0 right-0"
              style={{
                transform: `translateY(${-offsets[slotIndex] * itemHeight + (itemHeight * 0.1)}px)`,
                transition: stopped[slotIndex] ? 'transform 0.3s ease-out' : 'none',
              }}
            >
              {slots[slotIndex].map((prize, i) => (
                <div
                  key={`${prize.id}-${i}`}
                  className="h-20 flex items-center justify-center"
                  style={{
                    backgroundColor: WHEEL_COLORS[prizes.findIndex(p => p.id === prize.id) % WHEEL_COLORS.length],
                  }}
                >
                  <span className="text-white font-bold text-sm px-1 text-center leading-tight">
                    {prize.name.length > 6 ? prize.name.slice(0, 6) + '..' : prize.name}
                  </span>
                </div>
              ))}
            </div>

            {/* 高亮中间区域 */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-20 border-y-2 border-yellow-400/50 pointer-events-none" />
            
            {/* 渐变遮罩 */}
            <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-black to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black to-transparent pointer-events-none" />
          </div>
        ))}
      </div>

      {/* 底部装饰 */}
      <div className="flex justify-center gap-2 mt-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-300",
              stopped[i] ? "bg-green-400 shadow-green-400/50 shadow-lg" : "bg-gray-600"
            )}
          />
        ))}
      </div>
    </div>
  );
}
