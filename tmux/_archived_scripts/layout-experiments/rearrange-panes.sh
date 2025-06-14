#!/bin/bash

# tmuxペインレイアウトを指定された配置に変更するスクリプト
# 
# 目標レイアウト:
# 1段目: Feature-B (UI/テスト) | Feature-C (API開発)
# 2段目: Feature-D (PowerShell) | Feature-E (非機能要件)  
# 3段目: Feature-A (統合リーダー) - 全幅

SESSION_NAME="itsm-dev"

echo "🔧 tmuxペインレイアウト変更中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

echo "📋 現在のペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: #{pane_width}x#{pane_height}"

echo ""
echo "🔧 新しいレイアウトに再配置中..."

# 現在のペイン番号を取得
CURRENT_PANES=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}"))
echo "  現在のペイン: ${CURRENT_PANES[*]}"

# 新しいレイアウトを作成するため、既存ペインを一旦整理
echo "🗂️ ペインレイアウト再構築中..."

# すべてのペインを削除して再作成（内容は保持）
# 代わりに、tmuxの組み込みレイアウトを使用して配置を調整

# カスタムレイアウトを設定
# tmuxのレイアウト文字列を使用
echo "📐 カスタムレイアウト適用中..."

# レイアウト文字列の定義
# 形式: 幅x高さ,x座標,y座標,ペインID
# 画面サイズを取得
WINDOW_INFO=$(tmux display-message -t "$SESSION_NAME" -p "#{window_width}x#{window_height}")
WINDOW_WIDTH=$(echo $WINDOW_INFO | cut -d'x' -f1)
WINDOW_HEIGHT=$(echo $WINDOW_INFO | cut -d'x' -f2)

echo "  ウィンドウサイズ: ${WINDOW_WIDTH}x${WINDOW_HEIGHT}"

# 高さ計算
TOP_HEIGHT=$(($WINDOW_HEIGHT / 3))
MIDDLE_HEIGHT=$(($WINDOW_HEIGHT / 3))
BOTTOM_HEIGHT=$(($WINDOW_HEIGHT - $TOP_HEIGHT - $MIDDLE_HEIGHT))

# 幅計算（上段・中段は2分割）
LEFT_WIDTH=$(($WINDOW_WIDTH / 2))
RIGHT_WIDTH=$(($WINDOW_WIDTH - $LEFT_WIDTH))

echo "  計算されたレイアウト:"
echo "    1段目: ${LEFT_WIDTH}x${TOP_HEIGHT} | ${RIGHT_WIDTH}x${TOP_HEIGHT}"
echo "    2段目: ${LEFT_WIDTH}x${MIDDLE_HEIGHT} | ${RIGHT_WIDTH}x${MIDDLE_HEIGHT}"
echo "    3段目: ${WINDOW_WIDTH}x${BOTTOM_HEIGHT}"

# より簡単な方法：既存のレイアウトを使用して手動で調整
echo "🔄 段階的にレイアウトを調整中..."

# 1. まずtiled レイアウトに設定
tmux select-layout -t "$SESSION_NAME" tiled

# 2. main-horizontal レイアウトに変更（統合リーダーを下に配置）
tmux select-layout -t "$SESSION_NAME" main-horizontal

# 3. main-pane を最下段に設定
# ペイン1（Feature-A）を選択してmain-paneに設定
echo "  Feature-A（統合リーダー）を最下段に配置..."
tmux select-pane -t "$SESSION_NAME.1"
tmux swap-pane -t "$SESSION_NAME.1" -s "$SESSION_NAME.5"  # ペイン1と5を交換

# 4. 上部ペインを調整
echo "  上部ペインレイアウトを調整..."
tmux select-layout -t "$SESSION_NAME" main-horizontal

# ペインの役割を再割り当て
echo ""
echo "🔄 ペイン役割の再割り当て中..."

# 現在のペイン配置を確認
echo "📋 調整後のペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: #{pane_width}x#{pane_height}"

# 各ペインに新しい役割を設定
echo "🏷️ 新しいペイン役割を設定中..."

# 現在のペイン番号を再取得
NEW_PANES=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}"))

# 新しい配置に基づいてペイン名を設定
# 配置順序に基づいて役割を割り当て

for i in "${!NEW_PANES[@]}"; do
    PANE_NUM="${NEW_PANES[$i]}"
    
    case $i in
        0)
            # 1段目左: Feature-B (UI/テスト)
            echo "  ペイン$PANE_NUM: Feature-B (UI/テスト) - 1段目左"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "clear" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\033]2;🎨 Feature-B: UI/テスト\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[🎨 Feature-B]\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🎨 Feature-B: UI/テスト (1段目左)'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd /mnt/e/ServiceGrid" C-m
            ;;
        1)
            # 1段目右: Feature-C (API開発)
            echo "  ペイン$PANE_NUM: Feature-C (API開発) - 1段目右"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "clear" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\033]2;🔧 Feature-C: API開発\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[🔧 Feature-C]\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🔧 Feature-C: API開発 (1段目右)'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd /mnt/e/ServiceGrid/backend" C-m
            ;;
        2)
            # 2段目左: Feature-D (PowerShell)
            echo "  ペイン$PANE_NUM: Feature-D (PowerShell) - 2段目左"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "clear" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\033]2;💻 Feature-D: PowerShell\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[💻 Feature-D]\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '💻 Feature-D: PowerShell (2段目左)'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd /mnt/e/ServiceGrid/backend" C-m
            ;;
        3)
            # 2段目右: Feature-E (非機能要件)
            echo "  ペイン$PANE_NUM: Feature-E (非機能要件) - 2段目右"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "clear" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\033]2;🔒 Feature-E: 非機能要件\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[🔒 Feature-E]\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🔒 Feature-E: 非機能要件 (2段目右)'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd /mnt/e/ServiceGrid" C-m
            ;;
        4)
            # 3段目全幅: Feature-A (統合リーダー)
            echo "  ペイン$PANE_NUM: Feature-A (統合リーダー) - 3段目全幅"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "clear" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\033]2;🎯 Feature-A: 統合リーダー\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[🎯 Feature-A]\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🎯 Feature-A: 統合リーダー (3段目全幅)'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd /mnt/e/ServiceGrid" C-m
            ;;
    esac
done

echo ""
echo "✅ ペインレイアウト変更完了！"
echo ""
echo "🎯 新しいペイン配置:"
echo "  ┌─────────────────────────────────────┐"
echo "  │ 1段目: Feature-B │ Feature-C       │"
echo "  │       (UI/テスト) │ (API開発)       │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 2段目: Feature-D │ Feature-E       │"
echo "  │    (PowerShell)  │ (非機能要件)    │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 3段目: Feature-A (統合リーダー)     │"
echo "  │              全幅                   │"
echo "  └─────────────────────────────────────┘"
echo ""

# 最終的なペイン番号マッピングを表示
FINAL_PANES=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}"))
echo "⌨️ 新しいペイン切り替え:"
echo "  1段目: Ctrl+b + ${FINAL_PANES[0]} (Feature-B) | Ctrl+b + ${FINAL_PANES[1]} (Feature-C)"
echo "  2段目: Ctrl+b + ${FINAL_PANES[2]} (Feature-D) | Ctrl+b + ${FINAL_PANES[3]} (Feature-E)"
echo "  3段目: Ctrl+b + ${FINAL_PANES[4]} (Feature-A)"
echo ""
echo "📋 最終ペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: #{pane_width}x#{pane_height} - #{pane_title}"