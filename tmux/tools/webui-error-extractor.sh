#!/bin/bash

# WebUIエラー自動抽出・分析システム
# 構文エラー・型エラー・テストエラー・依存関係問題の網羅的検出

set -euo pipefail

# =========================
# 設定・定数定義
# =========================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly WEBUI_SRC="$PROJECT_ROOT/src"
readonly LOG_DIR="$PROJECT_ROOT/logs/webui-auto-dev"
readonly ERROR_REPORT="$LOG_DIR/error_extraction_report.json"
readonly ERROR_LIST="$LOG_DIR/current_errors.json"

# 色設定
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# エラー分類定義
declare -A ERROR_CATEGORIES
declare -A ERROR_PRIORITIES
declare -A ERROR_COUNTS

# =========================
# ユーティリティ関数
# =========================

print_info() {
    echo -e "${BLUE}[ERROR-EXTRACT]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[ERROR-SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR-CRITICAL]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ERROR-WARNING]${NC} $1"
}

print_section() {
    echo -e "${BOLD}${CYAN}[ERROR-SECTION]${NC} $1"
}

get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# エラー分類関数
classify_error() {
    local error_type="$1"
    local error_message="$2"
    local priority="MEDIUM"
    local category="OTHER"
    
    case "$error_type" in
        "typescript"|"type")
            category="TYPE_ERROR"
            if echo "$error_message" | grep -q "cannot find name\|does not exist"; then
                priority="HIGH"
            elif echo "$error_message" | grep -q "type.*is not assignable"; then
                priority="MEDIUM"
            fi
            ;;
        "eslint"|"lint")
            category="LINT_ERROR"
            if echo "$error_message" | grep -q "no-unused-vars\|no-undef"; then
                priority="HIGH"
            else
                priority="LOW"
            fi
            ;;
        "syntax"|"parse")
            category="SYNTAX_ERROR"
            priority="CRITICAL"
            ;;
        "test"|"jest")
            category="TEST_ERROR"
            if echo "$error_message" | grep -q "test.*failed\|assertion.*failed"; then
                priority="HIGH"
            else
                priority="MEDIUM"
            fi
            ;;
        "dependency"|"npm")
            category="DEPENDENCY_ERROR"
            if echo "$error_message" | grep -q "missing\|not found"; then
                priority="CRITICAL"
            else
                priority="MEDIUM"
            fi
            ;;
        "security"|"audit")
            category="SECURITY_ERROR"
            if echo "$error_message" | grep -q "critical\|high"; then
                priority="CRITICAL"
            elif echo "$error_message" | grep -q "moderate"; then
                priority="HIGH"
            else
                priority="MEDIUM"
            fi
            ;;
        *)
            category="OTHER"
            priority="MEDIUM"
            ;;
    esac
    
    ERROR_CATEGORIES["$error_type"]="$category"
    ERROR_PRIORITIES["$error_type"]="$priority"
}

# =========================
# 構文エラー検出
# =========================

extract_syntax_errors() {
    print_section "構文エラー検出実行中..."
    
    local syntax_errors=()
    local error_count=0
    
    # TypeScript/JavaScript構文チェック
    print_info "TypeScript/JavaScript構文チェック中..."
    
    while IFS= read -r -d '' file; do
        if [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]]; then
            # Node.js構文チェック
            if command -v node >/dev/null; then
                local syntax_check=$(node -c "$file" 2>&1 || echo "SYNTAX_ERROR")
                if [[ "$syntax_check" == *"SYNTAX_ERROR"* ]] || [[ "$syntax_check" == *"SyntaxError"* ]]; then
                    syntax_errors+=("{\"file\": \"$file\", \"type\": \"syntax\", \"message\": \"$(echo "$syntax_check" | tr '"' "'")\", \"line\": 0}")
                    ((error_count++))
                    classify_error "syntax" "$syntax_check"
                fi
            fi
            
            # TypeScript特有の構文チェック
            if [[ "$file" =~ \.(ts|tsx)$ ]] && command -v tsc >/dev/null; then
                local ts_syntax=$(tsc --noEmit "$file" 2>&1 | head -20 || echo "")
                if [[ "$ts_syntax" == *"error"* ]]; then
                    local error_line=$(echo "$ts_syntax" | grep -o "([0-9]*," | head -1 | tr -d '(,')
                    syntax_errors+=("{\"file\": \"$file\", \"type\": \"typescript_syntax\", \"message\": \"$(echo "$ts_syntax" | head -1 | tr '"' "'")\", \"line\": ${error_line:-0}}")
                    ((error_count++))
                    classify_error "typescript" "$ts_syntax"
                fi
            fi
        fi
    done < <(find "$WEBUI_SRC" -type f -print0)
    
    # JSONファイル構文チェック
    print_info "JSONファイル構文チェック中..."
    while IFS= read -r -d '' file; do
        if [[ "$file" =~ \.json$ ]]; then
            if ! jq empty "$file" 2>/dev/null; then
                local json_error=$(jq empty "$file" 2>&1 || echo "JSON parse error")
                syntax_errors+=("{\"file\": \"$file\", \"type\": \"json_syntax\", \"message\": \"$(echo "$json_error" | tr '"' "'")\", \"line\": 0}")
                ((error_count++))
                classify_error "syntax" "$json_error"
            fi
        fi
    done < <(find "$PROJECT_ROOT" -name "*.json" -print0)
    
    ERROR_COUNTS["syntax_errors"]=$error_count
    
    # 結果保存
    if [ $error_count -gt 0 ]; then
        echo "{\"syntax_errors\": [$(printf '%s,' "${syntax_errors[@]}" | sed 's/,$//')]}" > "$LOG_DIR/syntax_errors.json"
        print_warning "構文エラー: $error_count 件検出"
    else
        print_success "構文エラー: 検出されませんでした"
    fi
    
    return $error_count
}

# =========================
# 型エラー抽出
# =========================

extract_type_errors() {
    print_section "TypeScript型エラー抽出実行中..."
    
    local type_errors=()
    local error_count=0
    
    # TypeScript型チェック実行
    if command -v tsc >/dev/null; then
        print_info "TypeScript全体型チェック実行中..."
        
        local ts_output=$(tsc --noEmit --project "$PROJECT_ROOT/config/tsconfig.json" 2>&1 || echo "")
        
        if [[ -n "$ts_output" ]]; then
            # エラーを行ごとに分析
            while IFS= read -r line; do
                if [[ "$line" =~ error\ TS[0-9]+ ]]; then
                    local file_path=$(echo "$line" | grep -o "^[^(]*" | head -1)
                    local line_number=$(echo "$line" | grep -o "([0-9]*," | tr -d '(,' | head -1)
                    local error_code=$(echo "$line" | grep -o "TS[0-9]*" | head -1)
                    local error_message=$(echo "$line" | sed 's/.*error TS[0-9]*: //')
                    
                    type_errors+=("{\"file\": \"$file_path\", \"type\": \"typescript\", \"code\": \"$error_code\", \"message\": \"$(echo "$error_message" | tr '"' "'")\", \"line\": ${line_number:-0}}")
                    ((error_count++))
                    classify_error "typescript" "$error_message"
                fi
            done <<< "$ts_output"
        fi
    fi
    
    # 型定義不足チェック
    print_info "型定義不足チェック中..."
    local any_usage=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | xargs grep -n ": any\|as any" 2>/dev/null | wc -l)
    if [ "$any_usage" -gt 0 ]; then
        type_errors+=("{\"file\": \"multiple\", \"type\": \"type_safety\", \"message\": \"any型の使用が${any_usage}箇所で検出されました\", \"line\": 0}")
        ((error_count++))
        classify_error "type" "any type usage detected"
    fi
    
    # インターフェース不整合チェック
    print_info "インターフェース不整合チェック中..."
    local interface_files=$(find "$WEBUI_SRC/types" -name "*.ts" 2>/dev/null | wc -l)
    local interface_usage=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | xargs grep -c "interface\|type.*=" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    
    if [ "$interface_files" -gt 0 ] && [ "$interface_usage" -lt $((interface_files * 2)) ]; then
        type_errors+=("{\"file\": \"types\", \"type\": \"interface_usage\", \"message\": \"型定義ファイルの使用率が低い可能性があります\", \"line\": 0}")
        ((error_count++))
        classify_error "type" "low interface usage"
    fi
    
    ERROR_COUNTS["type_errors"]=$error_count
    
    # 結果保存
    if [ $error_count -gt 0 ]; then
        echo "{\"type_errors\": [$(printf '%s,' "${type_errors[@]}" | sed 's/,$//')]}" > "$LOG_DIR/type_errors.json"
        print_warning "型エラー: $error_count 件検出"
    else
        print_success "型エラー: 検出されませんでした"
    fi
    
    return $error_count
}

# =========================
# テストエラー分析
# =========================

extract_test_errors() {
    print_section "テストエラー分析実行中..."
    
    local test_errors=()
    local error_count=0
    
    # Jestテスト実行・エラー抽出
    if command -v npm >/dev/null; then
        print_info "Jestテスト実行中..."
        
        local test_output=$(npm test --silent 2>&1 || echo "TEST_FAILED")
        
        if [[ "$test_output" == *"TEST_FAILED"* ]] || [[ "$test_output" == *"FAIL"* ]]; then
            # テスト失敗詳細を抽出
            while IFS= read -r line; do
                if [[ "$line" =~ FAIL.*\.test\. ]]; then
                    local test_file=$(echo "$line" | grep -o "[^ ]*\.test\.[^ ]*" | head -1)
                    test_errors+=("{\"file\": \"$test_file\", \"type\": \"test_failure\", \"message\": \"$(echo "$line" | tr '"' "'")\", \"line\": 0}")
                    ((error_count++))
                    classify_error "test" "$line"
                elif [[ "$line" =~ "TypeError"\|"ReferenceError"\|"AssertionError" ]]; then
                    test_errors+=("{\"file\": \"unknown\", \"type\": \"test_error\", \"message\": \"$(echo "$line" | tr '"' "'")\", \"line\": 0}")
                    ((error_count++))
                    classify_error "test" "$line"
                fi
            done <<< "$test_output"
        fi
    fi
    
    # テストカバレッジ不足検出
    print_info "テストカバレッジ分析中..."
    local test_files=$(find "$WEBUI_SRC" -name "*.test.*" -o -name "*.spec.*" | wc -l)
    local source_files=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | grep -v "\.test\.\|\.spec\." | wc -l)
    
    if [ "$source_files" -gt 0 ]; then
        local coverage_ratio=$((test_files * 100 / source_files))
        if [ "$coverage_ratio" -lt 30 ]; then
            test_errors+=("{\"file\": \"coverage\", \"type\": \"low_coverage\", \"message\": \"テストカバレッジが${coverage_ratio}%と低すぎます\", \"line\": 0}")
            ((error_count++))
            classify_error "test" "low test coverage"
        fi
    fi
    
    # 孤立テストファイル検出
    print_info "孤立テストファイル検出中..."
    while IFS= read -r -d '' test_file; do
        local source_file=$(echo "$test_file" | sed 's/\.test\./\./' | sed 's/\.spec\./\./')
        if [ ! -f "$source_file" ]; then
            test_errors+=("{\"file\": \"$test_file\", \"type\": \"orphaned_test\", \"message\": \"対応するソースファイルが見つかりません: $source_file\", \"line\": 0}")
            ((error_count++))
            classify_error "test" "orphaned test file"
        fi
    done < <(find "$WEBUI_SRC" -name "*.test.*" -o -name "*.spec.*" -print0)
    
    ERROR_COUNTS["test_errors"]=$error_count
    
    # 結果保存
    if [ $error_count -gt 0 ]; then
        echo "{\"test_errors\": [$(printf '%s,' "${test_errors[@]}" | sed 's/,$//')]}" > "$LOG_DIR/test_errors.json"
        print_warning "テストエラー: $error_count 件検出"
    else
        print_success "テストエラー: 検出されませんでした"
    fi
    
    return $error_count
}

# =========================
# 依存関係問題検出
# =========================

extract_dependency_errors() {
    print_section "依存関係問題検出実行中..."
    
    local dependency_errors=()
    local error_count=0
    
    # npm audit セキュリティ脆弱性
    if command -v npm >/dev/null; then
        print_info "npm audit セキュリティチェック中..."
        
        local audit_output=$(npm audit --json 2>/dev/null || echo '{"advisories":{}}')
        local vulnerability_count=$(echo "$audit_output" | jq '.metadata.vulnerabilities.total' 2>/dev/null || echo "0")
        
        if [ "$vulnerability_count" -gt 0 ]; then
            dependency_errors+=("{\"file\": \"package.json\", \"type\": \"security_vulnerability\", \"message\": \"${vulnerability_count}件のセキュリティ脆弱性が検出されました\", \"line\": 0}")
            ((error_count++))
            classify_error "security" "security vulnerabilities detected"
        fi
        
        # 依存関係の整合性チェック
        print_info "依存関係整合性チェック中..."
        local npm_ls_output=$(npm ls --depth=0 2>&1 || echo "DEPENDENCY_ERROR")
        
        if [[ "$npm_ls_output" == *"DEPENDENCY_ERROR"* ]] || [[ "$npm_ls_output" == *"missing"* ]]; then
            while IFS= read -r line; do
                if [[ "$line" =~ "missing:"\|"invalid:"\|"UNMET DEPENDENCY" ]]; then
                    dependency_errors+=("{\"file\": \"package.json\", \"type\": \"missing_dependency\", \"message\": \"$(echo "$line" | tr '"' "'")\", \"line\": 0}")
                    ((error_count++))
                    classify_error "dependency" "$line"
                fi
            done <<< "$npm_ls_output"
        fi
    fi
    
    # 未使用依存関係検出
    print_info "未使用依存関係検出中..."
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        local declared_deps=$(jq -r '.dependencies // {} | keys[]' "$PROJECT_ROOT/package.json" 2>/dev/null || echo "")
        local declared_dev_deps=$(jq -r '.devDependencies // {} | keys[]' "$PROJECT_ROOT/package.json" 2>/dev/null || echo "")
        
        # 各依存関係の使用状況チェック
        for dep in $declared_deps; do
            local usage_count=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -l "from ['\"]$dep['\"]" 2>/dev/null | wc -l)
            if [ "$usage_count" -eq 0 ]; then
                dependency_errors+=("{\"file\": \"package.json\", \"type\": \"unused_dependency\", \"message\": \"未使用の依存関係: $dep\", \"line\": 0}")
                ((error_count++))
                classify_error "dependency" "unused dependency"
            fi
        done
    fi
    
    # バージョン不整合検出
    print_info "バージョン不整合検出中..."
    if [ -f "$PROJECT_ROOT/package-lock.json" ] && [ -f "$PROJECT_ROOT/package.json" ]; then
        local lock_version=$(jq -r '.lockfileVersion' "$PROJECT_ROOT/package-lock.json" 2>/dev/null || echo "0")
        if [ "$lock_version" -eq 0 ]; then
            dependency_errors+=("{\"file\": \"package-lock.json\", \"type\": \"version_mismatch\", \"message\": \"package-lock.jsonのバージョンが古い可能性があります\", \"line\": 0}")
            ((error_count++))
            classify_error "dependency" "version mismatch"
        fi
    fi
    
    # peer dependency警告
    print_info "peer dependency警告チェック中..."
    local peer_warnings=$(npm ls --depth=0 2>&1 | grep -c "peer dep missing\|UNMET PEER DEPENDENCY" || echo "0")
    if [ "$peer_warnings" -gt 0 ]; then
        dependency_errors+=("{\"file\": \"package.json\", \"type\": \"peer_dependency\", \"message\": \"${peer_warnings}件のpeer dependency警告があります\", \"line\": 0}")
        ((error_count++))
        classify_error "dependency" "peer dependency issues"
    fi
    
    ERROR_COUNTS["dependency_errors"]=$error_count
    
    # 結果保存
    if [ $error_count -gt 0 ]; then
        echo "{\"dependency_errors\": [$(printf '%s,' "${dependency_errors[@]}" | sed 's/,$//')]}" > "$LOG_DIR/dependency_errors.json"
        print_warning "依存関係エラー: $error_count 件検出"
    else
        print_success "依存関係エラー: 検出されませんでした"
    fi
    
    return $error_count
}

# =========================
# ESLintエラー抽出
# =========================

extract_eslint_errors() {
    print_section "ESLintエラー抽出実行中..."
    
    local eslint_errors=()
    local error_count=0
    
    if command -v npx >/dev/null; then
        print_info "ESLint分析実行中..."
        
        local eslint_output=$(npx eslint "$WEBUI_SRC" --format json 2>/dev/null || echo "[]")
        
        # JSON形式の結果を解析
        if command -v jq >/dev/null; then
            local file_count=$(echo "$eslint_output" | jq length)
            
            for ((i=0; i<file_count; i++)); do
                local file_path=$(echo "$eslint_output" | jq -r ".[$i].filePath")
                local message_count=$(echo "$eslint_output" | jq ".[$i].messages | length")
                
                for ((j=0; j<message_count; j++)); do
                    local rule_id=$(echo "$eslint_output" | jq -r ".[$i].messages[$j].ruleId // \"unknown\"")
                    local message=$(echo "$eslint_output" | jq -r ".[$i].messages[$j].message")
                    local line=$(echo "$eslint_output" | jq -r ".[$i].messages[$j].line")
                    local severity=$(echo "$eslint_output" | jq -r ".[$i].messages[$j].severity")
                    
                    eslint_errors+=("{\"file\": \"$file_path\", \"type\": \"eslint\", \"rule\": \"$rule_id\", \"message\": \"$(echo "$message" | tr '"' "'")\", \"line\": $line, \"severity\": $severity}")
                    ((error_count++))
                    classify_error "eslint" "$message"
                done
            done
        else
            # jqが使用できない場合の簡易解析
            local simple_error_count=$(npx eslint "$WEBUI_SRC" 2>/dev/null | grep -c "✖" || echo "0")
            error_count=$simple_error_count
        fi
    fi
    
    ERROR_COUNTS["eslint_errors"]=$error_count
    
    # 結果保存
    if [ $error_count -gt 0 ]; then
        echo "{\"eslint_errors\": [$(printf '%s,' "${eslint_errors[@]}" | sed 's/,$//')]}" > "$LOG_DIR/eslint_errors.json"
        print_warning "ESLintエラー: $error_count 件検出"
    else
        print_success "ESLintエラー: 検出されませんでした"
    fi
    
    return $error_count
}

# =========================
# 総合エラーレポート生成
# =========================

generate_error_report() {
    print_section "総合エラーレポート生成中..."
    
    local total_errors=$(( 
        ERROR_COUNTS["syntax_errors"] + 
        ERROR_COUNTS["type_errors"] + 
        ERROR_COUNTS["test_errors"] + 
        ERROR_COUNTS["dependency_errors"] + 
        ERROR_COUNTS["eslint_errors"]
    ))
    
    # 優先度別分類
    local critical_count=0
    local high_count=0
    local medium_count=0
    local low_count=0
    
    for category in "${!ERROR_PRIORITIES[@]}"; do
        case "${ERROR_PRIORITIES[$category]}" in
            "CRITICAL") ((critical_count++)) ;;
            "HIGH") ((high_count++)) ;;
            "MEDIUM") ((medium_count++)) ;;
            "LOW") ((low_count++)) ;;
        esac
    done
    
    mkdir -p "$LOG_DIR"
    
    cat > "$ERROR_REPORT" << EOF
{
    "extraction_summary": {
        "timestamp": "$(get_timestamp)",
        "total_errors": $total_errors,
        "by_category": {
            "syntax_errors": ${ERROR_COUNTS["syntax_errors"]},
            "type_errors": ${ERROR_COUNTS["type_errors"]},
            "test_errors": ${ERROR_COUNTS["test_errors"]},
            "dependency_errors": ${ERROR_COUNTS["dependency_errors"]},
            "eslint_errors": ${ERROR_COUNTS["eslint_errors"]}
        },
        "by_priority": {
            "critical": $critical_count,
            "high": $high_count,
            "medium": $medium_count,
            "low": $low_count
        }
    },
    "error_categories": {
$(for category in "${!ERROR_CATEGORIES[@]}"; do
    echo "        \"$category\": \"${ERROR_CATEGORIES[$category]}\","
done | sed '$ s/,$//')
    },
    "priority_mapping": {
$(for category in "${!ERROR_PRIORITIES[@]}"; do
    echo "        \"$category\": \"${ERROR_PRIORITIES[$category]}\","
done | sed '$ s/,$//')
    },
    "fix_recommendations": [
        $(if [ ${ERROR_COUNTS["syntax_errors"]} -gt 0 ]; then echo "\"構文エラーを最優先で修復してください\""; fi)
        $(if [ ${ERROR_COUNTS["type_errors"]} -gt 0 ]; then echo ",\"TypeScript型エラーの修復が必要です\""; fi)
        $(if [ ${ERROR_COUNTS["dependency_errors"]} -gt 0 ]; then echo ",\"依存関係の問題を解決してください\""; fi)
        $(if [ ${ERROR_COUNTS["test_errors"]} -gt 0 ]; then echo ",\"テストエラーの修復とカバレッジ向上が必要です\""; fi)
        $(if [ ${ERROR_COUNTS["eslint_errors"]} -gt 0 ]; then echo ",\"ESLintエラーの修復でコード品質を向上させてください\""; fi)
    ]
}
EOF

    # 現在のエラー一覧も生成
    cat > "$ERROR_LIST" << EOF
{
    "current_errors": {
        "total": $total_errors,
        "critical_priority": $critical_count,
        "extraction_time": "$(get_timestamp)",
        "categories": {
            "syntax": ${ERROR_COUNTS["syntax_errors"]},
            "type": ${ERROR_COUNTS["type_errors"]},
            "test": ${ERROR_COUNTS["test_errors"]},
            "dependency": ${ERROR_COUNTS["dependency_errors"]},
            "eslint": ${ERROR_COUNTS["eslint_errors"]}
        }
    }
}
EOF

    print_success "エラーレポートを保存しました: $ERROR_REPORT"
    
    # サマリー表示
    echo ""
    print_section "=== WebUIエラー抽出結果サマリー ==="
    echo -e "${BOLD}総エラー数: ${total_errors}${NC}"
    echo ""
    echo "カテゴリ別:"
    echo "  構文エラー: ${ERROR_COUNTS["syntax_errors"]} 件"
    echo "  型エラー: ${ERROR_COUNTS["type_errors"]} 件"
    echo "  テストエラー: ${ERROR_COUNTS["test_errors"]} 件"
    echo "  依存関係エラー: ${ERROR_COUNTS["dependency_errors"]} 件"
    echo "  ESLintエラー: ${ERROR_COUNTS["eslint_errors"]} 件"
    echo ""
    echo "優先度別:"
    echo -e "  ${RED}CRITICAL: ${critical_count}${NC}"
    echo -e "  ${YELLOW}HIGH: ${high_count}${NC}"
    echo -e "  ${BLUE}MEDIUM: ${medium_count}${NC}"
    echo -e "  ${GREEN}LOW: ${low_count}${NC}"
}

# =========================
# メイン実行
# =========================

main() {
    print_section "WebUIエラー自動抽出・分析システム開始"
    
    # 環境チェック
    if [ ! -d "$WEBUI_SRC" ]; then
        print_error "WebUIソースディレクトリが見つかりません: $WEBUI_SRC"
        exit 1
    fi
    
    # ログディレクトリ作成
    mkdir -p "$LOG_DIR"
    
    # エラーカウンター初期化
    ERROR_COUNTS["syntax_errors"]=0
    ERROR_COUNTS["type_errors"]=0
    ERROR_COUNTS["test_errors"]=0
    ERROR_COUNTS["dependency_errors"]=0
    ERROR_COUNTS["eslint_errors"]=0
    
    # 各カテゴリのエラー抽出実行
    extract_syntax_errors
    extract_type_errors
    extract_test_errors
    extract_dependency_errors
    extract_eslint_errors
    
    # 総合レポート生成
    generate_error_report
    
    print_success "WebUIエラー抽出・分析が完了しました"
    
    # 終了コード決定
    local total_errors=$(( 
        ERROR_COUNTS["syntax_errors"] + 
        ERROR_COUNTS["type_errors"] + 
        ERROR_COUNTS["test_errors"] + 
        ERROR_COUNTS["dependency_errors"] + 
        ERROR_COUNTS["eslint_errors"]
    ))
    
    if [ $total_errors -eq 0 ]; then
        exit 0  # エラーなし
    elif [ $total_errors -le 5 ]; then
        exit 1  # 軽微なエラー
    elif [ $total_errors -le 20 ]; then
        exit 2  # 中程度のエラー
    else
        exit 3  # 重大なエラー
    fi
}

# スクリプト実行
main "$@"