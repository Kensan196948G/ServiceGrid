#!/bin/bash

# 最終的に正確な3段構成を実装

SESSION_NAME="itsm-final-correct"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🎯 最終的に正確な3段構成を実装中..."

# 完全リセット
tmux kill-server 2>/dev/null || true
sleep 1

# 新セッション作成
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

echo "Step 1: 上下分割（上70% 下30%）"
tmux split-window -v -p 30 -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"

echo "Step 2: 上部をさらに上下分割（50%ずつ）"
tmux split-window -v -p 50 -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"

echo "Step 3: 一番上を左右分割（50%ずつ）- 1段目"
tmux split-window -h -p 50 -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"

echo "Step 4: 真ん中を左右分割（50%ずつ）- 2段目"
tmux split-window -h -p 50 -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"

echo "Step 5: 各ペインを確認"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: (#{pane_left},#{pane_top}) #{pane_width}x#{pane_height}"

echo "Step 6: 各ペインにFeature設定"
tmux send-keys -t "$SESSION_NAME:0.0" "echo '=== ペイン0: Feature-B (UI/テスト) - 1段目左 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo '=== ペイン1: Feature-C (API開発) - 1段目右 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.2" "echo '=== ペイン2: Feature-D (PowerShell) - 2段目左 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.3" "echo '=== ペイン3: Feature-E (非機能要件) - 2段目右 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.4" "echo '=== ペイン4: Feature-A (統合リーダー) - 3段目フル幅 ==='" C-m

echo ""
echo "✅ 最終的に正確な3段構成が完成！"
echo "🔗 接続: tmux attach-session -t $SESSION_NAME"
echo ""
echo "📋 最終確認:"
echo "  1段目: ペイン0(左) Feature-B UI/テスト | ペイン1(右) Feature-C API開発"
echo "  2段目: ペイン2(左) Feature-D PowerShell | ペイン3(右) Feature-E 非機能要件"
echo "  3段目: ペイン4(フル幅) Feature-A 統合リーダー"
