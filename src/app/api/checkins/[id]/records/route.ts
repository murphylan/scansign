import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { generateVerifyCode } from "@/lib/utils/code-generator";

// GET /api/checkins/[id]/records - 获取签到记录列表（公开访问）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  try {
    const checkin = await prisma.checkin.findUnique({
      where: { id },
    });

    if (!checkin) {
      return NextResponse.json(
        { success: false, error: "签到不存在" },
        { status: 404 }
      );
    }

    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const [records, total] = await Promise.all([
      prisma.checkinRecord.findMany({
        where: { checkinId: id },
        orderBy: { checkedInAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.checkinRecord.count({
        where: { checkinId: id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        records: records.map((r) => ({
          id: r.id,
          name: r.name,
          phone: r.phone,
          email: r.email,
          department: r.department,
          verifyCode: r.verifyCode,
          isConfirmed: r.isConfirmed,
          checkinTime: r.checkedInAt.getTime(),
        })),
        total,
      },
    });
  } catch (error) {
    console.error("Failed to get records:", error);
    return NextResponse.json(
      { success: false, error: "获取记录失败" },
      { status: 500 }
    );
  }
}

// POST /api/checkins/[id]/records - 创建签到记录（公开访问 - 手机端）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    // 检查签到是否存在
    const checkin = await prisma.checkin.findUnique({
      where: { id },
    });

    if (!checkin) {
      return NextResponse.json(
        { success: false, error: "签到不存在" },
        { status: 404 }
      );
    }

    // 检查签到状态
    if (checkin.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "签到未开始或已结束" },
        { status: 400 }
      );
    }

    const config = checkin.config as Record<string, unknown>;

    // 验证必填字段
    if (config.requireName && !body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: "请输入姓名" },
        { status: 400 }
      );
    }

    if (config.requirePhone && !body.phone?.trim()) {
      return NextResponse.json(
        { success: false, error: "请输入手机号" },
        { status: 400 }
      );
    }

    // 创建记录
    const verifyCode = config.requireVerify ? generateVerifyCode() : undefined;

    const record = await prisma.checkinRecord.create({
      data: {
        checkinId: id,
        name: body.name,
        phone: body.phone,
        email: body.email,
        department: body.department,
        extra: body.extra || {},
        verifyCode,
        isConfirmed: !verifyCode,
      },
    });

    // 更新统计
    await prisma.checkin.update({
      where: { id },
      data: {
        totalCount: { increment: 1 },
        todayCount: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        participant: {
          name: record.name,
          phone: record.phone,
          email: record.email,
        },
        departmentName: record.department,
        verifyCode: record.verifyCode,
        isConfirmed: record.isConfirmed,
        checkedInAt: record.checkedInAt.getTime(),
      },
    });
  } catch (error) {
    console.error("Failed to create record:", error);
    return NextResponse.json(
      { success: false, error: "签到失败" },
      { status: 500 }
    );
  }
}
