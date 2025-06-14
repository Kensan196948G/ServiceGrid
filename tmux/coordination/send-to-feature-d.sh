#!/bin/bash
# Feature-A → Feature-D (PowerShell) 指示送信

SESSION="itsm-dev"
INSTRUCTION="$1"

if [ -z "$INSTRUCTION" ]; then
    echo "使用方法: $0 'PowerShell指示'"
    echo "例: $0 'PowerShellスクリプトをテストしてください'"
    exit 1
fi

echo "💻 Feature-D (PowerShell) に指示送信中..."
tmux send-keys -t "$SESSION:0.2" "$INSTRUCTION" C-m
echo "✅ Feature-D指示送信完了"
