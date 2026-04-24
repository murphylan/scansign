#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  ScanSign 一键部署脚本（C 机器）
#
#  支持参数:
#    --port <PORT>         宿主机映射端口（默认 3004）
#    --domain <DOMAIN>     公网域名，如 sign.murphylan.cloud
#    --db-mode <MODE>      数据库模式: standalone（自带 PG）| shared（共享宿主机 PG）
#    --db-port <PORT>      共享模式下宿主机 PG 端口（默认 5433）
#    --db-name <NAME>      数据库名（默认 scansign）
#    --install-dir <DIR>   安装目录（默认 /home/$USER/work/scansign）
#    --admin-email <EMAIL> 首次启动自动创建的管理员邮箱
#    --admin-password <PW> 管理员初始密码（缺省时随机生成 16 位）
#    --skip-db-init        跳过共享 PG 容器创建（已存在时使用）
#    --yes                 跳过确认提示，全自动
# ─────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $*"; }
info() { echo -e "${BLUE}[i]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }
banner() {
  echo ""
  echo -e "${CYAN}═══════════════════════════════════════════${NC}"
  echo -e "${CYAN}  $*${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════${NC}"
  echo ""
}

REGISTRY="zot.murphylan.cloud"

ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  ARCH_TAG="amd64" ;;
  aarch64) ARCH_TAG="arm64" ;;
  arm64)   ARCH_TAG="arm64" ;;
  *)       err "不支持的架构: $ARCH"; exit 1 ;;
esac

IMAGE="${REGISTRY}/murphy/scansign:latest"
PG_IMAGE="${REGISTRY}/library/postgres:17-alpine-${ARCH_TAG}"

APP_PORT=3004
DOMAIN=""
DB_MODE="standalone"
DB_PORT=5433
DB_NAME="scansign"
INSTALL_DIR=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
SKIP_DB_INIT=false
AUTO_YES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)           APP_PORT="$2";        shift 2 ;;
    --domain)         DOMAIN="$2";          shift 2 ;;
    --db-mode)        DB_MODE="$2";         shift 2 ;;
    --db-port)        DB_PORT="$2";         shift 2 ;;
    --db-name)        DB_NAME="$2";         shift 2 ;;
    --install-dir)    INSTALL_DIR="$2";     shift 2 ;;
    --admin-email)    ADMIN_EMAIL="$2";     shift 2 ;;
    --admin-password) ADMIN_PASSWORD="$2";  shift 2 ;;
    --skip-db-init)   SKIP_DB_INIT=true;    shift ;;
    --yes|-y)         AUTO_YES=true;        shift ;;
    *)                warn "未知参数: $1";  shift ;;
  esac
done

INSTALL_DIR="${INSTALL_DIR:-/home/$USER/work/scansign}"

confirm() {
  if [ "$AUTO_YES" = true ]; then return 0; fi
  echo -en "${YELLOW}$1 [y/N]: ${NC}"
  read -r answer < /dev/tty
  [[ "$answer" =~ ^[Yy]$ ]]
}

DEPLOY_START=$(date +%s)

banner "ScanSign 一键部署（镜像模式）"

info "部署配置:"
echo "  安装目录:     $INSTALL_DIR"
echo "  应用端口:     $APP_PORT"
echo "  数据库模式:   $DB_MODE"
echo "  数据库名:     $DB_NAME"
echo "  系统架构:     $ARCH ($ARCH_TAG)"
echo "  镜像:         $IMAGE"
[ -n "$DOMAIN" ] && echo "  公网域名:     $DOMAIN"
echo ""

if ! confirm "确认以上配置并开始部署？"; then
  info "已取消"
  exit 0
fi

# ─────────────────────────────────────────────────────────────
# Step 1: 检查系统依赖
# ─────────────────────────────────────────────────────────────
banner "Step 1/5 — 检查系统依赖"

MISSING=()
if ! command -v podman &>/dev/null; then MISSING+=("podman"); fi
if ! command -v podman-compose &>/dev/null; then MISSING+=("podman-compose"); fi

if [ ${#MISSING[@]} -gt 0 ]; then
  warn "缺少依赖: ${MISSING[*]}"
  if command -v apt-get &>/dev/null; then
    info "尝试自动安装 (apt)..."
    sudo apt-get update -qq
    for pkg in "${MISSING[@]}"; do
      sudo apt-get install -y -qq "$pkg"
    done
  else
    err "请手动安装: ${MISSING[*]}"
    exit 1
  fi
fi

log "podman $(podman --version | awk '{print $3}')"
log "podman-compose 已就绪"

# ─────────────────────────────────────────────────────────────
# Step 2: 拉取镜像 + 生成 compose.yml
# ─────────────────────────────────────────────────────────────
banner "Step 2/5 — 拉取镜像"

info "拉取镜像..."
podman pull --tls-verify=false "$IMAGE"
podman pull --tls-verify=false "$PG_IMAGE"
log "镜像拉取完成"

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

if [ "$DB_MODE" = "shared" ]; then
  info "shared 模式 — 生成 compose.yml（仅 app 服务）"
  cat > compose.yml <<EOF
services:
  app:
    image: ${IMAGE}
    restart: unless-stopped
    ports:
      - "\${APP_PORT:-3004}:3000"
    environment:
      DATABASE_URL: \${DATABASE_URL}
      NEXT_PUBLIC_BASE_URL: \${NEXT_PUBLIC_BASE_URL:-http://localhost:3004}
      SESSION_COOKIE_NAME: \${SESSION_COOKIE_NAME:-murphy_session}
      SESSION_EXPIRY_DAYS: \${SESSION_EXPIRY_DAYS:-7}
      ADMIN_EMAIL: \${ADMIN_EMAIL:-}
      ADMIN_PASSWORD: \${ADMIN_PASSWORD:-}
      OPS_SUPER_USER_EMAIL: \${OPS_SUPER_USER_EMAIL:-}
    extra_hosts:
      - "host.containers.internal:host-gateway"
EOF
else
  info "standalone 模式 — 生成 compose.yml（app + db）"
  cat > compose.yml <<EOF
services:
  db:
    image: ${PG_IMAGE}
    restart: unless-stopped
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: \${POSTGRES_DB:-scansign}
      POSTGRES_USER: \${POSTGRES_USER:-scansign}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER:-scansign} -d \${POSTGRES_DB:-scansign}"]
      interval: 5s
      timeout: 5s
      retries: 10

  app:
    image: ${IMAGE}
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "\${APP_PORT:-3004}:3000"
    environment:
      DATABASE_URL: postgresql://\${POSTGRES_USER:-scansign}:\${POSTGRES_PASSWORD:?err}@db:5432/\${POSTGRES_DB:-scansign}?schema=tool
      NEXT_PUBLIC_BASE_URL: \${NEXT_PUBLIC_BASE_URL:-http://localhost:3004}
      SESSION_COOKIE_NAME: \${SESSION_COOKIE_NAME:-murphy_session}
      SESSION_EXPIRY_DAYS: \${SESSION_EXPIRY_DAYS:-7}
      ADMIN_EMAIL: \${ADMIN_EMAIL:-}
      ADMIN_PASSWORD: \${ADMIN_PASSWORD:-}
      OPS_SUPER_USER_EMAIL: \${OPS_SUPER_USER_EMAIL:-}

volumes:
  pgdata:
EOF
fi

log "compose.yml 已生成"

# ─────────────────────────────────────────────────────────────
# Step 3: 配置环境变量
# ─────────────────────────────────────────────────────────────
banner "Step 3/5 — 配置环境变量"

PG_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=' | head -c 20)
[ -z "$ADMIN_EMAIL" ] && ADMIN_EMAIL="admin@example.com"
[ -z "$ADMIN_PASSWORD" ] && ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=' | head -c 16)

if [ -f .env ]; then
  warn ".env 已存在，备份为 .env.bak"
  cp .env ".env.bak.$(date +%Y%m%d%H%M%S)"
fi

if [ -n "$DOMAIN" ]; then
  BASE_URL="https://$DOMAIN"
else
  BASE_URL="http://localhost:${APP_PORT}"
fi

if [ "$DB_MODE" = "shared" ]; then
  DATABASE_URL="postgresql://postgres:postgres@host.containers.internal:${DB_PORT}/${DB_NAME}?schema=tool"

  cat > .env <<EOF
COMPOSE_PROJECT_NAME=scansign
APP_PORT=${APP_PORT}

DATABASE_URL=${DATABASE_URL}

NEXT_PUBLIC_BASE_URL=${BASE_URL}
SESSION_COOKIE_NAME=murphy_session
SESSION_EXPIRY_DAYS=7

ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
EOF
else
  cat > .env <<EOF
COMPOSE_PROJECT_NAME=scansign
APP_PORT=${APP_PORT}

POSTGRES_DB=${DB_NAME}
POSTGRES_USER=scansign
POSTGRES_PASSWORD=${PG_PASSWORD}

NEXT_PUBLIC_BASE_URL=${BASE_URL}
SESSION_COOKIE_NAME=murphy_session
SESSION_EXPIRY_DAYS=7

ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
EOF
fi

log ".env 已生成"

# ─────────────────────────────────────────────────────────────
# Step 4: 数据库准备（仅 shared 模式）
# ─────────────────────────────────────────────────────────────
banner "Step 4/5 — 数据库准备"

if [ "$DB_MODE" = "shared" ]; then
  if [ "$SKIP_DB_INIT" = false ]; then
    if podman ps -a --format '{{.Names}}' | grep -q "^murphy-shared-pg$"; then
      if podman ps --format '{{.Names}}' | grep -q "^murphy-shared-pg$"; then
        log "共享 PostgreSQL 容器已在运行"
      else
        info "启动已有的共享 PostgreSQL 容器..."
        podman start murphy-shared-pg
        log "共享 PostgreSQL 已启动"
      fi
    else
      info "创建共享 PostgreSQL 容器..."
      podman run -d \
        --name murphy-shared-pg \
        --restart unless-stopped \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -p "${DB_PORT}:5432" \
        -v murphy-shared-pgdata:/var/lib/postgresql/data \
        "$PG_IMAGE"
      log "共享 PostgreSQL 容器已创建"

      info "等待 PostgreSQL 就绪..."
      for i in $(seq 1 30); do
        if podman exec murphy-shared-pg pg_isready -q 2>/dev/null; then
          break
        fi
        if [ "$i" -eq 30 ]; then
          err "PostgreSQL 启动超时"
          exit 1
        fi
        sleep 2
      done
      log "PostgreSQL 已就绪"
    fi

    if podman exec murphy-shared-pg psql -U postgres -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
      log "数据库 '$DB_NAME' 已存在"
    else
      podman exec murphy-shared-pg psql -U postgres -c "CREATE DATABASE $DB_NAME;"
      log "数据库 '$DB_NAME' 已创建"
    fi

    # scansign 使用 schema=tool，需在目标库内预创建
    podman exec murphy-shared-pg psql -U postgres -d "$DB_NAME" \
      -c "CREATE SCHEMA IF NOT EXISTS tool;" >/dev/null
    log "schema 'tool' 已就绪"
  else
    info "跳过共享 PostgreSQL 初始化（--skip-db-init）"
  fi
else
  info "standalone 模式 — 数据库由 compose 管理"
fi

# ─────────────────────────────────────────────────────────────
# Step 5: 启动服务 + 同步数据库结构
# ─────────────────────────────────────────────────────────────
banner "Step 5/5 — 启动服务"

info "启动服务..."
podman-compose down 2>/dev/null || true
podman-compose up -d

info "等待应用启动..."
for i in $(seq 1 60); do
  if curl -sf "http://localhost:${APP_PORT}" >/dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 60 ]; then
    warn "应用启动超时，请检查日志: cd $INSTALL_DIR && podman-compose logs -f app"
    break
  fi
  sleep 2
done

source .env 2>/dev/null || true
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-scansign}"
APP_CONTAINER="${PROJECT_NAME}_app_1"

if [ "$DB_MODE" = "shared" ]; then
  MIGRATE_DB_URL="postgresql://postgres:postgres@localhost:${DB_PORT}/${DB_NAME}"
else
  MIGRATE_DB_URL="postgresql://${POSTGRES_USER:-scansign}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB:-scansign}"
  # standalone 模式下也确保 tool schema 存在
  podman exec "${PROJECT_NAME}_db_1" psql -U "${POSTGRES_USER:-scansign}" -d "${POSTGRES_DB:-scansign}" \
    -c "CREATE SCHEMA IF NOT EXISTS tool;" >/dev/null 2>&1 || true
fi

info "同步数据库结构 (drizzle-kit push)..."
podman cp "$APP_CONTAINER":/app/drizzle.config.ts ./drizzle.config.ts 2>/dev/null
mkdir -p src/server/db
podman cp "$APP_CONTAINER":/app/src/server/db/. ./src/server/db/ 2>/dev/null
npm init -y >/dev/null 2>&1
npm install --silent drizzle-kit drizzle-orm postgres dotenv >/dev/null 2>&1

if DATABASE_URL="$MIGRATE_DB_URL" npx drizzle-kit push --force; then
  log "数据库结构同步完成"
  info "重启 app 容器以触发管理员账号自动初始化..."
  podman restart "$APP_CONTAINER" >/dev/null
else
  warn "数据库结构同步失败，可稍后手动执行:"
  echo "  cd $INSTALL_DIR && DATABASE_URL=\"$MIGRATE_DB_URL\" npx drizzle-kit push --force"
fi

rm -f drizzle.config.ts package.json package-lock.json
rm -rf src node_modules

# ─────────────────────────────────────────────────────────────
DEPLOY_END=$(date +%s)

banner "部署完成！(总耗时 $((DEPLOY_END - DEPLOY_START))s)"

echo -e "  ${GREEN}应用地址:${NC}  http://localhost:${APP_PORT}"
[ -n "$DOMAIN" ] && echo -e "  ${GREEN}公网域名:${NC}  https://${DOMAIN}"
echo ""
echo -e "  ${GREEN}管理员账号:${NC}"
echo "    邮箱:   $ADMIN_EMAIL"
echo "    密码:   $ADMIN_PASSWORD"
echo -e "  ${YELLOW}请立即妥善保存上述密码，并登录后修改！${NC}"
echo ""
echo -e "  ${CYAN}常用命令:${NC}"
echo "    cd $INSTALL_DIR"
echo "    podman-compose logs -f app    # 查看日志"
echo "    podman-compose restart app    # 重启应用"
echo "    podman-compose down           # 停止服务"
echo ""
echo -e "  ${YELLOW}更新部署:${NC}"
echo "    podman pull --tls-verify=false $IMAGE && podman-compose down && podman-compose up -d"
echo ""
