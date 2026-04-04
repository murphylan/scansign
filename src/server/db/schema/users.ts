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
  "YEARLY",
]);

// 用户表
export const users = toolSchema.table("User", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  nickname: text("nickname"),
  role: userRoleEnum("role").default("USER").notNull(),
  
  trialStartAt: timestamp("trialStartAt").defaultNow().notNull(),
  trialDays: integer("trialDays").default(14).notNull(),
  isPaid: boolean("isPaid").default(false).notNull(),
  paidAt: timestamp("paidAt"),
  subscriptionPlan: subscriptionPlanEnum("subscriptionPlan"),
  subscriptionEndsAt: timestamp("subscriptionEndsAt"),
  lastSeenAt: timestamp("lastSeenAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
});

// 会话表
export const sessions = toolSchema.table("Session", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

