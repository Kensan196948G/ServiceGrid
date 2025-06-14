#!/bin/bash
# Feature-A → Feature-B (UI/テスト) 指示送信

SESSION="itsm-dev"
INSTRUCTION="$1"

if [ -z "$INSTRUCTION" ]; then
    echo "使用方法: $0 'UI/テスト指示'"
    echo "例: $0 'Reactコンポーネントのテストを実行してください'"
    exit 1
fi

echo "🎨 Feature-B (UI/テスト) に指示送信中..."
tmux send-keys -t "$SESSION:0" "$INSTRUCTION" C-m
echo "✅ Feature-B指示送信完了"
