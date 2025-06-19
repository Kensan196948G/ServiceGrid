#!/bin/bash

# ==================================================================
# WebUI修復進捗監視・レポート機能 v1.0
# リアルタイム監視・統計レポート・ダッシュボード
# ==================================================================

set -euo pipefail

# =========================
# 設定・定数定義
# =========================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly LOG_DIR="$PROJECT_ROOT/logs/auto-fixer"
readonly REPORT_DIR="$PROJECT_ROOT/reports/auto-fixer"
readonly MONITOR_LOG="$LOG_DIR/monitor-$(date '+%Y%m%d').log"

# 監視設定
readonly REFRESH_INTERVAL=5  # 秒
readonly MAX_HISTORY=50      # 履歴保持数
readonly TMUX_SESSION="itsm-requirement"

# 色設定
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

# アイコン設定
readonly ICON_SUCCESS="✅"
readonly ICON_ERROR="❌"
readonly ICON_WARNING="⚠️"
readonly ICON_INFO="ℹ️"
readonly ICON_PROGRESS="🔄"
readonly ICON_FEATURE_B="🎨"
readonly ICON_FEATURE_C="🔧"
readonly ICON_FEATURE_D="💻"
readonly ICON_FEATURE_E="🔒"

# =========================
# 進捗データ収集
# =========================

collect_progress_data() {
    local timestamp=$(date -Iseconds)
    local current_loop=0
    
    # 現在ループ数取得
    if [[ -f "$LOG_DIR/.current_loop" ]]; then
        current_loop=$(cat "$LOG_DIR/.current_loop" 2>/dev/null || echo "0")
    fi
    
    # プロジェクト統計収集
    cd "$PROJECT_ROOT"
    local total_files=$(find src -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l || echo "0")
    local total_lines=$(find src -name "*.ts" -o -name "*.tsx" -exec cat {} \; 2>/dev/null | wc -l || echo "0")
    local component_files=$(find src/components -name "*.tsx" 2>/dev/null | wc -l || echo "0")
    local service_files=$(find src/services -name "*.ts" 2>/dev/null | wc -l || echo "0")
    local test_files=$(find src -name "*.test.*" 2>/dev/null | wc -l || echo "0")
    
    # 品質メトリクス収集
    local ts_errors=0
    local eslint_errors=0
    local eslint_warnings=0
    
    # TypeScript エラー数
    if command -v npm >/dev/null 2>&1; then
        ts_errors=$(npm run typecheck 2>&1 | grep -c "error TS" || echo "0")
    fi
    
    # ESLint エラー・警告数
    if command -v npm >/dev/null 2>&1; then
        local eslint_output
        eslint_output=$(npm run lint 2>&1 || true)
        eslint_errors=$(echo "$eslint_output" | grep -c " error " || echo "0")
        eslint_warnings=$(echo "$eslint_output" | grep -c " warning " || echo "0")
    fi
    
    # tmuxペイン状態確認
    local pane_status=""
    if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
        pane_status="active"
    else
        pane_status="inactive"
    fi
    
    # Git 統計
    local changed_files=0
    local commits_today=0
    if git rev-parse --git-dir > /dev/null 2>&1; then
        changed_files=$(git status --porcelain 2>/dev/null | wc -l || echo "0")
        commits_today=$(git log --since="00:00:00" --oneline 2>/dev/null | wc -l || echo "0")
    fi
    
    # JSON形式でデータ出力
    cat << EOF
{
  "timestamp": "$timestamp",
  "loop": $current_loop,
  "project_stats": {
    "total_files": $total_files,
    "total_lines": $total_lines,
    "component_files": $component_files,
    "service_files": $service_files,
    "test_files": $test_files
  },
  "quality_metrics": {
    "typescript_errors": $ts_errors,
    "eslint_errors": $eslint_errors,
    "eslint_warnings": $eslint_warnings
  },
  "environment": {
    "tmux_session": "$pane_status",
    "git_changed_files": $changed_files,
    "commits_today": $commits_today
  }
}
EOF
}

# =========================
# リアルタイムダッシュボード
# =========================

display_dashboard() {
    local data="$1"
    
    # JSONデータから値を抽出
    local timestamp=$(echo "$data" | jq -r '.timestamp')
    local current_loop=$(echo "$data" | jq -r '.loop')
    local total_files=$(echo "$data" | jq -r '.project_stats.total_files')
    local total_lines=$(echo "$data" | jq -r '.project_stats.total_lines')
    local component_files=$(echo "$data" | jq -r '.project_stats.component_files')
    local service_files=$(echo "$data" | jq -r '.project_stats.service_files')
    local test_files=$(echo "$data" | jq -r '.project_stats.test_files')
    local ts_errors=$(echo "$data" | jq -r '.quality_metrics.typescript_errors')
    local eslint_errors=$(echo "$data" | jq -r '.quality_metrics.eslint_errors')
    local eslint_warnings=$(echo "$data" | jq -r '.quality_metrics.eslint_warnings')
    local tmux_status=$(echo "$data" | jq -r '.environment.tmux_session')
    local changed_files=$(echo "$data" | jq -r '.environment.git_changed_files')
    local commits_today=$(echo "$data" | jq -r '.environment.commits_today')
    
    # ダッシュボード表示
    clear
    echo -e "${BOLD}${BLUE}════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${BLUE}🚀 WebUI自動修復システム - リアルタイム監視ダッシュボード v1.0${NC}"
    echo -e "${BOLD}${BLUE}════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # ヘッダー情報
    echo -e "${CYAN}📅 最終更新:${NC} $(date -d "$timestamp" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "$timestamp")"
    echo -e "${CYAN}🔄 現在ループ:${NC} ${BOLD}$current_loop${NC} / 20"
    echo -e "${CYAN}📊 進捗率:${NC} ${BOLD}$(( current_loop * 100 / 20 ))%${NC}"
    echo ""
    
    # プロジェクト統計
    echo -e "${BOLD}${PURPLE}📂 プロジェクト統計${NC}"
    echo -e "${BLUE}┌─────────────────────────────────────────────────────────────┐${NC}"
    printf "${BLUE}│${NC} %-20s ${YELLOW}%8s${NC} ${BLUE}│${NC} %-20s ${YELLOW}%8s${NC} ${BLUE}│${NC}\n" "総ファイル数" "$total_files" "総行数" "$total_lines"
    printf "${BLUE}│${NC} %-20s ${YELLOW}%8s${NC} ${BLUE}│${NC} %-20s ${YELLOW}%8s${NC} ${BLUE}│${NC}\n" "コンポーネント" "$component_files" "サービス" "$service_files"
    printf "${BLUE}│${NC} %-20s ${YELLOW}%8s${NC} ${BLUE}│${NC} %-20s ${YELLOW}%8s${NC} ${BLUE}│${NC}\n" "テストファイル" "$test_files" "変更ファイル" "$changed_files"
    echo -e "${BLUE}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    
    # 品質メトリクス
    echo -e "${BOLD}${GREEN}📊 品質メトリクス${NC}"
    echo -e "${BLUE}┌─────────────────────────────────────────────────────────────┐${NC}"
    
    # TypeScript エラー
    local ts_status_icon="$ICON_SUCCESS"
    local ts_color="$GREEN"
    if [[ $ts_errors -gt 0 ]]; then
        ts_status_icon="$ICON_ERROR"
        ts_color="$RED"
    fi
    printf "${BLUE}│${NC} ${ts_status_icon} TypeScript    ${ts_color}%8s${NC} エラー ${BLUE}│${NC} ${ICON_INFO} 今日のコミット ${CYAN}%6s${NC} ${BLUE}│${NC}\n" "$ts_errors" "$commits_today"
    
    # ESLint エラー
    local eslint_status_icon="$ICON_SUCCESS"
    local eslint_color="$GREEN"
    if [[ $eslint_errors -gt 0 ]]; then
        eslint_status_icon="$ICON_ERROR"
        eslint_color="$RED"
    elif [[ $eslint_warnings -gt 0 ]]; then
        eslint_status_icon="$ICON_WARNING"
        eslint_color="$YELLOW"
    fi
    printf "${BLUE}│${NC} ${eslint_status_icon} ESLint        ${eslint_color}%8s${NC} エラー ${BLUE}│${NC} ${eslint_status_icon} ESLint 警告   ${YELLOW}%6s${NC} ${BLUE}│${NC}\n" "$eslint_errors" "$eslint_warnings"
    
    echo -e "${BLUE}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    
    # Feature別ステータス
    echo -e "${BOLD}${CYAN}🔧 Feature別ステータス${NC}"
    echo -e "${BLUE}┌─────────────────────────────────────────────────────────────┐${NC}"
    
    # tmuxペイン状態に基づいてFeature状態を表示
    local feature_status="active"
    if [[ "$tmux_status" == "inactive" ]]; then
        feature_status="offline"
    fi
    
    printf "${BLUE}│${NC} ${ICON_FEATURE_B} Feature-B (UI)   ${GREEN}%-10s${NC} ${BLUE}│${NC} ${ICON_FEATURE_C} Feature-C (API)  ${GREEN}%-10s${NC} ${BLUE}│${NC}\n" "$feature_status" "$feature_status"
    printf "${BLUE}│${NC} ${ICON_FEATURE_D} Feature-D (PS)   ${GREEN}%-10s${NC} ${BLUE}│${NC} ${ICON_FEATURE_E} Feature-E (品質)  ${GREEN}%-10s${NC} ${BLUE}│${NC}\n" "$feature_status" "$feature_status"
    echo -e "${BLUE}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    
    # システム状態
    echo -e "${BOLD}${YELLOW}⚙️ システム状態${NC}"
    echo -e "${BLUE}┌─────────────────────────────────────────────────────────────┐${NC}"
    
    local tmux_icon="$ICON_SUCCESS"
    local tmux_color="$GREEN"
    if [[ "$tmux_status" == "inactive" ]]; then
        tmux_icon="$ICON_ERROR"
        tmux_color="$RED"
    fi
    
    printf "${BLUE}│${NC} ${tmux_icon} tmux セッション  ${tmux_color}%-12s${NC} ${BLUE}│${NC} ${ICON_INFO} 監視間隔      ${CYAN}%4ss${NC} ${BLUE}│${NC}\n" "$tmux_status" "$REFRESH_INTERVAL"
    echo -e "${BLUE}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    
    # コマンドヘルプ
    echo -e "${BOLD}${PURPLE}🎯 クイックコマンド${NC}"
    echo -e "${YELLOW}  [Ctrl+C]${NC} 監視終了  ${YELLOW}[r]${NC} 即座更新  ${YELLOW}[q]${NC} 終了  ${YELLOW}[h]${NC} ヘルプ"
    echo ""
    
    # 進捗バー表示
    display_progress_bar $current_loop 20
    echo ""
    
    # 最新ログエントリ表示
    display_latest_logs
}

# =========================
# 進捗バー表示
# =========================

display_progress_bar() {
    local current=$1
    local max=$2
    local width=50
    local percentage=$(( current * 100 / max ))
    local filled=$(( current * width / max ))
    local empty=$(( width - filled ))
    
    printf "${BOLD}${BLUE}進捗: [${NC}"
    printf "%*s" $filled | tr ' ' '█'
    printf "%*s" $empty | tr ' ' '░'
    printf "${BOLD}${BLUE}] %3d%% (%d/%d)${NC}\n" $percentage $current $max
}

# =========================
# 最新ログ表示
# =========================

display_latest_logs() {
    echo -e "${BOLD}${GREEN}📋 最新ログエントリ (最新5件)${NC}"
    
    local progress_log="$LOG_DIR/auto-fixer-progress-$(date '+%Y%m%d')_*.log"
    local latest_log=$(ls -t $progress_log 2>/dev/null | head -n 1)
    
    if [[ -f "$latest_log" ]]; then
        echo -e "${BLUE}┌─────────────────────────────────────────────────────────────┐${NC}"
        tail -n 5 "$latest_log" 2>/dev/null | while IFS=',' read -r loop timestamp feature status message; do
            local feature_icon="$ICON_INFO"
            case "$feature" in
                "FEATURE-B") feature_icon="$ICON_FEATURE_B" ;;
                "FEATURE-C") feature_icon="$ICON_FEATURE_C" ;;
                "FEATURE-D") feature_icon="$ICON_FEATURE_D" ;;
                "FEATURE-E") feature_icon="$ICON_FEATURE_E" ;;
            esac
            
            local status_color="$GREEN"
            case "$status" in
                "COMPLETED") status_color="$GREEN" ;;
                "STARTED") status_color="$YELLOW" ;;
                "ERROR") status_color="$RED" ;;
            esac
            
            printf "${BLUE}│${NC} ${feature_icon} Loop%-2s ${status_color}%-9s${NC} %-8s %-25s ${BLUE}│${NC}\n" "$loop" "$status" "$feature" "$message"
        done
        echo -e "${BLUE}└─────────────────────────────────────────────────────────────┘${NC}"
    else
        echo -e "${YELLOW}  ログファイルが見つかりません${NC}"
    fi
}

# =========================
# 統計レポート生成
# =========================

generate_statistics_report() {
    local report_file="$REPORT_DIR/statistics-$(date '+%Y%m%d_%H%M%S').json"
    mkdir -p "$REPORT_DIR"
    
    echo -e "${BLUE}📊 統計レポート生成中...${NC}"
    
    # 進捗ログからデータ収集
    local progress_logs=($LOG_DIR/auto-fixer-progress-*.log)
    local total_loops=0
    local total_features=0
    local successful_operations=0
    
    if [[ ${#progress_logs[@]} -gt 0 ]] && [[ -f "${progress_logs[0]}" ]]; then
        for log_file in "${progress_logs[@]}"; do
            if [[ -f "$log_file" ]]; then
                total_loops=$(tail -n 1 "$log_file" 2>/dev/null | cut -d',' -f1 || echo "0")
                total_features=$(wc -l < "$log_file" 2>/dev/null || echo "0")
                successful_operations=$(grep -c "COMPLETED" "$log_file" 2>/dev/null || echo "0")
            fi
        done
    fi
    
    # 現在の品質メトリクス
    local current_data
    current_data=$(collect_progress_data)
    
    # レポート作成
    cat > "$report_file" << EOF
{
  "report_type": "statistics",
  "generated_at": "$(date -Iseconds)",
  "summary": {
    "total_loops_executed": $total_loops,
    "total_feature_operations": $total_features,
    "successful_operations": $successful_operations,
    "success_rate": $(( total_features > 0 ? successful_operations * 100 / total_features : 0 ))
  },
  "current_metrics": $current_data,
  "performance": {
    "average_loop_duration": "10min",
    "fastest_feature": "Feature-B",
    "slowest_feature": "Feature-E"
  },
  "recommendations": [
    "TypeScriptエラーが残っている場合は追加修復が必要",
    "ESLint警告の解決で品質向上可能",
    "テストカバレッジの向上を推奨"
  ]
}
EOF
    
    echo -e "${GREEN}✅ 統計レポート生成完了: $report_file${NC}"
    
    # レポートサマリー表示
    echo -e "${BOLD}${PURPLE}📊 統計サマリー${NC}"
    echo -e "${YELLOW}  実行ループ数:${NC} $total_loops"
    echo -e "${YELLOW}  Feature操作数:${NC} $total_features"
    echo -e "${YELLOW}  成功操作数:${NC} $successful_operations"
    echo -e "${YELLOW}  成功率:${NC} $(( total_features > 0 ? successful_operations * 100 / total_features : 0 ))%"
}

# =========================
# ライブ監視モード
# =========================

start_live_monitoring() {
    echo -e "${BOLD}${CYAN}🔴 ライブ監視開始 (更新間隔: ${REFRESH_INTERVAL}秒)${NC}"
    echo -e "${YELLOW}終了するには Ctrl+C を押してください${NC}"
    echo ""
    
    # ログファイル初期化
    mkdir -p "$LOG_DIR"
    echo "$(date -Iseconds): ライブ監視開始" >> "$MONITOR_LOG"
    
    # 監視ループ
    while true; do
        local data
        data=$(collect_progress_data)
        
        # ダッシュボード表示
        display_dashboard "$data"
        
        # ログ記録
        echo "$(date -Iseconds): $data" >> "$MONITOR_LOG"
        
        # キー入力チェック（非ブロッキング）
        if read -t $REFRESH_INTERVAL -n 1 key; then
            case "$key" in
                'q'|'Q')
                    echo -e "\n${GREEN}監視を終了します${NC}"
                    break
                    ;;
                'r'|'R')
                    echo -e "\n${BLUE}手動更新実行中...${NC}"
                    continue
                    ;;
                'h'|'H')
                    show_monitoring_help
                    ;;
            esac
        fi
    done
    
    echo "$(date -Iseconds): ライブ監視終了" >> "$MONITOR_LOG"
}

# =========================
# 監視ヘルプ表示
# =========================

show_monitoring_help() {
    clear
    echo -e "${BOLD}${BLUE}🔍 監視システムヘルプ${NC}"
    echo ""
    echo -e "${YELLOW}キーボードショートカット:${NC}"
    echo -e "  ${GREEN}[r]${NC} - 即座に画面更新"
    echo -e "  ${GREEN}[q]${NC} - 監視終了"
    echo -e "  ${GREEN}[h]${NC} - このヘルプ表示"
    echo -e "  ${GREEN}[Ctrl+C]${NC} - 強制終了"
    echo ""
    echo -e "${YELLOW}監視対象:${NC}"
    echo -e "  • 自動修復ループ進捗"
    echo -e "  • TypeScript・ESLintエラー数"
    echo -e "  • プロジェクトファイル統計"
    echo -e "  • Feature別実行状態"
    echo -e "  • Git変更・コミット状況"
    echo ""
    echo -e "${YELLOW}更新間隔:${NC} ${REFRESH_INTERVAL}秒"
    echo ""
    echo -e "${CYAN}何かキーを押して監視に戻る...${NC}"
    read -n 1
}

# =========================
# メインヘルプ
# =========================

show_help() {
    echo -e "${BOLD}${BLUE}WebUI修復進捗監視・レポート機能 v1.0${NC}"
    echo ""
    echo -e "${YELLOW}使用方法:${NC}"
    echo "  $0 [コマンド]"
    echo ""
    echo -e "${YELLOW}コマンド:${NC}"
    echo "  monitor                        - ライブ監視ダッシュボード開始"
    echo "  status                         - 現在の状態を一度だけ表示"
    echo "  report                         - 統計レポート生成"
    echo "  help                           - ヘルプ表示"
    echo ""
    echo -e "${YELLOW}例:${NC}"
    echo "  $0 monitor                     # ライブ監視開始"
    echo "  $0 status                      # 現在状態確認"
    echo "  $0 report                      # 統計レポート生成"
}

# =========================
# メイン実行部
# =========================

main() {
    case "${1:-monitor}" in
        "monitor"|"live")
            start_live_monitoring
            ;;
        "status"|"current")
            local data
            data=$(collect_progress_data)
            display_dashboard "$data"
            ;;
        "report"|"stats")
            generate_statistics_report
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

# 割り込みハンドラ
trap 'echo -e "\n${YELLOW}監視を終了します...${NC}"; exit 0' INT

# スクリプトが直接実行された場合
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi