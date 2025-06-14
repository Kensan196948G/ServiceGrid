#!/bin/bash

# 代替方法：確実に5ペインを作成するスクリプト
# 異なる分割パターンを使用

SESSION_NAME="itsm-dev"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🔧 代替方法で5ペイン作成中..."

# 既存セッション削除
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# 新しいセッション作成
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

echo "📐 代替ペイン分割パターン実行中..."

# 方法2: 異なる分割順序
# Step 1: 垂直分割（上下2つ）
tmux split-window -v -t "$SESSION_NAME"

# Step 2: 上部を水平分割（3つ）
tmux split-window -h -t "$SESSION_NAME.0"

# Step 3: 下部を水平分割（4つ）
tmux split-window -h -t "$SESSION_NAME.2"

# Step 4: 右上をさらに垂直分割（5つ）
tmux split-window -v -t "$SESSION_NAME.1"

# レイアウト調整
tmux select-layout -t "$SESSION_NAME" tiled

# ペイン数確認
PANE_COUNT=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
echo "✅ 代替方法でのペイン数: $PANE_COUNT"

# 各ペインに番号表示（確認用）
for i in $(seq 0 $((PANE_COUNT-1))); do
    tmux send-keys -t "$SESSION_NAME.$i" "clear" C-m
    tmux send-keys -t "$SESSION_NAME.$i" "echo 'ペイン $i ($PANE_COUNT ペイン中)'" C-m
    tmux send-keys -t "$SESSION_NAME.$i" "echo '$(date)'" C-m
done

echo ""
echo "🎯 代替方法結果:"
echo "  作成ペイン数: $PANE_COUNT"
echo "  目標: 5ペイン"

if [ "$PANE_COUNT" -eq 5 ]; then
    echo "✅ 成功！"
else
    echo "⚠️ ${PANE_COUNT}ペインが作成されました"
fi

echo ""
echo "📋 現在のペイン一覧:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: #{pane_width}x#{pane_height}"

echo ""
echo "🔌 セッションに接続します..."
tmux attach-session -t "$SESSION_NAME"