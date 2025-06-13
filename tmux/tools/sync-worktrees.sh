#!/bin/bash

# ITSM Platform - Worktree自動同期ツール
# 並列開発中のworktree間自動同期

set -e

PROJECT_ROOT="/mnt/e/ServiceGrid"
WORKTREE_ROOT="$PROJECT_ROOT/worktrees"
SYNC_LOG_DIR="$PROJECT_ROOT/logs/worktree-sync"
TOOL_NAME="Worktree自動同期ツール"

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

# ログ機能
setup_logging() {
    mkdir -p "$SYNC_LOG_DIR"
    local timestamp=$(date '+%Y%m%d-%H%M%S')
    SYNC_LOG_FILE="$SYNC_LOG_DIR/sync-$timestamp.log"
    
    print_info "同期ログ: $SYNC_LOG_FILE"
    echo "=== Worktree同期ログ ===" > "$SYNC_LOG_FILE"
    echo "開始日時: $(date)" >> "$SYNC_LOG_FILE"
    echo "" >> "$SYNC_LOG_FILE"
}

log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] [$level] $message" >> "$SYNC_LOG_FILE"
}

# Worktree設定
declare -A WORKTREE_CONFIG=(
    ["feature-a-leader"]="統合リーダー・設計統一"
    ["feature-b-ui"]="UI/テスト自動修復"
    ["feature-c-api"]="API開発・テストループ"
    ["feature-d-ps"]="PowerShell API修復"
    ["feature-e-nonfunc"]="非機能要件・SLA/セキュリティ"
)

# Worktree存在確認
check_worktree_exists() {
    local branch_name="$1"
    local worktree_path="$WORKTREE_ROOT/$branch_name"
    
    if [ ! -d "$worktree_path" ]; then
        print_error "Worktree '$branch_name' が見つかりません: $worktree_path"
        log_message "ERROR" "Worktree not found: $branch_name"
        return 1
    fi
    
    return 0
}

# Git状態チェック
check_git_status() {
    local branch_name="$1"
    local worktree_path="$WORKTREE_ROOT/$branch_name"
    
    cd "$worktree_path"
    
    local status_output=$(git status --porcelain)
    local uncommitted_count=$(echo "$status_output" | wc -l)
    
    if [ -n "$status_output" ]; then
        print_info "$branch_name: $uncommitted_count 個の変更があります"
        log_message "INFO" "$branch_name: $uncommitted_count changes detected"
        return 1
    fi
    
    return 0
}

# 自動コミット実行
auto_commit() {
    local branch_name="$1"
    local worktree_path="$WORKTREE_ROOT/$branch_name"
    local commit_message="$2"
    
    cd "$worktree_path"
    
    # ステージング
    git add -A
    
    # 変更があるかチェック
    if git diff --cached --quiet; then
        log_message "INFO" "$branch_name: No changes to commit"
        return 0
    fi
    
    # コミット実行
    if [ -z "$commit_message" ]; then
        commit_message="Auto-sync: $(date '+%Y-%m-%d %H:%M:%S')"
    fi
    
    if git commit -m "$commit_message"; then
        print_success "$branch_name: 自動コミット完了"
        log_message "SUCCESS" "$branch_name: Auto-commit successful"
        return 0
    else
        print_error "$branch_name: コミットに失敗しました"
        log_message "ERROR" "$branch_name: Commit failed"
        return 1
    fi
}

# リモート同期
sync_to_remote() {
    local branch_name="$1"
    local worktree_path="$WORKTREE_ROOT/$branch_name"
    
    cd "$worktree_path"
    
    # リモートにプッシュ
    if git push origin "$branch_name" 2>/dev/null; then
        print_success "$branch_name: リモート同期完了"
        log_message "SUCCESS" "$branch_name: Remote sync successful"
        return 0
    elif git push --set-upstream origin "$branch_name" 2>/dev/null; then
        print_success "$branch_name: 新規ブランチとしてリモート作成"
        log_message "SUCCESS" "$branch_name: New remote branch created"
        return 0
    else
        print_error "$branch_name: リモート同期に失敗しました"
        log_message "ERROR" "$branch_name: Remote sync failed"
        return 1
    fi
}

# リモートから更新取得
fetch_from_remote() {
    local branch_name="$1"
    local worktree_path="$WORKTREE_ROOT/$branch_name"
    
    cd "$worktree_path"
    
    # リモートから取得
    if git fetch origin "$branch_name" 2>/dev/null; then
        # Fast-forwardマージ可能かチェック
        local local_commit=$(git rev-parse HEAD)
        local remote_commit=$(git rev-parse "origin/$branch_name" 2>/dev/null || echo "")
        
        if [ -n "$remote_commit" ] && [ "$local_commit" != "$remote_commit" ]; then
            # マージ実行
            if git merge "origin/$branch_name" --ff-only 2>/dev/null; then
                print_success "$branch_name: リモートから更新を取得"
                log_message "SUCCESS" "$branch_name: Remote updates merged"
            else
                print_warning "$branch_name: 競合のため手動マージが必要です"
                log_message "WARNING" "$branch_name: Manual merge required due to conflicts"
            fi
        fi
    fi
}

# 個別Worktree同期
sync_single_worktree() {
    local branch_name="$1"
    local auto_commit_flag="$2"
    
    print_info "Worktree '$branch_name' を同期中..."
    
    if ! check_worktree_exists "$branch_name"; then
        return 1
    fi
    
    local worktree_path="$WORKTREE_ROOT/$branch_name"
    local description="${WORKTREE_CONFIG[$branch_name]}"
    
    echo "  📁 パス: $worktree_path"
    echo "  📝 説明: $description"
    
    cd "$worktree_path"
    
    # リモートから更新取得
    fetch_from_remote "$branch_name"
    
    # 未コミット変更の処理
    if ! check_git_status "$branch_name"; then
        if [ "$auto_commit_flag" = "true" ]; then
            auto_commit "$branch_name"
        else
            print_warning "$branch_name: 未コミットの変更があります"
            log_message "WARNING" "$branch_name: Uncommitted changes detected"
            return 1
        fi
    fi
    
    # リモート同期
    sync_to_remote "$branch_name"
    
    echo ""
}

# 全Worktree同期
sync_all_worktrees() {
    local auto_commit_flag="$1"
    
    print_info "全Worktreeの同期を開始します..."
    echo ""
    
    local success_count=0
    local fail_count=0
    
    for branch_name in "${!WORKTREE_CONFIG[@]}"; do
        if sync_single_worktree "$branch_name" "$auto_commit_flag"; then
            ((success_count++))
        else
            ((fail_count++))
        fi
    done
    
    echo "=== 同期結果 ==="
    print_success "成功: $success_count 個のWorktree"
    if [ $fail_count -gt 0 ]; then
        print_error "失敗: $fail_count 個のWorktree"
    fi
    
    log_message "SUMMARY" "Sync completed: $success_count success, $fail_count failed"
}

# 競合解決支援
resolve_conflicts() {
    local branch_name="$1"
    
    if ! check_worktree_exists "$branch_name"; then
        return 1
    fi
    
    local worktree_path="$WORKTREE_ROOT/$branch_name"
    
    cd "$worktree_path"
    
    print_info "$branch_name: 競合状況を確認中..."
    
    # 競合ファイル確認
    local conflict_files=$(git diff --name-only --diff-filter=U 2>/dev/null || echo "")
    
    if [ -z "$conflict_files" ]; then
        print_success "$branch_name: 競合は検出されませんでした"
        return 0
    fi
    
    print_warning "$branch_name: 以下のファイルで競合が発生しています:"
    echo "$conflict_files" | while read -r file; do
        echo "  - $file"
    done
    
    echo ""
    echo "競合解決手順:"
    echo "1. cd $worktree_path"
    echo "2. 競合ファイルを手動編集"
    echo "3. git add <解決済みファイル>"
    echo "4. git commit"
    echo "5. このスクリプトを再実行"
    
    log_message "WARNING" "$branch_name: Conflicts detected in files: $conflict_files"
}

# 同期状況レポート
generate_sync_report() {
    print_info "同期状況レポートを生成中..."
    
    local report_file="$SYNC_LOG_DIR/sync-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Worktree同期状況レポート

## 実行日時
$(date '+%Y年%m月%d日 %H:%M:%S')

## Worktree状況

EOF
    
    for branch_name in "${!WORKTREE_CONFIG[@]}"; do
        local description="${WORKTREE_CONFIG[$branch_name]}"
        local worktree_path="$WORKTREE_ROOT/$branch_name"
        
        echo "### $branch_name" >> "$report_file"
        echo "- **説明**: $description" >> "$report_file"
        echo "- **パス**: $worktree_path" >> "$report_file"
        
        if [ -d "$worktree_path" ]; then
            cd "$worktree_path"
            
            local last_commit=$(git log -1 --format="%h %s" 2>/dev/null || echo "N/A")
            local uncommitted_count=$(git status --porcelain | wc -l)
            local branch_status="同期済み"
            
            if [ $uncommitted_count -gt 0 ]; then
                branch_status="未コミット変更あり ($uncommitted_count ファイル)"
            fi
            
            echo "- **最新コミット**: $last_commit" >> "$report_file"
            echo "- **ステータス**: $branch_status" >> "$report_file"
        else
            echo "- **ステータス**: ❌ Worktree未作成" >> "$report_file"
        fi
        
        echo "" >> "$report_file"
    done
    
    cat >> "$report_file" << EOF
## Git Worktree一覧

\`\`\`
$(cd "$PROJECT_ROOT" && git worktree list)
\`\`\`

## 推奨事項

- 未コミット変更があるWorktreeは定期的にコミットしてください
- 競合が発生した場合は手動で解決してください
- 定期的にmainブランチからの更新を取り込んでください

---
自動生成レポート
EOF
    
    print_success "レポート生成完了: $report_file"
}

# 監視モード（デーモン）
daemon_mode() {
    local interval="$1"
    
    if [ -z "$interval" ]; then
        interval=300  # 5分間隔
    fi
    
    print_info "監視モードを開始します（間隔: ${interval}秒）"
    print_info "停止するには Ctrl+C を押してください"
    
    local daemon_log="$SYNC_LOG_DIR/daemon-$(date +%Y%m%d-%H%M%S).log"
    
    while true; do
        echo "$(date '+%Y-%m-%d %H:%M:%S') - 自動同期実行中..." >> "$daemon_log"
        
        # 自動コミット付きで同期実行
        if sync_all_worktrees "true" >> "$daemon_log" 2>&1; then
            echo "$(date '+%Y-%m-%d %H:%M:%S') - 自動同期完了" >> "$daemon_log"
        else
            echo "$(date '+%Y-%m-%d %H:%M:%S') - 自動同期でエラーが発生" >> "$daemon_log"
        fi
        
        sleep "$interval"
    done
}

# メニュー表示
show_menu() {
    echo ""
    echo "=== Worktree同期メニュー ==="
    echo "1. 全Worktree同期（手動コミット）"
    echo "2. 全Worktree同期（自動コミット）"
    echo "3. 個別Worktree同期"
    echo "4. 競合解決支援"
    echo "5. 同期状況レポート生成"
    echo "6. 監視モード開始"
    echo "7. 同期ログ表示"
    echo "0. 終了"
    echo ""
}

# ログ表示
show_logs() {
    if [ -d "$SYNC_LOG_DIR" ]; then
        print_info "最新の同期ログ:"
        local latest_log=$(ls -t "$SYNC_LOG_DIR"/*.log 2>/dev/null | head -1)
        
        if [ -n "$latest_log" ]; then
            echo "📄 $latest_log"
            echo ""
            tail -20 "$latest_log"
        else
            print_info "同期ログが見つかりません"
        fi
    else
        print_info "ログディレクトリが見つかりません"
    fi
}

# メイン実行関数
main() {
    print_header
    setup_logging
    
    if [ $# -eq 0 ]; then
        # インタラクティブモード
        while true; do
            show_menu
            read -p "選択してください (0-7): " choice
            
            case $choice in
                1)
                    sync_all_worktrees "false"
                    ;;
                2)
                    sync_all_worktrees "true"
                    ;;
                3)
                    echo "利用可能なWorktree:"
                    for branch_name in "${!WORKTREE_CONFIG[@]}"; do
                        echo "  - $branch_name: ${WORKTREE_CONFIG[$branch_name]}"
                    done
                    read -p "同期するWorktree名を入力: " branch_name
                    if [[ -n "${WORKTREE_CONFIG[$branch_name]}" ]]; then
                        read -p "自動コミットしますか？ (y/N): " auto_commit
                        local auto_flag="false"
                        [[ $auto_commit =~ ^[Yy]$ ]] && auto_flag="true"
                        sync_single_worktree "$branch_name" "$auto_flag"
                    else
                        print_error "無効なWorktree名です"
                    fi
                    ;;
                4)
                    read -p "競合解決するWorktree名を入力: " branch_name
                    resolve_conflicts "$branch_name"
                    ;;
                5)
                    generate_sync_report
                    ;;
                6)
                    read -p "監視間隔（秒、デフォルト300）: " interval
                    daemon_mode "$interval"
                    ;;
                7)
                    show_logs
                    ;;
                0)
                    print_success "Worktree同期ツールを終了します"
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
            "sync")
                if [ -n "$2" ]; then
                    sync_single_worktree "$2" "${3:-false}"
                else
                    sync_all_worktrees "${2:-false}"
                fi
                ;;
            "auto-sync")
                sync_all_worktrees "true"
                ;;
            "conflicts")
                if [ -n "$2" ]; then
                    resolve_conflicts "$2"
                else
                    print_error "Worktree名を指定してください"
                fi
                ;;
            "report")
                generate_sync_report
                ;;
            "daemon")
                daemon_mode "$2"
                ;;
            "logs")
                show_logs
                ;;
            *)
                echo "使用方法:"
                echo "  $0                           # インタラクティブモード"
                echo "  $0 sync [branch] [auto]      # 同期実行"
                echo "  $0 auto-sync                 # 自動コミット付き同期"
                echo "  $0 conflicts [branch]        # 競合解決支援"
                echo "  $0 report                    # レポート生成"
                echo "  $0 daemon [interval]         # 監視モード"
                echo "  $0 logs                      # ログ表示"
                ;;
        esac
    fi
}

# スクリプト実行
main "$@"