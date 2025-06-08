#!/bin/bash

# ITSM システム安定起動スクリプト（監視ループなし）

echo "🚀 ITSM システムを起動しています（安定版）..."
echo "======================================="

# 既存のプロセスをクリーンアップ
echo "🧹 既存のプロセスをクリーンアップ中..."
pkill -f "start-all.sh" 2>/dev/null || true
pkill -f "secure-server.js" 2>/dev/null || true
pkill -f "simple-frontend-server" 2>/dev/null || true
sleep 3

# バックエンドサーバー起動
echo "🛡️  セキュアバックエンドサーバーを起動中..."
cd /mnt/e/ServiceGrid/backend
PORT=8082 node secure-server.js &
BACKEND_PID=$!
echo $BACKEND_PID > /mnt/e/ServiceGrid/.backend.pid
sleep 5

# フロントエンドサーバー起動
echo "🎨 フロントエンドサーバーを起動中..."
cd /mnt/e/ServiceGrid
node simple-frontend-server.cjs &
FRONTEND_PID=$!
echo $FRONTEND_PID > /mnt/e/ServiceGrid/.frontend.pid
sleep 3

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
echo "======================================="
echo "🎯 プロセスIDが記録されました:"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "📝 システム稼働中（監視ループなし・安定版）"

# 停止シグナルを待つ（監視ループは削除）
trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT TERM

# プロセス状況確認
echo ""
echo "🔍 プロセス確認中..."
sleep 2
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "✅ バックエンド正常稼働中 (PID: $BACKEND_PID)"
else
    echo "❌ バックエンド起動失敗"
fi

if kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "✅ フロントエンド正常稼働中 (PID: $FRONTEND_PID)"
else
    echo "❌ フロントエンド起動失敗"
fi

echo ""
echo "🚀 システム準備完了！ http://localhost:3001 にアクセスしてください"
echo "📝 ログは各プロセスで個別に出力されます"

# バックグラウンドで実行継続（無限ループなし）
wait