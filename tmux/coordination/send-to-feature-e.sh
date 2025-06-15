#!/bin/bash
# Feature-A → Feature-E (非機能要件) 指示送信

SESSION="itsm-requirement"
INSTRUCTION="$1"

if [ -z "$INSTRUCTION" ]; then
    echo "使用方法: $0 '非機能要件指示'"
    echo "例: $0 'セキュリティテストを実行してください'"
    exit 1
fi

echo "🔒 Feature-E (非機能要件) に指示送信中..."
tmux send-keys -t "$SESSION:0.3" "claude '$INSTRUCTION'" C-m
echo "✅ Feature-E指示送信完了"
