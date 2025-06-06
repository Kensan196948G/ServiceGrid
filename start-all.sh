#!/bin/bash

# ITSM システム同時起動スクリプト
echo "🚀 ITSM システムを起動しています..."
echo "======================================="

# 既存のプロセスをクリーンアップ
echo "🧹 既存のプロセスをクリーンアップ中..."
pkill -f "vite" 2>/dev/null || true
pkill -f "start-server.js" 2>/dev/null || true
pkill -f "secure-server.js" 2>/dev/null || true
sleep 2

# バックエンドサーバー起動 (セキュア版)
echo "🛡️  セキュアバックエンドサーバーを起動中..."
cd backend
PORT=8082 npm start &
BACKEND_PID=$!
cd ..

# バックエンドの起動を待つ
sleep 3

# フロントエンドサーバー起動
echo "🎨 フロントエンドサーバーを起動中..."
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

# フォアグラウンドで実行継続
wait