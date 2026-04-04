"use client";

import Link from "next/link";

import { Clock, CreditCard, LogOut } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { PRICING_PLANS, BILLING_CONTACT_PHONE, BILLING_OFFLINE_PAYMENT_NOTE } from "@/lib/pricing";

export default function ExpiredPage() {
  const { logout } = useAuth();

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-500/20 mb-6">
        <Clock className="h-10 w-10 text-orange-400" />
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">试用期已结束</h1>
      <p className="text-white/60 mb-4">
        你的免费试用（最长 14 天，以账户开通日为准）已结束。
        <br />
        续用请<span className="text-white/90">线下联系开通付费套餐</span>。
      </p>

      <div className="text-left rounded-xl bg-black/20 border border-white/10 p-4 mb-4 text-sm text-white/80 space-y-2">
        <p className="font-medium text-white/90">套餐参考</p>
        <ul className="space-y-1">
          {PRICING_PLANS.map((p) => (
            <li key={p.id} className="flex justify-between">
              <span>{p.label}</span>
              <span>
                ¥{p.priceYuan}/{p.period}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-white/60 pt-2 text-xs leading-relaxed">{BILLING_OFFLINE_PAYMENT_NOTE}</p>
      </div>

      <div className="space-y-4">
        <Link
          href={`tel:${BILLING_CONTACT_PHONE}`}
          className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium flex items-center justify-center gap-2 transition"
        >
          <CreditCard className="h-5 w-5" />
          致电 {BILLING_CONTACT_PHONE}（微信同号）
        </Link>

        <button
          onClick={logout}
          className="w-full py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 font-medium flex items-center justify-center gap-2 transition border border-white/20"
        >
          <LogOut className="h-5 w-5" />
          退出登录
        </button>
      </div>

      <p className="mt-6 text-sm text-white/40">如有问题欢迎添加微信沟通</p>
    </div>
  );
}
