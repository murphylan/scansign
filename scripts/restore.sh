#!/bin/bash
#
# 数据库恢复脚本（宿主机执行）
#
# 用法：
#   ./scripts/restore.sh --latest                # 恢复最新备份
#   ./scripts/restore.sh --date 20260423         # 恢复指定日期最新一个
#   ./scripts/restore.sh --date 20260423_153012  # 恢复精确时间戳
#   ./scripts/restore.sh --file /path/xxx.sql.gz # 恢复指定文件
#
#   附加参数：
#     --yes        跳过交互确认
#     --no-backup  恢复前不自动备份当前库（默认会备份一份保险）
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"

cd "$PROJECT_DIR"

if [ ! -f .env ]; then
  echo "[ERROR] .env 文件不存在: $PROJECT_DIR/.env"
  exit 1
fi
# shellcheck disable=SC1091
set -a; source .env 2>/dev/null || true; set +a

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-scansign}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[ERROR] .env 中未定义 DATABASE_URL"
  exit 1
fi

parse_url() {
  local url="$1"
  local stripped="${url#*://}"
  local userpass="${stripped%%@*}"
  local hostpath="${stripped#*@}"
  DB_USER="${userpass%%:*}"
  DB_PASS="${userpass#*:}"
  [ "$DB_USER" = "$DB_PASS" ] && DB_PASS=""
  local hostport="${hostpath%%/*}"
  local dbpart="${hostpath#*/}"
  DB_HOST="${hostport%%:*}"
  DB_PORT="${hostport#*:}"
  [ "$DB_HOST" = "$DB_PORT" ] && DB_PORT="5432"
  DB_NAME="${dbpart%%\?*}"
}
parse_url "$DATABASE_URL"

if [ -z "${DB_CONTAINER:-}" ]; then
  if [ "$DB_HOST" = "host.containers.internal" ] || [ "$DB_HOST" = "host.docker.internal" ]; then
    DB_CONTAINER="murphy-shared-pg"
  else
    DB_CONTAINER="${PROJECT_NAME}_db_1"
  fi
fi

MODE=""
TARGET_DATE=""
TARGET_FILE=""
ASSUME_YES="no"
PRE_BACKUP="yes"

usage() { sed -n '2,16p' "$0"; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --latest)        MODE="latest"; shift ;;
    --date)          MODE="date"; TARGET_DATE="$2"; shift 2 ;;
    --file)          MODE="file"; TARGET_FILE="$2"; shift 2 ;;
    --yes|-y)        ASSUME_YES="yes"; shift ;;
    --no-backup)     PRE_BACKUP="no"; shift ;;
    -h|--help)       usage ;;
    *)               echo "[ERROR] 未知参数：$1"; usage ;;
  esac
done

[ -z "$MODE" ] && usage

case "$MODE" in
  latest)
    BACKUP_FILE=$(ls -1t "$BACKUP_DIR"/${PROJECT_NAME}_*.sql.gz 2>/dev/null | head -n 1 || true)
    [ -z "$BACKUP_FILE" ] && { echo "[ERROR] 在 $BACKUP_DIR 下找不到任何备份"; exit 1; }
    ;;
  date)
    if ! echo "$TARGET_DATE" | grep -Eq '^[0-9]{8}(_[0-9]{6})?$'; then
      echo "[ERROR] --date 格式必须为 YYYYMMDD 或 YYYYMMDD_HHMMSS"
      exit 1
    fi
    PATTERN="$BACKUP_DIR/${PROJECT_NAME}_${TARGET_DATE}*.sql.gz"
    # shellcheck disable=SC2086
    MATCHES=$(ls -1t $PATTERN 2>/dev/null || true)
    if [ -z "$MATCHES" ]; then
      echo "[ERROR] 在 $BACKUP_DIR 下找不到匹配 $TARGET_DATE 的备份"
      echo "[HINT] 可用备份："
      ls -1t "$BACKUP_DIR"/${PROJECT_NAME}_*.sql.gz 2>/dev/null | head -n 10 | sed 's/^/  /'
      exit 1
    fi
    BACKUP_FILE=$(echo "$MATCHES" | head -n 1)
    COUNT=$(echo "$MATCHES" | wc -l | tr -d ' ')
    if [ "$COUNT" -gt 1 ]; then
      echo "[INFO] 该日期有 $COUNT 个备份，选取最新一个：$(basename "$BACKUP_FILE")"
    fi
    ;;
  file)
    BACKUP_FILE="$TARGET_FILE"
    [ ! -f "$BACKUP_FILE" ] && { echo "[ERROR] 备份文件不存在：$BACKUP_FILE"; exit 1; }
    ;;
esac

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[INFO] 待恢复文件：$BACKUP_FILE ($SIZE)"
echo "[INFO] 目标容器  ：$DB_CONTAINER"
echo "[INFO] 目标库    ：$DB_NAME (user: $DB_USER)"

if ! podman ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "[ERROR] 数据库容器未运行：$DB_CONTAINER"
  echo "[HINT] 当前运行中的容器："
  podman ps --format '  {{.Names}}'
  exit 1
fi

if [ "$ASSUME_YES" != "yes" ]; then
  echo ""
  echo "  ⚠️  此操作会覆盖容器 $DB_CONTAINER 中数据库 $DB_NAME 的全部数据！"
  echo "      （同集群里的其它数据库不受影响）"
  printf "  确认继续？(yes/N) "
  read -r ANSWER
  [ "$ANSWER" != "yes" ] && { echo "[INFO] 已取消"; exit 0; }
fi

if [ "$PRE_BACKUP" = "yes" ]; then
  PRE_TS=$(date +%Y%m%d_%H%M%S)
  PRE_FILE="$BACKUP_DIR/${PROJECT_NAME}_pre-restore_${PRE_TS}.sql.gz"
  mkdir -p "$BACKUP_DIR"
  echo "[INFO] 恢复前先备份当前库到：$PRE_FILE"
  podman exec -e PGPASSWORD="$DB_PASS" "$DB_CONTAINER" \
    pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl \
    | gzip > "$PRE_FILE"
fi

echo "[INFO] 开始恢复..."
gunzip -c "$BACKUP_FILE" \
  | podman exec -i -e PGPASSWORD="$DB_PASS" "$DB_CONTAINER" \
      psql -U "$DB_USER" -d "$DB_NAME" --quiet --set ON_ERROR_STOP=1

echo "[OK] 数据库恢复完成"
echo ""
echo "  建议接下来执行：podman restart ${PROJECT_NAME}_app_1"
