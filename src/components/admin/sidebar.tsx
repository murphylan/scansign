"use client";

// 1. React
import { useState } from "react";

// 2. Next.js
import Link from "next/link";
import { usePathname } from "next/navigation";

// 3. Third-party
import {
  LayoutDashboard,
  UserCheck,
  Vote,
  Gift,
  FileText,
  FolderKanban,
  Settings,
  Menu,
  X,
  LogOut,
  Crown,
  Clock,
} from "lucide-react";

// 4. Internal
import { cn } from "@/lib/utils";

// 5. Hooks
import { useAuth } from "@/hooks/use-auth";

// ================================
// 类型定义
// ================================

interface User {
  id: string;
  email: string;
  nickname: string | null;
  role: "USER" | "ADMIN";
  trialDaysRemaining: number;
  canUseService: boolean;
  isPaid: boolean;
}

interface SidebarProps {
  user: User;
}

// ================================
// 导航配置
// ================================

const navigation = [
  { name: "控制台", href: "/dashboard", icon: LayoutDashboard },
  { name: "签到", href: "/checkins", icon: UserCheck },
  { name: "投票", href: "/votes", icon: Vote },
  { name: "表单", href: "/forms", icon: FileText },
  { name: "抽奖", href: "/lotteries", icon: Gift },
  { name: "项目", href: "/projects", icon: FolderKanban, disabled: true },
];

// ================================
// 组件
// ================================

export function Sidebar({ user }: SidebarProps) {
  // 1. Hooks
  const pathname = usePathname();
  const { logout } = useAuth();

  // 2. State
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 3. Render
  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-card border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">
                M
              </span>
            </div>
            <span className="text-lg font-semibold">Murphy</span>
          </Link>
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/50 to-emerald-500/50 flex items-center justify-center">
              <span className="text-sm font-medium">
                {user.nickname?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.nickname || user.email.split("@")[0]}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>

          {/* 角色/试用期标签 */}
          <div className="mt-2">
            {user.role === "ADMIN" ? (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-500/20 text-amber-600 px-2 py-1 rounded-full">
                <Crown className="h-3 w-3" />
                管理员
              </span>
            ) : user.isPaid ? (
              <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-600 px-2 py-1 rounded-full">
                付费用户
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs bg-blue-500/20 text-blue-600 px-2 py-1 rounded-full">
                <Clock className="h-3 w-3" />
                试用期剩余 {user.trialDaysRemaining} 天
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.disabled ? "#" : item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  item.disabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={(e) => item.disabled && e.preventDefault()}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {item.name}
                {item.disabled && (
                  <span className="ml-auto text-xs bg-secondary px-2 py-0.5 rounded">
                    即将推出
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border p-3 space-y-1">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Settings className="h-5 w-5" />
            设置
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            退出登录
          </button>
        </div>
      </aside>

      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-30 lg:hidden">
        <button
          className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}
