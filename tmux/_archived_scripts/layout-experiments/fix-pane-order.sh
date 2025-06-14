#!/bin/bash

# ペイン番号を要望通りに修正するスクリプト
# 現状から要望への変更:
# - ペイン1 (Feature-A) を3段目へ移動
# - ペイン2 (Feature-B) を1段目左に保持
# - ペイン3 (Feature-C) を1段目右に移動  
# - ペイン4 (Feature-D) を2段目左に移動
# - ペイン5 (Feature-E) を2段目右に移動

SESSION_NAME="itsm-dev"

echo "🔧 ペイン配置を要望通りに修正中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

echo "📋 修正前のペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: Y#{pane_top} #{pane_width}x#{pane_height} - #{pane_title}"

echo ""
echo "🔄 ペインの位置を調整中..."

# 現在の配置:
# 1段目: ペイン1(Feature-B), ペイン4(Feature-D) 
# 2段目: ペイン2(Feature-A), ペイン3(Feature-C)
# 3段目: ペイン5(Feature-E)

# 目標配置:
# 1段目: ペイン2(Feature-B), ペイン3(Feature-C)
# 2段目: ペイン4(Feature-D), ペイン5(Feature-E)  
# 3段目: ペイン1(Feature-A)

echo "  Step 1: ペイン交換でレイアウト調整..."

# ペイン1とペイン2を交換（Feature-AとFeature-Bの位置交換）
tmux swap-pane -t "$SESSION_NAME.1" -s "$SESSION_NAME.2"

# ペイン3とペイン4を交換（Feature-CとFeature-Dの位置交換）  
tmux swap-pane -t "$SESSION_NAME.3" -s "$SESSION_NAME.4"

echo "  Step 2: 中間状態確認..."
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: Y#{pane_top} #{pane_width}x#{pane_height}"

# ペイン1（現在Feature-A）とペイン5（Feature-E）を交換
tmux swap-pane -t "$SESSION_NAME.1" -s "$SESSION_NAME.5"

echo ""
echo "📋 交換後のペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: Y#{pane_top} #{pane_width}x#{pane_height} - #{pane_title}"

echo ""
echo "🏷️ 各ペインのタイトルとプロンプトを再設定..."

# 各ペインに正しい役割を再設定
# ペイン1: 現在3段目にあるべき Feature-A
tmux send-keys -t "$SESSION_NAME.1" "clear" C-m
tmux send-keys -t "$SESSION_NAME.1" "printf '\\033]2;🎯 Feature-A: 統合リーダー\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.1" "export PS1='[🎯 Feature-A]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo '🎯 Feature-A: 統合リーダー (3段目全幅) - Ctrl+b+1'" C-m

# ペイン2: 1段目左 Feature-B
tmux send-keys -t "$SESSION_NAME.2" "clear" C-m
tmux send-keys -t "$SESSION_NAME.2" "printf '\\033]2;🎨 Feature-B: UI/テスト\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.2" "export PS1='[🎨 Feature-B]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo '🎨 Feature-B: UI/テスト (1段目左) - Ctrl+b+2'" C-m

# ペイン3: 1段目右 Feature-C
tmux send-keys -t "$SESSION_NAME.3" "clear" C-m
tmux send-keys -t "$SESSION_NAME.3" "printf '\\033]2;🔧 Feature-C: API開発\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.3" "export PS1='[🔧 Feature-C]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo '🔧 Feature-C: API開発 (1段目右) - Ctrl+b+3'" C-m

# ペイン4: 2段目左 Feature-D
tmux send-keys -t "$SESSION_NAME.4" "clear" C-m
tmux send-keys -t "$SESSION_NAME.4" "printf '\\033]2;💻 Feature-D: PowerShell\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.4" "export PS1='[💻 Feature-D]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.4" "echo '💻 Feature-D: PowerShell (2段目左) - Ctrl+b+4'" C-m

# ペイン5: 2段目右 Feature-E
tmux send-keys -t "$SESSION_NAME.5" "clear" C-m
tmux send-keys -t "$SESSION_NAME.5" "printf '\\033]2;🔒 Feature-E: 非機能要件\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.5" "export PS1='[🔒 Feature-E]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '🔒 Feature-E: 非機能要件 (2段目右) - Ctrl+b+5'" C-m

echo ""
echo "✅ ペイン配置修正完了！"
echo ""
echo "🎯 要望通りのペイン配置:"
echo "  ┌─────────────────────────────────────┐"
echo "  │ 1段目: ペイン2     │ ペイン3        │"
echo "  │    Feature-B       │   Feature-C    │"
echo "  │   (UI/テスト)      │   (API開発)    │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 2段目: ペイン4     │ ペイン5        │"
echo "  │   Feature-D        │   Feature-E    │"
echo "  │  (PowerShell)      │  (非機能要件)  │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 3段目: ペイン1 Feature-A            │"
echo "  │       (統合リーダー) - 全幅         │"
echo "  └─────────────────────────────────────┘"
echo ""
echo "⌨️ 要望通りのペイン切り替え:"
echo "  1段目: Ctrl+b + 2 (🎨 Feature-B) | Ctrl+b + 3 (🔧 Feature-C)"
echo "  2段目: Ctrl+b + 4 (💻 Feature-D) | Ctrl+b + 5 (🔒 Feature-E)"
echo "  3段目: Ctrl+b + 1 (🎯 Feature-A)"
echo ""
echo "📋 最終ペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: Y#{pane_top} #{pane_width}x#{pane_height} - #{pane_title}"