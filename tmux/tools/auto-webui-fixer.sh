#!/bin/bash

# ==================================================================
# WebUI自動開発・修復ループシステム v1.0
# tmux並列開発環境 + VSCode統合対応
# ==================================================================

set -euo pipefail

# =========================
# 設定・定数定義
# =========================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly SRC_DIR="$PROJECT_ROOT/src"
readonly LOG_DIR="$PROJECT_ROOT/logs/auto-fixer"
readonly REPORT_DIR="$PROJECT_ROOT/reports/auto-fixer"

# ログファイル設定
readonly TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
readonly MAIN_LOG="$LOG_DIR/auto-fixer-${TIMESTAMP}.log"
readonly ERROR_LOG="$LOG_DIR/auto-fixer-errors-${TIMESTAMP}.log"
readonly PROGRESS_LOG="$LOG_DIR/auto-fixer-progress-${TIMESTAMP}.log"

# 修復設定
readonly MAX_LOOPS=20
readonly CURRENT_LOOP_FILE="$LOG_DIR/.current_loop"
readonly SUCCESS_THRESHOLD=85  # 85%以上の成功率で完了

# tmuxセッション設定
readonly TMUX_SESSION="itsm-requirement"
readonly FEATURE_A_PANE=4
readonly FEATURE_B_PANE=0
readonly FEATURE_C_PANE=1
readonly FEATURE_D_PANE=2
readonly FEATURE_E_PANE=3

# 色設定
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

# =========================
# 初期化・前処理
# =========================

init_system() {
    echo -e "${BOLD}${BLUE}🚀 WebUI自動開発・修復ループシステム v1.0${NC}"
    echo -e "${CYAN}📅 開始時刻: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""
    
    # ディレクトリ作成
    mkdir -p "$LOG_DIR" "$REPORT_DIR"
    
    # ログファイル初期化
    echo "=== WebUI自動修復ループ開始 ===" > "$MAIN_LOG"
    echo "開始時刻: $(date)" >> "$MAIN_LOG"
    echo "" > "$ERROR_LOG"
    echo "LOOP,TIMESTAMP,FEATURE,STATUS,MESSAGE" > "$PROGRESS_LOG"
    
    # 現在ループ初期化
    echo "0" > "$CURRENT_LOOP_FILE"
    
    # tmuxセッション確認
    if ! tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
        echo -e "${RED}❌ tmuxセッション '$TMUX_SESSION' が見つかりません${NC}"
        echo -e "${YELLOW}💡 'cd tmux && ./start-development.sh' で開発環境を起動してください${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ システム初期化完了${NC}"
    echo -e "${BLUE}📁 プロジェクトルート: $PROJECT_ROOT${NC}"
    echo -e "${BLUE}📂 ソースディレクトリ: $SRC_DIR${NC}"
    echo -e "${BLUE}📋 ログディレクトリ: $LOG_DIR${NC}"
    echo ""
}

# =========================
# 修復対象分析
# =========================

analyze_repair_targets() {
    local loop_num=$1
    echo -e "${BOLD}${PURPLE}🔍 Loop $loop_num: 修復対象分析開始${NC}"
    
    local analysis_file="$REPORT_DIR/analysis-loop-${loop_num}.json"
    
    # TypeScript エラー分析
    echo "TypeScriptエラー分析中..." | tee -a "$MAIN_LOG"
    cd "$PROJECT_ROOT"
    local ts_errors=0
    if ! npm run typecheck 2>/dev/null; then
        ts_errors=$(npm run typecheck 2>&1 | grep -c "error TS" || echo "0")
    fi
    
    # ESLint エラー分析  
    echo "ESLintエラー分析中..." | tee -a "$MAIN_LOG"
    local eslint_errors=0
    if ! npm run lint 2>/dev/null; then
        eslint_errors=$(npm run lint 2>&1 | grep -c "error" || echo "0")
    fi
    
    # テストエラー分析
    echo "テストエラー分析中..." | tee -a "$MAIN_LOG"
    local test_errors=0
    if ! npm test -- --passWithNoTests --silent 2>/dev/null; then
        test_errors=$(npm test -- --passWithNoTests 2>&1 | grep -c "FAIL" || echo "0")
    fi
    
    # ファイル統計
    local total_files=$(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | wc -l)
    local component_files=$(find "$SRC_DIR/components" -name "*.tsx" 2>/dev/null | wc -l || echo "0")
    local service_files=$(find "$SRC_DIR/services" -name "*.ts" 2>/dev/null | wc -l || echo "0")
    local type_files=$(find "$SRC_DIR/types" -name "*.ts" 2>/dev/null | wc -l || echo "0")
    
    # JSON レポート生成
    cat > "$analysis_file" << EOF
{
  "loop": $loop_num,
  "timestamp": "$(date -Iseconds)",
  "errors": {
    "typescript": $ts_errors,
    "eslint": $eslint_errors,
    "tests": $test_errors,
    "total": $((ts_errors + eslint_errors + test_errors))
  },
  "files": {
    "total": $total_files,
    "components": $component_files,
    "services": $service_files,
    "types": $type_files
  },
  "priority_areas": [
    "React Component Optimization",
    "TypeScript Type Safety",
    "API Service Enhancement", 
    "Accessibility Improvements",
    "Performance Optimization"
  ]
}
EOF
    
    echo -e "${GREEN}📊 分析完了:${NC} TS:$ts_errors, ESLint:$eslint_errors, Test:$test_errors エラー"
    echo -e "${BLUE}📁 ファイル:${NC} 総計:$total_files (コンポーネント:$component_files, サービス:$service_files, 型:$type_files)"
    
    # 進捗ログ記録
    echo "$loop_num,$(date -Iseconds),ANALYSIS,COMPLETED,TS:$ts_errors ESLint:$eslint_errors Test:$test_errors" >> "$PROGRESS_LOG"
    
    return $((ts_errors + eslint_errors + test_errors))
}

# =========================
# 並列ペイン修復実行
# =========================

execute_feature_repairs() {
    local loop_num=$1
    echo -e "${BOLD}${CYAN}⚙️ Loop $loop_num: 並列修復実行開始${NC}"
    
    local repair_start_time=$(date +%s)
    
    # Feature-B: React/TSX コンポーネント最適化
    execute_feature_b_repair "$loop_num" &
    local pid_b=$!
    
    # Feature-C: API サービス・型定義修復
    execute_feature_c_repair "$loop_num" &
    local pid_c=$!
    
    # Feature-D: PowerShell 統合部分
    execute_feature_d_repair "$loop_num" &
    local pid_d=$!
    
    # Feature-E: 品質・セキュリティ監査
    execute_feature_e_repair "$loop_num" &
    local pid_e=$!
    
    echo -e "${YELLOW}⏳ 並列修復実行中... (PID: B:$pid_b C:$pid_c D:$pid_d E:$pid_e)${NC}"
    
    # 並列処理完了待機
    wait $pid_b && echo -e "${GREEN}✅ Feature-B 完了${NC}" || echo -e "${RED}❌ Feature-B エラー${NC}"
    wait $pid_c && echo -e "${GREEN}✅ Feature-C 完了${NC}" || echo -e "${RED}❌ Feature-C エラー${NC}"
    wait $pid_d && echo -e "${GREEN}✅ Feature-D 完了${NC}" || echo -e "${RED}❌ Feature-D エラー${NC}"
    wait $pid_e && echo -e "${GREEN}✅ Feature-E 完了${NC}" || echo -e "${RED}❌ Feature-E エラー${NC}"
    
    local repair_end_time=$(date +%s)
    local repair_duration=$((repair_end_time - repair_start_time))
    
    echo -e "${CYAN}⏱️ 並列修復時間: ${repair_duration}秒${NC}"
    echo "$loop_num,$(date -Iseconds),PARALLEL,COMPLETED,Duration:${repair_duration}s" >> "$PROGRESS_LOG"
}

# Feature-B: React/TSX コンポーネント最適化
execute_feature_b_repair() {
    local loop_num=$1
    echo "Feature-B修復開始 (Loop $loop_num)" >> "$MAIN_LOG"
    
    # tmux ペインにコマンド送信
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_B_PANE" "echo '=== Feature-B UI最適化ループ $loop_num ==='" Enter
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_B_PANE" "cd $PROJECT_ROOT" Enter
    
    # React コンポーネント最適化コマンド
    local feature_b_cmd="claude 'Loop $loop_num: React 19 + TypeScript最適化を実行。
    1. src/components/ 内の.tsxファイルを分析
    2. React.memo、useCallback、useMemo最適化
    3. アクセシビリティ属性追加・改善
    4. PropTypes→TypeScript型変換
    5. パフォーマンス問題を自動修正
    最大5ファイルまで同時処理してください。'"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_B_PANE" "$feature_b_cmd" Enter
    
    echo "$loop_num,$(date -Iseconds),FEATURE-B,STARTED,React Component Optimization" >> "$PROGRESS_LOG"
    
    # 完了待機 (最大10分)
    sleep 600
    
    echo "$loop_num,$(date -Iseconds),FEATURE-B,COMPLETED,React optimization finished" >> "$PROGRESS_LOG"
}

# Feature-C: API サービス・型定義修復
execute_feature_c_repair() {
    local loop_num=$1
    echo "Feature-C修復開始 (Loop $loop_num)" >> "$MAIN_LOG"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_C_PANE" "echo '=== Feature-C API最適化ループ $loop_num ==='" Enter
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_C_PANE" "cd $PROJECT_ROOT" Enter
    
    local feature_c_cmd="claude 'Loop $loop_num: Node.js APIサービス最適化実行。
    1. src/services/ 内のAPIサービス分析・修復
    2. src/types/ 内の型定義強化
    3. async/await エラーハンドリング改善
    4. TypeScript strict モード対応
    5. API レスポンス型安全性向上
    最大3サービスファイルまで同時処理してください。'"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_C_PANE" "$feature_c_cmd" Enter
    
    echo "$loop_num,$(date -Iseconds),FEATURE-C,STARTED,API Service Enhancement" >> "$PROGRESS_LOG"
    
    sleep 600
    
    echo "$loop_num,$(date -Iseconds),FEATURE-C,COMPLETED,API enhancement finished" >> "$PROGRESS_LOG"
}

# Feature-D: PowerShell 統合部分  
execute_feature_d_repair() {
    local loop_num=$1
    echo "Feature-D修復開始 (Loop $loop_num)" >> "$MAIN_LOG"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_D_PANE" "echo '=== Feature-D PowerShell統合ループ $loop_num ==='" Enter
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_D_PANE" "cd $PROJECT_ROOT" Enter
    
    local feature_d_cmd="claude 'Loop $loop_num: PowerShell統合最適化実行。
    1. WebUI-PowerShell連携コードレビュー
    2. バックエンドAPI接続最適化
    3. エラーハンドリング強化
    4. セキュリティ設定チェック
    5. Windows統合機能改善
    PowerShell関連ファイルを集中修復してください。'"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_D_PANE" "$feature_d_cmd" Enter
    
    echo "$loop_num,$(date -Iseconds),FEATURE-D,STARTED,PowerShell Integration" >> "$PROGRESS_LOG"
    
    sleep 600
    
    echo "$loop_num,$(date -Iseconds),FEATURE-D,COMPLETED,PowerShell integration finished" >> "$PROGRESS_LOG"
}

# Feature-E: 品質・セキュリティ監査
execute_feature_e_repair() {
    local loop_num=$1
    echo "Feature-E修復開始 (Loop $loop_num)" >> "$MAIN_LOG"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_E_PANE" "echo '=== Feature-E 品質監査ループ $loop_num ==='" Enter
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_E_PANE" "cd $PROJECT_ROOT" Enter
    
    local feature_e_cmd="claude 'Loop $loop_num: 包括的品質・セキュリティ監査実行。
    1. ESLint・Prettier設定最適化
    2. セキュリティ脆弱性スキャン
    3. アクセシビリティ監査(WCAG 2.1)
    4. パフォーマンス最適化提案
    5. コード品質メトリクス測定
    総合的な品質向上を実施してください。'"
    
    tmux send-keys -t "$TMUX_SESSION:$FEATURE_E_PANE" "$feature_e_cmd" Enter
    
    echo "$loop_num,$(date -Iseconds),FEATURE-E,STARTED,Quality & Security Audit" >> "$PROGRESS_LOG"
    
    sleep 600
    
    echo "$loop_num,$(date -Iseconds),FEATURE-E,COMPLETED,Quality audit finished" >> "$PROGRESS_LOG"
}

# =========================
# 品質チェック・検証
# =========================

validate_repairs() {
    local loop_num=$1
    echo -e "${BOLD}${GREEN}🔍 Loop $loop_num: 修復結果検証開始${NC}"
    
    cd "$PROJECT_ROOT"
    local validation_start_time=$(date +%s)
    
    # TypeScript コンパイルチェック
    echo "TypeScript検証中..." | tee -a "$MAIN_LOG"
    local ts_success=false
    if npm run typecheck > /dev/null 2>&1; then
        ts_success=true
        echo -e "${GREEN}✅ TypeScript: 合格${NC}"
    else
        echo -e "${RED}❌ TypeScript: エラーあり${NC}"
    fi
    
    # ESLint チェック
    echo "ESLint検証中..." | tee -a "$MAIN_LOG"
    local eslint_success=false
    if npm run lint > /dev/null 2>&1; then
        eslint_success=true
        echo -e "${GREEN}✅ ESLint: 合格${NC}"
    else
        echo -e "${RED}❌ ESLint: エラーあり${NC}"
    fi
    
    # テスト実行
    echo "テスト検証中..." | tee -a "$MAIN_LOG"
    local test_success=false
    if npm test -- --passWithNoTests --silent > /dev/null 2>&1; then
        test_success=true
        echo -e "${GREEN}✅ Tests: 合格${NC}"
    else
        echo -e "${RED}❌ Tests: 失敗あり${NC}"
    fi
    
    # ビルドテスト
    echo "ビルド検証中..." | tee -a "$MAIN_LOG"
    local build_success=false
    if npm run build > /dev/null 2>&1; then
        build_success=true
        echo -e "${GREEN}✅ Build: 成功${NC}"
    else
        echo -e "${RED}❌ Build: 失敗${NC}"
    fi
    
    local validation_end_time=$(date +%s)
    local validation_duration=$((validation_end_time - validation_start_time))
    
    # 成功率計算
    local passed_checks=0
    $ts_success && ((passed_checks++))
    $eslint_success && ((passed_checks++))
    $test_success && ((passed_checks++))
    $build_success && ((passed_checks++))
    
    local success_rate=$(( (passed_checks * 100) / 4 ))
    
    echo -e "${CYAN}📊 検証結果: ${passed_checks}/4 合格 (成功率: ${success_rate}%)${NC}"
    echo -e "${BLUE}⏱️ 検証時間: ${validation_duration}秒${NC}"
    
    # 進捗ログ記録
    echo "$loop_num,$(date -Iseconds),VALIDATION,COMPLETED,SuccessRate:${success_rate}% Duration:${validation_duration}s" >> "$PROGRESS_LOG"
    
    return $success_rate
}

# =========================
# レポート生成
# =========================

generate_loop_report() {
    local loop_num=$1
    local success_rate=$2
    
    local report_file="$REPORT_DIR/loop-${loop_num}-report.json"
    
    # ファイル統計収集
    local total_files=$(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | wc -l)
    local total_lines=$(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" -exec cat {} \; | wc -l)
    
    # Git統計 (差分がある場合)
    local changed_files=0
    if git status --porcelain | grep -q .; then
        changed_files=$(git status --porcelain | wc -l)
    fi
    
    cat > "$report_file" << EOF
{
  "loop": $loop_num,
  "timestamp": "$(date -Iseconds)",
  "success_rate": $success_rate,
  "validation": {
    "typescript": $(npm run typecheck > /dev/null 2>&1 && echo "true" || echo "false"),
    "eslint": $(npm run lint > /dev/null 2>&1 && echo "true" || echo "false"),
    "tests": $(npm test -- --passWithNoTests --silent > /dev/null 2>&1 && echo "true" || echo "false"),
    "build": $(npm run build > /dev/null 2>&1 && echo "true" || echo "false")
  },
  "statistics": {
    "total_files": $total_files,
    "total_lines": $total_lines,
    "changed_files": $changed_files
  },
  "features_executed": [
    "Feature-B: React Component Optimization",
    "Feature-C: API Service Enhancement", 
    "Feature-D: PowerShell Integration",
    "Feature-E: Quality & Security Audit"
  ]
}
EOF
    
    echo -e "${PURPLE}📋 Loop $loop_num レポート生成完了: $report_file${NC}"
}

# =========================
# 進捗監視
# =========================

monitor_progress() {
    local current_loop=$(cat "$CURRENT_LOOP_FILE")
    echo -e "${BOLD}${BLUE}📊 進捗監視ダッシュボード${NC}"
    echo -e "${CYAN}======================================${NC}"
    echo -e "${YELLOW}現在のループ:${NC} $current_loop / $MAX_LOOPS"
    echo -e "${YELLOW}進捗率:${NC} $(( (current_loop * 100) / MAX_LOOPS ))%"
    echo ""
    
    # 最新のログエントリ表示
    if [[ -f "$PROGRESS_LOG" ]]; then
        echo -e "${BOLD}📋 最新の進捗ログ (最新5件):${NC}"
        tail -n 5 "$PROGRESS_LOG" | while IFS=',' read -r loop timestamp feature status message; do
            echo -e "${BLUE}Loop $loop${NC} | ${GREEN}$feature${NC} | $status | $message"
        done
    fi
    echo ""
}

# =========================
# 最終レポート生成
# =========================

generate_final_report() {
    echo -e "${BOLD}${PURPLE}📋 最終レポート生成開始${NC}"
    
    local final_report="$REPORT_DIR/final-report-${TIMESTAMP}.json"
    local total_loops=$(cat "$CURRENT_LOOP_FILE")
    
    # 全ループの成功率集計
    local total_success_rate=0
    local completed_loops=0
    
    for (( i=1; i<=total_loops; i++ )); do
        local loop_report="$REPORT_DIR/loop-${i}-report.json"
        if [[ -f "$loop_report" ]]; then
            local rate=$(jq -r '.success_rate' "$loop_report" 2>/dev/null || echo "0")
            total_success_rate=$((total_success_rate + rate))
            ((completed_loops++))
        fi
    done
    
    local average_success_rate=0
    if [[ $completed_loops -gt 0 ]]; then
        average_success_rate=$((total_success_rate / completed_loops))
    fi
    
    # 最終統計
    local final_files=$(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" | wc -l)
    local final_lines=$(find "$SRC_DIR" -name "*.ts" -o -name "*.tsx" -exec cat {} \; | wc -l)
    
    cat > "$final_report" << EOF
{
  "project": "ServiceGrid WebUI Auto-Repair System",
  "version": "1.0",
  "execution": {
    "start_time": "$TIMESTAMP",
    "end_time": "$(date -Iseconds)",
    "total_loops": $total_loops,
    "max_loops": $MAX_LOOPS,
    "completed_loops": $completed_loops
  },
  "results": {
    "average_success_rate": $average_success_rate,
    "final_validation": {
      "typescript": $(npm run typecheck > /dev/null 2>&1 && echo "true" || echo "false"),
      "eslint": $(npm run lint > /dev/null 2>&1 && echo "true" || echo "false"),
      "tests": $(npm test -- --passWithNoTests --silent > /dev/null 2>&1 && echo "true" || echo "false"),
      "build": $(npm run build > /dev/null 2>&1 && echo "true" || echo "false")
    }
  },
  "statistics": {
    "final_files": $final_files,
    "final_lines": $final_lines
  },
  "features": [
    "Feature-B: React Component Optimization",
    "Feature-C: API Service Enhancement",
    "Feature-D: PowerShell Integration", 
    "Feature-E: Quality & Security Audit"
  ],
  "logs": {
    "main_log": "$MAIN_LOG",
    "error_log": "$ERROR_LOG", 
    "progress_log": "$PROGRESS_LOG"
  }
}
EOF
    
    echo -e "${GREEN}📋 最終レポート生成完了: $final_report${NC}"
    echo -e "${BOLD}${CYAN}🎯 実行サマリー:${NC}"
    echo -e "${YELLOW}   完了ループ:${NC} $completed_loops / $total_loops"
    echo -e "${YELLOW}   平均成功率:${NC} $average_success_rate%"
    echo -e "${YELLOW}   最終ファイル数:${NC} $final_files"
    echo -e "${YELLOW}   最終行数:${NC} $final_lines"
}

# =========================
# メインループ実行
# =========================

run_auto_repair_loops() {
    echo -e "${BOLD}${GREEN}🚀 自動修復ループ開始 (最大 $MAX_LOOPS ループ)${NC}"
    echo ""
    
    for (( loop=1; loop<=MAX_LOOPS; loop++ )); do
        echo "$loop" > "$CURRENT_LOOP_FILE"
        
        echo -e "${BOLD}${BLUE}================================================${NC}"
        echo -e "${BOLD}${BLUE}🔄 Loop $loop / $MAX_LOOPS 実行開始${NC}"
        echo -e "${BOLD}${BLUE}================================================${NC}"
        
        # 1. 修復対象分析
        analyze_repair_targets "$loop"
        local initial_errors=$?
        
        # エラーがない場合は早期終了
        if [[ $initial_errors -eq 0 ]]; then
            echo -e "${GREEN}🎉 エラーが検出されませんでした。修復完了!${NC}"
            break
        fi
        
        # 2. 並列修復実行
        execute_feature_repairs "$loop"
        
        # 3. 修復結果検証
        validate_repairs "$loop"
        local success_rate=$?
        
        # 4. ループレポート生成
        generate_loop_report "$loop" "$success_rate"
        
        # 5. 進捗監視表示
        monitor_progress
        
        # 成功率チェック
        if [[ $success_rate -ge $SUCCESS_THRESHOLD ]]; then
            echo -e "${GREEN}🎯 成功率 $success_rate% が閾値 $SUCCESS_THRESHOLD% に達しました!${NC}"
            echo -e "${GREEN}✅ 修復ループ正常完了${NC}"
            break
        fi
        
        echo -e "${YELLOW}⏳ 次のループまで30秒待機...${NC}"
        sleep 30
        echo ""
    done
    
    # 最終レポート生成
    generate_final_report
    
    echo -e "${BOLD}${GREEN}🏁 WebUI自動修復ループシステム完了${NC}"
    echo -e "${CYAN}📅 終了時刻: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
}

# =========================
# エラーハンドリング
# =========================

error_handler() {
    local exit_code=$?
    local line_number=$1
    
    echo -e "${RED}❌ エラーが発生しました (Exit Code: $exit_code, Line: $line_number)${NC}" | tee -a "$ERROR_LOG"
    echo "エラー詳細: $(date) - Exit Code: $exit_code, Line: $line_number" >> "$ERROR_LOG"
    
    # クリーンアップ処理
    cleanup
    
    exit $exit_code
}

cleanup() {
    echo -e "${YELLOW}🧹 クリーンアップ処理実行中...${NC}"
    
    # 一時ファイル削除（必要に応じて）
    # プロセス終了処理（必要に応じて）
    
    echo -e "${GREEN}✅ クリーンアップ完了${NC}"
}

# =========================
# メイン実行部
# =========================

main() {
    # エラートラップ設定
    trap 'error_handler $LINENO' ERR
    trap cleanup EXIT
    
    # システム初期化
    init_system
    
    # 自動修復ループ実行
    run_auto_repair_loops
    
    echo -e "${BOLD}${GREEN}🎉 WebUI自動開発・修復ループシステム実行完了!${NC}"
}

# ヘルプ表示
show_help() {
    echo "WebUI自動開発・修復ループシステム v1.0"
    echo ""
    echo "使用方法:"
    echo "  $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  -h, --help     このヘルプを表示"
    echo "  -m, --monitor  進捗監視モードで実行"
    echo "  -r, --report   最新のレポートを表示"
    echo ""
    echo "例:"
    echo "  $0                    # 自動修復ループを実行"
    echo "  $0 --monitor          # 進捗監視のみ"
    echo "  $0 --report           # レポート表示のみ"
}

# =========================
# コマンドライン引数処理
# =========================

case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -m|--monitor)
        init_system
        monitor_progress
        exit 0
        ;;
    -r|--report)
        init_system
        if [[ -f "$REPORT_DIR/final-report-"*.json ]]; then
            latest_report=$(ls -t "$REPORT_DIR/final-report-"*.json | head -n 1)
            echo "最新の最終レポート: $latest_report"
            cat "$latest_report" | jq .
        else
            echo "最終レポートが見つかりません。"
        fi
        exit 0
        ;;
    "")
        main
        ;;
    *)
        echo "不明なオプション: $1"
        show_help
        exit 1
        ;;
esac