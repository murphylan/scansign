import type { AuthUser } from "@/types/user-types";

/**
 * 检查用户是否在试用期内
 */
export function isInTrialPeriod(user: AuthUser): boolean {
  if (user.isPaid) return false;

  const trialEndAt = new Date(user.trialStartAt);
  trialEndAt.setDate(trialEndAt.getDate() + user.trialDays);

  return new Date() < trialEndAt;
}

/**
 * 获取试用剩余天数
 */
export function getTrialDaysRemaining(user: AuthUser): number {
  if (user.isPaid) return 0;

  const trialEndAt = new Date(user.trialStartAt);
  trialEndAt.setDate(trialEndAt.getDate() + user.trialDays);

  const remaining = Math.ceil(
    (trialEndAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, remaining);
}

/**
 * 检查用户是否可以使用服务
 */
export function canUseService(user: AuthUser): boolean {
  return user.role === "ADMIN" || user.isPaid || isInTrialPeriod(user);
}

