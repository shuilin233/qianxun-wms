#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "${SCRIPT_DIR}/.env" 2>/dev/null || true

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-warehouse}"

OUTPUT_DIR="${1:-${SCRIPT_DIR}/backups}"
mkdir -p "${OUTPUT_DIR}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="${OUTPUT_DIR}/${DB_NAME}_${TIMESTAMP}.sql"

echo "=========================================="
echo "  千寻仓库管理系统 — 数据库备份"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "  数据库: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "=========================================="

mysqldump \
  -h "${DB_HOST}" \
  -P "${DB_PORT}" \
  -u "${DB_USER}" \
  -p"${DB_PASSWORD}" \
  --routines \
  --triggers \
  --single-transaction \
  --set-charset \
  --result-file="${OUTPUT_FILE}" \
  "${DB_NAME}"

gzip "${OUTPUT_FILE}"

echo ""
echo "✅ 备份完成！"
echo "   文件: ${OUTPUT_FILE}.gz"
echo "   大小: $(du -h "${OUTPUT_FILE}.gz" | cut -f1)"

find "${OUTPUT_DIR}" -name "${DB_NAME}_*.sql.gz" -mtime +30 -delete 2>/dev/null || true
echo "   已清理 30 天前的旧备份"
