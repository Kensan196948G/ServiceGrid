#!/bin/bash

# tmux hook設定: セッション接続時にClaude Code自動起動

SESSION_NAME="itsm-requirement"
SCRIPT_DIR="/mnt/e/ServiceGrid/tmux"

# tmux hookを設定してattach時にClaude Code環境を自動設定
setup_tmux_hooks() {
    echo "🔗 tmux hook設定中: セッション接続時Claude Code自動起動"
    
    # セッション存在確認
    if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        echo "❌ セッション '$SESSION_NAME' が見つかりません"
        return 1
    fi
    
    # client-attached フックを設定 (非対話型)
    tmux set-hook -t "$SESSION_NAME" client-attached "run-shell 'bash $SCRIPT_DIR/setup-claude-noninteractive.sh both'"
    
    # session-created フックを設定 (新規作成時)
    tmux set-hook -t "$SESSION_NAME" session-created "run-shell 'bash $SCRIPT_DIR/setup-claude-noninteractive.sh both'"
    
    echo "✅ tmux hook設定完了"
    echo "🤖 今後セッション接続時に自動でClaude Code環境が設定されます"
}

# フック削除 (必要に応じて)
remove_tmux_hooks() {
    echo "🗑️ tmux hook削除中..."
    tmux set-hook -t "$SESSION_NAME" -u client-attached
    tmux set-hook -t "$SESSION_NAME" -u session-created
    echo "✅ tmux hook削除完了"
}

# 引数に応じて実行
case "${1:-setup}" in
    setup|auto)
        setup_tmux_hooks
        ;;
    remove|delete)
        remove_tmux_hooks
        ;;
    *)
        echo "使用方法: $0 [setup|remove]"
        echo "  setup  : セッション接続時にClaude Code自動起動を設定 (デフォルト)"
        echo "  remove : 自動起動設定を削除"
        ;;
esac