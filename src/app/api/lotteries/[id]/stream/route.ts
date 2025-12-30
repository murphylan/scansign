import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

// GET /api/lotteries/[id]/stream - SSE 实时推送
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const lottery = await prisma.lottery.findUnique({
    where: { id },
  });

  if (!lottery) {
    return NextResponse.json(
      { success: false, error: "抽奖不存在" },
      { status: 404 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 发送初始数据
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "connected",
            prizes: lottery.prizes,
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
          const [updatedLottery, latestWinners] = await Promise.all([
            prisma.lottery.findUnique({
              where: { id },
            }),
            prisma.lotteryWinner.findMany({
              where: { lotteryId: id },
              orderBy: { wonAt: "desc" },
              take: 5,
            }),
          ]);

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
