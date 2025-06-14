#!/bin/bash

# シンプルな2x2グリッド + VSCodeペイン作成スクリプト

SESSION_NAME="itsm-simple"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🚀 シンプル2x2グリッド作成中..."

# 既存セッション削除
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# 新しいセッション作成
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

# 正確な2x2グリッド作成
echo "Step 1: 4ペイン作成（2x2グリッド）"
tmux split-window -h -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"     # ペイン0とペイン1（左右）
tmux split-window -v -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"   # ペイン0を上下分割→ペイン2
tmux split-window -v -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"   # ペイン1を上下分割→ペイン3

echo "Step 2: ペイン番号を正しく調整"
# 現在: 0(左上), 2(左下), 1(右上), 3(右下)
# 目標: 0(左上), 1(右上), 2(左下), 3(右下)
tmux swap-pane -s "$SESSION_NAME:0.1" -t "$SESSION_NAME:0.2"   # 1↔2で順序修正

echo "Step 3: VSCode用フル幅ペイン追加"
tmux split-window -v -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"   # ペイン4（下部フル幅）

echo ""
echo "=== 作成されたペイン配置 ==="
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: 位置(#{pane_left},#{pane_top}) サイズ(#{pane_width}x#{pane_height})"

echo ""
echo "✅ セッション作成完了: $SESSION_NAME"
echo "接続: tmux attach-session -t $SESSION_NAME"