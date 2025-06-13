#!/bin/bash

# ITSM Platform - 5ペイン並列開発環境開始スクリプト
# VSCode + Claude Code + tmux 統合開発環境

set -e

# 設定
SESSION_NAME="itsm-dev"
PROJECT_ROOT="/mnt/e/ServiceGrid"
TMUX_DIR="$PROJECT_ROOT/tmux"

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

# tmux環境チェック
check_tmux() {
    if ! command -v tmux &> /dev/null; then
        print_error "tmuxがインストールされていません"
        print_info "Ubuntu/Debian: sudo apt-get install tmux"
        print_info "CentOS/RHEL: sudo yum install tmux"
        exit 1
    fi
    print_success "tmux環境確認完了"
}

# 既存セッション確認・終了
cleanup_existing_session() {
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        print_warning "既存セッション '$SESSION_NAME' を終了します"
        tmux kill-session -t "$SESSION_NAME"
    fi
}

# プロジェクトディレクトリ確認
check_project_directory() {
    if [ ! -d "$PROJECT_ROOT" ]; then
        print_error "プロジェクトディレクトリが見つかりません: $PROJECT_ROOT"
        exit 1
    fi
    
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        print_error "package.jsonが見つかりません。正しいプロジェクトディレクトリですか？"
        exit 1
    fi
    
    print_success "プロジェクトディレクトリ確認完了"
}

# 依存関係チェック
check_dependencies() {
    print_info "依存関係をチェック中..."
    
    # Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.jsがインストールされていません"
        exit 1
    fi
    
    # npm
    if ! command -v npm &> /dev/null; then
        print_error "npmがインストールされていません"
        exit 1
    fi
    
    # PowerShell (オプション)
    if ! command -v pwsh &> /dev/null && ! command -v powershell &> /dev/null; then
        print_warning "PowerShellが見つかりません（Feature-D用）"
        print_info "PowerShell Core: https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell"
    fi
    
    print_success "依存関係チェック完了"
}

# tmux設定適用
apply_tmux_config() {
    print_info "tmux設定を適用中..."
    
    if [ -f "$TMUX_DIR/session-config.conf" ]; then
        # tmux設定ファイルを一時的にコピー
        mkdir -p ~/.config/tmux
        cp "$TMUX_DIR/session-config.conf" ~/.config/tmux/tmux.conf
        print_success "tmux設定適用完了"
    else
        print_warning "tmux設定ファイルが見つかりません: $TMUX_DIR/session-config.conf"
    fi
}

# 各ペインスクリプトに実行権限付与
setup_pane_scripts() {
    print_info "ペインスクリプトのセットアップ中..."
    
    for script in "$TMUX_DIR/panes"/*.sh; do
        if [ -f "$script" ]; then
            chmod +x "$script"
            print_info "実行権限付与: $(basename "$script")"
        fi
    done
    
    for script in "$TMUX_DIR/tools"/*.sh; do
        if [ -f "$script" ]; then
            chmod +x "$script"
            print_info "実行権限付与: $(basename "$script")"
        fi
    done
    
    print_success "スクリプトセットアップ完了"
}

# 5ペインレイアウト作成
create_pane_layout() {
    print_info "5ペイン開発環境を作成中..."
    
    # 新しいセッション作成（最初のウィンドウを作成）
    tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"
    
    # ペイン分割
    # 上段3ペイン（Feature-A, Feature-B, Feature-C）
    tmux split-window -h -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"
    tmux split-window -h -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"
    
    # 下段2ペイン（Feature-D, Feature-E）
    tmux split-window -v -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"
    tmux split-window -v -t "$SESSION_NAME:0.2" -c "$PROJECT_ROOT"
    
    # レイアウト調整
    tmux select-layout -t "$SESSION_NAME:0" tiled
    
    print_success "ペインレイアウト作成完了"
}

# 各ペインに初期コマンド設定
setup_pane_commands() {
    print_info "各ペインにコマンドを設定中..."
    
    # Feature-A: 統合リーダー (ペイン 0)
    tmux send-keys -t "$SESSION_NAME:0.0" "cd $TMUX_DIR && echo '=== Feature-A: 統合リーダー ===' && echo '設計統一・アーキテクチャ管理・調整'" Enter
    tmux send-keys -t "$SESSION_NAME:0.0" "./panes/feature-a-leader.sh" Enter
    
    # Feature-B: UI/テスト (ペイン 1)
    tmux send-keys -t "$SESSION_NAME:0.1" "cd $TMUX_DIR && echo '=== Feature-B: UI/テスト自動修復 ===' && echo 'React/TypeScript・Jest/RTL・ESLint'" Enter
    tmux send-keys -t "$SESSION_NAME:0.1" "./panes/feature-b-ui.sh" Enter
    
    # Feature-C: API開発 (ペイン 2)
    tmux send-keys -t "$SESSION_NAME:0.2" "cd $TMUX_DIR && echo '=== Feature-C: API開発 ===' && echo 'Node.js・Express・テスト通過ループ'" Enter
    tmux send-keys -t "$SESSION_NAME:0.2" "./panes/feature-c-api.sh" Enter
    
    # Feature-D: PowerShell (ペイン 3)
    tmux send-keys -t "$SESSION_NAME:0.3" "cd $TMUX_DIR && echo '=== Feature-D: PowerShell API ===' && echo 'PowerShell・run-tests.sh・Windows対応'" Enter
    tmux send-keys -t "$SESSION_NAME:0.3" "./panes/feature-d-powershell.sh" Enter
    
    # Feature-E: 非機能要件 (ペイン 4)
    tmux send-keys -t "$SESSION_NAME:0.4" "cd $TMUX_DIR && echo '=== Feature-E: 非機能要件 ===' && echo 'SLA・ログ・セキュリティ・監視'" Enter
    tmux send-keys -t "$SESSION_NAME:0.4" "./panes/feature-e-nonfunc.sh" Enter
    
    print_success "ペインコマンド設定完了"
}

# 開発環境情報表示
show_development_info() {
    print_success "=========================================="
    print_success "  ITSM Platform 5ペイン並列開発環境"
    print_success "=========================================="
    echo ""
    echo "📋 セッション名: $SESSION_NAME"
    echo "📁 プロジェクト: $PROJECT_ROOT"
    echo "🔧 tmux設定: ~/.config/tmux/tmux.conf"
    echo ""
    echo "🚀 各ペイン構成:"
    echo "  ┌─────────────────────────────────────┐"
    echo "  │ 0:Feature-A │ 1:Feature-B │ 2:Feature-C │"
    echo "  │ 統合リーダー │ UI/テスト   │ API開発     │"
    echo "  ├─────────────────────────────────────┤"
    echo "  │ 3:Feature-D │ 4:Feature-E │             │"
    echo "  │ PowerShell  │ 非機能要件  │             │"
    echo "  └─────────────────────────────────────┘"
    echo ""
    echo "⌨️  操作方法:"
    echo "  Ctrl-b + 0-4  : ペイン選択"
    echo "  Ctrl-b + 矢印 : ペイン移動"
    echo "  Ctrl-b + z    : ペインズーム"
    echo "  Ctrl-b + &    : セッション終了"
    echo ""
    echo "📚 詳細情報: $TMUX_DIR/README.md"
    echo ""
}

# メイン実行関数
main() {
    print_info "ITSM Platform 5ペイン並列開発環境を開始します..."
    
    # 各種チェック
    check_tmux
    check_project_directory
    check_dependencies
    
    # 既存セッションクリーンアップ
    cleanup_existing_session
    
    # 環境セットアップ
    apply_tmux_config
    setup_pane_scripts
    
    # tmuxセッション作成
    create_pane_layout
    setup_pane_commands
    
    # 情報表示
    show_development_info
    
    # セッションにアタッチ
    print_info "tmuxセッションにアタッチします..."
    print_info "終了するには: Ctrl-b & (確認後 y)"
    
    # セッションアタッチ
    tmux attach-session -t "$SESSION_NAME"
}

# スクリプト実行
main "$@"