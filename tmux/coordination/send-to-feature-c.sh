#!/bin/bash
# Feature-A → Feature-C (API開発) 指示送信

SESSION="itsm-requirement"
INSTRUCTION="$1"

if [ -z "$INSTRUCTION" ]; then
    echo "使用方法: $0 'API開発指示'"
    echo "例: $0 'REST APIエンドポイントを実装してください'"
    exit 1
fi

echo "🔧 Feature-C (API開発) に指示送信中..."
tmux send-keys -t "$SESSION:0.1" "claude '$INSTRUCTION'" C-m
echo "✅ Feature-C指示送信完了"
