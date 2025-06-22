#!/bin/bash

# ITSM Platform - 5ペイン並列開発環境開始スクリプト
# VSCode + Claude + tmux 統合開発環境

set -e

# 設定
SESSION_NAME="itsm-requirement"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMUX_DIR="$PROJECT_ROOT/tmux"
WORKTREE_ROOT="$PROJECT_ROOT/worktrees"

# YOLO MODE設定
YOLO_MODE=false

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

print_yolo() {
    echo -e "\033[1;35m[🚀 YOLO]\033[0m $1"
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
        
        if [ "$YOLO_MODE" = true ]; then
            print_yolo "YOLO MODE: Worktree環境を自動初期化します"
            bash "$TMUX_DIR/tools/worktree-manager.sh" init
            
            if [ $? -eq 0 ]; then
                print_success "Worktree環境初期化完了"
            else
                print_error "Worktree環境初期化に失敗しました"
                exit 1
            fi
        else
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
    
    # ペイン分割（3段構成: 2x2+1レイアウト）
    print_info "正確な3段構成作成中: 2x2+1レイアウト"
    
    # Step 1: 全体を上部(2x2グリッド用)と下部(Leader用)に分割
    if ! tmux split-window -v -l 30% -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"; then
        print_error "ペイン分割Step1に失敗しました"
        exit 1
    fi
    # 現在: ペイン0(上部), ペイン1(下部Leader用)
    
    # Step 2: 上部を上段と下段に分割（2段作成）
    if ! tmux split-window -v -l 50% -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"; then
        print_error "ペイン分割Step2に失敗しました"
        exit 1
    fi
    # 現在: ペイン0(1段目), ペイン1(2段目), ペイン2(Leader)
    
    # Step 3: 1段目を左右分割（Feature-B, Feature-C）
    if ! tmux split-window -h -l 50% -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"; then
        print_error "ペイン分割Step3に失敗しました"
        exit 1
    fi
    # 現在: ペイン0(Feature-B), ペイン1(Feature-C), ペイン2(2段目), ペイン3(Leader)
    
    # Step 4: 2段目を左右分割（Feature-D, Feature-E）
    if ! tmux split-window -h -l 50% -t "$SESSION_NAME:0.2" -c "$PROJECT_ROOT"; then
        print_error "ペイン分割Step4に失敗しました"
        exit 1
    fi
    # 最終: ペイン0(Feature-B), ペイン1(Feature-C), ペイン2(Feature-D), ペイン3(Feature-E), ペイン4(Leader)
    
    # ペイン5が作成されているので削除（4ペインのみ必要）
    sleep 1
    local pane_count=$(tmux list-panes -t "$SESSION_NAME:0" | wc -l)
    
    # 正確な配置確認
    print_info "最終ペイン配置確認:"
    tmux list-panes -t "$SESSION_NAME:0" -F "ペイン#{pane_index}: (#{pane_left},#{pane_top}) #{pane_width}x#{pane_height}"
    
    if [ "$pane_count" -eq 5 ]; then
        print_success "5ペインレイアウト作成完了（3段構成）"
        print_info "構成: 1段目(0,1) + 2段目(2,3) + 3段目(4)"
    else
        print_warning "期待される5ペインではなく${pane_count}ペインが作成されました"
    fi
}

# 各ペインに初期コマンド設定
setup_pane_commands() {
    if [ "$YOLO_MODE" = true ]; then
        print_yolo "YOLO MODE: 各ペイン自動起動設定中..."
    else
        print_info "各ペインにコマンドを設定中..."
    fi
    
    # ペイン数確認
    local pane_count=$(tmux list-panes -t "$SESSION_NAME:0" | wc -l)
    print_info "利用可能ペイン数: $pane_count"
    
    # 各ペインにコマンド設定（要望通りの3段構成）
    local pane_configs=(
        "0:Feature-B-UI:UI/テスト自動修復:feature-b-ui.sh:React/TypeScript・Jest/RTL・ESLint"
        "1:Feature-C-API:API開発:feature-c-api.sh:Node.js・Express・テスト通過ループ"
        "2:Feature-D-PowerShell:PowerShell API:feature-d-powershell.sh:PowerShell・run-tests.sh・Windows対応"
        "3:Feature-E-NonFunc:非機能要件:feature-e-nonfunc.sh:SLA・ログ・セキュリティ・監視"
        "4:Feature-A-Leader:統合リーダー:feature-a-leader.sh:設計統一・アーキテクチャ管理・調整"
    )
    
    for config in "${pane_configs[@]}"; do
        IFS=':' read -r pane_num feature_name description script_name details <<< "$config"
        
        # ペイン存在確認（範囲チェック付き）
        if [ "$pane_num" -lt "$pane_count" ]; then
            if [ "$YOLO_MODE" = true ]; then
                print_yolo "ペイン$pane_num: $feature_name YOLO自動起動中..."
            else
                print_info "ペイン$pane_num: $feature_name を設定中..."
            fi
            
            # 基本情報表示とプロンプト設定
            tmux send-keys -t "$SESSION_NAME:0.$pane_num" "clear" C-m
            tmux send-keys -t "$SESSION_NAME:0.$pane_num" "cd $TMUX_DIR" C-m
            
            if [ "$YOLO_MODE" = true ]; then
                tmux send-keys -t "$SESSION_NAME:0.$pane_num" "export PS1='[YOLO-$feature_name] \\w$ '" C-m
                tmux send-keys -t "$SESSION_NAME:0.$pane_num" "export YOLO_MODE=true" C-m
                tmux send-keys -t "$SESSION_NAME:0.$pane_num" "export AUTO_APPROVE=true" C-m
                tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo '🚀 YOLO MODE: $feature_name 自動起動完了'" C-m
            else
                tmux send-keys -t "$SESSION_NAME:0.$pane_num" "export PS1='[$feature_name] \\w$ '" C-m
                tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo '=== $feature_name ==='" C-m
            fi
            
            tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo '$details'" C-m
            tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo ''" C-m
            
            # ペインタイトル設定
            if [ "$YOLO_MODE" = true ]; then
                tmux select-pane -t "$SESSION_NAME:0.$pane_num" -T "YOLO-$feature_name"
            else
                tmux select-pane -t "$SESSION_NAME:0.$pane_num" -T "$feature_name"
            fi
            
            # スクリプト実行権限確認
            chmod +x "$TMUX_DIR/panes/$script_name" 2>/dev/null || true
            
            # スクリプト実行
            if [ -f "$TMUX_DIR/panes/$script_name" ]; then
                if [ "$YOLO_MODE" = true ]; then
                    tmux send-keys -t "$SESSION_NAME:0.$pane_num" "YOLO_MODE=true AUTO_APPROVE=true ./panes/$script_name" C-m
                    print_success "ペイン$pane_num: $script_name YOLO起動完了"
                else
                    tmux send-keys -t "$SESSION_NAME:0.$pane_num" "./panes/$script_name" C-m
                    print_success "ペイン$pane_num: $script_name 起動完了"
                fi
            else
                tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo 'ERROR: $script_name が見つかりません'" C-m
                tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo 'Press Enter to show menu...'" C-m
                print_error "ペイン$pane_num: $script_name が見つかりません"
            fi
        else
            print_warning "ペイン$pane_num が存在しません - $feature_name をスキップ"
        fi
        
        if [ "$YOLO_MODE" = true ]; then
            sleep 0.3  # YOLO MODEは高速化
        else
            sleep 0.5  # 通常モード
        fi
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
    echo "🚀 各ペイン構成 (3段構成):"
    echo "  ┌─────────────────────────────────────┐"
    echo "  │ 1段目（上段）                       │"
    echo "  │ ┌─────────────┬─────────────────────┤"
    echo "  │ │ 0:Feature-B │ 1:Feature-C         │"
    echo "  │ │ UI/テスト   │ API開発             │"
    echo "  │ ├─────────────┼─────────────────────┤"
    echo "  │ │ 2段目（中段）                     │"
    echo "  │ │ 2:Feature-D │ 3:Feature-E         │"
    echo "  │ │ PowerShell  │ 非機能要件          │"
    echo "  │ └─────────────┴─────────────────────┘"
    echo "  ├─────────────────────────────────────┤"
    echo "  │ 3段目（下段フル幅）                 │"
    echo "  │ 4:Feature-A (統合リーダー)          │"
    echo "  └─────────────────────────────────────┘"
    echo ""
    echo "⌨️ tmuxペイン操作:"
    echo "  Ctrl-b + 0: 🎨 Feature-B-UI - 1段目左"
    echo "  Ctrl-b + 1: 🔧 Feature-C-API - 1段目右"
    echo "  Ctrl-b + 2: 💻 Feature-D-PowerShell - 2段目左"
    echo "  Ctrl-b + 3: 🔒 Feature-E-NonFunc - 2段目右"
    echo "  Ctrl-b + 4: 🎯 Feature-A-Leader - 3段目フル幅"
    echo "  Ctrl-b + 矢印 : ペイン移動"
    echo "  Ctrl-b + z    : ペインズーム"
    echo "  Ctrl-b + &    : セッション終了"
    echo ""
    echo "📚 詳細情報: $TMUX_DIR/README.md"
    echo ""
}

# YOLO MODE自動指示システム
setup_yolo_auto_tasks() {
    if [ "$YOLO_MODE" != true ]; then
        return
    fi
    
    print_yolo "YOLO MODE: 統合リーダー自動指示システム起動中..."
    
    # 2秒待機（各ペインの起動完了を待つ）
    sleep 2
    
    # Feature-A-Leaderペイン（ペイン4）から自動指示送信
    print_yolo "初期タスク自動送信中..."
    
    # 初期環境セットアップ指示
    tmux send-keys -t "$SESSION_NAME:0.4" "cd $TMUX_DIR/coordination" C-m
    tmux send-keys -t "$SESSION_NAME:0.4" "./leader-command.sh all --auto-approve '🚀 YOLO MODE: 初期環境セットアップを自動実行してください。各ペインで開発準備を整えてください。'" C-m
    
    sleep 1
    
    # 状況確認指示
    tmux send-keys -t "$SESSION_NAME:0.4" "./leader-command.sh status" C-m
    
    print_success "YOLO MODE自動指示完了"
}

# オプション解析関数
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --yolo-mode|--yolo)
                YOLO_MODE=true
                print_yolo "YOLO MODEが有効化されました"
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                print_warning "Unknown option: $1"
                shift
                ;;
        esac
    done
}

# 使用方法表示
show_usage() {
    echo "🚀 ITSM Platform 5ペイン並列開発環境"
    echo ""
    echo "使用方法:"
    echo "  $0 [OPTIONS]"
    echo ""
    echo "オプション:"
    echo "  --yolo-mode, --yolo    YOLO MODE（完全自動化）で起動"
    echo "  --help, -h             このヘルプを表示"
    echo ""
    echo "実行例:"
    echo "  $0                     # 通常モード"
    echo "  $0 --yolo-mode         # YOLO MODE（自動化）"
    echo ""
    echo "🎯 YOLO MODE機能:"
    echo "  • 全ての確認プロンプトを自動承認"
    echo "  • 各ペイン自動起動・並列実行"
    echo "  • Claude Code自動起動（可能な場合）"
    echo "  • 統合リーダー自動指示送信"
    echo "  • 高速化された処理"
}

# メイン実行関数
main() {
    # オプション解析
    parse_arguments "$@"
    
    if [ "$YOLO_MODE" = true ]; then
        print_yolo "ITSM Platform YOLO MODE 5ペイン並列開発環境を開始します..."
    else
        print_info "ITSM Platform 5ペイン並列開発環境を開始します..."
    fi
    
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
    
    # Claude Code環境設定 (非対話型)
    if [ "$YOLO_MODE" = true ]; then
        print_yolo "Claude Code環境を自動設定中..."
    else
        print_info "Claude Code環境を設定中..."
    fi
    bash "$TMUX_DIR/setup-claude-noninteractive.sh" both 2>/dev/null || true
    
    # Feature-A-Leader統合リーダー機能設定
    if [ "$YOLO_MODE" = true ]; then
        print_yolo "Feature-A-Leader統合リーダー機能自動設定中..."
    else
        print_info "Feature-A-Leader統合リーダー機能設定中..."
    fi
    bash "$TMUX_DIR/setup-leader-pane.sh" setup 2>/dev/null || true
    
    # tmux hook設定 (attach時自動起動)
    if [ "$YOLO_MODE" = true ]; then
        print_yolo "tmux hook自動設定中..."
    else
        print_info "tmux hook設定中..."
    fi
    bash "$TMUX_DIR/auto-claude-hook.sh" setup 2>/dev/null || true
    
    # YOLO MODE自動タスク実行
    setup_yolo_auto_tasks
    
    # 情報表示
    show_development_info
    
    # セッションにアタッチ
    if [ "$YOLO_MODE" = true ]; then
        print_yolo "tmuxセッションにアタッチします..."
        print_success "🚀 YOLO MODE起動完了！全ペインで自動並列開発が開始されました！"
    else
        print_info "tmuxセッションにアタッチします..."
        print_info "終了するには: Ctrl-b & (確認後 y)"
        print_success "Claude Codeが各ペインで自動起動されました！"
    fi
    
    # セッションアタッチ
    tmux attach-session -t "$SESSION_NAME"
}

# スクリプト実行
main "$@"