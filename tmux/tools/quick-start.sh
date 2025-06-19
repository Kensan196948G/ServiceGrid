#!/bin/bash

# ==================================================================
# WebUI自動開発・修復ループシステム クイックスタート v1.0
# ワンコマンドで全システム起動・実行
# ==================================================================

set -euo pipefail

# =========================
# 設定・定数定義
# =========================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly TMUX_DIR="$PROJECT_ROOT/tmux"

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
# ヘルプ表示
# =========================

show_help() {
    cat << 'EOF'
🚀 WebUI自動開発・修復ループシステム クイックスタート v1.0

使用方法: ./quick-start.sh [オプション]

🎯 クイックスタートオプション:
  full                    完全自動実行（推奨）
  tmux                    tmux開発環境のみ起動
  repair                  修復ループのみ実行
  monitor                 進捗監視のみ実行
  analyze                 修復対象分析のみ実行

📊 診断・確認オプション:
  status                  現在の状況確認
  check                   システム要件チェック
  logs                    最新ログ表示
  report                  最新レポート表示

🔧 メンテナンスオプション:
  clean                   ログ・一時ファイル削除
  reset                   全システムリセット
  update                  スクリプト権限更新

🆘 ヘルプ・情報:
  help                    このヘルプ表示
  version                 バージョン情報表示

例:
  ./quick-start.sh full           # 完全自動実行
  ./quick-start.sh tmux           # tmux環境起動のみ
  ./quick-start.sh repair         # 修復ループ実行
  ./quick-start.sh monitor        # 進捗監視開始
EOF
}

show_version() {
    echo -e "${BOLD}${BLUE}WebUI自動開発・修復ループシステム v1.0${NC}"
    echo -e "${CYAN}開発者: Claude Code AI Assistant${NC}"
    echo -e "${CYAN}作成日: 2025年6月19日${NC}"
    echo -e "${CYAN}プロジェクト: ServiceGrid ITSM Platform${NC}"
    echo ""
    echo -e "${YELLOW}システム構成:${NC}"
    echo -e "  🚀 auto-webui-fixer.sh     - メイン自動修復スクリプト"
    echo -e "  🔧 feature-commands.sh     - Feature別修復コマンド"
    echo -e "  📊 progress-monitor.sh     - リアルタイム進捗監視"
    echo -e "  🔍 repair-analyzer.sh      - 修復対象詳細分析"
    echo -e "  🎯 quick-start.sh          - ワンコマンド実行"
}

# =========================
# システム要件チェック
# =========================

check_requirements() {
    echo -e "${BOLD}${BLUE}🔍 システム要件チェック開始${NC}"
    
    local all_ok=true
    
    # 必要コマンド確認
    local required_commands=("tmux" "npm" "node" "jq")
    for cmd in "${required_commands[@]}"; do
        if command -v "$cmd" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $cmd: $(command -v "$cmd")${NC}"
        else
            echo -e "${RED}❌ $cmd: 見つかりません${NC}"
            all_ok=false
        fi
    done
    
    # プロジェクト構造確認
    local required_dirs=("src" "backend" "tmux")
    for dir in "${required_dirs[@]}"; do
        if [[ -d "$PROJECT_ROOT/$dir" ]]; then
            echo -e "${GREEN}✅ ディレクトリ $dir: 存在${NC}"
        else
            echo -e "${RED}❌ ディレクトリ $dir: 見つかりません${NC}"
            all_ok=false
        fi
    done
    
    # package.json確認
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        echo -e "${GREEN}✅ package.json: 存在${NC}"
    else
        echo -e "${RED}❌ package.json: 見つかりません${NC}"
        all_ok=false
    fi
    
    # スクリプト実行権限確認
    local scripts=("auto-webui-fixer.sh" "feature-commands.sh" "progress-monitor.sh" "repair-analyzer.sh")
    for script in "${scripts[@]}"; do
        if [[ -x "$SCRIPT_DIR/$script" ]]; then
            echo -e "${GREEN}✅ $script: 実行可能${NC}"
        else
            echo -e "${YELLOW}⚠️ $script: 実行権限なし${NC}"
        fi
    done
    
    echo ""
    if $all_ok; then
        echo -e "${BOLD}${GREEN}🎉 全ての要件が満たされています！${NC}"
        return 0
    else
        echo -e "${BOLD}${RED}❌ システム要件が不足しています${NC}"
        echo -e "${YELLOW}💡 修復方法:${NC}"
        echo -e "  sudo apt update && sudo apt install tmux nodejs npm jq"
        echo -e "  chmod +x $SCRIPT_DIR/*.sh"
        return 1
    fi
}

# =========================
# システムステータス確認
# =========================

check_system_status() {
    echo -e "${BOLD}${PURPLE}📊 システムステータス確認${NC}"
    
    # tmuxセッション確認
    if tmux has-session -t "itsm-requirement" 2>/dev/null; then
        echo -e "${GREEN}✅ tmux セッション: アクティブ${NC}"
        local pane_count=$(tmux list-panes -t "itsm-requirement" | wc -l)
        echo -e "${BLUE}   ペイン数: $pane_count${NC}"
    else
        echo -e "${YELLOW}⚠️ tmux セッション: 非アクティブ${NC}"
    fi
    
    # プロジェクト統計
    cd "$PROJECT_ROOT"
    local total_files=$(find src -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l || echo "0")
    local total_lines=$(find src -name "*.ts" -o -name "*.tsx" -exec cat {} \; 2>/dev/null | wc -l || echo "0")
    echo -e "${BLUE}📁 総ファイル数: $total_files${NC}"
    echo -e "${BLUE}📝 総行数: $total_lines${NC}"
    
    # 品質状況
    local ts_errors=0
    local eslint_errors=0
    if command -v npm >/dev/null 2>&1; then
        ts_errors=$(npm run typecheck 2>&1 | grep -c "error TS" || echo "0")
        eslint_errors=$(npm run lint 2>&1 | grep -c " error " || echo "0")
    fi
    
    if [[ $ts_errors -eq 0 ]]; then
        echo -e "${GREEN}✅ TypeScript: エラーなし${NC}"
    else
        echo -e "${RED}❌ TypeScript: ${ts_errors}個のエラー${NC}"
    fi
    
    if [[ $eslint_errors -eq 0 ]]; then
        echo -e "${GREEN}✅ ESLint: エラーなし${NC}"
    else
        echo -e "${RED}❌ ESLint: ${eslint_errors}個のエラー${NC}"
    fi
    
    # Git状況
    if git rev-parse --git-dir > /dev/null 2>&1; then
        local changed_files=$(git status --porcelain 2>/dev/null | wc -l || echo "0")
        local current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
        echo -e "${BLUE}🌿 ブランチ: $current_branch${NC}"
        echo -e "${BLUE}📝 変更ファイル: $changed_files${NC}"
    fi
    
    echo ""
}

# =========================
# ログ表示
# =========================

show_latest_logs() {
    echo -e "${BOLD}${CYAN}📋 最新ログ表示${NC}"
    
    local log_dir="$PROJECT_ROOT/logs/auto-fixer"
    
    if [[ -d "$log_dir" ]]; then
        local latest_main_log=$(ls -t "$log_dir"/auto-fixer-*.log 2>/dev/null | head -n 1)
        local latest_error_log=$(ls -t "$log_dir"/auto-fixer-errors-*.log 2>/dev/null | head -n 1)
        local latest_progress_log=$(ls -t "$log_dir"/auto-fixer-progress-*.log 2>/dev/null | head -n 1)
        
        if [[ -f "$latest_main_log" ]]; then
            echo -e "${GREEN}📄 メインログ (最新10行):${NC}"
            tail -n 10 "$latest_main_log"
            echo ""
        fi
        
        if [[ -f "$latest_error_log" ]] && [[ -s "$latest_error_log" ]]; then
            echo -e "${RED}🚨 エラーログ (最新5行):${NC}"
            tail -n 5 "$latest_error_log"
            echo ""
        fi
        
        if [[ -f "$latest_progress_log" ]]; then
            echo -e "${BLUE}📊 進捗ログ (最新5行):${NC}"
            tail -n 5 "$latest_progress_log"
            echo ""
        fi
    else
        echo -e "${YELLOW}⚠️ ログディレクトリが見つかりません: $log_dir${NC}"
    fi
}

# =========================
# クリーンアップ
# =========================

clean_system() {
    echo -e "${BOLD}${YELLOW}🧹 システムクリーンアップ開始${NC}"
    
    # 古いログファイル削除
    local log_dir="$PROJECT_ROOT/logs"
    if [[ -d "$log_dir" ]]; then
        find "$log_dir" -name "*.log" -mtime +7 -delete 2>/dev/null || true
        echo -e "${GREEN}✅ 7日以上前のログファイルを削除${NC}"
    fi
    
    # 一時ファイル削除
    local temp_dirs=("$PROJECT_ROOT/analysis" "$PROJECT_ROOT/reports")
    for temp_dir in "${temp_dirs[@]}"; do
        if [[ -d "$temp_dir" ]]; then
            find "$temp_dir" -name "*.tmp" -delete 2>/dev/null || true
            echo -e "${GREEN}✅ $temp_dir の一時ファイルを削除${NC}"
        fi
    done
    
    # tmux一時ファイル
    if [[ -f "$log_dir/.current_loop" ]]; then
        rm -f "$log_dir/.current_loop"
        echo -e "${GREEN}✅ tmux一時ファイルを削除${NC}"
    fi
    
    echo -e "${GREEN}🎉 クリーンアップ完了${NC}"
}

# =========================
# システムリセット
# =========================

reset_system() {
    echo -e "${BOLD}${RED}🔄 システムリセット開始${NC}"
    echo -e "${YELLOW}⚠️ この操作により、以下が削除されます:${NC}"
    echo -e "   • 全ログファイル"
    echo -e "   • 分析レポート"
    echo -e "   • 進捗データ"
    echo -e "   • tmuxセッション"
    echo ""
    
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}キャンセルしました${NC}"
        return 0
    fi
    
    # tmuxセッション終了
    if tmux has-session -t "itsm-requirement" 2>/dev/null; then
        tmux kill-session -t "itsm-requirement"
        echo -e "${GREEN}✅ tmuxセッションを終了${NC}"
    fi
    
    # ログ・レポートディレクトリ削除
    local dirs_to_clean=("$PROJECT_ROOT/logs" "$PROJECT_ROOT/reports" "$PROJECT_ROOT/analysis")
    for dir in "${dirs_to_clean[@]}"; do
        if [[ -d "$dir" ]]; then
            rm -rf "$dir"
            echo -e "${GREEN}✅ $dir を削除${NC}"
        fi
    done
    
    echo -e "${GREEN}🎉 システムリセット完了${NC}"
}

# =========================
# スクリプト権限更新
# =========================

update_permissions() {
    echo -e "${BOLD}${BLUE}🔧 スクリプト権限更新${NC}"
    
    local scripts=("auto-webui-fixer.sh" "feature-commands.sh" "progress-monitor.sh" "repair-analyzer.sh" "quick-start.sh")
    
    for script in "${scripts[@]}"; do
        if [[ -f "$SCRIPT_DIR/$script" ]]; then
            chmod +x "$SCRIPT_DIR/$script"
            echo -e "${GREEN}✅ $script に実行権限を付与${NC}"
        else
            echo -e "${YELLOW}⚠️ $script が見つかりません${NC}"
        fi
    done
    
    # tmux関連スクリプト
    if [[ -f "$TMUX_DIR/start-development.sh" ]]; then
        chmod +x "$TMUX_DIR/start-development.sh"
        echo -e "${GREEN}✅ start-development.sh に実行権限を付与${NC}"
    fi
    
    echo -e "${GREEN}🎉 権限更新完了${NC}"
}

# =========================
# メイン実行関数
# =========================

run_full_automation() {
    echo -e "${BOLD}${GREEN}🚀 完全自動実行開始${NC}"
    
    # 1. 要件チェック
    if ! check_requirements; then
        echo -e "${RED}❌ システム要件が不足しています${NC}"
        return 1
    fi
    
    # 2. tmux環境起動
    echo -e "${BLUE}📦 tmux開発環境起動中...${NC}"
    cd "$TMUX_DIR"
    if ! ./start-development.sh; then
        echo -e "${RED}❌ tmux環境起動に失敗${NC}"
        return 1
    fi
    
    # 少し待機
    sleep 3
    
    # 3. 修復対象分析
    echo -e "${BLUE}🔍 修復対象分析実行中...${NC}"
    cd "$SCRIPT_DIR"
    ./repair-analyzer.sh analyze
    
    # 4. 進捗監視開始（バックグラウンド）
    echo -e "${BLUE}📊 進捗監視開始...${NC}"
    ./progress-monitor.sh monitor &
    local monitor_pid=$!
    
    # 5. 自動修復ループ実行
    echo -e "${BLUE}🔧 自動修復ループ実行中...${NC}"
    ./auto-webui-fixer.sh
    
    # 6. 進捗監視終了
    if kill -0 $monitor_pid 2>/dev/null; then
        kill $monitor_pid 2>/dev/null || true
    fi
    
    echo -e "${BOLD}${GREEN}🎉 完全自動実行完了！${NC}"
    echo -e "${CYAN}📋 レポート確認: ./quick-start.sh report${NC}"
}

run_tmux_only() {
    echo -e "${BOLD}${BLUE}📦 tmux開発環境起動${NC}"
    
    cd "$TMUX_DIR"
    if ./start-development.sh; then
        echo -e "${GREEN}✅ tmux環境起動完了${NC}"
        echo -e "${CYAN}💡 接続方法: tmux attach-session -t itsm-requirement${NC}"
    else
        echo -e "${RED}❌ tmux環境起動に失敗${NC}"
        return 1
    fi
}

run_repair_only() {
    echo -e "${BOLD}${RED}🔧 修復ループ実行${NC}"
    
    cd "$SCRIPT_DIR"
    if [[ ! -f "./auto-webui-fixer.sh" ]]; then
        echo -e "${RED}❌ auto-webui-fixer.sh が見つかりません${NC}"
        return 1
    fi
    
    ./auto-webui-fixer.sh
}

run_monitor_only() {
    echo -e "${BOLD}${CYAN}📊 進捗監視開始${NC}"
    
    cd "$SCRIPT_DIR"
    if [[ ! -f "./progress-monitor.sh" ]]; then
        echo -e "${RED}❌ progress-monitor.sh が見つかりません${NC}"
        return 1
    fi
    
    ./progress-monitor.sh monitor
}

run_analyze_only() {
    echo -e "${BOLD}${PURPLE}🔍 修復対象分析実行${NC}"
    
    cd "$SCRIPT_DIR"
    if [[ ! -f "./repair-analyzer.sh" ]]; then
        echo -e "${RED}❌ repair-analyzer.sh が見つかりません${NC}"
        return 1
    fi
    
    ./repair-analyzer.sh analyze
}

show_latest_report() {
    echo -e "${BOLD}${PURPLE}📋 最新レポート表示${NC}"
    
    local report_dir="$PROJECT_ROOT/reports"
    
    if [[ -d "$report_dir" ]]; then
        # 最終レポート表示
        local latest_final=$(ls -t "$report_dir"/auto-fixer/final-report-*.json 2>/dev/null | head -n 1)
        if [[ -f "$latest_final" ]]; then
            echo -e "${GREEN}📊 最終実行レポート:${NC}"
            jq . "$latest_final" 2>/dev/null || cat "$latest_final"
            echo ""
        fi
        
        # 分析レポート表示
        local latest_analysis=$(ls -t "$report_dir"/repair-analysis/detailed-*.md 2>/dev/null | head -n 1)
        if [[ -f "$latest_analysis" ]]; then
            echo -e "${BLUE}🔍 最新分析レポート (最初の20行):${NC}"
            head -n 20 "$latest_analysis"
            echo -e "${CYAN}📄 完全版: $latest_analysis${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ レポートディレクトリが見つかりません${NC}"
    fi
}

# =========================
# メイン実行部
# =========================

main() {
    case "${1:-help}" in
        "full"|"auto")
            run_full_automation
            ;;
        "tmux"|"env")
            run_tmux_only
            ;;
        "repair"|"fix")
            run_repair_only
            ;;
        "monitor"|"watch")
            run_monitor_only
            ;;
        "analyze"|"analysis")
            run_analyze_only
            ;;
        "status"|"info")
            check_system_status
            ;;
        "check"|"requirements")
            check_requirements
            ;;
        "logs"|"log")
            show_latest_logs
            ;;
        "report"|"reports")
            show_latest_report
            ;;
        "clean"|"cleanup")
            clean_system
            ;;
        "reset")
            reset_system
            ;;
        "update"|"permissions")
            update_permissions
            ;;
        "version"|"ver")
            show_version
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo -e "${RED}❌ 不明なコマンド: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# スクリプトが直接実行された場合
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi