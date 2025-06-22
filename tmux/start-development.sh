#!/bin/bash

# ITSM Platform - Bash版 5ペイン並列開発環境開始スクリプト
# Linux + WSL + tmux + Claude Code 統合開発環境

set -e

# 設定変数
SESSION_NAME="itsm-requirement"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TMUX_DIR="$PROJECT_ROOT/tmux"
WORKTREE_ROOT="$PROJECT_ROOT/worktrees"

# フラグ変数
YOLO_MODE=false
SHOW_HELP=false

# 色付きメッセージ関数
write_info() {
    echo -e "\033[34m[INFO] $1\033[0m"
}

write_success() {
    echo -e "\033[32m[SUCCESS] $1\033[0m"
}

write_error() {
    echo -e "\033[31m[ERROR] $1\033[0m"
}

write_warning() {
    echo -e "\033[33m[WARNING] $1\033[0m"
}

write_yolo() {
    echo -e "\033[35m[🚀 YOLO] $1\033[0m"
}

# 使用方法表示
show_usage() {
    echo -e "\033[36m🚀 ITSM Platform 5ペイン並列開発環境 (Bash版)\033[0m"
    echo ""
    echo "使用方法:"
    echo "  ./start-development.sh [OPTIONS]"
    echo ""
    echo "オプション:"
    echo "  --yolo-mode       YOLO MODE（完全自動化）で起動"
    echo "  --help            このヘルプを表示"
    echo ""
    echo "実行例:"
    echo "  ./start-development.sh              # 通常モード"
    echo "  ./start-development.sh --yolo-mode  # YOLO MODE"
    echo ""
    echo "🎯 YOLO MODE機能:"
    echo "  • 全ての確認プロンプトを自動承認"
    echo "  • 各ペイン自動起動・並列実行"
    echo "  • Claude Code自動起動"
    echo "  • 統合リーダー自動指示送信"
    echo "  • Linux最適化された処理"
}

# コマンドライン引数解析
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --yolo-mode|--yolo)
                YOLO_MODE=true
                shift
                ;;
            --help|-h)
                SHOW_HELP=true
                shift
                ;;
            *)
                write_error "不明なオプション: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# 環境チェック
test_environment() {
    write_info "環境をチェック中..."
    
    # Bash バージョン確認
    if [[ ${BASH_VERSION%%.*} -lt 4 ]]; then
        write_warning "Bash 4+ を推奨します。現在: $BASH_VERSION"
    fi
    
    # tmux確認
    if ! command -v tmux &> /dev/null; then
        write_error "tmuxがインストールされていません"
        write_info "WSL/Linux環境でtmuxをインストールしてください:"
        write_info "  sudo apt-get install tmux"
        return 1
    fi
    
    # Node.js確認
    if ! command -v node &> /dev/null; then
        write_error "Node.jsがインストールされていません"
        return 1
    fi
    
    # プロジェクトディレクトリ確認
    if [[ ! -d "$PROJECT_ROOT" ]]; then
        write_error "プロジェクトディレクトリが見つかりません: $PROJECT_ROOT"
        return 1
    fi
    
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        write_error "package.jsonが見つかりません。正しいプロジェクトディレクトリですか？"
        return 1
    fi
    
    write_success "環境チェック完了"
    return 0
}

# 既存セッション確認・終了
stop_existing_session() {
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        write_warning "既存セッション '$SESSION_NAME' を終了します"
        tmux kill-session -t "$SESSION_NAME"
        sleep 1
    fi
}


# tmux設定適用
set_tmux_configuration() {
    write_info "tmux設定を適用中..."
    
    local tmux_config_path="$TMUX_DIR/session-config.conf"
    if [[ -f "$tmux_config_path" ]]; then
        local tmux_config_dir="$HOME/.config/tmux"
        mkdir -p "$tmux_config_dir"
        cp "$tmux_config_path" "$tmux_config_dir/tmux.conf"
        write_success "tmux設定適用完了"
    else
        write_warning "tmux設定ファイルが見つかりません: $tmux_config_path"
    fi
}

# ペインスクリプト権限設定
set_pane_script_permissions() {
    write_info "ペインスクリプトのセットアップ中..."
    
    local panes_dir="$TMUX_DIR/panes"
    local tools_dir="$TMUX_DIR/tools"
    
    if [[ -d "$panes_dir" ]]; then
        find "$panes_dir" -name "*.sh" -type f | while read -r script; do
            chmod +x "$script"
            write_info "実行権限付与: $(basename "$script")"
        done
    fi
    
    if [[ -d "$tools_dir" ]]; then
        find "$tools_dir" -name "*.sh" -type f | while read -r script; do
            chmod +x "$script"
            write_info "実行権限付与: $(basename "$script")"
        done
    fi
    
    write_success "スクリプトセットアップ完了"
}

# 5ペインレイアウト作成
new_pane_layout() {
    write_info "5ペイン開発環境を作成中..."
    
    # 新しいセッション作成
    if ! tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"; then
        write_error "tmuxセッションの作成に失敗しました"
        return 1
    fi
    
    write_info "正確な3段構成作成中: 2x2+1レイアウト"
    
    # ペイン分割（3段構成）
    tmux split-window -v -l 30% -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"
    tmux split-window -v -l 50% -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"
    tmux split-window -h -l 50% -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"
    tmux split-window -h -l 50% -t "$SESSION_NAME:0.2" -c "$PROJECT_ROOT"
    
    # ペイン配置確認
    write_info "最終ペイン配置確認:"
    tmux list-panes -t "$SESSION_NAME:0" -F "ペイン#{pane_index}: (#{pane_left},#{pane_top}) #{pane_width}x#{pane_height}"
    
    local pane_count=$(tmux list-panes -t "$SESSION_NAME:0" | wc -l)
    if [[ $pane_count -eq 5 ]]; then
        write_success "5ペインレイアウト作成完了（3段構成）"
        write_info "構成: 1段目(0,1) + 2段目(2,3) + 3段目(4)"
    else
        write_warning "期待される5ペインではなく${pane_count}ペインが作成されました"
    fi
    
    return 0
}

# 各ペインコマンド設定
set_pane_commands() {
    if $YOLO_MODE; then
        write_yolo "YOLO MODE: 各ペイン自動起動設定中..."
    else
        write_info "各ペインにコマンドを設定中..."
    fi
    
    # ペイン設定配列（連想配列の代替）
    local -a pane_indexes=(0 1 2 3 4)
    local -a pane_names=("Feature-B-UI" "Feature-C-API" "Feature-D-PowerShell" "Feature-E-NonFunc" "Feature-A-Leader")
    local -a pane_descriptions=("UI/テスト自動修復" "API開発" "PowerShell API" "非機能要件" "統合リーダー")
    local -a pane_scripts=("feature-b-ui.sh" "feature-c-api.sh" "feature-d-powershell.sh" "feature-e-nonfunc.sh" "feature-a-leader.sh")
    local -a pane_details=("React/TypeScript・Jest/RTL・ESLint" "Node.js・Express・テスト通過ループ" "PowerShell・run-tests.sh・Windows対応" "SLA・ログ・セキュリティ・監視" "設計統一・アーキテクチャ管理・調整")
    
    for i in "${!pane_indexes[@]}"; do
        local pane_index="${pane_indexes[$i]}"
        local pane_name="${pane_names[$i]}"
        local pane_description="${pane_descriptions[$i]}"
        local pane_script="${pane_scripts[$i]}"
        local pane_detail="${pane_details[$i]}"
        local pane_target="$SESSION_NAME:0.$pane_index"
        
        if $YOLO_MODE; then
            write_yolo "ペイン$pane_index: $pane_name YOLO自動起動中..."
        else
            write_info "ペイン$pane_index: $pane_name を設定中..."
        fi
        
        # 基本設定
        tmux send-keys -t "$pane_target" "clear" C-m
        tmux send-keys -t "$pane_target" "cd \"$TMUX_DIR\"" C-m
        
        if $YOLO_MODE; then
            tmux send-keys -t "$pane_target" "export PS1='[YOLO-$pane_name] \w$ '" C-m
            tmux send-keys -t "$pane_target" "export YOLO_MODE=true" C-m
            tmux send-keys -t "$pane_target" "export AUTO_APPROVE=true" C-m
            tmux send-keys -t "$pane_target" "echo '🚀 YOLO MODE: $pane_name 自動起動完了'" C-m
        else
            tmux send-keys -t "$pane_target" "export PS1='[$pane_name] \w$ '" C-m
            tmux send-keys -t "$pane_target" "echo '=== $pane_name ==='" C-m
        fi
        
        tmux send-keys -t "$pane_target" "echo '$pane_detail'" C-m
        tmux send-keys -t "$pane_target" "echo ''" C-m
        
        # ペインタイトル設定
        if $YOLO_MODE; then
            tmux select-pane -t "$pane_target" -T "YOLO-$pane_name"
        else
            tmux select-pane -t "$pane_target" -T "$pane_name"
        fi
        
        # スクリプト実行
        local script_path="$TMUX_DIR/panes/$pane_script"
        if [[ -f "$script_path" ]]; then
            chmod +x "$script_path" 2>/dev/null
            if $YOLO_MODE; then
                tmux send-keys -t "$pane_target" "YOLO_MODE=true AUTO_APPROVE=true ./panes/$pane_script" C-m
                write_success "ペイン$pane_index: $pane_script YOLO起動完了"
            else
                tmux send-keys -t "$pane_target" "./panes/$pane_script" C-m
                write_success "ペイン$pane_index: $pane_script 起動完了"
            fi
        else
            tmux send-keys -t "$pane_target" "echo 'ERROR: $pane_script が見つかりません'" C-m
            write_error "ペイン$pane_index: $pane_script が見つかりません"
        fi
        
        if $YOLO_MODE; then
            sleep 0.3
        else
            sleep 0.5
        fi
    done
    
    write_success "ペインコマンド設定完了"
}

# Claude Code環境設定
set_claude_environment() {
    if $YOLO_MODE; then
        write_yolo "Claude Code環境を自動設定中..."
    else
        write_info "Claude Code環境を設定中..."
    fi
    
    local setup_script="$TMUX_DIR/setup-claude-noninteractive.sh"
    if [[ -f "$setup_script" ]]; then
        bash "$setup_script" both 2>/dev/null || true
    fi
}

# YOLO MODE自動タスク
start_yolo_auto_tasks() {
    if ! $YOLO_MODE; then
        return
    fi
    
    write_yolo "YOLO MODE: 統合リーダー自動指示システム起動中..."
    
    sleep 2
    
    write_yolo "初期タスク自動送信中..."
    
    local leader_pane="$SESSION_NAME:0.4"
    tmux send-keys -t "$leader_pane" "cd \"$TMUX_DIR/coordination\"" C-m
    tmux send-keys -t "$leader_pane" "./leader-command.sh all --auto-approve '🚀 YOLO MODE: 初期環境セットアップを自動実行してください。各ペインで開発準備を整えてください。'" C-m
    
    sleep 1
    
    tmux send-keys -t "$leader_pane" "./leader-command.sh status" C-m
    
    write_success "YOLO MODE自動指示完了"
}

# 開発環境情報表示
show_development_info() {
    write_success "=========================================="
    write_success "  ITSM Platform 5ペイン並列開発環境"
    write_success "=========================================="
    echo ""
    echo -e "\033[36m📋 セッション名: $SESSION_NAME\033[0m"
    echo -e "\033[36m📁 プロジェクト: $PROJECT_ROOT\033[0m"
    echo -e "\033[36m🔧 Bash版: Linux最適化\033[0m"
    echo ""
    echo -e "\033[33m🚀 各ペイン構成 (3段構成):\033[0m"
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
    echo -e "\033[32m⌨️ tmuxペイン操作:\033[0m"
    echo "  Ctrl-b + 0: 🎨 Feature-B-UI - 1段目左"
    echo "  Ctrl-b + 1: 🔧 Feature-C-API - 1段目右"
    echo "  Ctrl-b + 2: 💻 Feature-D-PowerShell - 2段目左"
    echo "  Ctrl-b + 3: 🔒 Feature-E-NonFunc - 2段目右"
    echo "  Ctrl-b + 4: 🎯 Feature-A-Leader - 3段目フル幅"
    echo "  Ctrl-b + 矢印 : ペイン移動"
    echo "  Ctrl-b + z    : ペインズーム"
    echo "  Ctrl-b + &    : セッション終了"
    echo ""
}


# メイン実行関数
main() {
    # 引数解析
    parse_arguments "$@"
    
    if $SHOW_HELP; then
        show_usage
        return 0
    fi
    
    if $YOLO_MODE; then
        write_yolo "YOLO MODEが有効化されました"
        write_yolo "ITSM Platform YOLO MODE 5ペイン並列開発環境を開始します..."
    else
        write_info "ITSM Platform 5ペイン並列開発環境を開始します..."
    fi
    
    # 環境チェック
    if ! test_environment; then
        write_error "環境チェックに失敗しました"
        return 1
    fi
    
    # セッション管理
    stop_existing_session
    
    # 環境セットアップ
    set_tmux_configuration
    set_pane_script_permissions
    
    # tmuxセッション作成
    if ! new_pane_layout; then
        write_error "ペインレイアウト作成に失敗しました"
        return 1
    fi
    
    set_pane_commands
    
    # Claude Code環境設定
    set_claude_environment
    
    # YOLO MODE自動タスク
    start_yolo_auto_tasks
    
    # 情報表示
    show_development_info
    
    # セッション接続情報
    if $YOLO_MODE; then
        write_yolo "tmuxセッションにアタッチします..."
        write_success "🚀 YOLO MODE起動完了！全ペインで自動並列開発が開始されました！"
    else
        write_info "tmuxセッションにアタッチします..."
        write_info "終了するには: Ctrl-b & (確認後 y)"
        write_success "Claude Codeが各ペインで自動起動されました！"
    fi
    
    # Linux環境でのtmux接続
    echo -e "\033[36m次のコマンドでセッションに接続してください:\033[0m"
    echo -e "\033[37mtmux attach-session -t $SESSION_NAME\033[0m"
}

# スクリプト実行
main "$@"