import { NextResponse } from 'next/server';
import { getCheckinById, subscribeCheckin } from '@/lib/stores/checkin-store';

// GET /api/checkins/[id]/stream - SSE 实时推送
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const checkin = getCheckinById(id);
  if (!checkin) {
    return NextResponse.json(
      { success: false, error: '签到不存在' },
      { status: 404 }
    );
  }
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // 发送初始连接消息
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
      );
      
      // 订阅签到事件
      const unsubscribe = subscribeCheckin(id, (event, data) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: event, data })}\n\n`)
          );
        } catch {
          // 连接已关闭
        }
      });
      
      // 心跳
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'ping' })}\n\n`)
          );
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);
      
      // 清理
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

