#!/bin/bash

# tmux接続用スクリプト

SESSION_NAME="itsm-dev"

echo "🔌 ITSM Platform 開発環境に接続中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    echo "先に ./ultra-simple-start.sh を実行してください"
    exit 1
fi

# ペイン数確認
PANES=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
echo "✅ セッション発見: $PANES ペイン"

echo ""
echo "🎯 ペイン構成:"
echo "  0: 🎯 統合リーダー (設計統一、アーキテクチャ管理、品質監視)"
echo "  1: 🎨 UI/テスト (フロントエンド開発、テスト自動修復)"
echo "  2: 🔧 API開発 (バックエンドAPI、テスト通過ループ)"
echo "  3: 💻 PowerShell (Windows対応、PowerShell API実装)"
echo "  4: 🔒 非機能要件 (SLA、セキュリティ、監視、パフォーマンス)"
echo ""
echo "⌨️  操作方法:"
echo "  Ctrl+b 0-4: ペイン切り替え"
echo "  Ctrl+b d: デタッチ"
echo "  Ctrl+b &: セッション終了"
echo ""

# セッションにアタッチ
tmux attach-session -t "$SESSION_NAME"