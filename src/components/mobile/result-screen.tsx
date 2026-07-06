"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "danger" | "primary" | "gold" | "neutral";

const toneCircle: Record<Tone, string> = {
  success: "bg-emerald-500 text-white",
  danger: "bg-destructive text-white",
  primary: "bg-primary text-white",
  gold: "bg-accent text-accent-foreground",
  neutral: "bg-muted text-muted-foreground",
};

/**
 * ResultScreen — WeUI 结果/提示整页（loading 除外）。
 * 大图标圆底 + 标题 + 说明 + 自定义内容 + 底部动作。
 * 统一签到/投票/抽奖/表单四页的 error / expired / success 态。
 */
export function ResultScreen({
  icon,
  tone = "primary",
  title,
  description,
  children,
  actions,
  className,
}: {
  icon: React.ReactNode;
  tone?: Tone;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center bg-page px-8 text-center",
        className
      )}
    >
      <div
        className={cn(
          "animate-fade-in-up mb-6 flex h-20 w-20 items-center justify-center rounded-full shadow-lg [&_svg]:h-10 [&_svg]:w-10",
          toneCircle[tone]
        )}
      >
        {icon}
      </div>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {children && <div className="mt-6 w-full max-w-xs">{children}</div>}
      {actions && (
        <div className="mt-8 w-full max-w-xs space-y-3">{actions}</div>
      )}
    </div>
  );
}
