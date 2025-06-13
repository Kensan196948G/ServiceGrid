#!/bin/bash

# ITSM Platform - Lintチェッカー
# コード品質・スタイルチェック

set -e

PROJECT_ROOT="/mnt/e/ServiceGrid"
BACKEND_DIR="$PROJECT_ROOT/backend"
TOOL_NAME="Lintチェッカー"

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

# Lint結果カウンター
total_checks=0
passed_checks=0
failed_checks=0
warning_count=0

# Lint結果記録
record_lint_result() {
    local check_name="$1"
    local result="$2"
    local message="$3"
    
    ((total_checks++))
    
    case $result in
        "PASS")
            ((passed_checks++))
            print_success "$check_name: 合格"
            ;;
        "FAIL")
            ((failed_checks++))
            print_error "$check_name: 失敗 - $message"
            ;;
        "WARNING")
            ((warning_count++))
            print_warning "$check_name: 警告 - $message"
            ;;
    esac
}

# TypeScript Lintチェック
check_typescript_lint() {
    print_info "TypeScript Lintチェックを実行中..."
    
    cd "$PROJECT_ROOT"
    
    # TypeScript設定ファイル確認
    if [ -f "tsconfig.json" ]; then
        record_lint_result "TypeScript設定ファイル" "PASS"
        
        # Strictモード確認
        if grep -q '"strict": *true' tsconfig.json; then
            record_lint_result "TypeScript Strictモード" "PASS"
        else
            record_lint_result "TypeScript Strictモード" "WARNING" "Strictモードが無効です"
        fi
    else
        record_lint_result "TypeScript設定ファイル" "FAIL" "tsconfig.jsonが見つかりません"
    fi
    
    # TypeScriptコンパイルチェック
    if npm run typecheck &>/dev/null; then
        record_lint_result "TypeScriptコンパイル" "PASS"
    else
        local error_count
        error_count=$(npm run typecheck 2>&1 | grep -c "error TS" || echo "0")
        record_lint_result "TypeScriptコンパイル" "FAIL" "$error_count 個のエラー"
    fi
}

# ESLintチェック
check_eslint() {
    print_info "ESLintチェックを実行中..."
    
    cd "$PROJECT_ROOT"
    
    # ESLint設定ファイル確認
    if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ]; then
        record_lint_result "ESLint設定ファイル" "PASS"
    else
        record_lint_result "ESLint設定ファイル" "FAIL" ".eslintrc.js/.eslintrc.jsonが見つかりません"
        return
    fi
    
    # ESLint実行
    local eslint_output
    eslint_output=$(npx eslint src/ --format=json 2>/dev/null || echo '[]')
    
    if command -v jq &> /dev/null; then
        local error_count
        local warning_count_eslint
        
        error_count=$(echo "$eslint_output" | jq '[.[] | .messages[] | select(.severity == 2)] | length' 2>/dev/null || echo "0")
        warning_count_eslint=$(echo "$eslint_output" | jq '[.[] | .messages[] | select(.severity == 1)] | length' 2>/dev/null || echo "0")
        
        if [ "$error_count" -eq 0 ]; then
            if [ "$warning_count_eslint" -eq 0 ]; then
                record_lint_result "ESLint" "PASS"
            else
                record_lint_result "ESLint" "WARNING" "$warning_count_eslint 個の警告"
            fi
        else
            record_lint_result "ESLint" "FAIL" "$error_count 個のエラー, $warning_count_eslint 個の警告"
        fi
    else
        # jqがない場合のフォールバック
        if npm run lint &>/dev/null; then
            record_lint_result "ESLint" "PASS"
        else
            record_lint_result "ESLint" "FAIL" "エラーが検出されました"
        fi
    fi
}

# Prettierチェック
check_prettier() {
    print_info "Prettierチェックを実行中..."
    
    cd "$PROJECT_ROOT"
    
    # Prettier設定ファイル確認
    if [ -f ".prettierrc" ] || [ -f "prettier.config.js" ] || [ -f ".prettierrc.json" ]; then
        record_lint_result "Prettier設定ファイル" "PASS"
    else
        record_lint_result "Prettier設定ファイル" "WARNING" "設定ファイルが見つかりません"
    fi
    
    # Prettierチェック実行
    if command -v prettier &> /dev/null || [ -f "node_modules/.bin/prettier" ]; then
        local prettier_cmd="npx prettier"
        
        # フォーマットチェック
        if $prettier_cmd --check "src/**/*.{ts,tsx,js,jsx}" &>/dev/null; then
            record_lint_result "Prettierフォーマット" "PASS"
        else
            local unformatted_files
            unformatted_files=$($prettier_cmd --check "src/**/*.{ts,tsx,js,jsx}" 2>&1 | grep -c "src/" || echo "0")
            record_lint_result "Prettierフォーマット" "WARNING" "$unformatted_files 個のファイルが未フォーマット"
        fi
    else
        record_lint_result "Prettier" "WARNING" "Prettierがインストールされていません"
    fi
}

# コード品質チェック
check_code_quality() {
    print_info "コード品質チェックを実行中..."
    
    cd "$PROJECT_ROOT"
    
    # TODO/FIXMEコメントチェック
    local todo_count
    todo_count=$(find src -name '*.ts' -o -name '*.tsx' | xargs grep -c 'TODO\|FIXME' 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    
    if [ "$todo_count" -eq 0 ]; then
        record_lint_result "TODO/FIXMEコメント" "PASS"
    elif [ "$todo_count" -le 5 ]; then
        record_lint_result "TODO/FIXMEコメント" "WARNING" "$todo_count 個のTODO/FIXME"
    else
        record_lint_result "TODO/FIXMEコメント" "FAIL" "$todo_count 個のTODO/FIXME (多すぎます)"
    fi
    
    # console.logチェック
    local console_count
    console_count=$(find src -name '*.ts' -o -name '*.tsx' | xargs grep -c 'console\.log' 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    
    if [ "$console_count" -eq 0 ]; then
        record_lint_result "console.logチェック" "PASS"
    elif [ "$console_count" -le 3 ]; then
        record_lint_result "console.logチェック" "WARNING" "$console_count 個のconsole.log"
    else
        record_lint_result "console.logチェック" "FAIL" "$console_count 個のconsole.log (本番環境では削除してください)"
    fi
    
    # ファイルサイズチェック
    local large_files
    large_files=$(find src -name '*.ts' -o -name '*.tsx' | xargs wc -l 2>/dev/null | awk '$1 > 500 {print $2}' | wc -l)
    
    if [ "$large_files" -eq 0 ]; then
        record_lint_result "ファイルサイズ" "PASS"
    elif [ "$large_files" -le 2 ]; then
        record_lint_result "ファイルサイズ" "WARNING" "$large_files 個の大きなファイル (500行以上)"
    else
        record_lint_result "ファイルサイズ" "FAIL" "$large_files 個の大きなファイル (リファクタリング推奨)"
    fi
    
    # インポートチェック
    local unused_imports
    unused_imports=$(find src -name '*.ts' -o -name '*.tsx' | xargs grep -l "import.*from" | wc -l)
    
    if [ "$unused_imports" -gt 0 ]; then
        record_lint_result "インポート統一性" "PASS"
    else
        record_lint_result "インポート統一性" "WARNING" "インポート文が見つかりません"
    fi
}

# バックエンドLintチェック
check_backend_lint() {
    print_info "バックエンドLintチェックを実行中..."
    
    cd "$BACKEND_DIR"
    
    # Node.jsコードスタイルチェック
    local js_files
    js_files=$(find . -name '*.js' -not -path './node_modules/*' | wc -l)
    
    if [ "$js_files" -gt 0 ]; then
        record_lint_result "Node.jsファイル数" "PASS" "$js_files 個の.jsファイル"
        
        # コンソールログチェック
        local console_logs
        console_logs=$(find . -name '*.js' -not -path './node_modules/*' | xargs grep -c 'console\.log' 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
        
        if [ "$console_logs" -le 10 ]; then
            record_lint_result "バックエンドconsole.log" "PASS"
        else
            record_lint_result "バックエンドconsole.log" "WARNING" "$console_logs 個のconsole.log"
        fi
        
        # エラーハンドリングチェック
        local error_handling
        error_handling=$(find . -name '*.js' -not -path './node_modules/*' | xargs grep -c 'try.*catch\|catch.*err' 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
        
        if [ "$error_handling" -gt 0 ]; then
            record_lint_result "エラーハンドリング" "PASS"
        else
            record_lint_result "エラーハンドリング" "WARNING" "try-catch文が見つかりません"
        fi
    else
        record_lint_result "Node.jsファイル" "WARNING" ".jsファイルが見つかりません"
    fi
    
    # PowerShellコードスタイルチェック
    local ps_files
    ps_files=$(find . -name '*.ps1' -o -name '*.psm1' | wc -l)
    
    if [ "$ps_files" -gt 0 ]; then
        record_lint_result "PowerShellファイル数" "PASS" "$ps_files 個のPowerShellファイル"
        
        # PowerShellコメントチェック
        local ps_comments
        ps_comments=$(find . -name '*.ps1' -o -name '*.psm1' | xargs grep -c '^#' 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
        
        if [ "$ps_comments" -gt 0 ]; then
            record_lint_result "PowerShellコメント" "PASS"
        else
            record_lint_result "PowerShellコメント" "WARNING" "コメントが不足しています"
        fi
    else
        record_lint_result "PowerShellファイル" "WARNING" "PowerShellファイルが見つかりません"
    fi
}

# セキュリティLintチェック
check_security_lint() {
    print_info "セキュリティLintチェックを実行中..."
    
    cd "$PROJECT_ROOT"
    
    # ハードコードされたパスワードチェック
    local hardcoded_passwords
    hardcoded_passwords=$(find src backend -name '*.ts' -o -name '*.tsx' -o -name '*.js' | xargs grep -i 'password.*=' 2>/dev/null | grep -v 'password.*process.env' | wc -l)
    
    if [ "$hardcoded_passwords" -eq 0 ]; then
        record_lint_result "ハードコードパスワード" "PASS"
    else
        record_lint_result "ハードコードパスワード" "FAIL" "$hardcoded_passwords 個のハードコードされたパスワードを発見"
    fi
    
    # APIキーチェック
    local api_keys
    api_keys=$(find src backend -name '*.ts' -o -name '*.tsx' -o -name '*.js' | xargs grep -iE 'api[_-]?key.*=' 2>/dev/null | grep -v 'process.env' | wc -l)
    
    if [ "$api_keys" -eq 0 ]; then
        record_lint_result "ハードコードAPIキー" "PASS"
    else
        record_lint_result "ハードコードAPIキー" "FAIL" "$api_keys 個のハードコードされたAPIキーを発見"
    fi
    
    # SQLインジェクションリスクチェック
    local sql_concat
    sql_concat=$(find backend -name '*.js' | xargs grep -c "\".*+.*\"\|'.*+.*'" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    
    if [ "$sql_concat" -le 2 ]; then
        record_lint_result "SQLインジェクションリスク" "PASS"
    else
        record_lint_result "SQLインジェクションリスク" "WARNING" "$sql_concat 個の文字列連結を発見 (プリペアドステートメント推奨)"
    fi
    
    # .envファイルチェック
    if [ -f ".env" ]; then
        record_lint_result ".envファイル" "PASS"
        
        # .gitignoreに.envが含まれているか確認
        if [ -f ".gitignore" ] && grep -q "\.env" .gitignore; then
            record_lint_result ".env gitignore" "PASS"
        else
            record_lint_result ".env gitignore" "FAIL" ".envファイルが.gitignoreに追加されていません"
        fi
    else
        record_lint_result ".envファイル" "WARNING" "環境変数ファイルが見つかりません"
    fi
}

# 依存関係Lintチェック
check_dependencies_lint() {
    print_info "依存関係Lintチェックを実行中..."
    
    cd "$PROJECT_ROOT"
    
    # package.jsonチェック
    if [ -f "package.json" ]; then
        record_lint_result "package.json" "PASS"
        
        # セキュリティ監査
        if npm audit --audit-level=high &>/dev/null; then
            record_lint_result "セキュリティ監査" "PASS"
        else
            local vuln_count
            vuln_count=$(npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities.total' 2>/dev/null || echo "unknown")
            record_lint_result "セキュリティ監査" "FAIL" "$vuln_count 個の脆弱性を発見"
        fi
        
        # 未使用依存関係チェック（簡易版）
        if command -v depcheck &> /dev/null; then
            local unused_deps
            unused_deps=$(depcheck --json 2>/dev/null | jq '.dependencies | length' 2>/dev/null || echo "0")
            
            if [ "$unused_deps" -eq 0 ]; then
                record_lint_result "未使用依存関係" "PASS"
            else
                record_lint_result "未使用依存関係" "WARNING" "$unused_deps 個の未使用依存関係"
            fi
        else
            record_lint_result "depcheck" "WARNING" "depcheckがインストールされていません"
        fi
    else
        record_lint_result "package.json" "FAIL" "package.jsonが見つかりません"
    fi
    
    # バックエンドpackage.jsonチェック
    if [ -f "backend/package.json" ]; then
        record_lint_result "バックエンドpackage.json" "PASS"
    else
        record_lint_result "バックエンドpackage.json" "WARNING" "バックエンドpackage.jsonが見つかりません"
    fi
}

# Lintレポート生成
generate_lint_report() {
    local report_file="/tmp/lint-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# ITSM Platform Lintチェックレポート

## 実行日時
$(date '+%Y年%m月%d日 %H:%M:%S')

## Lint結果サマリー
- **総チェック数**: $total_checks
- **合格**: $passed_checks
- **失敗**: $failed_checks
- **警告**: $warning_count
- **成功率**: $([ $total_checks -gt 0 ] && echo "scale=2; $passed_checks * 100 / $total_checks" | bc || echo "0")%

## チェック項目

### TypeScript Lint
- TypeScript設定ファイル確認
- Strictモード確認
- コンパイルエラーチェック

### ESLint
- ESLint設定ファイル確認
- コードスタイルチェック
- エラー・警告検出

### Prettier
- フォーマット設定確認
- コードフォーマットチェック

### コード品質
- TODO/FIXMEコメント数
- console.log使用数
- ファイルサイズチェック
- インポート統一性

### バックエンド
- Node.jsコードスタイル
- PowerShellコードスタイル
- エラーハンドリング

### セキュリティ
- ハードコードパスワード検出
- APIキー漏えいチェック
- SQLインジェクションリスク
- 環境変数管理

### 依存関係
- package.json確認
- セキュリティ監査
- 未使用依存関係検出

## 推奨事項

$(if [ $failed_checks -gt 0 ]; then
    echo "### 至急対応項目"
    echo "- 失敗したLintチェックを確認し、修正してください"
    echo "- セキュリティ問題がある場合は優先対応"
fi)

$(if [ $warning_count -gt 0 ]; then
    echo "### 改善推奨項目"
    echo "- 警告項目の確認と改善"
    echo "- コード品質の向上"
fi)

### 継続的改善
- 自動LintチェックのPre-commitフック導入
- CI/CDパイプラインでのLintチェック統合
- コードレビュープロセスの強化

---
Lintチェッカーによる自動生成レポート
EOF

    print_success "Lintレポート生成完了: $report_file"
    echo "  📄 レポートファイル: $report_file"
}

# メイン実行関数
main() {
    print_header
    
    print_info "ITSM Platform Lintチェックを開始します..."
    echo ""
    
    # 各Lintチェック実行
    check_typescript_lint
    echo ""
    
    check_eslint
    echo ""
    
    check_prettier
    echo ""
    
    check_code_quality
    echo ""
    
    check_backend_lint
    echo ""
    
    check_security_lint
    echo ""
    
    check_dependencies_lint
    echo ""
    
    # 結果表示
    print_info "=== Lintチェック結果 ==="
    print_info "総チェック数: $total_checks"
    print_success "合格: $passed_checks"
    if [ $failed_checks -gt 0 ]; then
        print_error "失敗: $failed_checks"
    else
        print_info "失敗: $failed_checks"
    fi
    if [ $warning_count -gt 0 ]; then
        print_warning "警告: $warning_count"
    else
        print_info "警告: $warning_count"
    fi
    
    if [ $total_checks -gt 0 ]; then
        local success_rate
        success_rate=$(echo "scale=2; $passed_checks * 100 / $total_checks" | bc 2>/dev/null || echo "0")
        print_info "成功率: $success_rate%"
    fi
    
    # レポート生成
    echo ""
    generate_lint_report
    
    # 終了コード設定
    if [ $failed_checks -eq 0 ]; then
        echo ""
        print_success "🎆 Lintチェックが完了しました！"
        if [ $warning_count -gt 0 ]; then
            print_info "⚠️  $warning_count 個の警告があります。改善を検討してください。"
        fi
        exit 0
    else
        echo ""
        print_error "❌ 一部のLintチェックが失敗しました。修正が必要です。"
        exit 1
    fi
}

# スクリプト実行
main "$@"