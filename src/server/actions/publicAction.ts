"use server";

import { randomUUID } from "crypto";
import { eq, desc, sql, and, gt } from "drizzle-orm";
import { db } from "@/server/db";
import {
  checkins,
  checkinRecords,
  votes,
  voteOptions,
  voteRecords,
  lotteries,
  lotteryPrizes,
  lotteryParticipants,
  lotteryWinners,
  forms,
  formResponses,
} from "@/server/db/schema";
import { generateCode } from "@/lib/utils/code-generator";

// ================================
// 签到相关
// ================================

export async function getCheckinByCodeAction(code: string) {
  try {
    const [checkin] = await db
      .select()
      .from(checkins)
      .where(eq(checkins.code, code))
      .limit(1);

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
    const [checkin] = await db
      .select()
      .from(checkins)
      .where(eq(checkins.code, code))
      .limit(1);

    if (!checkin) {
      return { success: false, error: "签到不存在" };
    }

    const records = await db
      .select()
      .from(checkinRecords)
      .where(eq(checkinRecords.checkinId, checkin.id))
      .orderBy(desc(checkinRecords.checkedInAt))
      .limit(limit);

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
    const [checkin] = await db
      .select()
      .from(checkins)
      .where(eq(checkins.code, code))
      .limit(1);

    if (!checkin) {
      return { success: false, error: "签到不存在" };
    }

    if (checkin.status !== "ACTIVE") {
      return { success: false, error: "签到未开始或已结束" };
    }

    const verifyCode = generateCode(6);

    const [record] = await db
      .insert(checkinRecords)
      .values({
        id: randomUUID(),
        checkinId: checkin.id,
        name: data.name || null,
        phone: data.phone || null,
        department: data.department || null,
        verifyCode,
      })
      .returning();

    // 更新统计
    await db
      .update(checkins)
      .set({
        totalCount: sql`${checkins.totalCount} + 1`,
        todayCount: sql`${checkins.todayCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(checkins.id, checkin.id));

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
    const [checkin] = await db
      .select()
      .from(checkins)
      .where(eq(checkins.code, code))
      .limit(1);

    if (!checkin) {
      return { success: false, error: "签到不存在" };
    }

    const [record] = await db
      .select()
      .from(checkinRecords)
      .where(
        and(
          eq(checkinRecords.checkinId, checkin.id),
          eq(checkinRecords.phone, phone)
        )
      )
      .limit(1);

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
    const [vote] = await db
      .select()
      .from(votes)
      .where(eq(votes.code, code))
      .limit(1);

    if (!vote) {
      return { success: false, error: "投票不存在" };
    }

    // 获取选项
    const options = await db
      .select()
      .from(voteOptions)
      .where(eq(voteOptions.voteId, vote.id))
      .orderBy(voteOptions.sortOrder);

    // 计算总票数和参与人数
    const totalVotes = options.reduce((sum, o) => sum + o.voteCount, 0);
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(voteRecords)
      .where(eq(voteRecords.voteId, vote.id));
    const participantCount = Number(countResult?.count || 0);

    // 从数据库获取的 config
    const dbConfig = (vote.config || {}) as Record<string, unknown>;

    // 将选项数据合并到 config 中（前端期望的格式）
    const config = {
      ...dbConfig,
      voteType: vote.voteType.toLowerCase(),
      maxSelect: vote.maxChoices,
      minSelect: 1,
      options: options.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        count: o.voteCount,
      })),
    };

    return {
      success: true,
      data: {
        id: vote.id,
        code: vote.code,
        title: vote.title,
        description: vote.description,
        status: vote.status.toLowerCase(),
        config,
        display: vote.display,
        stats: {
          totalVotes,
          participantCount,
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
    const [vote] = await db
      .select()
      .from(votes)
      .where(eq(votes.code, code))
      .limit(1);

    if (!vote) {
      return { success: false, error: "投票不存在" };
    }

    const [record] = await db
      .select()
      .from(voteRecords)
      .where(
        and(
          eq(voteRecords.voteId, vote.id),
          eq(voteRecords.phone, phone)
        )
      )
      .limit(1);

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
    const [vote] = await db
      .select()
      .from(votes)
      .where(eq(votes.code, code))
      .limit(1);

    if (!vote) {
      return { success: false, error: "投票不存在" };
    }

    if (vote.status !== "ACTIVE") {
      return { success: false, error: "投票未开始或已结束" };
    }

    // 检查是否已投票
    if (data.phone) {
      const [existing] = await db
        .select()
        .from(voteRecords)
        .where(
          and(
            eq(voteRecords.voteId, vote.id),
            eq(voteRecords.phone, data.phone)
          )
        )
        .limit(1);

      if (existing) {
        return { success: false, error: "您已投过票" };
      }
    }

    // 创建投票记录
    await db.insert(voteRecords).values({
      id: randomUUID(),
      voteId: vote.id,
      phone: data.phone || null,
      selectedOptions: data.selectedOptions,
    });

    // 更新每个选项的投票计数
    for (const optionId of data.selectedOptions) {
      await db
        .update(voteOptions)
        .set({
          voteCount: sql`${voteOptions.voteCount} + 1`,
        })
        .where(eq(voteOptions.id, optionId));
    }

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
    const [lottery] = await db
      .select()
      .from(lotteries)
      .where(eq(lotteries.code, code))
      .limit(1);

    if (!lottery) {
      return { success: false, error: "抽奖不存在" };
    }

    // 获取奖品
    const prizes = await db
      .select()
      .from(lotteryPrizes)
      .where(eq(lotteryPrizes.lotteryId, lottery.id))
      .orderBy(lotteryPrizes.sortOrder);

    // 统计中奖人数
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
          prizes: prizes.map((p) => ({
            id: p.id,
            name: p.name,
            remaining: p.remaining,
            probability: p.probability,
          })),
        },
        display: lottery.display,
        stats: {
          winnersCount: Number(winnersCount?.count || 0),
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
    const [lottery] = await db
      .select()
      .from(lotteries)
      .where(eq(lotteries.code, code))
      .limit(1);

    if (!lottery) {
      return { success: false, error: "抽奖不存在" };
    }

    const winners = await db
      .select()
      .from(lotteryWinners)
      .where(eq(lotteryWinners.lotteryId, lottery.id))
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
    console.error("Failed to get records:", error);
    return { success: false, error: "获取记录失败" };
  }
}

export async function checkLotteryPhoneAction(code: string, phone: string) {
  try {
    const [lottery] = await db
      .select()
      .from(lotteries)
      .where(eq(lotteries.code, code))
      .limit(1);

    if (!lottery) {
      return { success: false, error: "抽奖不存在" };
    }

    const [winner] = await db
      .select()
      .from(lotteryWinners)
      .where(
        and(
          eq(lotteryWinners.lotteryId, lottery.id),
          eq(lotteryWinners.participantPhone, phone)
        )
      )
      .limit(1);

    if (winner) {
      return {
        success: true,
        data: {
          drawn: true,
          prize: winner.prizeName,
        },
      };
    }

    return { success: true, data: { drawn: false } };
  } catch (error) {
    console.error("Failed to check phone:", error);
    return { success: false, error: "查询失败" };
  }
}

export async function drawLotteryAction(
  code: string,
  phone?: string,
  name?: string
) {
  try {
    const [lottery] = await db
      .select()
      .from(lotteries)
      .where(eq(lotteries.code, code))
      .limit(1);

    if (!lottery) {
      return { success: false, error: "抽奖不存在" };
    }

    if (lottery.status !== "ACTIVE") {
      return { success: false, error: "抽奖未开始或已结束" };
    }

    // 检查是否已抽奖
    if (phone) {
      const [existing] = await db
        .select()
        .from(lotteryWinners)
        .where(
          and(
            eq(lotteryWinners.lotteryId, lottery.id),
            eq(lotteryWinners.participantPhone, phone)
          )
        )
        .limit(1);

      if (existing) {
        return { success: false, error: "您已参与过抽奖" };
      }
    }

    // 获取有剩余的奖品
    const availablePrizes = await db
      .select()
      .from(lotteryPrizes)
      .where(
        and(
          eq(lotteryPrizes.lotteryId, lottery.id),
          gt(lotteryPrizes.remaining, 0)
        )
      )
      .orderBy(lotteryPrizes.sortOrder);

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

    // 创建参与者记录
    const [participant] = await db
      .insert(lotteryParticipants)
      .values({
        id: randomUUID(),
        lotteryId: lottery.id,
        name: name || "匿名用户",
        phone: phone || null,
        hasWon: true,
      })
      .returning();

    // 创建中奖记录
    const [winner] = await db
      .insert(lotteryWinners)
      .values({
        id: randomUUID(),
        lotteryId: lottery.id,
        participantId: participant.id,
        participantName: name || "匿名用户",
        participantPhone: phone || null,
        prizeName: selectedPrize.name,
        prizeLevel: selectedPrize.sortOrder + 1,
      })
      .returning();

    // 更新奖品剩余数量
    await db
      .update(lotteryPrizes)
      .set({
        remaining: sql`${lotteryPrizes.remaining} - 1`,
      })
      .where(eq(lotteryPrizes.id, selectedPrize.id));

    // 更新参与人数
    await db
      .update(lotteries)
      .set({
        participantCount: sql`${lotteries.participantCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(lotteries.id, lottery.id));

    return {
      success: true,
      data: {
        id: winner.id,
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
    const [form] = await db
      .select()
      .from(forms)
      .where(eq(forms.code, code))
      .limit(1);

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
        fields: form.fields,
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
    const [form] = await db
      .select()
      .from(forms)
      .where(eq(forms.code, code))
      .limit(1);

    if (!form) {
      return { success: false, error: "表单不存在" };
    }

    const responses = await db
      .select()
      .from(formResponses)
      .where(eq(formResponses.formId, form.id))
      .orderBy(desc(formResponses.submittedAt))
      .limit(limit);

    const data = responses.map((r) => ({
      id: r.id,
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
  data: { formData: Record<string, unknown> }
) {
  try {
    const [form] = await db
      .select()
      .from(forms)
      .where(eq(forms.code, code))
      .limit(1);

    if (!form) {
      return { success: false, error: "表单不存在" };
    }

    if (form.status !== "ACTIVE") {
      return { success: false, error: "表单未开始或已结束" };
    }

    await db.insert(formResponses).values({
      id: randomUUID(),
      formId: form.id,
      data: data.formData,
    });

    // 更新统计
    await db
      .update(forms)
      .set({
        responseCount: sql`${forms.responseCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(forms.id, form.id));

    return { success: true };
  } catch (error) {
    console.error("Failed to submit form:", error);
    return { success: false, error: "提交失败" };
  }
}
