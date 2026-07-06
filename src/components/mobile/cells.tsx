"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 无边框输入类 —— 用于放进 WeUI cell / Field 里的 <Input>/<Select>，
 * 让 cell 本身提供分隔，输入框不再自带边框方框。
 * 用法：<Input className={bareInputClass} … />
 */
export const bareInputClass =
  "h-11 w-full rounded-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:border-0 focus-visible:ring-0 disabled:opacity-50";

/**
 * Cells — WeUI cell 分组容器（圆角白块），子项间自动发丝线分隔、末项无线。
 */
export function Cells({
  children,
  className,
  inset = true,
}: {
  children: React.ReactNode;
  className?: string;
  inset?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-cell [&>*:last-child]:after:hidden",
        inset && "mx-4",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Cell — WeUI cell 行。可点（onClick → 按钮态）、可带图标/说明/右值/箭头。
 */
export function Cell({
  icon,
  title,
  description,
  value,
  arrow = false,
  onClick,
  className,
  children,
}: {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  value?: React.ReactNode;
  arrow?: boolean;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const interactive = !!onClick;
  const Comp: React.ElementType = interactive ? "button" : "div";
  return (
    <Comp
      type={interactive ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "weui-hairline-bottom weui-hairline-inset relative flex w-full items-center gap-3 bg-cell px-4 py-3 text-left",
        interactive && "active:bg-muted",
        className
      )}
    >
      {icon && (
        <span className="flex shrink-0 items-center text-primary">{icon}</span>
      )}
      <div className="min-w-0 flex-1">
        {title && <div className="text-base text-foreground">{title}</div>}
        {description && (
          <div className="mt-0.5 text-sm text-muted-foreground">
            {description}
          </div>
        )}
        {children}
      </div>
      {value != null && (
        <div className="shrink-0 text-sm text-muted-foreground">{value}</div>
      )}
      {arrow && (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
      )}
    </Comp>
  );
}

/**
 * Field — WeUI 表单 cell。inline：label 左定宽 + 控件填充；stacked：label 在上。
 * 控件建议传 bareInputClass 的 <Input>/<Select>。
 */
export function Field({
  label,
  required = false,
  hint,
  htmlFor,
  icon,
  layout = "inline",
  className,
  children,
}: {
  label?: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  htmlFor?: string;
  icon?: React.ReactNode;
  layout?: "inline" | "stacked";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "weui-hairline-bottom weui-hairline-inset relative bg-cell px-4 py-1",
        className
      )}
    >
      <div
        className={cn(
          layout === "inline" ? "flex items-center gap-3" : "space-y-1 py-1.5"
        )}
      >
        {label && (
          <label
            htmlFor={htmlFor}
            className={cn(
              "flex items-center gap-1.5 text-base text-foreground",
              layout === "inline" && "w-24 shrink-0 py-2.5"
            )}
          >
            {icon}
            {label}
            {required && <span className="text-primary">*</span>}
          </label>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {hint && <p className="pb-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
