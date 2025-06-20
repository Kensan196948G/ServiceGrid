#!/bin/bash

# WebUI 4フェーズループサイクル統合コーディネーター
# 自動開発→レビュー→エラー抽出→自動修復の4フェーズ連携システム

set -euo pipefail

# =========================
# 設定・定数定義
# =========================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly TOOLS_DIR="$PROJECT_ROOT/tmux/tools"
readonly COORDINATION_DIR="$PROJECT_ROOT/tmux/coordination"
readonly LOG_DIR="$PROJECT_ROOT/logs/webui-auto-dev"
readonly INTEGRATION_LOG="$LOG_DIR/integration_coordinator.log"

# 4フェーズスクリプト定義
readonly DEVELOPMENT_SCRIPT="$TOOLS_DIR/webui-development-loop.sh"
readonly REVIEW_SCRIPT="$TOOLS_DIR/webui-auto-reviewer.sh"
readonly ERROR_EXTRACT_SCRIPT="$TOOLS_DIR/webui-error-extractor.sh"
readonly AUTO_FIX_SCRIPT="$TOOLS_DIR/webui-auto-fixer.sh"
readonly QUALITY_MONITOR_SCRIPT="$TOOLS_DIR/webui-quality-monitor.sh"
readonly LOOP_REPORTER_SCRIPT="$TOOLS_DIR/webui-loop-reporter.sh"

# Feature別スクリプト定義
readonly FEATURE_B_SCRIPT="$COORDINATION_DIR/webui-auto-dev-feature-b.sh"
readonly FEATURE_C_SCRIPT="$COORDINATION_DIR/webui-auto-dev-feature-c.sh"
readonly FEATURE_D_SCRIPT="$COORDINATION_DIR/webui-auto-dev-feature-d.sh"
readonly FEATURE_E_SCRIPT="$COORDINATION_DIR/webui-auto-dev-feature-e.sh"

# ステータスファイル
readonly STATUS_FILE="$LOG_DIR/integration_status.json"
readonly PHASE_STATUS_FILE="$LOG_DIR/current_phase_status.json"

# 色設定
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# グローバル変数
INTEGRATION_RUNNING=false
CURRENT_PHASE=""
CURRENT_LOOP=0
MAX_LOOPS=20
QUALITY_THRESHOLD=85

# =========================
# ユーティリティ関数
# =========================

print_info() {
    echo -e "${BLUE}[INTEGRATION]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[INTEGRATION-OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[INTEGRATION-ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[INTEGRATION-WARN]${NC} $1"
}

print_phase() {
    echo -e "${BOLD}${CYAN}[PHASE]${NC} $1"
}

print_header() {
    echo -e "${BOLD}${PURPLE}================================================================${NC}"
    echo -e "${BOLD}${PURPLE} 🔄 WebUI 4フェーズループサイクル統合コーディネーター 🔄${NC}"
    echo -e "${BOLD}${PURPLE} 自動開発→レビュー→エラー抽出→自動修復${NC}"
    echo -e "${BOLD}${PURPLE}================================================================${NC}"
}

get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

log_integration_action() {
    local action="$1"
    local status="$2"
    local details="$3"
    
    mkdir -p "$LOG_DIR"
    echo "[$(get_timestamp)] INTEGRATION: $action - $status - $details" >> "$INTEGRATION_LOG"
}

# =========================
# ステータス管理
# =========================

update_integration_status() {
    local phase="$1"
    local loop="$2"
    local quality_score="${3:-0}"
    local phase_status="${4:-running}"
    
    mkdir -p "$LOG_DIR"
    
    cat > "$STATUS_FILE" << EOF
{
    "integration_status": {
        "timestamp": "$(get_timestamp)",
        "current_phase": "$phase",
        "current_loop": $loop,
        "max_loops": $MAX_LOOPS,
        "quality_score": $quality_score,
        "quality_threshold": $QUALITY_THRESHOLD,
        "phase_status": "$phase_status",
        "integration_running": $([[ "$INTEGRATION_RUNNING" == "true" ]] && echo "true" || echo "false")
    }
}
EOF
}

update_phase_status() {
    local phase="$1"
    local status="$2"
    local details="$3"
    local start_time="${4:-$(get_timestamp)}"
    
    cat > "$PHASE_STATUS_FILE" << EOF
{
    "phase_details": {
        "phase_name": "$phase",
        "status": "$status",
        "start_time": "$start_time",
        "details": "$details",
        "loop_iteration": $CURRENT_LOOP
    }
}
EOF
}

# =========================
# 4フェーズ実行エンジン
# =========================

execute_phase_1_development() {
    print_phase "フェーズ1: 自動開発実行"
    CURRENT_PHASE="Phase-1-Development"
    update_phase_status "$CURRENT_PHASE" "running" "Feature別自動開発実行中"
    
    local phase_start_time=$(date +%s)
    
    # 並列Feature開発実行
    local feature_pids=()
    
    # Feature-B: UI自動開発
    if [ -f "$FEATURE_B_SCRIPT" ]; then
        print_info "Feature-B UI自動開発開始"
        "$FEATURE_B_SCRIPT" --components &
        feature_pids+=($!)
    fi
    
    # Feature-C: API自動開発
    if [ -f "$FEATURE_C_SCRIPT" ]; then
        print_info "Feature-C API自動開発開始"
        "$FEATURE_C_SCRIPT" --apis &
        feature_pids+=($!)
    fi
    
    # Feature-D: PowerShell自動開発
    if [ -f "$FEATURE_D_SCRIPT" ]; then
        print_info "Feature-D PowerShell自動開発開始"
        "$FEATURE_D_SCRIPT" --apis &
        feature_pids+=($!)
    fi
    
    # Feature-E: 品質保証自動開発
    if [ -f "$FEATURE_E_SCRIPT" ]; then
        print_info "Feature-E 品質保証自動開発開始"
        "$FEATURE_E_SCRIPT" --security &
        feature_pids+=($!)
    fi
    
    # 全Feature完了待機
    print_info "全Feature自動開発完了待機中..."
    for pid in "${feature_pids[@]}"; do
        wait $pid
    done
    
    local phase_end_time=$(date +%s)
    local phase_duration=$((phase_end_time - phase_start_time))
    
    update_phase_status "$CURRENT_PHASE" "completed" "全Feature自動開発完了 (${phase_duration}秒)"
    log_integration_action "PHASE_1_DEVELOPMENT" "SUCCESS" "Duration: ${phase_duration}s, Features: ${#feature_pids[@]}"
    
    print_success "フェーズ1: 自動開発完了 (${phase_duration}秒)"
}

execute_phase_2_review() {
    print_phase "フェーズ2: コード品質レビュー"
    CURRENT_PHASE="Phase-2-Review"
    update_phase_status "$CURRENT_PHASE" "running" "包括的コード品質レビュー実行中"
    
    local phase_start_time=$(date +%s)
    local review_score=0
    
    if [ -f "$REVIEW_SCRIPT" ]; then
        print_info "自動レビューシステム実行中..."
        
        # レビュー実行して品質スコア取得
        local review_output
        if review_output=$("$REVIEW_SCRIPT" --comprehensive 2>&1); then
            # レビュー結果から品質スコア抽出
            review_score=$(echo "$review_output" | grep -o "品質スコア: [0-9]\+" | grep -o "[0-9]\+" | tail -1 || echo "0")
            print_success "レビュー完了 - 品質スコア: $review_score"
        else
            print_error "レビュー実行エラー: $review_output"
            review_score=0
        fi
    else
        print_warning "レビュースクリプトが見つかりません: $REVIEW_SCRIPT"
    fi
    
    local phase_end_time=$(date +%s)
    local phase_duration=$((phase_end_time - phase_start_time))
    
    update_phase_status "$CURRENT_PHASE" "completed" "品質レビュー完了 - スコア: $review_score (${phase_duration}秒)"
    log_integration_action "PHASE_2_REVIEW" "SUCCESS" "Quality Score: $review_score, Duration: ${phase_duration}s"
    
    print_success "フェーズ2: コード品質レビュー完了 - スコア: $review_score (${phase_duration}秒)"
    
    echo $review_score
}

execute_phase_3_error_extraction() {
    print_phase "フェーズ3: エラー検出・分類"
    CURRENT_PHASE="Phase-3-ErrorExtraction"
    update_phase_status "$CURRENT_PHASE" "running" "エラー検出・分類実行中"
    
    local phase_start_time=$(date +%s)
    local total_errors=0
    local critical_errors=0
    
    if [ -f "$ERROR_EXTRACT_SCRIPT" ]; then
        print_info "エラー検出システム実行中..."
        
        # エラー抽出実行
        local error_output
        if error_output=$("$ERROR_EXTRACT_SCRIPT" --comprehensive 2>&1); then
            # エラー数抽出
            total_errors=$(echo "$error_output" | grep -o "総エラー数: [0-9]\+" | grep -o "[0-9]\+" | tail -1 || echo "0")
            critical_errors=$(echo "$error_output" | grep -o "重要エラー: [0-9]\+" | grep -o "[0-9]\+" | tail -1 || echo "0")
            print_success "エラー抽出完了 - 総数: $total_errors, 重要: $critical_errors"
        else
            print_error "エラー抽出実行エラー: $error_output"
        fi
    else
        print_warning "エラー抽出スクリプトが見つかりません: $ERROR_EXTRACT_SCRIPT"
    fi
    
    local phase_end_time=$(date +%s)
    local phase_duration=$((phase_end_time - phase_start_time))
    
    update_phase_status "$CURRENT_PHASE" "completed" "エラー抽出完了 - 総数: $total_errors, 重要: $critical_errors (${phase_duration}秒)"
    log_integration_action "PHASE_3_ERROR_EXTRACTION" "SUCCESS" "Total Errors: $total_errors, Critical: $critical_errors, Duration: ${phase_duration}s"
    
    print_success "フェーズ3: エラー検出・分類完了 - 総数: $total_errors, 重要: $critical_errors (${phase_duration}秒)"
    
    echo "$total_errors|$critical_errors"
}

execute_phase_4_auto_fix() {
    print_phase "フェーズ4: 自動修復実行"
    CURRENT_PHASE="Phase-4-AutoFix"
    update_phase_status "$CURRENT_PHASE" "running" "自動修復実行中"
    
    local phase_start_time=$(date +%s)
    local fixes_applied=0
    local fixes_successful=0
    
    if [ -f "$AUTO_FIX_SCRIPT" ]; then
        print_info "自動修復システム実行中..."
        
        # 自動修復実行
        local fix_output
        if fix_output=$("$AUTO_FIX_SCRIPT" --comprehensive 2>&1); then
            # 修復数抽出
            fixes_applied=$(echo "$fix_output" | grep -o "修復適用: [0-9]\+" | grep -o "[0-9]\+" | tail -1 || echo "0")
            fixes_successful=$(echo "$fix_output" | grep -o "修復成功: [0-9]\+" | grep -o "[0-9]\+" | tail -1 || echo "0")
            print_success "自動修復完了 - 適用: $fixes_applied, 成功: $fixes_successful"
        else
            print_error "自動修復実行エラー: $fix_output"
        fi
    else
        print_warning "自動修復スクリプトが見つかりません: $AUTO_FIX_SCRIPT"
    fi
    
    local phase_end_time=$(date +%s)
    local phase_duration=$((phase_end_time - phase_start_time))
    
    update_phase_status "$CURRENT_PHASE" "completed" "自動修復完了 - 適用: $fixes_applied, 成功: $fixes_successful (${phase_duration}秒)"
    log_integration_action "PHASE_4_AUTO_FIX" "SUCCESS" "Fixes Applied: $fixes_applied, Successful: $fixes_successful, Duration: ${phase_duration}s"
    
    print_success "フェーズ4: 自動修復完了 - 適用: $fixes_applied, 成功: $fixes_successful (${phase_duration}秒)"
    
    echo "$fixes_applied|$fixes_successful"
}

# =========================
# 4フェーズ統合ループサイクル
# =========================

execute_integration_loop() {
    print_header
    print_info "WebUI 4フェーズ統合ループサイクルを開始します"
    print_info "最大ループ回数: $MAX_LOOPS"
    print_info "品質閾値: $QUALITY_THRESHOLD%"
    
    INTEGRATION_RUNNING=true
    local loop_start_time=$(date +%s)
    
    while [ $CURRENT_LOOP -lt $MAX_LOOPS ] && [ "$INTEGRATION_RUNNING" = true ]; do
        ((CURRENT_LOOP++))
        print_info "==================== ループ $CURRENT_LOOP/$MAX_LOOPS 開始 ===================="
        
        local cycle_start_time=$(date +%s)
        
        # フェーズ1: 自動開発
        execute_phase_1_development
        
        # フェーズ2: コード品質レビュー
        local quality_score
        quality_score=$(execute_phase_2_review)
        
        # フェーズ3: エラー検出・分類
        local error_results
        error_results=$(execute_phase_3_error_extraction)
        local total_errors=$(echo "$error_results" | cut -d'|' -f1)
        local critical_errors=$(echo "$error_results" | cut -d'|' -f2)
        
        # フェーズ4: 自動修復
        local fix_results
        fix_results=$(execute_phase_4_auto_fix)
        local fixes_applied=$(echo "$fix_results" | cut -d'|' -f1)
        local fixes_successful=$(echo "$fix_results" | cut -d'|' -f2)
        
        local cycle_end_time=$(date +%s)
        local cycle_duration=$((cycle_end_time - cycle_start_time))
        
        # ステータス更新
        update_integration_status "Cycle-Completed" "$CURRENT_LOOP" "$quality_score" "completed"
        
        print_info "ループ $CURRENT_LOOP 完了 - 品質: ${quality_score}%, エラー: ${total_errors}, 修復: ${fixes_successful} (${cycle_duration}秒)"
        log_integration_action "LOOP_CYCLE_COMPLETION" "SUCCESS" "Loop $CURRENT_LOOP: Quality=$quality_score%, Errors=$total_errors, Fixes=$fixes_successful, Duration=${cycle_duration}s"
        
        # 早期終了条件チェック
        if [ "$quality_score" -ge "$QUALITY_THRESHOLD" ] && [ "$critical_errors" -eq 0 ]; then
            print_success "品質閾値 ${QUALITY_THRESHOLD}% に到達し、重要エラーが0になりました！"
            break
        fi
        
        # 改善がない場合の早期終了
        if [ "$total_errors" -eq 0 ] && [ "$fixes_applied" -eq 0 ]; then
            print_info "エラーがなく修復項目もないため、ループを終了します"
            break
        fi
        
        # 品質監視レポート生成
        if [ -f "$LOOP_REPORTER_SCRIPT" ]; then
            "$LOOP_REPORTER_SCRIPT" --progress > /dev/null 2>&1 &
        fi
        
        sleep 3  # ループ間の休憩
    done
    
    local loop_end_time=$(date +%s)
    local total_duration=$((loop_end_time - loop_start_time))
    
    INTEGRATION_RUNNING=false
    
    # 最終結果表示
    print_success "WebUI 4フェーズ統合ループサイクル完了"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "実行ループ数: $CURRENT_LOOP/$MAX_LOOPS"
    echo "総実行時間: ${total_duration}秒 ($((total_duration / 60))分)"
    echo "最終品質スコア: $quality_score%"
    
    # 最終レポート生成
    if [ -f "$LOOP_REPORTER_SCRIPT" ]; then
        print_info "最終包括レポート生成中..."
        "$LOOP_REPORTER_SCRIPT" --all > /dev/null 2>&1
        print_success "最終レポートを生成しました"
    fi
    
    log_integration_action "INTEGRATION_COMPLETE" "SUCCESS" "Total Duration: ${total_duration}s, Final Quality: $quality_score%, Loops: $CURRENT_LOOP"
}

# =========================
# 統合コーディネーター制御
# =========================

start_quality_monitoring() {
    print_info "品質監視システム開始"
    
    if [ -f "$QUALITY_MONITOR_SCRIPT" ]; then
        "$QUALITY_MONITOR_SCRIPT" --status > /dev/null 2>&1 &
        print_success "品質監視システムを開始しました"
    else
        print_warning "品質監視スクリプトが見つかりません"
    fi
}

stop_integration() {
    print_warning "統合ループサイクル停止中..."
    
    INTEGRATION_RUNNING=false
    update_integration_status "Stopped" "$CURRENT_LOOP" "0" "stopped"
    
    print_success "統合ループサイクルを停止しました"
}

show_integration_status() {
    print_info "統合ループサイクル状況確認"
    
    if [ -f "$STATUS_FILE" ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "統合ステータス:"
        cat "$STATUS_FILE" | jq '.'
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    else
        print_warning "ステータスファイルが見つかりません"
    fi
    
    if [ -f "$PHASE_STATUS_FILE" ]; then
        echo "現在フェーズ:"
        cat "$PHASE_STATUS_FILE" | jq '.'
    fi
}

# =========================
# 使用方法表示
# =========================

show_usage() {
    echo "WebUI 4フェーズループサイクル統合コーディネーター"
    echo ""
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  --start              統合ループサイクル開始"
    echo "  --stop               統合ループサイクル停止"
    echo "  --status             統合状況確認"
    echo "  --monitor            品質監視開始"
    echo "  --max-loops N        最大ループ回数設定 (デフォルト: 20)"
    echo "  --threshold N        品質閾値設定 (デフォルト: 85)"
    echo "  --help               このヘルプを表示"
}

# =========================
# メイン実行
# =========================

main() {
    local mode="start"
    
    # 引数解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            --start)
                mode="start"
                shift
                ;;
            --stop)
                mode="stop"
                shift
                ;;
            --status)
                mode="status"
                shift
                ;;
            --monitor)
                mode="monitor"
                shift
                ;;
            --max-loops)
                MAX_LOOPS="$2"
                shift 2
                ;;
            --threshold)
                QUALITY_THRESHOLD="$2"
                shift 2
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                print_warning "不明なオプション: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # ログディレクトリ作成
    mkdir -p "$LOG_DIR"
    
    # 統合開始ログ
    log_integration_action "INTEGRATION_START" "INFO" "Integration coordinator started with mode: $mode"
    
    # モード別実行
    case "$mode" in
        start)
            execute_integration_loop
            ;;
        stop)
            stop_integration
            ;;
        status)
            show_integration_status
            ;;
        monitor)
            start_quality_monitoring
            ;;
        *)
            print_error "不明なモード: $mode"
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"