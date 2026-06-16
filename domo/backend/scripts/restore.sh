#!/bin/bash
set -e

if [ $# -lt 1 ]; then
    echo "用法: $0 <备份文件.sql.gz|.sql>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "文件不存在: ${BACKUP_FILE}"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "${SCRIPT_DIR}/.env" 2>/dev/null || true

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-warehouse}"

echo "=========================================="
echo "  恢复数据库: ${DB_NAME}"
echo "  文件: ${BACKUP_FILE}"
echo "=========================================="
read -p "确认覆盖? (YES): " CONFIRM
[ "${CONFIRM}" != "YES" ] && { echo "已取消"; exit 0; }

if [[ "${BACKUP_FILE}" == *.gz ]]; then
    gunzip -c "${BACKUP_FILE}" | mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}"
else
    mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" < "${BACKUP_FILE}"
fi

echo "✅ 恢复完成!"
