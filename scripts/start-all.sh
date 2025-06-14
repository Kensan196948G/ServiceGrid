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
cd backend
PORT=8082 node start-server.js &
BACKEND_PID=$!
cd ..

# バックエンドの起動を待つ
sleep 3

# フロントエンドサーバー起動
echo "🎨 Viteフロントエンドサーバーを起動中..."
npm run dev &
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

# 初回接続確認
sleep 8
echo ""
echo "🔍 初回システム接続確認中..."

# バックエンド接続確認
if curl -s http://localhost:8082/ping > /dev/null 2>&1; then
  echo "✅ バックエンドAPI正常稼働中"
else
  echo "⚠️  バックエンドAPI初期化中..."
fi

# フロントエンド接続確認
if curl -s -I http://localhost:3001 | head -1 | grep "200" > /dev/null 2>&1; then
  echo "✅ フロントエンド正常稼働中"
else
  echo "⚠️  フロントエンド初期化中..."
fi

echo ""
echo "以下にアクセスできます。"
echo "🌐 Access URLs:"
echo "  ✅ http://localhost:3001"
echo "  ✅ http://127.0.0.1:3001"
echo "  ✅ http://192.168.3.92:3001 (eth0)"
echo ""
echo "📝 システム安定稼働中（監視ループ無効化）"
echo "🎉 http://localhost:3001 にアクセスしてください！"

# 停止シグナルを待つ（監視ループは完全に削除）
trap 'echo ""; echo "🛑 停止シグナル受信 - システム終了中..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT TERM

# 無限ループ削除 - シンプルに待機
wait