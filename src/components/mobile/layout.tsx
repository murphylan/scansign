"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * LoadingScreen — WeUI 全屏加载态（四页共用）。
 */
export function LoadingScreen({ text = "加载中..." }: { text?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-page">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

/**
 * MobilePage — WeUI 微信风格页面外壳。
 * 灰底、移动端优先；大屏时内容居中为一列（大屏可选，直接投屏）。
 */
export function MobilePage({
  children,
  className,
  contentClassName,
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className={cn("min-h-screen bg-page text-foreground", className)}>
      <div
        className={cn(
          "mx-auto flex min-h-screen w-full max-w-md flex-col",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * NavBar — WeUI 顶部标题栏。白底、居中标题、底部发丝线、粘顶（含刘海安全区）。
 */
export function NavBar({
  title,
  subtitle,
  left,
  right,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn("weui-hairline-bottom sticky top-0 z-20 bg-cell", className)}
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="relative flex h-12 items-center justify-center px-12">
        {left && <div className="absolute left-1 flex items-center">{left}</div>}
        <div className="flex min-w-0 flex-col items-center leading-tight">
          <h1 className="max-w-full truncate text-[17px] font-medium text-foreground">
            {title}
          </h1>
          {subtitle && (
            <span className="max-w-full truncate text-xs text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
        {right && (
          <div className="absolute right-1 flex items-center">{right}</div>
        )}
      </div>
    </header>
  );
}

/**
 * SectionTitle — WeUI cell 分组上方的小灰标题。
 */
export function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-5 pb-2 pt-5 text-sm text-muted-foreground", className)}>
      {children}
    </div>
  );
}

/**
 * BottomAction — 底部主操作区，含 iOS 底部安全区。可选粘底。
 */
export function BottomAction({
  children,
  className,
  sticky = false,
}: {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <div
      className={cn(
        "px-4 pt-3",
        sticky && "sticky bottom-0 z-20 bg-page/95 backdrop-blur",
        className
      )}
      style={{ paddingBottom: "calc(var(--safe-bottom) + 0.75rem)" }}
    >
      {children}
    </div>
  );
}
