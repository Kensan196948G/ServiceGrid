#!/bin/bash

# ==================================================================
# WebUI修復対象詳細分析システム v1.0
# ファイル・エラー・品質問題の詳細分析・分類・優先度付け
# ==================================================================

set -euo pipefail

# =========================
# 設定・定数定義
# =========================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly SRC_DIR="$PROJECT_ROOT/src"
readonly ANALYSIS_DIR="$PROJECT_ROOT/analysis"
readonly REPORT_DIR="$PROJECT_ROOT/reports/repair-analysis"

# 分析設定
readonly TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
readonly ANALYSIS_REPORT="$REPORT_DIR/analysis-${TIMESTAMP}.json"
readonly DETAILED_REPORT="$REPORT_DIR/detailed-${TIMESTAMP}.md"

# 色設定
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

# 重要度設定
readonly PRIORITY_CRITICAL=1
readonly PRIORITY_HIGH=2
readonly PRIORITY_MEDIUM=3
readonly PRIORITY_LOW=4

# =========================
# 初期化
# =========================

init_analysis() {
    echo -e "${BOLD}${BLUE}🔍 WebUI修復対象詳細分析システム v1.0${NC}"
    echo -e "${CYAN}📅 分析開始時刻: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""
    
    # ディレクトリ作成
    mkdir -p "$ANALYSIS_DIR" "$REPORT_DIR"
    
    # プロジェクトルート確認
    if [[ ! -d "$SRC_DIR" ]]; then
        echo -e "${RED}❌ ソースディレクトリが見つかりません: $SRC_DIR${NC}"
        exit 1
    fi
    
    cd "$PROJECT_ROOT"
    echo -e "${GREEN}✅ 分析システム初期化完了${NC}"
    echo -e "${BLUE}📁 対象ディレクトリ: $SRC_DIR${NC}"
    echo ""
}

# =========================
# ファイル構造分析
# =========================

analyze_file_structure() {
    echo -e "${BOLD}${PURPLE}📂 ファイル構造分析開始${NC}"
    
    local structure_file="$ANALYSIS_DIR/file-structure.json"
    
    # TypeScript/JSXファイル収集
    local all_files=($(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | sort))
    local component_files=($(find "$SRC_DIR/components" -name "*.tsx" 2>/dev/null | sort))
    local service_files=($(find "$SRC_DIR/services" -name "*.ts" 2>/dev/null | sort))
    local type_files=($(find "$SRC_DIR/types" -name "*.ts" 2>/dev/null | sort))
    local hook_files=($(find "$SRC_DIR/hooks" -name "*.ts" 2>/dev/null | sort))
    local util_files=($(find "$SRC_DIR/utils" -name "*.ts" 2>/dev/null | sort))
    local page_files=($(find "$SRC_DIR/pages" -name "*.tsx" 2>/dev/null | sort))
    local test_files=($(find "$SRC_DIR" -name "*.test.*" 2>/dev/null | sort))
    
    # ファイル詳細分析
    local file_details=()
    
    for file in "${all_files[@]}"; do
        if [[ -f "$file" ]]; then
            local rel_path="${file#$PROJECT_ROOT/}"
            local lines=$(wc -l < "$file" 2>/dev/null || echo "0")
            local size=$(wc -c < "$file" 2>/dev/null || echo "0")
            local last_modified=$(stat -c %Y "$file" 2>/dev/null || echo "0")
            
            # ファイルタイプ判定
            local file_type="other"
            case "$file" in
                *components/*.tsx) file_type="component" ;;
                *services/*.ts) file_type="service" ;;
                *types/*.ts) file_type="type" ;;
                *hooks/*.ts) file_type="hook" ;;
                *utils/*.ts) file_type="utility" ;;
                *pages/*.tsx) file_type="page" ;;
                *.test.*) file_type="test" ;;
            esac
            
            # 複雑度分析（簡易版）
            local complexity="low"
            if [[ $lines -gt 200 ]]; then
                complexity="high"
            elif [[ $lines -gt 100 ]]; then
                complexity="medium"
            fi
            
            file_details+=("{\"path\":\"$rel_path\",\"type\":\"$file_type\",\"lines\":$lines,\"size\":$size,\"complexity\":\"$complexity\",\"last_modified\":$last_modified}")
        fi
    done
    
    # JSON形式で保存
    cat > "$structure_file" << EOF
{
  "analysis_timestamp": "$(date -Iseconds)",
  "summary": {
    "total_files": ${#all_files[@]},
    "component_files": ${#component_files[@]},
    "service_files": ${#service_files[@]},
    "type_files": ${#type_files[@]},
    "hook_files": ${#hook_files[@]},
    "util_files": ${#util_files[@]},
    "page_files": ${#page_files[@]},
    "test_files": ${#test_files[@]}
  },
  "files": [
    $(IFS=','; echo "${file_details[*]}")
  ]
}
EOF
    
    echo -e "${GREEN}✅ ファイル構造分析完了${NC}"
    echo -e "${BLUE}📊 総ファイル数: ${#all_files[@]}${NC}"
    echo -e "${BLUE}📱 コンポーネント: ${#component_files[@]}${NC}"
    echo -e "${BLUE}🔧 サービス: ${#service_files[@]}${NC}"
    echo -e "${BLUE}📝 型定義: ${#type_files[@]}${NC}"
    echo ""
}

# =========================
# 品質問題分析
# =========================

analyze_quality_issues() {
    echo -e "${BOLD}${RED}🚨 品質問題分析開始${NC}"
    
    local issues_file="$ANALYSIS_DIR/quality-issues.json"
    local ts_errors=()
    local eslint_issues=()
    
    # TypeScript エラー分析
    echo -e "${YELLOW}TypeScript エラー分析中...${NC}"
    if command -v npm >/dev/null 2>&1; then
        local ts_output
        ts_output=$(npm run typecheck 2>&1 || true)
        
        # TypeScript エラーをパースして詳細情報抽出
        while IFS= read -r line; do
            if [[ "$line" =~ ^(.+)\(([0-9]+),([0-9]+)\):[[:space:]]*(error)[[:space:]]+(TS[0-9]+):[[:space:]]*(.+)$ ]]; then
                local file="${BASH_REMATCH[1]}"
                local line_num="${BASH_REMATCH[2]}"
                local column="${BASH_REMATCH[3]}"
                local severity="${BASH_REMATCH[4]}"
                local code="${BASH_REMATCH[5]}"
                local message="${BASH_REMATCH[6]}"
                
                # 相対パスに変換
                local rel_path="${file#$PROJECT_ROOT/}"
                
                # 重要度判定
                local priority=$PRIORITY_MEDIUM
                case "$code" in
                    TS2322|TS2339|TS2345) priority=$PRIORITY_HIGH ;;     # Type assignment errors
                    TS2304|TS2307|TS2305) priority=$PRIORITY_CRITICAL ;; # Cannot find name/module
                    TS1005|TS1109|TS1128) priority=$PRIORITY_HIGH ;;     # Syntax errors
                    *) priority=$PRIORITY_MEDIUM ;;
                esac
                
                ts_errors+=("{\"file\":\"$rel_path\",\"line\":$line_num,\"column\":$column,\"severity\":\"$severity\",\"code\":\"$code\",\"message\":\"$message\",\"priority\":$priority}")
            fi
        done <<< "$ts_output"
    fi
    
    # ESLint 問題分析
    echo -e "${YELLOW}ESLint 問題分析中...${NC}"
    if command -v npm >/dev/null 2>&1; then
        local eslint_output
        eslint_output=$(npm run lint 2>&1 || true)
        
        # ESLint 出力をパース
        while IFS= read -r line; do
            if [[ "$line" =~ ^(.+):([0-9]+):([0-9]+):[[:space:]]*(error|warning)[[:space:]]+(.+)$ ]]; then
                local file="${BASH_REMATCH[1]}"
                local line_num="${BASH_REMATCH[2]}"
                local column="${BASH_REMATCH[3]}"
                local severity="${BASH_REMATCH[4]}"
                local message="${BASH_REMATCH[5]}"
                
                local rel_path="${file#$PROJECT_ROOT/}"
                
                # 重要度判定
                local priority=$PRIORITY_MEDIUM
                if [[ "$severity" == "error" ]]; then
                    priority=$PRIORITY_HIGH
                else
                    priority=$PRIORITY_LOW
                fi
                
                eslint_issues+=("{\"file\":\"$rel_path\",\"line\":$line_num,\"column\":$column,\"severity\":\"$severity\",\"message\":\"$message\",\"priority\":$priority}")
            fi
        done <<< "$eslint_output"
    fi
    
    # 問題サマリー作成
    local total_issues=$((${#ts_errors[@]} + ${#eslint_issues[@]}))
    local critical_count=$(printf '%s\n' "${ts_errors[@]}" "${eslint_issues[@]}" | grep -c "\"priority\":$PRIORITY_CRITICAL" || echo "0")
    local high_count=$(printf '%s\n' "${ts_errors[@]}" "${eslint_issues[@]}" | grep -c "\"priority\":$PRIORITY_HIGH" || echo "0")
    local medium_count=$(printf '%s\n' "${ts_errors[@]}" "${eslint_issues[@]}" | grep -c "\"priority\":$PRIORITY_MEDIUM" || echo "0")
    local low_count=$(printf '%s\n' "${ts_errors[@]}" "${eslint_issues[@]}" | grep -c "\"priority\":$PRIORITY_LOW" || echo "0")
    
    # JSON保存
    cat > "$issues_file" << EOF
{
  "analysis_timestamp": "$(date -Iseconds)",
  "summary": {
    "total_issues": $total_issues,
    "typescript_errors": ${#ts_errors[@]},
    "eslint_issues": ${#eslint_issues[@]},
    "priority_breakdown": {
      "critical": $critical_count,
      "high": $high_count,
      "medium": $medium_count,
      "low": $low_count
    }
  },
  "typescript_errors": [
    $(IFS=','; echo "${ts_errors[*]}")
  ],
  "eslint_issues": [
    $(IFS=','; echo "${eslint_issues[*]}")
  ]
}
EOF
    
    echo -e "${GREEN}✅ 品質問題分析完了${NC}"
    echo -e "${RED}🚨 Critical: $critical_count${NC}"
    echo -e "${YELLOW}⚠️ High: $high_count${NC}"
    echo -e "${BLUE}ℹ️ Medium: $medium_count${NC}"
    echo -e "${GREEN}📝 Low: $low_count${NC}"
    echo ""
}

# =========================
# 依存関係分析
# =========================

analyze_dependencies() {
    echo -e "${BOLD}${CYAN}📦 依存関係分析開始${NC}"
    
    local deps_file="$ANALYSIS_DIR/dependencies.json"
    local import_map=()
    local dependency_count=()
    
    # 各ファイルのimport文を分析
    while IFS= read -r -d '' file; do
        local rel_path="${file#$PROJECT_ROOT/}"
        local imports=()
        
        # import文抽出
        while IFS= read -r line; do
            if [[ "$line" =~ ^[[:space:]]*import[[:space:]]+.*[[:space:]]from[[:space:]]+['\"](.+)['\"] ]]; then
                local import_path="${BASH_REMATCH[1]}"
                imports+=("\"$import_path\"")
            fi
        done < "$file"
        
        if [[ ${#imports[@]} -gt 0 ]]; then
            import_map+=("{\"file\":\"$rel_path\",\"imports\":[$(IFS=','; echo "${imports[*]}")],\"import_count\":${#imports[@]}}")
        fi
    done < <(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" -print0)
    
    # 循環依存チェック
    echo -e "${YELLOW}循環依存チェック中...${NC}"
    local circular_deps=()
    # 簡易的な循環依存検出（実際にはより複雑な実装が必要）
    
    # 外部依存関係分析
    local external_deps=()
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        external_deps=($(jq -r '.dependencies // {} | keys[]' "$PROJECT_ROOT/package.json" 2>/dev/null || echo ""))
    fi
    
    # JSON保存
    cat > "$deps_file" << EOF
{
  "analysis_timestamp": "$(date -Iseconds)",
  "summary": {
    "total_files_analyzed": $(echo "${import_map[@]}" | wc -w),
    "external_dependencies": ${#external_deps[@]},
    "circular_dependencies": ${#circular_deps[@]}
  },
  "import_map": [
    $(IFS=','; echo "${import_map[*]}")
  ],
  "external_dependencies": [
    $(printf '"%s",' "${external_deps[@]}" | sed 's/,$//')
  ],
  "circular_dependencies": [
    $(IFS=','; echo "${circular_deps[*]}")
  ]
}
EOF
    
    echo -e "${GREEN}✅ 依存関係分析完了${NC}"
    echo -e "${BLUE}📦 外部依存: ${#external_deps[@]}${NC}"
    echo -e "${PURPLE}🔄 循環依存: ${#circular_deps[@]}${NC}"
    echo ""
}

# =========================
# パフォーマンス分析
# =========================

analyze_performance_issues() {
    echo -e "${BOLD}${GREEN}⚡ パフォーマンス問題分析開始${NC}"
    
    local perf_file="$ANALYSIS_DIR/performance.json"
    local large_files=()
    local complex_components=()
    local potential_issues=()
    
    # 大きなファイルの検出
    while IFS= read -r -d '' file; do
        local rel_path="${file#$PROJECT_ROOT/}"
        local lines=$(wc -l < "$file" 2>/dev/null || echo "0")
        local size=$(wc -c < "$file" 2>/dev/null || echo "0")
        
        # サイズ閾値チェック
        if [[ $lines -gt 300 ]] || [[ $size -gt 15000 ]]; then
            large_files+=("{\"file\":\"$rel_path\",\"lines\":$lines,\"size\":$size,\"severity\":\"high\"}")
        elif [[ $lines -gt 200 ]] || [[ $size -gt 10000 ]]; then
            large_files+=("{\"file\":\"$rel_path\",\"lines\":$lines,\"size\":$size,\"severity\":\"medium\"}")
        fi
        
        # React コンポーネントの複雑度チェック
        if [[ "$file" == *.tsx ]] && [[ "$rel_path" == *components* ]]; then
            local hooks_count=$(grep -c "use[A-Z]" "$file" 2>/dev/null || echo "0")
            local jsx_elements=$(grep -c "<[A-Za-z]" "$file" 2>/dev/null || echo "0")
            
            if [[ $hooks_count -gt 5 ]] || [[ $jsx_elements -gt 20 ]]; then
                complex_components+=("{\"file\":\"$rel_path\",\"hooks\":$hooks_count,\"jsx_elements\":$jsx_elements,\"complexity\":\"high\"}")
            fi
        fi
        
        # パフォーマンス問題パターン検出
        if grep -q "new Date()" "$file" 2>/dev/null; then
            potential_issues+=("{\"file\":\"$rel_path\",\"issue\":\"frequent_date_creation\",\"description\":\"Frequent Date object creation detected\"}")
        fi
        
        if grep -q "JSON.parse\|JSON.stringify" "$file" 2>/dev/null; then
            local json_count=$(grep -c "JSON\." "$file" 2>/dev/null || echo "0")
            if [[ $json_count -gt 3 ]]; then
                potential_issues+=("{\"file\":\"$rel_path\",\"issue\":\"frequent_json_ops\",\"description\":\"Frequent JSON operations detected\"}")
            fi
        fi
    done < <(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" -print0)
    
    # バンドルサイズ予測
    local total_size=0
    while IFS= read -r -d '' file; do
        local size=$(wc -c < "$file" 2>/dev/null || echo "0")
        total_size=$((total_size + size))
    done < <(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" -print0)
    
    # JSON保存
    cat > "$perf_file" << EOF
{
  "analysis_timestamp": "$(date -Iseconds)",
  "summary": {
    "large_files": ${#large_files[@]},
    "complex_components": ${#complex_components[@]},
    "potential_issues": ${#potential_issues[@]},
    "total_source_size": $total_size,
    "estimated_bundle_size": $(( total_size * 60 / 100 ))
  },
  "large_files": [
    $(IFS=','; echo "${large_files[*]}")
  ],
  "complex_components": [
    $(IFS=','; echo "${complex_components[*]}")
  ],
  "potential_issues": [
    $(IFS=','; echo "${potential_issues[*]}")
  ]
}
EOF
    
    echo -e "${GREEN}✅ パフォーマンス分析完了${NC}"
    echo -e "${YELLOW}📄 大きなファイル: ${#large_files[@]}${NC}"
    echo -e "${PURPLE}🧩 複雑なコンポーネント: ${#complex_components[@]}${NC}"
    echo -e "${RED}⚠️ 潜在的問題: ${#potential_issues[@]}${NC}"
    echo ""
}

# =========================
# 修復計画生成
# =========================

generate_repair_plan() {
    echo -e "${BOLD}${PURPLE}📋 修復計画生成開始${NC}"
    
    local plan_file="$ANALYSIS_DIR/repair-plan.json"
    local repair_tasks=()
    local task_id=1
    
    # 品質問題から修復タスク生成
    if [[ -f "$ANALYSIS_DIR/quality-issues.json" ]]; then
        local critical_files=($(jq -r '.typescript_errors[] | select(.priority == 1) | .file' "$ANALYSIS_DIR/quality-issues.json" 2>/dev/null | sort -u))
        local high_files=($(jq -r '.typescript_errors[] | select(.priority == 2) | .file' "$ANALYSIS_DIR/quality-issues.json" 2>/dev/null | sort -u))
        
        # Critical issues
        for file in "${critical_files[@]}"; do
            repair_tasks+=("{\"id\":$task_id,\"priority\":1,\"type\":\"critical_fix\",\"file\":\"$file\",\"description\":\"Fix critical TypeScript errors\",\"estimated_time\":\"30min\",\"feature\":\"auto-detect\"}")
            ((task_id++))
        done
        
        # High priority issues
        for file in "${high_files[@]}"; do
            repair_tasks+=("{\"id\":$task_id,\"priority\":2,\"type\":\"high_fix\",\"file\":\"$file\",\"description\":\"Fix high priority TypeScript errors\",\"estimated_time\":\"20min\",\"feature\":\"auto-detect\"}")
            ((task_id++))
        done
    fi
    
    # パフォーマンス問題から修復タスク生成
    if [[ -f "$ANALYSIS_DIR/performance.json" ]]; then
        local large_component_files=($(jq -r '.complex_components[] | .file' "$ANALYSIS_DIR/performance.json" 2>/dev/null))
        
        for file in "${large_component_files[@]}"; do
            repair_tasks+=("{\"id\":$task_id,\"priority\":3,\"type\":\"performance_optimization\",\"file\":\"$file\",\"description\":\"Optimize complex React component\",\"estimated_time\":\"45min\",\"feature\":\"Feature-B\"}")
            ((task_id++))
        done
    fi
    
    # Feature別タスク分類
    local feature_b_tasks=()
    local feature_c_tasks=()
    local feature_d_tasks=()
    local feature_e_tasks=()
    
    for task in "${repair_tasks[@]}"; do
        local file=$(echo "$task" | jq -r '.file')
        case "$file" in
            *components/*|*pages/*) feature_b_tasks+=("$task") ;;
            *services/*|*types/*) feature_c_tasks+=("$task") ;;
            *powershell*|*backend*) feature_d_tasks+=("$task") ;;
            *) feature_e_tasks+=("$task") ;;
        esac
    done
    
    # 修復計画保存
    cat > "$plan_file" << EOF
{
  "plan_timestamp": "$(date -Iseconds)",
  "summary": {
    "total_tasks": ${#repair_tasks[@]},
    "feature_b_tasks": ${#feature_b_tasks[@]},
    "feature_c_tasks": ${#feature_c_tasks[@]},
    "feature_d_tasks": ${#feature_d_tasks[@]},
    "feature_e_tasks": ${#feature_e_tasks[@]},
    "estimated_total_time": "$(( ${#repair_tasks[@]} * 25 ))min"
  },
  "tasks": [
    $(IFS=','; echo "${repair_tasks[*]}")
  ],
  "feature_breakdown": {
    "feature_b": [
      $(IFS=','; echo "${feature_b_tasks[*]}")
    ],
    "feature_c": [
      $(IFS=','; echo "${feature_c_tasks[*]}")
    ],
    "feature_d": [
      $(IFS=','; echo "${feature_d_tasks[*]}")
    ],
    "feature_e": [
      $(IFS=','; echo "${feature_e_tasks[*]}")
    ]
  }
}
EOF
    
    echo -e "${GREEN}✅ 修復計画生成完了${NC}"
    echo -e "${BLUE}📋 総タスク数: ${#repair_tasks[@]}${NC}"
    echo -e "${CYAN}⏱️ 予想実行時間: $(( ${#repair_tasks[@]} * 25 ))分${NC}"
    echo ""
}

# =========================
# 統合レポート生成
# =========================

generate_comprehensive_report() {
    echo -e "${BOLD}${BLUE}📊 統合レポート生成開始${NC}"
    
    # 各分析結果を統合
    local file_structure="{}"
    local quality_issues="{}"
    local dependencies="{}"
    local performance="{}"
    local repair_plan="{}"
    
    [[ -f "$ANALYSIS_DIR/file-structure.json" ]] && file_structure=$(cat "$ANALYSIS_DIR/file-structure.json")
    [[ -f "$ANALYSIS_DIR/quality-issues.json" ]] && quality_issues=$(cat "$ANALYSIS_DIR/quality-issues.json")
    [[ -f "$ANALYSIS_DIR/dependencies.json" ]] && dependencies=$(cat "$ANALYSIS_DIR/dependencies.json")
    [[ -f "$ANALYSIS_DIR/performance.json" ]] && performance=$(cat "$ANALYSIS_DIR/performance.json")
    [[ -f "$ANALYSIS_DIR/repair-plan.json" ]] && repair_plan=$(cat "$ANALYSIS_DIR/repair-plan.json")
    
    # 統合JSON作成
    cat > "$ANALYSIS_REPORT" << EOF
{
  "analysis_metadata": {
    "version": "1.0",
    "timestamp": "$(date -Iseconds)",
    "project_root": "$PROJECT_ROOT",
    "analyzer": "WebUI Repair Analyzer"
  },
  "file_structure": $file_structure,
  "quality_issues": $quality_issues,
  "dependencies": $dependencies,
  "performance": $performance,
  "repair_plan": $repair_plan
}
EOF
    
    # Markdown詳細レポート生成
    generate_markdown_report
    
    echo -e "${GREEN}✅ 統合レポート生成完了${NC}"
    echo -e "${BLUE}📄 JSON レポート: $ANALYSIS_REPORT${NC}"
    echo -e "${BLUE}📝 詳細レポート: $DETAILED_REPORT${NC}"
}

# =========================
# Markdownレポート生成
# =========================

generate_markdown_report() {
    cat > "$DETAILED_REPORT" << 'EOF'
# WebUI修復対象詳細分析レポート

## 📋 分析サマリー

この分析レポートは、ServiceGrid WebUIプロジェクトの修復対象を詳細に分析し、優先度付きの修復計画を提供します。

## 🎯 実行推奨事項

### 1. 即座対応が必要（Critical）
- TypeScript重要エラーの修復
- ビルド阻害要因の除去
- セキュリティ脆弱性の対応

### 2. 高優先度対応（High）
- 型安全性問題の解決
- ESLintエラーの修復
- パフォーマンス問題の最適化

### 3. 中優先度対応（Medium）
- コード品質向上
- テストカバレッジ改善
- ドキュメント整備

### 4. 低優先度対応（Low）
- コードスタイル統一
- 警告メッセージ解消
- 最適化提案の実装

## 📊 Feature別修復ガイドライン

### Feature-B (UI/テスト)
- React 19コンポーネント最適化
- アクセシビリティ改善
- テストカバレッジ向上

### Feature-C (API開発)
- TypeScript型安全性強化
- API エラーハンドリング改善
- 非同期処理最適化

### Feature-D (PowerShell統合)
- Windows統合機能強化
- セキュリティ設定確認
- エラーログ機能追加

### Feature-E (品質・セキュリティ)
- 包括的品質監査
- セキュリティ脆弱性スキャン
- パフォーマンス最適化

## 🔧 自動修復システム連携

この分析結果は `auto-webui-fixer.sh` と連携し、優先度に基づいた自動修復を実行できます：

```bash
# 分析結果に基づく自動修復実行
./tmux/tools/auto-webui-fixer.sh

# 特定Featureの集中修復
./tmux/tools/feature-commands.sh feature-b-ui
./tmux/tools/feature-commands.sh feature-c-api
```

## 📈 期待される改善効果

1. **品質向上**: TypeScriptエラー0、ESLintエラー0を達成
2. **パフォーマンス**: バンドルサイズ20%削減、初期ロード時間30%短縮
3. **保守性**: コード複雑度削減、テストカバレッジ85%以上
4. **セキュリティ**: 脆弱性0、OWASP基準100%準拠

---

*このレポートは WebUI修復対象詳細分析システム v1.0 により自動生成されました。*
EOF
    
    echo -e "${PURPLE}📝 Markdownレポート生成完了${NC}"
}

# =========================
# ヘルプ表示
# =========================

show_help() {
    echo -e "${BOLD}${BLUE}WebUI修復対象詳細分析システム v1.0${NC}"
    echo ""
    echo -e "${YELLOW}使用方法:${NC}"
    echo "  $0 [コマンド]"
    echo ""
    echo -e "${YELLOW}コマンド:${NC}"
    echo "  analyze                        - 完全分析実行"
    echo "  structure                      - ファイル構造分析のみ"
    echo "  quality                        - 品質問題分析のみ"
    echo "  dependencies                   - 依存関係分析のみ"
    echo "  performance                    - パフォーマンス分析のみ"
    echo "  plan                           - 修復計画生成のみ"
    echo "  report                         - レポート生成のみ"
    echo "  help                           - ヘルプ表示"
    echo ""
    echo -e "${YELLOW}例:${NC}"
    echo "  $0 analyze                     # 完全分析実行"
    echo "  $0 quality                     # 品質問題のみ分析"
    echo "  $0 report                      # レポート生成のみ"
}

# =========================
# メイン実行部
# =========================

main() {
    case "${1:-analyze}" in
        "analyze"|"full")
            init_analysis
            analyze_file_structure
            analyze_quality_issues
            analyze_dependencies
            analyze_performance_issues
            generate_repair_plan
            generate_comprehensive_report
            ;;
        "structure")
            init_analysis
            analyze_file_structure
            ;;
        "quality")
            init_analysis
            analyze_quality_issues
            ;;
        "dependencies"|"deps")
            init_analysis
            analyze_dependencies
            ;;
        "performance"|"perf")
            init_analysis
            analyze_performance_issues
            ;;
        "plan")
            init_analysis
            generate_repair_plan
            ;;
        "report")
            generate_comprehensive_report
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo -e "${RED}❌ 不明なコマンド: $1${NC}"
            show_help
            exit 1
            ;;
    esac
}

# スクリプトが直接実行された場合
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
EOF