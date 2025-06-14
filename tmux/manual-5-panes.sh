#!/bin/bash

# 手動で確実に5ペインを作成するスクリプト

SESSION_NAME="itsm-dev"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🔧 手動5ペイン作成スクリプト"
echo "   各ステップでペイン数を確認しながら実行します"

# 既存セッション削除
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# セッション作成
echo "Step 1: セッション作成"
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"
PANES=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
echo "   現在のペイン数: $PANES"

# 分割1
echo "Step 2: 最初の分割"
tmux split-window -h -t "$SESSION_NAME"
PANES=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
echo "   現在のペイン数: $PANES"

# 分割2
echo "Step 3: 2番目の分割"
tmux split-window -v -t "$SESSION_NAME.0"
PANES=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
echo "   現在のペイン数: $PANES"

# 分割3
echo "Step 4: 3番目の分割"
tmux split-window -v -t "$SESSION_NAME.2"
PANES=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
echo "   現在のペイン数: $PANES"

# 分割4（5番目のペイン作成）
echo "Step 5: 4番目の分割（5番目のペイン作成）"

# 現在のペイン一覧表示
echo "   分割前のペイン一覧:"
tmux list-panes -t "$SESSION_NAME" -F "   ペイン#{pane_index}: #{pane_width}x#{pane_height}"

# 最後のペインを分割
LAST_PANE=$((PANES-1))
echo "   ペイン$LAST_PANE を分割します..."

# 複数の分割方法を試行
if tmux split-window -h -t "$SESSION_NAME.$LAST_PANE" 2>/dev/null; then
    echo "   ✅ 水平分割成功"
elif tmux split-window -v -t "$SESSION_NAME.$LAST_PANE" 2>/dev/null; then
    echo "   ✅ 垂直分割成功"
else
    echo "   ⚠️ ペイン$LAST_PANE の分割に失敗"
    # 他のペインで試行
    for i in $(seq 0 $((PANES-1))); do
        if tmux split-window -h -t "$SESSION_NAME.$i" 2>/dev/null; then
            echo "   ✅ ペイン$i での水平分割成功"
            break
        elif tmux split-window -v -t "$SESSION_NAME.$i" 2>/dev/null; then
            echo "   ✅ ペイン$i での垂直分割成功"
            break
        fi
    done
fi

# 最終ペイン数確認
FINAL_PANES=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
echo "   最終ペイン数: $FINAL_PANES"

# レイアウト調整
tmux select-layout -t "$SESSION_NAME" tiled

echo ""
echo "🎯 最終結果:"
echo "   作成されたペイン数: $FINAL_PANES / 5"

if [ "$FINAL_PANES" -eq 5 ]; then
    echo "   🎉 5ペインの作成に成功しました！"
elif [ "$FINAL_PANES" -eq 4 ]; then
    echo "   ⚠️ 4ペインが作成されました（5番目の作成に失敗）"
    echo "   💡 手動で追加分割してください: Ctrl+b + | または Ctrl+b + -"
else
    echo "   ⚠️ ${FINAL_PANES}ペインが作成されました"
fi

echo ""
echo "📋 最終ペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: #{pane_width}x#{pane_height} #{?pane_active,(active),}"

# 各ペインに番号表示
for i in $(seq 0 $((FINAL_PANES-1))); do
    tmux send-keys -t "$SESSION_NAME.$i" "clear" C-m
    tmux send-keys -t "$SESSION_NAME.$i" "echo 'ペイン $i'" C-m
    tmux send-keys -t "$SESSION_NAME.$i" "echo '$(date +%H:%M:%S)'" C-m
done

echo ""
echo "🔧 手動分割方法（必要な場合）:"
echo "   Ctrl+b + |  : 水平分割"
echo "   Ctrl+b + -  : 垂直分割"
echo "   Ctrl+b + x  : ペイン削除"
echo ""
echo "🔌 セッションに接続します..."

tmux attach-session -t "$SESSION_NAME"