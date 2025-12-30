import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// 确保数据库 URL 存在
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// 创建 PostgreSQL 连接
const connectionString = process.env.DATABASE_URL;

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

