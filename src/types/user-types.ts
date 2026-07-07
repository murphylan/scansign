import { z } from "zod";

// ================================
// 用户角色枚举
// ================================

export const UserRole = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const SubscriptionPlan = {
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  PAY_PER_USE: "PAY_PER_USE",
  YEARLY: "YEARLY",
} as const;

export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];

// ================================
// Interface 定义
// ================================

export interface User {
  id: string;
  phone: string;
  nickname: string | null;
  role: UserRole;
  trialStartAt: Date;
  trialDays: number;
  isPaid: boolean;
  paidAt: Date | null;
  subscriptionPlan: SubscriptionPlan | null;
  subscriptionEndsAt: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface AuthUser {
  id: string;
  phone: string;
  nickname: string | null;
  role: UserRole;
  trialStartAt: Date;
  trialDays: number;
  isPaid: boolean;
  paidAt: Date | null;
  subscriptionPlan: SubscriptionPlan | null;
  subscriptionEndsAt: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
  trialDaysRemaining?: number;
  canUseService?: boolean;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// ================================
// Zod Schema 定义
// ================================

const phoneField = z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号");

// 发送验证码
export const sendCodeSchema = z.object({
  phone: phoneField,
});

// 手机号+验证码登录（登录即注册）
export const loginWithCodeSchema = z.object({
  phone: phoneField,
  code: z.string().regex(/^\d{6}$/, "请输入6位验证码"),
  nickname: z.string().max(50, "昵称最多50个字符").optional(),
});

export const changeNicknameSchema = z.object({
  nickname: z.string().min(1, "昵称不能为空").max(50, "昵称最多50个字符"),
});

// ================================
// 表单数据类型（从 Schema 推断）
// ================================

export type SendCodeFormData = z.infer<typeof sendCodeSchema>;
export type LoginWithCodeFormData = z.infer<typeof loginWithCodeSchema>;
export type ChangeNicknameFormData = z.infer<typeof changeNicknameSchema>;

