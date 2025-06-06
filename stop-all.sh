#!/bin/bash

# ITSM システム停止スクリプト
echo "🛑 ITSM システムを停止しています..."
echo "======================================="

# PIDファイルから停止
if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    echo "🔧 バックエンドサーバーを停止中... (PID: $BACKEND_PID)"
    kill $BACKEND_PID 2>/dev/null || true
    rm .backend.pid
fi

if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    echo "🎨 フロントエンドサーバーを停止中... (PID: $FRONTEND_PID)"
    kill $FRONTEND_PID 2>/dev/null || true
    rm .frontend.pid
fi

# プロセス名での強制停止
echo "🧹 残存プロセスをクリーンアップ中..."
pkill -f "vite" 2>/dev/null || true
pkill -f "start-server.js" 2>/dev/null || true

# ポートのクリーンアップ
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:8082 | xargs kill -9 2>/dev/null || true

sleep 2

echo "✅ システム停止完了！"
echo "======================================="