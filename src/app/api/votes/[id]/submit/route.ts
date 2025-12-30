import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { votes, voteOptions, voteRecords } from "@/server/db/schema";

interface SubmitVoteRequest {
  selectedOptions: string[];
  phone?: string;
  name?: string;
}

// POST /api/votes/[id]/submit - 提交投票
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body: SubmitVoteRequest = await request.json();

    const [vote] = await db
      .select()
      .from(votes)
      .where(eq(votes.id, id))
      .limit(1);

    if (!vote) {
      return NextResponse.json(
        { success: false, error: "投票不存在" },
        { status: 404 }
      );
    }

    if (vote.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "投票未开始或已结束" },
        { status: 400 }
      );
    }

    const options = await db
      .select()
      .from(voteOptions)
      .where(eq(voteOptions.voteId, id));

    const config = vote.config as { requirePhone?: boolean; allowChange?: boolean } | null;

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

    // 验证选项
    if (!body.selectedOptions || body.selectedOptions.length === 0) {
      return NextResponse.json(
        { success: false, error: "请选择至少一个选项" },
        { status: 400 }
      );
    }

    // 验证选项数量
    if (vote.voteType === "SINGLE" && body.selectedOptions.length > 1) {
      return NextResponse.json(
        { success: false, error: "单选投票只能选择一个选项" },
        { status: 400 }
      );
    }

    if (body.selectedOptions.length > vote.maxChoices) {
      return NextResponse.json(
        { success: false, error: `最多选择 ${vote.maxChoices} 个选项` },
        { status: 400 }
      );
    }

    // 验证选项是否存在
    const optionIds = options.map((o) => o.id);
    const invalidOptions = body.selectedOptions.filter(
      (o) => !optionIds.includes(o)
    );
    if (invalidOptions.length > 0) {
      return NextResponse.json(
        { success: false, error: "选项无效" },
        { status: 400 }
      );
    }

    // 检查是否已投票
    let existingRecord = null;
    if (body.phone) {
      const [record] = await db
        .select()
        .from(voteRecords)
        .where(
          and(
            eq(voteRecords.voteId, id),
            eq(voteRecords.phone, body.phone)
          )
        )
        .limit(1);
      existingRecord = record || null;
    }

    if (existingRecord && !config?.allowChange) {
      return NextResponse.json(
        { success: false, error: "您已投票" },
        { status: 400 }
      );
    }

    // 处理投票
    if (existingRecord) {
      // 如果是更新，先减少旧选项计数
      const oldOptions = existingRecord.selectedOptions as string[];
      for (const optionId of oldOptions) {
        await db
          .update(voteOptions)
          .set({ voteCount: sql`${voteOptions.voteCount} - 1` })
          .where(eq(voteOptions.id, optionId));
      }

      // 更新记录
      await db
        .update(voteRecords)
        .set({
          selectedOptions: body.selectedOptions,
          name: body.name || null,
        })
        .where(eq(voteRecords.id, existingRecord.id));
    } else {
      // 创建新记录
      await db.insert(voteRecords).values({
        id: randomUUID(),
        voteId: id,
        selectedOptions: body.selectedOptions,
        phone: body.phone || null,
        name: body.name || null,
      });
    }

    // 增加新选项计数
    for (const optionId of body.selectedOptions) {
      await db
        .update(voteOptions)
        .set({ voteCount: sql`${voteOptions.voteCount} + 1` })
        .where(eq(voteOptions.id, optionId));
    }

    // 获取更新后的选项
    const updatedOptions = await db
      .select()
      .from(voteOptions)
      .where(eq(voteOptions.voteId, id))
      .orderBy(voteOptions.sortOrder);

    return NextResponse.json({
      success: true,
      data: {
        isUpdate: !!existingRecord,
        message: existingRecord ? "投票已更新" : "投票成功",
        options: updatedOptions.map((o) => ({
          id: o.id,
          title: o.title,
          voteCount: o.voteCount,
        })),
      },
    });
  } catch (error) {
    console.error("Failed to submit vote:", error);
    return NextResponse.json(
      { success: false, error: "投票失败" },
      { status: 500 }
    );
  }
}

// GET /api/votes/[id]/submit?phone=xxx - 检查是否已投票
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
    const [vote] = await db
      .select()
      .from(votes)
      .where(eq(votes.id, id))
      .limit(1);

    if (!vote) {
      return NextResponse.json(
        { success: false, error: "投票不存在" },
        { status: 404 }
      );
    }

    const [record] = await db
      .select()
      .from(voteRecords)
      .where(
        and(
          eq(voteRecords.voteId, id),
          eq(voteRecords.phone, phone)
        )
      )
      .limit(1);

    const config = vote.config as { allowChange?: boolean } | null;

    return NextResponse.json({
      success: true,
      data: {
        hasVoted: !!record,
        selectedOptions: record?.selectedOptions,
        allowChange: config?.allowChange ?? false,
      },
    });
  } catch (error) {
    console.error("Failed to check vote:", error);
    return NextResponse.json(
      { success: false, error: "检查失败" },
      { status: 500 }
    );
  }
}
