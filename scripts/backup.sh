#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"

cd "$PROJECT_DIR"

if [ ! -f .env ]; then
  echo "[ERROR] .env 文件不存在"
  exit 1
fi
source .env 2>/dev/null || true

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-scansign}"
DB_CONTAINER="${PROJECT_NAME}_db_1"
DB_USER="${POSTGRES_USER:-scansign}"
DB_NAME="${POSTGRES_DB:-scansign}"
KEEP_COUNT="${1:-10}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${PROJECT_NAME}_${TIMESTAMP}.sql.gz"

echo "[INFO] 备份数据库: $DB_NAME"
echo "[INFO] 容器: $DB_CONTAINER"

podman exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[OK] 备份完成: $BACKUP_FILE ($SIZE)"

BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/${PROJECT_NAME}_*.sql.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$KEEP_COUNT" ]; then
  REMOVE_COUNT=$((BACKUP_COUNT - KEEP_COUNT))
  echo "[INFO] 清理旧备份，保留最近 $KEEP_COUNT 个..."
  ls -1t "$BACKUP_DIR"/${PROJECT_NAME}_*.sql.gz | tail -n "$REMOVE_COUNT" | xargs rm -f
  echo "[OK] 已删除 $REMOVE_COUNT 个旧备份"
fi

echo ""
echo "  恢复命令: gunzip -c $BACKUP_FILE | podman exec -i $DB_CONTAINER psql -U $DB_USER $DB_NAME"
