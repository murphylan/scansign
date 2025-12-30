import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

interface SubmitFormRequest {
  data: Prisma.InputJsonValue;
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

    const form = await prisma.form.findUnique({
      where: { id },
    });

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
      const existing = await prisma.formResponse.findFirst({
        where: {
          formId: id,
          submitterIp: body.phone, // 暂时用 IP 字段存手机号
        },
      });

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
    const response = await prisma.formResponse.create({
      data: {
        formId: id,
        data: body.data,
        submitterIp: body.phone || ip,
      },
    });

    // 更新提交计数
    await prisma.form.update({
      where: { id },
      data: {
        responseCount: { increment: 1 },
      },
    });

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
    const form = await prisma.form.findUnique({
      where: { id },
    });

    if (!form) {
      return NextResponse.json(
        { success: false, error: "表单不存在" },
        { status: 404 }
      );
    }

    const response = await prisma.formResponse.findFirst({
      where: {
        formId: id,
        submitterIp: phone,
      },
    });

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
