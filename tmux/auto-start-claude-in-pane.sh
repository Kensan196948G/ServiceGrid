#!/bin/bash

# 各ペインでClaude Codeを実際に起動するスクリプト

SESSION_NAME="itsm-requirement"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🤖 各ペインでClaude Code実行を開始します..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

# 各ペインでClaude Code起動
start_claude_in_panes() {
    local pane_indexes=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}"))
    
    for i in "${!pane_indexes[@]}"; do
        local pane_num="${pane_indexes[$i]}"
        
        case $i in
            0) local feature_name="Feature-B-UI" ;;
            1) local feature_name="Feature-C-API" ;;
            2) local feature_name="Feature-D-PowerShell" ;;
            3) local feature_name="Feature-E-NonFunc" ;;
            4) local feature_name="Feature-A-Leader" ;;
            *) local feature_name="Feature-$((i+1))" ;;
        esac
        
        echo "🚀 ペイン$pane_num ($feature_name) でClaude Code起動中..."
        
        # 各ペインでClaude Codeを実際に起動
        tmux send-keys -t "$SESSION_NAME.$pane_num" "clear" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '🤖 $feature_name Claude Code起動中...'" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "claude" C-m
        
        sleep 1
    done
}

# ペインでClaude Code停止
stop_claude_in_panes() {
    local pane_indexes=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}"))
    
    echo "⏹️ 各ペインのClaude Code停止中..."
    
    for i in "${!pane_indexes[@]}"; do
        local pane_num="${pane_indexes[$i]}"
        
        # Claude Codeプロセスを停止 (Ctrl+C)
        tmux send-keys -t "$SESSION_NAME.$pane_num" C-c
        sleep 0.5
        
        # プロンプトをリセット
        case $i in
            0) tmux send-keys -t "$SESSION_NAME.$pane_num" "export PS1='[Feature-B-UI] \\w$ '" C-m ;;
            1) tmux send-keys -t "$SESSION_NAME.$pane_NUM" "export PS1='[Feature-C-API] \\w$ '" C-m ;;
            2) tmux send-keys -t "$SESSION_NAME.$pane_num" "export PS1='[Feature-D-PowerShell] \\w$ '" C-m ;;
            3) tmux send-keys -t "$SESSION_NAME.$pane_num" "export PS1='[Feature-E-NonFunc] \\w$ '" C-m ;;
            4) tmux send-keys -t "$SESSION_NAME.$pane_num" "export PS1='[Feature-A-Leader] \\w$ '" C-m ;;
        esac
    done
}

# 引数に応じて実行
case "${1:-start}" in
    start|run)
        start_claude_in_panes
        echo ""
        echo "✅ 全ペインでClaude Code起動完了！"
        echo "💡 各ペインでClaudeコマンドが実行中です"
        echo "⏹️ 停止するには: $0 stop"
        ;;
    stop|kill)
        stop_claude_in_panes
        echo "✅ 全ペインのClaude Code停止完了"
        ;;
    *)
        echo "使用方法: $0 [start|stop]"
        echo "  start : 各ペインでClaude Code起動 (デフォルト)"
        echo "  stop  : 各ペインのClaude Code停止"
        ;;
esac