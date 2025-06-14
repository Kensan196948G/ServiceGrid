#!/bin/bash

# 最終的な正確な3段構成作成

SESSION_NAME="itsm-final"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🚀 最終3段構成作成中..."

# 完全リセット
tmux kill-server 2>/dev/null || true
sleep 1

# 新セッション作成
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

echo "Step 1: 3段構成作成"
# 全体を3段に分割
tmux split-window -v -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"
tmux split-window -v -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"

# 1段目を左右分割
tmux split-window -h -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"

# 2段目を左右分割  
tmux split-window -h -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"

echo "Step 2: 各ペインに識別情報設定"
tmux send-keys -t "$SESSION_NAME:0.0" "echo '=== ペイン0: Feature-B (UI/テスト) ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo '=== ペイン1: Feature-C (API開発) ==='" C-m  
tmux send-keys -t "$SESSION_NAME:0.2" "echo '=== ペイン2: Feature-D (PowerShell) ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.3" "echo '=== ペイン3: Feature-E (非機能要件) ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.4" "echo '=== ペイン4: Feature-A (統合リーダー/VSCode) ==='" C-m

echo ""
echo "=== 最終3段構成確認 ==="
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: 位置(#{pane_left},#{pane_top}) サイズ(#{pane_width}x#{pane_height})"

echo ""
echo "✅ 最終3段構成完成!"
echo "  1段目: 0(左上) | 1(右上)"
echo "  2段目: 2(左中) | 3(右中)"
echo "  3段目: 4(下部フル幅)"
echo ""
echo "接続: tmux attach-session -t $SESSION_NAME"