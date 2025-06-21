#!/bin/bash

# Feature-B: UI/テスト自動修復
# React/TypeScript・Jest/RTL・ESLint・自動修復・Worktree連携

set -e

PROJECT_ROOT="/mnt/e/ServiceGrid"

# Claude Code自動起動設定
setup_claude() {
    if [ "$YOLO_MODE" = true ]; then
        echo "🚀 YOLO MODE: Claude Code自動起動中..."
    else
        echo "🤖 Claude Code自動起動中..."
    fi
    
    # .envからAPIキー読み込み
    if [ -f "$PROJECT_ROOT/.env" ]; then
        export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
    fi
    
    # プロンプト設定
    if [ "$YOLO_MODE" = true ]; then
        export PS1='[YOLO-Feature-B-UI] \w$ '
        echo "\033]0;YOLO-Feature-B-UI\007"
    else
        export PS1='[Feature-B-UI] \w$ '
        echo "\033]0;Feature-B-UI\007"
    fi
    
    # Claude Code環境確認
    if command -v claude &> /dev/null; then
        echo "✅ Claude Codeが利用可能です"
        if [ "$YOLO_MODE" = true ]; then
            echo "🚀 YOLO MODE: Feature-B-UI自動フロントエンド開発アシスタントとして動作中"
        else
            echo "🎨 Feature-B-UI: フロントエンド開発アシスタントとして動作中"
        fi
        echo ""
        if [ "$YOLO_MODE" != true ]; then
            echo "💡 使用例:"
            echo "  claude 'コンポーネントのテストを作成してください'"
            echo "  claude 'コードレビューをお願いします'"
            echo "  claude 'ESLintエラーを修正してください'"
            echo ""
        fi
    else
        echo "⚠️ Claude Codeが見つかりません"
        if [ "$YOLO_MODE" != true ]; then
            echo "💡 インストール方法: pip install claude-code"
        fi
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

# YOLO MODE自動実行シーケンス
yolo_auto_sequence() {
    echo "🚀 YOLO MODE: Feature-B-UI自動実行シーケンス開始..."
    
    # 開発サーバー自動起動
    print_info "開発サーバー自動起動中..."
    start_dev_server
    
    # TypeScript型チェック自動実行
    echo "🔍 TypeScript型チェック自動実行中..."
    cd "$PROJECT_ROOT"
    npm run typecheck || print_warning "TypeScript型エラーが検出されました"
    
    # ESLint自動実行
    echo "✨ ESLint自動実行中..."
    npm run lint || print_warning "Lintエラーが検出されました"
    
    # テスト自動実行
    echo "🧪 Jest テスト自動実行中..."
    npm test -- --watchAll=false || print_warning "テストエラーが検出されました"
    
    echo "🚀 YOLO MODE: Feature-B-UI自動実行シーケンス完了"
    echo "🎯 待機モードに移行します..."
    echo ""
}

# YOLO MODE チェック・初期化
check_yolo_mode() {
    if [ "$YOLO_MODE" = true ]; then
        setup_claude
        print_header
        echo "🚀 YOLO MODE: Feature-B-UI自動起動中..."
        echo "📋 自動実行タスク一覧:"
        echo "  1. 開発サーバー自動起動"
        echo "  2. TypeScript型チェック自動実行"
        echo "  3. ESLint自動実行"
        echo "  4. Jest テスト自動実行"
        echo ""
        
        # YOLO MODE自動実行シーケンス
        yolo_auto_sequence
        
        print_success "🚀 YOLO MODE: Feature-B-UI自動環境準備完了！"
        print_success "Claude Code: フロントエンド開発アシスタント準備完了！"
        echo ""
        echo "💡 Feature-B-UI YOLO MODE待機中... Claude Codeで指示をお待ちしています"
        echo "📋 使用例: claude 'Reactコンポーネントを最適化してください'"
        echo ""
        
        # Claude Code待機モード（YOLO MODE）
        exec claude --non-interactive 2>/dev/null || main_loop
    else
        # 通常モード
        setup_claude
        print_header
        print_success "Feature-B-UI: UI/テスト環境準備完了！"
        print_success "Claude Code: フロントエンド開発アシスタント準備完了！"
        echo ""
        echo "💡 Feature-B-UI待機中... Claude Codeで指示をお待ちしています"
        echo "📋 使用例: claude 'Reactコンポーネントを最適化してください'"
        echo ""
        
        # 非対話型モード - Claude Code待機
        # メニューは表示せず、Claude Codeからの指示を待機
    fi
}

# スクリプト開始
check_yolo_mode