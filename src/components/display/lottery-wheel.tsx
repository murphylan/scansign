'use client';

import { useEffect, useRef, useState } from 'react';
import { Prize, WHEEL_COLORS } from '@/types/lottery';
import { cn } from '@/lib/utils';

interface LotteryWheelProps {
  prizes: Prize[];
  spinning: boolean;
  targetPrizeId?: string;
  duration?: number;
  onSpinEnd?: () => void;
  size?: number;
}

export function LotteryWheel({
  prizes,
  spinning,
  targetPrizeId,
  duration = 5000,
  onSpinEnd,
  size = 320,
}: LotteryWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevSpinning = useRef(false);

  // 绘制转盘
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;

    ctx.clearRect(0, 0, size, size);

    if (prizes.length === 0) return;

    const sliceAngle = (2 * Math.PI) / prizes.length;

    prizes.forEach((prize, index) => {
      const startAngle = index * sliceAngle - Math.PI / 2;
      const endAngle = startAngle + sliceAngle;

      // 绘制扇形
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = WHEEL_COLORS[index % WHEEL_COLORS.length];
      ctx.fill();

      // 绘制边框
      ctx.strokeStyle = '#ffffff33';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 绘制文字
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(12, size / 20)}px sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      
      // 截断文字
      const maxLen = 6;
      const text = prize.name.length > maxLen 
        ? prize.name.slice(0, maxLen) + '..'
        : prize.name;
      
      ctx.fillText(text, radius * 0.65, 0);
      ctx.restore();
    });

    // 绘制中心圆
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.15, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#00000033';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [prizes, size]);

  // 旋转动画
  useEffect(() => {
    if (spinning && !prevSpinning.current) {
      setIsAnimating(true);

      // 计算目标角度
      let targetIndex = 0;
      if (targetPrizeId) {
        targetIndex = prizes.findIndex(p => p.id === targetPrizeId);
        if (targetIndex === -1) targetIndex = 0;
      }

      const sliceAngle = 360 / prizes.length;
      // 目标角度（让奖品停在指针位置）
      const targetAngle = 360 - (targetIndex * sliceAngle + sliceAngle / 2);
      // 多转几圈
      const spins = 5 + Math.random() * 3;
      const finalRotation = rotation + spins * 360 + targetAngle;

      setRotation(finalRotation);

      // 动画结束回调
      setTimeout(() => {
        setIsAnimating(false);
        onSpinEnd?.();
      }, duration);
    }
    prevSpinning.current = spinning;
  }, [spinning, targetPrizeId, prizes, duration, onSpinEnd]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* 转盘 */}
      <div
        className={cn(
          'absolute inset-0',
          isAnimating && 'transition-transform'
        )}
        style={{
          transform: `rotate(${rotation}deg)`,
          transitionDuration: isAnimating ? `${duration}ms` : '0ms',
          transitionTimingFunction: 'cubic-bezier(0.17, 0.67, 0.12, 0.99)',
        }}
      >
        <canvas ref={canvasRef} width={size} height={size} />
      </div>

      {/* 指针 */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 -top-2 z-10"
        style={{ 
          width: 0, 
          height: 0, 
          borderLeft: '15px solid transparent',
          borderRight: '15px solid transparent',
          borderTop: '30px solid #ff6b6b',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}
      />

      {/* 开始按钮 */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        style={{ width: size * 0.25, height: size * 0.25 }}
      >
        <div className="w-full h-full rounded-full bg-gradient-to-b from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-sm">
            {spinning ? '🎰' : '开始'}
          </span>
        </div>
      </div>
    </div>
  );
}

