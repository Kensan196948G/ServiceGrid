#!/bin/bash

# VSCode内ターミナル専用 - tmux開発環境作成スクリプト
# アタッチはせず、セッション作成のみ行う

SESSION_NAME="itsm-dev"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🔧 VSCode統合開発環境用 tmux セッション作成中..."

# 既存セッション削除
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# 新しいセッション作成（デタッチ状態）
echo "📋 セッション作成中..."
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

# ペイン分割
echo "🔧 5ペイン構成作成中..."
tmux split-window -h -t "$SESSION_NAME"
tmux select-pane -t "$SESSION_NAME.0"
tmux split-window -v -t "$SESSION_NAME.0"
tmux select-pane -t "$SESSION_NAME.2"
tmux split-window -v -t "$SESSION_NAME.2"
tmux select-pane -t "$SESSION_NAME.3"
tmux split-window -h -t "$SESSION_NAME.3"
tmux select-layout -t "$SESSION_NAME" tiled

# 各ペインに情報設定
echo "📝 各ペイン初期設定中..."

# Feature-A: 統合リーダー
tmux send-keys -t "$SESSION_NAME.0" "clear" C-m
tmux send-keys -t "$SESSION_NAME.0" "echo '🎯 Feature-A: 統合リーダー'" C-m
tmux send-keys -t "$SESSION_NAME.0" "echo '設計統一、アーキテクチャ管理、品質監視'" C-m
tmux send-keys -t "$SESSION_NAME.0" "echo 'メニュー起動: cd tmux && ./panes/feature-a-leader.sh'" C-m
tmux send-keys -t "$SESSION_NAME.0" "cd $PROJECT_ROOT" C-m

# Feature-B: UI/テスト
tmux send-keys -t "$SESSION_NAME.1" "clear" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo '🎨 Feature-B: UI/テスト'" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo 'フロントエンド開発、テスト自動修復'" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo 'メニュー起動: cd tmux && ./panes/feature-b-ui.sh'" C-m
tmux send-keys -t "$SESSION_NAME.1" "cd $PROJECT_ROOT" C-m

# Feature-C: API開発
tmux send-keys -t "$SESSION_NAME.2" "clear" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo '🔧 Feature-C: API開発'" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo 'バックエンドAPI、テスト通過ループ'" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo 'メニュー起動: cd tmux && ./panes/feature-c-api.sh'" C-m
tmux send-keys -t "$SESSION_NAME.2" "cd $PROJECT_ROOT/backend" C-m

# Feature-D: PowerShell
tmux send-keys -t "$SESSION_NAME.3" "clear" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo '💻 Feature-D: PowerShell'" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo 'Windows対応、PowerShell API実装'" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo 'メニュー起動: cd tmux && ./panes/feature-d-powershell.sh'" C-m
tmux send-keys -t "$SESSION_NAME.3" "cd $PROJECT_ROOT/backend" C-m

# Feature-E: 非機能要件
tmux send-keys -t "$SESSION_NAME.4" "clear" C-m
tmux send-keys -t "$SESSION_NAME.4" "echo '🔒 Feature-E: 非機能要件'" C-m
tmux send-keys -t "$SESSION_NAME.4" "echo 'SLA、セキュリティ、監視、パフォーマンス'" C-m
tmux send-keys -t "$SESSION_NAME.4" "echo 'メニュー起動: cd tmux && ./panes/feature-e-nonfunc.sh'" C-m
tmux send-keys -t "$SESSION_NAME.4" "cd $PROJECT_ROOT" C-m

# 最初のペインを選択
tmux select-pane -t "$SESSION_NAME.0"

echo ""
echo "✅ VSCode統合開発環境用セッション作成完了！"
echo ""
echo "🎯 作成されたペイン構成:"
echo "  0: 🎯 統合リーダー (設計統一、アーキテクチャ管理、品質監視)"
echo "  1: 🎨 UI/テスト (フロントエンド開発、テスト自動修復)"
echo "  2: 🔧 API開発 (バックエンドAPI、テスト通過ループ)"
echo "  3: 💻 PowerShell (Windows対応、PowerShell API実装)"
echo "  4: 🔒 非機能要件 (SLA、セキュリティ、監視、パフォーマンス)"
echo ""
echo "🔌 セッション接続方法:"
echo "  外部ターミナルで: ./connect.sh"
echo "  手動接続: tmux attach-session -t itsm-dev"
echo ""
echo "💡 VSCode内では："
echo "  - 各ペイン機能は個別のターミナルタブで実行推奨"
echo "  - デバッグ機能との併用が効果的"
echo "  - マルチルートワークスペースで複数プロジェクト表示"
echo ""
echo "🚀 準備完了！外部ターミナルでtmuxセッションに接続してください。"