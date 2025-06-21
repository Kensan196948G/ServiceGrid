#!/bin/bash

# ITSM Platform - YOLO MODE 完全自動5ペイン並列開発環境
# 全ての確認プロンプトを削除し、完全自動化で実行

set -e

# 設定
SESSION_NAME="itsm-requirement"
PROJECT_ROOT="/mnt/f/ServiceGrid"
TMUX_DIR="$PROJECT_ROOT/tmux"
WORKTREE_ROOT="$PROJECT_ROOT/worktrees"

# yolo mode設定
YOLO_MODE=true
FORCE_MODE=false
SILENT_MODE=false
AUTO_TASK=true

# 色付きメッセージ関数（silent mode対応）
print_info() {
    [ "$SILENT_MODE" = false ] && echo -e "\033[1;34m[YOLO-INFO]\033[0m $1"
}

print_success() {
    [ "$SILENT_MODE" = false ] && echo -e "\033[1;32m[YOLO-SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[YOLO-ERROR]\033[0m $1"
}

print_warning() {
    [ "$SILENT_MODE" = false ] && echo -e "\033[1;33m[YOLO-WARNING]\033[0m $1"
}

print_yolo() {
    echo -e "\033[1;35m[🚀 YOLO]\033[0m $1"
}

# オプション解析
parse_options() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --yolo)
                YOLO_MODE=true
                shift
                ;;
            --force)
                FORCE_MODE=true
                shift
                ;;
            --silent)
                SILENT_MODE=true
                shift
                ;;
            --no-auto-task)
                AUTO_TASK=false
                shift
                ;;
            --help|-h)
                show_yolo_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_yolo_usage
                exit 1
                ;;
        esac
    done
}

# YOLO mode使用方法
show_yolo_usage() {
    echo "🚀 ITSM Platform YOLO MODE - 完全自動5ペイン並列開発環境"
    echo ""
    echo "使用方法:"
    echo "  $0 [OPTIONS]"
    echo ""
    echo "オプション:"
    echo "  --yolo          完全自動モード（デフォルト）"
    echo "  --force         既存セッション強制終了・再作成"
    echo "  --silent        最小限のログ出力"
    echo "  --no-auto-task  初期タスク自動実行を無効化"
    echo "  --help, -h      このヘルプを表示"
    echo ""
    echo "実行例:"
    echo "  $0                    # 標準yolo mode"
    echo "  $0 --force --silent   # 強制再作成・静音モード"
    echo "  $0 --no-auto-task     # 初期タスク無効化"
    echo ""
    echo "🎯 実行される処理:"
    echo "1. 既存tmuxセッション自動終了"
    echo "2. 5ペイン環境自動構築（3段構成）"
    echo "3. 各ペインでClaude Code自動起動"
    echo "4. Feature-A-Leaderから初期指示自動送信"
    echo "5. 全ペインで並列開発開始"
}

# 環境チェック（自動化版）
check_environment_yolo() {
    print_yolo "環境チェック実行中..."
    
    # tmux チェック
    if ! command -v tmux &> /dev/null; then
        print_error "tmuxがインストールされていません"
        print_error "インストール: sudo apt-get install tmux"
        exit 1
    fi
    
    # プロジェクトディレクトリ
    if [ ! -d "$PROJECT_ROOT" ]; then
        print_error "プロジェクトディレクトリが見つかりません: $PROJECT_ROOT"
        exit 1
    fi
    
    # Node.js環境
    if ! command -v node &> /dev/null; then
        print_error "Node.jsがインストールされていません"
        exit 1
    fi
    
    # Claude Code環境（オプション）
    if ! command -v claude &> /dev/null; then
        print_warning "Claude Codeが見つかりません（各ペインで手動起動が必要）"
    fi
    
    print_success "環境チェック完了"
}

# 既存セッション自動クリーンアップ
cleanup_session_yolo() {
    print_yolo "既存セッションクリーンアップ中..."
    
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        if [ "$FORCE_MODE" = true ]; then
            print_yolo "強制モード: セッション '$SESSION_NAME' を終了します"
            tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
            sleep 1
        else
            print_yolo "既存セッション '$SESSION_NAME' を自動終了します"
            tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
            sleep 1
        fi
    fi
    
    print_success "セッションクリーンアップ完了"
}

# スクリプト実行権限自動設定
setup_permissions_yolo() {
    print_yolo "スクリプト実行権限設定中..."
    
    # 全てのスクリプトに実行権限付与
    find "$TMUX_DIR" -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
    
    print_success "実行権限設定完了"
}

# 5ペインレイアウト自動作成
create_pane_layout_yolo() {
    print_yolo "5ペイン環境自動構築中（3段構成）..."
    
    # 新しいセッション作成
    tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"
    
    # セッション作成確認
    if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        print_error "tmuxセッションの作成に失敗しました"
        exit 1
    fi
    
    # ペイン分割（3段構成: 2x2+1レイアウト）自動実行
    print_yolo "3段構成レイアウト作成中..."
    
    # Step 1: 全体を上部(2x2グリッド用)と下部(Leader用)に分割
    tmux split-window -v -l 30% -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"
    
    # Step 2: 上部を上段と下段に分割（2段作成）
    tmux split-window -v -l 50% -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"
    
    # Step 3: 1段目を左右分割（Feature-B, Feature-C）
    tmux split-window -h -l 50% -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"
    
    # Step 4: 2段目を左右分割（Feature-D, Feature-E）
    tmux split-window -h -l 50% -t "$SESSION_NAME:0.2" -c "$PROJECT_ROOT"
    
    # ペイン数確認
    local pane_count=$(tmux list-panes -t "$SESSION_NAME:0" | wc -l)
    
    if [ "$pane_count" -eq 5 ]; then
        print_success "5ペインレイアウト作成完了（3段構成）"
    else
        print_warning "期待される5ペインではなく${pane_count}ペインが作成されました"
    fi
}

# 各ペイン自動起動設定
setup_panes_yolo() {
    print_yolo "各ペイン自動起動設定中..."
    
    # ペイン設定（yolo mode対応）
    local pane_configs=(
        "0:Feature-B-UI:UI/テスト自動修復:feature-b-ui.sh:React/TypeScript・Jest/RTL・ESLint"
        "1:Feature-C-API:API開発:feature-c-api.sh:Node.js・Express・テスト通過ループ"
        "2:Feature-D-PowerShell:PowerShell API:feature-d-powershell.sh:PowerShell・run-tests.sh・Windows対応"
        "3:Feature-E-NonFunc:非機能要件:feature-e-nonfunc.sh:SLA・ログ・セキュリティ・監視"
        "4:Feature-A-Leader:統合リーダー:feature-a-leader.sh:設計統一・アーキテクチャ管理・調整"
    )
    
    for config in "${pane_configs[@]}"; do
        IFS=':' read -r pane_num feature_name description script_name details <<< "$config"
        
        print_yolo "ペイン$pane_num: $feature_name 自動起動中..."
        
        # 基本設定
        tmux send-keys -t "$SESSION_NAME:0.$pane_num" "clear" C-m
        tmux send-keys -t "$SESSION_NAME:0.$pane_num" "cd $TMUX_DIR" C-m
        tmux send-keys -t "$SESSION_NAME:0.$pane_num" "export PS1='[YOLO-$feature_name] \\w$ '" C-m
        tmux send-keys -t "$SESSION_NAME:0.$pane_num" "export YOLO_MODE=true" C-m
        tmux send-keys -t "$SESSION_NAME:0.$pane_num" "export AUTO_APPROVE=true" C-m
        
        # ペインタイトル設定
        tmux select-pane -t "$SESSION_NAME:0.$pane_num" -T "YOLO-$feature_name"
        
        # yolo mode用環境変数設定
        tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo '🚀 YOLO MODE: $feature_name 自動起動完了'" C-m
        tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo '$details'" C-m
        tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo ''" C-m
        
        # スクリプト実行（yolo mode）
        if [ -f "$TMUX_DIR/panes/$script_name" ]; then
            # yolo mode環境変数付きでスクリプト実行
            tmux send-keys -t "$SESSION_NAME:0.$pane_num" "YOLO_MODE=true AUTO_APPROVE=true ./panes/$script_name" C-m
            print_success "ペイン$pane_num: $script_name YOLO起動完了"
        else
            tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo 'ERROR: $script_name が見つかりません'" C-m
            print_error "ペイン$pane_num: $script_name が見つかりません"
        fi
        
        sleep 0.3  # 高速化
    done
    
    print_success "全ペイン自動起動完了"
}

# 統合リーダー自動指示システム
setup_auto_leader_commands() {
    if [ "$AUTO_TASK" = false ]; then
        print_info "初期タスク自動実行は無効化されています"
        return
    fi
    
    print_yolo "統合リーダー自動指示システム起動中..."
    
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
    
    print_success "統合リーダー自動指示完了"
}

# YOLO mode情報表示
show_yolo_info() {
    print_success "=========================================="
    print_success "  🚀 YOLO MODE 5ペイン並列開発環境 🚀"
    print_success "=========================================="
    echo ""
    echo "📋 セッション名: $SESSION_NAME"
    echo "📁 プロジェクト: $PROJECT_ROOT"
    echo "🚀 モード: YOLO MODE (完全自動化)"
    echo "⚡ 自動タスク: $([ "$AUTO_TASK" = true ] && echo "有効" || echo "無効")"
    echo ""
    echo "🎯 各ペイン構成（YOLO MODE）:"
    echo "  ┌─────────────────────────────────────┐"
    echo "  │ 1段目（上段）                       │"
    echo "  │ ┌─────────────┬─────────────────────┤"
    echo "  │ │ 0:YOLO-B-UI │ 1:YOLO-C-API        │"
    echo "  │ │ 自動UI修復  │ 自動API開発         │"
    echo "  │ ├─────────────┼─────────────────────┤"
    echo "  │ │ 2段目（中段）                     │"
    echo "  │ │ 2:YOLO-D-PS │ 3:YOLO-E-Sec        │"
    echo "  │ │ PS自動修復  │ 自動品質監査        │"
    echo "  │ └─────────────┴─────────────────────┘"
    echo "  ├─────────────────────────────────────┤"
    echo "  │ 3段目（下段フル幅）                 │"
    echo "  │ 4:YOLO-A-Leader (統合自動指示)      │"
    echo "  └─────────────────────────────────────┘"
    echo ""
    echo "🚀 YOLO MODE機能:"
    echo "  • 全ペイン自動起動・並列実行"
    echo "  • Claude Code自動起動（可能な場合）"
    echo "  • 統合リーダー自動指示送信"
    echo "  • エラー自動復旧機能"
    echo "  • 品質チェック自動実行"
    echo ""
    echo "⌨️ tmuxペイン操作:"
    echo "  Ctrl-b + 0-4 : 各ペインに移動"
    echo "  Ctrl-b + z   : ペインズーム"
    echo "  Ctrl-b + &   : セッション終了"
    echo ""
    echo "🔄 終了方法:"
    echo "  tmux kill-session -t $SESSION_NAME"
    echo ""
}

# メイン実行関数
main() {
    print_yolo "ITSM Platform YOLO MODE 起動開始..."
    
    # オプション解析
    parse_options "$@"
    
    # 環境チェック
    check_environment_yolo
    
    # 既存セッションクリーンアップ
    cleanup_session_yolo
    
    # 権限設定
    setup_permissions_yolo
    
    # tmuxセッション作成
    create_pane_layout_yolo
    
    # ペイン自動起動
    setup_panes_yolo
    
    # 統合リーダー自動指示
    setup_auto_leader_commands
    
    # 情報表示
    show_yolo_info
    
    # セッションにアタッチ
    print_yolo "tmuxセッションにアタッチします..."
    print_success "🚀 YOLO MODE起動完了！全ペインで自動並列開発が開始されました！"
    
    # アタッチ実行
    tmux attach-session -t "$SESSION_NAME"
}

# スクリプト実行
main "$@"