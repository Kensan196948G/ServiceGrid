#!/bin/bash

# 完璧な2x2グリッド作成スクリプト

SESSION_NAME="itsm-perfect"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🚀 完璧な2x2グリッド作成中..."

# tmuxサーバー完全リセット
tmux kill-server 2>/dev/null || true
sleep 1

# 新しいセッション作成
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

echo "Step 1: 全体を上下に分割"
tmux split-window -v -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"

echo "Step 2: 上段を左右に分割（ペイン0とペイン1）"
tmux split-window -h -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"

echo "Step 3: 下段を左右に分割（ペイン2とペイン3）"
tmux split-window -h -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"

echo "Step 4: ペイン位置を正しく調整"
# 現在の状態を確認してスワップで修正
tmux swap-pane -s "$SESSION_NAME:0.2" -t "$SESSION_NAME:0.3"  # 2↔3

echo ""
echo "=== 2x2グリッド完成 ==="
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: 位置(#{pane_left},#{pane_top}) サイズ(#{pane_width}x#{pane_height})"

echo ""
echo "✅ 2x2グリッド完成!"
echo "  0(左上) | 1(右上)"
echo "  --------|--------"
echo "  2(左下) | 3(右下)"
echo ""
echo "接続: tmux attach-session -t $SESSION_NAME"