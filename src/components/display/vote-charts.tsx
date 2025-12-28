'use client';

import { cn } from '@/lib/utils';
import { VoteOption, calculatePercentage } from '@/types/vote';

interface ChartProps {
  options: VoteOption[];
  totalVotes: number;
  showPercentage?: boolean;
  showCount?: boolean;
  animation?: boolean;
  className?: string;
}

// 预设颜色
const COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

/**
 * 柱状图
 */
export function BarChart({
  options,
  totalVotes,
  showPercentage = true,
  showCount = true,
  animation = true,
  className,
}: ChartProps) {
  const maxCount = Math.max(...options.map((o) => o.count), 1);

  return (
    <div className={cn('space-y-4', className)}>
      {options.map((option, index) => {
        const percentage = calculatePercentage(option.count, totalVotes);
        const widthPercentage = (option.count / maxCount) * 100;
        const color = COLORS[index % COLORS.length];

        return (
          <div key={option.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-white truncate max-w-[60%]">
                {option.title}
              </span>
              <div className="flex items-center gap-3 text-white/80">
                {showCount && (
                  <span className="text-lg font-bold">{option.count} 票</span>
                )}
                {showPercentage && (
                  <span
                    className="text-2xl font-bold min-w-[4rem] text-right"
                    style={{ color }}
                  >
                    {percentage}%
                  </span>
                )}
              </div>
            </div>
            <div className="h-8 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  animation && 'transition-all duration-1000 ease-out'
                )}
                style={{
                  width: `${widthPercentage}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 进度条图
 */
export function ProgressChart({
  options,
  totalVotes,
  showPercentage = true,
  showCount = true,
  animation = true,
  className,
}: ChartProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {options.map((option, index) => {
        const percentage = calculatePercentage(option.count, totalVotes);
        const color = COLORS[index % COLORS.length];

        return (
          <div key={option.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="font-medium text-white">{option.title}</span>
              </div>
              <div className="flex items-center gap-4 text-white/80">
                {showCount && <span>{option.count} 票</span>}
                {showPercentage && (
                  <span className="font-bold text-xl" style={{ color }}>
                    {percentage}%
                  </span>
                )}
              </div>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  animation && 'transition-all duration-1000 ease-out'
                )}
                style={{
                  width: `${percentage}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 饼图
 */
export function PieChart({
  options,
  totalVotes,
  showPercentage = true,
  showCount = true,
  animation = true,
  className,
}: ChartProps) {
  // 计算饼图扇区
  let currentAngle = 0;
  const sectors = options.map((option, index) => {
    const percentage = totalVotes > 0 ? (option.count / totalVotes) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return {
      ...option,
      percentage,
      startAngle,
      angle,
      color: COLORS[index % COLORS.length],
    };
  });

  // 生成 SVG 路径
  function describeArc(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number
  ): string {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    return [
      'M',
      cx,
      cy,
      'L',
      start.x,
      start.y,
      'A',
      r,
      r,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
      'Z',
    ].join(' ');
  }

  function polarToCartesian(
    cx: number,
    cy: number,
    r: number,
    angle: number
  ): { x: number; y: number } {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  return (
    <div className={cn('flex items-center gap-8', className)}>
      {/* 饼图 */}
      <div className="relative">
        <svg width="300" height="300" viewBox="0 0 300 300">
          {sectors.map((sector, index) => (
            <path
              key={sector.id}
              d={describeArc(150, 150, 130, sector.startAngle, sector.startAngle + sector.angle)}
              fill={sector.color}
              className={cn(animation && 'transition-all duration-1000')}
              style={{
                transformOrigin: '150px 150px',
              }}
            />
          ))}
          {/* 中心圆 */}
          <circle cx="150" cy="150" r="60" fill="rgba(0,0,0,0.5)" />
          <text
            x="150"
            y="145"
            textAnchor="middle"
            className="fill-white text-3xl font-bold"
          >
            {totalVotes}
          </text>
          <text
            x="150"
            y="170"
            textAnchor="middle"
            className="fill-white/60 text-sm"
          >
            总票数
          </text>
        </svg>
      </div>

      {/* 图例 */}
      <div className="space-y-3">
        {sectors.map((sector) => (
          <div key={sector.id} className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full shrink-0"
              style={{ backgroundColor: sector.color }}
            />
            <span className="text-white font-medium">{sector.title}</span>
            <div className="flex items-center gap-2 text-white/70">
              {showCount && <span>{sector.count}票</span>}
              {showPercentage && (
                <span className="font-bold" style={{ color: sector.color }}>
                  {Math.round(sector.percentage)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 对决模式
 */
interface VersusChartProps {
  options: VoteOption[];
  totalVotes: number;
  leftColor?: string;
  rightColor?: string;
  animation?: boolean;
  className?: string;
}

export function VersusChart({
  options,
  totalVotes,
  leftColor = '#3b82f6',
  rightColor = '#ef4444',
  animation = true,
  className,
}: VersusChartProps) {
  if (options.length < 2) {
    return <div className="text-white/60">对决模式需要至少2个选项</div>;
  }

  const left = options[0];
  const right = options[1];
  const leftPercentage = calculatePercentage(left.count, totalVotes);
  const rightPercentage = calculatePercentage(right.count, totalVotes);

  return (
    <div className={cn('text-center', className)}>
      {/* 选项名称 */}
      <div className="flex items-center justify-between mb-8">
        <div className="text-3xl font-bold" style={{ color: leftColor }}>
          {left.title}
        </div>
        <div className="text-4xl font-bold text-white/50">VS</div>
        <div className="text-3xl font-bold" style={{ color: rightColor }}>
          {right.title}
        </div>
      </div>

      {/* 进度条 */}
      <div className="h-16 bg-white/10 rounded-full overflow-hidden flex">
        <div
          className={cn(
            'h-full flex items-center justify-center',
            animation && 'transition-all duration-1000 ease-out'
          )}
          style={{
            width: `${leftPercentage || 50}%`,
            backgroundColor: leftColor,
          }}
        >
          <span className="text-2xl font-bold text-white">
            {leftPercentage}%
          </span>
        </div>
        <div
          className={cn(
            'h-full flex items-center justify-center',
            animation && 'transition-all duration-1000 ease-out'
          )}
          style={{
            width: `${rightPercentage || 50}%`,
            backgroundColor: rightColor,
          }}
        >
          <span className="text-2xl font-bold text-white">
            {rightPercentage}%
          </span>
        </div>
      </div>

      {/* 票数 */}
      <div className="flex items-center justify-between mt-4 text-xl">
        <div style={{ color: leftColor }}>{left.count} 票</div>
        <div className="text-white/60">共 {totalVotes} 票</div>
        <div style={{ color: rightColor }}>{right.count} 票</div>
      </div>
    </div>
  );
}

/**
 * 根据类型渲染图表
 */
interface VoteChartProps extends ChartProps {
  chartType: 'pie' | 'bar' | 'progress' | 'versus';
  versusConfig?: {
    leftColor: string;
    rightColor: string;
  };
}

export function VoteChart({
  chartType,
  versusConfig,
  ...props
}: VoteChartProps) {
  switch (chartType) {
    case 'pie':
      return <PieChart {...props} />;
    case 'bar':
      return <BarChart {...props} />;
    case 'progress':
      return <ProgressChart {...props} />;
    case 'versus':
      return (
        <VersusChart
          {...props}
          leftColor={versusConfig?.leftColor}
          rightColor={versusConfig?.rightColor}
        />
      );
    default:
      return <BarChart {...props} />;
  }
}

