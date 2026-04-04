import type { AuthUser } from "@/types/user-types";

/**
 * 付费且在订阅有效期内（或未设置截止日期视为永久有效）
 */
export function hasActivePaidSubscription(user: AuthUser): boolean {
  if (!user.isPaid) return false;
  if (!user.subscriptionEndsAt) return true;
  return new Date(user.subscriptionEndsAt) > new Date();
}

/**
 * 检查用户是否在试用期内（与付费状态解耦：仅当无有效付费订阅时适用）
 */
export function isInTrialPeriod(user: AuthUser): boolean {
  if (hasActivePaidSubscription(user)) return false;

  const trialEndAt = new Date(user.trialStartAt);
  trialEndAt.setDate(trialEndAt.getDate() + user.trialDays);

  return new Date() < trialEndAt;
}

/**
 * 试用结束时刻
 */
export function getTrialEndsAt(user: AuthUser): Date {
  const trialEndAt = new Date(user.trialStartAt);
  trialEndAt.setDate(trialEndAt.getDate() + user.trialDays);
  return trialEndAt;
}

/**
 * 获取试用剩余天数
 */
export function getTrialDaysRemaining(user: AuthUser): number {
  if (hasActivePaidSubscription(user)) return 0;

  const trialEndAt = getTrialEndsAt(user);

  const remaining = Math.ceil(
    (trialEndAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, remaining);
}

/**
 * 检查用户是否可以使用服务
 */
export function canUseService(user: AuthUser): boolean {
  if (user.role === "ADMIN") return true;
  if (hasActivePaidSubscription(user)) return true;
  return isInTrialPeriod(user);
}
