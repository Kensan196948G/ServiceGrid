#!/bin/bash

# tmux ペインを手動で正確に再配置するスクリプト
# 目標: ペイン1を最下段、ペイン2-5を上段2行に配置

SESSION_NAME="itsm-dev"

echo "🔧 手動でペイン配置を正確に修正中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

echo "📋 修正前の配置:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: (#{pane_left},#{pane_top}) #{pane_width}x#{pane_height}"

echo ""
echo "🔄 ペインを一旦削除して正確な順序で再作成..."

# 現在の作業ディレクトリを保存
echo "  各ペインの現在ディレクトリを取得中..."
PANE1_DIR=$(tmux display-message -t "$SESSION_NAME.1" -p "#{pane_current_path}")
PANE2_DIR=$(tmux display-message -t "$SESSION_NAME.2" -p "#{pane_current_path}")
PANE3_DIR=$(tmux display-message -t "$SESSION_NAME.3" -p "#{pane_current_path}")
PANE4_DIR=$(tmux display-message -t "$SESSION_NAME.4" -p "#{pane_current_path}")
PANE5_DIR=$(tmux display-message -t "$SESSION_NAME.5" -p "#{pane_current_path}")

echo "    ペイン1: $PANE1_DIR"
echo "    ペイン2: $PANE2_DIR"
echo "    ペイン3: $PANE3_DIR"
echo "    ペイン4: $PANE4_DIR"
echo "    ペイン5: $PANE5_DIR"

# 全ペインを削除（最初のペインを除く）
echo ""
echo "🗑️ 追加ペインを削除中..."
tmux kill-pane -t "$SESSION_NAME.5" 2>/dev/null
tmux kill-pane -t "$SESSION_NAME.4" 2>/dev/null
tmux kill-pane -t "$SESSION_NAME.3" 2>/dev/null
tmux kill-pane -t "$SESSION_NAME.2" 2>/dev/null

echo "📋 残ったペイン:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: #{pane_width}x#{pane_height}"

echo ""
echo "🔧 目標配置でペインを再作成中..."

# 目標配置:
# 1段目: ペイン2 (Feature-B) | ペイン3 (Feature-C)
# 2段目: ペイン4 (Feature-D) | ペイン5 (Feature-E)  
# 3段目: ペイン1 (Feature-A) - 全幅

echo "  Step 1: 1段目 - ペイン2 (Feature-B) を作成..."
tmux split-window -t "$SESSION_NAME.1" -v -c "$PANE2_DIR"
NEW_PANE2=$(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}" | tail -1)
echo "    作成されたペイン: $NEW_PANE2"

echo "  Step 2: 1段目右 - ペイン3 (Feature-C) を作成..."
tmux split-window -t "$SESSION_NAME.$NEW_PANE2" -h -c "$PANE3_DIR"
NEW_PANE3=$(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}" | tail -1)
echo "    作成されたペイン: $NEW_PANE3"

echo "  Step 3: 2段目左 - ペイン4 (Feature-D) を作成..."
tmux split-window -t "$SESSION_NAME.$NEW_PANE2" -v -c "$PANE4_DIR"
NEW_PANE4=$(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}" | tail -1)
echo "    作成されたペイン: $NEW_PANE4"

echo "  Step 4: 2段目右 - ペイン5 (Feature-E) を作成..."
tmux split-window -t "$SESSION_NAME.$NEW_PANE3" -v -c "$PANE5_DIR"
NEW_PANE5=$(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}" | tail -1)
echo "    作成されたペイン: $NEW_PANE5"

echo ""
echo "📋 再作成後のペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: (#{pane_left},#{pane_top}) #{pane_width}x#{pane_height}"

echo ""
echo "🔄 ペイン番号を正規化中..."

# 現在のペイン番号を取得
CURRENT_PANES=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}"))
echo "  現在のペイン番号: ${CURRENT_PANES[*]}"

# ペイン番号を正規化（1,2,3,4,5にする）
if [ "${#CURRENT_PANES[@]}" -eq 5 ]; then
    echo "  ペイン番号正規化は不要（既に5ペイン）"
else
    echo "  ⚠️ ペイン数が5個でない: ${#CURRENT_PANES[@]}個"
fi

echo ""
echo "🏷️ 各ペインに正しい役割を設定中..."

# 現在のペイン配置に基づいて役割を設定
FINAL_PANES=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}"))

for i in "${!FINAL_PANES[@]}"; do
    PANE_NUM="${FINAL_PANES[$i]}"
    
    case $i in
        0)
            # 最初のペイン（通常1番）: Feature-A (統合リーダー) - 3段目
            echo "  ペイン$PANE_NUM: Feature-A (統合リーダー) - 3段目全幅"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "clear" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\\033]2;🎯 Feature-A: 統合リーダー\\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[🎯 Feature-A]\\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🎯 Feature-A: 統合リーダー (3段目全幅) - Ctrl+b+$PANE_NUM'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd /mnt/e/ServiceGrid" C-m
            ;;
        1)
            # 2番目のペイン: Feature-B (UI/テスト) - 1段目左
            echo "  ペイン$PANE_NUM: Feature-B (UI/テスト) - 1段目左"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "clear" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\\033]2;🎨 Feature-B: UI/テスト\\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[🎨 Feature-B]\\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🎨 Feature-B: UI/テスト (1段目左) - Ctrl+b+$PANE_NUM'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd /mnt/e/ServiceGrid" C-m
            ;;
        2)
            # 3番目のペイン: Feature-C (API開発) - 1段目右
            echo "  ペイン$PANE_NUM: Feature-C (API開発) - 1段目右"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "clear" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\\033]2;🔧 Feature-C: API開発\\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[🔧 Feature-C]\\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🔧 Feature-C: API開発 (1段目右) - Ctrl+b+$PANE_NUM'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd /mnt/e/ServiceGrid/backend" C-m
            ;;
        3)
            # 4番目のペイン: Feature-D (PowerShell) - 2段目左
            echo "  ペイン$PANE_NUM: Feature-D (PowerShell) - 2段目左"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "clear" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\\033]2;💻 Feature-D: PowerShell\\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[💻 Feature-D]\\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '💻 Feature-D: PowerShell (2段目左) - Ctrl+b+$PANE_NUM'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd /mnt/e/ServiceGrid/backend" C-m
            ;;
        4)
            # 5番目のペイン: Feature-E (非機能要件) - 2段目右
            echo "  ペイン$PANE_NUM: Feature-E (非機能要件) - 2段目右"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "clear" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\\033]2;🔒 Feature-E: 非機能要件\\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[🔒 Feature-E]\\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🔒 Feature-E: 非機能要件 (2段目右) - Ctrl+b+$PANE_NUM'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd /mnt/e/ServiceGrid" C-m
            ;;
    esac
    
    sleep 0.3
done

echo ""
echo "✅ 手動再配置完了！"
echo ""
echo "📋 最終ペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: (#{pane_left},#{pane_top}) #{pane_width}x#{pane_height} - #{pane_title}"

echo ""
echo "🎯 最終ペイン配置:"
RESULT_PANES=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}"))
echo "  ┌─────────────────────────────────────┐"
echo "  │ 1段目: ペイン${RESULT_PANES[1]}     │ ペイン${RESULT_PANES[2]}        │"
echo "  │     Feature-B      │   Feature-C    │"
echo "  │    (UI/テスト)     │   (API開発)    │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 2段目: ペイン${RESULT_PANES[3]}     │ ペイン${RESULT_PANES[4]}        │"
echo "  │   Feature-D        │   Feature-E    │"
echo "  │  (PowerShell)      │  (非機能要件)  │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 3段目: ペイン${RESULT_PANES[0]} Feature-A            │"
echo "  │       (統合リーダー) - 全幅         │"
echo "  └─────────────────────────────────────┘"
echo ""
echo "⌨️ 実際のペイン切り替え:"
echo "  1段目: Ctrl+b + ${RESULT_PANES[1]} (🎨 Feature-B) | Ctrl+b + ${RESULT_PANES[2]} (🔧 Feature-C)"
echo "  2段目: Ctrl+b + ${RESULT_PANES[3]} (💻 Feature-D) | Ctrl+b + ${RESULT_PANES[4]} (🔒 Feature-E)"
echo "  3段目: Ctrl+b + ${RESULT_PANES[0]} (🎯 Feature-A)"