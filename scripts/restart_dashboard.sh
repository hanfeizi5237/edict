#!/bin/bash
# 三省六部监控看板重启脚本
# 用法：bash scripts/restart_dashboard.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
DASHBOARD_DIR="$BASE_DIR/dashboard"
LOG_FILE="/tmp/dashboard.log"
PORT=7899
HOST="0.0.0.0"

echo "🔧 三省六部监控看板重启脚本"
echo "================================"

# 1. 停止现有服务
echo "⏹️  停止现有服务..."
pkill -9 -f "server.py.*$PORT" 2>/dev/null || true
sleep 1

# 检查是否还有进程在运行
if pgrep -f "server.py.*$PORT" > /dev/null; then
    echo "❌ 无法停止服务，请手动检查"
    exit 1
fi
echo "✅ 服务已停止"

# 2. 清理旧日志
echo "🗑️  清理旧日志..."
> "$LOG_FILE"

# 3. 启动新服务
echo "🚀 启动新服务..."
cd "$DASHBOARD_DIR"
nohup python3 server.py --host "$HOST" --port "$PORT" > "$LOG_FILE" 2>&1 &
PID=$!
echo "📝 进程 PID: $PID"

# 4. 等待服务启动
echo "⏳ 等待服务启动..."
sleep 3

# 5. 验证服务
echo "🔍 验证服务状态..."
if pgrep -f "server.py.*$PORT" > /dev/null; then
    echo "✅ 服务进程已启动"
else
    echo "❌ 服务进程启动失败"
    echo "📄 日志内容:"
    cat "$LOG_FILE"
    exit 1
fi

# 检查端口监听
if ss -tlnp 2>/dev/null | grep -q ":$PORT" || netstat -tlnp 2>/dev/null | grep -q ":$PORT"; then
    echo "✅ 端口 $PORT 正在监听"
else
    echo "❌ 端口 $PORT 未监听"
    exit 1
fi

# 检查 API 响应
HEALTH_URL="http://127.0.0.1:$PORT/healthz"
if curl -s "$HEALTH_URL" | grep -q '"status":"ok"'; then
    echo "✅ 健康检查通过"
else
    echo "⚠️  健康检查未返回 ok，但服务可能仍可用"
fi

# 6. 显示访问信息
echo ""
echo "================================"
echo "✅ 监控看板重启成功！"
echo ""
echo "📊 访问地址:"
echo "   本地：http://127.0.0.1:$PORT/"
echo "   远程：http://172.16.30.107:$PORT/"
echo ""
echo "📝 日志文件：$LOG_FILE"
echo "🔍 查看日志：tail -f $LOG_FILE"
echo "================================"
