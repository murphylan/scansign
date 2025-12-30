import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// 加载 .env.local 文件
config({ path: ".env.local" });

// 移除 ?schema=xxx 参数（这是 Prisma 格式，PostgreSQL 驱动不支持）
const dbUrl = process.env.DATABASE_URL?.replace(/\?schema=\w+/, "") || "";

export default defineConfig({
  schema: "./src/server/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
  schemaFilter: ["tool"],
});
