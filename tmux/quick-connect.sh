#!/bin/bash

# tmux接続時にClaude Codeも自動起動する統合スクリプト

SESSION_NAME="itsm-requirement"

echo "🚀 ITSM開発環境 - Claude Code統合起動中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "📋 セッションが存在しないため、新規作成します..."
    ./start-development.sh
    exit 0
fi

echo "🔧 Claude Code自動起動実行中..."
./setup-all-panes-claude.sh

echo ""
echo "✅ 準備完了！tmuxセッションに接続します..."
echo ""
echo "🎯 tmux 3段構成統合開発環境"
echo "  ┌─────────────────────────────────────┐"
echo "  │ 1段目（上段）                       │"
echo "  │ ┌─────────────┬─────────────────────┤"
echo "  │ │ 0:Feature-B │ 1:Feature-C         │"
echo "  │ │ UI/テスト   │ API開発             │"
echo "  │ ├─────────────┼─────────────────────┤"
echo "  │ │ 2段目（中段）                     │"
echo "  │ │ 2:Feature-D │ 3:Feature-E         │"
echo "  │ │ PowerShell  │ 非機能要件          │"
echo "  │ └─────────────┴─────────────────────┘"
echo "  ├─────────────────────────────────────┤"
echo "  │ 3段目（下段フル幅）                 │"
echo "  │ 4:Feature-A (統合リーダー)          │"
echo "  └─────────────────────────────────────┘"
echo ""
echo "⌨️ tmuxペイン切り替え:"
echo "  Ctrl+b + 0: 🎨 Feature-B (UI/テスト) - 1段目左"
echo "  Ctrl+b + 1: 🔧 Feature-C (API開発) - 1段目右"
echo "  Ctrl+b + 2: 💻 Feature-D (PowerShell) - 2段目左"
echo "  Ctrl+b + 3: 🔒 Feature-E (非機能要件) - 2段目右"
echo "  Ctrl+b + 4: 🎯 Feature-A (統合リーダー) - 3段目フル幅"
echo ""

# セッションアタッチ（インタラクティブモードの場合のみ）
if [ -t 0 ]; then
    tmux attach-session -t "$SESSION_NAME"
else
    echo "🎉 tmuxセッション '$SESSION_NAME' が準備完了しました！"
    echo "接続するには: tmux attach-session -t $SESSION_NAME"
fi