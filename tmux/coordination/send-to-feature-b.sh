#!/bin/bash
# Feature-A → Feature-B (UI/テスト) 指示送信

SESSION="itsm-requirement"
USE_AT_CLAUDE=false

# パラメータ解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --at-claude)
            USE_AT_CLAUDE=true
            shift
            ;;
        *)
            INSTRUCTION="$1"
            shift
            ;;
    esac
done

if [ -z "$INSTRUCTION" ]; then
    echo "使用方法: $0 [--at-claude] 'UI/テスト指示'"
    echo "例: $0 'Reactコンポーネントのテストを実行してください'"
    echo "例: $0 --at-claude 'UIテストを実行してください'"
    exit 1
fi

echo "🎨 Feature-B (UI/テスト) に指示送信中..."

if [ "$USE_AT_CLAUDE" = true ]; then
    tmux send-keys -t "$SESSION:0.0" "@claude $INSTRUCTION" C-m
    echo "✅ Feature-B指示送信完了 (@claude形式)"
else
    tmux send-keys -t "$SESSION:0.0" "claude '$INSTRUCTION'" C-m
    echo "✅ Feature-B指示送信完了 (claude形式)"
fi
