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
  config?: Prisma.InputJsonValue;
  display?: Prisma.InputJsonValue;
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
    const where = isAdmin ? {} : { userId: user.id };

    const checkins = await prisma.checkin.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { records: true },
        },
      },
    });

    const data = checkins.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      description: c.description,
      status: c.status.toLowerCase(),
      config: c.config,
      display: c.display,
      stats: {
        total: c.totalCount,
        today: c.todayCount,
        byDepartment: {},
      },
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
    const checkin = await prisma.checkin.findUnique({
      where: { id },
      include: {
        _count: {
          select: { records: true },
        },
      },
    });

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
        config: checkin.config,
        display: checkin.display,
        stats: {
          total: checkin.totalCount,
          today: checkin.todayCount,
          byDepartment: {},
        },
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

    const checkin = await prisma.checkin.create({
      data: {
        code,
        title: data.title,
        description: data.description,
        status: "ACTIVE", // 创建后默认为进行中
        config: data.config || DEFAULT_CONFIG,
        display: data.display || DEFAULT_DISPLAY,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        userId: user.id,
      },
    });

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
    const existing = await prisma.checkin.findUnique({ where: { id } });

    if (!existing) {
      return { success: false, error: "签到不存在" };
    }

    if (!isAdmin && existing.userId !== user.id) {
      return { success: false, error: "无权限修改" };
    }

    const checkin = await prisma.checkin.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status?.toUpperCase() as "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED",
        config: data.config,
        display: data.display,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
      },
    });

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
    const existing = await prisma.checkin.findUnique({ where: { id } });

    if (!existing) {
      return { success: false, error: "签到不存在" };
    }

    if (!isAdmin && existing.userId !== user.id) {
      return { success: false, error: "无权限删除" };
    }

    await prisma.checkin.delete({ where: { id } });

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

export async function getCheckinRecordsAction(checkinId: string, limit?: number) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const records = await prisma.checkinRecord.findMany({
      where: { checkinId },
      orderBy: { checkedInAt: "desc" },
      take: limit,
    });

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
      confirmedAt: r.confirmedAt?.getTime(),
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Failed to get records:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取记录失败",
    };
  }
}

