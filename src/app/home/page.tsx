"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, PartyPopper, Calendar, MapPin } from "lucide-react";
import type { RegisteredUser } from "@/types";

interface Danmaku {
  id: string;
  text: string;
  top: number;
  duration: number;
  color: string;
}

interface Star {
  id: number;
  left: string;
  top: string;
  delay: string;
  duration: string;
}

const COLORS = [
  "text-primary",
  "text-pink-400",
  "text-cyan-400",
  "text-yellow-400",
  "text-green-400",
  "text-purple-400",
  "text-orange-400",
];

export default function HomePage() {
  const [danmakus, setDanmakus] = useState<Danmaku[]>([]);
  const [stars, setStars] = useState<Star[]>([]);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const danmakuIdRef = useRef(0);

  // 客户端生成星星，避免 hydration 不匹配
  useEffect(() => {
    setMounted(true);
    const generatedStars: Star[] = [];
    for (let i = 0; i < 50; i++) {
      generatedStars.push({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${2 + Math.random() * 2}s`,
      });
    }
    setStars(generatedStars);
  }, []);

  // 添加弹幕
  const addDanmaku = (username: string) => {
    const id = `danmaku_${danmakuIdRef.current++}`;
    const containerHeight = containerRef.current?.clientHeight || 600;
    const top = Math.random() * (containerHeight - 100) + 50;
    const duration = 8 + Math.random() * 4; // 8-12秒
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const newDanmaku: Danmaku = {
      id,
      text: `🎉 欢迎 ${username} 加入！`,
      top,
      duration,
      color,
    };

    setDanmakus((prev) => [...prev, newDanmaku]);

    // 动画结束后移除
    setTimeout(() => {
      setDanmakus((prev) => prev.filter((d) => d.id !== id));
    }, duration * 1000);
  };

  // 监听 SSE 新用户注册
  useEffect(() => {
    const eventSource = new EventSource("/api/user/stream");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "register" && data.user) {
          const user = data.user as RegisteredUser;
          addDanmaku(user.username);
        }
      } catch (err) {
        console.error("Parse SSE error:", err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      // 5秒后重连
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    };

    return () => {
      eventSource.close();
    };
  }, []);


  return (
    <main 
      ref={containerRef}
      className="min-h-screen relative overflow-hidden"
    >
      {/* 背景 */}
      <div className="absolute inset-0 bg-linear-to-br from-[#0a0a1a] via-[#1a1a3a] to-[#0a1a2a]" />
      
      {/* 星空效果 */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden">
          {stars.map((star) => (
            <div
              key={star.id}
              className="absolute w-1 h-1 rounded-full bg-white/60 animate-pulse"
              style={{
                left: star.left,
                top: star.top,
                animationDelay: star.delay,
                animationDuration: star.duration,
              }}
            />
          ))}
        </div>
      )}

      {/* 装饰光晕 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px]" />

      {/* 弹幕层 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {danmakus.map((danmaku) => (
          <div
            key={danmaku.id}
            className={`absolute whitespace-nowrap text-xl font-bold ${danmaku.color} drop-shadow-lg`}
            style={{
              top: danmaku.top,
              right: "-400px",
              animation: `danmaku-slide ${danmaku.duration}s linear forwards`,
            }}
          >
            {danmaku.text}
          </div>
        ))}
      </div>

      {/* 主内容 */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
        {/* 顶部装饰 */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          <span className="text-primary/80 text-sm tracking-widest uppercase">Welcome to</span>
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
        </div>

        {/* 主标题 */}
        <div className="text-center space-y-8 animate-fade-in-up">
          {/* 年份标签 */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">2026</span>
          </div>

          {/* 大标题 */}
          <h1 className="text-6xl md:text-8xl font-bold">
            <span className="bg-gradient-to-r from-primary via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              嘉年华
            </span>
          </h1>

          {/* 副标题 */}
          <p className="text-2xl md:text-3xl text-foreground/60 font-light tracking-wide">
            年度盛典 · 共创未来
          </p>

          {/* 装饰线 */}
          <div className="flex items-center justify-center gap-4 py-4">
            <div className="w-24 h-px bg-gradient-to-r from-transparent to-primary/50" />
            <PartyPopper className="w-8 h-8 text-primary animate-bounce" />
            <div className="w-24 h-px bg-gradient-to-l from-transparent to-primary/50" />
          </div>

          {/* 地点信息 */}
          <div className="flex items-center justify-center gap-2 text-foreground/40">
            <MapPin className="w-4 h-4" />
            <span>线上会议 · 全员参与</span>
          </div>
        </div>

        {/* 底部统计 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-foreground/60">实时签到中</span>
          </div>
        </div>
      </div>

      {/* 弹幕动画样式 */}
      <style jsx>{`
        @keyframes danmaku-slide {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(calc(-100vw - 400px));
          }
        }
      `}</style>
    </main>
  );
}

