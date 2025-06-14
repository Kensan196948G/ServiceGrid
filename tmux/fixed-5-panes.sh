#!/bin/bash

# 確実に5ペインを作成するtmuxスクリプト

SESSION_NAME="itsm-dev"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🚀 確実な5ペイン作成スクリプト実行中..."

# 既存セッション削除
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
echo "✅ 既存セッション削除完了"

# 新しいセッション作成
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"
echo "✅ 新セッション作成完了"

# ペイン分割（段階的かつ確実）
echo "🔧 ペイン分割開始..."

# Step 1: 最初に水平分割（2ペイン）
tmux split-window -h -t "$SESSION_NAME"
echo "  Step 1: 水平分割完了（2ペイン）"

# Step 2: 左ペインを垂直分割（3ペイン）
tmux split-window -v -t "$SESSION_NAME.0"
echo "  Step 2: 左ペイン垂直分割完了（3ペイン）"

# Step 3: 右ペインを垂直分割（4ペイン）
tmux split-window -v -t "$SESSION_NAME.2"
echo "  Step 3: 右ペイン垂直分割完了（4ペイン）"

# Step 4: 右下ペインをさらに分割（5ペイン）
tmux split-window -h -t "$SESSION_NAME.4"
echo "  Step 4: 右下ペイン分割完了（5ペイン）"

# ペイン数確認
PANE_COUNT=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
echo "✅ 作成されたペイン数: $PANE_COUNT"

if [ "$PANE_COUNT" -eq 5 ]; then
    echo "🎉 5ペインの作成に成功しました！"
else
    echo "⚠️ 期待される5ペインではなく${PANE_COUNT}ペインが作成されました"
    echo "🔧 追加分割を試行します..."
    
    # 追加で分割を試行
    if [ "$PANE_COUNT" -eq 4 ]; then
        # 4ペインの場合、最後のペインを分割
        tmux split-window -h -t "$SESSION_NAME.3"
        PANE_COUNT=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
        echo "✅ 追加分割後のペイン数: $PANE_COUNT"
    fi
fi

# レイアウト調整
tmux select-layout -t "$SESSION_NAME" tiled
echo "✅ タイルレイアウト適用完了"

# 各ペインの詳細確認
echo ""
echo "📋 ペイン構成詳細:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: #{pane_width}x#{pane_height} (#{pane_id})"

# 各ペインに情報設定
echo ""
echo "📝 各ペインに情報設定中..."

# ペイン0: Feature-A
tmux send-keys -t "$SESSION_NAME.0" "clear" C-m
tmux send-keys -t "$SESSION_NAME.0" "echo '🎯 Feature-A: 統合リーダー (ペイン0)'" C-m
tmux send-keys -t "$SESSION_NAME.0" "echo '設計統一、アーキテクチャ管理、品質監視'" C-m
tmux send-keys -t "$SESSION_NAME.0" "echo 'メニュー: cd tmux && ./panes/feature-a-leader.sh'" C-m
tmux send-keys -t "$SESSION_NAME.0" "cd $PROJECT_ROOT" C-m

# ペイン1: Feature-B
tmux send-keys -t "$SESSION_NAME.1" "clear" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo '🎨 Feature-B: UI/テスト (ペイン1)'" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo 'フロントエンド開発、テスト自動修復'" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo 'メニュー: cd tmux && ./panes/feature-b-ui.sh'" C-m
tmux send-keys -t "$SESSION_NAME.1" "cd $PROJECT_ROOT" C-m

# ペイン2: Feature-C
tmux send-keys -t "$SESSION_NAME.2" "clear" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo '🔧 Feature-C: API開発 (ペイン2)'" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo 'バックエンドAPI、テスト通過ループ'" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo 'メニュー: cd tmux && ./panes/feature-c-api.sh'" C-m
tmux send-keys -t "$SESSION_NAME.2" "cd $PROJECT_ROOT/backend" C-m

# ペイン3: Feature-D
tmux send-keys -t "$SESSION_NAME.3" "clear" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo '💻 Feature-D: PowerShell (ペイン3)'" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo 'Windows対応、PowerShell API実装'" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo 'メニュー: cd tmux && ./panes/feature-d-powershell.sh'" C-m
tmux send-keys -t "$SESSION_NAME.3" "cd $PROJECT_ROOT/backend" C-m

# ペイン4: Feature-E（存在する場合）
if [ "$PANE_COUNT" -ge 5 ]; then
    tmux send-keys -t "$SESSION_NAME.4" "clear" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '🔒 Feature-E: 非機能要件 (ペイン4)'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo 'SLA、セキュリティ、監視、パフォーマンス'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo 'メニュー: cd tmux && ./panes/feature-e-nonfunc.sh'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "cd $PROJECT_ROOT" C-m
fi

# 最初のペインを選択
tmux select-pane -t "$SESSION_NAME.0"

echo ""
echo "🎯 ペイン作成結果:"
echo "  作成されたペイン数: $PANE_COUNT"
echo "  目標ペイン数: 5"

if [ "$PANE_COUNT" -eq 5 ]; then
    echo "✅ 成功: 5ペイン並列開発環境が完成しました！"
else
    echo "⚠️ 注意: ${PANE_COUNT}ペインが作成されました"
fi

echo ""
echo "🎯 ペイン構成:"
echo "  0: 🎯 統合リーダー"
echo "  1: 🎨 UI/テスト"
echo "  2: 🔧 API開発"
echo "  3: 💻 PowerShell"
if [ "$PANE_COUNT" -ge 5 ]; then
    echo "  4: 🔒 非機能要件"
fi

echo ""
echo "⌨️ 操作方法:"
echo "  Ctrl+b 0-$((PANE_COUNT-1)): ペイン切り替え"
echo "  Ctrl+b d: デタッチ"
echo "  Ctrl+b &: セッション終了"
echo ""
echo "🔌 接続します..."

# セッションにアタッチ
tmux attach-session -t "$SESSION_NAME"