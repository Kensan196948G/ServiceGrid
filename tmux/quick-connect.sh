#!/bin/bash

# tmux接続時にClaude Codeも自動起動する統合スクリプト

SESSION_NAME="itsm-dev"

echo "🚀 ITSM開発環境 - Claude Code統合起動中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "📋 セッションが存在しないため、新規作成します..."
    ./simple-3tier.sh
    sleep 2
fi

echo "🔧 Claude Code自動起動実行中..."
./auto-start-with-claude.sh

echo ""
echo "✅ 準備完了！tmuxセッションに接続します..."
echo ""
echo "🎯 5ペイン Claude Code 並列開発環境"
echo "  ┌─────────────────────────────────────┐"
echo "  │ 1段目: Feature-B │ Feature-C       │"
echo "  │   (UI/テスト)    │  (API開発)      │"
echo "  │   Claude起動済み │ Claude起動済み  │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 2段目: Feature-D │ Feature-E       │"
echo "  │  (PowerShell)    │ (非機能要件)    │"
echo "  │   Claude起動済み │ Claude起動済み  │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 3段目: Feature-A (統合リーダー)     │"
echo "  │          Claude起動済み             │"
echo "  └─────────────────────────────────────┘"
echo ""
echo "⌨️ ペイン切り替え:"
echo "  Ctrl+b + 1: 🎨 Feature-B | Ctrl+b + 2: 🔧 Feature-C"
echo "  Ctrl+b + 3: 💻 Feature-D | Ctrl+b + 4: 🔒 Feature-E"
echo "  Ctrl+b + 5: 🎯 Feature-A"
echo ""

# tmuxセッションに接続
tmux attach-session -t "$SESSION_NAME"