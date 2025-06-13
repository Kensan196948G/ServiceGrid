#!/bin/bash

# ITSM Platform - 統合マージコントローラー
# Feature-A統合リーダーによるブランチ統合管理

set -e

PROJECT_ROOT="/mnt/e/ServiceGrid"
WORKTREE_ROOT="$PROJECT_ROOT/worktrees"
MERGE_LOG_DIR="$PROJECT_ROOT/logs/merge-control"
TOOL_NAME="統合マージコントローラー"

# 色付きメッセージ関数
print_header() {
    echo -e "\033[1;35m========================================\033[0m"
    echo -e "\033[1;35m  $TOOL_NAME\033[0m"
    echo -e "\033[1;35m========================================\033[0m"
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
    mkdir -p "$MERGE_LOG_DIR"
    local timestamp=$(date '+%Y%m%d-%H%M%S')
    MERGE_LOG_FILE="$MERGE_LOG_DIR/merge-$timestamp.log"
    
    print_info "マージログ: $MERGE_LOG_FILE"
    echo "=== 統合マージログ ===" > "$MERGE_LOG_FILE"
    echo "開始日時: $(date)" >> "$MERGE_LOG_FILE"
    echo "" >> "$MERGE_LOG_FILE"
}

log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] [$level] $message" >> "$MERGE_LOG_FILE"
}

# Worktree設定（統合順序定義）
declare -A WORKTREE_CONFIG=(
    ["feature-b-ui"]="UI/テスト自動修復"
    ["feature-c-api"]="API開発・テストループ"
    ["feature-d-ps"]="PowerShell API修復"
    ["feature-e-nonfunc"]="非機能要件・SLA/セキュリティ"
)

# マージ優先度順序（低リスクから高リスクへ）
MERGE_ORDER=(
    "feature-e-nonfunc"    # 非機能要件（独立性が高い）
    "feature-d-ps"         # PowerShell（バックエンド独立）
    "feature-c-api"        # API開発（バックエンドコア）
    "feature-b-ui"         # UI/テスト（フロントエンド）
)

# 統合前チェック
pre_merge_check() {
    local branch_name="$1"
    local worktree_path="$WORKTREE_ROOT/$branch_name"
    
    print_info "$branch_name: 統合前チェックを実行中..."
    
    if [ ! -d "$worktree_path" ]; then
        print_error "$branch_name: Worktreeが見つかりません"
        log_message "ERROR" "$branch_name: Worktree not found"
        return 1
    fi
    
    cd "$worktree_path"
    
    # 未コミット変更チェック
    if ! git diff --quiet; then
        print_error "$branch_name: 未コミットの変更があります"
        log_message "ERROR" "$branch_name: Uncommitted changes detected"
        return 1
    fi
    
    # ステージング変更チェック
    if ! git diff --cached --quiet; then
        print_error "$branch_name: ステージングされた変更があります"
        log_message "ERROR" "$branch_name: Staged changes detected"
        return 1
    fi
    
    # リモート同期チェック
    git fetch origin "$branch_name" 2>/dev/null || true
    local local_commit=$(git rev-parse HEAD)
    local remote_commit=$(git rev-parse "origin/$branch_name" 2>/dev/null || echo "")
    
    if [ -n "$remote_commit" ] && [ "$local_commit" != "$remote_commit" ]; then
        print_warning "$branch_name: リモートとの差分があります"
        log_message "WARNING" "$branch_name: Local and remote commits differ"
        return 2
    fi
    
    print_success "$branch_name: 統合前チェック完了"
    log_message "SUCCESS" "$branch_name: Pre-merge check passed"
    return 0
}

# テスト実行
run_integration_tests() {
    local test_scope="$1"  # "quick" or "full"
    
    print_info "統合テストを実行中（スコープ: $test_scope）..."
    
    cd "$PROJECT_ROOT"
    
    local test_script="$PROJECT_ROOT/tmux/tools/test-runner.sh"
    local test_results=""
    
    case $test_scope in
        "quick")
            print_info "クイックテスト実行..."
            if [ -f "$test_script" ]; then
                test_results=$(bash "$test_script" quick 2>&1 || echo "FAILED")
            else
                print_warning "テストスクリプトが見つかりません"
                return 0
            fi
            ;;
        "full")
            print_info "フルテスト実行..."
            if [ -f "$test_script" ]; then
                test_results=$(bash "$test_script" 2>&1 || echo "FAILED")
            else
                print_warning "テストスクリプトが見つかりません"
                return 0
            fi
            ;;
        *)
            print_info "テストをスキップします"
            return 0
            ;;
    esac
    
    if echo "$test_results" | grep -q "FAILED"; then
        print_error "統合テストが失敗しました"
        log_message "ERROR" "Integration tests failed"
        echo "$test_results" >> "$MERGE_LOG_FILE"
        return 1
    else
        print_success "統合テスト完了"
        log_message "SUCCESS" "Integration tests passed"
        return 0
    fi
}

# 個別ブランチマージ
merge_single_branch() {
    local branch_name="$1"
    local target_branch="$2"
    local merge_strategy="$3"
    
    if [ -z "$target_branch" ]; then
        target_branch="main"
    fi
    
    if [ -z "$merge_strategy" ]; then
        merge_strategy="merge"  # "merge" or "squash"
    fi
    
    print_info "$branch_name → $target_branch へのマージを開始..."
    
    # 統合前チェック
    local check_result
    pre_merge_check "$branch_name"
    check_result=$?
    
    case $check_result in
        1)
            print_error "統合前チェックに失敗しました"
            return 1
            ;;
        2)
            print_warning "警告がありますが、続行します"
            ;;
    esac
    
    # ターゲットブランチに移動
    cd "$PROJECT_ROOT"
    git checkout "$target_branch"
    
    # ターゲットブランチを最新に更新
    if git pull origin "$target_branch" 2>/dev/null; then
        print_info "$target_branch ブランチを最新に更新しました"
    fi
    
    # マージ実行
    local merge_message="Merge $branch_name: $(date '+%Y-%m-%d %H:%M:%S')"
    
    case $merge_strategy in
        "squash")
            print_info "Squashマージを実行中..."
            if git merge --squash "$branch_name"; then
                git commit -m "$merge_message

統合内容:
- ブランチ: $branch_name
- 説明: ${WORKTREE_CONFIG[$branch_name]}
- 戦略: Squash merge
- 実行者: 統合マージコントローラー

🤖 Generated with Claude Code"
                print_success "$branch_name のSquashマージが完了しました"
                log_message "SUCCESS" "$branch_name: Squash merge completed"
            else
                print_error "$branch_name のSquashマージに失敗しました"
                log_message "ERROR" "$branch_name: Squash merge failed"
                return 1
            fi
            ;;
        "merge")
            print_info "通常マージを実行中..."
            if git merge "$branch_name" -m "$merge_message"; then
                print_success "$branch_name のマージが完了しました"
                log_message "SUCCESS" "$branch_name: Regular merge completed"
            else
                print_error "$branch_name のマージに失敗しました（競合の可能性）"
                log_message "ERROR" "$branch_name: Regular merge failed (possible conflicts)"
                return 1
            fi
            ;;
    esac
    
    return 0
}

# 段階的統合実行
staged_integration() {
    local target_branch="$1"
    local merge_strategy="$2"
    local test_level="$3"
    
    if [ -z "$target_branch" ]; then
        target_branch="main"
    fi
    
    if [ -z "$merge_strategy" ]; then
        merge_strategy="merge"
    fi
    
    if [ -z "$test_level" ]; then
        test_level="quick"
    fi
    
    print_info "段階的統合を開始します..."
    print_info "ターゲット: $target_branch, 戦略: $merge_strategy, テスト: $test_level"
    echo ""
    
    local success_count=0
    local fail_count=0
    local merged_branches=()
    
    # マージ順序に従って統合
    for branch_name in "${MERGE_ORDER[@]}"; do
        local worktree_path="$WORKTREE_ROOT/$branch_name"
        
        if [ ! -d "$worktree_path" ]; then
            print_warning "$branch_name: Worktreeが存在しないためスキップ"
            continue
        fi
        
        echo "🔄 [$((success_count + fail_count + 1))/${#MERGE_ORDER[@]}] $branch_name を統合中..."
        echo "   説明: ${WORKTREE_CONFIG[$branch_name]}"
        
        # 個別マージ実行
        if merge_single_branch "$branch_name" "$target_branch" "$merge_strategy"; then
            ((success_count++))
            merged_branches+=("$branch_name")
            
            # 統合後テスト実行
            if [ "$test_level" != "none" ]; then
                echo ""
                print_info "統合後テストを実行中..."
                
                if run_integration_tests "$test_level"; then
                    print_success "統合後テスト完了"
                else
                    print_error "統合後テストに失敗しました"
                    print_warning "統合を中止し、ロールバックを推奨します"
                    log_message "ERROR" "Post-merge tests failed for $branch_name"
                    
                    # ロールバック確認
                    read -p "ロールバックしますか？ (y/N): " rollback_confirm
                    if [[ $rollback_confirm =~ ^[Yy]$ ]]; then
                        rollback_last_merge "$target_branch"
                        return 1
                    fi
                fi
            fi
        else
            ((fail_count++))
            print_error "$branch_name の統合に失敗しました"
            
            # 競合解決の案内
            show_conflict_resolution_guide "$branch_name" "$target_branch"
            
            read -p "統合を続行しますか？ (y/N): " continue_confirm
            if [[ ! $continue_confirm =~ ^[Yy]$ ]]; then
                print_warning "統合を中止しました"
                break
            fi
        fi
        
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
    done
    
    # 統合結果サマリー
    echo "=== 段階的統合結果 ==="
    print_success "成功: $success_count ブランチ"
    if [ $fail_count -gt 0 ]; then
        print_error "失敗: $fail_count ブランチ"
    fi
    
    if [ ${#merged_branches[@]} -gt 0 ]; then
        print_info "統合済みブランチ: ${merged_branches[*]}"
        
        # 最終統合テスト
        if [ "$test_level" = "full" ]; then
            echo ""
            print_info "最終統合テストを実行中..."
            run_integration_tests "full"
        fi
        
        # リモートプッシュ確認
        echo ""
        read -p "統合結果をリモートにプッシュしますか？ (y/N): " push_confirm
        if [[ $push_confirm =~ ^[Yy]$ ]]; then
            cd "$PROJECT_ROOT"
            if git push origin "$target_branch"; then
                print_success "リモートプッシュ完了"
            else
                print_error "リモートプッシュに失敗しました"
            fi
        fi
    fi
    
    log_message "SUMMARY" "Staged integration completed: $success_count success, $fail_count failed"
}

# ロールバック機能
rollback_last_merge() {
    local target_branch="$1"
    
    if [ -z "$target_branch" ]; then
        target_branch="main"
    fi
    
    cd "$PROJECT_ROOT"
    git checkout "$target_branch"
    
    print_warning "最後のマージをロールバックします..."
    
    # 最後のマージコミットを確認
    local last_commit=$(git log -1 --merges --format="%H %s")
    
    if [ -z "$last_commit" ]; then
        print_error "ロールバック可能なマージコミットが見つかりません"
        return 1
    fi
    
    print_info "ロールバック対象: $last_commit"
    
    read -p "本当にロールバックしますか？ (y/N): " confirm
    if [[ $confirm =~ ^[Yy]$ ]]; then
        if git reset --hard HEAD~1; then
            print_success "ロールバック完了"
            log_message "SUCCESS" "Rollback completed for: $last_commit"
        else
            print_error "ロールバックに失敗しました"
            log_message "ERROR" "Rollback failed for: $last_commit"
        fi
    else
        print_info "ロールバックをキャンセルしました"
    fi
}

# 競合解決ガイド
show_conflict_resolution_guide() {
    local branch_name="$1"
    local target_branch="$2"
    
    echo ""
    echo "🚨 競合解決ガイド"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "ブランチ '$branch_name' と '$target_branch' で競合が発生しました。"
    echo ""
    echo "📋 手動解決手順:"
    echo "1. 競合ファイルを確認:"
    echo "   git status"
    echo ""
    echo "2. 競合ファイルを編集:"
    echo "   # <<<<<<< HEAD と >>>>>>> $branch_name の間を手動編集"
    echo ""
    echo "3. 解決済みファイルをステージング:"
    echo "   git add <解決済みファイル>"
    echo ""
    echo "4. マージコミット:"
    echo "   git commit"
    echo ""
    echo "5. このスクリプトを再実行"
    echo ""
    
    # 競合ファイル表示
    local conflict_files=$(git diff --name-only --diff-filter=U 2>/dev/null || echo "")
    if [ -n "$conflict_files" ]; then
        echo "⚠️  競合ファイル:"
        echo "$conflict_files" | while read -r file; do
            echo "   - $file"
        done
        echo ""
    fi
}

# マージ状況レポート
generate_merge_report() {
    print_info "マージ状況レポートを生成中..."
    
    local report_file="$MERGE_LOG_DIR/merge-report-$(date +%Y%m%d-%H%M%S).md"
    
    cd "$PROJECT_ROOT"
    
    cat > "$report_file" << EOF
# 統合マージレポート

## 実行日時
$(date '+%Y年%m月%d日 %H:%M:%S')

## プロジェクト情報
- プロジェクトルート: $PROJECT_ROOT
- 現在のブランチ: $(git branch --show-current)
- 最新コミット: $(git log -1 --format="%h %s")

## Worktree状況

EOF
    
    # 各Worktreeの状況
    for branch_name in "${MERGE_ORDER[@]}"; do
        local description="${WORKTREE_CONFIG[$branch_name]}"
        local worktree_path="$WORKTREE_ROOT/$branch_name"
        
        echo "### $branch_name" >> "$report_file"
        echo "- **説明**: $description" >> "$report_file"
        
        if [ -d "$worktree_path" ]; then
            cd "$worktree_path"
            
            local last_commit=$(git log -1 --format="%h %s" 2>/dev/null || echo "N/A")
            local ahead_behind=$(git rev-list --left-right --count "main...$branch_name" 2>/dev/null || echo "N/A N/A")
            local status="✅ 準備完了"
            
            if ! git diff --quiet; then
                status="⚠️ 未コミット変更あり"
            elif ! git diff --cached --quiet; then
                status="⚠️ ステージング変更あり"
            fi
            
            echo "- **最新コミット**: $last_commit" >> "$report_file"
            echo "- **mainとの差分**: $ahead_behind" >> "$report_file"
            echo "- **統合準備状況**: $status" >> "$report_file"
        else
            echo "- **状況**: ❌ Worktree未作成" >> "$report_file"
        fi
        
        echo "" >> "$report_file"
    done
    
    cd "$PROJECT_ROOT"
    
    cat >> "$report_file" << EOF
## マージ履歴（直近10件）

\`\`\`
$(git log --merges --oneline -10)
\`\`\`

## 推奨マージ順序

EOF
    
    for i in "${!MERGE_ORDER[@]}"; do
        local branch_name="${MERGE_ORDER[$i]}"
        local description="${WORKTREE_CONFIG[$branch_name]}"
        echo "$((i+1)). **$branch_name** - $description" >> "$report_file"
    done
    
    cat >> "$report_file" << EOF

## 統合チェックリスト

- [ ] 全Worktreeの変更がコミット済み
- [ ] リモートとの同期完了
- [ ] 統合前テスト実行
- [ ] 段階的マージ実行
- [ ] 統合後テスト実行
- [ ] リモートプッシュ

## 使用コマンド

\`\`\`bash
# 段階的統合実行
./tmux/tools/merge-controller.sh integrate

# 個別ブランチマージ
./tmux/tools/merge-controller.sh merge [branch-name]

# ロールバック
./tmux/tools/merge-controller.sh rollback
\`\`\`

---
統合マージコントローラーによる自動生成レポート
EOF
    
    print_success "レポート生成完了: $report_file"
}

# メニュー表示
show_menu() {
    echo ""
    echo "=== 統合マージメニュー ==="
    echo "1. マージ状況確認"
    echo "2. 段階的統合実行"
    echo "3. 個別ブランチマージ"
    echo "4. ロールバック"
    echo "5. 競合解決ガイド"
    echo "6. 統合テスト実行"
    echo "7. マージレポート生成"
    echo "8. マージログ表示"
    echo "0. 終了"
    echo ""
}

# ログ表示
show_logs() {
    if [ -d "$MERGE_LOG_DIR" ]; then
        print_info "最新のマージログ:"
        local latest_log=$(ls -t "$MERGE_LOG_DIR"/*.log 2>/dev/null | head -1)
        
        if [ -n "$latest_log" ]; then
            echo "📄 $latest_log"
            echo ""
            tail -30 "$latest_log"
        else
            print_info "マージログが見つかりません"
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
            read -p "選択してください (0-8): " choice
            
            case $choice in
                1)
                    generate_merge_report
                    ;;
                2)
                    echo "統合設定:"
                    read -p "ターゲットブランチ (デフォルト: main): " target
                    target=${target:-main}
                    
                    echo "マージ戦略: 1) merge  2) squash"
                    read -p "選択 (1-2, デフォルト: 1): " strategy_choice
                    case $strategy_choice in
                        2) strategy="squash" ;;
                        *) strategy="merge" ;;
                    esac
                    
                    echo "テストレベル: 1) quick  2) full  3) none"
                    read -p "選択 (1-3, デフォルト: 1): " test_choice
                    case $test_choice in
                        2) test_level="full" ;;
                        3) test_level="none" ;;
                        *) test_level="quick" ;;
                    esac
                    
                    staged_integration "$target" "$strategy" "$test_level"
                    ;;
                3)
                    echo "利用可能なブランチ:"
                    for branch_name in "${MERGE_ORDER[@]}"; do
                        echo "  - $branch_name: ${WORKTREE_CONFIG[$branch_name]}"
                    done
                    read -p "マージするブランチ名: " branch
                    read -p "ターゲットブランチ (デフォルト: main): " target
                    target=${target:-main}
                    merge_single_branch "$branch" "$target"
                    ;;
                4)
                    read -p "ロールバックするブランチ (デフォルト: main): " target
                    target=${target:-main}
                    rollback_last_merge "$target"
                    ;;
                5)
                    read -p "競合解決するブランチ名: " branch
                    read -p "ターゲットブランチ (デフォルト: main): " target
                    target=${target:-main}
                    show_conflict_resolution_guide "$branch" "$target"
                    ;;
                6)
                    echo "テストレベル: 1) quick  2) full"
                    read -p "選択 (1-2): " test_choice
                    case $test_choice in
                        2) run_integration_tests "full" ;;
                        *) run_integration_tests "quick" ;;
                    esac
                    ;;
                7)
                    generate_merge_report
                    ;;
                8)
                    show_logs
                    ;;
                0)
                    print_success "統合マージコントローラーを終了します"
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
            "integrate"|"stage")
                staged_integration "${2:-main}" "${3:-merge}" "${4:-quick}"
                ;;
            "merge")
                if [ -n "$2" ]; then
                    merge_single_branch "$2" "${3:-main}" "${4:-merge}"
                else
                    print_error "マージするブランチ名を指定してください"
                fi
                ;;
            "rollback")
                rollback_last_merge "${2:-main}"
                ;;
            "test")
                run_integration_tests "${2:-quick}"
                ;;
            "report")
                generate_merge_report
                ;;
            "logs")
                show_logs
                ;;
            *)
                echo "使用方法:"
                echo "  $0                                    # インタラクティブモード"
                echo "  $0 integrate [target] [strategy] [test] # 段階的統合"
                echo "  $0 merge [branch] [target] [strategy]   # 個別マージ"
                echo "  $0 rollback [target]                    # ロールバック"
                echo "  $0 test [level]                         # テスト実行"
                echo "  $0 report                               # レポート生成"
                echo "  $0 logs                                 # ログ表示"
                ;;
        esac
    fi
}

# スクリプト実行
main "$@"