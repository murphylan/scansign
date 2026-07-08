import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { votes, voteOptions } from "@/server/db/schema";
import { subscribe, unsubscribe } from "@/server/vote-subscribers";

// GET /api/votes/[id]/stream - SSE 实时推送
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const options = await db
    .select()
    .from(voteOptions)
    .where(eq(voteOptions.voteId, id))
    .orderBy(voteOptions.sortOrder);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 发送初始数据
      const totalVotes = options.reduce((sum, o) => sum + o.voteCount, 0);
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "connected",
            options: options.map((o) => ({
              id: o.id,
              title: o.title,
              count: o.voteCount,
            })),
            stats: { totalVotes, participantCount: 0 },
          })}\n\n`
        )
      );

      // 订阅投票事件
      const callback = (data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // 连接已关闭
        }
      };

      subscribe(id, callback);

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
          const updatedOptions = await db
            .select()
            .from(voteOptions)
            .where(eq(voteOptions.voteId, id))
            .orderBy(voteOptions.sortOrder);

          const updatedTotalVotes = updatedOptions.reduce((sum, o) => sum + o.voteCount, 0);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "update",
                options: updatedOptions.map((o) => ({
                  id: o.id,
                  title: o.title,
                  count: o.voteCount,
                })),
                stats: { totalVotes: updatedTotalVotes },
              })}\n\n`
            )
          );
        } catch {
          clearInterval(refresh);
        }
      }, 5000);

      // 清理
      request.signal.addEventListener("abort", () => {
        unsubscribe(id, callback);
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
