import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users, verificationCodes } from "@/server/db/schema";
import {
  generateCode,
  smsProvider,
  CODE_TTL_MS,
  CODE_RESEND_INTERVAL_MS,
} from "@/lib/sms";

const ADMIN_PHONE = process.env.ADMIN_PHONE?.trim() || "";

const PHONE_RE = /^1[3-9]\d{9}$/;

export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test(phone);
}

/**
 * 生成验证码、写库并通过短信服务商发送。带 60 秒防刷。
 * 托管式（阿里云）：验证码由服务商生成/校验/防刷，本应用不落库。
 */
export async function createAndSendCode(
  phone: string
): Promise<{ success: boolean; error?: string }> {
  if (!isValidPhone(phone)) {
    return { success: false, error: "手机号格式不正确" };
  }

  if (smsProvider.managed) {
    try {
      await smsProvider.sendCode(phone, "");
      return { success: true };
    } catch (error) {
      console.error("[SMS] 托管式发送失败：", error);
      return { success: false, error: "验证码发送失败，请稍后再试" };
    }
  }

  const [recent] = await db
    .select()
    .from(verificationCodes)
    .where(eq(verificationCodes.phone, phone))
    .orderBy(desc(verificationCodes.createdAt))
    .limit(1);
  if (
    recent &&
    Date.now() - new Date(recent.createdAt).getTime() < CODE_RESEND_INTERVAL_MS
  ) {
    return { success: false, error: "验证码发送过于频繁，请稍后再试" };
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  // 清掉该手机号旧验证码，只保留最新一条
  await db.delete(verificationCodes).where(eq(verificationCodes.phone, phone));
  await db.insert(verificationCodes).values({ phone, code, expiresAt });

  try {
    await smsProvider.sendCode(phone, code);
  } catch (error) {
    console.error("[SMS] 发送失败：", error);
    return { success: false, error: "验证码发送失败，请稍后再试" };
  }
  return { success: true };
}

/**
 * 校验验证码；命中即标记为已消费（一次性）。
 */
export async function verifyCode(phone: string, code: string): Promise<boolean> {
  if (!isValidPhone(phone) || !/^\d{6}$/.test(code)) return false;

  if (smsProvider.managed) {
    if (!smsProvider.verifyCode) return false;
    try {
      return await smsProvider.verifyCode(phone, code);
    } catch (error) {
      console.error("[SMS] 托管式校验失败：", error);
      return false;
    }
  }

  const [record] = await db
    .select()
    .from(verificationCodes)
    .where(
      and(
        eq(verificationCodes.phone, phone),
        eq(verificationCodes.code, code),
        eq(verificationCodes.consumed, false)
      )
    )
    .orderBy(desc(verificationCodes.createdAt))
    .limit(1);

  if (!record) return false;
  if (new Date(record.expiresAt).getTime() < Date.now()) return false;

  await db
    .update(verificationCodes)
    .set({ consumed: true })
    .where(eq(verificationCodes.id, record.id));
  return true;
}

/**
 * 按手机号查用户；不存在则创建（首次验证码登录 = 自动注册）。
 * ADMIN_PHONE 命中则赋 ADMIN + 付费（不受试用限制）；其余为 USER，走默认 3 天试用。
 */
export async function findOrCreateUser(phone: string) {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);
  if (existing) return existing;

  const isAdmin = !!ADMIN_PHONE && phone === ADMIN_PHONE;
  const [created] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      phone,
      role: isAdmin ? "ADMIN" : "USER",
      isPaid: isAdmin,
    })
    .returning();
  return created;
}
