#!/bin/bash

# tmuxペインを正確なレイアウトに再配置するスクリプト
# 
# 目標レイアウト:
# 1段目: Feature-B (UI/テスト) | Feature-C (API開発)
# 2段目: Feature-D (PowerShell) | Feature-E (非機能要件)  
# 3段目: Feature-A (統合リーダー) - 全幅

SESSION_NAME="itsm-dev"

echo "🔧 正確なペインレイアウトに修正中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

echo "📋 現在のペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: #{pane_width}x#{pane_height}"

CURRENT_PANES=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}"))
PANE_COUNT=${#CURRENT_PANES[@]}

echo "  現在のペイン数: $PANE_COUNT"

# 5ペインが必要な場合は作成
if [ $PANE_COUNT -lt 5 ]; then
    echo "🔧 不足ペインを作成中..."
    
    # 現在のペインから新しいペインを分割
    while [ $PANE_COUNT -lt 5 ]; do
        LAST_PANE=${CURRENT_PANES[-1]}
        echo "  ペイン$LAST_PANE から新しいペインを分割..."
        tmux split-window -t "$SESSION_NAME.$LAST_PANE" -h
        
        # 更新されたペイン一覧を取得
        CURRENT_PANES=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}"))
        PANE_COUNT=${#CURRENT_PANES[@]}
        echo "    現在のペイン数: $PANE_COUNT"
    done
fi

echo ""
echo "🔧 5ペイン構成完了。配置を調整中..."

# 最新のペイン一覧を取得
FINAL_PANES=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}"))
echo "  最終ペイン番号: ${FINAL_PANES[*]}"

# ターゲットレイアウトに調整
echo ""
echo "📐 3段レイアウトに調整中..."

# main-horizontalレイアウトを設定
tmux select-layout -t "$SESSION_NAME" main-horizontal

# ペイン1（Feature-A）をmain-pane（下段）に移動
echo "  Feature-A（統合リーダー）を最下段に配置..."
tmux select-pane -t "$SESSION_NAME.1"

# レイアウトを再調整
tmux select-layout -t "$SESSION_NAME" main-horizontal

echo ""
echo "🏷️ 各ペインに正しい役割を設定中..."

# 現在のペイン順序を取得
REORDERED_PANES=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}"))

# 各ペインに役割を設定（指定された配置に基づく）
for i in "${!REORDERED_PANES[@]}"; do
    PANE_NUM="${REORDERED_PANES[$i]}"
    
    case $PANE_NUM in
        1)
            # ペイン1: Feature-A (統合リーダー) - 3段目全幅
            echo "  ペイン$PANE_NUM: Feature-A (統合リーダー) - 3段目全幅"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "clear" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\\033]2;🎯 Feature-A: 統合リーダー\\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[🎯 Feature-A]\\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🎯 Feature-A: 統合リーダー (3段目全幅)'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd /mnt/e/ServiceGrid" C-m
            ;;
        2)
            # ペイン2: Feature-B (UI/テスト) - 1段目左
            echo "  ペイン$PANE_NUM: Feature-B (UI/テスト) - 1段目左"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "clear" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\\033]2;🎨 Feature-B: UI/テスト\\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[🎨 Feature-B]\\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🎨 Feature-B: UI/テスト (1段目左)'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd /mnt/e/ServiceGrid" C-m
            ;;
        3)
            # ペイン3: Feature-C (API開発) - 1段目右
            echo "  ペイン$PANE_NUM: Feature-C (API開発) - 1段目右"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "clear" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\\033]2;🔧 Feature-C: API開発\\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[🔧 Feature-C]\\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🔧 Feature-C: API開発 (1段目右)'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd /mnt/e/ServiceGrid/backend" C-m
            ;;
        4)
            # ペイン4: Feature-D (PowerShell) - 2段目左
            echo "  ペイン$PANE_NUM: Feature-D (PowerShell) - 2段目左"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "clear" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\\033]2;💻 Feature-D: PowerShell\\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[💻 Feature-D]\\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '💻 Feature-D: PowerShell (2段目左)'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd /mnt/e/ServiceGrid/backend" C-m
            ;;
        5)
            # ペイン5: Feature-E (非機能要件) - 2段目右
            echo "  ペイン$PANE_NUM: Feature-E (非機能要件) - 2段目右"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "clear" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\\033]2;🔒 Feature-E: 非機能要件\\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[🔒 Feature-E]\\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🔒 Feature-E: 非機能要件 (2段目右)'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd /mnt/e/ServiceGrid" C-m
            ;;
    esac
done

echo ""
echo "✅ 正確なペインレイアウト設定完了！"
echo ""
echo "🎯 最終ペイン配置:"
echo "  ┌─────────────────────────────────────┐"
echo "  │ 1段目: Feature-B │ Feature-C       │"
echo "  │ Ctrl+b+2 (UI/テスト) │ Ctrl+b+3 (API) │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 2段目: Feature-D │ Feature-E       │"
echo "  │ Ctrl+b+4 (PowerShell) │ Ctrl+b+5 (非機能) │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 3段目: Feature-A (統合リーダー)     │"
echo "  │        Ctrl+b + 1                   │"
echo "  └─────────────────────────────────────┘"
echo ""
echo "⌨️ ペイン切り替え:"
echo "  1段目: Ctrl+b + 2 (🎨 Feature-B) | Ctrl+b + 3 (🔧 Feature-C)"
echo "  2段目: Ctrl+b + 4 (💻 Feature-D) | Ctrl+b + 5 (🔒 Feature-E)"
echo "  3段目: Ctrl+b + 1 (🎯 Feature-A)"
echo ""
echo "📋 最終ペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: #{pane_width}x#{pane_height} - #{pane_title}"