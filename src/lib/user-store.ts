import type { RegisteredUser, Department } from "@/types";

// 部门列表
export const DEPARTMENTS: Department[] = [
  { id: "tech", name: "技术部" },
  { id: "product", name: "产品部" },
  { id: "design", name: "设计部" },
  { id: "marketing", name: "市场部" },
  { id: "sales", name: "销售部" },
  { id: "hr", name: "人力资源部" },
  { id: "finance", name: "财务部" },
  { id: "admin", name: "行政部" },
  { id: "ops", name: "运营部" },
  { id: "other", name: "其他" },
];

// 用户存储 (生产环境建议使用数据库)
const users = new Map<string, RegisteredUser>();

// 用于SSE广播的监听器
type UserListener = (user: RegisteredUser, action: "register" | "update") => void;
const listeners = new Set<UserListener>();

export function addUserListener(listener: UserListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(user: RegisteredUser, action: "register" | "update") {
  listeners.forEach((listener) => listener(user, action));
}

// 通过手机号查找用户
export function getUserByPhone(phone: string): RegisteredUser | null {
  for (const user of users.values()) {
    if (user.phone === phone) {
      return user;
    }
  }
  return null;
}

// 通过ID查找用户
export function getUserById(id: string): RegisteredUser | null {
  return users.get(id) || null;
}

// 检查用户名+部门是否重复
export function checkDuplicateUsername(
  username: string,
  departmentId: string,
  excludeUserId?: string
): boolean {
  for (const user of users.values()) {
    if (
      user.username === username &&
      user.departmentId === departmentId &&
      user.id !== excludeUserId
    ) {
      return true;
    }
  }
  return false;
}

// 注册新用户
export function registerUser(data: {
  phone: string;
  username: string;
  departmentId: string;
}): RegisteredUser {
  const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const department = DEPARTMENTS.find((d) => d.id === data.departmentId);
  
  const user: RegisteredUser = {
    id,
    phone: data.phone,
    username: data.username,
    departmentId: data.departmentId,
    departmentName: department?.name || "未知部门",
    registeredAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  users.set(id, user);
  notifyListeners(user, "register");
  return user;
}

// 更新用户信息
export function updateUser(
  id: string,
  data: { phone?: string; username?: string; departmentId?: string }
): RegisteredUser | null {
  const user = users.get(id);
  if (!user) return null;

  if (data.phone !== undefined) user.phone = data.phone;
  if (data.username !== undefined) user.username = data.username;
  if (data.departmentId !== undefined) {
    user.departmentId = data.departmentId;
    const department = DEPARTMENTS.find((d) => d.id === data.departmentId);
    user.departmentName = department?.name || "未知部门";
  }
  user.updatedAt = Date.now();

  users.set(id, user);
  notifyListeners(user, "update");
  return user;
}

// 获取所有用户（按注册时间倒序）
export function getAllUsers(): RegisteredUser[] {
  return Array.from(users.values()).sort((a, b) => b.registeredAt - a.registeredAt);
}

// 获取最近注册的用户
export function getRecentUsers(limit: number = 50): RegisteredUser[] {
  return getAllUsers().slice(0, limit);
}

