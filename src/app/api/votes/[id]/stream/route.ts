import { NextResponse } from 'next/server';
import { getVoteById, subscribeVote } from '@/lib/stores/vote-store';

// GET /api/votes/[id]/stream - SSE 实时推送
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const vote = getVoteById(id);
  if (!vote) {
    return NextResponse.json(
      { success: false, error: '投票不存在' },
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
          options: vote.config.options,
          stats: vote.stats,
        })}\n\n`)
      );
      
      // 订阅投票事件
      const unsubscribe = subscribeVote(id, (event, data) => {
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

