import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { forms } from "@/server/db/schema";

// GET /api/forms/[id]/stream - SSE 实时推送
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 发送初始数据
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "connected",
            responseCount: form.responseCount,
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
          const [updatedForm] = await db
            .select()
            .from(forms)
            .where(eq(forms.id, id))
            .limit(1);

          if (updatedForm) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "update",
                  responseCount: updatedForm.responseCount,
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
