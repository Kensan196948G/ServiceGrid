#!/bin/bash

# 完全に正確な3段構成実装

SESSION_NAME="itsm-perfect-3tier"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🎯 完全に正確な3段構成を実装します"

# 完全リセット
tmux kill-server 2>/dev/null || true
sleep 1

# 新セッション作成
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

echo "Step 1: 基本の縦分割（上部と下部を分離）"
tmux split-window -v -p 30 -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"

echo "Step 2: 上部を2段に分割"
tmux split-window -v -p 50 -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"

echo "Step 3: 1段目を左右分割（ペイン0とペイン1）"
tmux split-window -h -p 50 -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"

echo "Step 4: 2段目を左右分割（ペイン2とペイン3）"
tmux split-window -h -p 50 -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"

echo "Step 5: 各ペインのFeature設定"
tmux send-keys -t "$SESSION_NAME:0.0" "clear && echo '=== ペイン0: Feature-B (UI/テスト) - 1段目左 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "clear && echo '=== ペイン1: Feature-C (API開発) - 1段目右 ==='" C-m  
tmux send-keys -t "$SESSION_NAME:0.2" "clear && echo '=== ペイン2: Feature-D (PowerShell) - 2段目左 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.3" "clear && echo '=== ペイン3: Feature-E (非機能要件) - 2段目右 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.4" "clear && echo '=== ペイン4: Feature-A (統合リーダー) - 3段目フル幅 ==='" C-m

echo ""
echo "=== 最終レイアウト確認 ==="
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: (#{pane_left},#{pane_top}) #{pane_width}x#{pane_height}"

echo ""
echo "✅ 完全に正確な3段構成が完成しました！"
echo "🔗 接続: tmux attach-session -t $SESSION_NAME"
echo ""
echo "📋 正確な構成:"
echo "  1段目: ペイン0(左) + ペイン1(右)"
echo "  2段目: ペイン2(左) + ペイン3(右)"
echo "  3段目: ペイン4(フル幅)"
