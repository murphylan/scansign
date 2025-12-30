import { text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { toolSchema, activityStatusEnum, users } from "./users";

// 投票类型枚举
export const voteTypeEnum = toolSchema.enum("VoteType", ["SINGLE", "MULTIPLE"]);

// 投票表
export const votes = toolSchema.table("Vote", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  status: activityStatusEnum("status").default("DRAFT").notNull(),
  
  voteType: voteTypeEnum("voteType").default("SINGLE").notNull(),
  maxChoices: integer("maxChoices").default(1).notNull(),
  
  config: jsonb("config").default({}).notNull(),
  display: jsonb("display").default({}).notNull(),
  
  startTime: timestamp("startTime"),
  endTime: timestamp("endTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
});

// 投票选项表
export const voteOptions = toolSchema.table("VoteOption", {
  id: text("id").primaryKey(),
  voteId: text("voteId").notNull().references(() => votes.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  voteCount: integer("voteCount").default(0).notNull(),
});

// 投票记录表
export const voteRecords = toolSchema.table("VoteRecord", {
  id: text("id").primaryKey(),
  voteId: text("voteId").notNull().references(() => votes.id, { onDelete: "cascade" }),
  selectedOptions: jsonb("selectedOptions").default([]).notNull(),
  
  name: text("name"),
  phone: text("phone"),
  voterIp: text("voterIp"),
  
  votedAt: timestamp("votedAt").defaultNow().notNull(),
});

