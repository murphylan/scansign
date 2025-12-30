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
  requirePhone: false,
  allowMultipleWins: false,
  showWinners: true,
  autoAnnounce: true,
};

const DEFAULT_DISPLAY = {
  style: "wheel",
  showParticipantCount: true,
  showWinnerAnimation: true,
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

export interface LotteryFormData {
  title: string;
  description?: string;
  prizes?: Prisma.InputJsonValue;
  config?: Prisma.InputJsonValue;
  display?: Prisma.InputJsonValue;
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
    const where = isAdmin ? {} : { userId: user.id };

    const lotteries = await prisma.lottery.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const data = lotteries.map((l) => ({
      id: l.id,
      code: l.code,
      title: l.title,
      description: l.description,
      status: l.status.toLowerCase(),
      prizes: l.prizes,
      config: l.config,
      display: l.display,
      participantCount: l.participantCount,
      startTime: l.startTime?.getTime(),
      endTime: l.endTime?.getTime(),
      createdAt: l.createdAt.getTime(),
      updatedAt: l.updatedAt.getTime(),
    }));

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
    const lottery = await prisma.lottery.findUnique({
      where: { id },
    });

    if (!lottery) {
      return { success: false, error: "抽奖不存在" };
    }

    if (!isAdmin && lottery.userId !== user.id) {
      return { success: false, error: "无权限访问" };
    }

    return {
      success: true,
      data: {
        id: lottery.id,
        code: lottery.code,
        title: lottery.title,
        description: lottery.description,
        status: lottery.status.toLowerCase(),
        prizes: lottery.prizes,
        config: lottery.config,
        display: lottery.display,
        participantCount: lottery.participantCount,
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

    const lottery = await prisma.lottery.create({
      data: {
        code,
        title: data.title,
        description: data.description,
        status: "ACTIVE", // 创建后默认为进行中
        prizes: data.prizes || [],
        config: data.config || DEFAULT_CONFIG,
        display: data.display || DEFAULT_DISPLAY,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        userId: user.id,
      },
    });

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
  data: Partial<LotteryFormData> & { status?: string }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";
    const existing = await prisma.lottery.findUnique({ where: { id } });

    if (!existing) {
      return { success: false, error: "抽奖不存在" };
    }

    if (!isAdmin && existing.userId !== user.id) {
      return { success: false, error: "无权限修改" };
    }

    const lottery = await prisma.lottery.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status?.toUpperCase() as "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED",
        prizes: data.prizes,
        config: data.config,
        display: data.display,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
      },
    });

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
    const existing = await prisma.lottery.findUnique({ where: { id } });

    if (!existing) {
      return { success: false, error: "抽奖不存在" };
    }

    if (!isAdmin && existing.userId !== user.id) {
      return { success: false, error: "无权限删除" };
    }

    await prisma.lottery.delete({ where: { id } });

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

export async function drawLotteryAction(id: string, count: number = 1) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";
    const lottery = await prisma.lottery.findUnique({
      where: { id },
      include: {
        participants: true,
        winners: true,
      },
    });

    if (!lottery) {
      return { success: false, error: "抽奖不存在" };
    }

    if (!isAdmin && lottery.userId !== user.id) {
      return { success: false, error: "无权限抽奖" };
    }

    const config = lottery.config as { allowMultipleWins?: boolean } | null;
    const allowMultipleWins = config?.allowMultipleWins ?? false;

    const eligibleParticipants = allowMultipleWins
      ? lottery.participants
      : lottery.participants.filter(
          (p) => !lottery.winners.some((w) => w.participantId === p.id)
        );

    if (eligibleParticipants.length === 0) {
      return { success: false, error: "没有可抽奖的参与者" };
    }

    const drawCount = Math.min(count, eligibleParticipants.length);
    const shuffled = [...eligibleParticipants].sort(() => Math.random() - 0.5);
    const winners = shuffled.slice(0, drawCount);

    const prizes = lottery.prizes as Array<{ name?: string; level?: number }> | null;
    const prizeInfo = prizes?.[0] || { name: "幸运奖", level: 1 };

    const createdWinners = await Promise.all(
      winners.map((w) =>
        prisma.lotteryWinner.create({
          data: {
            lotteryId: id,
            participantId: w.id,
            participantName: w.name,
            participantPhone: w.phone,
            prizeName: prizeInfo.name || "幸运奖",
            prizeLevel: prizeInfo.level || 1,
          },
        })
      )
    );

    return {
      success: true,
      data: createdWinners.map((w) => ({
        id: w.id,
        name: w.participantName,
        phone: w.participantPhone,
        prizeName: w.prizeName,
        prizeLevel: w.prizeLevel,
        wonAt: w.wonAt.getTime(),
      })),
    };
  } catch (error) {
    console.error("Failed to draw lottery:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "抽奖失败",
    };
  }
}

export async function getLotteryParticipantsAction(lotteryId: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const participants = await prisma.lotteryParticipant.findMany({
      where: { lotteryId },
      orderBy: { joinedAt: "desc" },
    });

    const data = participants.map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      joinedAt: p.joinedAt.getTime(),
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Failed to get participants:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取参与者失败",
    };
  }
}

export async function getLotteryWinnersAction(lotteryId: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const winners = await prisma.lotteryWinner.findMany({
      where: { lotteryId },
      orderBy: { wonAt: "desc" },
    });

    const data = winners.map((w) => ({
      id: w.id,
      name: w.participantName,
      phone: w.participantPhone,
      prizeName: w.prizeName,
      prizeLevel: w.prizeLevel,
      wonAt: w.wonAt.getTime(),
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Failed to get winners:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取获奖者失败",
    };
  }
}

