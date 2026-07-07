# Stage 1: Install dependencies
FROM zot.murphylan.cloud/library/node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile


# Stage 1b: 仅生产依赖（供 runner 使用；丢弃 devDeps: playwright/typescript/tailwind/drizzle-kit/@types）
# 说明：Next standalone 的 trace 会漏掉只经 server action 引用的 drizzle-orm/postgres/bcryptjs，
# 所以 runner 仍需一份 node_modules；用 --prod 版即可，既保证运行期依赖齐全又去掉体积大头。
FROM zot.murphylan.cloud/library/node:22-alpine AS prod-deps
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile


# Stage 2: Build the application
FROM zot.murphylan.cloud/library/node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next 项目若无 public/ 目录，standalone 构建仍会在镜像内引用该路径，需保证目录存在
RUN mkdir -p public

# NEXT_PUBLIC_* 在构建时内联，必须在 build 前注入正确域名（否则 og:image 等会写死 localhost）
ARG NEXT_PUBLIC_BASE_URL=http://localhost:3000
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL

ENV DATABASE_URL=postgresql://placeholder:placeholder@placeholder:5432/placeholder
RUN pnpm build


# Stage 3: Production runner
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

# 生产依赖覆盖 standalone 自带的最小 node_modules（补齐 drizzle-orm/postgres/bcryptjs 等）
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# 仅保留 schema 更新所需文件（install.sh 会 podman cp 出这两者，在宿主机跑 drizzle-kit push）
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src/server/db ./src/server/db

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
