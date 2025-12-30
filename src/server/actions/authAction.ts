"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

import { prisma } from "@/lib/db";
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  changeNicknameSchema,
} from "@/types/user-types";
import type {
  LoginFormData,
  RegisterFormData,
  ChangePasswordFormData,
  ChangeNicknameFormData,
  AuthUser,
} from "@/types/user-types";

// ================================
// 常量配置
// ================================

const SESSION_COOKIE_NAME = "murphy_session";
const SESSION_EXPIRY_DAYS = 7;
const ADMIN_EMAIL = "murphylan@hotmail.com";
const ADMIN_PASSWORD = "15871352105abc";

// ================================
// 内部辅助函数
// ================================

async function createSession(userId: string) {
  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

// ================================
// 公开函数：获取当前用户
// ================================

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return null;
    }

    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      nickname: session.user.nickname,
      role: session.user.role,
      trialStartAt: session.user.trialStartAt,
      trialDays: session.user.trialDays,
      isPaid: session.user.isPaid,
      paidAt: session.user.paidAt,
      createdAt: session.user.createdAt,
    };
  } catch {
    return null;
  }
}

// ================================
// Server Actions
// ================================

export async function loginAction(data: LoginFormData) {
  try {
    const validated = loginSchema.parse(data);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (!user) {
      return { success: false, error: "用户不存在" };
    }

    const isValid = await bcrypt.compare(validated.password, user.password);

    if (!isValid) {
      return { success: false, error: "密码错误" };
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 创建 session
    await createSession(user.id);

    revalidatePath("/");

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
      },
    };
  } catch (error) {
    console.error("Login failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "登录失败",
    };
  }
}

export async function registerAction(data: RegisterFormData) {
  try {
    const validated = registerSchema.parse(data);

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return { success: false, error: "该邮箱已被注册" };
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(validated.password, 12);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        password: hashedPassword,
        nickname: validated.nickname || validated.email.split("@")[0],
        role: validated.email === ADMIN_EMAIL ? "ADMIN" : "USER",
      },
    });

    // 自动登录
    await createSession(user.id);

    revalidatePath("/");

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
      },
    };
  } catch (error) {
    console.error("Register failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "注册失败",
    };
  }
}

export async function logoutAction() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionToken) {
      await prisma.session.deleteMany({
        where: { token: sessionToken },
      });
    }

    cookieStore.delete(SESSION_COOKIE_NAME);

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Logout failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "退出登录失败",
    };
  }
}

export async function changePasswordAction(data: ChangePasswordFormData) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const validated = changePasswordSchema.parse(data);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return { success: false, error: "用户不存在" };
    }

    const isValid = await bcrypt.compare(validated.oldPassword, dbUser.password);

    if (!isValid) {
      return { success: false, error: "原密码错误" };
    }

    const hashedPassword = await bcrypt.hash(validated.newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error("Change password failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "修改密码失败",
    };
  }
}

export async function changeNicknameAction(data: ChangeNicknameFormData) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const validated = changeNicknameSchema.parse(data);

    await prisma.user.update({
      where: { id: user.id },
      data: { nickname: validated.nickname },
    });

    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    console.error("Change nickname failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "修改昵称失败",
    };
  }
}

// ================================
// 管理员初始化
// ================================

export async function initAdminUser() {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        password: hashedPassword,
        nickname: "Murphy",
        role: "ADMIN",
        isPaid: true,
      },
    });
    console.log("Admin user created:", ADMIN_EMAIL);
  }
}

