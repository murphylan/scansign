"use server";

import { randomUUID } from "crypto";
import { eq, desc, sql, and, gt } from "drizzle-orm";
import { db } from "@/server/db";
import {
  checkins,
  checkinRecords,
  checkinWhitelist,
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

    // 检查有效期状态
    const now = new Date();
    let status = checkin.status.toLowerCase();
    let remainingSeconds: number | null = null;
    let isExpired = false;

    if (checkin.endTime) {
      if (now > checkin.endTime) {
        isExpired = true;
        status = "ended";
        // 自动更新数据库状态
        if (checkin.status === "ACTIVE") {
          await db
            .update(checkins)
            .set({ status: "ENDED", updatedAt: new Date() })
            .where(eq(checkins.id, checkin.id));
        }
      } else {
        remainingSeconds = Math.floor((checkin.endTime.getTime() - now.getTime()) / 1000);
      }
    }

    if (checkin.startTime && now < checkin.startTime) {
      status = "pending";
    }

    return {
      success: true,
      data: {
        id: checkin.id,
        code: checkin.code,
        title: checkin.title,
        description: checkin.description,
        status,
        config: checkin.config,
        display: checkin.display,
        stats: {
          total: checkin.totalCount,
          today: checkin.todayCount,
        },
        // 有效期信息
        startTime: checkin.startTime?.getTime(),
        endTime: checkin.endTime?.getTime(),
        remainingSeconds,
        isExpired,
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
  data: {
    name?: string;
    phone?: string;
    department?: string;
    // 安全相关参数
    deviceFingerprint?: string;
    deviceId?: string;
  }
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

    // 检查有效期
    const now = new Date();
    if (checkin.startTime && now < checkin.startTime) {
      return { success: false, error: "签到尚未开始" };
    }
    if (checkin.endTime && now > checkin.endTime) {
      // 自动将状态更新为已结束
      await db
        .update(checkins)
        .set({ status: "ENDED", updatedAt: new Date() })
        .where(eq(checkins.id, checkin.id));
      return { success: false, error: "签到已过期" };
    }

    // 解析签到配置
    const config = (checkin.config || {}) as {
      security?: {
        enableWhitelist?: boolean;       // 启用白名单
        enableDeviceLimit?: boolean;     // 启用设备限制（同一设备只能签到一次）
        maxCheckinPerDevice?: number;    // 每设备最大签到数
        enableIpLimit?: boolean;         // 启用 IP 限制
        maxCheckinPerIp?: number;        // 每 IP 最大签到数
      };
      allowRepeat?: boolean;
      allowDuplicate?: boolean;
    };

    // 安全配置：设备限制默认启用
    const security = {
      enableDeviceLimit: true,      // 默认启用设备限制
      maxCheckinPerDevice: 1,       // 默认每设备1次
      ...config.security,           // 使用配置的值覆盖默认值
    };

    // 1. 白名单验证
    if (security.enableWhitelist && data.phone) {
      const [whitelistEntry] = await db
        .select()
        .from(checkinWhitelist)
        .where(
          and(
            eq(checkinWhitelist.checkinId, checkin.id),
            eq(checkinWhitelist.phone, data.phone)
          )
        )
        .limit(1);

      if (!whitelistEntry) {
        return { success: false, error: "您不在签到名单中，请联系活动组织者" };
      }
    }

    // 2. 设备限制验证
    if (security.enableDeviceLimit) {
      // 如果没有设备ID，拒绝签到
      if (!data.deviceId) {
        return { 
          success: false, 
          error: "无法识别设备，请刷新页面后重试" 
        };
      }
      
      const maxPerDevice = security.maxCheckinPerDevice || 1;
      
      const deviceRecords = await db
        .select({ count: sql<number>`count(*)` })
        .from(checkinRecords)
        .where(
          and(
            eq(checkinRecords.checkinId, checkin.id),
            eq(checkinRecords.deviceFingerprint, data.deviceId)
          )
        );

      const deviceCount = Number(deviceRecords[0]?.count || 0);
      
      if (deviceCount >= maxPerDevice) {
        return { 
          success: false, 
          error: "此设备已完成签到，请勿重复操作" 
        };
      }
    }

    // 检查是否已存在记录（根据手机号）
    let existingRecord = null;
    if (data.phone) {
      const [existing] = await db
        .select()
        .from(checkinRecords)
        .where(
          and(
            eq(checkinRecords.checkinId, checkin.id),
            eq(checkinRecords.phone, data.phone)
          )
        )
        .limit(1);
      existingRecord = existing;
    }

    let record;
    let isUpdate = false;

    if (existingRecord) {
      // 重复签到：更新现有记录的签到时间，保留原验证码
      // 这样会触发 SSE 推送，从而在大屏显示弹幕
      const [updated] = await db
        .update(checkinRecords)
        .set({
          name: data.name || existingRecord.name,
          department: data.department || existingRecord.department,
          checkedInAt: new Date(), // 更新签到时间，触发 SSE 推送
        })
        .where(eq(checkinRecords.id, existingRecord.id))
        .returning();
      record = updated;
      isUpdate = true;
      
      // 更新签到活动的 updatedAt 以触发 SSE 检测
      await db
        .update(checkins)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(checkins.id, checkin.id));
    } else {
      // 首次签到：创建新记录
      const verifyCode = generateCode(6);

      const [created] = await db
        .insert(checkinRecords)
        .values({
          id: randomUUID(),
          checkinId: checkin.id,
          name: data.name || null,
          phone: data.phone || null,
          department: data.department || null,
          deviceFingerprint: data.deviceId || null,
          verifyCode,
          isConfirmed: true, // 签到后直接确认
        })
        .returning();
      record = created;

      // 更新统计（只有首次签到才增加计数）
      await db
        .update(checkins)
        .set({
          totalCount: sql`${checkins.totalCount} + 1`,
          todayCount: sql`${checkins.todayCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(checkins.id, checkin.id));

      // 如果启用了白名单，更新白名单状态
      if (security.enableWhitelist && data.phone) {
        await db
          .update(checkinWhitelist)
          .set({
            hasCheckedIn: true,
            checkedInAt: new Date(),
          })
          .where(
            and(
              eq(checkinWhitelist.checkinId, checkin.id),
              eq(checkinWhitelist.phone, data.phone)
            )
          );
      }
    }

    return {
      success: true,
      data: {
        id: record.id,
        verifyCode: record.verifyCode,
        isUpdate, // 告诉前端是更新还是新建
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
