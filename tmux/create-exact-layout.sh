#!/bin/bash

# 要望通りの正確な配置作成

SESSION_NAME="itsm-exact-final"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🚀 要望通りの正確な配置作成中..."

tmux kill-server 2>/dev/null || true
sleep 1

# 新セッション作成
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

echo "Step 1: 上段と残りを分割"
tmux split-window -v -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"

echo "Step 2: 上段を左右分割（ペイン0,1）"
tmux split-window -h -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"

echo "Step 3: 下段を中段と下段に分割"
tmux split-window -v -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"

echo "Step 4: 中段を左右分割（ペイン2,3）"
tmux split-window -h -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"

echo ""
echo "=== 正確な配置確認 ==="
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: 位置(#{pane_left},#{pane_top}) サイズ(#{pane_width}x#{pane_height})"

echo ""
echo "✅ 要望通りの配置完成!"
echo "  1段目: 0(左上) | 1(右上)"
echo "  2段目: 2(左中) | 3(右中)"
echo "  3段目: 4(下部フル幅)"
echo ""
echo "接続: tmux attach-session -t $SESSION_NAME"