"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, ArrowRight, Loader2 } from "lucide-react";

interface Particle {
  id: number;
  left: string;
  top: string;
  delay: string;
  duration: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username") || "用户";
  const department = searchParams.get("department") || "";
  const isNewUser = searchParams.get("isNew") === "true";
  
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mounted, setMounted] = useState(false);

  // 客户端生成粒子，避免 hydration 不匹配
  useEffect(() => {
    setMounted(true);
    const generatedParticles: Particle[] = [];
    for (let i = 0; i < 20; i++) {
      generatedParticles.push({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${3 + Math.random() * 2}s`,
      });
    }
    setParticles(generatedParticles);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景 */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/20 via-background to-accent/20" />
      
      {/* 装饰性粒子 */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-2 h-2 rounded-full bg-primary/30 animate-float"
              style={{
                left: particle.left,
                top: particle.top,
                animationDelay: particle.delay,
                animationDuration: particle.duration,
              }}
            />
          ))}
        </div>
      )}

      <Card className="w-full max-w-md relative animate-fade-in-up overflow-hidden">
        {/* 顶部装饰条 */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />
        
        <CardContent className="pt-12 pb-10 space-y-8 text-center">
          {/* 成功图标 */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-glow" />
            <div className="relative w-full h-full rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center shadow-xl">
              <CheckCircle2 className="w-12 h-12 text-primary-foreground" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-primary animate-float" />
          </div>

          {/* 欢迎信息 */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-foreground">
              {isNewUser ? "签到成功" : "登录成功"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {isNewUser ? "欢迎，" : "欢迎回来，"}
              <span className="text-primary font-semibold">{username}</span>
            </p>
            {department && (
              <p className="text-sm text-muted-foreground">
                {department}
              </p>
            )}
          </div>

          {/* 装饰线 */}
          <div className="flex items-center gap-4 px-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full h-12 text-base font-medium group"
            >
              进入控制台
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
            
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => window.location.href = "/"}
            >
              返回首页
            </Button>
          </div>

          {/* 提示信息 */}
          <p className="text-sm text-muted-foreground">
            您的登录信息已安全保存
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    }>
      <SuccessContent />
    </Suspense>
  );
}
