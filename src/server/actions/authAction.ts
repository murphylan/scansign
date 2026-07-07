"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { users, sessions } from "@/server/db/schema";
import { sendCodeSchema, loginWithCodeSchema, changeNicknameSchema } from "@/types/user-types";
import type {
  LoginWithCodeFormData,
  ChangeNicknameFormData,
  AuthUser,
} from "@/types/user-types";
import { createAndSendCode, verifyCode, findOrCreateUser } from "@/lib/verification";

// ================================
// 常量配置（从环境变量读取）
// ================================

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "murphy_session";
const SESSION_EXPIRY_DAYS = parseInt(process.env.SESSION_EXPIRY_DAYS || "7", 10);
const ADMIN_PHONE = process.env.ADMIN_PHONE?.trim() || "";

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
      phone: user.phone ?? "",
      nickname: user.nickname,
      role: user.role,
      trialStartAt: user.trialStartAt,
      trialDays: user.trialDays,
      isPaid: user.isPaid,
      paidAt: user.paidAt,
      subscriptionPlan: user.subscriptionPlan ?? null,
      subscriptionEndsAt: user.subscriptionEndsAt ?? null,
      lastSeenAt: user.lastSeenAt ?? null,
      createdAt: user.createdAt,
    };
  } catch {
    return null;
  }
}

// ================================
// Server Actions：手机号 + 短信验证码
// ================================

/** 发送验证码（默认 Mock，验证码打印到服务端控制台） */
export async function sendSmsCodeAction(data: { phone: string }) {
  try {
    const { phone } = sendCodeSchema.parse(data);
    return await createAndSendCode(phone);
  } catch (error) {
    console.error("Send code failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "发送验证码失败",
    };
  }
}

/** 验证码登录（登录即注册） */
export async function loginWithCodeAction(data: LoginWithCodeFormData) {
  try {
    const validated = loginWithCodeSchema.parse(data);

    const ok = await verifyCode(validated.phone, validated.code);
    if (!ok) {
      return { success: false, error: "验证码错误或已过期" };
    }

    const user = await findOrCreateUser(validated.phone);

    // 首次注册且传了昵称 → 写入；同时更新最后登录时间
    const patch: { lastLoginAt: Date; updatedAt: Date; nickname?: string } = {
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    };
    if (validated.nickname && !user.nickname) {
      patch.nickname = validated.nickname;
    }
    await db.update(users).set(patch).where(eq(users.id, user.id));

    await createSession(user.id);
    revalidatePath("/");

    return {
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        nickname: patch.nickname ?? user.nickname,
        role: user.role,
      },
    };
  } catch (error) {
    console.error("Login with code failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "登录失败",
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
// 管理员初始化（按 ADMIN_PHONE）
// ================================

export async function initAdminUser() {
  if (!ADMIN_PHONE) {
    return;
  }

  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.phone, ADMIN_PHONE))
    .limit(1);

  if (!existingAdmin) {
    await db.insert(users).values({
      id: randomUUID(),
      phone: ADMIN_PHONE,
      nickname: "Murphy",
      role: "ADMIN",
      isPaid: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Admin user created:", ADMIN_PHONE);
  } else if (existingAdmin.role !== "ADMIN") {
    // 已存在但非管理员（例如先以普通用户登录过）→ 提升为管理员
    await db
      .update(users)
      .set({ role: "ADMIN", isPaid: true, updatedAt: new Date() })
      .where(eq(users.id, existingAdmin.id));
  }
}

// ================================
// 在线心跳（运营台展示用，节流写库）
// ================================

export async function touchPresenceAction(): Promise<{ success: boolean }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false };
    }

    const [row] = await db
      .select({ lastSeenAt: users.lastSeenAt })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const now = new Date();
    if (row?.lastSeenAt) {
      const delta = now.getTime() - new Date(row.lastSeenAt).getTime();
      if (delta < 30_000) {
        return { success: true };
      }
    }

    await db
      .update(users)
      .set({ lastSeenAt: now, updatedAt: now })
      .where(eq(users.id, user.id));

    return { success: true };
  } catch {
    return { success: false };
  }
}
