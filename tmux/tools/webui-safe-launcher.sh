#!/bin/bash

# WebUI安全起動ランチャー
# tmuxペインを保護しながらWebUIコマンドを安全に実行

set -euo pipefail

# =========================
# 設定・定数定義
# =========================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly LOG_DIR="$PROJECT_ROOT/logs/webui-auto-dev"
readonly SAFE_LOG="$LOG_DIR/safe_launcher.log"

# 色設定
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# =========================
# ユーティリティ関数
# =========================

print_info() {
    echo -e "${BLUE}[SAFE-LAUNCHER]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SAFE-OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[SAFE-ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[SAFE-WARN]${NC} $1"
}

get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

log_safe_action() {
    local action="$1"
    local status="$2"
    local details="$3"
    
    mkdir -p "$LOG_DIR"
    echo "[$(get_timestamp)] SAFE-LAUNCHER: $action - $status - $details" >> "$SAFE_LOG"
}

# =========================
# 環境検証
# =========================

verify_environment() {
    print_info "実行環境検証中..."
    
    # プロジェクトルート確認
    if [ ! -d "$PROJECT_ROOT/src" ]; then
        print_error "プロジェクトルートが正しくありません: $PROJECT_ROOT"
        return 1
    fi
    
    # 必要なスクリプト確認
    local required_scripts=(
        "$SCRIPT_DIR/webui-development-loop.sh"
        "$SCRIPT_DIR/webui-integration-coordinator.sh"
        "$SCRIPT_DIR/webui-quality-monitor.sh"
        "$PROJECT_ROOT/tmux/coordination/webui-leader-commands.sh"
    )
    
    for script in "${required_scripts[@]}"; do
        if [ ! -f "$script" ]; then
            print_warning "スクリプトが見つかりません: $script"
        fi
    done
    
    # Node.js環境確認
    if ! command -v node >/dev/null; then
        print_warning "Node.js がインストールされていません"
    fi
    
    # npm環境確認
    if ! command -v npm >/dev/null; then
        print_warning "npm がインストールされていません"
    fi
    
    print_success "環境検証完了"
    log_safe_action "ENVIRONMENT_CHECK" "SUCCESS" "Environment verified"
}

# =========================
# 安全実行ラッパー
# =========================

safe_execute() {
    local command="$1"
    local description="$2"
    local timeout="${3:-300}"  # デフォルト5分タイムアウト
    
    print_info "$description 実行中..."
    log_safe_action "COMMAND_START" "INFO" "$description: $command"
    
    # 一時ファイルでエラー捕捉
    local temp_output=$(mktemp)
    local temp_error=$(mktemp)
    
    # タイムアウト付き実行
    if timeout "$timeout" bash -c "$command" > "$temp_output" 2> "$temp_error"; then
        print_success "$description 完了"
        log_safe_action "COMMAND_SUCCESS" "SUCCESS" "$description completed"
        
        # 出力表示 (最後の20行のみ)
        if [ -s "$temp_output" ]; then
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "実行結果 (最後の20行):"
            tail -n 20 "$temp_output"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        fi
        
        rm -f "$temp_output" "$temp_error"
        return 0
    else
        local exit_code=$?
        print_error "$description 失敗 (終了コード: $exit_code)"
        log_safe_action "COMMAND_FAILED" "ERROR" "$description failed with code $exit_code"
        
        # エラー出力表示
        if [ -s "$temp_error" ]; then
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "エラー内容:"
            cat "$temp_error"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        fi
        
        rm -f "$temp_output" "$temp_error"
        return $exit_code
    fi
}

# =========================
# WebUI安全起動
# =========================

safe_launch_webui_development() {
    print_info "WebUI開発ループ安全起動"
    
    verify_environment
    
    # 開発ループスクリプト実行
    local dev_loop_script="$SCRIPT_DIR/webui-development-loop.sh"
    if [ -f "$dev_loop_script" ]; then
        safe_execute "$dev_loop_script --max-loops 5 --quality-threshold 75" "WebUI開発ループ (安全モード)" 600
    else
        print_error "開発ループスクリプトが見つかりません: $dev_loop_script"
        return 1
    fi
}

safe_launch_integration_coordinator() {
    print_info "4フェーズ統合コーディネーター安全起動"
    
    verify_environment
    
    # 統合コーディネーター実行
    local coordinator_script="$SCRIPT_DIR/webui-integration-coordinator.sh"
    if [ -f "$coordinator_script" ]; then
        safe_execute "$coordinator_script --start --max-loops 3 --threshold 80" "4フェーズ統合コーディネーター (安全モード)" 300
    else
        print_error "統合コーディネーターが見つかりません: $coordinator_script"
        return 1
    fi
}

safe_launch_quality_monitor() {
    print_info "品質監視システム安全起動"
    
    verify_environment
    
    # 品質監視実行 (短時間版)
    local monitor_script="$SCRIPT_DIR/webui-quality-monitor.sh"
    if [ -f "$monitor_script" ]; then
        safe_execute "$monitor_script --status" "品質監視システム (ステータス確認)" 60
    else
        print_error "品質監視スクリプトが見つかりません: $monitor_script"
        return 1
    fi
}

safe_launch_feature_development() {
    local feature="$1"
    
    print_info "Feature-$feature 安全起動"
    
    verify_environment
    
    local feature_script="$PROJECT_ROOT/tmux/coordination/webui-auto-dev-feature-${feature,,}.sh"
    if [ -f "$feature_script" ]; then
        case "$feature" in
            "B"|"b")
                safe_execute "$feature_script --components" "Feature-B UI自動開発 (安全モード)" 180
                ;;
            "C"|"c")
                safe_execute "$feature_script --apis" "Feature-C API自動開発 (安全モード)" 180
                ;;
            "D"|"d")
                safe_execute "$feature_script --apis" "Feature-D PowerShell自動開発 (安全モード)" 180
                ;;
            "E"|"e")
                safe_execute "$feature_script --security" "Feature-E 品質保証自動開発 (安全モード)" 180
                ;;
            *)
                print_error "不明なFeature: $feature"
                return 1
                ;;
        esac
    else
        print_error "Feature-$feature スクリプトが見つかりません: $feature_script"
        return 1
    fi
}

# =========================
# 使用方法表示
# =========================

show_usage() {
    echo -e "${BOLD}${BLUE}WebUI安全起動ランチャー v1.0${NC}"
    echo ""
    echo "使用方法: $0 [コマンド]"
    echo ""
    echo -e "${GREEN}安全起動コマンド:${NC}"
    echo "  development-loop        WebUI開発ループ安全起動 (5ループ、品質75%)"
    echo "  integration            4フェーズ統合コーディネーター安全起動 (3ループ)"
    echo "  quality-monitor        品質監視システム状況確認"
    echo "  feature-b              Feature-B UI自動開発安全実行"
    echo "  feature-c              Feature-C API自動開発安全実行"
    echo "  feature-d              Feature-D PowerShell自動開発安全実行"
    echo "  feature-e              Feature-E 品質保証自動開発安全実行"
    echo ""
    echo -e "${YELLOW}システム関連:${NC}"
    echo "  verify                 環境検証のみ実行"
    echo "  status                 システム状況確認"
    echo "  help                   このヘルプを表示"
    echo ""
    echo -e "${CYAN}特徴:${NC}"
    echo "  • ペイン保護: エラーが発生してもペインが消えません"
    echo "  • タイムアウト保護: 長時間実行を自動停止"
    echo "  • 安全モード: 短時間・低負荷での実行"
    echo "  • ログ記録: 全実行履歴を記録"
}

show_system_status() {
    print_info "システム状況確認"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "プロジェクト情報:"
    echo "  プロジェクトルート: $PROJECT_ROOT"
    echo "  ログディレクトリ: $LOG_DIR"
    echo ""
    
    echo "ファイル状況:"
    if [ -d "$PROJECT_ROOT/src" ]; then
        local tsx_files=$(find "$PROJECT_ROOT/src" -name "*.tsx" 2>/dev/null | wc -l)
        local ts_files=$(find "$PROJECT_ROOT/src" -name "*.ts" 2>/dev/null | wc -l)
        echo "  TypeScript/TSXファイル: $((tsx_files + ts_files)) 個"
    fi
    
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        echo "  package.json: 存在"
    else
        echo "  package.json: 見つかりません"
    fi
    
    echo ""
    echo "WebUIスクリプト状況:"
    local webui_scripts=(
        "webui-development-loop.sh"
        "webui-integration-coordinator.sh"
        "webui-quality-monitor.sh"
        "webui-auto-fixer.sh"
        "webui-emergency-stop.sh"
    )
    
    for script in "${webui_scripts[@]}"; do
        if [ -f "$SCRIPT_DIR/$script" ]; then
            echo "  ✅ $script"
        else
            echo "  ❌ $script"
        fi
    done
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# =========================
# メイン実行
# =========================

main() {
    local command="${1:-help}"
    
    case "$command" in
        "development-loop")
            safe_launch_webui_development
            ;;
        "integration")
            safe_launch_integration_coordinator
            ;;
        "quality-monitor")
            safe_launch_quality_monitor
            ;;
        "feature-b")
            safe_launch_feature_development "b"
            ;;
        "feature-c")
            safe_launch_feature_development "c"
            ;;
        "feature-d")
            safe_launch_feature_development "d"
            ;;
        "feature-e")
            safe_launch_feature_development "e"
            ;;
        "verify")
            verify_environment
            ;;
        "status")
            show_system_status
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            print_error "不明なコマンド: $command"
            show_usage
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"