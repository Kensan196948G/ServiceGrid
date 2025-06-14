#!/bin/bash

# ITSM Platform - 5ペイン並列開発環境開始スクリプト（修正版）
# VSCode + Claude Code + tmux 統合開発環境

set -e

# 設定
SESSION_NAME="itsm-dev"
PROJECT_ROOT="/mnt/e/ServiceGrid"
TMUX_DIR="$PROJECT_ROOT/tmux"
WORKTREE_ROOT="$PROJECT_ROOT/worktrees"

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

# 既存セッション処理
handle_existing_session() {
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        print_warning "既存セッション '$SESSION_NAME' が見つかりました"
        read -p "既存セッションに接続しますか？ [y/N]: " attach_existing
        
        if [[ $attach_existing =~ ^[Yy]$ ]]; then
            print_success "既存セッションに接続します"
            tmux attach-session -t "$SESSION_NAME"
            exit 0
        else
            print_info "既存セッションを終了します"
            tmux kill-session -t "$SESSION_NAME"
            sleep 2
        fi
    fi
}

# 環境チェック
check_environment() {
    print_info "開発環境をチェック中..."
    
    # tmux確認
    if ! command -v tmux &> /dev/null; then
        print_error "tmuxがインストールされていません"
        exit 1
    fi
    
    # プロジェクトディレクトリ確認
    if [ ! -d "$PROJECT_ROOT" ]; then
        print_error "プロジェクトディレクトリが見つかりません: $PROJECT_ROOT"
        exit 1
    fi
    
    # Worktree確認
    if [ ! -d "$WORKTREE_ROOT" ]; then
        print_warning "Worktree環境が未初期化です"
        read -p "Worktree環境を初期化しますか？ [y/N]: " init_worktree
        if [[ $init_worktree =~ ^[Yy]$ ]]; then
            bash "$TMUX_DIR/tools/worktree-manager.sh" init
        fi
    fi
    
    print_success "環境チェック完了"
}

# tmuxセッション作成（シンプルバージョン）
create_simple_session() {
    print_info "tmux並列開発セッションを作成中..."
    
    # 新しいセッション作成
    tmux new-session -d -s "$SESSION_NAME" -c "$TMUX_DIR" || {
        print_error "tmuxセッションの作成に失敗しました"
        exit 1
    }
    
    # セッション作成確認
    if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        print_error "tmuxセッションが正常に作成されませんでした"
        exit 1
    fi
    
    print_success "基本セッション作成完了"
    
    # ペイン分割（シンプルで確実な方法）
    print_info "ペインを作成中..."
    
    # 水平分割で4つのペインを作る
    tmux split-window -h -t "$SESSION_NAME"
    tmux split-window -v -t "$SESSION_NAME"
    tmux split-window -v -t "$SESSION_NAME.0"
    tmux split-window -h -t "$SESSION_NAME.3"
    
    # レイアウト調整
    tmux select-layout -t "$SESSION_NAME" tiled
    
    # ペイン数確認
    local pane_count=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
    print_success "ペイン作成完了: $pane_count ペイン"
    
    # 各ペインにタイトルと基本情報を設定
    setup_pane_info
}

# 各ペインに基本情報設定
setup_pane_info() {
    print_info "各ペインに情報を設定中..."
    
    # ペイン0: Feature-A (統合リーダー)
    tmux send-keys -t "$SESSION_NAME.0" "clear" C-m
    tmux send-keys -t "$SESSION_NAME.0" "echo '🎯 Feature-A: 統合リーダー'" C-m
    tmux send-keys -t "$SESSION_NAME.0" "echo '設計統一・アーキテクチャ管理・他ペイン調整'" C-m
    tmux send-keys -t "$SESSION_NAME.0" "echo ''" C-m
    tmux send-keys -t "$SESSION_NAME.0" "cd $TMUX_DIR && ./panes/feature-a-leader.sh" C-m
    
    # ペイン1: Feature-B (UI/テスト)
    tmux send-keys -t "$SESSION_NAME.1" "clear" C-m
    tmux send-keys -t "$SESSION_NAME.1" "echo '🎨 Feature-B: UI/テスト自動修復'" C-m
    tmux send-keys -t "$SESSION_NAME.1" "echo 'React/TypeScript・Jest/RTL・ESLint'" C-m
    tmux send-keys -t "$SESSION_NAME.1" "echo ''" C-m
    tmux send-keys -t "$SESSION_NAME.1" "cd $TMUX_DIR && ./panes/feature-b-ui.sh" C-m
    
    # ペイン2: Feature-C (API開発)
    tmux send-keys -t "$SESSION_NAME.2" "clear" C-m
    tmux send-keys -t "$SESSION_NAME.2" "echo '🔧 Feature-C: API開発'" C-m
    tmux send-keys -t "$SESSION_NAME.2" "echo 'Node.js・Express・テスト通過ループ'" C-m
    tmux send-keys -t "$SESSION_NAME.2" "echo ''" C-m
    tmux send-keys -t "$SESSION_NAME.2" "cd $TMUX_DIR && ./panes/feature-c-api.sh" C-m
    
    # ペイン3: Feature-D (PowerShell)
    tmux send-keys -t "$SESSION_NAME.3" "clear" C-m
    tmux send-keys -t "$SESSION_NAME.3" "echo '💻 Feature-D: PowerShell API'" C-m
    tmux send-keys -t "$SESSION_NAME.3" "echo 'PowerShell・run-tests.sh・Windows対応'" C-m
    tmux send-keys -t "$SESSION_NAME.3" "echo ''" C-m
    tmux send-keys -t "$SESSION_NAME.3" "cd $TMUX_DIR && ./panes/feature-d-powershell.sh" C-m
    
    # ペイン4: Feature-E (非機能要件)
    tmux send-keys -t "$SESSION_NAME.4" "clear" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '🔒 Feature-E: 非機能要件'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo 'SLA・ログ・セキュリティ・監視'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo ''" C-m
    tmux send-keys -t "$SESSION_NAME.4" "cd $TMUX_DIR && ./panes/feature-e-nonfunc.sh" C-m
    
    # 最初のペインを選択
    tmux select-pane -t "$SESSION_NAME.0"
    
    print_success "ペイン情報設定完了"
}

# 開発環境情報表示
show_info() {
    echo ""
    echo "🚀 ITSM Platform 5ペイン並列開発環境"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📁 プロジェクト: $PROJECT_ROOT"
    echo "🎛️  tmuxセッション: $SESSION_NAME"
    echo ""
    echo "🎯 ペイン構成:"
    echo "  ペイン0: 🎯 Feature-A (統合リーダー)"
    echo "  ペイン1: 🎨 Feature-B (UI/テスト)"
    echo "  ペイン2: 🔧 Feature-C (API開発)"
    echo "  ペイン3: 💻 Feature-D (PowerShell)"
    echo "  ペイン4: 🔒 Feature-E (非機能要件)"
    echo ""
    echo "🔧 tmux操作:"
    echo "  Ctrl+b → 0~4: ペイン切り替え"
    echo "  Ctrl+b → d: セッションデタッチ"
    echo "  Ctrl+b → &: セッション終了"
    echo ""
    echo "🔄 Worktree同期:"
    echo "  ./tmux/tools/sync-worktrees.sh auto-sync"
    echo ""
    echo "🎯 統合管理:"
    echo "  ./tmux/tools/merge-controller.sh integrate"
    echo ""
}

# スクリプト実行権限設定
setup_scripts() {
    print_info "スクリプト実行権限を設定中..."
    
    find "$TMUX_DIR" -name "*.sh" -exec chmod +x {} \;
    
    print_success "実行権限設定完了"
}

# メイン実行関数
main() {
    echo "🚀 ITSM Platform 並列開発環境を起動します..."
    echo ""
    
    # 既存セッション確認
    handle_existing_session
    
    # 環境チェック
    check_environment
    
    # スクリプト権限設定
    setup_scripts
    
    # tmuxセッション作成
    create_simple_session
    
    # 情報表示
    show_info
    
    # セッションアタッチ
    print_success "セッション準備完了！接続します..."
    sleep 2
    tmux attach-session -t "$SESSION_NAME"
}

# ヘルプ表示
show_help() {
    echo "ITSM Platform 並列開発環境起動スクリプト"
    echo ""
    echo "使用方法:"
    echo "  $0           # 開発環境起動"
    echo "  $0 --help    # このヘルプ表示"
    echo "  $0 --status  # 現在の状況確認"
    echo ""
}

# 状況確認
show_status() {
    echo "現在の開発環境状況:"
    echo ""
    
    # tmuxセッション確認
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        echo "✅ tmuxセッション: 起動中"
        echo "   セッション名: $SESSION_NAME"
        echo "   ペイン数: $(tmux list-panes -t "$SESSION_NAME" | wc -l)"
    else
        echo "❌ tmuxセッション: 停止中"
    fi
    
    echo ""
    
    # Worktree確認
    if [ -d "$WORKTREE_ROOT" ]; then
        echo "✅ Worktree環境: 初期化済み"
        echo "   Worktree数: $(git worktree list | wc -l)"
    else
        echo "❌ Worktree環境: 未初期化"
    fi
    
    echo ""
}

# コマンドライン引数処理
case "${1:-}" in
    "--help"|"-h")
        show_help
        ;;
    "--status"|"-s")
        show_status
        ;;
    "")
        main
        ;;
    *)
        echo "無効なオプション: $1"
        show_help
        exit 1
        ;;
esac