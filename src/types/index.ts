import { z } from "zod";

// 登录会话状态
export type SessionStatus = 
  | "pending"      // 等待扫码
  | "scanned"      // 已扫码，等待提交信息
  | "confirmed"    // 已确认登录
  | "expired";     // 已过期

// 登录会话信息
export interface LoginSession {
  token: string;
  status: SessionStatus;
  createdAt: number;
  expiresAt: number;
  userInfo?: UserInfo;
  registeredUserId?: string; // 关联的已注册用户ID
}

// 用户信息（会话中的临时信息）
export interface UserInfo {
  username: string;
  phone: string;
  departmentId: string;
  departmentName: string;
  submittedAt: number;
  isNewUser: boolean;
}

// 部门信息
export interface Department {
  id: string;
  name: string;
}

// 已注册用户
export interface RegisteredUser {
  id: string;
  phone: string;
  username: string;
  departmentId: string;
  departmentName: string;
  registeredAt: number;
  updatedAt: number;
}

// H5页面提交的表单验证
export const userInfoSchema = z.object({
  username: z
    .string()
    .min(2, "用户名至少2个字符")
    .max(20, "用户名最多20个字符")
    .regex(/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/, "用户名只能包含中文、英文、数字和下划线"),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, "请输入正确的手机号码"),
  departmentId: z
    .string()
    .min(1, "请选择部门"),
});

export type UserInfoFormData = z.infer<typeof userInfoSchema>;

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface QRCodeResponse {
  token: string;
  qrCodeUrl: string;
  expiresAt: number;
}

export interface StatusResponse {
  status: SessionStatus;
  userInfo?: UserInfo;
}

// 用户检查响应
export interface UserCheckResponse {
  exists: boolean;
  user?: RegisteredUser;
}

// 用户列表响应
export interface UserListResponse {
  users: RegisteredUser[];
  total: number;
}

