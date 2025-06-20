#!/bin/bash

# WebUI緊急停止システム
# 自動開発・修復ループの安全な緊急停止と状態保存

set -euo pipefail

# =========================
# 設定・定数定義
# =========================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly LOG_DIR="$PROJECT_ROOT/logs/webui-auto-dev"
readonly EMERGENCY_LOG="$LOG_DIR/emergency_stop.log"
readonly PROCESS_LOCK_DIR="$LOG_DIR/locks"
readonly BACKUP_DIR="$LOG_DIR/emergency_backup"

# 色設定
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# =========================
# ユーティリティ関数
# =========================

print_info() {
    echo -e "${BLUE}[EMERGENCY]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[EMERGENCY-OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[EMERGENCY-ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[EMERGENCY-WARN]${NC} $1"
}

print_critical() {
    echo -e "${BOLD}${RED}[EMERGENCY-CRITICAL]${NC} $1"
}

print_header() {
    echo -e "${BOLD}${RED}================================================================${NC}"
    echo -e "${BOLD}${RED} 🚨 WebUI緊急停止システム 🚨${NC}"
    echo -e "${BOLD}${RED}================================================================${NC}"
    echo ""
}

get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

log_emergency_action() {
    local action="$1"
    local status="$2"
    local details="$3"
    
    mkdir -p "$LOG_DIR"
    echo "[$(get_timestamp)] EMERGENCY: $action - $status - $details" >> "$EMERGENCY_LOG"
}

# =========================
# 実行中プロセス検出
# =========================

find_running_processes() {
    local running_processes=()
    
    print_info "実行中のWebUI関連プロセスを検索中..."
    
    # WebUI開発ループプロセス
    local dev_loop_pids=$(pgrep -f "webui-development-loop" 2>/dev/null || echo "")
    if [ -n "$dev_loop_pids" ]; then
        running_processes+=("webui-development-loop:$dev_loop_pids")
        print_warning "開発ループプロセス検出: PID $dev_loop_pids"
    fi
    
    # 品質監視プロセス
    local monitor_pids=$(pgrep -f "webui-quality-monitor" 2>/dev/null || echo "")
    if [ -n "$monitor_pids" ]; then
        running_processes+=("webui-quality-monitor:$monitor_pids")
        print_warning "品質監視プロセス検出: PID $monitor_pids"
    fi
    
    # 自動修復プロセス
    local fixer_pids=$(pgrep -f "webui-auto-fixer" 2>/dev/null || echo "")
    if [ -n "$fixer_pids" ]; then
        running_processes+=("webui-auto-fixer:$fixer_pids")
        print_warning "自動修復プロセス検出: PID $fixer_pids"
    fi
    
    # npm/nodeプロセス (テスト・ビルド関連)
    local npm_pids=$(pgrep -f "npm.*test\|npm.*build\|npm.*lint" 2>/dev/null || echo "")
    if [ -n "$npm_pids" ]; then
        running_processes+=("npm-processes:$npm_pids")
        print_warning "npm関連プロセス検出: PID $npm_pids"
    fi
    
    # TypeScriptコンパイラ
    local tsc_pids=$(pgrep -f "tsc.*--watch\|tsc.*--noEmit" 2>/dev/null || echo "")
    if [ -n "$tsc_pids" ]; then
        running_processes+=("typescript-compiler:$tsc_pids")
        print_warning "TypeScriptコンパイラ検出: PID $tsc_pids"
    fi
    
    # ESLint関連プロセス
    local eslint_pids=$(pgrep -f "eslint" 2>/dev/null || echo "")
    if [ -n "$eslint_pids" ]; then
        running_processes+=("eslint:$eslint_pids")
        print_warning "ESLintプロセス検出: PID $eslint_pids"
    fi
    
    # tmuxセッション内のプロセス
    if command -v tmux >/dev/null && tmux has-session -t "itsm-requirement" 2>/dev/null; then
        print_warning "tmuxセッション 'itsm-requirement' が実行中"
        running_processes+=("tmux-session:itsm-requirement")
    fi
    
    if [ ${#running_processes[@]} -eq 0 ]; then
        print_success "実行中のWebUI関連プロセスは見つかりませんでした"
    else
        print_warning "${#running_processes[@]} 個のプロセス/セッションが実行中です"
    fi
    
    # 配列を出力（グローバルスコープで使用するため）
    printf '%s\n' "${running_processes[@]}"
}

# =========================
# 安全な状態保存
# =========================

save_current_state() {
    print_info "現在の状態を保存中..."
    
    mkdir -p "$BACKUP_DIR"
    local backup_timestamp=$(date '+%Y%m%d_%H%M%S')
    local state_backup_dir="$BACKUP_DIR/state_$backup_timestamp"
    mkdir -p "$state_backup_dir"
    
    # 現在のループ状態保存
    if [ -f "$LOG_DIR/current_loop_status.json" ]; then
        cp "$LOG_DIR/current_loop_status.json" "$state_backup_dir/"
        print_success "ループ状態を保存しました"
    fi
    
    # 開発ループレポート保存
    if [ -f "$LOG_DIR/development_loop_report.json" ]; then
        cp "$LOG_DIR/development_loop_report.json" "$state_backup_dir/"
        print_success "開発ループレポートを保存しました"
    fi
    
    # エラー抽出結果保存
    if [ -f "$LOG_DIR/error_extraction_report.json" ]; then
        cp "$LOG_DIR/error_extraction_report.json" "$state_backup_dir/"
        print_success "エラー抽出結果を保存しました"
    fi
    
    # 修復レポート保存
    if [ -f "$LOG_DIR/auto_fix_report.json" ]; then
        cp "$LOG_DIR/auto_fix_report.json" "$state_backup_dir/"
        print_success "修復レポートを保存しました"
    fi
    
    # 品質履歴保存
    if [ -f "$LOG_DIR/quality_history.json" ]; then
        cp "$LOG_DIR/quality_history.json" "$state_backup_dir/"
        print_success "品質履歴を保存しました"
    fi
    
    # 実行中プロセス情報保存
    find_running_processes > "$state_backup_dir/running_processes.txt"
    ps aux | grep -E "webui|npm|tsc|eslint" > "$state_backup_dir/process_snapshot.txt" 2>/dev/null || true
    
    # システム状態保存
    cat > "$state_backup_dir/system_state.json" << EOF
{
    "emergency_stop_time": "$(get_timestamp)",
    "backup_location": "$state_backup_dir",
    "webui_source_path": "$PROJECT_ROOT/src",
    "file_counts": {
        "typescript_files": $(find "$PROJECT_ROOT/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l),
        "test_files": $(find "$PROJECT_ROOT/src" -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | wc -l),
        "total_log_files": $(find "$LOG_DIR" -name "*.log" 2>/dev/null | wc -l)
    },
    "git_status": "$(cd "$PROJECT_ROOT" && git status --porcelain 2>/dev/null | wc -l) files changed"
}
EOF
    
    print_success "システム状態をバックアップしました: $state_backup_dir"
    log_emergency_action "STATE_BACKUP" "SUCCESS" "Backup saved to $state_backup_dir"
    
    echo "$state_backup_dir"
}

# =========================
# プロセス安全停止
# =========================

stop_processes_safely() {
    local running_processes=("$@")
    
    if [ ${#running_processes[@]} -eq 0 ]; then
        print_success "停止するプロセスはありません"
        return 0
    fi
    
    print_info "実行中プロセスの安全な停止を開始..."
    
    for process_info in "${running_processes[@]}"; do
        local process_name=$(echo "$process_info" | cut -d':' -f1)
        local process_ids=$(echo "$process_info" | cut -d':' -f2)
        
        print_info "停止中: $process_name"
        
        case "$process_name" in
            "webui-development-loop"|"webui-quality-monitor"|"webui-auto-fixer")
                # WebUI関連プロセスは段階的停止
                for pid in $process_ids; do
                    if kill -0 "$pid" 2>/dev/null; then
                        print_info "プロセス $pid に停止シグナル送信中..."
                        kill -TERM "$pid" 2>/dev/null || true
                        
                        # 5秒待機して確認
                        local wait_count=0
                        while [ $wait_count -lt 5 ] && kill -0 "$pid" 2>/dev/null; do
                            sleep 1
                            ((wait_count++))
                        done
                        
                        # まだ実行中の場合は強制終了
                        if kill -0 "$pid" 2>/dev/null; then
                            print_warning "プロセス $pid を強制終了します"
                            kill -KILL "$pid" 2>/dev/null || true
                        fi
                        
                        print_success "プロセス $pid を停止しました"
                        log_emergency_action "PROCESS_STOP" "SUCCESS" "$process_name PID:$pid"
                    fi
                done
                ;;
                
            "npm-processes")
                # npmプロセスは優雅に停止
                for pid in $process_ids; do
                    if kill -0 "$pid" 2>/dev/null; then
                        print_info "npmプロセス $pid を停止中..."
                        kill -INT "$pid" 2>/dev/null || true
                        sleep 2
                        if kill -0 "$pid" 2>/dev/null; then
                            kill -TERM "$pid" 2>/dev/null || true
                        fi
                        print_success "npmプロセス $pid を停止しました"
                    fi
                done
                ;;
                
            "typescript-compiler"|"eslint")
                # コンパイラ・リンターは即座に停止
                for pid in $process_ids; do
                    if kill -0 "$pid" 2>/dev/null; then
                        kill -TERM "$pid" 2>/dev/null || true
                        print_success "$process_name プロセス $pid を停止しました"
                    fi
                done
                ;;
                
            "tmux-session")
                # tmuxセッションは特別な処理
                if tmux has-session -t "itsm-requirement" 2>/dev/null; then
                    print_info "tmuxセッション 'itsm-requirement' を停止中..."
                    
                    # 各ペインに停止コマンド送信
                    for pane in 0 1 2 3 4; do
                        if tmux list-panes -t "itsm-requirement:0" 2>/dev/null | grep -q "^$pane:"; then
                            tmux send-keys -t "itsm-requirement:0.$pane" C-c 2>/dev/null || true
                            sleep 0.5
                        fi
                    done
                    
                    # セッション終了
                    sleep 2
                    tmux kill-session -t "itsm-requirement" 2>/dev/null || true
                    print_success "tmuxセッションを停止しました"
                    log_emergency_action "TMUX_STOP" "SUCCESS" "Session itsm-requirement terminated"
                fi
                ;;
        esac
    done
    
    print_success "全プロセスの停止処理が完了しました"
}

# =========================
# ロックファイル管理
# =========================

manage_lock_files() {
    print_info "ロックファイルの管理中..."
    
    mkdir -p "$PROCESS_LOCK_DIR"
    
    # 既存のロックファイルを確認
    local lock_files=($(find "$PROCESS_LOCK_DIR" -name "*.lock" 2>/dev/null || true))
    
    if [ ${#lock_files[@]} -gt 0 ]; then
        print_info "${#lock_files[@]} 個のロックファイルが見つかりました"
        
        for lock_file in "${lock_files[@]}"; do
            local lock_name=$(basename "$lock_file" .lock)
            
            # ロックファイル内のPID確認
            if [ -r "$lock_file" ]; then
                local locked_pid=$(cat "$lock_file" 2>/dev/null || echo "")
                
                if [ -n "$locked_pid" ] && kill -0 "$locked_pid" 2>/dev/null; then
                    print_warning "アクティブなロック: $lock_name (PID: $locked_pid)"
                    # アクティブなプロセスは保護
                    mv "$lock_file" "${lock_file}.emergency_preserved"
                    log_emergency_action "LOCK_PRESERVE" "SUCCESS" "$lock_name preserved as active"
                else
                    print_info "非アクティブなロック削除: $lock_name"
                    rm -f "$lock_file"
                    log_emergency_action "LOCK_CLEANUP" "SUCCESS" "$lock_name removed (stale)"
                fi
            else
                print_warning "読み取り不可能なロック削除: $lock_name"
                rm -f "$lock_file"
            fi
        done
    else
        print_success "ロックファイルは見つかりませんでした"
    fi
    
    # 緊急停止ロックファイル作成
    local emergency_lock="$PROCESS_LOCK_DIR/emergency_stop.lock"
    echo "$$" > "$emergency_lock"
    echo "$(get_timestamp)" >> "$emergency_lock"
    print_success "緊急停止ロックファイルを作成しました"
}

# =========================
# 確認ダイアログ
# =========================

confirm_emergency_stop() {
    print_header
    print_critical "WebUI自動開発・修復システムの緊急停止を実行しようとしています"
    echo ""
    print_warning "この操作により以下が実行されます:"
    echo "  • 全ての実行中WebUI関連プロセスの停止"
    echo "  • 現在の状態とデータのバックアップ"
    echo "  • tmuxセッションの安全な終了"
    echo "  • ロックファイルの管理"
    echo ""
    
    # 実行中プロセス表示
    local running_processes_array=($(find_running_processes))
    if [ ${#running_processes_array[@]} -gt 0 ]; then
        print_warning "停止対象のプロセス:"
        for process_info in "${running_processes_array[@]}"; do
            local process_name=$(echo "$process_info" | cut -d':' -f1)
            local process_ids=$(echo "$process_info" | cut -d':' -f2)
            echo "  • $process_name: $process_ids"
        done
        echo ""
    fi
    
    if [ "${1:-}" = "--force" ]; then
        print_info "強制モードが指定されました。確認をスキップします。"
        return 0
    fi
    
    echo -n -e "${BOLD}${RED}緊急停止を実行しますか? (y/N): ${NC}"
    read -r response
    
    case "$response" in
        [yY]|[yY][eE][sS])
            return 0
            ;;
        *)
            print_info "緊急停止をキャンセルしました"
            return 1
            ;;
    esac
}

# =========================
# 復旧情報表示
# =========================

show_recovery_info() {
    local backup_dir="$1"
    
    print_section "🔄 復旧情報"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    print_info "緊急停止が完了しました。以下の手順で復旧できます:"
    echo ""
    
    echo -e "${BOLD}1. 状態確認:${NC}"
    echo "   ./webui-quality-monitor.sh --status"
    echo ""
    
    echo -e "${BOLD}2. バックアップ確認:${NC}"
    echo "   ls -la $backup_dir"
    echo ""
    
    echo -e "${BOLD}3. tmux開発環境の再起動:${NC}"
    echo "   cd $PROJECT_ROOT/tmux"
    echo "   ./start-development.sh"
    echo ""
    
    echo -e "${BOLD}4. 自動開発ループの再開:${NC}"
    echo "   leader webui-development-loop"
    echo ""
    
    echo -e "${BOLD}5. 品質監視の再開:${NC}"
    echo "   ./webui-quality-monitor.sh"
    echo ""
    
    print_warning "重要: 緊急停止の原因を調査してから再開することを推奨します"
    
    if [ -f "$EMERGENCY_LOG" ]; then
        echo ""
        print_info "緊急停止ログ: $EMERGENCY_LOG"
        echo "最新のエントリ:"
        tail -n 5 "$EMERGENCY_LOG" 2>/dev/null || echo "ログの読み取りに失敗しました"
    fi
}

# =========================
# 使用方法表示
# =========================

show_usage() {
    echo "WebUI緊急停止システム"
    echo ""
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  (なし)              対話的緊急停止"
    echo "  --force             確認なしで強制停止"
    echo "  --check             実行中プロセスの確認のみ"
    echo "  --clean-locks       ロックファイルのクリーンアップのみ"
    echo "  --help              このヘルプを表示"
}

# =========================
# メイン実行
# =========================

main() {
    local mode="interactive"
    
    # 引数解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                mode="force"
                shift
                ;;
            --check)
                mode="check"
                shift
                ;;
            --clean-locks)
                mode="clean-locks"
                shift
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
    
    # 緊急停止開始ログ
    log_emergency_action "EMERGENCY_START" "INFO" "Emergency stop initiated with mode: $mode"
    
    # モード別実行
    case "$mode" in
        check)
            print_header
            find_running_processes
            ;;
            
        clean-locks)
            print_info "ロックファイルクリーンアップのみ実行します"
            manage_lock_files
            ;;
            
        force)
            print_header
            print_info "強制緊急停止を実行します"
            
            local backup_dir=$(save_current_state)
            local running_processes_array=($(find_running_processes))
            stop_processes_safely "${running_processes_array[@]}"
            manage_lock_files
            
            print_success "強制緊急停止が完了しました"
            show_recovery_info "$backup_dir"
            log_emergency_action "EMERGENCY_COMPLETE" "SUCCESS" "Force emergency stop completed"
            ;;
            
        interactive)
            if confirm_emergency_stop; then
                print_info "緊急停止を実行しています..."
                
                local backup_dir=$(save_current_state)
                local running_processes_array=($(find_running_processes))
                stop_processes_safely "${running_processes_array[@]}"
                manage_lock_files
                
                print_success "緊急停止が正常に完了しました"
                show_recovery_info "$backup_dir"
                log_emergency_action "EMERGENCY_COMPLETE" "SUCCESS" "Interactive emergency stop completed"
            else
                log_emergency_action "EMERGENCY_CANCELLED" "INFO" "Emergency stop cancelled by user"
                exit 1
            fi
            ;;
            
        *)
            print_error "不明なモード: $mode"
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"