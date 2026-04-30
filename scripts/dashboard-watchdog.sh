#!/bin/bash
# 三省六部监控看板健康检查 — 每 5 分钟执行
# 检测看板服务是否存活，异常则自动重启并发送飞书告警

set -uo pipefail

WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/f9ffd6fe-0d3a-482f-b9b6-440a60f5e855"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="/root/edict/logs/dashboard-watchdog.log"
DASHBOARD_URL="http://127.0.0.1:7899"
export HOME="/root"
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

mkdir -p "$(dirname "$LOG_FILE")"

send_alert() {
    local title="$1"
    local detail="$2"
    local color="${3:-red}"

    curl -s --max-time 10 -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{
        \"msg_type\": \"interactive\",
        \"card\": {
            \"header\": {
                \"title\": { \"tag\": \"plain_text\", \"content\": \"🏯 监控看板健康检查\" },
                \"template\": \"${color}\"
            },
            \"elements\": [
                {
                    \"tag\": \"markdown\",
                    \"content\": \"**状态**: ${title}\\n**时间**: ${TIMESTAMP}\\n**详情**: ${detail}\"
                }
            ]
        }
    }" > /dev/null 2>&1
}

log() {
    echo "[$TIMESTAMP] $*" | tee -a "$LOG_FILE"
}

# ---- 检查看板是否存活 ----
check_dashboard() {
    # 方法1：检查 systemd 服务
    if systemctl is-active edict-dashboard >/dev/null 2>&1; then
        return 0
    fi
    # 方法2：检查端口
    if ss -tlnp 2>/dev/null | grep -q ":7899 "; then
        return 0
    fi
    # 方法3：HTTP 健康探测
    if curl -s --max-time 5 -o /dev/null "$DASHBOARD_URL/"; then
        return 0
    fi
    return 1
}

# ---- 尝试重启 ----
restart_dashboard() {
    local attempt="$1"
    log "Attempt $attempt: restarting edict-dashboard..."

    # 用 systemd 重启
    if systemctl restart edict-dashboard 2>>"$LOG_FILE"; then
        sleep 5
        if systemctl is-active edict-dashboard >/dev/null 2>&1; then
            return 0
        fi
    fi

    # 兜底：强制杀掉旧进程 + 重新启动
    pkill -f "python3.*server.py.*7899" 2>/dev/null
    sleep 2
    if systemctl start edict-dashboard 2>>"$LOG_FILE"; then
        sleep 5
        if systemctl is-active edict-dashboard >/dev/null 2>&1; then
            return 0
        fi
    fi

    return 1
}

# ---- 主流程 ----
log "========== Dashboard Health Check =========="

if check_dashboard; then
    log "✅ 监控看板服务正常运行"
    # 每 24 小时只记一次 OK 日志，避免刷屏
    LAST_OK=$(grep -c "OK$" "$LOG_FILE" 2>/dev/null || echo "0")
    echo "[$TIMESTAMP] Dashboard OK" >> "$LOG_FILE"
    exit 0
fi

log "⚠️ 监控看板服务已宕机，正在尝试自动重启..."
send_alert "⚠️ 服务异常" "检测到监控看板未运行，正在尝试自动重启..." "orange"

# 最多尝试 3 次
for i in 1 2 3; do
    if restart_dashboard "$i"; then
        log "✅ 重启成功（第 $i 次尝试）"
        send_alert "✅ 服务已恢复" "监控看板已自动重启成功（第 $i 次尝试）" "green"
        echo "[$TIMESTAMP] ========== Recovered on attempt $i ==========" >> "$LOG_FILE"
        exit 0
    fi
    sleep 5
done

# 3 次均失败
log "❌ 所有重启尝试均失败！"
send_alert "❌ 服务恢复失败" "监控看板重启 3 次均失败，需要人工介入。请检查：1) 系统资源 2) 服务日志 journalctl -u edict-dashboard 3) 磁盘空间" "red"
echo "[$TIMESTAMP] ========== FAILED after 3 attempts ==========" >> "$LOG_FILE"
exit 1
