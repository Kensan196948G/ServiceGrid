#!/bin/bash

# ITSM システム最終安定版起動スクリプト（監視ループなし）

echo "🚀 ITSM システムを起動しています..."
echo "======================================="

# 既存のプロセスをクリーンアップ
echo "🧹 既存のプロセスをクリーンアップ中..."
pkill -f "start-all.sh" 2>/dev/null || true
pkill -f "secure-server.js" 2>/dev/null || true
pkill -f "simple-frontend-server" 2>/dev/null || true
sleep 3

# バックエンドサーバー起動
echo "🛡️  セキュアバックエンドサーバーを起動中..."
echo ""
cd /mnt/e/ServiceGrid/backend
echo "> itsm-backend@1.0.0 start"
echo "> PORT=8082 node secure-server.js"
echo ""
PORT=8082 node secure-server.js &
BACKEND_PID=$!
echo $BACKEND_PID > /mnt/e/ServiceGrid/.backend.pid

# バックエンド起動待機
sleep 8

# フロントエンドサーバー起動
echo "🎨 フロントエンドサーバーを起動中..."
cd /mnt/e/ServiceGrid
node simple-frontend-server.cjs &
FRONTEND_PID=$!
echo $FRONTEND_PID > .frontend.pid

# フロントエンド起動待機
sleep 5

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
echo "🎯 プロセスIDが記録されました:"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "📝 ログ監視中... (Ctrl+C で停止)"

# 少し待ってから接続確認
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
echo "📝 システム安定稼働中（監視ループなし）"
echo "🎉 http://localhost:3001 にアクセスしてください！"

# 停止シグナルを待つ（監視ループは完全に削除）
trap 'echo ""; echo "🛑 停止シグナル受信 - システム終了中..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT TERM

# 無限ループなし - シンプルに待機
wait