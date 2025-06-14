#!/bin/bash

# ITSM Platform - 5ペイン並列開発環境開始スクリプト
# VSCode + Claude + tmux 統合開発環境

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
        sleep 1  # セッション終了の待機時間
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

# Worktree環境チェック・初期化
check_worktree_environment() {
    print_info "Git Worktree環境をチェック中..."
    
    cd "$PROJECT_ROOT"
    
    # Git環境確認
    if [ ! -d ".git" ]; then
        print_error "Gitリポジトリが見つかりません"
        exit 1
    fi
    
    # Worktree管理ツール確認
    if [ ! -f "$TMUX_DIR/tools/worktree-manager.sh" ]; then
        print_error "Worktree管理ツールが見つかりません"
        exit 1
    fi
    
    # Worktree環境確認
    local worktree_count=$(git worktree list | wc -l)
    
    if [ "$worktree_count" -eq 1 ]; then
        print_warning "Worktree環境が未初期化です"
        
        read -p "Worktree環境を初期化しますか？ (y/N): " init_worktree
        if [[ $init_worktree =~ ^[Yy]$ ]]; then
            print_info "Worktree環境を初期化中..."
            bash "$TMUX_DIR/tools/worktree-manager.sh" init
            
            if [ $? -eq 0 ]; then
                print_success "Worktree環境初期化完了"
            else
                print_error "Worktree環境初期化に失敗しました"
                exit 1
            fi
        else
            print_warning "Worktree環境なしで開発環境を起動します"
        fi
    else
        print_success "Worktree環境確認完了 ($((worktree_count - 1)) worktrees)"
    fi
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
    
    # セッション作成確認
    if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        print_error "tmuxセッションの作成に失敗しました"
        exit 1
    fi
    
    # ペイン分割（3段構成: 要求通りの配置）
    print_info "ペイン分割中..."
    
    # 1段目: 水平分割で2つのペイン（左右）
    tmux split-window -h -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"
    
    # 2段目: 下部を作成（垂直分割）
    tmux split-window -v -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"
    tmux split-window -v -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"
    
    # 3段目: 最下部をフル幅で作成
    tmux split-window -v -t "$SESSION_NAME:0.2" -c "$PROJECT_ROOT"
    
    # ペイン再配置: 0→2, 1→3, 2→4, 3→0, 4→1にする
    # 現在: 0,1,2,3,4 → 目標: 2,3,4,0,1
    tmux swap-pane -s "$SESSION_NAME:0.0" -t "$SESSION_NAME:0.3" # 0↔3
    tmux swap-pane -s "$SESSION_NAME:0.1" -t "$SESSION_NAME:0.4" # 1↔4  
    tmux swap-pane -s "$SESSION_NAME:0.2" -t "$SESSION_NAME:0.3" # 2↔3
    
    # ペイン番号確認
    local pane_count=$(tmux list-panes -t "$SESSION_NAME:0" | wc -l)
    print_info "作成されたペイン数: $pane_count"
    
    if [ "$pane_count" -eq 5 ]; then
        print_success "5ペインレイアウト作成完了"
    else
        print_warning "期待される5ペインではなく${pane_count}ペインが作成されました"
    fi
}

# 各ペインに初期コマンド設定
setup_pane_commands() {
    print_info "各ペインにコマンドを設定中..."
    
    # ペイン数確認
    local pane_count=$(tmux list-panes -t "$SESSION_NAME:0" | wc -l)
    print_info "利用可能ペイン数: $pane_count"
    
    # 各ペインにコマンド設定（要求通りの配置順）
    local pane_configs=(
        "0:Feature-B:UI/テスト自動修復:feature-b-ui.sh:React/TypeScript・Jest/RTL・ESLint"
        "1:Feature-C:API開発:feature-c-api.sh:Node.js・Express・テスト通過ループ"
        "2:Feature-D:PowerShell API:feature-d-powershell.sh:PowerShell・run-tests.sh・Windows対応"
        "3:Feature-E:非機能要件:feature-e-nonfunc.sh:SLA・ログ・セキュリティ・監視"
        "4:Feature-A:統合リーダー:feature-a-leader.sh:設計統一・アーキテクチャ管理・調整"
    )
    
    for config in "${pane_configs[@]}"; do
        IFS=':' read -r pane_num feature_name description script_name details <<< "$config"
        
        # ペイン存在確認（範囲チェック付き）
        if [ "$pane_num" -lt "$pane_count" ]; then
            print_info "ペイン$pane_num: $feature_name を設定中..."
            
            # 基本情報表示
            tmux send-keys -t "$SESSION_NAME:0.$pane_num" "clear" C-m
            tmux send-keys -t "$SESSION_NAME:0.$pane_num" "cd $TMUX_DIR" C-m
            tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo '=== $feature_name ==='" C-m
            tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo '$details'" C-m
            tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo ''" C-m
            
            # スクリプト実行権限確認
            chmod +x "$TMUX_DIR/panes/$script_name" 2>/dev/null || true
            
            # スクリプト実行
            if [ -f "$TMUX_DIR/panes/$script_name" ]; then
                tmux send-keys -t "$SESSION_NAME:0.$pane_num" "./panes/$script_name" C-m
                print_success "ペイン$pane_num: $script_name 起動完了"
            else
                tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo 'ERROR: $script_name が見つかりません'" C-m
                tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo 'Press Enter to show menu...'" C-m
                print_error "ペイン$pane_num: $script_name が見つかりません"
            fi
        else
            print_warning "ペイン$pane_num が存在しません - $feature_name をスキップ"
        fi
        
        sleep 0.5  # ペイン間の処理間隔
    done
    
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
    echo "🚀 各ペイン構成 (3段レイアウト - 要求通り):"
    echo "  ┌─────────────────────────────────────┐"
    echo "  │ 1段目                               │"
    echo "  │ 0:Feature-B │ 1:Feature-C           │"
    echo "  │ UI/テスト   │ API開発               │"
    echo "  ├─────────────────────────────────────┤"
    echo "  │ 2段目                               │"
    echo "  │ 2:Feature-D │ 3:Feature-E           │"
    echo "  │ PowerShell  │ 非機能要件            │"
    echo "  ├─────────────────────────────────────┤"
    echo "  │ 3段目 (フル幅)                      │"
    echo "  │ 4:Feature-A (統合リーダー)          │"
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
    check_worktree_environment
    
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