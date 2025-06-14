#!/bin/bash
# Feature-A統合リーダーから全ペインに指示送信

SESSION="itsm-dev"
INSTRUCTION="$1"

if [ -z "$INSTRUCTION" ]; then
    echo "使用方法: $0 '指示内容'"
    echo "例: $0 '新機能開発を開始してください'"
    exit 1
fi

echo "🎯 Feature-A統合指示を全ペインに送信中..."
echo "指示内容: $INSTRUCTION"

# 各ペインに指示送信（2×2グリッド）
tmux send-keys -t "$SESSION:0.0" "$INSTRUCTION" C-m
tmux send-keys -t "$SESSION:0.1" "$INSTRUCTION" C-m  
tmux send-keys -t "$SESSION:0.2" "$INSTRUCTION" C-m
tmux send-keys -t "$SESSION:0.3" "$INSTRUCTION" C-m

echo "✅ 全ペインに指示送信完了"
