'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Prize, WHEEL_COLORS } from '@/types/lottery';
import { cn } from '@/lib/utils';

interface LotteryGridProps {
  prizes: Prize[];
  spinning: boolean;
  targetPrizeId?: string;
  duration?: number;
  onSpinEnd?: () => void;
}

export function LotteryGrid({
  prizes,
  spinning,
  targetPrizeId,
  duration = 3000,
  onSpinEnd,
}: LotteryGridProps) {
  const [gridPrizes, setGridPrizes] = useState<Prize[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [finalIndex, setFinalIndex] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevSpinning = useRef(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化九宫格
  useEffect(() => {
    if (prizes.length === 0) return;
    
    // 填充九宫格（8个格子围绕中间的抽奖按钮）
    const grid: Prize[] = [];
    for (let i = 0; i < 8; i++) {
      grid.push(prizes[i % prizes.length]);
    }
    setGridPrizes(grid);
    setActiveIndex(null);
    setFinalIndex(null);
  }, [prizes]);

  // 顺时针顺序的格子索引
  const clockwiseOrder = [0, 1, 2, 5, 8, 7, 6, 3];
  
  // 映射到实际grid位置
  const getGridPosition = (clockwiseIndex: number) => {
    return clockwiseOrder[clockwiseIndex % 8];
  };

  // 开始旋转动画
  useEffect(() => {
    if (spinning && !prevSpinning.current && prizes.length > 0) {
      setIsAnimating(true);
      setFinalIndex(null);

      // 找到目标奖品在grid中的位置
      let targetGridIndex = 0;
      if (targetPrizeId) {
        const prizeIndex = prizes.findIndex(p => p.id === targetPrizeId);
        if (prizeIndex !== -1) {
          targetGridIndex = prizeIndex % 8;
        }
      }

      // 转换为顺时针位置
      const targetClockwisePos = clockwiseOrder.indexOf(targetGridIndex);
      const finalClockwisePos = targetClockwisePos !== -1 ? targetClockwisePos : 0;

      // 计算总步数（至少转3圈 + 到达目标位置）
      const minSpins = 3;
      const totalSteps = minSpins * 8 + finalClockwisePos;

      let currentStep = 0;
      let speed = 50; // 初始速度（毫秒）

      const animate = () => {
        if (currentStep >= totalSteps) {
          // 动画结束
          setIsAnimating(false);
          setFinalIndex(getGridPosition(finalClockwisePos));
          onSpinEnd?.();
          return;
        }

        setActiveIndex(getGridPosition(currentStep));
        currentStep++;

        // 逐渐减速
        const progress = currentStep / totalSteps;
        if (progress > 0.7) {
          speed = 50 + (progress - 0.7) * 500; // 最后30%逐渐减速
        }

        animationRef.current = setTimeout(animate, speed);
      };

      animate();
    }

    if (!spinning && prevSpinning.current) {
      // 停止动画
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    }

    prevSpinning.current = spinning;

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [spinning, targetPrizeId, prizes, duration, onSpinEnd]);

  if (prizes.length === 0) {
    return (
      <div className="text-center text-white/60 py-12">
        请添加奖品
      </div>
    );
  }

  // 3x3 网格布局，中间是抽奖按钮
  const gridLayout = [
    gridPrizes[0], gridPrizes[1], gridPrizes[2],
    gridPrizes[3], null,          gridPrizes[4], // null 是中间按钮
    gridPrizes[5], gridPrizes[6], gridPrizes[7],
  ];

  // 映射到实际索引
  const realIndexMap = [0, 1, 2, 3, -1, 5, 6, 7, 8].map((_, layoutIndex) => {
    if (layoutIndex === 4) return -1; // 中间按钮
    const row = Math.floor(layoutIndex / 3);
    const col = layoutIndex % 3;
    if (row === 0) return col;
    if (row === 1) return col === 0 ? 3 : 5;
    return col + 5;
  });

  // 布局索引到grid索引的映射
  const layoutToGridIndex = [0, 1, 2, 3, -1, 4, 5, 6, 7];

  return (
    <div className="grid grid-cols-3 gap-2 p-4 bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl">
      {gridLayout.map((prize, layoutIndex) => {
        const gridIndex = layoutToGridIndex[layoutIndex];
        const isCenter = gridIndex === -1;
        const isActive = activeIndex === gridIndex;
        const isWinner = finalIndex === gridIndex && !isAnimating;

        if (isCenter) {
          return (
            <div
              key="center"
              className={cn(
                "w-20 h-20 rounded-xl flex items-center justify-center",
                "bg-gradient-to-br from-yellow-400 to-orange-500",
                "border-4 border-yellow-300",
                "shadow-lg",
                isAnimating && "animate-pulse"
              )}
            >
              <span className="text-white font-bold text-lg">
                {isAnimating ? '🎰' : '抽奖'}
              </span>
            </div>
          );
        }

        return (
          <div
            key={layoutIndex}
            className={cn(
              "w-20 h-20 rounded-xl flex items-center justify-center",
              "border-4 transition-all duration-100",
              "shadow-md",
              isActive && "scale-110 border-yellow-400 shadow-yellow-400/50 shadow-lg z-10",
              isWinner && "scale-115 border-yellow-400 animate-bounce shadow-yellow-400/50 shadow-xl z-10",
              !isActive && !isWinner && "border-white/20"
            )}
            style={{
              backgroundColor: prize 
                ? WHEEL_COLORS[prizes.findIndex(p => p.id === prize.id) % WHEEL_COLORS.length]
                : '#666',
            }}
          >
            <div className="text-center p-1">
              {isWinner && <div className="text-lg mb-0.5">🎉</div>}
              <span className="text-white font-bold text-xs leading-tight block">
                {prize?.name || '?'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
