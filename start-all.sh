#!/bin/bash

# ITSM システム同時起動スクリプト
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
  echo "🤖 自動実行モード: 全てのプロンプトを自動承認"
fi

echo "🚀 ITSM システムを起動しています..."
echo "======================================="

# 既存のプロセスをクリーンアップ（強化版）
echo "🧹 既存のプロセスをクリーンアップ中..."
pkill -f "vite" 2>/dev/null || true
pkill -f "start-server.js" 2>/dev/null || true
pkill -f "secure-server.js" 2>/dev/null || true
pkill -f "simple-frontend-server" 2>/dev/null || true
pkill -f "3001" 2>/dev/null || true
pkill -f "8082" 2>/dev/null || true

if [ "$FORCE_MODE" = true ]; then
  echo "🔥 強制モード: 全ポート強制解放中..."
  pkill -f "3001" -9 2>/dev/null || true
  pkill -f "8082" -9 2>/dev/null || true
  sleep 5
else
  sleep 2
fi

# バックエンドサーバー起動 (セキュア版)
echo "🛡️  セキュアバックエンドサーバーを起動中..."
cd /mnt/e/ServiceGrid/backend
PORT=8082 npm start &
BACKEND_PID=$!
cd /mnt/e/ServiceGrid

# バックエンドの起動を待つ
sleep 3

# フロントエンドサーバー起動
echo "🎨 フロントエンドサーバーを起動中..."
node simple-frontend-server.cjs &
FRONTEND_PID=$!

# プロセスIDを記録
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

echo "======================================="
echo "✅ システム起動完了！"
echo ""
echo "🌐 アクセスURL:"
echo "   フロントエンド: http://localhost:3001"
echo "   バックエンド:   http://localhost:8082"
echo ""
echo "🔑 テストログイン:"
echo "   ユーザー名: admin"
echo "   パスワード: admin123"
echo ""
echo "⏹️  停止方法:"
echo "   ./stop-all.sh を実行"
echo "   または Ctrl+C を2回押す"
echo "======================================="

# 停止シグナルを待つ
trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT TERM

# バックグラウンドで実行継続
echo "🎯 プロセスIDが記録されました:"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "📝 ログ監視中... (Ctrl+C で停止)"

# プロセス監視とポート競合対応強化
RESTART_COUNT=0
MAX_RESTARTS=3

while true; do
  # バックエンドプロセス監視
  if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "⚠️  バックエンドプロセス停止を検出 - 自動復旧中..."
    # ポート8082の競合プロセス確認・終了
    pkill -f "PORT=8082" 2>/dev/null || true
    sleep 2
    cd /mnt/e/ServiceGrid/backend
    PORT=8082 npm start &
    BACKEND_PID=$!
    echo "🔄 新しいバックエンドPID: $BACKEND_PID"
    echo $BACKEND_PID > /mnt/e/ServiceGrid/.backend.pid
    cd /mnt/e/ServiceGrid
  fi
  
  # フロントエンドプロセス監視（ポート競合対策強化）
  if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "⚠️  フロントエンドプロセス停止を検出 - 自動復旧中..."
    RESTART_COUNT=$((RESTART_COUNT + 1))
    
    if [ $RESTART_COUNT -gt $MAX_RESTARTS ]; then
      echo "🚨 フロントエンド再起動回数上限到達 - ポート強制解放中..."
      pkill -f "simple-frontend-server" -9 2>/dev/null || true
      pkill -f ":3001" -9 2>/dev/null || true
      sleep 5
      RESTART_COUNT=0
    fi
    
    # ポート3001の使用プロセスを確認・終了
    pkill -f "3001" 2>/dev/null || true
    sleep 3
    
    node simple-frontend-server.cjs &
    FRONTEND_PID=$!
    echo "🔄 新しいフロントエンドPID: $FRONTEND_PID (試行: $RESTART_COUNT)"
    echo $FRONTEND_PID > .frontend.pid
  else
    # プロセスが正常な場合、カウンタリセット
    RESTART_COUNT=0
  fi
  
  sleep 5
done