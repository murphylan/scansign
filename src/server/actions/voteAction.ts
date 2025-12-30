"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { votes, voteOptions, voteRecords } from "@/server/db/schema";
import { generateCode } from "@/lib/utils/code-generator";
import { getCurrentUser } from "./authAction";

// ================================
// 默认配置
// ================================

const DEFAULT_CONFIG = {
  allowAnonymous: true,
  requirePhone: false,
  showResults: true,
  showVoterCount: true,
};

const DEFAULT_DISPLAY = {
  chartType: "bar",
  showPercentage: true,
  showVoteCount: true,
  qrCode: {
    show: true,
    position: "bottom-right",
    size: "medium",
  },
  background: {
    type: "gradient",
    value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
};

// ================================
// 类型定义
// ================================

export interface VoteFormData {
  title: string;
  description?: string;
  voteType?: "SINGLE" | "MULTIPLE";
  maxChoices?: number;
  options?: Array<{
    title: string;
    description?: string;
    imageUrl?: string;
  }>;
  config?: Record<string, unknown>;
  display?: Record<string, unknown>;
  startTime?: string;
  endTime?: string;
}

// ================================
// Server Actions
// ================================

export async function listVotesAction() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";

    // 获取投票列表
    const voteList = isAdmin
      ? await db.select().from(votes).orderBy(desc(votes.createdAt))
      : await db
          .select()
          .from(votes)
          .where(eq(votes.userId, user.id))
          .orderBy(desc(votes.createdAt));

    // 获取每个投票的选项和记录数
    const data = await Promise.all(
      voteList.map(async (v) => {
        const options = await db
          .select()
          .from(voteOptions)
          .where(eq(voteOptions.voteId, v.id))
          .orderBy(voteOptions.sortOrder);

        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(voteRecords)
          .where(eq(voteRecords.voteId, v.id));

        return {
          id: v.id,
          code: v.code,
          title: v.title,
          description: v.description,
          status: v.status.toLowerCase(),
          voteType: v.voteType.toLowerCase(),
          maxChoices: v.maxChoices,
          options: options.map((o) => ({
            id: o.id,
            title: o.title,
            description: o.description,
            imageUrl: o.imageUrl,
            voteCount: o.voteCount,
          })),
          config: v.config,
          display: v.display,
          totalVotes: Number(countResult?.count || 0),
          startTime: v.startTime?.getTime(),
          endTime: v.endTime?.getTime(),
          createdAt: v.createdAt.getTime(),
          updatedAt: v.updatedAt.getTime(),
        };
      })
    );

    return { success: true, data };
  } catch (error) {
    console.error("Failed to list votes:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取投票列表失败",
    };
  }
}

export async function getVoteAction(id: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";

    const [vote] = await db
      .select()
      .from(votes)
      .where(eq(votes.id, id))
      .limit(1);

    if (!vote) {
      return { success: false, error: "投票不存在" };
    }

    if (!isAdmin && vote.userId !== user.id) {
      return { success: false, error: "无权限访问" };
    }

    const options = await db
      .select()
      .from(voteOptions)
      .where(eq(voteOptions.voteId, vote.id))
      .orderBy(voteOptions.sortOrder);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(voteRecords)
      .where(eq(voteRecords.voteId, vote.id));

    // 计算总票数
    const totalVotes = options.reduce((sum, o) => sum + o.voteCount, 0);

    return {
      success: true,
      data: {
        id: vote.id,
        code: vote.code,
        title: vote.title,
        description: vote.description,
        status: vote.status.toLowerCase(),
        voteType: vote.voteType.toLowerCase(),
        maxChoices: vote.maxChoices,
        config: {
          ...((vote.config || {}) as Record<string, unknown>),
          voteType: vote.voteType.toLowerCase(),
          maxSelect: vote.maxChoices,
          options: options.map((o) => ({
            id: o.id,
            title: o.title,
            description: o.description,
            count: o.voteCount,
          })),
        },
        display: vote.display,
        stats: {
          totalVotes,
          participantCount: Number(countResult?.count || 0),
        },
        startTime: vote.startTime?.getTime(),
        endTime: vote.endTime?.getTime(),
        createdAt: vote.createdAt.getTime(),
        updatedAt: vote.updatedAt.getTime(),
      },
    };
  } catch (error) {
    console.error("Failed to get vote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取投票失败",
    };
  }
}

export async function createVoteAction(data: VoteFormData) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    if (!data.title?.trim()) {
      return { success: false, error: "请输入投票标题" };
    }

    if (!data.options || data.options.length < 2) {
      return { success: false, error: "至少需要2个选项" };
    }

    const code = generateCode();
    const voteId = randomUUID();

    // 创建投票
    const [vote] = await db
      .insert(votes)
      .values({
        id: voteId,
        code,
        title: data.title,
        description: data.description || null,
        status: "ACTIVE",
        voteType: data.voteType || "SINGLE",
        maxChoices: data.maxChoices || 1,
        config: data.config || DEFAULT_CONFIG,
        display: data.display || DEFAULT_DISPLAY,
        startTime: data.startTime ? new Date(data.startTime) : null,
        endTime: data.endTime ? new Date(data.endTime) : null,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // 创建选项
    await db.insert(voteOptions).values(
      data.options.map((o, index) => ({
        id: randomUUID(),
        voteId: vote.id,
        title: o.title,
        description: o.description || null,
        imageUrl: o.imageUrl || null,
        sortOrder: index,
        voteCount: 0,
      }))
    );

    revalidatePath("/votes");

    return {
      success: true,
      data: {
        id: vote.id,
        code: vote.code,
        title: vote.title,
      },
    };
  } catch (error) {
    console.error("Failed to create vote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "创建投票失败",
    };
  }
}

export async function updateVoteAction(
  id: string,
  data: Partial<VoteFormData> & { status?: string; reset?: boolean }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";

    const [existing] = await db
      .select()
      .from(votes)
      .where(eq(votes.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, error: "投票不存在" };
    }

    if (!isAdmin && existing.userId !== user.id) {
      return { success: false, error: "无权限修改" };
    }

    // 如果是重置操作
    if (data.reset) {
      await db
        .update(voteOptions)
        .set({ voteCount: 0 })
        .where(eq(voteOptions.voteId, id));

      await db.delete(voteRecords).where(eq(voteRecords.voteId, id));

      revalidatePath("/votes");
      revalidatePath(`/votes/${id}`);

      return { success: true, data: { id: existing.id } };
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status.toUpperCase();
    if (data.voteType !== undefined) updateData.voteType = data.voteType;
    if (data.maxChoices !== undefined) updateData.maxChoices = data.maxChoices;
    if (data.config !== undefined) updateData.config = data.config;
    if (data.display !== undefined) updateData.display = data.display;
    if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);

    const [vote] = await db
      .update(votes)
      .set(updateData)
      .where(eq(votes.id, id))
      .returning();

    revalidatePath("/votes");
    revalidatePath(`/votes/${id}`);

    return {
      success: true,
      data: {
        id: vote.id,
        code: vote.code,
        title: vote.title,
      },
    };
  } catch (error) {
    console.error("Failed to update vote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "更新投票失败",
    };
  }
}

export async function deleteVoteAction(id: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";

    const [existing] = await db
      .select()
      .from(votes)
      .where(eq(votes.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, error: "投票不存在" };
    }

    if (!isAdmin && existing.userId !== user.id) {
      return { success: false, error: "无权限删除" };
    }

    await db.delete(votes).where(eq(votes.id, id));

    revalidatePath("/votes");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete vote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "删除投票失败",
    };
  }
}
