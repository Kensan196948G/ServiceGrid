#!/bin/bash

# 正確な2×2グリッド配置強制作成

SESSION_NAME="itsm-dev"

echo "🎯 正確な2×2グリッド配置を強制作成中..."

# 完全にクリーンな状態から開始
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
sleep 2

# 新しいセッション作成
echo "📋 新しいセッション作成..."
tmux new-session -d -s "$SESSION_NAME" -c "/mnt/e/ServiceGrid"

# Step 1: 最初に水平分割（上段を左右に分割）
echo "📋 Step 1: 水平分割で1段目作成..."
tmux split-window -h -t "$SESSION_NAME:0" -c "/mnt/e/ServiceGrid"

# Step 2: 左側を垂直分割（2段目左作成）
echo "📋 Step 2: 左側を垂直分割..."
tmux split-window -v -t "$SESSION_NAME:0.0" -c "/mnt/e/ServiceGrid"

# Step 3: 右側を垂直分割（2段目右作成）
echo "📋 Step 3: 右側を垂直分割..."
tmux split-window -v -t "$SESSION_NAME:0.1" -c "/mnt/e/ServiceGrid"

# レイアウト調整
echo "📋 レイアウト調整中..."
tmux select-layout -t "$SESSION_NAME:0" tiled

# ペイン確認
pane_count=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
echo "📋 作成されたペイン数: $pane_count"

if [ "$pane_count" -eq 4 ]; then
    echo "✅ 2×2グリッド作成成功！"
else
    echo "❌ エラー: ${pane_count}ペインのみ作成"
    exit 1
fi

echo ""
echo "📋 実際のペイン配置:"
tmux list-panes -t "$SESSION_NAME" -F '  Pane #P: #{pane_width}x#{pane_height} at (#{pane_left},#{pane_top})'

echo ""
echo "🎯 2×2グリッド作成完了！"
echo "   tmux attach-session -t $SESSION_NAME でCLI表示可能"
echo ""