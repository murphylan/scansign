"use server";

import { headers } from "next/headers";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import { createSession, getSession, updateSessionStatus } from "@/lib/session-store";
import {
  getRecentUsers,
  getAllUsers,
  getUserByPhone,
  checkDuplicateUsername,
  registerUser,
  updateUser,
  verifyUserCode,
  DEPARTMENTS,
} from "@/lib/user-store";
import { userInfoSchema } from "@/types";

// ================================
// 部门相关
// ================================

export async function getDepartmentsAction() {
  return {
    success: true,
    data: DEPARTMENTS,
  };
}

// ================================
// 用户列表相关
// ================================

export async function getUserListAction() {
  try {
    const users = getRecentUsers(100);
    const total = getAllUsers().length;

    return {
      success: true,
      data: {
        users,
        total,
      },
    };
  } catch (error) {
    console.error("Get users error:", error);
    return { success: false, error: "获取用户列表失败" };
  }
}

// ================================
// 用户检查相关
// ================================

export async function checkUserPhoneAction(phone: string) {
  try {
    if (!phone) {
      return { success: false, error: "手机号不能为空" };
    }

    const user = getUserByPhone(phone);

    return {
      success: true,
      data: {
        exists: !!user,
        user: user || undefined,
      },
    };
  } catch (error) {
    console.error("Check user error:", error);
    return { success: false, error: "查询用户失败" };
  }
}

export async function checkUsernameAction(
  username: string,
  departmentId: string,
  excludeUserId?: string
) {
  try {
    if (!username || !departmentId) {
      return { success: false, error: "用户名和部门不能为空" };
    }

    const duplicate = checkDuplicateUsername(username, departmentId, excludeUserId);

    return {
      success: true,
      data: { duplicate },
    };
  } catch (error) {
    console.error("Check username error:", error);
    return { success: false, error: "检查用户名失败" };
  }
}

// ================================
// 二维码相关
// ================================

export async function generateQRCodeAction() {
  try {
    // 生成唯一token
    const token = uuidv4();

    // 创建会话
    const session = createSession(token);

    // 从 headers 获取 host
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = headersList.get("x-forwarded-proto") || "http";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
    const h5Url = `${baseUrl}/mobile/confirm?token=${token}`;

    // 生成二维码
    const qrCodeUrl = await QRCode.toDataURL(h5Url, {
      width: 280,
      margin: 2,
      color: {
        dark: "#1a1a2e",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });

    return {
      success: true,
      data: {
        token,
        qrCodeUrl,
        expiresAt: session.expiresAt,
      },
    };
  } catch (error) {
    console.error("Generate QR code error:", error);
    return { success: false, error: "生成二维码失败" };
  }
}

// ================================
// 确认登录/签到
// ================================

interface ConfirmData {
  token: string;
  username: string;
  phone: string;
  departmentId: string;
  existingUserId?: string;
  verifyCode?: string;
}

export async function confirmLoginAction(data: ConfirmData) {
  try {
    const { token, username, phone, departmentId, existingUserId, verifyCode } = data;

    if (!token) {
      return { success: false, error: "Token 不能为空" };
    }

    // 验证用户输入
    const validation = userInfoSchema.safeParse({ username, phone, departmentId });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return { success: false, error: firstError.message };
    }

    // 检查会话（老用户更新信息时，session 可能已过期，这是允许的）
    const session = getSession(token);
    const isExistingUser = !!existingUserId;

    // 新用户注册必须有有效的 session
    if (!isExistingUser) {
      if (!session) {
        return { success: false, error: "会话不存在或已过期，请重新扫码" };
      }

      if (session.status === "expired") {
        return { success: false, error: "二维码已过期，请刷新重试" };
      }
    }

    // 老用户修改信息需要验证验证码
    if (isExistingUser) {
      if (!verifyCode) {
        return { success: false, error: "请输入验证码" };
      }

      if (!verifyUserCode(existingUserId, verifyCode)) {
        return { success: false, error: "验证码错误，如忘记请联系管理员" };
      }
    }

    // 检查用户名+部门是否重复
    const isDuplicate = checkDuplicateUsername(
      validation.data.username,
      validation.data.departmentId,
      existingUserId
    );
    if (isDuplicate) {
      return { success: false, error: "该部门已存在同名用户，请修改用户名或选择其他部门" };
    }

    const department = DEPARTMENTS.find((d) => d.id === validation.data.departmentId);
    let registeredUserId: string;
    let isNewUser = true;
    let userVerifyCode: string | undefined;

    if (existingUserId) {
      // 更新现有用户
      const updatedUser = updateUser(existingUserId, {
        phone: validation.data.phone,
        username: validation.data.username,
        departmentId: validation.data.departmentId,
      });

      if (!updatedUser) {
        return { success: false, error: "用户不存在" };
      }

      registeredUserId = existingUserId;
      isNewUser = false;
    } else {
      // 再次检查手机号是否已被注册（防止并发）
      const existingUser = getUserByPhone(validation.data.phone);
      if (existingUser) {
        return { success: false, error: "该手机号已被注册，请使用修改信息功能" };
      }

      // 注册新用户
      const newUser = registerUser({
        phone: validation.data.phone,
        username: validation.data.username,
        departmentId: validation.data.departmentId,
      });
      registeredUserId = newUser.id;
      userVerifyCode = newUser.verifyCode;
    }

    // 更新会话状态（如果 session 存在的话）
    if (session) {
      updateSessionStatus(token, "confirmed", {
        username: validation.data.username,
        phone: validation.data.phone,
        departmentId: validation.data.departmentId,
        departmentName: department?.name || "未知部门",
        submittedAt: Date.now(),
        isNewUser,
      });
    }

    return {
      success: true,
      data: {
        message: isNewUser ? "签到成功" : "信息更新成功",
        userId: registeredUserId,
        verifyCode: userVerifyCode,
      },
    };
  } catch (error) {
    console.error("Confirm login error:", error);
    return { success: false, error: "确认登录失败" };
  }
}

