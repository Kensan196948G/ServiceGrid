#!/bin/bash

# 既存セッションに追加ペインを作成するスクリプト

SESSION_NAME="itsm-dev"

echo "🔧 既存セッションに追加ペイン作成中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    echo "先に新しいセッションを作成してください"
    exit 1
fi

# 現在のペイン数確認
CURRENT_PANES=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
echo "📋 現在のペイン数: $CURRENT_PANES"

echo "📋 現在のペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: #{pane_width}x#{pane_height}"

# 5ペインに足りない分を追加
NEEDED_PANES=$((5 - CURRENT_PANES))
echo "📐 追加が必要なペイン数: $NEEDED_PANES"

if [ "$NEEDED_PANES" -le 0 ]; then
    echo "✅ 既に5ペイン以上あります（${CURRENT_PANES}ペイン）"
    tmux attach-session -t "$SESSION_NAME"
    exit 0
fi

echo "🔧 $NEEDED_PANES 個のペインを追加します..."

for attempt in $(seq 1 $NEEDED_PANES); do
    echo "  試行 $attempt/$NEEDED_PANES ..."
    
    ADDED=false
    
    # 各既存ペインで分割を試行
    for pane in $(seq 0 $((CURRENT_PANES + attempt - 2))); do
        if tmux split-window -h -t "$SESSION_NAME.$pane" 2>/dev/null; then
            echo "    ✅ ペイン$pane で水平分割成功"
            ADDED=true
            break
        elif tmux split-window -v -t "$SESSION_NAME.$pane" 2>/dev/null; then
            echo "    ✅ ペイン$pane で垂直分割成功"
            ADDED=true
            break
        fi
    done
    
    if [ "$ADDED" = false ]; then
        echo "    ❌ 分割に失敗しました"
        break
    fi
done

# 最終結果
FINAL_PANES=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
echo ""
echo "🎯 最終結果:"
echo "  開始時: ${CURRENT_PANES}ペイン"
echo "  最終: ${FINAL_PANES}ペイン"
echo "  目標: 5ペイン"

if [ "$FINAL_PANES" -eq 5 ]; then
    echo "🎉 5ペインの作成に成功しました！"
elif [ "$FINAL_PANES" -gt "$CURRENT_PANES" ]; then
    echo "✅ ${FINAL_PANES}ペインに増加しました"
else
    echo "⚠️ ペイン数が変わりませんでした"
fi

# レイアウト調整
tmux select-layout -t "$SESSION_NAME" tiled

echo ""
echo "📋 最終ペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: #{pane_width}x#{pane_height}"

echo ""
echo "🔌 セッションに接続します..."
tmux attach-session -t "$SESSION_NAME"