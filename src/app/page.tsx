"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  UserCheck,
  Vote,
  Gift,
  FileText,
  ChevronRight,
  Sparkles,
  Zap,
  BarChart3,
  QrCode,
  Monitor,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { bottomNavItems } from "@/components/admin/nav-config";

const features = [
  {
    name: "签到",
    description: "扫码签到",
    href: "/apps?tab=checkins",
    icon: UserCheck,
    color: "bg-emerald-500",
  },
  {
    name: "投票",
    description: "实时投票",
    href: "/apps?tab=votes",
    icon: Vote,
    color: "bg-blue-500",
  },
  {
    name: "抽奖",
    description: "现场抽奖",
    href: "/apps?tab=lotteries",
    icon: Gift,
    color: "bg-orange-500",
  },
  {
    name: "表单",
    description: "信息收集",
    href: "/apps?tab=forms",
    icon: FileText,
    color: "bg-purple-500",
  },
];

const highlights = [
  { icon: QrCode, label: "扫码参与", desc: "参与者扫码即可参与" },
  { icon: Monitor, label: "大屏展示", desc: "活动现场实时展示" },
  { icon: BarChart3, label: "数据统计", desc: "参与数据实时汇总" },
  { icon: Zap, label: "即时创建", desc: "3分钟创建互动活动" },
];

const featureDetails = [
  {
    name: "签到",
    icon: UserCheck,
    color: "bg-emerald-500",
    desc: "扫码签到，大屏互动，实时统计，支持多种签到墙样式",
    href: "/apps?tab=checkins",
  },
  {
    name: "投票",
    icon: Vote,
    color: "bg-blue-500",
    desc: "单选多选，实时结果展示，数据可视化，支持匿名投票",
    href: "/apps?tab=votes",
  },
  {
    name: "抽奖",
    icon: Gift,
    color: "bg-orange-500",
    desc: "转盘抽奖，多轮设置，精彩动画效果，现场互动利器",
    href: "/apps?tab=lotteries",
  },
  {
    name: "表单",
    icon: FileText,
    color: "bg-purple-500",
    desc: "自定义字段，信息收集，提交预览，数据导出下载",
    href: "/apps?tab=forms",
  },
];

export default function HomePage() {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 h-12 bg-card border-b border-border">
        <div className="flex items-center justify-center h-full px-4 relative">
          <div className="absolute left-4 flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-md bg-linear-to-br from-primary to-amber-500 flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">R</span>
          </div>
          </div>
          <h1 className="text-[15px] font-semibold">Rally</h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-[76px]">
        {/* Hero */}
        <div className="bg-linear-to-br from-primary/5 via-amber-500/5 to-background px-4 pt-8 pb-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-1">Rally 活动互动平台</h2>
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mt-2">
            <Sparkles className="h-3 w-3" />
            全场景活动互动平台
          </div>
        </div>

        {/* 金刚区 */}
        <div className="px-4 -mt-1">
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="grid grid-cols-4 gap-3">
              {features.map((f) => (
                <Link
                  key={f.name}
                  href={f.href}
                  className="flex flex-col items-center gap-2 py-2 rounded-xl active:bg-secondary transition-colors"
                >
                  <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shadow-sm", f.color)}>
                    <f.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold">{f.name}</p>
                    <p className="text-[10px] text-muted-foreground">{f.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Highlights */}
        <div className="px-4 mt-4">
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <div className="grid grid-cols-4 gap-2">
              {highlights.map((h) => (
                <div key={h.label} className="flex flex-col items-center gap-1.5 py-2">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <h.icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-[11px] font-medium text-center">{h.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Details */}
        <div className="px-4 mt-6">
          <h3 className="text-base font-semibold mb-3 px-1">功能介绍</h3>
          <div className="space-y-3">
            {featureDetails.map((f) => (
              <Link key={f.name} href={f.href}>
                <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4 active:bg-secondary transition-colors shadow-sm">
                  <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", f.color)}>
                    <f.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{f.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{f.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pt-8 pb-4 text-center">
          <p className="text-xs text-muted-foreground">Rally · 让活动更精彩</p>
        </div>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
        <div
          className="grid h-[60px]"
          style={{
            gridTemplateColumns: `repeat(${bottomNavItems.length}, 1fr)`,
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {bottomNavItems.map((item) => {
            const active = pathname === "/" && item.href === "/";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-primary" />
                )}
                <item.icon
                  className={cn("h-[22px] w-[22px]", active ? "text-primary" : "text-muted-foreground")}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span className={cn("text-[11px] leading-none", active ? "font-semibold" : "font-medium")}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
