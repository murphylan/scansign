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
  limitOnePerUser: false,
  showSubmitCount: true,
};

const DEFAULT_DISPLAY = {
  showProgress: true,
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

export interface FormFormData {
  title: string;
  description?: string;
  fields?: Prisma.InputJsonValue;
  config?: Prisma.InputJsonValue;
  display?: Prisma.InputJsonValue;
  startTime?: string;
  endTime?: string;
}

// ================================
// Server Actions
// ================================

export async function listFormsAction() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";
    const where = isAdmin ? {} : { userId: user.id };

    const forms = await prisma.form.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const data = forms.map((f) => ({
      id: f.id,
      code: f.code,
      title: f.title,
      description: f.description,
      status: f.status.toLowerCase(),
      fields: f.fields,
      config: f.config,
      display: f.display,
      responseCount: f.responseCount,
      startTime: f.startTime?.getTime(),
      endTime: f.endTime?.getTime(),
      createdAt: f.createdAt.getTime(),
      updatedAt: f.updatedAt.getTime(),
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Failed to list forms:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取表单列表失败",
    };
  }
}

export async function getFormAction(id: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";
    const form = await prisma.form.findUnique({
      where: { id },
    });

    if (!form) {
      return { success: false, error: "表单不存在" };
    }

    if (!isAdmin && form.userId !== user.id) {
      return { success: false, error: "无权限访问" };
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
        responseCount: form.responseCount,
        startTime: form.startTime?.getTime(),
        endTime: form.endTime?.getTime(),
        createdAt: form.createdAt.getTime(),
        updatedAt: form.updatedAt.getTime(),
      },
    };
  } catch (error) {
    console.error("Failed to get form:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取表单失败",
    };
  }
}

export async function createFormAction(data: FormFormData) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    if (!data.title?.trim()) {
      return { success: false, error: "请输入表单标题" };
    }

    const code = generateCode();

    const form = await prisma.form.create({
      data: {
        code,
        title: data.title,
        description: data.description,
        fields: data.fields || [],
        config: data.config || DEFAULT_CONFIG,
        display: data.display || DEFAULT_DISPLAY,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        userId: user.id,
      },
    });

    revalidatePath("/forms");

    return {
      success: true,
      data: {
        id: form.id,
        code: form.code,
        title: form.title,
      },
    };
  } catch (error) {
    console.error("Failed to create form:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "创建表单失败",
    };
  }
}

export async function updateFormAction(
  id: string,
  data: Partial<FormFormData> & { status?: string }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";
    const existing = await prisma.form.findUnique({ where: { id } });

    if (!existing) {
      return { success: false, error: "表单不存在" };
    }

    if (!isAdmin && existing.userId !== user.id) {
      return { success: false, error: "无权限修改" };
    }

    const form = await prisma.form.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status?.toUpperCase() as "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED",
        fields: data.fields,
        config: data.config,
        display: data.display,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
      },
    });

    revalidatePath("/forms");
    revalidatePath(`/forms/${id}`);

    return {
      success: true,
      data: {
        id: form.id,
        code: form.code,
        title: form.title,
      },
    };
  } catch (error) {
    console.error("Failed to update form:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "更新表单失败",
    };
  }
}

export async function deleteFormAction(id: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const isAdmin = user.role === "ADMIN";
    const existing = await prisma.form.findUnique({ where: { id } });

    if (!existing) {
      return { success: false, error: "表单不存在" };
    }

    if (!isAdmin && existing.userId !== user.id) {
      return { success: false, error: "无权限删除" };
    }

    await prisma.form.delete({ where: { id } });

    revalidatePath("/forms");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete form:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "删除表单失败",
    };
  }
}

export async function getFormResponsesAction(formId: string, limit?: number) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const responses = await prisma.formResponse.findMany({
      where: { formId },
      orderBy: { submittedAt: "desc" },
      take: limit,
    });

    const data = responses.map((r) => ({
      id: r.id,
      data: r.data,
      submitterIp: r.submitterIp,
      submittedAt: r.submittedAt.getTime(),
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Failed to get responses:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取响应失败",
    };
  }
}

