#!/bin/bash

# 正確な要望実装：2x2+下部の3段構成

SESSION_NAME="itsm-correct-final"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🚀 正確な要望実装中..."

# 完全リセット
tmux kill-server 2>/dev/null || true
sleep 1

# 新セッション作成
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

echo "Step 1: 上部2x2グリッドと下部を分離"
tmux split-window -v -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"

echo "Step 2: 上部を左右分割（1段目作成）"
tmux split-window -h -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"

echo "Step 3: 左側を上下分割（1段目左と2段目左）"
tmux split-window -v -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"

echo "Step 4: 右側を上下分割（1段目右と2段目右）"
tmux split-window -v -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"

echo "Step 5: 各ペインに正確な機能を設定"
tmux send-keys -t "$SESSION_NAME:0.0" "clear && echo '=== ペイン0: Feature-B (UI/テスト) - 1段目左 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "clear && echo '=== ペイン1: Feature-C (API開発) - 1段目右 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.2" "clear && echo '=== ペイン2: Feature-D (PowerShell) - 2段目左 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.3" "clear && echo '=== ペイン3: Feature-E (非機能要件) - 2段目右 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.4" "clear && echo '=== ペイン4: Feature-A (統合リーダー) - 3段目フル幅 ==='" C-m

echo ""
echo "=== 正確な実装完了確認 ==="
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: 位置(#{pane_left},#{pane_top}) サイズ(#{pane_width}x#{pane_height})"

echo ""
echo "✅ 正確な要望実装完了!"
echo ""
echo "📋 正確なペイン構成:"
echo "  1段目: ペイン0(左) Feature-B UI/テスト | ペイン1(右) Feature-C API開発"
echo "  2段目: ペイン2(左) Feature-D PowerShell | ペイン3(右) Feature-E 非機能要件"
echo "  3段目: ペイン4(フル幅) Feature-A 統合リーダー"
echo ""
echo "🔗 接続: tmux attach-session -t $SESSION_NAME"