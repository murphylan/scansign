"use client";

// 1. Third-party
import { Clock, CreditCard, LogOut } from "lucide-react";

// 2. Hooks
import { useAuth } from "@/hooks/use-auth";

export default function ExpiredPage() {
  // 1. Hooks
  const { logout } = useAuth();

  // 2. Render
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-500/20 mb-6">
        <Clock className="h-10 w-10 text-orange-400" />
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">试用期已结束</h1>
      <p className="text-white/60 mb-8">
        您的 3 天免费试用期已结束。
        <br />
        请升级到付费版本以继续使用所有功能。
      </p>

      <div className="space-y-4">
        <button className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium flex items-center justify-center gap-2 transition">
          <CreditCard className="h-5 w-5" />
          升级到付费版
        </button>

        <button
          onClick={logout}
          className="w-full py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 font-medium flex items-center justify-center gap-2 transition border border-white/20"
        >
          <LogOut className="h-5 w-5" />
          退出登录
        </button>
      </div>

      <p className="mt-6 text-sm text-white/40">
        如有问题，请联系客服：support@murphy.com
      </p>
    </div>
  );
}
