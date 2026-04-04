import type { SubscriptionPlan } from "@/types/user-types";

export const PRICING_PLANS = [
  { id: "MONTHLY" as const, label: "包月", priceYuan: 9.9, period: "每月" },
  { id: "QUARTERLY" as const, label: "包季", priceYuan: 19.9, period: "每季度" },
  { id: "YEARLY" as const, label: "包年", priceYuan: 39.9, period: "每年" },
];

export function subscriptionPlanLabel(
  plan: SubscriptionPlan | null | undefined
): string {
  if (!plan) return "未开通";
  const found = PRICING_PLANS.find((p) => p.id === plan);
  return found ? `${found.label}（¥${found.priceYuan}）` : plan;
}

export const BILLING_CONTACT_PHONE = "15871352105";

export const BILLING_OFFLINE_PAYMENT_NOTE =
  "当前为线下付款：添加微信或电话沟通确认后，通过转账等方式完成支付；开通后以系统到期日为准。";
