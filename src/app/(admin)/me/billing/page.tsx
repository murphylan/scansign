"use client";

import Link from "next/link";

import { ChevronLeft, Phone, MessageCircle, ShieldCheck } from "lucide-react";

import { useUser } from "@/components/auth/auth-guard";
import {
  PRICING_PLANS,
  BILLING_CONTACT_PHONE,
  BILLING_OFFLINE_PAYMENT_NOTE,
  subscriptionPlanLabel,
} from "@/lib/pricing";

const COMMITMENTS = [
  "为你提供签到、投票、表单、抽奖等互动能力的稳定使用环境。",
  "付费周期内持续修复影响使用的缺陷，重大变更会提前说明。",
  "你的活动与参与数据归属你本人，我们不在未授权情况下向第三方出售数据。",
  "线下付款确认后，在约定时间内为你开通或续期对应套餐。",
];

export default function MeBillingPage() {
  const user = useUser();

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">
      <Link
        href="/me"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        返回我的
      </Link>

      <div>
        <h1 className="text-lg font-bold">订阅与付款说明</h1>
        <p className="text-xs text-muted-foreground mt-1">线下支付 · 详见下文联系方式</p>
      </div>

      {/* 当前权益摘要 */}
      <div className="rounded-2xl border border-border bg-card p-4 text-sm space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          我的当前状态
        </h2>
        {user.role === "ADMIN" ? (
          <p>运营管理员账号，无试用/订阅到期限制。</p>
        ) : user.hasActivePaidSubscription ? (
          <>
            <p>套餐：{subscriptionPlanLabel(user.subscriptionPlan)}</p>
            {user.subscriptionEndsAt ? (
              <p>
                到期日：
                {new Date(user.subscriptionEndsAt).toLocaleDateString("zh-CN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })}
              </p>
            ) : (
              <p>当前付费权益有效（未设置截止日期）。</p>
            )}
          </>
        ) : (
          <>
            <p>
              试用结束日：
              {new Date(user.trialEndsAtIso).toLocaleDateString("zh-CN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })}
            </p>
            <p className="text-muted-foreground">剩余试用约 {user.trialDaysRemaining} 天</p>
          </>
        )}
      </div>

      {/* 定价 */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          定价
        </h2>
        <ul className="space-y-2">
          {PRICING_PLANS.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5"
            >
              <span className="text-sm font-medium">{p.label}</span>
              <span className="text-sm">
                ¥{p.priceYuan}
                <span className="text-muted-foreground text-xs ml-1">/{p.period}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* 承诺 */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          我们的承诺
        </h2>
        <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
          {COMMITMENTS.map((c, i) => (
            <li key={i} className="leading-relaxed">
              {c}
            </li>
          ))}
        </ul>
      </div>

      {/* 付费方式 */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm space-y-2">
        <h2 className="font-semibold text-foreground">付费方式</h2>
        <p className="text-muted-foreground leading-relaxed">{BILLING_OFFLINE_PAYMENT_NOTE}</p>
      </div>

      {/* 联系我 */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
        <h2 className="text-sm font-semibold">联系我</h2>
        <div className="flex flex-col gap-2 text-sm">
          <a
            href={`tel:${BILLING_CONTACT_PHONE}`}
            className="inline-flex items-center gap-2 text-primary font-medium"
          >
            <Phone className="h-4 w-4 shrink-0" />
            {BILLING_CONTACT_PHONE}
          </a>
          <p className="flex items-start gap-2 text-muted-foreground">
            <MessageCircle className="h-4 w-4 shrink-0 mt-0.5" />
            微信与手机同号：{BILLING_CONTACT_PHONE}，添加时请备注「Murphy 互动」。
          </p>
        </div>
      </div>
    </div>
  );
}
