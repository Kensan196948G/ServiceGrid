#!/bin/bash

# ITSM Platform - VSCode + tmux統合開発環境起動スクリプト
# Claude Code + Worktree + 並列開発環境の完全統合

set -e

PROJECT_ROOT="/mnt/e/ServiceGrid"
TMUX_DIR="$PROJECT_ROOT/tmux"
SESSION_NAME="itsm-dev"
WORKSPACE_FILE="$PROJECT_ROOT/.vscode/itsm-worktrees.code-workspace"

# 色付きメッセージ関数
print_header() {
    echo -e "\033[1;36m========================================\033[0m"
    echo -e "\033[1;36m  VSCode + tmux統合開発環境\033[0m"
    echo -e "\033[1;36m========================================\033[0m"
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

# 環境チェック
check_environment() {
    print_info "統合開発環境をチェック中..."
    
    # VSCode確認
    if ! command -v code &> /dev/null; then
        print_error "VSCodeがインストールされていません"
        print_info "VSCode: https://code.visualstudio.com/"
        exit 1
    fi
    
    # tmux確認
    if ! command -v tmux &> /dev/null; then
        print_error "tmuxがインストールされていません"
        print_info "Ubuntu/Debian: sudo apt-get install tmux"
        exit 1
    fi
    
    # Worktree確認
    if [ ! -d "$PROJECT_ROOT/worktrees" ]; then
        print_warning "Worktree環境が未初期化です"
        return 1
    fi
    
    print_success "環境チェック完了"
    return 0
}

# Worktree初期化
initialize_worktrees() {
    print_info "Worktree環境を初期化中..."
    
    cd "$PROJECT_ROOT"
    
    if [ ! -f "$TMUX_DIR/tools/worktree-manager.sh" ]; then
        print_error "Worktree管理ツールが見つかりません"
        exit 1
    fi
    
    # Worktree初期化実行
    bash "$TMUX_DIR/tools/worktree-manager.sh" init
    
    if [ $? -eq 0 ]; then
        print_success "Worktree環境初期化完了"
    else
        print_error "Worktree環境初期化に失敗しました"
        exit 1
    fi
}

# tmuxセッション確認・作成
setup_tmux_session() {
    print_info "tmux並列開発セッションをセットアップ中..."
    
    # 既存セッション確認
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        print_info "既存のtmuxセッションが見つかりました"
        read -p "既存セッションを再利用しますか？ (y/N): " reuse_session
        
        if [[ ! $reuse_session =~ ^[Yy]$ ]]; then
            print_warning "既存セッションを終了します"
            tmux kill-session -t "$SESSION_NAME"
            
            # 新しいセッション作成
            print_info "新しいtmuxセッションを作成中..."
            bash "$TMUX_DIR/start-development.sh" &
            sleep 3
        fi
    else
        # 新しいセッション作成
        print_info "tmuxセッションを作成中..."
        bash "$TMUX_DIR/start-development.sh" &
        sleep 3
    fi
    
    # セッション確認
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        print_success "tmuxセッション準備完了"
    else
        print_error "tmuxセッションの作成に失敗しました"
        exit 1
    fi
}

# VSCode起動
launch_vscode() {
    print_info "VSCode統合環境を起動中..."
    
    if [ ! -f "$WORKSPACE_FILE" ]; then
        print_error "ワークスペースファイルが見つかりません: $WORKSPACE_FILE"
        exit 1
    fi
    
    # バックグラウンドでVSCode起動
    print_info "マルチルートワークスペースを開いています..."
    code "$WORKSPACE_FILE" &
    
    # VSCode起動待機
    sleep 5
    
    print_success "VSCode起動完了"
}

# Claude Code拡張機能確認
check_claude_extension() {
    print_info "Claude Code拡張機能を確認中..."
    
    # 拡張機能リスト取得
    local extensions=$(code --list-extensions 2>/dev/null || echo "")
    
    if echo "$extensions" | grep -q "anthropic.claude-dev"; then
        print_success "Claude Code拡張機能が見つかりました"
    else
        print_warning "Claude Code拡張機能が見つかりません"
        print_info "Claude Code拡張機能をインストールしてください："
        print_info "1. VSCodeの拡張機能マーケットプレース"
        print_info "2. 'Claude Dev' で検索"
        print_info "3. Anthropic製の拡張機能をインストール"
        
        read -p "続行しますか？ (y/N): " continue_without_claude
        if [[ ! $continue_without_claude =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 開発環境情報表示
show_environment_info() {
    print_header
    echo ""
    echo "🚀 VSCode + Claude Code + tmux + Git Worktree 統合環境"
    echo ""
    echo "📁 プロジェクト: $PROJECT_ROOT"
    echo "🎛️  tmuxセッション: $SESSION_NAME"
    echo "💻 ワークスペース: itsm-worktrees.code-workspace"
    echo ""
    echo "🎯 利用可能なWorktree:"
    
    git worktree list | while read -r line; do
        if [[ $line == *"main"* ]]; then
            echo "   📂 Main Project (統合用)"
        elif [[ $line == *"feature-a-leader"* ]]; then
            echo "   🎯 Feature-A: 統合リーダー"
        elif [[ $line == *"feature-b-ui"* ]]; then
            echo "   🎨 Feature-B: UI/テスト"
        elif [[ $line == *"feature-c-api"* ]]; then
            echo "   🔧 Feature-C: API開発"
        elif [[ $line == *"feature-d-ps"* ]]; then
            echo "   💻 Feature-D: PowerShell"
        elif [[ $line == *"feature-e-nonfunc"* ]]; then
            echo "   🔒 Feature-E: 非機能要件"
        fi
    done
    
    echo ""
    echo "📋 次のステップ:"
    echo "1. VSCodeでClaude Codeを起動"
    echo "2. tmuxペインで各機能の並列開発開始"
    echo "3. 定期的なWorktree同期実行"
    echo "4. Feature-Aによる統合管理"
    echo ""
    echo "🔧 便利なコマンド:"
    echo "  tmux attach-session -t $SESSION_NAME  # tmuxセッションに接続"
    echo "  ./tmux/tools/sync-worktrees.sh       # Worktree同期"
    echo "  ./tmux/tools/merge-controller.sh     # 統合管理"
    echo ""
}

# tmuxセッションアタッチ
attach_tmux_session() {
    print_info "tmuxセッションに接続します..."
    echo ""
    print_info "🔄 tmux操作方法:"
    print_info "  Ctrl+b → 1~5: ペイン切り替え"
    print_info "  Ctrl+b → &: セッション終了"
    print_info "  Ctrl+b → d: セッションデタッチ"
    echo ""
    
    read -p "tmuxセッションにアタッチしますか？ (y/N): " attach_now
    if [[ $attach_now =~ ^[Yy]$ ]]; then
        print_success "tmuxセッションにアタッチします"
        tmux attach-session -t "$SESSION_NAME"
    else
        print_info "後でアタッチする場合: tmux attach-session -t $SESSION_NAME"
    fi
}

# メイン実行関数
main() {
    print_header
    print_info "VSCode + Claude Code + tmux統合開発環境を起動します..."
    echo ""
    
    # 環境チェック
    if ! check_environment; then
        print_warning "Worktree環境の初期化が必要です"
        read -p "Worktree環境を初期化しますか？ (y/N): " init_worktree
        if [[ $init_worktree =~ ^[Yy]$ ]]; then
            initialize_worktrees
        else
            print_error "Worktree環境なしでは統合開発できません"
            exit 1
        fi
    fi
    
    # tmuxセッションセットアップ
    setup_tmux_session
    
    # VSCode起動
    launch_vscode
    
    # Claude Code確認
    check_claude_extension
    
    # 情報表示
    show_environment_info
    
    # tmuxアタッチ選択
    attach_tmux_session
}

# ヘルプ表示
show_help() {
    echo "VSCode + tmux統合開発環境起動スクリプト"
    echo ""
    echo "使用方法:"
    echo "  $0                # 統合環境起動"
    echo "  $0 --vscode-only  # VSCodeのみ起動"
    echo "  $0 --tmux-only    # tmuxのみ起動"
    echo "  $0 --status       # 環境状況確認"
    echo "  $0 --help         # このヘルプ"
    echo ""
}

# コマンドライン引数処理
case "${1:-}" in
    "--vscode-only")
        check_environment || initialize_worktrees
        launch_vscode
        check_claude_extension
        ;;
    "--tmux-only")
        check_environment || initialize_worktrees
        setup_tmux_session
        attach_tmux_session
        ;;
    "--status")
        check_environment
        show_environment_info
        ;;
    "--help"|"-h")
        show_help
        ;;
    "")
        main
        ;;
    *)
        print_error "無効なオプション: $1"
        show_help
        exit 1
        ;;
esac