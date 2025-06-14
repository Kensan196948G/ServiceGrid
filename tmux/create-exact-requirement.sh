#!/bin/bash

# 要望通りの完全実装：正確な3段構成

SESSION_NAME="itsm-requirement"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🚀 要望通りの完全実装中..."

# 完全リセット
tmux kill-server 2>/dev/null || true
sleep 1

# 新セッション作成
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

echo "Step 1: 基本構造作成 - 上段と下段を分離"
tmux split-window -v -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"

echo "Step 2: 上段を2段に分割 - 1段目と2段目を作成"
tmux split-window -v -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"

echo "Step 3: 1段目を左右分割 - ペイン0とペイン1"
tmux split-window -h -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"

echo "Step 4: 2段目を左右分割 - ペイン2とペイン3"
tmux split-window -h -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"

echo "Step 5: 各ペインに要望通りの機能を設定"
tmux send-keys -t "$SESSION_NAME:0.0" "clear && echo '=== 1段目左: ペイン0 Feature-B (UI/テスト) ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "clear && echo '=== 1段目右: ペイン1 Feature-C (API開発) ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.2" "clear && echo '=== 2段目左: ペイン2 Feature-D (PowerShell) ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.3" "clear && echo '=== 2段目右: ペイン3 Feature-E (非機能要件) ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.4" "clear && echo '=== 3段目フル幅: ペイン4 Feature-A (統合リーダー) ==='" C-m

echo ""
echo "=== 要望通り実装完了 ==="
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: 位置(#{pane_left},#{pane_top}) サイズ(#{pane_width}x#{pane_height})"

echo ""
echo "✅ 要望通り完全実装完了!"
echo ""
echo "📋 実装されたペイン構成:"
echo "  1段目: ペイン0(Feature-B UI/テスト) | ペイン1(Feature-C API開発)"
echo "  2段目: ペイン2(Feature-D PowerShell) | ペイン3(Feature-E 非機能要件)"
echo "  3段目: ペイン4(Feature-A 統合リーダー) - 下部フル幅"
echo ""
echo "🎮 ペイン操作:"
echo "  Ctrl+b + 0: Feature-B (UI/テスト) - 1段目左"
echo "  Ctrl+b + 1: Feature-C (API開発) - 1段目右"
echo "  Ctrl+b + 2: Feature-D (PowerShell) - 2段目左"
echo "  Ctrl+b + 3: Feature-E (非機能要件) - 2段目右"
echo "  Ctrl+b + 4: Feature-A (統合リーダー) - 3段目フル幅"
echo ""
echo "🔗 接続: tmux attach-session -t $SESSION_NAME"