"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  UserCheck,
  Vote,
  Gift,
  FileText,
  ChevronRight,
  Zap,
  BarChart3,
  QrCode,
  Monitor,
  Megaphone,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { bottomNavItems } from "@/components/admin/nav-config";

// 金刚区四大工具 —— 统一的“浅底色块 + 品牌色图标”，克制、专业
const features = [
  { name: "签到", description: "扫码签到", href: "/apps?tab=checkins", icon: UserCheck, tint: "bg-emerald-50", fg: "text-emerald-600" },
  { name: "投票", description: "实时投票", href: "/apps?tab=votes", icon: Vote, tint: "bg-blue-50", fg: "text-blue-600" },
  { name: "抽奖", description: "现场抽奖", href: "/apps?tab=lotteries", icon: Gift, tint: "bg-amber-50", fg: "text-amber-600" },
  { name: "表单", description: "信息收集", href: "/apps?tab=forms", icon: FileText, tint: "bg-violet-50", fg: "text-violet-600" },
];

const capabilities = [
  { icon: QrCode, label: "扫码参与", desc: "参与者扫码即可参与" },
  { icon: Monitor, label: "大屏展示", desc: "活动现场实时展示" },
  { icon: BarChart3, label: "数据统计", desc: "参与数据实时汇总" },
  { icon: Zap, label: "即时创建", desc: "3 分钟创建互动活动" },
];

const featureDetails = [
  { name: "签到", icon: UserCheck, tint: "bg-emerald-50", fg: "text-emerald-600", desc: "扫码签到，大屏互动，实时统计，支持多种签到墙样式", href: "/apps?tab=checkins" },
  { name: "投票", icon: Vote, tint: "bg-blue-50", fg: "text-blue-600", desc: "单选多选，实时结果展示，数据可视化，支持匿名投票", href: "/apps?tab=votes" },
  { name: "抽奖", icon: Gift, tint: "bg-amber-50", fg: "text-amber-600", desc: "转盘抽奖，多轮设置，精彩动画效果，现场互动利器", href: "/apps?tab=lotteries" },
  { name: "表单", icon: FileText, tint: "bg-violet-50", fg: "text-violet-600", desc: "自定义字段，信息收集，提交预览，数据导出下载", href: "/apps?tab=forms" },
];

export default function HomePage() {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-page flex flex-col">
      {/* 品牌横幅 —— 企业级红色顶区 */}
      <header
        className="relative bg-gradient-to-b from-primary to-[oklch(0.44_0.19_25)] px-5 pb-14 text-white"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25">
              <span className="text-base font-bold">S</span>
            </div>
            <span className="text-xl font-bold tracking-tight">Sign</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium ring-1 ring-white/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            企业级
          </span>
        </div>
        <p className="mt-4 text-[15px] font-medium text-white/95">全场景活动互动平台</p>
        <p className="mt-1 text-xs text-white/70">签到 · 投票 · 抽奖 · 表单，扫码即用，数据安全合规</p>
      </header>

      {/* Content */}
      <main className="relative flex-1 pb-[76px]">
        {/* 金刚区 —— 上浮覆盖横幅 */}
        <section className="px-4 -mt-9">
          <div className="rounded-2xl bg-cell p-5 shadow-md">
            <div className="grid grid-cols-4 gap-2">
              {features.map((f) => (
                <Link
                  key={f.name}
                  href={f.href}
                  className="flex flex-col items-center gap-2 rounded-xl py-1.5 transition-colors active:bg-muted"
                >
                  <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", f.tint)}>
                    <f.icon className={cn("h-7 w-7", f.fg)} strokeWidth={1.9} />
                  </div>
                  <div className="text-center leading-tight">
                    <p className="text-[13px] font-medium text-foreground">{f.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{f.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 公告条 */}
        <section className="px-4 mt-3">
          <div className="flex items-center gap-2 rounded-xl bg-cell px-4 py-3 shadow-sm">
            <Megaphone className="h-4 w-4 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 truncate text-[13px] text-foreground">
              支持签到墙、实时开票、转盘抽奖、信息收集，扫码即用
            </p>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
          </div>
        </section>

        {/* 平台能力 */}
        <section className="px-4 mt-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-[15px] font-semibold text-foreground">平台能力</h3>
          </div>
          <div className="rounded-2xl bg-cell p-4 shadow-sm">
            <div className="grid grid-cols-4 gap-2">
              {capabilities.map((c) => (
                <div key={c.label} className="flex flex-col items-center gap-1.5 py-1.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/8">
                    <c.icon className="h-[18px] w-[18px] text-primary" strokeWidth={1.9} />
                  </div>
                  <p className="text-[11px] font-medium text-foreground">{c.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 功能详情 */}
        <section className="px-4 mt-5">
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-[15px] font-semibold text-foreground">功能详情</h3>
            <span className="text-xs text-muted-foreground">共 4 项</span>
          </div>
          <div className="overflow-hidden rounded-2xl bg-cell shadow-sm [&>*:last-child]:after:hidden">
            {featureDetails.map((f) => (
              <Link
                key={f.name}
                href={f.href}
                className="weui-hairline-bottom weui-hairline-inset relative flex items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-muted"
              >
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", f.tint)}>
                  <f.icon className={cn("h-[22px] w-[22px]", f.fg)} strokeWidth={1.9} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-foreground">{f.name}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{f.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              </Link>
            ))}
          </div>
        </section>

        {/* Footer */}
        <p className="px-4 pb-4 pt-8 text-center text-xs text-muted-foreground">
          Sign · 企业级活动互动平台
        </p>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-cell">
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
                  active ? "text-primary" : "text-muted-foreground active:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-primary" />
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
