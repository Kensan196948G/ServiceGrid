#!/bin/bash

# tmuxセッションを完全に再構築して正確な3段レイアウトを作成

SESSION_NAME="itsm-dev"

echo "🔧 tmuxセッションを完全再構築して正確な3段レイアウトを作成..."

# 既存セッションを終了
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "🗑️ 既存セッション '$SESSION_NAME' を終了..."
    tmux kill-session -t "$SESSION_NAME"
fi

echo "🆕 新しいセッション '$SESSION_NAME' を作成..."
tmux new-session -d -s "$SESSION_NAME" -c "/mnt/e/ServiceGrid"

# 最初のペインはFeature-B (UI/テスト) として使用
echo "🎨 ペイン1: Feature-B (UI/テスト) - 1段目左を設定..."
tmux send-keys -t "$SESSION_NAME.1" "clear" C-m
tmux send-keys -t "$SESSION_NAME.1" "printf '\\033]2;🎨 Feature-B: UI/テスト\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.1" "export PS1='[🎨 Feature-B]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo '🎨 Feature-B: UI/テスト (1段目左) - Ctrl+b+1'" C-m

# 1段目右: Feature-C (API開発)
echo "🔧 ペイン2: Feature-C (API開発) - 1段目右を作成..."
tmux split-window -t "$SESSION_NAME.1" -h -c "/mnt/e/ServiceGrid/backend"
tmux send-keys -t "$SESSION_NAME.2" "clear" C-m
tmux send-keys -t "$SESSION_NAME.2" "printf '\\033]2;🔧 Feature-C: API開発\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.2" "export PS1='[🔧 Feature-C]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo '🔧 Feature-C: API開発 (1段目右) - Ctrl+b+2'" C-m

# 2段目左: Feature-D (PowerShell)
echo "💻 ペイン3: Feature-D (PowerShell) - 2段目左を作成..."
tmux split-window -t "$SESSION_NAME.1" -v -c "/mnt/e/ServiceGrid/backend"
tmux send-keys -t "$SESSION_NAME.3" "clear" C-m
tmux send-keys -t "$SESSION_NAME.3" "printf '\\033]2;💻 Feature-D: PowerShell\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.3" "export PS1='[💻 Feature-D]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo '💻 Feature-D: PowerShell (2段目左) - Ctrl+b+3'" C-m

# 2段目右: Feature-E (非機能要件)
echo "🔒 ペイン4: Feature-E (非機能要件) - 2段目右を作成..."
tmux split-window -t "$SESSION_NAME.2" -v -c "/mnt/e/ServiceGrid"
tmux send-keys -t "$SESSION_NAME.4" "clear" C-m
tmux send-keys -t "$SESSION_NAME.4" "printf '\\033]2;🔒 Feature-E: 非機能要件\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.4" "export PS1='[🔒 Feature-E]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.4" "echo '🔒 Feature-E: 非機能要件 (2段目右) - Ctrl+b+4'" C-m

# 3段目全幅: Feature-A (統合リーダー)
echo "🎯 ペイン5: Feature-A (統合リーダー) - 3段目全幅を作成..."
tmux split-window -t "$SESSION_NAME.1" -v -c "/mnt/e/ServiceGrid"
tmux send-keys -t "$SESSION_NAME.5" "clear" C-m
tmux send-keys -t "$SESSION_NAME.5" "printf '\\033]2;🎯 Feature-A: 統合リーダー\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.5" "export PS1='[🎯 Feature-A]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '🎯 Feature-A: 統合リーダー (3段目全幅) - Ctrl+b+5'" C-m

echo ""
echo "📋 作成直後のペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: Y#{pane_top} #{pane_width}x#{pane_height}"

echo ""
echo "🔧 レイアウトを調整中..."

# レイアウトを調整
tmux select-layout -t "$SESSION_NAME" tiled
sleep 1

# カスタムレイアウトでペインサイズを調整
echo "📐 ペインサイズを均等に調整..."

# 1段目の高さを調整
tmux select-pane -t "$SESSION_NAME.1"
tmux resize-pane -t "$SESSION_NAME.1" -U 5

tmux select-pane -t "$SESSION_NAME.2" 
tmux resize-pane -t "$SESSION_NAME.2" -U 5

# 2段目の高さを調整
tmux select-pane -t "$SESSION_NAME.3"
tmux resize-pane -t "$SESSION_NAME.3" -U 2

tmux select-pane -t "$SESSION_NAME.4"
tmux resize-pane -t "$SESSION_NAME.4" -U 2

# 3段目（Feature-A）を下に拡張
tmux select-pane -t "$SESSION_NAME.5"
tmux resize-pane -t "$SESSION_NAME.5" -D 3

echo ""
echo "📋 調整後のペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: Y#{pane_top} #{pane_width}x#{pane_height} - #{pane_title}"

echo ""
echo "✅ 正確な3段レイアウト完成！"
echo ""
echo "🎯 実際のペイン配置:"
echo "  ┌─────────────────────────────────────┐"
echo "  │ 1段目: ペイン1     │ ペイン2        │"
echo "  │    Feature-B       │   Feature-C    │"
echo "  │   (UI/テスト)      │   (API開発)    │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 2段目: ペイン3     │ ペイン4        │"
echo "  │   Feature-D        │   Feature-E    │"
echo "  │  (PowerShell)      │  (非機能要件)  │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 3段目: ペイン5 Feature-A            │"
echo "  │       (統合リーダー) - 全幅         │"
echo "  └─────────────────────────────────────┘"
echo ""
echo "⌨️ ペイン切り替え:"
echo "  1段目: Ctrl+b + 1 (🎨 Feature-B) | Ctrl+b + 2 (🔧 Feature-C)"
echo "  2段目: Ctrl+b + 3 (💻 Feature-D) | Ctrl+b + 4 (🔒 Feature-E)"
echo "  3段目: Ctrl+b + 5 (🎯 Feature-A)"
echo ""
echo "🚀 接続コマンド:"
echo "  tmux attach-session -t $SESSION_NAME"