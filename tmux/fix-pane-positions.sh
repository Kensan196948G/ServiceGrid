#!/bin/bash

# ペイン位置修正スクリプト

SESSION_NAME="itsm-final"

echo "🔧 ペイン位置を修正中..."

if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

echo "現在の配置:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: 位置(#{pane_left},#{pane_top})"

echo ""
echo "ペイン2と3を正しい位置に調整中..."

# ペイン2と3をスワップして正しい位置に
tmux swap-pane -s "$SESSION_NAME:0.2" -t "$SESSION_NAME:0.3"

echo ""
echo "修正後の配置:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: 位置(#{pane_left},#{pane_top})"

echo ""
echo "✅ ペイン位置修正完了!"
echo "  1段目: 0(左上) | 1(右上)"
echo "  2段目: 2(左中) | 3(右中)"  
echo "  3段目: 4(下部フル幅)"