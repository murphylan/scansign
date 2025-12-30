"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { checkins, checkinRecords } from "@/server/db/schema";
import { generateCode } from "@/lib/utils/code-generator";
import { getCurrentUser } from "./authAction";

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

    const [checkin] = await db
      .insert(checkins)
      .values({
        id: randomUUID(),
        code,
        title: data.title,
        description: data.description || null,
        status: "ACTIVE",
        config: data.config || DEFAULT_CONFIG,
        display: data.display || DEFAULT_DISPLAY,
        startTime: data.startTime ? new Date(data.startTime) : null,
        endTime: data.endTime ? new Date(data.endTime) : null,
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
