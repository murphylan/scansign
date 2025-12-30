import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";

import { db } from "@/server/db";
import { checkins, checkinRecords } from "@/server/db/schema";

// GET /api/checkins/[id]/stream - SSE 实时推送
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 发送初始连接消息
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "connected",
            checkinCount: checkin.totalCount,
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
          const [updatedCheckin] = await db
            .select()
            .from(checkins)
            .where(eq(checkins.id, id))
            .limit(1);

          const latestRecords = await db
            .select()
            .from(checkinRecords)
            .where(eq(checkinRecords.checkinId, id))
            .orderBy(desc(checkinRecords.checkedInAt))
            .limit(10);

          if (updatedCheckin) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "update",
                  checkinCount: updatedCheckin.totalCount,
                  latestRecords: latestRecords.map((r) => ({
                    id: r.id,
                    name: r.name,
                    phone: r.phone,
                    checkinTime: r.checkedInAt.getTime(),
                  })),
                })}\n\n`
              )
            );
          }
        } catch {
          clearInterval(refresh);
        }
      }, 3000);

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
