#!/bin/bash
# ============================================
# 设置每日自动备份 cron 任务
# 用法: ./scripts/cron_setup.sh
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/scripts/backup.sh"
CRON_TIME="0 2 * * *"  # 每天凌晨 2:00

# 检查 crontab 是否已有
EXISTING=$(crontab -l 2>/dev/null || true)
if echo "${EXISTING}" | grep -q "${BACKUP_SCRIPT}"; then
    echo "已有备份 cron 任务:"
    echo "${EXISTING}" | grep "${BACKUP_SCRIPT}"
    exit 0
fi

CRON_LINE="${CRON_TIME} ${BACKUP_SCRIPT} >> ${SCRIPT_DIR}/logs/backup_cron.log 2>&1"
(crontab -l 2>/dev/null || true; echo "${CRON_LINE}") | crontab -

echo "✅ 已添加每日备份 cron 任务"
echo "   执行时间: ${CRON_TIME}"
echo "   脚本: ${BACKUP_SCRIPT}"
echo "   日志: ${SCRIPT_DIR}/logs/backup_cron.log"
