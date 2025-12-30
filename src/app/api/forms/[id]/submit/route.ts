import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { eq, sql, and } from "drizzle-orm";

import { db } from "@/server/db";
import { forms, formResponses } from "@/server/db/schema";

interface SubmitFormRequest {
  data: Record<string, unknown>;
  phone?: string;
}

// POST /api/forms/[id]/submit - 提交表单
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body: SubmitFormRequest = await request.json();

    const [form] = await db
      .select()
      .from(forms)
      .where(eq(forms.id, id))
      .limit(1);

    if (!form) {
      return NextResponse.json(
        { success: false, error: "表单不存在" },
        { status: 404 }
      );
    }

    if (form.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "表单未开放" },
        { status: 400 }
      );
    }

    const config = form.config as {
      requirePhone?: boolean;
      limitOnePerUser?: boolean;
      successMessage?: string;
      redirectUrl?: string;
      redirectDelay?: number;
    } | null;

    // 验证手机号格式
    if (config?.requirePhone) {
      if (!body.phone) {
        return NextResponse.json(
          { success: false, error: "请输入手机号" },
          { status: 400 }
        );
      }
      if (!/^1[3-9]\d{9}$/.test(body.phone)) {
        return NextResponse.json(
          { success: false, error: "请输入正确的手机号" },
          { status: 400 }
        );
      }
    }

    // 检查是否已提交
    if (config?.limitOnePerUser && body.phone) {
      const [existing] = await db
        .select()
        .from(formResponses)
        .where(
          and(
            eq(formResponses.formId, id),
            eq(formResponses.submitterIp, body.phone)
          )
        )
        .limit(1);

      if (existing) {
        return NextResponse.json(
          { success: false, error: "您已提交过" },
          { status: 400 }
        );
      }
    }

    // 获取提交者 IP
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

    // 创建响应
    const [response] = await db
      .insert(formResponses)
      .values({
        id: randomUUID(),
        formId: id,
        data: body.data,
        submitterIp: body.phone || ip,
      })
      .returning();

    // 更新提交计数
    await db
      .update(forms)
      .set({
        responseCount: sql`${forms.responseCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(forms.id, id));

    return NextResponse.json({
      success: true,
      data: {
        id: response.id,
        message: config?.successMessage || "提交成功",
        redirectUrl: config?.redirectUrl,
        redirectDelay: config?.redirectDelay,
      },
    });
  } catch (error) {
    console.error("Failed to submit form:", error);
    return NextResponse.json(
      { success: false, error: "提交失败" },
      { status: 500 }
    );
  }
}

// GET /api/forms/[id]/submit?phone=xxx - 检查是否已提交
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json(
      { success: false, error: "请提供手机号" },
      { status: 400 }
    );
  }

  try {
    const [form] = await db
      .select()
      .from(forms)
      .where(eq(forms.id, id))
      .limit(1);

    if (!form) {
      return NextResponse.json(
        { success: false, error: "表单不存在" },
        { status: 404 }
      );
    }

    const [response] = await db
      .select()
      .from(formResponses)
      .where(
        and(
          eq(formResponses.formId, id),
          eq(formResponses.submitterIp, phone)
        )
      )
      .limit(1);

    const config = form.config as { limitOnePerUser?: boolean } | null;

    return NextResponse.json({
      success: true,
      data: {
        hasSubmitted: !!response,
        limitOne: config?.limitOnePerUser ?? false,
      },
    });
  } catch (error) {
    console.error("Failed to check submission:", error);
    return NextResponse.json(
      { success: false, error: "检查失败" },
      { status: 500 }
    );
  }
}
