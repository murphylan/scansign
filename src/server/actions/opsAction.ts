"use server";

import { revalidatePath } from "next/cache";
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

function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

function planToMonths(plan: SubscriptionPlan): number {
  switch (plan) {
    case "MONTHLY":
      return 1;
    case "QUARTERLY":
      return 3;
    case "YEARLY":
      return 12;
    default:
      return 1;
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

const planSchema = z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]);

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
    const months = planToMonths(plan);
    const base =
      target.subscriptionEndsAt && new Date(target.subscriptionEndsAt) > now
        ? new Date(target.subscriptionEndsAt)
        : now;
    const endsAt = addMonths(base, months);

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
