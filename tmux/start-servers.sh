#!/bin/bash

# ITSM システム開発サーバー起動スクリプト (tmuxディレクトリ専用)
# 実行場所: /mnt/f/ServiceGrid/tmux

set -e

# 色付きメッセージ関数
print_info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

print_warning() {
    echo -e "\033[1;33m[WARNING]\033[0m $1"
}

# 現在のディレクトリ確認
CURRENT_DIR=$(pwd)
TMUX_DIR="/mnt/f/ServiceGrid/tmux"
PROJECT_ROOT="/mnt/f/ServiceGrid"

print_info "現在のディレクトリ: $CURRENT_DIR"

# tmuxディレクトリからの実行を確認
if [ "$CURRENT_DIR" != "$TMUX_DIR" ]; then
    print_error "このスクリプトは $TMUX_DIR から実行してください"
    print_info "実行方法: cd $TMUX_DIR && ./start-servers.sh"
    exit 1
fi

# プロジェクトディレクトリ確認
if [ ! -d "$PROJECT_ROOT" ]; then
    print_error "プロジェクトディレクトリが見つかりません: $PROJECT_ROOT"
    exit 1
fi

if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    print_error "package.jsonが見つかりません: $PROJECT_ROOT/package.json"
    exit 1
fi

if [ ! -f "$PROJECT_ROOT/backend/package.json" ]; then
    print_error "バックエンドpackage.jsonが見つかりません: $PROJECT_ROOT/backend/package.json"
    exit 1
fi

print_success "プロジェクト構造確認完了"

echo "🚀 ITSM システム開発サーバーを起動しています..."
echo "======================================="

# 既存のプロセスをクリーンアップ
print_info "既存のプロセスをクリーンアップ中..."
pkill -f "vite" 2>/dev/null || true
pkill -f "start-server.js" 2>/dev/null || true
pkill -f "secure-server.js" 2>/dev/null || true
pkill -f "3001" 2>/dev/null || true
pkill -f "8082" 2>/dev/null || true

# ポートのクリーンアップ
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:8082 | xargs kill -9 2>/dev/null || true

sleep 2

# バックエンドサーバー起動
print_info "バックエンドサーバーを起動中..."
cd "$PROJECT_ROOT/backend"

# 依存関係確認
if [ ! -d "node_modules" ]; then
    print_warning "バックエンド依存関係をインストール中..."
    npm install
fi

# セキュアサーバーを起動
PORT=8082 node start-server.js &
BACKEND_PID=$!
print_success "バックエンドサーバー起動完了 (PID: $BACKEND_PID)"

# バックエンドの起動を待つ
sleep 3

# フロントエンドサーバー起動
print_info "フロントエンドサーバーを起動中..."
cd "$PROJECT_ROOT"

# 依存関係確認
if [ ! -d "node_modules" ]; then
    print_warning "フロントエンド依存関係をインストール中..."
    npm install
fi

# Viteサーバーを起動
npm run dev &
FRONTEND_PID=$!
print_success "フロントエンドサーバー起動完了 (PID: $FRONTEND_PID)"

# PIDファイルを記録
cd "$PROJECT_ROOT"
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

# 初期化待機
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
echo "   ./stop-servers.sh を実行"
echo "   または親ディレクトリで ./scripts/stop-all.sh を実行"
echo "======================================="

# 接続確認
print_info "システム接続確認中..."

# バックエンド接続確認
if curl -s http://localhost:8082/ping > /dev/null 2>&1; then
    print_success "バックエンドAPI正常稼働中"
else
    print_warning "バックエンドAPI初期化中..."
fi

# フロントエンド接続確認
if curl -s -I http://localhost:3001 | head -1 | grep "200" > /dev/null 2>&1; then
    print_success "フロントエンド正常稼働中"
else
    print_warning "フロントエンド初期化中..."
fi

echo ""
echo "📝 プロセスIDが記録されました:"
echo "   Backend PID: $BACKEND_PID (ファイル: $PROJECT_ROOT/.backend.pid)"
echo "   Frontend PID: $FRONTEND_PID (ファイル: $PROJECT_ROOT/.frontend.pid)"
echo ""
echo "🎉 http://localhost:3001 にアクセスしてください！"

# 停止シグナルハンドラー
trap 'echo ""; echo "🛑 停止シグナル受信 - システム終了中..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT TERM

# バックグラウンドプロセス監視
wait