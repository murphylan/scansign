import { NextResponse } from 'next/server';
import { getFormById, subscribeForm } from '@/lib/stores/form-store';

// GET /api/forms/[id]/stream - SSE 实时推送
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const form = getFormById(id);
  if (!form) {
    return NextResponse.json(
      { success: false, error: '表单不存在' },
      { status: 404 }
    );
  }
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // 发送初始数据
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ 
          type: 'connected',
          stats: form.stats,
        })}\n\n`)
      );
      
      // 订阅表单事件
      const unsubscribe = subscribeForm(id, (event, data) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: event, ...data as object })}\n\n`)
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

