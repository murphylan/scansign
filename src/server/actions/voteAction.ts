"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/utils/code-generator";
import { getCurrentUser } from "./authAction";
import { Prisma } from "@prisma/client";

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
  config?: Prisma.InputJsonValue;
  display?: Prisma.InputJsonValue;
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
    const where = isAdmin ? {} : { userId: user.id };

    const votes = await prisma.vote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        options: {
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: { records: true },
        },
      },
    });

    const data = votes.map((v) => ({
      id: v.id,
      code: v.code,
      title: v.title,
      description: v.description,
      status: v.status.toLowerCase(),
      voteType: v.voteType.toLowerCase(),
      maxChoices: v.maxChoices,
      options: v.options.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        imageUrl: o.imageUrl,
        voteCount: o.voteCount,
      })),
      config: v.config,
      display: v.display,
      totalVotes: v._count.records,
      startTime: v.startTime?.getTime(),
      endTime: v.endTime?.getTime(),
      createdAt: v.createdAt.getTime(),
      updatedAt: v.updatedAt.getTime(),
    }));

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
    const vote = await prisma.vote.findUnique({
      where: { id },
      include: {
        options: {
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: { records: true },
        },
      },
    });

    if (!vote) {
      return { success: false, error: "投票不存在" };
    }

    if (!isAdmin && vote.userId !== user.id) {
      return { success: false, error: "无权限访问" };
    }

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
        options: vote.options.map((o) => ({
          id: o.id,
          title: o.title,
          description: o.description,
          imageUrl: o.imageUrl,
          voteCount: o.voteCount,
        })),
        config: vote.config,
        display: vote.display,
        totalVotes: vote._count.records,
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

    const vote = await prisma.vote.create({
      data: {
        code,
        title: data.title,
        description: data.description,
        voteType: data.voteType || "SINGLE",
        maxChoices: data.maxChoices || 1,
        config: data.config || DEFAULT_CONFIG,
        display: data.display || DEFAULT_DISPLAY,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        userId: user.id,
        options: {
          create: data.options.map((o, index) => ({
            title: o.title,
            description: o.description,
            imageUrl: o.imageUrl,
            sortOrder: index,
          })),
        },
      },
    });

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
  data: Partial<VoteFormData> & { status?: string }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";
    const existing = await prisma.vote.findUnique({ where: { id } });

    if (!existing) {
      return { success: false, error: "投票不存在" };
    }

    if (!isAdmin && existing.userId !== user.id) {
      return { success: false, error: "无权限修改" };
    }

    const vote = await prisma.vote.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status?.toUpperCase() as "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED",
        voteType: data.voteType,
        maxChoices: data.maxChoices,
        config: data.config,
        display: data.display,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
      },
    });

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
    const existing = await prisma.vote.findUnique({ where: { id } });

    if (!existing) {
      return { success: false, error: "投票不存在" };
    }

    if (!isAdmin && existing.userId !== user.id) {
      return { success: false, error: "无权限删除" };
    }

    await prisma.vote.delete({ where: { id } });

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

