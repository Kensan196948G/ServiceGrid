#!/bin/bash

# 正確な3段構成作成スクリプト

SESSION_NAME="itsm-correct"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🚀 正確な3段構成作成中..."

# 完全リセット
tmux kill-server 2>/dev/null || true
sleep 1

# 新セッション作成
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

echo "Step 1: 全体を上下に3分割"
# 全体を縦に3つに分割（上段・中段・下段）
tmux split-window -v -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"
tmux split-window -v -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"

echo "Step 2: 上段（1段目）を左右分割"
tmux split-window -h -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"

echo "Step 3: 中段（2段目）を左右分割"
tmux split-window -h -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"

echo "Step 4: 各ペインに識別情報設定"
tmux send-keys -t "$SESSION_NAME:0.0" "echo '=== ペイン0: Feature-B (UI/テスト) - 1段目左 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo '=== ペイン1: Feature-C (API開発) - 1段目右 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.2" "echo '=== ペイン2: Feature-D (PowerShell) - 2段目左 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.3" "echo '=== ペイン3: Feature-E (非機能要件) - 2段目右 ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.4" "echo '=== ペイン4: Feature-A (統合リーダー) - 3段目フル幅 ==='" C-m

echo ""
echo "=== 正確な3段構成確認 ==="
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: 位置(#{pane_left},#{pane_top}) サイズ(#{pane_width}x#{pane_height})"

echo ""
echo "✅ 正確な3段構成完成!"
echo "  1段目: 0(左) | 1(右)"
echo "  2段目: 2(左) | 3(右)"
echo "  3段目: 4(フル幅)"
echo ""
echo "接続: tmux attach-session -t $SESSION_NAME"