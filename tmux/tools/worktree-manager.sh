#!/bin/bash

# ITSM Platform - Git Worktree管理ツール
# 並列開発用worktree環境の管理

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKTREE_ROOT="$PROJECT_ROOT/worktrees"
TOOL_NAME="Git Worktree管理ツール"

# 色付きメッセージ関数
print_header() {
    echo -e "\033[1;36m========================================\033[0m"
    echo -e "\033[1;36m  $TOOL_NAME\033[0m"
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

# Worktree設定
declare -A WORKTREE_CONFIG=(
    ["feature-a-leader"]="統合リーダー・設計統一"
    ["feature-b-ui"]="UI/テスト自動修復"
    ["feature-c-api"]="API開発・テストループ"
    ["feature-d-ps"]="PowerShell API修復"
    ["feature-e-nonfunc"]="非機能要件・SLA/セキュリティ"
)

# worktree状態確認
check_worktree_status() {
    print_info "現在のWorktree状況を確認中..."
    
    cd "$PROJECT_ROOT"
    
    echo ""
    echo "=== Git Worktreeリスト ==="
    git worktree list
    echo ""
    
    echo "=== ブランチ一覧 ==="
    git branch -a
    echo ""
}

# 必要なブランチ作成
create_feature_branches() {
    print_info "Featureブランチを作成中..."
    
    cd "$PROJECT_ROOT"
    
    local main_branch="main"
    local current_commit=$(git rev-parse HEAD)
    
    for branch_name in "${!WORKTREE_CONFIG[@]}"; do
        if git show-ref --verify --quiet "refs/heads/$branch_name"; then
            print_warning "ブランチ '$branch_name' は既に存在します"
        else
            print_info "ブランチ '$branch_name' を作成中..."
            git branch "$branch_name" "$main_branch"
            print_success "ブランチ '$branch_name' を作成しました"
        fi
    done
}

# worktreeディレクトリ作成
create_worktree_directories() {
    print_info "Worktreeディレクトリを作成中..."
    
    # worktreeルートディレクトリ作成
    if [ ! -d "$WORKTREE_ROOT" ]; then
        mkdir -p "$WORKTREE_ROOT"
        print_success "Worktreeルートディレクトリを作成: $WORKTREE_ROOT"
    fi
    
    cd "$PROJECT_ROOT"
    
    for branch_name in "${!WORKTREE_CONFIG[@]}"; do
        local worktree_path="$WORKTREE_ROOT/$branch_name"
        local description="${WORKTREE_CONFIG[$branch_name]}"
        
        if [ -d "$worktree_path" ]; then
            print_warning "Worktree '$branch_name' は既に存在します"
        else
            print_info "Worktree '$branch_name' を作成中... ($description)"
            
            # worktree作成
            git worktree add "$worktree_path" "$branch_name"
            
            # .gitignore調整（worktree固有の設定）
            if [ -f "$worktree_path/.gitignore" ]; then
                echo "" >> "$worktree_path/.gitignore"
                echo "# Worktree固有の除外設定" >> "$worktree_path/.gitignore"
                echo ".vscode/settings.json" >> "$worktree_path/.gitignore"
                echo "*.log" >> "$worktree_path/.gitignore"
            fi
            
            print_success "Worktree '$branch_name' を作成しました"
        fi
    done
}

# worktree削除
remove_worktree() {
    local branch_name="$1"
    
    if [ -z "$branch_name" ]; then
        print_error "削除するworktree名を指定してください"
        return 1
    fi
    
    local worktree_path="$WORKTREE_ROOT/$branch_name"
    
    cd "$PROJECT_ROOT"
    
    if [ -d "$worktree_path" ]; then
        print_warning "Worktree '$branch_name' を削除します..."
        
        # worktree削除
        git worktree remove "$worktree_path" --force
        
        # ブランチ削除確認
        read -p "ブランチ '$branch_name' も削除しますか？ (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            git branch -D "$branch_name"
            print_success "ブランチ '$branch_name' を削除しました"
        fi
        
        print_success "Worktree '$branch_name' を削除しました"
    else
        print_error "Worktree '$branch_name' が見つかりません"
    fi
}

# 全worktree削除
remove_all_worktrees() {
    print_warning "全てのWorktreeを削除します..."
    
    read -p "本当に全てのworktreeを削除しますか？ (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        print_info "キャンセルしました"
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    
    for branch_name in "${!WORKTREE_CONFIG[@]}"; do
        local worktree_path="$WORKTREE_ROOT/$branch_name"
        
        if [ -d "$worktree_path" ]; then
            git worktree remove "$worktree_path" --force
            print_success "Worktree '$branch_name' を削除しました"
        fi
    done
    
    # worktreeルートディレクトリ削除
    if [ -d "$WORKTREE_ROOT" ] && [ -z "$(ls -A "$WORKTREE_ROOT")" ]; then
        rmdir "$WORKTREE_ROOT"
        print_success "Worktreeルートディレクトリを削除しました"
    fi
}

# worktree同期
sync_worktree() {
    local branch_name="$1"
    
    if [ -z "$branch_name" ]; then
        print_error "同期するworktree名を指定してください"
        return 1
    fi
    
    local worktree_path="$WORKTREE_ROOT/$branch_name"
    
    if [ ! -d "$worktree_path" ]; then
        print_error "Worktree '$branch_name' が見つかりません"
        return 1
    fi
    
    print_info "Worktree '$branch_name' を同期中..."
    
    cd "$worktree_path"
    
    # 現在の変更をステージング
    git add -A
    
    # 変更があるかチェック
    if git diff --cached --quiet; then
        print_info "変更がありません"
    else
        # 自動コミット
        local commit_message="Auto-commit from worktree-manager: $(date '+%Y-%m-%d %H:%M:%S')"
        git commit -m "$commit_message"
        print_success "変更をコミットしました"
    fi
    
    # リモートプッシュ
    if git push origin "$branch_name" 2>/dev/null; then
        print_success "リモートにプッシュしました"
    else
        # 初回プッシュの場合
        git push --set-upstream origin "$branch_name"
        print_success "ブランチを新規作成してプッシュしました"
    fi
}

# 全worktree同期
sync_all_worktrees() {
    print_info "全Worktreeを同期中..."
    
    for branch_name in "${!WORKTREE_CONFIG[@]}"; do
        local worktree_path="$WORKTREE_ROOT/$branch_name"
        
        if [ -d "$worktree_path" ]; then
            echo ""
            sync_worktree "$branch_name"
        fi
    done
    
    print_success "全Worktreeの同期が完了しました"
}

# mainブランチからの更新取り込み
update_from_main() {
    local branch_name="$1"
    
    if [ -z "$branch_name" ]; then
        print_error "更新するworktree名を指定してください"
        return 1
    fi
    
    local worktree_path="$WORKTREE_ROOT/$branch_name"
    
    if [ ! -d "$worktree_path" ]; then
        print_error "Worktree '$branch_name' が見つかりません"
        return 1
    fi
    
    print_info "Worktree '$branch_name' にmainブランチの更新を取り込み中..."
    
    # mainブランチ更新
    cd "$PROJECT_ROOT"
    git checkout main
    git pull origin main
    
    # worktreeで更新取り込み
    cd "$worktree_path"
    
    # 現在の変更を一時保存
    local has_changes=false
    if ! git diff --quiet; then
        git stash push -m "Temporary stash before merge from main"
        has_changes=true
        print_info "変更を一時保存しました"
    fi
    
    # mainからマージ
    if git merge main; then
        print_success "mainブランチからの更新を取り込みました"
        
        # 一時保存した変更を復元
        if [ "$has_changes" = true ]; then
            if git stash pop; then
                print_success "一時保存した変更を復元しました"
            else
                print_warning "変更の復元に失敗しました。手動で解決してください"
            fi
        fi
    else
        print_error "マージに失敗しました。競合を解決してください"
        return 1
    fi
}

# worktree情報表示
show_worktree_info() {
    print_info "Worktree詳細情報を表示中..."
    
    echo ""
    echo "=== プロジェクト情報 ==="
    echo "プロジェクトルート: $PROJECT_ROOT"
    echo "Worktreeルート: $WORKTREE_ROOT"
    echo ""
    
    echo "=== 設定済みWorktree ==="
    for branch_name in "${!WORKTREE_CONFIG[@]}"; do
        local description="${WORKTREE_CONFIG[$branch_name]}"
        local worktree_path="$WORKTREE_ROOT/$branch_name"
        local status="❌ 未作成"
        
        if [ -d "$worktree_path" ]; then
            status="✅ 作成済み"
            
            # 変更状況確認
            cd "$worktree_path"
            local uncommitted_changes=""
            if ! git diff --quiet; then
                uncommitted_changes=" (未コミット変更あり)"
            fi
            status="$status$uncommitted_changes"
        fi
        
        printf "%-20s | %-30s | %s\n" "$branch_name" "$description" "$status"
    done
    echo ""
    
    cd "$PROJECT_ROOT"
    echo "=== 現在のWorktreeリスト ==="
    git worktree list
    echo ""
}

# メニュー表示
show_menu() {
    echo ""
    echo "=== Worktree管理メニュー ==="
    echo "1. Worktree状況確認"
    echo "2. 全Worktree作成（初期セットアップ）"
    echo "3. 特定Worktree作成"
    echo "4. Worktree削除"
    echo "5. 全Worktree削除"
    echo "6. Worktree同期"
    echo "7. 全Worktree同期"
    echo "8. mainから更新取り込み"
    echo "9. Worktree詳細情報"
    echo "0. 終了"
    echo ""
}

# 初期セットアップ
initial_setup() {
    print_info "並列開発用Worktree環境の初期セットアップを開始します..."
    
    cd "$PROJECT_ROOT"
    
    # Git設定確認
    if [ ! -d ".git" ]; then
        print_error "Gitリポジトリが見つかりません"
        return 1
    fi
    
    # ブランチ作成
    create_feature_branches
    echo ""
    
    # Worktreeディレクトリ作成
    create_worktree_directories
    echo ""
    
    # 状況確認
    show_worktree_info
    
    print_success "🎉 Worktree環境の初期セットアップが完了しました！"
    echo ""
    print_info "📋 次のステップ:"
    echo "  1. VSCodeでマルチルートワークスペースを開く"
    echo "  2. tmux並列開発環境を起動: ./start-development.sh"
    echo "  3. 各ペインで独立した開発を開始"
}

# メイン実行関数
main() {
    print_header
    
    if [ $# -eq 0 ]; then
        # インタラクティブモード
        while true; do
            show_menu
            read -p "選択してください (0-9): " choice
            
            case $choice in
                1)
                    check_worktree_status
                    ;;
                2)
                    initial_setup
                    ;;
                3)
                    echo "利用可能なWorktree:"
                    for branch_name in "${!WORKTREE_CONFIG[@]}"; do
                        echo "  - $branch_name: ${WORKTREE_CONFIG[$branch_name]}"
                    done
                    read -p "作成するWorktree名を入力: " branch_name
                    if [[ -n "${WORKTREE_CONFIG[$branch_name]}" ]]; then
                        create_feature_branches
                        create_worktree_directories
                    else
                        print_error "無効なWorktree名です"
                    fi
                    ;;
                4)
                    read -p "削除するWorktree名を入力: " branch_name
                    remove_worktree "$branch_name"
                    ;;
                5)
                    remove_all_worktrees
                    ;;
                6)
                    read -p "同期するWorktree名を入力: " branch_name
                    sync_worktree "$branch_name"
                    ;;
                7)
                    sync_all_worktrees
                    ;;
                8)
                    read -p "更新するWorktree名を入力: " branch_name
                    update_from_main "$branch_name"
                    ;;
                9)
                    show_worktree_info
                    ;;
                0)
                    print_success "Worktree管理ツールを終了します"
                    exit 0
                    ;;
                *)
                    print_error "無効な選択です"
                    ;;
            esac
            
            echo ""
            read -p "Enterキーで続行..."
        done
    else
        # コマンドラインモード
        case "$1" in
            "init"|"setup")
                initial_setup
                ;;
            "status")
                check_worktree_status
                show_worktree_info
                ;;
            "sync")
                if [ -n "$2" ]; then
                    sync_worktree "$2"
                else
                    sync_all_worktrees
                fi
                ;;
            "update")
                if [ -n "$2" ]; then
                    update_from_main "$2"
                else
                    print_error "worktree名を指定してください"
                fi
                ;;
            "remove")
                if [ -n "$2" ]; then
                    remove_worktree "$2"
                else
                    print_error "削除するworktree名を指定してください"
                fi
                ;;
            "clean")
                remove_all_worktrees
                ;;
            *)
                echo "使用方法:"
                echo "  $0                    # インタラクティブモード"
                echo "  $0 init               # 初期セットアップ"
                echo "  $0 status             # 状況確認"
                echo "  $0 sync [branch]      # 同期（全体または個別）"
                echo "  $0 update [branch]    # mainから更新取り込み"
                echo "  $0 remove [branch]    # worktree削除"
                echo "  $0 clean              # 全worktree削除"
                ;;
        esac
    fi
}

# スクリプト実行
main "$@"