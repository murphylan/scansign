import { addUserListener } from "@/lib/user-store";
import type { RegisteredUser } from "@/types";

// SSE 实时推送用户注册/更新事件
export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // 发送初始连接消息
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );

      // 监听用户变化
      const removeListener = addUserListener(
        (user: RegisteredUser, action: "register" | "update") => {
          try {
            const data = JSON.stringify({ type: action, user });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } catch {
            // Controller might be closed
          }
        }
      );

      // 心跳保持连接
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`)
          );
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // 清理函数在流关闭时不会自动调用，但我们可以通过心跳检测来处理
      return () => {
        clearInterval(heartbeat);
        removeListener();
      };
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

