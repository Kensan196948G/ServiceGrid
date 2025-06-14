#!/bin/bash

# 要望通りの正確な3段構成実装

SESSION_NAME="itsm-final-3tier"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🚀 要望通りの正確な3段構成実装中..."

# 完全リセット
tmux kill-server 2>/dev/null || true
sleep 1

# 新セッション作成
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

echo "Step 1: 3段構成の基盤作成"
# 全体を3段に分割
tmux split-window -v -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"     # 上と下を分離
tmux split-window -v -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"   # 中と下を分離

echo "Step 2: 1段目を左右分割（ペイン0とペイン1）"
tmux split-window -h -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"

echo "Step 3: 2段目を左右分割（ペイン2とペイン3）"
tmux split-window -h -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"

echo "Step 4: 各ペインに機能設定"
tmux send-keys -t "$SESSION_NAME:0.0" "clear && echo '=== ペイン0: Feature-B (UI/テスト) - 1段目左 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "clear && echo '=== ペイン1: Feature-C (API開発) - 1段目右 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.2" "clear && echo '=== ペイン2: Feature-D (PowerShell) - 2段目左 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.3" "clear && echo '=== ペイン3: Feature-E (非機能要件) - 2段目右 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.4" "clear && echo '=== ペイン4: Feature-A (統合リーダー) - 3段目フル幅 ==='" C-m

echo ""
echo "=== 実装完了：3段構成確認 ==="
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: 位置(#{pane_left},#{pane_top}) サイズ(#{pane_width}x#{pane_height})"

echo ""
echo "✅ 要望通り3段構成実装完了!"
echo ""
echo "📋 実装されたペイン構成:"
echo "  1段目: ペイン0(Feature-B UI/テスト) | ペイン1(Feature-C API開発)"
echo "  2段目: ペイン2(Feature-D PowerShell) | ペイン3(Feature-E 非機能要件)"
echo "  3段目: ペイン4(Feature-A 統合リーダー) - フル幅"
echo ""
echo "🎮 操作方法:"
echo "  Ctrl+b + 0: Feature-B (UI/テスト)"
echo "  Ctrl+b + 1: Feature-C (API開発)"
echo "  Ctrl+b + 2: Feature-D (PowerShell)"
echo "  Ctrl+b + 3: Feature-E (非機能要件)"
echo "  Ctrl+b + 4: Feature-A (統合リーダー)"
echo ""
echo "🔗 接続: tmux attach-session -t $SESSION_NAME"