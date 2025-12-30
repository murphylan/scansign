import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// 确保数据库 URL 存在
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// 移除 ?schema=xxx 参数（这是 Prisma 格式，PostgreSQL 驱动不支持）
const connectionString = process.env.DATABASE_URL.replace(/\?schema=\w+/, "");

// 用于查询的客户端（使用连接池）
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// 创建 Drizzle ORM 实例
export const db = drizzle(client, { schema });

// 导出所有 schema
export * from "./schema";

