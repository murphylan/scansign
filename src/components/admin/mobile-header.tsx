"use client";

import { useState } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Settings,
  LogOut,
  Crown,
  Clock,
  MoreHorizontal,
  ChevronLeft,
  MonitorCog,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import type { SessionUser } from "@/components/auth/auth-guard";
import { navigation, bottomNavItems } from "./nav-config";

interface MobileHeaderProps {
  user: SessionUser;
}

const APP_ROUTE_PREFIXES = ["/checkins", "/votes", "/forms", "/lotteries"];

function resolvePageTitle(pathname: string): string {
  if (pathname === "/apps" || APP_ROUTE_PREFIXES.some((p) => pathname === p)) {
    return "应用";
  }
  if (pathname === "/me") return "我的";
  if (pathname === "/settings") return "设置";

  const sidebarMatch = navigation.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  if (sidebarMatch) return sidebarMatch.name;

  const bottomMatch = bottomNavItems.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  if (bottomMatch) return bottomMatch.name;

  return "Rally";
}

export function MobileHeader({ user }: MobileHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const pageTitle = resolvePageTitle(pathname);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-12 bg-card border-b border-border lg:hidden">
        <div className="flex items-center justify-between h-full px-4">
          {/* Left: back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-0.5 shrink-0 text-muted-foreground active:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">返回</span>
          </button>

          <h1 className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold">
            {pageTitle}
          </h1>

          <button
            className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-secondary transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed top-12 right-2 z-50 w-52 rounded-xl bg-card border border-border shadow-xl overflow-hidden lg:hidden">
            <div className="px-4 py-3 bg-secondary/40">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary/50 to-amber-500/50 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium">
                    {user.nickname?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.nickname || user.email.split("@")[0]}
                  </p>
                  {user.role === "ADMIN" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                      <Crown className="h-3 w-3" />
                      管理员
                    </span>
                  ) : user.hasActivePaidSubscription ? (
                    <span className="text-[11px] text-primary">付费用户</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-600">
                      <Clock className="h-3 w-3" />
                      试用 {user.trialDaysRemaining} 天
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-1.5">
              {user.isOpsConsoleUser && (
                <Link
                  href="/ops/console"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <MonitorCog className="h-4 w-4 text-muted-foreground" />
                  用户运营台（桌面）
                </Link>
              )}
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                设置
              </Link>
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
                退出登录
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
