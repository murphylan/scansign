"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { eq, desc, sql, and } from "drizzle-orm";
import { db } from "@/server/db";
import { checkins, checkinRecords, checkinWhitelist } from "@/server/db/schema";
import { generateCode } from "@/lib/utils/code-generator";
import { getCurrentUser } from "./authAction";

// ================================
// 常量配置
// ================================

const MAX_DURATION_MINUTES = 60; // 签到最长有效期（分钟）
const DEFAULT_DURATION_MINUTES = 5; // 签到默认有效期（分钟）

// ================================
// 默认配置
// ================================

const DEFAULT_CONFIG = {
  requireName: true,
  requirePhone: false,
  requireEmail: false,
  requireVerify: false,
  allowDuplicate: false,
  duplicateField: "phone",
  departments: [],
  // 有效期配置
  durationMinutes: DEFAULT_DURATION_MINUTES, // 默认5分钟有效期
  // 安全配置
  security: {
    enableDeviceLimit: true, // 默认启用设备限制
    maxCheckinPerDevice: 1,  // 每设备最多签到1次
  },
};

const DEFAULT_DISPLAY = {
  welcomeTemplate: "🎉 欢迎 {{name}} 加入！",
  showStats: true,
  showRecentList: true,
  showDepartment: false,
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

export interface CheckinFormData {
  title: string;
  description?: string;
  config?: Record<string, unknown>;
  display?: Record<string, unknown>;
  startTime?: string;
  endTime?: string;
}

// ================================
// Server Actions
// ================================

export async function listCheckinsAction() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";

    const checkinList = isAdmin
      ? await db.select().from(checkins).orderBy(desc(checkins.createdAt))
      : await db
          .select()
          .from(checkins)
          .where(eq(checkins.userId, user.id))
          .orderBy(desc(checkins.createdAt));

    const data = checkinList.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      description: c.description,
      status: c.status.toLowerCase(),
      stats: {
        total: c.totalCount,
        today: c.todayCount,
      },
      config: c.config,
      display: c.display,
      startTime: c.startTime?.getTime(),
      endTime: c.endTime?.getTime(),
      createdAt: c.createdAt.getTime(),
      updatedAt: c.updatedAt.getTime(),
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Failed to list checkins:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取签到列表失败",
    };
  }
}

export async function getCheckinAction(id: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";

    const [checkin] = await db
      .select()
      .from(checkins)
      .where(eq(checkins.id, id))
      .limit(1);

    if (!checkin) {
      return { success: false, error: "签到不存在" };
    }

    if (!isAdmin && checkin.userId !== user.id) {
      return { success: false, error: "无权限访问" };
    }

    return {
      success: true,
      data: {
        id: checkin.id,
        code: checkin.code,
        title: checkin.title,
        description: checkin.description,
        status: checkin.status.toLowerCase(),
        stats: {
          total: checkin.totalCount,
          today: checkin.todayCount,
        },
        config: checkin.config,
        display: checkin.display,
        startTime: checkin.startTime?.getTime(),
        endTime: checkin.endTime?.getTime(),
        createdAt: checkin.createdAt.getTime(),
        updatedAt: checkin.updatedAt.getTime(),
      },
    };
  } catch (error) {
    console.error("Failed to get checkin:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取签到失败",
    };
  }
}

export async function createCheckinAction(data: CheckinFormData) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    if (!data.title?.trim()) {
      return { success: false, error: "请输入签到标题" };
    }

    const code = generateCode();
    
    // 计算有效期
    const config = data.config || DEFAULT_CONFIG;
    const configObj = config as { durationMinutes?: number };
    let durationMinutes = configObj.durationMinutes ?? DEFAULT_DURATION_MINUTES;
    
    // 限制最长有效期
    if (durationMinutes > MAX_DURATION_MINUTES) {
      durationMinutes = MAX_DURATION_MINUTES;
    }
    if (durationMinutes < 1) {
      durationMinutes = 1; // 最少1分钟
    }
    
    // 自动设置开始时间和结束时间
    const now = new Date();
    const startTime = data.startTime ? new Date(data.startTime) : now;
    const endTime = data.endTime 
      ? new Date(data.endTime) 
      : new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    
    // 确保结束时间不超过开始时间 + 最大有效期
    const maxEndTime = new Date(startTime.getTime() + MAX_DURATION_MINUTES * 60 * 1000);
    const finalEndTime = endTime > maxEndTime ? maxEndTime : endTime;

    const [checkin] = await db
      .insert(checkins)
      .values({
        id: randomUUID(),
        code,
        title: data.title,
        description: data.description || null,
        status: "ACTIVE",
        config: { ...config, durationMinutes },
        display: data.display || DEFAULT_DISPLAY,
        startTime,
        endTime: finalEndTime,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    revalidatePath("/checkins");

    return {
      success: true,
      data: {
        id: checkin.id,
        code: checkin.code,
        title: checkin.title,
        startTime: startTime.getTime(),
        endTime: finalEndTime.getTime(),
      },
    };
  } catch (error) {
    console.error("Failed to create checkin:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "创建签到失败",
    };
  }
}

export async function updateCheckinAction(
  id: string,
  data: Partial<CheckinFormData> & { status?: string }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";

    const [existing] = await db
      .select()
      .from(checkins)
      .where(eq(checkins.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, error: "签到不存在" };
    }

    if (!isAdmin && existing.userId !== user.id) {
      return { success: false, error: "无权限修改" };
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

    const [checkin] = await db
      .update(checkins)
      .set(updateData)
      .where(eq(checkins.id, id))
      .returning();

    revalidatePath("/checkins");
    revalidatePath(`/checkins/${id}`);

    return {
      success: true,
      data: {
        id: checkin.id,
        code: checkin.code,
        title: checkin.title,
      },
    };
  } catch (error) {
    console.error("Failed to update checkin:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "更新签到失败",
    };
  }
}

export async function deleteCheckinAction(id: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";

    const [existing] = await db
      .select()
      .from(checkins)
      .where(eq(checkins.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, error: "签到不存在" };
    }

    if (!isAdmin && existing.userId !== user.id) {
      return { success: false, error: "无权限删除" };
    }

    await db.delete(checkins).where(eq(checkins.id, id));

    revalidatePath("/checkins");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete checkin:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "删除签到失败",
    };
  }
}

export async function getCheckinRecordsAction(checkinId: string, limit = 50) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const records = await db
      .select()
      .from(checkinRecords)
      .where(eq(checkinRecords.checkinId, checkinId))
      .orderBy(desc(checkinRecords.checkedInAt))
      .limit(limit);

    const data = records.map((r) => ({
      id: r.id,
      participant: {
        name: r.name,
        phone: r.phone,
        email: r.email,
      },
      departmentName: r.department,
      verifyCode: r.verifyCode,
      isConfirmed: r.isConfirmed,
      checkedInAt: r.checkedInAt.getTime(),
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Failed to get checkin records:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取签到记录失败",
    };
  }
}

export async function deleteCheckinRecordAction(recordId: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";

    // 先获取记录信息
    const [record] = await db
      .select()
      .from(checkinRecords)
      .where(eq(checkinRecords.id, recordId))
      .limit(1);

    if (!record) {
      return { success: false, error: "记录不存在" };
    }

    // 检查权限：需要是管理员或签到的创建者
    const [checkin] = await db
      .select()
      .from(checkins)
      .where(eq(checkins.id, record.checkinId))
      .limit(1);

    if (!checkin) {
      return { success: false, error: "签到不存在" };
    }

    if (!isAdmin && checkin.userId !== user.id) {
      return { success: false, error: "无权限删除" };
    }

    // 删除记录
    await db.delete(checkinRecords).where(eq(checkinRecords.id, recordId));

    // 更新签到统计（减少计数）
    await db
      .update(checkins)
      .set({
        totalCount: sql`GREATEST(${checkins.totalCount} - 1, 0)`,
        todayCount: sql`GREATEST(${checkins.todayCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(checkins.id, record.checkinId));

    revalidatePath(`/checkins/${record.checkinId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to delete checkin record:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "删除签到记录失败",
    };
  }
}

// ================================
// 白名单管理
// ================================

export async function getCheckinWhitelistAction(checkinId: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const whitelist = await db
      .select()
      .from(checkinWhitelist)
      .where(eq(checkinWhitelist.checkinId, checkinId))
      .orderBy(desc(checkinWhitelist.createdAt));

    const data = whitelist.map((w) => ({
      id: w.id,
      phone: w.phone,
      name: w.name,
      department: w.department,
      hasCheckedIn: w.hasCheckedIn,
      checkedInAt: w.checkedInAt?.getTime(),
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Failed to get whitelist:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取白名单失败",
    };
  }
}

export async function addToWhitelistAction(
  checkinId: string,
  data: { phone: string; name?: string; department?: string }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    // 检查是否已存在
    const [existing] = await db
      .select()
      .from(checkinWhitelist)
      .where(
        and(
          eq(checkinWhitelist.checkinId, checkinId),
          eq(checkinWhitelist.phone, data.phone)
        )
      )
      .limit(1);

    if (existing) {
      return { success: false, error: "该手机号已在白名单中" };
    }

    await db.insert(checkinWhitelist).values({
      id: randomUUID(),
      checkinId,
      phone: data.phone,
      name: data.name || null,
      department: data.department || null,
    });

    revalidatePath(`/checkins/${checkinId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to add to whitelist:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "添加白名单失败",
    };
  }
}

export async function removeFromWhitelistAction(id: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    await db.delete(checkinWhitelist).where(eq(checkinWhitelist.id, id));

    return { success: true };
  } catch (error) {
    console.error("Failed to remove from whitelist:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "移除白名单失败",
    };
  }
}

export async function importWhitelistAction(
  checkinId: string,
  data: Array<{ phone: string; name?: string; department?: string }>
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    let imported = 0;
    let skipped = 0;

    for (const item of data) {
      // 检查是否已存在
      const [existing] = await db
        .select()
        .from(checkinWhitelist)
        .where(
          and(
            eq(checkinWhitelist.checkinId, checkinId),
            eq(checkinWhitelist.phone, item.phone)
          )
        )
        .limit(1);

      if (existing) {
        skipped++;
        continue;
      }

      await db.insert(checkinWhitelist).values({
        id: randomUUID(),
        checkinId,
        phone: item.phone,
        name: item.name || null,
        department: item.department || null,
      });
      imported++;
    }

    revalidatePath(`/checkins/${checkinId}`);

    return { 
      success: true, 
      data: { imported, skipped, total: data.length } 
    };
  } catch (error) {
    console.error("Failed to import whitelist:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "导入白名单失败",
    };
  }
}

export async function clearWhitelistAction(checkinId: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    await db
      .delete(checkinWhitelist)
      .where(eq(checkinWhitelist.checkinId, checkinId));

    revalidatePath(`/checkins/${checkinId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to clear whitelist:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "清空白名单失败",
    };
  }
}
