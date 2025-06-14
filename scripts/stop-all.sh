#!/bin/bash

# ITSM システム停止スクリプト  
# 自動実行オプション対応: -y, --yes, --force, --auto-approve, --no-prompts

AUTO_MODE=false
FORCE_MODE=false

# コマンドライン引数解析
while [[ $# -gt 0 ]]; do
  case $1 in
    -y|--yes|--force|--auto-approve|--no-prompts|--silent-mode)
      AUTO_MODE=true
      FORCE_MODE=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

if [ "$AUTO_MODE" = true ]; then
  echo "🤖 自動実行モード: 強制停止実行"
fi

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