"use client";

import * as React from "react";
import { Loader2, Trash2, AlertTriangle, HelpCircle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ================================
// 类型定义
// ================================

export type ConfirmVariant = "default" | "danger" | "warning";

export interface ConfirmDialogProps {
  /** 触发弹框的元素 */
  trigger?: React.ReactNode;
  /** 弹框标题 */
  title: string;
  /** 弹框描述 */
  description?: string;
  /** 确认按钮文字 */
  confirmText?: string;
  /** 取消按钮文字 */
  cancelText?: string;
  /** 弹框变体类型 */
  variant?: ConfirmVariant;
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 是否禁用确认按钮 */
  disabled?: boolean;
  /** 确认回调 */
  onConfirm: () => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
  /** 受控模式：是否打开 */
  open?: boolean;
  /** 受控模式：打开状态变化回调 */
  onOpenChange?: (open: boolean) => void;
  /** 子元素 (作为额外内容) */
  children?: React.ReactNode;
}

export interface DeleteConfirmProps {
  /** 实体名称，用于显示在描述中 */
  entityName?: string;
  /** 触发弹框的元素，默认为删除按钮 */
  trigger?: React.ReactNode;
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 确认删除回调 */
  onConfirm: () => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
  /** 受控模式：是否打开 */
  open?: boolean;
  /** 受控模式：打开状态变化回调 */
  onOpenChange?: (open: boolean) => void;
}

// ================================
// 图标映射
// ================================

const iconMap: Record<ConfirmVariant, React.ReactNode> = {
  default: <HelpCircle className="h-5 w-5 text-blue-500" />,
  danger: <AlertTriangle className="h-5 w-5 text-destructive" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
};

const buttonVariantMap: Record<ConfirmVariant, "default" | "destructive"> = {
  default: "default",
  danger: "destructive",
  warning: "destructive",
};

// ================================
// ConfirmDialog 组件
// ================================

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  variant = "default",
  showIcon = true,
  isLoading = false,
  disabled = false,
  onConfirm,
  onCancel,
  open,
  onOpenChange,
  children,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  // 支持受控和非受控模式
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

  const handleConfirm = React.useCallback(async () => {
    try {
      setIsPending(true);
      await onConfirm();
      setIsOpen?.(false);
    } finally {
      setIsPending(false);
    }
  }, [onConfirm, setIsOpen]);

  const handleCancel = React.useCallback(() => {
    onCancel?.();
    setIsOpen?.(false);
  }, [onCancel, setIsOpen]);

  const loading = isLoading || isPending;

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle
            className={cn("flex items-center gap-2", {
              "text-destructive": variant === "danger",
              "text-yellow-600": variant === "warning",
            })}
          >
            {showIcon && iconMap[variant]}
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {children && <div className="py-2">{children}</div>}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={loading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={disabled || loading}
            className={cn({
              "bg-destructive text-destructive-foreground hover:bg-destructive/90":
                variant === "danger" || variant === "warning",
            })}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ================================
// DeleteConfirm 组件
// ================================

export function DeleteConfirm({
  entityName,
  trigger,
  isLoading = false,
  onConfirm,
  onCancel,
  open,
  onOpenChange,
}: DeleteConfirmProps) {
  const defaultTrigger = (
    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  const description = entityName
    ? `确定要删除「${entityName}」吗？此操作无法撤销。`
    : "确定要删除吗？此操作无法撤销。";

  return (
    <ConfirmDialog
      trigger={trigger ?? defaultTrigger}
      title="确认删除"
      description={description}
      confirmText="删除"
      cancelText="取消"
      variant="danger"
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}

// ================================
// useConfirm Hook
// ================================

export interface UseConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

export function useConfirm(options: UseConfirmOptions) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback(() => {
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    resolveRef.current?.(true);
    setIsOpen(false);
  }, []);

  const handleCancel = React.useCallback(() => {
    resolveRef.current?.(false);
    setIsOpen(false);
  }, []);

  const ConfirmDialogComponent = React.useCallback(
    () => (
      <ConfirmDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={options.title}
        description={options.description}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        variant={options.variant}
        isLoading={isLoading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
    [isOpen, isLoading, options, handleConfirm, handleCancel]
  );

  return {
    confirm,
    isOpen,
    isLoading,
    setIsLoading,
    ConfirmDialog: ConfirmDialogComponent,
  };
}

