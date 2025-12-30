"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { forms, formResponses } from "@/server/db/schema";
import { generateCode } from "@/lib/utils/code-generator";
import { getCurrentUser } from "./authAction";

// ================================
// 默认配置
// ================================

const DEFAULT_CONFIG = {
  submitOnce: true,
  requirePhone: false,
  showProgress: true,
};

const DEFAULT_DISPLAY = {
  theme: "default",
  submitButtonText: "提交",
  successMessage: "提交成功！",
};

// ================================
// 类型定义
// ================================

export interface FormFormData {
  title: string;
  description?: string;
  fields?: unknown[];
  config?: Record<string, unknown>;
  display?: Record<string, unknown>;
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

    const formList = isAdmin
      ? await db.select().from(forms).orderBy(desc(forms.createdAt))
      : await db
          .select()
          .from(forms)
          .where(eq(forms.userId, user.id))
          .orderBy(desc(forms.createdAt));

    const data = formList.map((f) => ({
      id: f.id,
      code: f.code,
      title: f.title,
      description: f.description,
      status: f.status.toLowerCase(),
      fields: f.fields,
      responseCount: f.responseCount,
      config: f.config,
      display: f.display,
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

    const [form] = await db
      .select()
      .from(forms)
      .where(eq(forms.id, id))
      .limit(1);

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
        config: {
          ...((form.config || {}) as Record<string, unknown>),
          fields: form.fields,
        },
        display: form.display,
        stats: {
          responseCount: form.responseCount,
        },
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

    const [form] = await db
      .insert(forms)
      .values({
        id: randomUUID(),
        code,
        title: data.title,
        description: data.description || null,
        status: "ACTIVE",
        fields: data.fields || [],
        config: data.config || DEFAULT_CONFIG,
        display: data.display || DEFAULT_DISPLAY,
        startTime: data.startTime ? new Date(data.startTime) : null,
        endTime: data.endTime ? new Date(data.endTime) : null,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

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

    const [existing] = await db
      .select()
      .from(forms)
      .where(eq(forms.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, error: "表单不存在" };
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
    if (data.fields !== undefined) updateData.fields = data.fields;
    if (data.config !== undefined) updateData.config = data.config;
    if (data.display !== undefined) updateData.display = data.display;
    if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);

    const [form] = await db
      .update(forms)
      .set(updateData)
      .where(eq(forms.id, id))
      .returning();

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

    const [existing] = await db
      .select()
      .from(forms)
      .where(eq(forms.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, error: "表单不存在" };
    }

    if (!isAdmin && existing.userId !== user.id) {
      return { success: false, error: "无权限删除" };
    }

    await db.delete(forms).where(eq(forms.id, id));

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

export async function getFormResponsesAction(formId: string, limit = 50) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "未登录" };
    }

    const responses = await db
      .select()
      .from(formResponses)
      .where(eq(formResponses.formId, formId))
      .orderBy(desc(formResponses.submittedAt))
      .limit(limit);

    const data = responses.map((r) => ({
      id: r.id,
      phone: null,
      submittedAt: r.submittedAt.getTime(),
      data: r.data,
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Failed to get form responses:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取表单响应失败",
    };
  }
}
