import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";

import { db } from "@/server/db";
import { lotteries, lotteryPrizes, lotteryWinners } from "@/server/db/schema";

// GET /api/lotteries/[id]/stream - SSE 实时推送
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  // 获取奖品
  const prizes = await db
    .select()
    .from(lotteryPrizes)
    .where(eq(lotteryPrizes.lotteryId, id))
    .orderBy(lotteryPrizes.sortOrder);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 发送初始数据
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "connected",
            prizes: prizes.map((p) => ({
              id: p.id,
              name: p.name,
              remaining: p.remaining,
            })),
            participantCount: lottery.participantCount,
          })}\n\n`
        )
      );

      // 心跳
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "ping" })}\n\n`)
          );
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // 定时刷新数据
      const refresh = setInterval(async () => {
        try {
          const [updatedLottery] = await db
            .select()
            .from(lotteries)
            .where(eq(lotteries.id, id))
            .limit(1);

          const latestWinners = await db
            .select()
            .from(lotteryWinners)
            .where(eq(lotteryWinners.lotteryId, id))
            .orderBy(desc(lotteryWinners.wonAt))
            .limit(5);

          if (updatedLottery) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "update",
                  participantCount: updatedLottery.participantCount,
                  latestWinners: latestWinners.map((w) => ({
                    id: w.id,
                    name: w.participantName,
                    prizeName: w.prizeName,
                    wonAt: w.wonAt.getTime(),
                  })),
                })}\n\n`
              )
            );
          }
        } catch {
          clearInterval(refresh);
        }
      }, 5000);

      // 清理
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        clearInterval(refresh);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
