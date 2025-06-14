#!/bin/bash

# 正確な3段構成作成スクリプト

SESSION_NAME="itsm-exact"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🚀 正確な3段構成作成中..."

# tmuxサーバー完全リセット
tmux kill-server 2>/dev/null || true
sleep 1

# 新しいセッション作成
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

echo "Step 1: 全体を3段に分割（上・中・下）"
tmux split-window -v -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"    # 1段目と2段目を分離
tmux split-window -v -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"  # 2段目と3段目を分離

echo "Step 2: 1段目を左右に分割（ペイン0とペイン1）"  
tmux split-window -h -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"

echo "Step 3: 2段目を左右に分割（ペイン2とペイン3）"
tmux split-window -h -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"

echo "Step 4: ペイン位置を正確に調整"
# 現在: 0(左上), 1(右上), 2(右中), 3(左中), 4(下部)
# 目標: 0(左上), 1(右上), 2(左中), 3(右中), 4(下部)
tmux swap-pane -s "$SESSION_NAME:0.2" -t "$SESSION_NAME:0.3"  # 2↔3で正しい位置に

echo ""
echo "=== 正確な3段構成完成 ==="
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: 位置(#{pane_left},#{pane_top}) サイズ(#{pane_width}x#{pane_height})"

echo ""
echo "✅ 正確な3段構成完成!"
echo "  1段目: 0(左上) | 1(右上)"
echo "  2段目: 2(左中) | 3(右中)" 
echo "  3段目: 4(下部フル幅)"
echo ""
echo "接続: tmux attach-session -t $SESSION_NAME"