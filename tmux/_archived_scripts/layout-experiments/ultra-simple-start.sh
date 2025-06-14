#!/bin/bash

# 超シンプルtmux起動スクリプト - 確実な5ペイン作成

SESSION_NAME="itsm-dev"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🚀 ITSM Platform 5ペイン開発環境を起動中..."

# 既存セッション削除
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# 新しいセッション作成
echo "セッション作成中..."
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

# ペイン分割（段階的で確実）
echo "ペイン分割中..."

# 最初に水平分割
tmux split-window -h -t "$SESSION_NAME"

# 左側を垂直分割
tmux select-pane -t "$SESSION_NAME.0"
tmux split-window -v -t "$SESSION_NAME.0"

# 右側を垂直分割  
tmux select-pane -t "$SESSION_NAME.2"
tmux split-window -v -t "$SESSION_NAME.2"

# 右下をもう一度水平分割
tmux select-pane -t "$SESSION_NAME.3"
tmux split-window -h -t "$SESSION_NAME.3"

# レイアウト調整
tmux select-layout -t "$SESSION_NAME" tiled

# ペイン数確認
PANES=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
echo "作成されたペイン数: $PANES"

# 各ペインに情報設定
echo "各ペインに情報設定中..."

# ペイン0: Feature-A
tmux send-keys -t "$SESSION_NAME.0" "clear" C-m
tmux send-keys -t "$SESSION_NAME.0" "echo '🎯 Feature-A: 統合リーダー'" C-m
tmux send-keys -t "$SESSION_NAME.0" "echo '設計統一、アーキテクチャ管理、品質監視'" C-m
tmux send-keys -t "$SESSION_NAME.0" "cd $PROJECT_ROOT/tmux" C-m

# ペイン1: Feature-B
tmux send-keys -t "$SESSION_NAME.1" "clear" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo '🎨 Feature-B: UI/テスト'" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo 'フロントエンド開発、テスト自動修復'" C-m
tmux send-keys -t "$SESSION_NAME.1" "cd $PROJECT_ROOT" C-m

# ペイン2: Feature-C
tmux send-keys -t "$SESSION_NAME.2" "clear" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo '🔧 Feature-C: API開発'" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo 'バックエンドAPI、テスト通過ループ'" C-m
tmux send-keys -t "$SESSION_NAME.2" "cd $PROJECT_ROOT/backend" C-m

# ペイン3: Feature-D
tmux send-keys -t "$SESSION_NAME.3" "clear" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo '💻 Feature-D: PowerShell'" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo 'Windows対応、PowerShell API実装'" C-m
tmux send-keys -t "$SESSION_NAME.3" "cd $PROJECT_ROOT/backend" C-m

# ペイン4: Feature-E
if [ "$PANES" -ge 5 ]; then
    tmux send-keys -t "$SESSION_NAME.4" "clear" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '🔒 Feature-E: 非機能要件'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo 'SLA、セキュリティ、監視、パフォーマンス'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "cd $PROJECT_ROOT" C-m
fi

# 最初のペインを選択
tmux select-pane -t "$SESSION_NAME.0"

echo ""
echo "✅ 5ペイン並列開発環境が起動しました！"
echo ""
echo "🎯 ペイン構成:"
echo "  0: 🎯 統合リーダー"
echo "  1: 🎨 UI/テスト"  
echo "  2: 🔧 API開発"
echo "  3: 💻 PowerShell"
echo "  4: 🔒 非機能要件"
echo ""
echo "⌨️  操作方法:"
echo "  Ctrl+b 0-4: ペイン切り替え"
echo "  Ctrl+b d: デタッチ"
echo "  Ctrl+b &: セッション終了"
echo ""
echo "接続します..."

# セッションにアタッチ
tmux attach-session -t "$SESSION_NAME"