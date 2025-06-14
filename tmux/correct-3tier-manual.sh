#!/bin/bash

# 手動で正確な3段構成を作成

SESSION_NAME="itsm-manual-3tier"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🎯 手動で正確な3段構成を作成中..."

# 完全リセット
tmux kill-server 2>/dev/null || true
sleep 2

# 新セッション作成
echo "Step 1: 新セッション作成"
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

# 各ステップで状態確認
echo "Step 2: 最初の上下分割"
tmux split-window -v -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"
tmux list-panes -t "$SESSION_NAME" -F "After step 2: ペイン#{pane_index} (#{pane_width}x#{pane_height})"

echo "Step 3: 上部を2段に分割"
tmux split-window -v -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT" 
echo "Checking panes after step 3:"
tmux list-panes -t "$SESSION_NAME" -F "Pane #{pane_index}: #{pane_width}x#{pane_height}"

echo "Step 4: 1段目を左右分割"
if tmux list-panes -t "$SESSION_NAME" | grep -q "^0:"; then
    tmux split-window -h -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"
    echo "1段目分割完了"
else
    echo "Error: ペイン0が存在しません"
fi

echo "Step 5: 2段目を左右分割"
if tmux list-panes -t "$SESSION_NAME" | grep -q "^1:"; then
    tmux split-window -h -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"
    echo "2段目分割完了"
else
    echo "Error: ペイン1が存在しません"
fi

echo ""
echo "=== 最終ペイン構成確認 ==="
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: 位置(#{pane_left},#{pane_top}) サイズ#{pane_width}x#{pane_height}"

echo ""
echo "Step 6: 各ペインにFeature設定"
for i in 0 1 2 3 4; do
    if tmux list-panes -t "$SESSION_NAME" | grep -q "^$i:"; then
        case $i in
            0) tmux send-keys -t "$SESSION_NAME:0.$i" "echo '=== ペイン0: Feature-B (UI/テスト) - 1段目左 ==='" C-m ;;
            1) tmux send-keys -t "$SESSION_NAME:0.$i" "echo '=== ペイン1: Feature-C (API開発) - 1段目右 ==='" C-m ;;
            2) tmux send-keys -t "$SESSION_NAME:0.$i" "echo '=== ペイン2: Feature-D (PowerShell) - 2段目左 ==='" C-m ;;
            3) tmux send-keys -t "$SESSION_NAME:0.$i" "echo '=== ペイン3: Feature-E (非機能要件) - 2段目右 ==='" C-m ;;
            4) tmux send-keys -t "$SESSION_NAME:0.$i" "echo '=== ペイン4: Feature-A (統合リーダー) - 3段目フル幅 ==='" C-m ;;
        esac
        echo "ペイン$i設定完了"
    else
        echo "ペイン$iが存在しません"
    fi
done

echo ""
echo "✅ 手動で正確な3段構成が完成！"
echo "🔗 接続: tmux attach-session -t $SESSION_NAME"
