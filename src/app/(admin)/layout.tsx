'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: '控制台', href: '/dashboard', icon: LayoutDashboard },
  { name: '签到', href: '/checkins', icon: UserCheck },
  { name: '投票', href: '/votes', icon: Vote, disabled: true },
  { name: '抽奖', href: '/lotteries', icon: Gift, disabled: true },
  { name: '表单', href: '/forms', icon: FileText, disabled: true },
  { name: '项目', href: '/projects', icon: FolderKanban, disabled: true },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
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
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-card border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">M</span>
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

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.disabled ? '#' : item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  item.disabled && 'opacity-50 cursor-not-allowed'
                )}
                onClick={(e) => item.disabled && e.preventDefault()}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
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

        {/* Settings link at bottom */}
        <div className="border-t border-border p-3">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Settings className="h-5 w-5" />
            设置
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-4 lg:px-6">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1" />
          
          {/* 可以添加用户头像、通知等 */}
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/50 to-emerald-500/50 flex items-center justify-center">
              <span className="text-xs font-medium">U</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

