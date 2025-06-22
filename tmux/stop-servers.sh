#!/bin/bash

# ITSM システム開発サーバー停止スクリプト (tmuxディレクトリ専用)
# 実行場所: /mnt/f/ServiceGrid/tmux

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

PROJECT_ROOT="/mnt/f/ServiceGrid"

echo "🛑 ITSM システム開発サーバーを停止しています..."
echo "======================================="

# PIDファイルから停止
if [ -f "$PROJECT_ROOT/.backend.pid" ]; then
    BACKEND_PID=$(cat "$PROJECT_ROOT/.backend.pid")
    print_info "バックエンドサーバーを停止中... (PID: $BACKEND_PID)"
    kill $BACKEND_PID 2>/dev/null || true
    rm "$PROJECT_ROOT/.backend.pid"
    print_success "バックエンドサーバー停止完了"
else
    print_warning "バックエンドPIDファイルが見つかりません"
fi

if [ -f "$PROJECT_ROOT/.frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PROJECT_ROOT/.frontend.pid")
    print_info "フロントエンドサーバーを停止中... (PID: $FRONTEND_PID)"
    kill $FRONTEND_PID 2>/dev/null || true
    rm "$PROJECT_ROOT/.frontend.pid"
    print_success "フロントエンドサーバー停止完了"
else
    print_warning "フロントエンドPIDファイルが見つかりません"
fi

# プロセス名での強制停止
print_info "残存プロセスをクリーンアップ中..."
pkill -f "vite" 2>/dev/null || true
pkill -f "start-server.js" 2>/dev/null || true
pkill -f "secure-server.js" 2>/dev/null || true

# ポートのクリーンアップ
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:8082 | xargs kill -9 2>/dev/null || true

sleep 2

print_success "システム停止完了！"
echo "======================================="