"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { lotteries, lotteryPrizes, lotteryParticipants, lotteryWinners } from "@/server/db/schema";
import { generateCode } from "@/lib/utils/code-generator";
import { getCurrentUser } from "./authAction";

// ================================
// 默认配置
// ================================

const DEFAULT_CONFIG = {
  mode: "wheel",
  requirePhone: true,
  allowMultiple: false,
};

const DEFAULT_DISPLAY = {
  theme: "festive",
  showWinners: true,
  animation: true,
};

// ================================
// 类型定义
// ================================

export interface LotteryFormData {
  title: string;
  description?: string;
  prizes?: Array<{
    name: string;
    quantity: number;
    probability: number;
  }>;
  config?: Record<string, unknown>;
  display?: Record<string, unknown>;
  startTime?: string;
  endTime?: string;
}

// ================================
// Server Actions
// ================================

export async function listLotteriesAction() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";

    const lotteryList = isAdmin
      ? await db.select().from(lotteries).orderBy(desc(lotteries.createdAt))
      : await db
          .select()
          .from(lotteries)
          .where(eq(lotteries.userId, user.id))
          .orderBy(desc(lotteries.createdAt));

    const data = await Promise.all(
      lotteryList.map(async (l) => {
        const prizes = await db
          .select()
          .from(lotteryPrizes)
          .where(eq(lotteryPrizes.lotteryId, l.id))
          .orderBy(lotteryPrizes.sortOrder);

        return {
          id: l.id,
          code: l.code,
          title: l.title,
          description: l.description,
          status: l.status.toLowerCase(),
          config: {
            ...((l.config || {}) as Record<string, unknown>),
            mode: l.lotteryType.toLowerCase(),
          },
          prizes: prizes.map((p) => ({
            id: p.id,
            name: p.name,
            count: p.quantity,
            remaining: p.remaining,
            probability: p.probability,
          })),
          participantCount: l.participantCount,
          startTime: l.startTime?.getTime(),
          endTime: l.endTime?.getTime(),
          createdAt: l.createdAt.getTime(),
          updatedAt: l.updatedAt.getTime(),
        };
      })
    );

    return { success: true, data };
  } catch (error) {
    console.error("Failed to list lotteries:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取抽奖列表失败",
    };
  }
}

export async function getLotteryAction(id: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";

    const [lottery] = await db
      .select()
      .from(lotteries)
      .where(eq(lotteries.id, id))
      .limit(1);

    if (!lottery) {
      return { success: false, error: "抽奖不存在" };
    }

    if (!isAdmin && lottery.userId !== user.id) {
      return { success: false, error: "无权限访问" };
    }

    const prizes = await db
      .select()
      .from(lotteryPrizes)
      .where(eq(lotteryPrizes.lotteryId, lottery.id))
      .orderBy(lotteryPrizes.sortOrder);

    const [winnersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lotteryWinners)
      .where(eq(lotteryWinners.lotteryId, lottery.id));

    return {
      success: true,
      data: {
        id: lottery.id,
        code: lottery.code,
        title: lottery.title,
        description: lottery.description,
        status: lottery.status.toLowerCase(),
        config: {
          ...((lottery.config || {}) as Record<string, unknown>),
          mode: lottery.lotteryType.toLowerCase(),
          prizes: prizes.map((p) => ({
            id: p.id,
            name: p.name,
            count: p.quantity,
            remaining: p.remaining,
            probability: p.probability,
          })),
        },
        display: lottery.display,
        stats: {
          winnersCount: Number(winnersCount?.count || 0),
          participantCount: lottery.participantCount,
        },
        startTime: lottery.startTime?.getTime(),
        endTime: lottery.endTime?.getTime(),
        createdAt: lottery.createdAt.getTime(),
        updatedAt: lottery.updatedAt.getTime(),
      },
    };
  } catch (error) {
    console.error("Failed to get lottery:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取抽奖失败",
    };
  }
}

export async function createLotteryAction(data: LotteryFormData) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    if (!data.title?.trim()) {
      return { success: false, error: "请输入抽奖标题" };
    }

    const code = generateCode();
    const lotteryId = randomUUID();

    const [lottery] = await db
      .insert(lotteries)
      .values({
        id: lotteryId,
        code,
        title: data.title,
        description: data.description || null,
        status: "ACTIVE",
        lotteryType: "WHEEL",
        config: data.config || DEFAULT_CONFIG,
        display: data.display || DEFAULT_DISPLAY,
        startTime: data.startTime ? new Date(data.startTime) : null,
        endTime: data.endTime ? new Date(data.endTime) : null,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // 创建奖品
    if (data.prizes && data.prizes.length > 0) {
      await db.insert(lotteryPrizes).values(
        data.prizes.map((p, index) => ({
          id: randomUUID(),
          lotteryId: lottery.id,
          name: p.name,
          quantity: p.quantity,
          remaining: p.quantity,
          probability: p.probability,
          sortOrder: index,
        }))
      );
    }

    revalidatePath("/lotteries");

    return {
      success: true,
      data: {
        id: lottery.id,
        code: lottery.code,
        title: lottery.title,
      },
    };
  } catch (error) {
    console.error("Failed to create lottery:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "创建抽奖失败",
    };
  }
}

export async function updateLotteryAction(
  id: string,
  data: Partial<LotteryFormData> & { status?: string; reset?: boolean }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";

    const [existing] = await db
      .select()
      .from(lotteries)
      .where(eq(lotteries.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, error: "抽奖不存在" };
    }

    if (!isAdmin && existing.userId !== user.id) {
      return { success: false, error: "无权限修改" };
    }

    // 如果是重置操作
    if (data.reset) {
      // 重置奖品剩余数量
      const prizes = await db
        .select()
        .from(lotteryPrizes)
        .where(eq(lotteryPrizes.lotteryId, id));

      for (const prize of prizes) {
        await db
          .update(lotteryPrizes)
          .set({ remaining: prize.quantity })
          .where(eq(lotteryPrizes.id, prize.id));
      }

      // 删除中奖记录
      await db.delete(lotteryWinners).where(eq(lotteryWinners.lotteryId, id));
      await db.delete(lotteryParticipants).where(eq(lotteryParticipants.lotteryId, id));

      // 重置参与人数
      await db
        .update(lotteries)
        .set({ participantCount: 0, updatedAt: new Date() })
        .where(eq(lotteries.id, id));

      revalidatePath("/lotteries");
      revalidatePath(`/lotteries/${id}`);

      return { success: true, data: { id: existing.id } };
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status.toUpperCase();
    if (data.config !== undefined) updateData.config = data.config;
    if (data.display !== undefined) updateData.display = data.display;
    if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);

    const [lottery] = await db
      .update(lotteries)
      .set(updateData)
      .where(eq(lotteries.id, id))
      .returning();

    revalidatePath("/lotteries");
    revalidatePath(`/lotteries/${id}`);

    return {
      success: true,
      data: {
        id: lottery.id,
        code: lottery.code,
        title: lottery.title,
      },
    };
  } catch (error) {
    console.error("Failed to update lottery:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "更新抽奖失败",
    };
  }
}

export async function deleteLotteryAction(id: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";

    const [existing] = await db
      .select()
      .from(lotteries)
      .where(eq(lotteries.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, error: "抽奖不存在" };
    }

    if (!isAdmin && existing.userId !== user.id) {
      return { success: false, error: "无权限删除" };
    }

    await db.delete(lotteries).where(eq(lotteries.id, id));

    revalidatePath("/lotteries");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete lottery:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "删除抽奖失败",
    };
  }
}

export async function getLotteryWinnersAction(lotteryId: string, limit = 50) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const winners = await db
      .select()
      .from(lotteryWinners)
      .where(eq(lotteryWinners.lotteryId, lotteryId))
      .orderBy(desc(lotteryWinners.wonAt))
      .limit(limit);

    const data = winners.map((w) => ({
      id: w.id,
      phone: w.participantPhone,
      prizeName: w.prizeName,
      drawnAt: w.wonAt.getTime(),
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Failed to get lottery winners:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取中奖记录失败",
    };
  }
}
