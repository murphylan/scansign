import { text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { toolSchema, activityStatusEnum, users } from "./users";

// 签到表
export const checkins = toolSchema.table("Checkin", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  status: activityStatusEnum("status").default("DRAFT").notNull(),
  
  config: jsonb("config").default({}).notNull(),
  display: jsonb("display").default({}).notNull(),
  
  totalCount: integer("totalCount").default(0).notNull(),
  todayCount: integer("todayCount").default(0).notNull(),
  
  startTime: timestamp("startTime"),
  endTime: timestamp("endTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
});

// 签到记录表
export const checkinRecords = toolSchema.table("CheckinRecord", {
  id: text("id").primaryKey(),
  checkinId: text("checkinId").notNull().references(() => checkins.id, { onDelete: "cascade" }),
  
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  department: text("department"),
  extra: jsonb("extra").default({}).notNull(),
  
  // 安全相关字段
  deviceFingerprint: text("deviceFingerprint"),  // 设备指纹
  ipAddress: text("ipAddress"),                   // IP 地址
  userAgent: text("userAgent"),                   // User-Agent
  
  verifyCode: text("verifyCode"),
  isConfirmed: boolean("isConfirmed").default(false).notNull(),
  
  checkedInAt: timestamp("checkedInAt").defaultNow().notNull(),
  confirmedAt: timestamp("confirmedAt"),
});

// 签到白名单表（预设允许签到的人员）
export const checkinWhitelist = toolSchema.table("CheckinWhitelist", {
  id: text("id").primaryKey(),
  checkinId: text("checkinId").notNull().references(() => checkins.id, { onDelete: "cascade" }),
  
  phone: text("phone").notNull(),
  name: text("name"),
  department: text("department"),
  
  hasCheckedIn: boolean("hasCheckedIn").default(false).notNull(),
  checkedInAt: timestamp("checkedInAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
