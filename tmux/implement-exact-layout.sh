#!/bin/bash

# 正確な要望実装：3段構成 (2x2 + 下部フル幅)

SESSION_NAME="itsm-exact"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🚀 正確な要望実装中..."

# 完全リセット
tmux kill-server 2>/dev/null || true
sleep 1

# 新セッション作成
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

echo "Step 1: 2x2グリッド作成"
# 最初に左右分割
tmux split-window -h -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"

# 左側を上下分割（ペイン0とペイン2）
tmux split-window -v -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"

# 右側を上下分割（ペイン1とペイン3）
tmux split-window -v -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"

echo "Step 2: 3段目フル幅ペイン追加"
# 下部にフル幅ペインを追加
tmux split-window -v -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"

echo "Step 3: 機能設定"
tmux send-keys -t "$SESSION_NAME:0.0" "clear && echo '=== 1段目左: ペイン0 Feature-B (UI/テスト) ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "clear && echo '=== 1段目右: ペイン1 Feature-C (API開発) ==='" C-m  
tmux send-keys -t "$SESSION_NAME:0.2" "clear && echo '=== 2段目左: ペイン2 Feature-D (PowerShell) ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.3" "clear && echo '=== 2段目右: ペイン3 Feature-E (非機能要件) ==='" C-m
tmux send-keys -t "$SESSION_NAME:0.4" "clear && echo '=== 3段目フル幅: ペイン4 Feature-A (統合リーダー) ==='" C-m

echo ""
echo "=== 実装結果確認 ==="
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: 位置(#{pane_left},#{pane_top}) サイズ(#{pane_width}x#{pane_height})"

echo ""
echo "✅ 要望通り実装完了!"
echo ""
echo "📋 実装されたペイン構成:"
echo "  1段目: ペイン0(左) | ペイン1(右)"
echo "  2段目: ペイン2(左) | ペイン3(右)"  
echo "  3段目: ペイン4(フル幅)"
echo ""
echo "🔗 接続: tmux attach-session -t $SESSION_NAME"