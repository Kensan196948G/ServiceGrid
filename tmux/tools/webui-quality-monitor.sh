#!/bin/bash

# WebUIリアルタイム品質監視システム
# 品質スコア・エラー数・パフォーマンス指標のリアルタイム監視

set -euo pipefail

# =========================
# 設定・定数定義
# =========================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly WEBUI_SRC="$PROJECT_ROOT/src"
readonly LOG_DIR="$PROJECT_ROOT/logs/webui-auto-dev"
readonly MONITOR_LOG="$LOG_DIR/quality_monitor.log"
readonly QUALITY_HISTORY="$LOG_DIR/quality_history.json"

# 監視設定
readonly MONITOR_INTERVAL=30  # 秒
readonly HISTORY_LIMIT=100    # 保持する履歴数
readonly ALERT_THRESHOLD=60   # アラート閾値

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
MONITOR_RUNNING=false
MONITOR_PID=""

# =========================
# ユーティリティ関数
# =========================

print_info() {
    echo -e "${BLUE}[MONITOR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[MONITOR-OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[MONITOR-ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[MONITOR-WARN]${NC} $1"
}

print_alert() {
    echo -e "${BOLD}${RED}[MONITOR-ALERT]${NC} $1"
}

print_header() {
    clear
    echo -e "${BOLD}${CYAN}================================================================${NC}"
    echo -e "${BOLD}${CYAN} WebUIリアルタイム品質監視ダッシュボード${NC}"
    echo -e "${BOLD}${CYAN}================================================================${NC}"
    echo ""
}

get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# =========================
# 品質指標計算
# =========================

calculate_code_quality_score() {
    local quality_score=0
    
    # ESLintスコア (30%)
    if command -v npx >/dev/null; then
        local lint_errors=$(npx eslint "$WEBUI_SRC" --format json 2>/dev/null | jq length 2>/dev/null || echo "10")
        local lint_score=$(( (10 - lint_errors) * 3 ))
        [ $lint_score -lt 0 ] && lint_score=0
        [ $lint_score -gt 30 ] && lint_score=30
        quality_score=$((quality_score + lint_score))
    fi
    
    # TypeScriptスコア (30%)
    if command -v tsc >/dev/null && tsc --noEmit --project "$PROJECT_ROOT/config/tsconfig.json" 2>/dev/null; then
        quality_score=$((quality_score + 30))
    fi
    
    # テストスコア (25%)
    if command -v npm >/dev/null && npm test --silent 2>/dev/null; then
        quality_score=$((quality_score + 25))
    fi
    
    # セキュリティスコア (15%)
    if command -v npm >/dev/null; then
        local security_issues=$(npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities.total' 2>/dev/null || echo "5")
        local security_score=$(( (5 - security_issues) * 3 ))
        [ $security_score -lt 0 ] && security_score=0
        [ $security_score -gt 15 ] && security_score=15
        quality_score=$((quality_score + security_score))
    fi
    
    echo $quality_score
}

calculate_error_metrics() {
    local total_errors=0
    local critical_errors=0
    local error_details=""
    
    # ESLintエラー
    local eslint_errors=0
    if command -v npx >/dev/null; then
        eslint_errors=$(npx eslint "$WEBUI_SRC" --format json 2>/dev/null | jq length 2>/dev/null || echo "0")
        total_errors=$((total_errors + eslint_errors))
    fi
    
    # TypeScriptエラー
    local ts_errors=0
    if command -v tsc >/dev/null; then
        ts_errors=$(tsc --noEmit --project "$PROJECT_ROOT/config/tsconfig.json" 2>&1 | grep -c "error TS" || echo "0")
        total_errors=$((total_errors + ts_errors))
        if [ $ts_errors -gt 0 ]; then
            critical_errors=$((critical_errors + ts_errors))
        fi
    fi
    
    # セキュリティエラー
    local security_errors=0
    if command -v npm >/dev/null; then
        security_errors=$(npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities.total' 2>/dev/null || echo "0")
        total_errors=$((total_errors + security_errors))
        if [ $security_errors -gt 0 ]; then
            critical_errors=$((critical_errors + security_errors))
        fi
    fi
    
    # テストエラー
    local test_errors=0
    if command -v npm >/dev/null && ! npm test --silent 2>/dev/null; then
        test_errors=1
        total_errors=$((total_errors + test_errors))
    fi
    
    error_details="{\"eslint\": $eslint_errors, \"typescript\": $ts_errors, \"security\": $security_errors, \"tests\": $test_errors}"
    
    echo "$total_errors|$critical_errors|$error_details"
}

calculate_performance_metrics() {
    local bundle_size=0
    local file_count=0
    local complexity_score=0
    
    # バンドルサイズ
    bundle_size=$(du -s "$WEBUI_SRC" 2>/dev/null | cut -f1 || echo "0")
    bundle_size=$((bundle_size / 1024))  # MB変換
    
    # ファイル数
    file_count=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | wc -l)
    
    # 複雑度スコア (簡易版)
    local complex_functions=$(find "$WEBUI_SRC" -name "*.ts" -o -name "*.tsx" | xargs grep -c "if.*if.*if" | awk -F: '{sum+=$2} END {print sum+0}')
    if [ "$file_count" -gt 0 ]; then
        complexity_score=$((complex_functions * 100 / file_count))
    fi
    
    echo "$bundle_size|$file_count|$complexity_score"
}

# =========================
# リアルタイム監視メイン
# =========================

monitor_loop() {
    local iteration=0
    
    while [ "$MONITOR_RUNNING" = true ]; do
        ((iteration++))
        
        print_header
        
        # 現在時刻表示
        echo -e "${BOLD}監視時刻: $(get_timestamp)${NC} (反復 #$iteration)"
        echo -e "${BOLD}監視間隔: ${MONITOR_INTERVAL}秒${NC}"
        echo ""
        
        # 品質スコア計算
        local quality_score=$(calculate_code_quality_score)
        local quality_status=""
        local quality_color=""
        
        if [ $quality_score -ge 90 ]; then
            quality_status="優秀"
            quality_color="$GREEN"
        elif [ $quality_score -ge 80 ]; then
            quality_status="良好"
            quality_color="$BLUE"
        elif [ $quality_score -ge 70 ]; then
            quality_status="改善余地"
            quality_color="$YELLOW"
        elif [ $quality_score -ge 60 ]; then
            quality_status="要改善"
            quality_color="$YELLOW"
        else
            quality_status="要緊急改善"
            quality_color="$RED"
        fi
        
        # エラー指標計算
        local error_data=$(calculate_error_metrics)
        local total_errors=$(echo "$error_data" | cut -d'|' -f1)
        local critical_errors=$(echo "$error_data" | cut -d'|' -f2)
        local error_details=$(echo "$error_data" | cut -d'|' -f3)
        
        # パフォーマンス指標計算
        local perf_data=$(calculate_performance_metrics)
        local bundle_size=$(echo "$perf_data" | cut -d'|' -f1)
        local file_count=$(echo "$perf_data" | cut -d'|' -f2)
        local complexity_score=$(echo "$perf_data" | cut -d'|' -f3)
        
        # メイン指標表示
        echo -e "${BOLD}📊 主要品質指標${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo -e "${BOLD}品質スコア: ${quality_color}${quality_score}/100${NC} (${quality_status})"
        echo -e "${BOLD}総エラー数: $(if [ $total_errors -eq 0 ]; then echo -e "${GREEN}${total_errors}${NC}"; elif [ $total_errors -le 5 ]; then echo -e "${YELLOW}${total_errors}${NC}"; else echo -e "${RED}${total_errors}${NC}"; fi)${NC}"
        echo -e "${BOLD}重要エラー: $(if [ $critical_errors -eq 0 ]; then echo -e "${GREEN}${critical_errors}${NC}"; else echo -e "${RED}${critical_errors}${NC}"; fi)${NC}"
        echo ""
        
        # 詳細エラー内訳
        echo -e "${BOLD}🔍 エラー詳細内訳${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        local eslint_count=$(echo "$error_details" | jq -r '.eslint' 2>/dev/null || echo "0")
        local ts_count=$(echo "$error_details" | jq -r '.typescript' 2>/dev/null || echo "0")
        local security_count=$(echo "$error_details" | jq -r '.security' 2>/dev/null || echo "0")
        local test_count=$(echo "$error_details" | jq -r '.tests' 2>/dev/null || echo "0")
        
        echo -e "ESLintエラー:     $(if [ $eslint_count -eq 0 ]; then echo -e "${GREEN}${eslint_count}${NC}"; else echo -e "${YELLOW}${eslint_count}${NC}"; fi)"
        echo -e "TypeScriptエラー: $(if [ $ts_count -eq 0 ]; then echo -e "${GREEN}${ts_count}${NC}"; else echo -e "${RED}${ts_count}${NC}"; fi)"
        echo -e "セキュリティ問題: $(if [ $security_count -eq 0 ]; then echo -e "${GREEN}${security_count}${NC}"; else echo -e "${RED}${security_count}${NC}"; fi)"
        echo -e "テスト問題:       $(if [ $test_count -eq 0 ]; then echo -e "${GREEN}${test_count}${NC}"; else echo -e "${YELLOW}${test_count}${NC}"; fi)"
        echo ""
        
        # パフォーマンス指標
        echo -e "${BOLD}⚡ パフォーマンス指標${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo -e "バンドルサイズ: ${bundle_size}MB $(if [ $bundle_size -lt 5 ]; then echo -e "${GREEN}(最適)${NC}"; elif [ $bundle_size -lt 10 ]; then echo -e "${YELLOW}(良好)${NC}"; else echo -e "${RED}(大きめ)${NC}"; fi)"
        echo -e "総ファイル数:   ${file_count} $(if [ $file_count -lt 100 ]; then echo -e "${GREEN}(適切)${NC}"; elif [ $file_count -lt 200 ]; then echo -e "${YELLOW}(多め)${NC}"; else echo -e "${RED}(過多)${NC}"; fi)"
        echo -e "複雑度スコア:   ${complexity_score}% $(if [ $complexity_score -lt 20 ]; then echo -e "${GREEN}(良好)${NC}"; elif [ $complexity_score -lt 40 ]; then echo -e "${YELLOW}(改善余地)${NC}"; else echo -e "${RED}(要改善)${NC}"; fi)"
        echo ""
        
        # アラート判定
        if [ $quality_score -lt $ALERT_THRESHOLD ] || [ $critical_errors -gt 0 ]; then
            echo -e "${BOLD}${RED}🚨 品質アラート発生 🚨${NC}"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            
            if [ $quality_score -lt $ALERT_THRESHOLD ]; then
                echo -e "${RED}• 品質スコアが閾値 ${ALERT_THRESHOLD} を下回っています (現在: ${quality_score})${NC}"
            fi
            
            if [ $critical_errors -gt 0 ]; then
                echo -e "${RED}• ${critical_errors} 件の重要エラーが検出されています${NC}"
            fi
            
            echo -e "${YELLOW}推奨アクション: 自動修復の実行または手動修復を検討してください${NC}"
            echo ""
        fi
        
        # 監視履歴更新
        update_quality_history "$quality_score" "$total_errors" "$critical_errors" "$bundle_size"
        
        # ログ記録
        echo "[$(get_timestamp)] Quality:$quality_score Errors:$total_errors Critical:$critical_errors Bundle:${bundle_size}MB" >> "$MONITOR_LOG"
        
        # 監視制御
        echo -e "${BOLD}🎛️  監視制御${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "次回更新まで: ${MONITOR_INTERVAL}秒"
        echo "監視停止: Ctrl+C"
        echo "履歴表示: ./webui-quality-monitor.sh --history"
        echo ""
        
        # 待機
        sleep "$MONITOR_INTERVAL"
    done
}

# =========================
# 品質履歴管理
# =========================

update_quality_history() {
    local quality_score="$1"
    local total_errors="$2"
    local critical_errors="$3"
    local bundle_size="$4"
    
    mkdir -p "$LOG_DIR"
    
    # 履歴ファイルが存在しない場合は初期化
    if [ ! -f "$QUALITY_HISTORY" ]; then
        echo '{"history": []}' > "$QUALITY_HISTORY"
    fi
    
    # 新しい記録を追加
    local new_record="{\"timestamp\": \"$(get_timestamp)\", \"quality_score\": $quality_score, \"total_errors\": $total_errors, \"critical_errors\": $critical_errors, \"bundle_size_mb\": $bundle_size}"
    
    # 履歴に追加して制限を適用
    jq --argjson record "$new_record" --argjson limit "$HISTORY_LIMIT" '
        .history += [$record] | 
        .history = (.history | if length > $limit then .[-$limit:] else . end)
    ' "$QUALITY_HISTORY" > "${QUALITY_HISTORY}.tmp" && mv "${QUALITY_HISTORY}.tmp" "$QUALITY_HISTORY"
}

show_quality_history() {
    if [ ! -f "$QUALITY_HISTORY" ]; then
        print_warning "品質履歴ファイルが見つかりません"
        return 1
    fi
    
    print_header
    echo -e "${BOLD}📈 品質監視履歴${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 最新10件の履歴を表示
    echo -e "${BOLD}最新10件の品質スコア推移:${NC}"
    jq -r '.history[-10:] | .[] | "\(.timestamp) | 品質:\(.quality_score) エラー:\(.total_errors) 重要:\(.critical_errors) サイズ:\(.bundle_size_mb)MB"' "$QUALITY_HISTORY" 2>/dev/null || echo "履歴データの読み込みに失敗しました"
    
    echo ""
    
    # 統計情報
    local avg_quality=$(jq '.history | map(.quality_score) | add / length | floor' "$QUALITY_HISTORY" 2>/dev/null || echo "0")
    local max_quality=$(jq '.history | map(.quality_score) | max' "$QUALITY_HISTORY" 2>/dev/null || echo "0")
    local min_quality=$(jq '.history | map(.quality_score) | min' "$QUALITY_HISTORY" 2>/dev/null || echo "0")
    local avg_errors=$(jq '.history | map(.total_errors) | add / length | floor' "$QUALITY_HISTORY" 2>/dev/null || echo "0")
    
    echo -e "${BOLD}統計情報:${NC}"
    echo "平均品質スコア: $avg_quality"
    echo "最高品質スコア: $max_quality"
    echo "最低品質スコア: $min_quality"
    echo "平均エラー数:   $avg_errors"
}

# =========================
# 信号処理
# =========================

cleanup() {
    MONITOR_RUNNING=false
    if [ -n "$MONITOR_PID" ]; then
        kill -TERM "$MONITOR_PID" 2>/dev/null || true
    fi
    echo ""
    print_info "品質監視を停止しました"
    exit 0
}

trap cleanup SIGINT SIGTERM

# =========================
# 使用方法表示
# =========================

show_usage() {
    echo "WebUIリアルタイム品質監視システム"
    echo ""
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  (なし)              リアルタイム監視開始"
    echo "  --history           品質履歴表示"
    echo "  --status            現在の品質状況表示"
    echo "  --interval N        監視間隔設定 (秒, デフォルト: 30)"
    echo "  --threshold N       アラート閾値設定 (デフォルト: 60)"
    echo "  --help              このヘルプを表示"
}

# =========================
# メイン実行
# =========================

main() {
    local mode="monitor"
    local custom_interval=""
    local custom_threshold=""
    
    # 引数解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            --history)
                mode="history"
                shift
                ;;
            --status)
                mode="status"
                shift
                ;;
            --interval)
                custom_interval="$2"
                shift 2
                ;;
            --threshold)
                custom_threshold="$2"
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
    
    # 環境チェック
    if [ ! -d "$WEBUI_SRC" ]; then
        print_error "WebUIソースディレクトリが見つかりません: $WEBUI_SRC"
        exit 1
    fi
    
    # ログディレクトリ作成
    mkdir -p "$LOG_DIR"
    
    # カスタム設定適用
    if [ -n "$custom_interval" ]; then
        MONITOR_INTERVAL="$custom_interval"
    fi
    
    if [ -n "$custom_threshold" ]; then
        ALERT_THRESHOLD="$custom_threshold"
    fi
    
    # モード別実行
    case "$mode" in
        monitor)
            print_info "WebUIリアルタイム品質監視を開始します"
            print_info "監視間隔: ${MONITOR_INTERVAL}秒"
            print_info "アラート閾値: ${ALERT_THRESHOLD}"
            MONITOR_RUNNING=true
            monitor_loop
            ;;
        history)
            show_quality_history
            ;;
        status)
            print_header
            print_info "現在の品質状況:"
            local quality_score=$(calculate_code_quality_score)
            local error_data=$(calculate_error_metrics)
            local total_errors=$(echo "$error_data" | cut -d'|' -f1)
            local critical_errors=$(echo "$error_data" | cut -d'|' -f2)
            
            echo "品質スコア: $quality_score/100"
            echo "総エラー数: $total_errors"
            echo "重要エラー: $critical_errors"
            ;;
        *)
            print_error "不明なモード: $mode"
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"