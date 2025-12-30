import { text, timestamp, boolean, integer, jsonb, real } from "drizzle-orm/pg-core";
import { toolSchema, activityStatusEnum, users } from "./users";

// 抽奖类型枚举
export const lotteryTypeEnum = toolSchema.enum("LotteryType", ["WHEEL", "SLOT", "GRID"]);

// 抽奖表
export const lotteries = toolSchema.table("Lottery", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  status: activityStatusEnum("status").default("DRAFT").notNull(),
  
  lotteryType: lotteryTypeEnum("lotteryType").default("WHEEL").notNull(),
  
  prizes: jsonb("prizes").default([]).notNull(),
  config: jsonb("config").default({}).notNull(),
  display: jsonb("display").default({}).notNull(),
  
  participantCount: integer("participantCount").default(0).notNull(),
  
  startTime: timestamp("startTime"),
  endTime: timestamp("endTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
});

// 抽奖奖品表
export const lotteryPrizes = toolSchema.table("LotteryPrize", {
  id: text("id").primaryKey(),
  lotteryId: text("lotteryId").notNull().references(() => lotteries.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  quantity: integer("quantity").default(1).notNull(),
  remaining: integer("remaining").default(1).notNull(),
  probability: real("probability").default(0).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
});

// 抽奖参与者表
export const lotteryParticipants = toolSchema.table("LotteryParticipant", {
  id: text("id").primaryKey(),
  lotteryId: text("lotteryId").notNull().references(() => lotteries.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  department: text("department"),
  hasWon: boolean("hasWon").default(false).notNull(),
  
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

// 抽奖中奖者表
export const lotteryWinners = toolSchema.table("LotteryWinner", {
  id: text("id").primaryKey(),
  lotteryId: text("lotteryId").notNull().references(() => lotteries.id, { onDelete: "cascade" }),
  participantId: text("participantId").notNull().references(() => lotteryParticipants.id, { onDelete: "cascade" }),
  participantName: text("participantName").notNull(),
  participantPhone: text("participantPhone"),
  prizeName: text("prizeName").notNull(),
  prizeLevel: integer("prizeLevel").default(1).notNull(),
  
  wonAt: timestamp("wonAt").defaultNow().notNull(),
});

