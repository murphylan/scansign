"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { eq, and, lt } from "drizzle-orm";

import { db } from "@/server/db";
import { users, sessions } from "@/server/db/schema";
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
// 常量配置（从环境变量读取）
// ================================

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "murphy_session";
const SESSION_EXPIRY_DAYS = parseInt(process.env.SESSION_EXPIRY_DAYS || "7", 10);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

// ================================
// 内部辅助函数
// ================================

async function createSession(userId: string) {
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  await db.insert(sessions).values({
    id: randomUUID(),
    userId,
    token,
    expiresAt,
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

    // 查询 session 和用户
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, sessionToken))
      .limit(1);

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await db.delete(sessions).where(eq(sessions.id, session.id));
      }
      return null;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
      trialStartAt: user.trialStartAt,
      trialDays: user.trialDays,
      isPaid: user.isPaid,
      paidAt: user.paidAt,
      createdAt: user.createdAt,
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

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, validated.email))
      .limit(1);

    if (!user) {
      return { success: false, error: "用户不存在" };
    }

    const isValid = await bcrypt.compare(validated.password, user.password);

    if (!isValid) {
      return { success: false, error: "密码错误" };
    }

    // 更新最后登录时间
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

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
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, validated.email))
      .limit(1);

    if (existingUser) {
      return { success: false, error: "该邮箱已被注册" };
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(validated.password, 12);

    // 创建用户
    const [user] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email: validated.email,
        password: hashedPassword,
        nickname: validated.nickname || validated.email.split("@")[0],
        role: validated.email === ADMIN_EMAIL ? "ADMIN" : "USER",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

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
      await db.delete(sessions).where(eq(sessions.token, sessionToken));
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

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser) {
      return { success: false, error: "用户不存在" };
    }

    const isValid = await bcrypt.compare(validated.oldPassword, dbUser.password);

    if (!isValid) {
      return { success: false, error: "原密码错误" };
    }

    const hashedPassword = await bcrypt.hash(validated.newPassword, 12);

    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, user.id));

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

    await db
      .update(users)
      .set({ nickname: validated.nickname, updatedAt: new Date() })
      .where(eq(users.id, user.id));

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
  // 如果没有配置管理员信息，跳过初始化
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log("Admin credentials not configured, skipping admin initialization");
    return;
  }

  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await db.insert(users).values({
      id: randomUUID(),
      email: ADMIN_EMAIL,
      password: hashedPassword,
      nickname: "Murphy",
      role: "ADMIN",
      isPaid: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Admin user created:", ADMIN_EMAIL);
  }
}
