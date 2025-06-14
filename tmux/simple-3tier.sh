#!/bin/bash

# シンプルで確実な3段レイアウト作成スクリプト

SESSION_NAME="itsm-dev"

echo "🔧 シンプルな3段レイアウトを作成..."

# 既存セッションを終了
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "🗑️ 既存セッション終了..."
    tmux kill-session -t "$SESSION_NAME"
fi

# 新セッション作成
echo "🆕 新セッション作成..."
tmux new-session -d -s "$SESSION_NAME" -c "/mnt/e/ServiceGrid"

echo "📐 段階的にペインを分割..."

# Step 1: 縦に3分割 (3段作成)
echo "  Step 1: 縦3分割..."
tmux split-window -t "$SESSION_NAME.1" -v -c "/mnt/e/ServiceGrid"  # ペイン2作成
tmux split-window -t "$SESSION_NAME.2" -v -c "/mnt/e/ServiceGrid"  # ペイン3作成

# Step 2: 1段目（ペイン1）を横分割
echo "  Step 2: 1段目を横分割..."
tmux split-window -t "$SESSION_NAME.1" -h -c "/mnt/e/ServiceGrid/backend"  # ペイン4作成

# Step 3: 2段目（ペイン2）を横分割  
echo "  Step 3: 2段目を横分割..."
tmux split-window -t "$SESSION_NAME.2" -h -c "/mnt/e/ServiceGrid/backend"  # ペイン5作成

echo ""
echo "📋 分割直後のペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: Y#{pane_top} #{pane_width}x#{pane_height}"

echo ""
echo "🏷️ 各ペインに役割を設定..."

# ペイン1: Feature-B (UI/テスト) - 1段目左
tmux send-keys -t "$SESSION_NAME.1" "clear" C-m
tmux send-keys -t "$SESSION_NAME.1" "printf '\\033]2;🎨 Feature-B: UI/テスト\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.1" "export PS1='[🎨 Feature-B]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo '🎨 Feature-B: UI/テスト (1段目左)'" C-m

# ペイン4: Feature-C (API開発) - 1段目右
tmux send-keys -t "$SESSION_NAME.4" "clear" C-m
tmux send-keys -t "$SESSION_NAME.4" "printf '\\033]2;🔧 Feature-C: API開発\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.4" "export PS1='[🔧 Feature-C]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.4" "echo '🔧 Feature-C: API開発 (1段目右)'" C-m

# ペイン2: Feature-D (PowerShell) - 2段目左
tmux send-keys -t "$SESSION_NAME.2" "clear" C-m
tmux send-keys -t "$SESSION_NAME.2" "printf '\\033]2;💻 Feature-D: PowerShell\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.2" "export PS1='[💻 Feature-D]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo '💻 Feature-D: PowerShell (2段目左)'" C-m

# ペイン5: Feature-E (非機能要件) - 2段目右
tmux send-keys -t "$SESSION_NAME.5" "clear" C-m
tmux send-keys -t "$SESSION_NAME.5" "printf '\\033]2;🔒 Feature-E: 非機能要件\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.5" "export PS1='[🔒 Feature-E]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '🔒 Feature-E: 非機能要件 (2段目右)'" C-m

# ペイン3: Feature-A (統合リーダー) - 3段目全幅
tmux send-keys -t "$SESSION_NAME.3" "clear" C-m
tmux send-keys -t "$SESSION_NAME.3" "printf '\\033]2;🎯 Feature-A: 統合リーダー\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.3" "export PS1='[🎯 Feature-A]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo '🎯 Feature-A: 統合リーダー (3段目全幅)'" C-m

echo ""
echo "📋 最終ペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: Y#{pane_top} #{pane_width}x#{pane_height} - #{pane_title}"

echo ""
echo "✅ 3段レイアウト完成！"
echo ""
echo "🎯 実際のペイン配置:"
echo "  ┌─────────────────────────────────────┐"
echo "  │ 1段目: ペイン1     │ ペイン4        │"
echo "  │    Feature-B       │   Feature-C    │"
echo "  │   (UI/テスト)      │   (API開発)    │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 2段目: ペイン2     │ ペイン5        │"
echo "  │   Feature-D        │   Feature-E    │"
echo "  │  (PowerShell)      │  (非機能要件)  │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 3段目: ペイン3 Feature-A            │"
echo "  │       (統合リーダー) - 全幅         │"
echo "  └─────────────────────────────────────┘"
echo ""
echo "⌨️ ペイン切り替え:"
echo "  1段目: Ctrl+b + 1 (🎨 Feature-B) | Ctrl+b + 4 (🔧 Feature-C)"
echo "  2段目: Ctrl+b + 2 (💻 Feature-D) | Ctrl+b + 5 (🔒 Feature-E)"
echo "  3段目: Ctrl+b + 3 (🎯 Feature-A)"
echo ""
echo "🚀 接続コマンド:"
echo "  tmux attach-session -t $SESSION_NAME"

echo ""
echo "🔧 レイアウト調整コマンド（必要に応じて）:"
echo "  tmux select-layout -t $SESSION_NAME tiled"
echo "  tmux select-layout -t $SESSION_NAME even-horizontal"
echo "  tmux select-layout -t $SESSION_NAME even-vertical"