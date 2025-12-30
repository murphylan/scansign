import { text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { toolSchema, activityStatusEnum, users } from "./users";

// 表单表
export const forms = toolSchema.table("Form", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  status: activityStatusEnum("status").default("DRAFT").notNull(),
  
  fields: jsonb("fields").default([]).notNull(),
  config: jsonb("config").default({}).notNull(),
  display: jsonb("display").default({}).notNull(),
  
  responseCount: integer("responseCount").default(0).notNull(),
  
  startTime: timestamp("startTime"),
  endTime: timestamp("endTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
});

// 表单响应表
export const formResponses = toolSchema.table("FormResponse", {
  id: text("id").primaryKey(),
  formId: text("formId").notNull().references(() => forms.id, { onDelete: "cascade" }),
  
  data: jsonb("data").default({}).notNull(),
  submitterIp: text("submitterIp"),
  
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});

