import type { SubscriptionPlan } from "@/types/user-types";

export type PricingPlanDef = {
  id: "MONTHLY" | "QUARTERLY" | "PAY_PER_USE";
  label: string;
  priceYuan: number;
  /** 列表次要说明，如「每自然月」 */
  periodHint: string;
  /** 对用户说明权益时长与起算方式（润色文案） */
  description: string;
};

export const PRICING_PLANS: PricingPlanDef[] = [
  {
    id: "MONTHLY",
    label: "包月",
    priceYuan: 19.9,
    periodHint: "¥19.9 / 档",
    description:
      "付款开通后，自开通之时起连续 30 个自然日内可使用全部功能；到期前可联系续费。",
  },
  {
    id: "QUARTERLY",
    label: "包季",
    priceYuan: 39.9,
    periodHint: "¥39.9 / 档",
    description:
      "适合活动集中的一季：开通后 90 个自然日内有效（按日连续计算，非自然季度），省心打包价。",
  },
  {
    id: "PAY_PER_USE",
    label: "按次短时",
    priceYuan: 9.9,
    periodHint: "¥9.9 / 次",
    description:
      "单次购买可连续使用 3 天（自开通之时起算），适合单场活动或短期试用付费能力；多次活动可多次购买。",
  },
];

export function subscriptionPlanLabel(
  plan: SubscriptionPlan | null | undefined
): string {
  if (!plan) return "未开通";
  const found = PRICING_PLANS.find((p) => p.id === plan);
  if (found) return `${found.label}（¥${found.priceYuan}）`;
  if (plan === "YEARLY") return "包年（历史档位）";
  return plan;
}

export const BILLING_CONTACT_PHONE = "15871352105";

export const BILLING_OFFLINE_PAYMENT_NOTE =
  "目前为线下收款：请加微信或来电确认套餐与金额，转账成功后由我们于后台开通；权益时长与到期日以系统显示为准，与上表规则一致。";
