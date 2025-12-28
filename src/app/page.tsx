'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  UserCheck,
  Vote,
  Gift,
  FileText,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const features = [
  {
    name: '签到',
    description: '扫码签到，大屏互动，实时统计',
    href: '/dashboard',
    icon: UserCheck,
    color: 'from-emerald-500 to-green-600',
    available: true,
  },
  {
    name: '投票',
    description: '单选多选，实时结果，数据可视化',
    href: '/votes',
    icon: Vote,
    color: 'from-blue-500 to-indigo-600',
    available: true,
  },
  {
    name: '抽奖',
    description: '多种模式，精彩动画，现场互动',
    href: '/lotteries',
    icon: Gift,
    color: 'from-orange-500 to-red-600',
    available: true,
  },
  {
    name: '表单',
    description: '信息收集，提交预览，数据导出',
    href: '/forms',
    icon: FileText,
    color: 'from-purple-500 to-pink-600',
    available: true,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            全场景互动工具
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Murphy{' '}
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              互动工具集
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            签到、投票、抽奖、表单，一站式满足各类活动互动需求
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="gap-2 text-lg px-8 h-14">
              进入控制台
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          {features.map((feature) => (
            <Link
              key={feature.name}
              href={feature.available ? feature.href : '#'}
              className={feature.available ? '' : 'cursor-not-allowed'}
              onClick={(e) => !feature.available && e.preventDefault()}
            >
              <Card
                className={`group h-full transition-all duration-300 ${
                  feature.available
                    ? 'hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1'
                    : 'opacity-60'
                }`}
              >
                <CardContent className="p-6">
                  <div
                    className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.available ? feature.description : '即将推出'}
                  </p>
                  {feature.available && (
                    <div className="flex items-center gap-1 text-primary text-sm font-medium mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      立即使用 <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Start */}
        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold mb-4">快速开始</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            只需简单几步，即可创建你的第一个互动活动
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-secondary/50">
              <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </span>
              <span>进入控制台</span>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground hidden md:block" />
            <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-secondary/50">
              <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </span>
              <span>创建活动</span>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground hidden md:block" />
            <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-secondary/50">
              <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </span>
              <span>分享二维码</span>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground hidden md:block" />
            <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-secondary/50">
              <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                4
              </span>
              <span>开始互动</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Murphy 互动工具集 · 让活动更精彩</p>
        </div>
      </footer>
    </div>
  );
}
