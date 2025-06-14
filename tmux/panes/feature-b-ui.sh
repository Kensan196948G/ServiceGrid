#!/bin/bash

# Feature-B: UI/テスト自動修復
# React/TypeScript・Jest/RTL・ESLint・自動修復・Worktree連携

set -e

PROJECT_ROOT="/mnt/e/ServiceGrid"

# Claude自動起動設定
setup_claude() {
    echo "🤖 Claude自動起動設定中..."
    
    # .envからAPIキー読み込み
    if [ -f "$PROJECT_ROOT/.env" ]; then
        export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
    fi
    
    # Claude起動
    if command -v claude &> /dev/null; then
        echo "🎨 Feature-B専用Claude起動中..."
        echo "✅ Claude起動完了"
        exec claude
    else
        echo "⚠️ claudeコマンドが見つかりません"
    fi
}

WORKTREE_ROOT="$PROJECT_ROOT/worktrees"
UI_WORKTREE="$WORKTREE_ROOT/feature-b-ui"
FEATURE_NAME="Feature-B: UI/テスト自動修復 (Worktree対応)"

# 色付きメッセージ関数
print_header() {
    echo -e "\033[1;32m========================================\033[0m"
    echo -e "\033[1;32m  $FEATURE_NAME\033[0m"
    echo -e "\033[1;32m========================================\033[0m"
}

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

# UI開発メニュー表示
show_ui_menu() {
    echo ""
    echo "🎨 UI/テスト自動修復 - 操作メニュー"
    echo "────────────────────────────────"
    echo "1) 🚀 フロントエンド開発サーバー起動"
    echo "2) 🧪 テストwatch実行"
    echo "3) ✨ ESLint自動修復"
    echo "4) 🔍 TypeScript型チェック"
    echo "5) 📊 テストカバレッジ表示"
    echo "6) 🔧 コンポーネント自動修復"
    echo "7) 📱 UI動作確認"
    echo "8) 🔄 依存関係更新"
    echo "9) 📝 テスト自動生成"
    echo "a) 🎯 全自動修復モード"
    echo "0) 🔄 メニュー再表示"
    echo "q) 終了"
    echo "────────────────────────────────"
}

# フロントエンド開発サーバー起動
start_dev_server() {
    print_info "フロントエンド開発サーバーを起動中..."
    
    cd "$PROJECT_ROOT"
    
    # 既存サーバーチェック
    if pgrep -f "vite.*3001" > /dev/null; then
        print_warning "開発サーバーは既に稼働中です Port 3001"
        return
    fi
    
    # 依存関係インストール確認
    if [ ! -d "node_modules" ]; then
        print_info "依存関係をインストール中..."
        npm install
    fi
    
    # 開発サーバー起動
    print_info "Vite開発サーバーを起動中... Port 3001"
    npm run dev &
    
    # 起動確認
    sleep 3
    if pgrep -f "vite.*3001" > /dev/null; then
        print_success "開発サーバー起動完了: http://localhost:3001"
    else
        print_error "開発サーバー起動に失敗しました"
    fi
}

# メインループ
main_loop() {
    print_header
    
    while true; do
        show_ui_menu
        echo -n "選択してください: "
        read -r choice
        
        case $choice in
            1)
                start_dev_server
                ;;
            0)
                clear
                print_header
                ;;
            q|Q)
                print_info "UI/テスト自動修復を終了します"
                exit 0
                ;;
            *)
                print_warning "無効な選択です。再度選択してください。"
                ;;
        esac
        
        echo ""
        echo "Press Enter to continue..."
        read -r
    done
}

# スクリプト開始
print_header
setup_claude
main_loop