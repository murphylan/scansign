import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { eq, desc, sql, and } from "drizzle-orm";

import { db } from "@/server/db";
import { lotteries, lotteryParticipants, lotteryWinners } from "@/server/db/schema";

// GET /api/lotteries/[id]/records - 获取中奖记录
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  try {
    const [lottery] = await db
      .select()
      .from(lotteries)
      .where(eq(lotteries.id, id))
      .limit(1);

    if (!lottery) {
      return NextResponse.json(
        { success: false, error: "抽奖不存在" },
        { status: 404 }
      );
    }

    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const records = await db
      .select()
      .from(lotteryWinners)
      .where(eq(lotteryWinners.lotteryId, id))
      .orderBy(desc(lotteryWinners.wonAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lotteryWinners)
      .where(eq(lotteryWinners.lotteryId, id));

    const total = Number(countResult?.count || 0);

    return NextResponse.json({
      success: true,
      data: {
        records: records.map((r) => ({
          id: r.id,
          name: r.participantName,
          phone: r.participantPhone,
          prizeName: r.prizeName,
          prizeLevel: r.prizeLevel,
          wonAt: r.wonAt.getTime(),
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

// POST /api/lotteries/[id]/records - 参与抽奖
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    const [lottery] = await db
      .select()
      .from(lotteries)
      .where(eq(lotteries.id, id))
      .limit(1);

    if (!lottery) {
      return NextResponse.json(
        { success: false, error: "抽奖不存在" },
        { status: 404 }
      );
    }

    if (lottery.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "抽奖未开始或已结束" },
        { status: 400 }
      );
    }

    const config = lottery.config as { requirePhone?: boolean } | null;

    // 验证手机号
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

    // 检查是否已参与
    if (body.phone) {
      const [existing] = await db
        .select()
        .from(lotteryParticipants)
        .where(
          and(
            eq(lotteryParticipants.lotteryId, id),
            eq(lotteryParticipants.phone, body.phone)
          )
        )
        .limit(1);

      if (existing) {
        return NextResponse.json(
          { success: false, error: "您已参与" },
          { status: 400 }
        );
      }
    }

    // 创建参与记录
    const [participant] = await db
      .insert(lotteryParticipants)
      .values({
        id: randomUUID(),
        lotteryId: id,
        name: body.name || "匿名",
        phone: body.phone || null,
      })
      .returning();

    // 更新参与人数
    await db
      .update(lotteries)
      .set({
        participantCount: sql`${lotteries.participantCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(lotteries.id, id));

    return NextResponse.json({
      success: true,
      data: {
        id: participant.id,
        message: "参与成功",
      },
    });
  } catch (error) {
    console.error("Failed to join lottery:", error);
    return NextResponse.json(
      { success: false, error: "参与失败" },
      { status: 500 }
    );
  }
}
