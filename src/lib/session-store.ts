import type { LoginSession, SessionStatus, UserInfo } from "@/types";

// 内存存储 (生产环境建议使用 Redis)
const sessions = new Map<string, LoginSession>();

// 会话有效期: 5分钟
const SESSION_TTL = 5 * 60 * 1000;

export function createSession(token: string): LoginSession {
  const now = Date.now();
  const session: LoginSession = {
    token,
    status: "pending",
    createdAt: now,
    expiresAt: now + SESSION_TTL,
  };
  sessions.set(token, session);
  return session;
}

export function getSession(token: string): LoginSession | null {
  const session = sessions.get(token);
  if (!session) return null;

  // 检查是否过期
  if (Date.now() > session.expiresAt) {
    session.status = "expired";
    sessions.set(token, session);
  }

  return session;
}

export function updateSessionStatus(
  token: string,
  status: SessionStatus,
  userInfo?: UserInfo
): LoginSession | null {
  const session = sessions.get(token);
  if (!session) return null;

  session.status = status;
  if (userInfo) {
    session.userInfo = userInfo;
  }
  sessions.set(token, session);
  return session;
}

export function deleteSession(token: string): boolean {
  return sessions.delete(token);
}

// 清理过期会话 (可以定期调用)
export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt + SESSION_TTL) {
      sessions.delete(token);
      cleaned++;
    }
  }
  
  return cleaned;
}

