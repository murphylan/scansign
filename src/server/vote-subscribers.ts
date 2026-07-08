// 投票 SSE 订阅管理（简单内存实现；生产环境应使用 Redis）
// 独立于 route.ts：Next.js route 文件只允许导出 HTTP 方法处理器，不能导出此类辅助函数。
const subscribers = new Map<string, Set<(data: unknown) => void>>();

export function subscribe(voteId: string, callback: (data: unknown) => void) {
  if (!subscribers.has(voteId)) {
    subscribers.set(voteId, new Set());
  }
  subscribers.get(voteId)!.add(callback);
}

export function unsubscribe(voteId: string, callback: (data: unknown) => void) {
  const subs = subscribers.get(voteId);
  if (subs) {
    subs.delete(callback);
    if (subs.size === 0) {
      subscribers.delete(voteId);
    }
  }
}

export function notifyVoteUpdate(voteId: string, data: unknown) {
  const subs = subscribers.get(voteId);
  if (subs) {
    subs.forEach((callback) => callback(data));
  }
}
