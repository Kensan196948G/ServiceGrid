#!/bin/bash

# tmuxペインを正確な3段配置に修正するスクリプト
# 目標:
# 1段目: ペイン2 (Feature-B) | ペイン3 (Feature-C)
# 2段目: ペイン4 (Feature-D) | ペイン5 (Feature-E)  
# 3段目: ペイン1 (Feature-A) - 全幅下段

SESSION_NAME="itsm-dev"

echo "🔧 最終的な正確なレイアウトに修正中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

echo "📋 修正前のペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: #{pane_width}x#{pane_height}"

echo ""
echo "🔧 目標配置に向けて段階的調整中..."

# 手動でペイン配置を調整
echo "  Step 1: ペイン選択とレイアウト調整..."

# 最初にtiled レイアウトに設定
tmux select-layout -t "$SESSION_NAME" tiled
sleep 1

# ペイン2を選択してmain-paneに設定
echo "  Step 2: ペイン2を基準に配置調整..."
tmux select-pane -t "$SESSION_NAME.2"
tmux select-layout -t "$SESSION_NAME" main-vertical
sleep 1

# ペイン1を最下段に移動するため、レイアウトを変更
echo "  Step 3: Feature-A（ペイン1）を最下段に配置..."
tmux select-pane -t "$SESSION_NAME.1"
tmux select-layout -t "$SESSION_NAME" main-horizontal
sleep 1

# カスタムレイアウトを適用
echo "  Step 4: カスタムレイアウトを適用..."

# ウィンドウサイズを取得
WINDOW_INFO=$(tmux display-message -t "$SESSION_NAME" -p "#{window_width}x#{window_height}")
WINDOW_WIDTH=$(echo $WINDOW_INFO | cut -d'x' -f1)
WINDOW_HEIGHT=$(echo $WINDOW_INFO | cut -d'x' -f2)

echo "    ウィンドウサイズ: ${WINDOW_WIDTH}x${WINDOW_HEIGHT}"

# 3段構成の高さ計算
TOP_HEIGHT=$(($WINDOW_HEIGHT / 3))
MIDDLE_HEIGHT=$(($WINDOW_HEIGHT / 3))
BOTTOM_HEIGHT=$(($WINDOW_HEIGHT - $TOP_HEIGHT - $MIDDLE_HEIGHT))

# 1段目・2段目の左右幅
LEFT_WIDTH=$(($WINDOW_WIDTH / 2))
RIGHT_WIDTH=$(($WINDOW_WIDTH - $LEFT_WIDTH))

echo "    計算されたレイアウト:"
echo "      1段目: ${LEFT_WIDTH}x${TOP_HEIGHT} | ${RIGHT_WIDTH}x${TOP_HEIGHT}"
echo "      2段目: ${LEFT_WIDTH}x${MIDDLE_HEIGHT} | ${RIGHT_WIDTH}x${MIDDLE_HEIGHT}"
echo "      3段目: ${WINDOW_WIDTH}x${BOTTOM_HEIGHT}"

# カスタムレイアウト文字列を作成
# 形式: width x height, x_offset, y_offset, pane_id
# 3段目（下）: ペイン1 (Feature-A)
# 1段目（上左）: ペイン2 (Feature-B)
# 1段目（上右）: ペイン3 (Feature-C) 
# 2段目（中左）: ペイン4 (Feature-D)
# 2段目（中右）: ペイン5 (Feature-E)

LAYOUT="${WINDOW_WIDTH}x${WINDOW_HEIGHT},0,0["
LAYOUT="${LAYOUT}${WINDOW_WIDTH}x${TOP_HEIGHT},0,0{"
LAYOUT="${LAYOUT}${LEFT_WIDTH}x${TOP_HEIGHT},0,0,1,"
LAYOUT="${LAYOUT}${RIGHT_WIDTH}x${TOP_HEIGHT},${LEFT_WIDTH},0,2},"
LAYOUT="${LAYOUT}${WINDOW_WIDTH}x${MIDDLE_HEIGHT},0,${TOP_HEIGHT}{"
LAYOUT="${LAYOUT}${LEFT_WIDTH}x${MIDDLE_HEIGHT},0,${TOP_HEIGHT},3,"
LAYOUT="${LAYOUT}${RIGHT_WIDTH}x${MIDDLE_HEIGHT},${LEFT_WIDTH},${TOP_HEIGHT},4},"
LAYOUT="${LAYOUT}${WINDOW_WIDTH}x${BOTTOM_HEIGHT},0,$((TOP_HEIGHT + MIDDLE_HEIGHT)),0]"

echo "    カスタムレイアウト文字列: $LAYOUT"

# カスタムレイアウトを適用（試行）
echo "  Step 5: カスタムレイアウト適用試行..."
if ! tmux select-layout -t "$SESSION_NAME" "$LAYOUT" 2>/dev/null; then
    echo "    カスタムレイアウト適用失敗。代替方法を使用..."
    
    # 代替: 手動調整
    echo "  Step 6: 手動調整による配置..."
    
    # main-horizontalで下段メインペインを設定
    tmux select-pane -t "$SESSION_NAME.1"
    tmux select-layout -t "$SESSION_NAME" main-horizontal
    
    # 上部4ペインを整理
    tmux select-pane -t "$SESSION_NAME.2"
    tmux resize-pane -t "$SESSION_NAME.2" -U 10
    tmux resize-pane -t "$SESSION_NAME.1" -D 5
fi

echo ""
echo "🏷️ ペインタイトルとプロンプトを再設定..."

# 各ペインに正しい役割を設定
tmux send-keys -t "$SESSION_NAME.1" "clear" C-m
tmux send-keys -t "$SESSION_NAME.1" "printf '\\033]2;🎯 Feature-A: 統合リーダー\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.1" "export PS1='[🎯 Feature-A]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo '🎯 Feature-A: 統合リーダー (3段目全幅)'" C-m

tmux send-keys -t "$SESSION_NAME.2" "clear" C-m
tmux send-keys -t "$SESSION_NAME.2" "printf '\\033]2;🎨 Feature-B: UI/テスト\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.2" "export PS1='[🎨 Feature-B]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo '🎨 Feature-B: UI/テスト (1段目左)'" C-m

tmux send-keys -t "$SESSION_NAME.3" "clear" C-m
tmux send-keys -t "$SESSION_NAME.3" "printf '\\033]2;🔧 Feature-C: API開発\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.3" "export PS1='[🔧 Feature-C]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo '🔧 Feature-C: API開発 (1段目右)'" C-m

tmux send-keys -t "$SESSION_NAME.4" "clear" C-m
tmux send-keys -t "$SESSION_NAME.4" "printf '\\033]2;💻 Feature-D: PowerShell\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.4" "export PS1='[💻 Feature-D]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.4" "echo '💻 Feature-D: PowerShell (2段目左)'" C-m

tmux send-keys -t "$SESSION_NAME.5" "clear" C-m
tmux send-keys -t "$SESSION_NAME.5" "printf '\\033]2;🔒 Feature-E: 非機能要件\\033\\\\'" C-m
tmux send-keys -t "$SESSION_NAME.5" "export PS1='[🔒 Feature-E]\\$ '" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '🔒 Feature-E: 非機能要件 (2段目右)'" C-m

echo ""
echo "✅ 最終調整完了！"
echo ""
echo "🎯 実際のペイン配置:"
echo "  ┌─────────────────────────────────────┐"
echo "  │ 1段目: ペイン2     │ ペイン3        │"
echo "  │     Feature-B      │   Feature-C    │"
echo "  │    (UI/テスト)     │   (API開発)    │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 2段目: ペイン4     │ ペイン5        │"
echo "  │   Feature-D        │   Feature-E    │"
echo "  │  (PowerShell)      │  (非機能要件)  │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 3段目: ペイン1 Feature-A            │"
echo "  │       (統合リーダー) - 全幅         │"
echo "  └─────────────────────────────────────┘"
echo ""
echo "⌨️ ペイン切り替え:"
echo "  1段目: Ctrl+b + 2 (🎨 Feature-B) | Ctrl+b + 3 (🔧 Feature-C)"
echo "  2段目: Ctrl+b + 4 (💻 Feature-D) | Ctrl+b + 5 (🔒 Feature-E)"
echo "  3段目: Ctrl+b + 1 (🎯 Feature-A)"
echo ""
echo "📋 修正後のペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: #{pane_width}x#{pane_height} - #{pane_title}"

echo ""
echo "🔧 手動調整が必要な場合:"
echo "  tmux attach-session -t itsm-dev"
echo "  Ctrl+b + Alt+2  # even-vertical レイアウト"
echo "  Ctrl+b + Alt+3  # main-horizontal レイアウト"
echo "  手動でペインサイズ調整: Ctrl+b + 矢印キー"