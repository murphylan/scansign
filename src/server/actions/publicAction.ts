"use server";

import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/utils/code-generator";

// ================================
// 签到相关
// ================================

export async function getCheckinByCodeAction(code: string) {
  try {
    const checkin = await prisma.checkin.findUnique({
      where: { code },
      include: {
        _count: {
          select: { records: true },
        },
      },
    });

    if (!checkin) {
      return { success: false, error: "签到不存在" };
    }

    return {
      success: true,
      data: {
        id: checkin.id,
        code: checkin.code,
        title: checkin.title,
        description: checkin.description,
        status: checkin.status.toLowerCase(),
        config: checkin.config,
        display: checkin.display,
        stats: {
          total: checkin.totalCount,
          today: checkin.todayCount,
        },
      },
    };
  } catch (error) {
    console.error("Failed to get checkin:", error);
    return { success: false, error: "获取签到失败" };
  }
}

export async function getCheckinRecordsByCodeAction(code: string, limit = 10) {
  try {
    const checkin = await prisma.checkin.findUnique({
      where: { code },
    });

    if (!checkin) {
      return { success: false, error: "签到不存在" };
    }

    const records = await prisma.checkinRecord.findMany({
      where: { checkinId: checkin.id },
      orderBy: { checkedInAt: "desc" },
      take: limit,
    });

    const data = records.map((r) => ({
      id: r.id,
      participant: {
        name: r.name,
        phone: r.phone,
      },
      department: r.department,
      checkedInAt: r.checkedInAt.getTime(),
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Failed to get records:", error);
    return { success: false, error: "获取记录失败" };
  }
}

export async function doCheckinAction(
  code: string,
  data: { name?: string; phone?: string; department?: string }
) {
  try {
    const checkin = await prisma.checkin.findUnique({
      where: { code },
    });

    if (!checkin) {
      return { success: false, error: "签到不存在" };
    }

    if (checkin.status !== "ACTIVE") {
      return { success: false, error: "签到未开始或已结束" };
    }

    const verifyCode = generateCode(6);

    const record = await prisma.checkinRecord.create({
      data: {
        checkinId: checkin.id,
        name: data.name,
        phone: data.phone,
        department: data.department,
        verifyCode,
      },
    });

    // 更新统计
    await prisma.checkin.update({
      where: { id: checkin.id },
      data: {
        totalCount: { increment: 1 },
        todayCount: { increment: 1 },
      },
    });

    return {
      success: true,
      data: {
        id: record.id,
        verifyCode: record.verifyCode,
      },
    };
  } catch (error) {
    console.error("Failed to do checkin:", error);
    return { success: false, error: "签到失败" };
  }
}

export async function checkCheckinPhoneAction(code: string, phone: string) {
  try {
    const checkin = await prisma.checkin.findUnique({
      where: { code },
    });

    if (!checkin) {
      return { success: false, error: "签到不存在" };
    }

    const record = await prisma.checkinRecord.findFirst({
      where: { checkinId: checkin.id, phone },
    });

    if (record) {
      return {
        success: true,
        data: {
          exists: true,
          name: record.name,
          department: record.department,
        },
      };
    }

    return { success: true, data: { exists: false } };
  } catch (error) {
    console.error("Failed to check phone:", error);
    return { success: false, error: "查询失败" };
  }
}

// ================================
// 投票相关
// ================================

export async function getVoteByCodeAction(code: string) {
  try {
    const vote = await prisma.vote.findUnique({
      where: { code },
    });

    if (!vote) {
      return { success: false, error: "投票不存在" };
    }

    return {
      success: true,
      data: {
        id: vote.id,
        code: vote.code,
        title: vote.title,
        description: vote.description,
        status: vote.status.toLowerCase(),
        config: vote.config,
        display: vote.display,
        stats: {
          totalVotes: vote.totalVotes,
          participantCount: vote.participantCount,
        },
      },
    };
  } catch (error) {
    console.error("Failed to get vote:", error);
    return { success: false, error: "获取投票失败" };
  }
}

export async function checkVotePhoneAction(code: string, phone: string) {
  try {
    const vote = await prisma.vote.findUnique({
      where: { code },
    });

    if (!vote) {
      return { success: false, error: "投票不存在" };
    }

    const record = await prisma.voteRecord.findFirst({
      where: { voteId: vote.id, phone },
    });

    if (record) {
      return {
        success: true,
        data: {
          voted: true,
          selectedOptions: record.selectedOptions,
        },
      };
    }

    return { success: true, data: { voted: false } };
  } catch (error) {
    console.error("Failed to check phone:", error);
    return { success: false, error: "查询失败" };
  }
}

export async function submitVoteAction(
  code: string,
  data: { phone?: string; selectedOptions: string[] }
) {
  try {
    const vote = await prisma.vote.findUnique({
      where: { code },
    });

    if (!vote) {
      return { success: false, error: "投票不存在" };
    }

    if (vote.status !== "ACTIVE") {
      return { success: false, error: "投票未开始或已结束" };
    }

    // 检查是否已投票
    if (data.phone) {
      const existing = await prisma.voteRecord.findFirst({
        where: { voteId: vote.id, phone: data.phone },
      });

      if (existing) {
        return { success: false, error: "您已投过票" };
      }
    }

    await prisma.voteRecord.create({
      data: {
        voteId: vote.id,
        phone: data.phone,
        selectedOptions: data.selectedOptions,
      },
    });

    // 更新统计
    await prisma.vote.update({
      where: { id: vote.id },
      data: {
        totalVotes: { increment: data.selectedOptions.length },
        participantCount: { increment: 1 },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to submit vote:", error);
    return { success: false, error: "投票失败" };
  }
}

// ================================
// 抽奖相关
// ================================

export async function getLotteryByCodeAction(code: string) {
  try {
    const lottery = await prisma.lottery.findUnique({
      where: { code },
    });

    if (!lottery) {
      return { success: false, error: "抽奖不存在" };
    }

    return {
      success: true,
      data: {
        id: lottery.id,
        code: lottery.code,
        title: lottery.title,
        description: lottery.description,
        status: lottery.status.toLowerCase(),
        config: lottery.config,
        display: lottery.display,
        stats: {
          winnersCount: lottery.winnersCount,
          participantCount: lottery.participantCount,
        },
      },
    };
  } catch (error) {
    console.error("Failed to get lottery:", error);
    return { success: false, error: "获取抽奖失败" };
  }
}

export async function getLotteryRecordsByCodeAction(code: string, limit = 10) {
  try {
    const lottery = await prisma.lottery.findUnique({
      where: { code },
    });

    if (!lottery) {
      return { success: false, error: "抽奖不存在" };
    }

    const records = await prisma.lotteryRecord.findMany({
      where: { lotteryId: lottery.id },
      orderBy: { drawnAt: "desc" },
      take: limit,
    });

    const data = records.map((r) => ({
      id: r.id,
      phone: r.phone,
      prizeName: r.prizeName,
      drawnAt: r.drawnAt.getTime(),
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Failed to get records:", error);
    return { success: false, error: "获取记录失败" };
  }
}

export async function checkLotteryPhoneAction(code: string, phone: string) {
  try {
    const lottery = await prisma.lottery.findUnique({
      where: { code },
    });

    if (!lottery) {
      return { success: false, error: "抽奖不存在" };
    }

    const record = await prisma.lotteryRecord.findFirst({
      where: { lotteryId: lottery.id, phone },
    });

    if (record) {
      return {
        success: true,
        data: {
          drawn: true,
          prize: record.prizeName,
        },
      };
    }

    return { success: true, data: { drawn: false } };
  } catch (error) {
    console.error("Failed to check phone:", error);
    return { success: false, error: "查询失败" };
  }
}

export async function drawLotteryAction(code: string, phone?: string) {
  try {
    const lottery = await prisma.lottery.findUnique({
      where: { code },
    });

    if (!lottery) {
      return { success: false, error: "抽奖不存在" };
    }

    if (lottery.status !== "ACTIVE") {
      return { success: false, error: "抽奖未开始或已结束" };
    }

    // 检查是否已抽奖
    if (phone) {
      const existing = await prisma.lotteryRecord.findFirst({
        where: { lotteryId: lottery.id, phone },
      });

      if (existing) {
        return { success: false, error: "您已参与过抽奖" };
      }
    }

    // 简单的随机抽奖逻辑
    const config = lottery.config as { prizes?: Array<{ id: string; name: string; remaining: number; probability: number }> };
    const prizes = config.prizes || [];
    
    // 找到一个有剩余的奖品
    const availablePrizes = prizes.filter(p => p.remaining > 0);
    if (availablePrizes.length === 0) {
      return { success: false, error: "奖品已抽完" };
    }

    // 按概率抽取
    const random = Math.random() * 100;
    let cumulative = 0;
    let selectedPrize = availablePrizes[availablePrizes.length - 1];
    
    for (const prize of availablePrizes) {
      cumulative += prize.probability;
      if (random <= cumulative) {
        selectedPrize = prize;
        break;
      }
    }

    // 创建中奖记录
    const record = await prisma.lotteryRecord.create({
      data: {
        lotteryId: lottery.id,
        phone,
        prizeId: selectedPrize.id,
        prizeName: selectedPrize.name,
      },
    });

    // 更新奖品剩余数量和统计
    const updatedPrizes = prizes.map(p => 
      p.id === selectedPrize.id ? { ...p, remaining: p.remaining - 1 } : p
    );

    await prisma.lottery.update({
      where: { id: lottery.id },
      data: {
        config: { ...config, prizes: updatedPrizes },
        winnersCount: { increment: 1 },
        participantCount: { increment: 1 },
      },
    });

    return {
      success: true,
      data: {
        id: record.id,
        prize: selectedPrize.name,
      },
    };
  } catch (error) {
    console.error("Failed to draw lottery:", error);
    return { success: false, error: "抽奖失败" };
  }
}

// ================================
// 表单相关
// ================================

export async function getFormByCodeAction(code: string) {
  try {
    const form = await prisma.form.findUnique({
      where: { code },
    });

    if (!form) {
      return { success: false, error: "表单不存在" };
    }

    return {
      success: true,
      data: {
        id: form.id,
        code: form.code,
        title: form.title,
        description: form.description,
        status: form.status.toLowerCase(),
        config: form.config,
        display: form.display,
        stats: {
          responseCount: form.responseCount,
        },
      },
    };
  } catch (error) {
    console.error("Failed to get form:", error);
    return { success: false, error: "获取表单失败" };
  }
}

export async function getFormResponsesByCodeAction(code: string, limit = 5) {
  try {
    const form = await prisma.form.findUnique({
      where: { code },
    });

    if (!form) {
      return { success: false, error: "表单不存在" };
    }

    const responses = await prisma.formResponse.findMany({
      where: { formId: form.id },
      orderBy: { submittedAt: "desc" },
      take: limit,
    });

    const data = responses.map((r) => ({
      id: r.id,
      phone: r.phone,
      data: r.data,
      submittedAt: r.submittedAt.getTime(),
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Failed to get responses:", error);
    return { success: false, error: "获取响应失败" };
  }
}

export async function submitFormAction(
  code: string,
  data: { phone?: string; formData: Record<string, unknown> }
) {
  try {
    const form = await prisma.form.findUnique({
      where: { code },
    });

    if (!form) {
      return { success: false, error: "表单不存在" };
    }

    if (form.status !== "ACTIVE") {
      return { success: false, error: "表单未开始或已结束" };
    }

    await prisma.formResponse.create({
      data: {
        formId: form.id,
        phone: data.phone,
        data: data.formData,
      },
    });

    // 更新统计
    await prisma.form.update({
      where: { id: form.id },
      data: {
        responseCount: { increment: 1 },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to submit form:", error);
    return { success: false, error: "提交失败" };
  }
}

