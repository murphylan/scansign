'use client';

import { cn } from '@/lib/utils';
import { Users, TrendingUp, Building } from 'lucide-react';

interface StatsWidgetProps {
  total: number;
  today?: number;
  byDepartment?: Record<string, number>;
  className?: string;
}

export function StatsWidget({
  total,
  today,
  byDepartment,
  className,
}: StatsWidgetProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-6 px-6 py-3 rounded-full bg-black/40 backdrop-blur-md text-white',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-emerald-400" />
        <span className="text-2xl font-bold">{total}</span>
        <span className="text-sm opacity-70">人已签到</span>
      </div>
      
      {today !== undefined && today !== total && (
        <div className="flex items-center gap-2 pl-6 border-l border-white/20">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          <span className="text-xl font-bold">{today}</span>
          <span className="text-sm opacity-70">今日签到</span>
        </div>
      )}
      
      {byDepartment && Object.keys(byDepartment).length > 0 && (
        <div className="flex items-center gap-2 pl-6 border-l border-white/20">
          <Building className="h-5 w-5 text-purple-400" />
          <span className="text-sm opacity-70">
            {Object.keys(byDepartment).length} 个部门
          </span>
        </div>
      )}
    </div>
  );
}

