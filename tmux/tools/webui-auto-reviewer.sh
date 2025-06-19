#!/bin/bash

# WebUI自動コードレビューシステム
# 包括的な品質分析・セキュリティ監査・パフォーマンス評価

set -euo pipefail

# =========================
# 設定・定数定義
# =========================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly WEBUI_SRC="$PROJECT_ROOT/src"
readonly LOG_DIR="$PROJECT_ROOT/logs/webui-auto-dev"
readonly REVIEW_REPORT="$LOG_DIR/auto_review_report.json"

# 色設定
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# レビュー結果格納
declare -A REVIEW_RESULTS

# =========================
# ユーティリティ関数
# =========================

print_info() {
    echo -e "${BLUE}[REVIEW-INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[REVIEW-SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[REVIEW-ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[REVIEW-WARNING]${NC} $1"
}

print_section() {
    echo -e "${BOLD}${CYAN}[REVIEW-SECTION]${NC} $1"
}

get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# =========================
# コード品質分析
# =========================

analyze_code_quality() {
    print_section "コード品質分析実行中..."
    
    local quality_score=0
    local issues_found=0
    local files_analyzed=0
    
    # TypeScriptファイル数カウント
    files_analyzed=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | wc -l)
    print_info "分析対象ファイル数: $files_analyzed"
    
    # ESLint分析
    if command -v npx >/dev/null; then
        print_info "ESLint分析実行中..."
        local eslint_output=$(npx eslint "$WEBUI_SRC" --format json 2>/dev/null || echo "[]")
        local eslint_errors=$(echo "$eslint_output" | jq length 2>/dev/null || echo "0")
        issues_found=$((issues_found + eslint_errors))
        
        if [ "$eslint_errors" -eq 0 ]; then
            quality_score=$((quality_score + 25))
            print_success "ESLint: エラーなし"
        else
            print_warning "ESLint: $eslint_errors 件のエラー"
        fi
    fi
    
    # TypeScript型チェック
    if command -v tsc >/dev/null; then
        print_info "TypeScript型チェック実行中..."
        if tsc --noEmit --project "$PROJECT_ROOT/config/tsconfig.json" 2>/dev/null; then
            quality_score=$((quality_score + 25))
            print_success "TypeScript: 型エラーなし"
        else
            local ts_errors=$(tsc --noEmit --project "$PROJECT_ROOT/config/tsconfig.json" 2>&1 | grep -c "error TS" || echo "0")
            issues_found=$((issues_found + ts_errors))
            print_warning "TypeScript: $ts_errors 件の型エラー"
        fi
    fi
    
    # Prettier フォーマットチェック
    if command -v npx >/dev/null; then
        print_info "Prettierフォーマットチェック中..."
        if npx prettier --check "$WEBUI_SRC/**/*.{ts,tsx}" --silent 2>/dev/null; then
            quality_score=$((quality_score + 15))
            print_success "Prettier: フォーマット正常"
        else
            print_warning "Prettier: フォーマット問題あり"
        fi
    fi
    
    # 重複コード検出
    print_info "重複コード検出中..."
    local duplicate_lines=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | xargs grep -h "^[[:space:]]*[^/]" | sort | uniq -d | wc -l)
    if [ "$duplicate_lines" -lt 10 ]; then
        quality_score=$((quality_score + 10))
        print_success "重複コード: 最小レベル ($duplicate_lines 行)"
    else
        print_warning "重複コード: $duplicate_lines 行検出"
    fi
    
    # 複雑度分析（簡易版）
    print_info "コード複雑度分析中..."
    local complex_functions=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | xargs grep -c "if.*if.*if" | awk -F: '{sum+=$2} END {print sum+0}')
    if [ "$complex_functions" -lt 5 ]; then
        quality_score=$((quality_score + 15))
        print_success "複雑度: 良好 ($complex_functions 個の複雑関数)"
    else
        print_warning "複雑度: 改善推奨 ($complex_functions 個の複雑関数)"
    fi
    
    # コメント率分析
    print_info "コメント率分析中..."
    local total_lines=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -n 1 | awk '{print $1}')
    local comment_lines=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | xargs grep -c "^\s*//\|^\s*/\*" | awk -F: '{sum+=$2} END {print sum+0}')
    local comment_ratio=$(( comment_lines * 100 / (total_lines + 1) ))
    
    if [ "$comment_ratio" -ge 10 ]; then
        quality_score=$((quality_score + 10))
        print_success "コメント率: $comment_ratio% (良好)"
    else
        print_warning "コメント率: $comment_ratio% (改善推奨)"
    fi
    
    REVIEW_RESULTS["code_quality_score"]=$quality_score
    REVIEW_RESULTS["code_quality_issues"]=$issues_found
    REVIEW_RESULTS["files_analyzed"]=$files_analyzed
    
    print_success "コード品質分析完了: スコア $quality_score/100, 問題 $issues_found 件"
}

# =========================
# セキュリティ監査
# =========================

analyze_security() {
    print_section "セキュリティ監査実行中..."
    
    local security_score=100
    local vulnerabilities=0
    local security_issues=()
    
    # npm audit セキュリティ監査
    if command -v npm >/dev/null; then
        print_info "npm audit セキュリティスキャン中..."
        local audit_result=$(npm audit --json 2>/dev/null || echo '{"metadata":{"vulnerabilities":{"total":0}}}')
        vulnerabilities=$(echo "$audit_result" | jq '.metadata.vulnerabilities.total' 2>/dev/null || echo "0")
        
        if [ "$vulnerabilities" -eq 0 ]; then
            print_success "npm audit: 脆弱性なし"
        else
            security_score=$((security_score - vulnerabilities * 5))
            print_warning "npm audit: $vulnerabilities 件の脆弱性"
            security_issues+=("npm_vulnerabilities:$vulnerabilities")
        fi
    fi
    
    # 危険な関数・パターン検出
    print_info "危険なコードパターン検出中..."
    local dangerous_patterns=0
    
    # eval, innerHTML, dangerouslySetInnerHTML の使用チェック
    local eval_usage=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | xargs grep -c "eval\|innerHTML\|dangerouslySetInnerHTML" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    if [ "$eval_usage" -gt 0 ]; then
        dangerous_patterns=$((dangerous_patterns + eval_usage))
        security_score=$((security_score - eval_usage * 10))
        security_issues+=("dangerous_functions:$eval_usage")
        print_warning "危険な関数使用: $eval_usage 箇所"
    fi
    
    # ハードコードされた機密情報チェック
    local hardcoded_secrets=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | xargs grep -i "password\|secret\|key\|token" | grep -v "prop\|type\|interface" | wc -l)
    if [ "$hardcoded_secrets" -gt 0 ]; then
        dangerous_patterns=$((dangerous_patterns + hardcoded_secrets))
        security_score=$((security_score - hardcoded_secrets * 15))
        security_issues+=("hardcoded_secrets:$hardcoded_secrets")
        print_warning "機密情報の疑い: $hardcoded_secrets 箇所"
    fi
    
    # XSS対策チェック
    local xss_risks=$(find "$WEBUI_SRC" -name "*.tsx" | xargs grep -c "dangerouslySetInnerHTML\|v-html" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    if [ "$xss_risks" -gt 0 ]; then
        dangerous_patterns=$((dangerous_patterns + xss_risks))
        security_score=$((security_score - xss_risks * 8))
        security_issues+=("xss_risks:$xss_risks")
        print_warning "XSSリスク: $xss_risks 箇所"
    fi
    
    # HTTPS使用チェック
    local http_usage=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | xargs grep -c "http://" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    if [ "$http_usage" -gt 0 ]; then
        dangerous_patterns=$((dangerous_patterns + http_usage))
        security_score=$((security_score - http_usage * 5))
        security_issues+=("http_usage:$http_usage")
        print_warning "HTTP使用 (HTTPS推奨): $http_usage 箇所"
    fi
    
    # セキュリティスコア調整
    [ $security_score -lt 0 ] && security_score=0
    
    REVIEW_RESULTS["security_score"]=$security_score
    REVIEW_RESULTS["vulnerabilities"]=$vulnerabilities
    REVIEW_RESULTS["security_issues"]="${security_issues[*]}"
    
    print_success "セキュリティ監査完了: スコア $security_score/100, 脆弱性 $vulnerabilities 件"
}

# =========================
# パフォーマンス分析
# =========================

analyze_performance() {
    print_section "パフォーマンス分析実行中..."
    
    local performance_score=0
    local performance_issues=0
    
    # バンドルサイズ分析
    print_info "バンドルサイズ分析中..."
    local src_size=$(du -s "$WEBUI_SRC" 2>/dev/null | cut -f1 || echo "0")
    local src_size_mb=$((src_size / 1024))
    
    if [ "$src_size_mb" -lt 5 ]; then
        performance_score=$((performance_score + 25))
        print_success "ソースサイズ: ${src_size_mb}MB (最適)"
    elif [ "$src_size_mb" -lt 10 ]; then
        performance_score=$((performance_score + 15))
        print_info "ソースサイズ: ${src_size_mb}MB (良好)"
    else
        print_warning "ソースサイズ: ${src_size_mb}MB (大きめ)"
    fi
    
    # 大きなファイル検出
    print_info "大きなファイル検出中..."
    local large_files=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300 {print $2}' | wc -l)
    if [ "$large_files" -eq 0 ]; then
        performance_score=$((performance_score + 20))
        print_success "大きなファイル: なし"
    else
        performance_issues=$((performance_issues + large_files))
        print_warning "大きなファイル: $large_files 個 (300行超)"
    fi
    
    # 未使用インポート検出
    print_info "未使用インポート検出中..."
    local unused_imports=0
    for file in $(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx"); do
        local imports=$(grep "^import" "$file" | wc -l)
        local usage_count=$(grep -v "^import" "$file" | wc -l)
        if [ "$imports" -gt 0 ] && [ "$usage_count" -lt $((imports * 2)) ]; then
            ((unused_imports++))
        fi
    done
    
    if [ "$unused_imports" -eq 0 ]; then
        performance_score=$((performance_score + 15))
        print_success "未使用インポート: なし"
    else
        performance_issues=$((performance_issues + unused_imports))
        print_warning "未使用インポート疑い: $unused_imports ファイル"
    fi
    
    # React最適化チェック
    print_info "React最適化分析中..."
    local memo_usage=$(find "$WEBUI_SRC" -name "*.tsx" | xargs grep -c "React.memo\|useMemo\|useCallback" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    local component_count=$(find "$WEBUI_SRC" -name "*.tsx" | xargs grep -c "export.*function\|export.*const.*=.*=>" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    
    if [ "$component_count" -gt 0 ]; then
        local optimization_ratio=$((memo_usage * 100 / component_count))
        if [ "$optimization_ratio" -ge 30 ]; then
            performance_score=$((performance_score + 20))
            print_success "React最適化: ${optimization_ratio}% (良好)"
        elif [ "$optimization_ratio" -ge 10 ]; then
            performance_score=$((performance_score + 10))
            print_info "React最適化: ${optimization_ratio}% (改善余地)"
        else
            print_warning "React最適化: ${optimization_ratio}% (要改善)"
        fi
    fi
    
    # 非同期処理分析
    print_info "非同期処理分析中..."
    local async_usage=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | xargs grep -c "async.*await\|Promise" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    local callback_usage=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | xargs grep -c "\.then(\|\.catch(" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    
    if [ "$async_usage" -gt "$callback_usage" ]; then
        performance_score=$((performance_score + 20))
        print_success "非同期処理: async/await主体 (推奨)"
    else
        print_info "非同期処理: Promise/callback併用"
    fi
    
    REVIEW_RESULTS["performance_score"]=$performance_score
    REVIEW_RESULTS["performance_issues"]=$performance_issues
    REVIEW_RESULTS["bundle_size_mb"]=$src_size_mb
    
    print_success "パフォーマンス分析完了: スコア $performance_score/100, 問題 $performance_issues 件"
}

# =========================
# アクセシビリティ監査
# =========================

analyze_accessibility() {
    print_section "アクセシビリティ監査実行中..."
    
    local accessibility_score=0
    local a11y_issues=0
    
    # ARIA属性チェック
    print_info "ARIA属性分析中..."
    local aria_usage=$(find "$WEBUI_SRC" -name "*.tsx" | xargs grep -c "aria-\|role=" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    local interactive_elements=$(find "$WEBUI_SRC" -name "*.tsx" | xargs grep -c "button\|input\|select\|textarea" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    
    if [ "$interactive_elements" -gt 0 ]; then
        local aria_ratio=$((aria_usage * 100 / interactive_elements))
        if [ "$aria_ratio" -ge 60 ]; then
            accessibility_score=$((accessibility_score + 30))
            print_success "ARIA属性: ${aria_ratio}% (優秀)"
        elif [ "$aria_ratio" -ge 30 ]; then
            accessibility_score=$((accessibility_score + 20))
            print_info "ARIA属性: ${aria_ratio}% (良好)"
        else
            a11y_issues=$((a11y_issues + 1))
            print_warning "ARIA属性: ${aria_ratio}% (要改善)"
        fi
    fi
    
    # セマンティックHTML分析
    print_info "セマンティックHTML分析中..."
    local semantic_tags=$(find "$WEBUI_SRC" -name "*.tsx" | xargs grep -c "<header\|<nav\|<main\|<section\|<article\|<aside\|<footer" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    local div_tags=$(find "$WEBUI_SRC" -name "*.tsx" | xargs grep -c "<div" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    
    if [ "$div_tags" -gt 0 ]; then
        local semantic_ratio=$((semantic_tags * 100 / div_tags))
        if [ "$semantic_ratio" -ge 30 ]; then
            accessibility_score=$((accessibility_score + 25))
            print_success "セマンティックHTML: ${semantic_ratio}% (優秀)"
        elif [ "$semantic_ratio" -ge 15 ]; then
            accessibility_score=$((accessibility_score + 15))
            print_info "セマンティックHTML: ${semantic_ratio}% (改善余地)"
        else
            a11y_issues=$((a11y_issues + 1))
            print_warning "セマンティックHTML: ${semantic_ratio}% (要改善)"
        fi
    fi
    
    # フォーカス管理チェック
    print_info "フォーカス管理分析中..."
    local focus_management=$(find "$WEBUI_SRC" -name "*.tsx" | xargs grep -c "tabIndex\|focus()\|blur()" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    if [ "$focus_management" -ge 5 ]; then
        accessibility_score=$((accessibility_score + 20))
        print_success "フォーカス管理: 実装あり ($focus_management 箇所)"
    else
        a11y_issues=$((a11y_issues + 1))
        print_warning "フォーカス管理: 不十分 ($focus_management 箇所)"
    fi
    
    # 画像alt属性チェック
    print_info "画像alt属性分析中..."
    local img_tags=$(find "$WEBUI_SRC" -name "*.tsx" | xargs grep -c "<img" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    local alt_attrs=$(find "$WEBUI_SRC" -name "*.tsx" | xargs grep -c "alt=" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    
    if [ "$img_tags" -eq 0 ] || [ "$alt_attrs" -ge "$img_tags" ]; then
        accessibility_score=$((accessibility_score + 25))
        print_success "画像alt属性: 完備"
    else
        a11y_issues=$((a11y_issues + 1))
        print_warning "画像alt属性: 不足 ($alt_attrs/$img_tags)"
    fi
    
    REVIEW_RESULTS["accessibility_score"]=$accessibility_score
    REVIEW_RESULTS["accessibility_issues"]=$a11y_issues
    
    print_success "アクセシビリティ監査完了: スコア $accessibility_score/100, 問題 $a11y_issues 件"
}

# =========================
# テストカバレッジ分析
# =========================

analyze_test_coverage() {
    print_section "テストカバレッジ分析実行中..."
    
    local test_score=0
    local test_issues=0
    
    # テストファイル数分析
    print_info "テストファイル分析中..."
    local test_files=$(find "$WEBUI_SRC" -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" | wc -l)
    local source_files=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | grep -v "\.test\.\|\.spec\." | wc -l)
    
    if [ "$source_files" -gt 0 ]; then
        local test_ratio=$((test_files * 100 / source_files))
        if [ "$test_ratio" -ge 80 ]; then
            test_score=$((test_score + 40))
            print_success "テストカバレッジ: ${test_ratio}% (優秀)"
        elif [ "$test_ratio" -ge 50 ]; then
            test_score=$((test_score + 25))
            print_info "テストカバレッジ: ${test_ratio}% (良好)"
        elif [ "$test_ratio" -ge 20 ]; then
            test_score=$((test_score + 15))
            print_warning "テストカバレッジ: ${test_ratio}% (改善推奨)"
        else
            test_issues=$((test_issues + 1))
            print_warning "テストカバレッジ: ${test_ratio}% (要改善)"
        fi
    fi
    
    # テスト実行確認
    if command -v npm >/dev/null; then
        print_info "テスト実行確認中..."
        if npm test --silent 2>/dev/null; then
            test_score=$((test_score + 30))
            print_success "テスト実行: 全テスト合格"
        else
            test_issues=$((test_issues + 1))
            print_warning "テスト実行: エラーまたは失敗あり"
        fi
    fi
    
    # テスト品質分析
    print_info "テスト品質分析中..."
    local test_assertions=$(find "$WEBUI_SRC" -name "*.test.*" -o -name "*.spec.*" | xargs grep -c "expect(\|assert\|should" 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
    if [ "$test_assertions" -ge 20 ]; then
        test_score=$((test_score + 30))
        print_success "テスト品質: 豊富なアサーション ($test_assertions 個)"
    elif [ "$test_assertions" -ge 5 ]; then
        test_score=$((test_score + 20))
        print_info "テスト品質: 基本的なアサーション ($test_assertions 個)"
    else
        print_warning "テスト品質: アサーション不足 ($test_assertions 個)"
    fi
    
    REVIEW_RESULTS["test_score"]=$test_score
    REVIEW_RESULTS["test_issues"]=$test_issues
    REVIEW_RESULTS["test_files"]=$test_files
    REVIEW_RESULTS["source_files"]=$source_files
    
    print_success "テストカバレッジ分析完了: スコア $test_score/100, 問題 $test_issues 件"
}

# =========================
# 総合レポート生成
# =========================

generate_review_report() {
    print_section "総合レビューレポート生成中..."
    
    local total_score=$(( 
        (REVIEW_RESULTS["code_quality_score"] * 25 / 100) + 
        (REVIEW_RESULTS["security_score"] * 20 / 100) + 
        (REVIEW_RESULTS["performance_score"] * 20 / 100) + 
        (REVIEW_RESULTS["accessibility_score"] * 20 / 100) + 
        (REVIEW_RESULTS["test_score"] * 15 / 100)
    ))
    
    local total_issues=$(( 
        REVIEW_RESULTS["code_quality_issues"] + 
        REVIEW_RESULTS["vulnerabilities"] + 
        REVIEW_RESULTS["performance_issues"] + 
        REVIEW_RESULTS["accessibility_issues"] + 
        REVIEW_RESULTS["test_issues"]
    ))
    
    mkdir -p "$LOG_DIR"
    
    cat > "$REVIEW_REPORT" << EOF
{
    "review_summary": {
        "timestamp": "$(get_timestamp)",
        "total_score": $total_score,
        "total_issues": $total_issues,
        "files_analyzed": ${REVIEW_RESULTS["files_analyzed"]},
        "grade": "$(if [ $total_score -ge 90 ]; then echo "A"; elif [ $total_score -ge 80 ]; then echo "B"; elif [ $total_score -ge 70 ]; then echo "C"; elif [ $total_score -ge 60 ]; then echo "D"; else echo "F"; fi)"
    },
    "detailed_scores": {
        "code_quality": {
            "score": ${REVIEW_RESULTS["code_quality_score"]},
            "weight": 25,
            "issues": ${REVIEW_RESULTS["code_quality_issues"]}
        },
        "security": {
            "score": ${REVIEW_RESULTS["security_score"]},
            "weight": 20,
            "vulnerabilities": ${REVIEW_RESULTS["vulnerabilities"]},
            "security_issues": "${REVIEW_RESULTS["security_issues"]}"
        },
        "performance": {
            "score": ${REVIEW_RESULTS["performance_score"]},
            "weight": 20,
            "issues": ${REVIEW_RESULTS["performance_issues"]},
            "bundle_size_mb": ${REVIEW_RESULTS["bundle_size_mb"]}
        },
        "accessibility": {
            "score": ${REVIEW_RESULTS["accessibility_score"]},
            "weight": 20,
            "issues": ${REVIEW_RESULTS["accessibility_issues"]}
        },
        "testing": {
            "score": ${REVIEW_RESULTS["test_score"]},
            "weight": 15,
            "issues": ${REVIEW_RESULTS["test_issues"]},
            "test_files": ${REVIEW_RESULTS["test_files"]},
            "source_files": ${REVIEW_RESULTS["source_files"]}
        }
    },
    "recommendations": [
        $(if [ ${REVIEW_RESULTS["code_quality_score"]} -lt 80 ]; then echo "\"ESLint・TypeScriptエラーの修復を優先してください\""; fi)
        $(if [ ${REVIEW_RESULTS["security_score"]} -lt 80 ]; then echo ",\"セキュリティ脆弱性の修復が必要です\""; fi)
        $(if [ ${REVIEW_RESULTS["performance_score"]} -lt 80 ]; then echo ",\"パフォーマンス最適化を実施してください\""; fi)
        $(if [ ${REVIEW_RESULTS["accessibility_score"]} -lt 80 ]; then echo ",\"アクセシビリティの改善が必要です\""; fi)
        $(if [ ${REVIEW_RESULTS["test_score"]} -lt 60 ]; then echo ",\"テストカバレッジの向上が急務です\""; fi)
    ]
}
EOF

    print_success "レビューレポートを保存しました: $REVIEW_REPORT"
    
    # サマリー表示
    echo ""
    print_section "=== WebUI自動レビュー結果サマリー ==="
    echo -e "${BOLD}総合スコア: ${total_score}/100${NC}"
    echo -e "${BOLD}総合グレード: $(if [ $total_score -ge 90 ]; then echo -e "${GREEN}A${NC}"; elif [ $total_score -ge 80 ]; then echo -e "${BLUE}B${NC}"; elif [ $total_score -ge 70 ]; then echo -e "${YELLOW}C${NC}"; elif [ $total_score -ge 60 ]; then echo -e "${YELLOW}D${NC}"; else echo -e "${RED}F${NC}"; fi)${NC}"
    echo -e "${BOLD}総問題数: ${total_issues}${NC}"
    echo ""
    echo "詳細スコア:"
    echo "  コード品質: ${REVIEW_RESULTS["code_quality_score"]}/100 (重み 25%)"
    echo "  セキュリティ: ${REVIEW_RESULTS["security_score"]}/100 (重み 20%)"
    echo "  パフォーマンス: ${REVIEW_RESULTS["performance_score"]}/100 (重み 20%)"
    echo "  アクセシビリティ: ${REVIEW_RESULTS["accessibility_score"]}/100 (重み 20%)"
    echo "  テストカバレッジ: ${REVIEW_RESULTS["test_score"]}/100 (重み 15%)"
}

# =========================
# メイン実行
# =========================

main() {
    print_section "WebUI自動コードレビューシステム開始"
    
    # 環境チェック
    if [ ! -d "$WEBUI_SRC" ]; then
        print_error "WebUIソースディレクトリが見つかりません: $WEBUI_SRC"
        exit 1
    fi
    
    # ログディレクトリ作成
    mkdir -p "$LOG_DIR"
    
    # 各分析実行
    analyze_code_quality
    analyze_security
    analyze_performance
    analyze_accessibility
    analyze_test_coverage
    
    # 総合レポート生成
    generate_review_report
    
    print_success "WebUI自動コードレビューが完了しました"
    
    # 終了コード決定
    local total_score=$(( 
        (REVIEW_RESULTS["code_quality_score"] * 25 / 100) + 
        (REVIEW_RESULTS["security_score"] * 20 / 100) + 
        (REVIEW_RESULTS["performance_score"] * 20 / 100) + 
        (REVIEW_RESULTS["accessibility_score"] * 20 / 100) + 
        (REVIEW_RESULTS["test_score"] * 15 / 100)
    ))
    
    if [ $total_score -ge 80 ]; then
        exit 0  # 成功
    elif [ $total_score -ge 60 ]; then
        exit 1  # 警告
    else
        exit 2  # エラー
    fi
}

# スクリプト実行
main "$@"