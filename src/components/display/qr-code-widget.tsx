'use client';

import { cn } from '@/lib/utils';
import { QRPosition } from '@/types/common';

interface QRCodeWidgetProps {
  qrCodeUrl: string;
  position: QRPosition;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-24 h-24',
  md: 'w-36 h-36',
  lg: 'w-48 h-48',
};

const positionMap: Record<QRPosition, string> = {
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'top-right': 'top-4 right-4',
  'middle-left': 'top-1/2 -translate-y-1/2 left-4',
  'middle-center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  'middle-right': 'top-1/2 -translate-y-1/2 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
  'hidden': 'hidden',
};

export function QRCodeWidget({
  qrCodeUrl,
  position,
  size = 'md',
  className,
}: QRCodeWidgetProps) {
  if (position === 'hidden') {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute z-20 p-3 rounded-2xl bg-white/95 backdrop-blur shadow-2xl',
        positionMap[position],
        className
      )}
    >
      <img
        src={qrCodeUrl}
        alt="扫码签到"
        className={cn('rounded-xl', sizeMap[size])}
      />
      <p className="text-center text-xs text-gray-500 mt-2 font-medium">
        扫码签到
      </p>
    </div>
  );
}

// 导出一个可以渲染在任意位置的组件
export function QRCodeInline({
  qrCodeUrl,
  size = 'md',
  className,
}: Omit<QRCodeWidgetProps, 'position'>) {
  return (
    <div
      className={cn(
        'p-4 rounded-2xl bg-white shadow-xl inline-block',
        className
      )}
    >
      <img
        src={qrCodeUrl}
        alt="扫码签到"
        className={cn('rounded-xl', sizeMap[size])}
      />
      <p className="text-center text-xs text-gray-500 mt-2 font-medium">
        扫码签到
      </p>
    </div>
  );
}

