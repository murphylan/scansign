"use client";

import { useEffect, useRef } from "react";

/**
 * useSSE — 轻量封装现有 EventSource 模式（连接 / JSON 解析 / 卸载关闭），
 * 供参与者“个人第二屏”实时面板复用（只读镜像大屏 SSE，不新增后端）。
 *
 * @param url    SSE 地址；传 null 时不连接（未就绪 / 无需监听）。
 * @param onData 每条消息的 JSON payload 回调；解析失败自动忽略。
 *
 * onData 用 ref 固定，回调变化不会重连；仅 url 变化才重连。
 */
export function useSSE(
  url: string | null,
  onData: (data: unknown) => void
): void {
  const handlerRef = useRef(onData);
  handlerRef.current = onData;

  useEffect(() => {
    if (!url) return;

    const es = new EventSource(url);
    es.onmessage = (event) => {
      try {
        handlerRef.current(JSON.parse(event.data));
      } catch {
        // 忽略心跳 / 非 JSON 消息
      }
    };
    es.onerror = () => {
      // 浏览器会自动重连，无需处理
    };

    return () => es.close();
  }, [url]);
}
