"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { desc, eq, or, ilike, type SQL } from "drizzle-orm";
import { z } from "zod";

import { OPS_ONLINE_WITHIN_MINUTES, OPS_SUPER_USER_EMAIL } from "@/config/ops";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { getCurrentUser } from "@/server/actions/authAction";
import type { AuthUser, SubscriptionPlan } from "@/types/user-types";

export type OpsUserRow = {
  id: string;
  email: string;
  nickname: string | null;
  role: "USER" | "ADMIN";
  trialStartAt: string;
  trialDays: number;
  isPaid: boolean;
  subscriptionPlan: SubscriptionPlan | null;
  subscriptionEndsAt: string | null;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  online: boolean;
};

async function requireOps(): Promise<AuthUser> {
  const u = await getCurrentUser();
  if (!u || u.email !== OPS_SUPER_USER_EMAIL) {
    throw new Error("无权访问运营台");
  }
  return u;
}

function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

/** 自开通日起向后延续的自然日数（续费时从未到期日顺延） */
function planToExtraDays(plan: SubscriptionPlan): number {
  switch (plan) {
    case "MONTHLY":
      return 30;
    case "QUARTERLY":
      return 90;
    case "PAY_PER_USE":
      return 3;
    case "YEARLY":
      return 365;
    default:
      return 30;
  }
}

const selectOpsFields = {
  id: users.id,
  email: users.email,
  nickname: users.nickname,
  role: users.role,
  trialStartAt: users.trialStartAt,
  trialDays: users.trialDays,
  isPaid: users.isPaid,
  subscriptionPlan: users.subscriptionPlan,
  subscriptionEndsAt: users.subscriptionEndsAt,
  lastLoginAt: users.lastLoginAt,
  lastSeenAt: users.lastSeenAt,
  createdAt: users.createdAt,
};

export async function listOpsUsersAction(search?: string): Promise<{
  success: boolean;
  data?: OpsUserRow[];
  error?: string;
}> {
  try {
    await requireOps();

    const onlineThresholdMs =
      Date.now() - OPS_ONLINE_WITHIN_MINUTES * 60 * 1000;

    let whereClause: SQL | undefined;
    const q = search?.trim();
    if (q) {
      whereClause = or(
        ilike(users.email, `%${q}%`),
        ilike(users.nickname, `%${q}%`)
      );
    }

    const rows = whereClause
      ? await db
          .select(selectOpsFields)
          .from(users)
          .where(whereClause)
          .orderBy(desc(users.createdAt))
      : await db
          .select(selectOpsFields)
          .from(users)
          .orderBy(desc(users.createdAt));

    const data: OpsUserRow[] = rows.map((r) => ({
      id: r.id,
      email: r.email,
      nickname: r.nickname,
      role: r.role as OpsUserRow["role"],
      trialStartAt: r.trialStartAt.toISOString(),
      trialDays: r.trialDays,
      isPaid: r.isPaid,
      subscriptionPlan: r.subscriptionPlan,
      subscriptionEndsAt: r.subscriptionEndsAt?.toISOString() ?? null,
      lastLoginAt: r.lastLoginAt?.toISOString() ?? null,
      lastSeenAt: r.lastSeenAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      online: Boolean(
        r.lastSeenAt && new Date(r.lastSeenAt).getTime() >= onlineThresholdMs
      ),
    }));

    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "加载失败",
    };
  }
}

const planSchema = z.enum([
  "MONTHLY",
  "QUARTERLY",
  "PAY_PER_USE",
  "YEARLY",
]);

export async function grantSubscriptionAction(
  userId: string,
  plan: SubscriptionPlan
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireOps();
    planSchema.parse(plan);

    const [target] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!target) {
      return { success: false, error: "用户不存在" };
    }

    const now = new Date();
    const extraDays = planToExtraDays(plan);
    const base =
      target.subscriptionEndsAt && new Date(target.subscriptionEndsAt) > now
        ? new Date(target.subscriptionEndsAt)
        : now;
    const endsAt = addDays(base, extraDays);

    await db
      .update(users)
      .set({
        isPaid: true,
        subscriptionPlan: plan,
        subscriptionEndsAt: endsAt,
        paidAt: target.paidAt ?? now,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    revalidatePath("/ops/console");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "操作失败",
    };
  }
}

export async function extendTrialAction(
  userId: string,
  extraDays: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireOps();
    if (!Number.isFinite(extraDays) || extraDays < 1 || extraDays > 365) {
      return { success: false, error: "延长天数需在 1～365 之间" };
    }

    const [target] = await db
      .select({ trialDays: users.trialDays })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!target) {
      return { success: false, error: "用户不存在" };
    }

    await db
      .update(users)
      .set({
        trialDays: target.trialDays + extraDays,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    revalidatePath("/ops/console");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "操作失败",
    };
  }
}

/**
 * 直接设置用户的试用天数（不是追加），范围 0~365。
 * 与 extendTrialAction 区别：这是覆盖式设置，运营时更直观。
 */
export async function setTrialDaysAction(
  userId: string,
  trialDays: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireOps();
    if (!Number.isFinite(trialDays) || trialDays < 0 || trialDays > 365) {
      return { success: false, error: "试用天数需在 0～365 之间" };
    }

    const [target] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!target) {
      return { success: false, error: "用户不存在" };
    }

    await db
      .update(users)
      .set({ trialDays, updatedAt: new Date() })
      .where(eq(users.id, userId));

    revalidatePath("/ops/console");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "操作失败",
    };
  }
}

const createUserSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少 6 个字符"),
  nickname: z.string().trim().max(50).optional(),
  trialDays: z.number().int().min(0).max(365).default(3),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * 运营台直接创建用户（无需该用户自己注册）。
 * 默认角色 USER；可指定试用天数。
 */
export async function createUserAction(
  input: CreateUserInput
): Promise<{ success: boolean; error?: string; data?: { id: string } }> {
  try {
    await requireOps();
    const validated = createUserSchema.parse(input);

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, validated.email))
      .limit(1);

    if (existing) {
      return { success: false, error: "该邮箱已被注册" };
    }

    const hashedPassword = await bcrypt.hash(validated.password, 12);
    const now = new Date();

    const [created] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email: validated.email,
        password: hashedPassword,
        nickname: validated.nickname || validated.email.split("@")[0],
        role: validated.role,
        trialStartAt: now,
        trialDays: validated.trialDays,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: users.id });

    revalidatePath("/ops/console");
    return { success: true, data: { id: created.id } };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false, error: e.issues[0]?.message ?? "参数错误" };
    }
    return {
      success: false,
      error: e instanceof Error ? e.message : "创建失败",
    };
  }
}

const updateUserSchema = z.object({
  userId: z.string().min(1),
  nickname: z.string().trim().max(50).optional(),
  trialDays: z.number().int().min(0).max(365).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  password: z
    .string()
    .min(6, "密码至少 6 个字符")
    .max(128)
    .optional()
    .or(z.literal("")),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * 运营台编辑用户：可修改昵称 / 试用天数 / 角色，可选重置密码。
 * 不允许把自己的角色从 ADMIN 改成 USER（避免误操作丢失权限）。
 */
export async function updateUserAction(
  input: UpdateUserInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const me = await requireOps();
    const validated = updateUserSchema.parse(input);

    const [target] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, validated.userId))
      .limit(1);

    if (!target) {
      return { success: false, error: "用户不存在" };
    }

    if (
      target.id === me.id &&
      validated.role &&
      validated.role !== "ADMIN"
    ) {
      return { success: false, error: "不能降级自己的管理员角色" };
    }

    const patch: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (validated.nickname !== undefined) {
      patch.nickname = validated.nickname || null;
    }
    if (validated.trialDays !== undefined) {
      patch.trialDays = validated.trialDays;
    }
    if (validated.role !== undefined) {
      patch.role = validated.role;
    }
    if (validated.password) {
      patch.password = await bcrypt.hash(validated.password, 12);
    }

    await db.update(users).set(patch).where(eq(users.id, validated.userId));

    revalidatePath("/ops/console");
    return { success: true };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { success: false, error: e.issues[0]?.message ?? "参数错误" };
    }
    return {
      success: false,
      error: e instanceof Error ? e.message : "保存失败",
    };
  }
}

export async function revokePaidAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireOps();

    await db
      .update(users)
      .set({
        isPaid: false,
        subscriptionPlan: null,
        subscriptionEndsAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    revalidatePath("/ops/console");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "操作失败",
    };
  }
}
