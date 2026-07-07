import { pgTable, pgSchema, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

// 使用 tool schema
export const toolSchema = pgSchema("tool");

// 用户角色枚举
export const userRoleEnum = toolSchema.enum("UserRole", ["USER", "ADMIN"]);

// 活动状态枚举
export const activityStatusEnum = toolSchema.enum("ActivityStatus", ["DRAFT", "ACTIVE", "PAUSED", "ENDED"]);

// 订阅档位（线下开通后由运营台写入）
export const subscriptionPlanEnum = toolSchema.enum("SubscriptionPlan", [
  "MONTHLY",
  "QUARTERLY",
  "PAY_PER_USE",
  "YEARLY",
]);

// 用户表
export const users = toolSchema.table("User", {
  id: text("id").primaryKey(),
  // 手机号为登录标识（手机号+验证码登录）。DB 层可空以兼容历史 email 行，应用层强制。
  phone: text("phone").unique(),
  // 旧邮箱+密码登录已停用；列保留为可空仅为不破坏历史数据。
  email: text("email").unique(),
  password: text("password"),
  nickname: text("nickname"),
  role: userRoleEnum("role").default("USER").notNull(),
  
  trialStartAt: timestamp("trialStartAt").defaultNow().notNull(),
  trialDays: integer("trialDays").default(3).notNull(),
  isPaid: boolean("isPaid").default(false).notNull(),
  paidAt: timestamp("paidAt"),
  subscriptionPlan: subscriptionPlanEnum("subscriptionPlan"),
  subscriptionEndsAt: timestamp("subscriptionEndsAt"),
  lastSeenAt: timestamp("lastSeenAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
});

// 短信验证码表（自管式服务商：Mock/腾讯/合一 落库校验；托管式阿里云不落库）
export const verificationCodes = toolSchema.table("VerificationCode", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumed: boolean("consumed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// 会话表
export const sessions = toolSchema.table("Session", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

