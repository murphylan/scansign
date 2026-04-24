# Stage 1: Install dependencies (本机架构)
FROM zot.murphylan.cloud/library/node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile


# Stage 2: Build the application (本机架构)
FROM zot.murphylan.cloud/library/node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next 项目若无 public/ 目录，standalone 构建仍会在镜像内引用该路径，需保证目录存在
RUN mkdir -p public

ENV DATABASE_URL=postgresql://placeholder:placeholder@placeholder:5432/placeholder
ENV NEXT_TELEMETRY_DISABLED=1
# Next.js 16 + Turbopack 内存占用较高，给 Node 4GB 防止 OOM 静默退出
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN --mount=type=cache,id=nextjs-cache,target=/app/.next/cache \
    pnpm build


# Stage 3: Production runner (目标服务器架构 amd64)
FROM zot.murphylan.cloud/library/node:22-alpine-amd64 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# drizzle-kit push 需要的 schema 与配置（部署脚本会从容器拷出）
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src/server/db ./src/server/db

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
