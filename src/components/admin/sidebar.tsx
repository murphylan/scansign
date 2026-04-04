"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Settings, LogOut, Crown, Clock, MonitorCog } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import type { SessionUser } from "@/components/auth/auth-guard";
import { navigation } from "./nav-config";

interface SidebarProps {
  user: SessionUser;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-linear-to-br from-primary to-amber-500 flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">M</span>
          </div>
          <span className="text-lg font-semibold">Murphy</span>
        </Link>
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
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary/50 to-amber-500/50 flex items-center justify-center shrink-0">
            <span className="text-xs font-medium">
              {user.nickname?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user.nickname || user.email.split("@")[0]}
            </p>
            <div className="flex items-center gap-2">
              {user.role === "ADMIN" ? (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                  <Crown className="h-3 w-3" />
                  管理员
                </span>
              ) : user.hasActivePaidSubscription ? (
                <span className="text-xs text-primary">付费用户</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                  <Clock className="h-3 w-3" />
                  试用 {user.trialDaysRemaining} 天
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border my-2" />

        {user.isOpsConsoleUser && (
          <Link
            href="/ops/console"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname.startsWith("/ops")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <MonitorCog className="h-5 w-5" />
            用户运营台
          </Link>
        )}

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
  );
}
