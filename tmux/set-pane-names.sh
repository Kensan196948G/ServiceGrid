#!/bin/bash

# 各ペインに分かりやすい名前を設定するスクリプト

SESSION_NAME="itsm-dev"

echo "🏷️ ペイン名設定スクリプト実行中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

# ペイン数確認
PANE_COUNT=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
echo "📋 現在のペイン数: $PANE_COUNT"

echo "🔧 各ペインにタイトルと識別名を設定中..."

# ペイン0: Feature-A (統合リーダー)
if [ "$PANE_COUNT" -ge 1 ]; then
    echo "  ペイン0: Feature-A (統合リーダー)"
    tmux send-keys -t "$SESSION_NAME.0" "printf '\033]2;🎯 Feature-A: 統合リーダー\033\\\\'" C-m
    tmux send-keys -t "$SESSION_NAME.0" "export PS1='[🎯 Feature-A]\$ '" C-m
    tmux send-keys -t "$SESSION_NAME.0" "echo '🎯 Feature-A: 統合リーダー - 設計統一、アーキテクチャ管理、品質監視'" C-m
fi

# ペイン1: Feature-B (UI/テスト)
if [ "$PANE_COUNT" -ge 2 ]; then
    echo "  ペイン1: Feature-B (UI/テスト)"
    tmux send-keys -t "$SESSION_NAME.1" "printf '\033]2;🎨 Feature-B: UI/テスト\033\\\\'" C-m
    tmux send-keys -t "$SESSION_NAME.1" "export PS1='[🎨 Feature-B]\$ '" C-m
    tmux send-keys -t "$SESSION_NAME.1" "echo '🎨 Feature-B: UI/テスト - フロントエンド開発、テスト自動修復'" C-m
fi

# ペイン2: Feature-C (API開発)
if [ "$PANE_COUNT" -ge 3 ]; then
    echo "  ペイン2: Feature-C (API開発)"
    tmux send-keys -t "$SESSION_NAME.2" "printf '\033]2;🔧 Feature-C: API開発\033\\\\'" C-m
    tmux send-keys -t "$SESSION_NAME.2" "export PS1='[🔧 Feature-C]\$ '" C-m
    tmux send-keys -t "$SESSION_NAME.2" "echo '🔧 Feature-C: API開発 - バックエンドAPI、テスト通過ループ'" C-m
fi

# ペイン3: Feature-D (PowerShell)
if [ "$PANE_COUNT" -ge 4 ]; then
    echo "  ペイン3: Feature-D (PowerShell)"
    tmux send-keys -t "$SESSION_NAME.3" "printf '\033]2;💻 Feature-D: PowerShell\033\\\\'" C-m
    tmux send-keys -t "$SESSION_NAME.3" "export PS1='[💻 Feature-D]\$ '" C-m
    tmux send-keys -t "$SESSION_NAME.3" "echo '💻 Feature-D: PowerShell - Windows対応、PowerShell API実装'" C-m
fi

# ペイン4: Feature-E (非機能要件)
if [ "$PANE_COUNT" -ge 5 ]; then
    echo "  ペイン4: Feature-E (非機能要件)"
    tmux send-keys -t "$SESSION_NAME.4" "printf '\033]2;🔒 Feature-E: 非機能要件\033\\\\'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "export PS1='[🔒 Feature-E]\$ '" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '🔒 Feature-E: 非機能要件 - SLA、セキュリティ、監視、パフォーマンス'" C-m
fi

echo ""
echo "✅ ペイン名設定完了！"
echo ""
echo "🎯 設定されたペイン構成:"
echo "  ペイン0: 🎯 Feature-A (統合リーダー)"
echo "  ペイン1: 🎨 Feature-B (UI/テスト)"
echo "  ペイン2: 🔧 Feature-C (API開発)"
echo "  ペイン3: 💻 Feature-D (PowerShell)"
echo "  ペイン4: 🔒 Feature-E (非機能要件)"
echo ""
echo "⌨️ ペイン切り替え:"
echo "  Ctrl+b + 0-4: 各ペインに移動"
echo "  Ctrl+b + q: ペイン番号を一時表示"
echo ""
echo "💡 プロンプト表示で各ペインが識別しやすくなりました！"