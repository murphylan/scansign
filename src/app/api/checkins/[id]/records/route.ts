import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { eq, desc, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { checkins, checkinRecords } from "@/server/db/schema";
import { generateVerifyCode } from "@/lib/utils/code-generator";

// GET /api/checkins/[id]/records - 获取签到记录列表（公开访问）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  try {
    const [checkin] = await db
      .select()
      .from(checkins)
      .where(eq(checkins.id, id))
      .limit(1);

    if (!checkin) {
      return NextResponse.json(
        { success: false, error: "签到不存在" },
        { status: 404 }
      );
    }

    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const records = await db
      .select()
      .from(checkinRecords)
      .where(eq(checkinRecords.checkinId, id))
      .orderBy(desc(checkinRecords.checkedInAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(checkinRecords)
      .where(eq(checkinRecords.checkinId, id));

    const total = Number(countResult?.count || 0);

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
    const [checkin] = await db
      .select()
      .from(checkins)
      .where(eq(checkins.id, id))
      .limit(1);

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

    const [record] = await db
      .insert(checkinRecords)
      .values({
        id: randomUUID(),
        checkinId: id,
        name: body.name || null,
        phone: body.phone || null,
        email: body.email || null,
        department: body.department || null,
        extra: body.extra || {},
        verifyCode: verifyCode || null,
        isConfirmed: !verifyCode,
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
      .where(eq(checkins.id, id));

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
