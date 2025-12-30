import { z } from "zod";

// ================================
// 用户角色枚举
// ================================

export const UserRole = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ================================
// Interface 定义
// ================================

export interface User {
  id: string;
  email: string;
  nickname: string | null;
  role: UserRole;
  trialStartAt: Date;
  trialDays: number;
  isPaid: boolean;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface AuthUser {
  id: string;
  email: string;
  nickname: string | null;
  role: UserRole;
  trialStartAt: Date;
  trialDays: number;
  isPaid: boolean;
  paidAt: Date | null;
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

export const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(1, "请输入密码"),
});

export const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少6个字符"),
  nickname: z.string().optional(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "请输入原密码"),
  newPassword: z.string().min(6, "新密码至少6个字符"),
});

export const changeNicknameSchema = z.object({
  nickname: z.string().min(1, "昵称不能为空").max(50, "昵称最多50个字符"),
});

// ================================
// 表单数据类型（从 Schema 推断）
// ================================

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ChangeNicknameFormData = z.infer<typeof changeNicknameSchema>;

