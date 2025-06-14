#!/bin/bash

# 強制的に5ペインを作成するスクリプト
# ターミナルサイズに関係なく確実に作成

SESSION_NAME="itsm-dev"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🔧 強制5ペイン作成スクリプト実行中..."

# 既存セッション完全削除
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
sleep 1

echo "📐 ターミナル情報:"
echo "  TERM: $TERM"
echo "  COLUMNS: ${COLUMNS:-$(tput cols)}"
echo "  LINES: ${LINES:-$(tput lines)}"

# 新しいセッション作成
echo "📋 セッション作成..."
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

echo "🔧 強制ペイン分割開始..."

# 現在のペイン数確認関数
check_panes() {
    local count=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
    echo "   現在のペイン数: $count"
    return $count
}

# Step 1: 最初の分割
echo "Step 1: 最初の分割試行..."
check_panes
if tmux split-window -h -t "$SESSION_NAME"; then
    echo "   ✅ 水平分割成功"
else
    echo "   ❌ 水平分割失敗、垂直分割を試行"
    tmux split-window -v -t "$SESSION_NAME"
fi
check_panes
CURRENT_PANES=$?

# Step 2: 2番目の分割
echo "Step 2: 2番目の分割試行..."
for pane in $(seq 0 $((CURRENT_PANES-1))); do
    if tmux split-window -v -t "$SESSION_NAME.$pane" 2>/dev/null; then
        echo "   ✅ ペイン$pane の垂直分割成功"
        break
    elif tmux split-window -h -t "$SESSION_NAME.$pane" 2>/dev/null; then
        echo "   ✅ ペイン$pane の水平分割成功"
        break
    fi
done
check_panes
CURRENT_PANES=$?

# Step 3: 3番目の分割
echo "Step 3: 3番目の分割試行..."
for pane in $(seq 0 $((CURRENT_PANES-1))); do
    if tmux split-window -h -t "$SESSION_NAME.$pane" 2>/dev/null; then
        echo "   ✅ ペイン$pane の水平分割成功"
        break
    elif tmux split-window -v -t "$SESSION_NAME.$pane" 2>/dev/null; then
        echo "   ✅ ペイン$pane の垂直分割成功"
        break
    fi
done
check_panes
CURRENT_PANES=$?

# Step 4: 4番目の分割（5番目のペイン作成）
echo "Step 4: 4番目の分割試行（5番目のペイン作成）..."
for pane in $(seq 0 $((CURRENT_PANES-1))); do
    echo "   ペイン$pane での分割を試行..."
    if tmux split-window -v -t "$SESSION_NAME.$pane" 2>/dev/null; then
        echo "   ✅ ペイン$pane の垂直分割成功"
        break
    elif tmux split-window -h -t "$SESSION_NAME.$pane" 2>/dev/null; then
        echo "   ✅ ペイン$pane の水平分割成功"
        break
    else
        echo "   ❌ ペイン$pane の分割失敗"
    fi
done

# 最終確認
FINAL_PANES=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
echo ""
echo "🎯 分割結果:"
echo "  最終ペイン数: $FINAL_PANES"
echo "  目標: 5ペイン"

# レイアウト調整
tmux select-layout -t "$SESSION_NAME" tiled

# 代替案：手動で追加ペインを作成
if [ "$FINAL_PANES" -lt 5 ]; then
    echo ""
    echo "⚠️ ${FINAL_PANES}ペインしか作成できませんでした"
    echo "🔧 追加の分割方法を試行します..."
    
    # より小さなペインで分割を試行
    for pane in $(seq 0 $((FINAL_PANES-1))); do
        # ペインサイズを確認
        PANE_INFO=$(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}:#{pane_width}x#{pane_height}" | grep "^$pane:")
        echo "   $PANE_INFO"
        
        # 小さなペインでも分割を試行
        if tmux split-window -v -t "$SESSION_NAME.$pane" -l 3 2>/dev/null; then
            echo "   ✅ ペイン$pane の小さな垂直分割成功"
            break
        elif tmux split-window -h -t "$SESSION_NAME.$pane" -l 10 2>/dev/null; then
            echo "   ✅ ペイン$pane の小さな水平分割成功"
            break
        fi
    done
fi

# 最終ペイン数
FINAL_PANES=$(tmux list-panes -t "$SESSION_NAME" | wc -l)

echo ""
echo "📋 最終ペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: #{pane_width}x#{pane_height} #{?pane_active,(active),}"

# 各ペインに識別情報設定
for i in $(seq 0 $((FINAL_PANES-1))); do
    tmux send-keys -t "$SESSION_NAME.$i" "clear" C-m
    case $i in
        0) tmux send-keys -t "$SESSION_NAME.$i" "echo '🎯 Feature-A: 統合リーダー (ペイン0)'" C-m ;;
        1) tmux send-keys -t "$SESSION_NAME.$i" "echo '🎨 Feature-B: UI/テスト (ペイン1)'" C-m ;;
        2) tmux send-keys -t "$SESSION_NAME.$i" "echo '🔧 Feature-C: API開発 (ペイン2)'" C-m ;;
        3) tmux send-keys -t "$SESSION_NAME.$i" "echo '💻 Feature-D: PowerShell (ペイン3)'" C-m ;;
        4) tmux send-keys -t "$SESSION_NAME.$i" "echo '🔒 Feature-E: 非機能要件 (ペイン4)'" C-m ;;
    esac
    tmux send-keys -t "$SESSION_NAME.$i" "echo 'ペイン番号: $i'" C-m
    tmux send-keys -t "$SESSION_NAME.$i" "cd $PROJECT_ROOT" C-m
done

echo ""
if [ "$FINAL_PANES" -eq 5 ]; then
    echo "🎉 成功: 5ペイン並列開発環境が完成しました！"
elif [ "$FINAL_PANES" -eq 4 ]; then
    echo "⚠️ 4ペインが作成されました"
    echo "💡 tmux内で手動分割: Ctrl+b + | または Ctrl+b + -"
else
    echo "⚠️ ${FINAL_PANES}ペインが作成されました"
    echo "💡 tmux内で手動分割を行ってください"
fi

echo ""
echo "⌨️ 操作方法:"
echo "  Ctrl+b 0-$((FINAL_PANES-1)): ペイン切り替え"
echo "  Ctrl+b |: 水平分割"
echo "  Ctrl+b -: 垂直分割"
echo "  Ctrl+b d: デタッチ"
echo ""

tmux select-pane -t "$SESSION_NAME.0"
echo "🔌 セッションに接続します..."
tmux attach-session -t "$SESSION_NAME"