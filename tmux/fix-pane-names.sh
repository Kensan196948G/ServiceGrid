#!/bin/bash

# 実際のペイン番号に対応したペイン名設定スクリプト

SESSION_NAME="itsm-dev"

echo "🔧 修正版ペイン名設定スクリプト実行中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

echo "📋 現在のペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: #{pane_width}x#{pane_height} (#{pane_id})"

echo ""
echo "🔧 実際のペイン番号に基づいて設定中..."

# 実際のペイン番号を取得
PANE_INDEXES=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}"))
PANE_COUNT=${#PANE_INDEXES[@]}

echo "  検出されたペイン番号: ${PANE_INDEXES[*]}"
echo "  ペイン数: $PANE_COUNT"

# 各ペインに設定
for i in "${!PANE_INDEXES[@]}"; do
    PANE_NUM="${PANE_INDEXES[$i]}"
    
    case $i in
        0)
            echo "  ペイン$PANE_NUM: Feature-A (統合リーダー)"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\033]2;🎯 Feature-A: 統合リーダー\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[🎯 Feature-A]\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🎯 Feature-A: 統合リーダー - 設計統一、アーキテクチャ管理、品質監視'" C-m
            ;;
        1)
            echo "  ペイン$PANE_NUM: Feature-B (UI/テスト)"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\033]2;🎨 Feature-B: UI/テスト\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[🎨 Feature-B]\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🎨 Feature-B: UI/テスト - フロントエンド開発、テスト自動修復'" C-m
            ;;
        2)
            echo "  ペイン$PANE_NUM: Feature-C (API開発)"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\033]2;🔧 Feature-C: API開発\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[🔧 Feature-C]\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🔧 Feature-C: API開発 - バックエンドAPI、テスト通過ループ'" C-m
            ;;
        3)
            echo "  ペイン$PANE_NUM: Feature-D (PowerShell)"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\033]2;💻 Feature-D: PowerShell\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[💻 Feature-D]\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '💻 Feature-D: PowerShell - Windows対応、PowerShell API実装'" C-m
            ;;
        4)
            echo "  ペイン$PANE_NUM: Feature-E (非機能要件)"
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "printf '\033]2;🔒 Feature-E: 非機能要件\033\\\\'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[🔒 Feature-E]\$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🔒 Feature-E: 非機能要件 - SLA、セキュリティ、監視、パフォーマンス'" C-m
            ;;
    esac
done

echo ""
echo "✅ ペイン名設定完了！"
echo ""
echo "🎯 実際のペイン構成:"
for i in "${!PANE_INDEXES[@]}"; do
    PANE_NUM="${PANE_INDEXES[$i]}"
    case $i in
        0) echo "  ペイン$PANE_NUM: 🎯 Feature-A (統合リーダー)" ;;
        1) echo "  ペイン$PANE_NUM: 🎨 Feature-B (UI/テスト)" ;;
        2) echo "  ペイン$PANE_NUM: 🔧 Feature-C (API開発)" ;;
        3) echo "  ペイン$PANE_NUM: 💻 Feature-D (PowerShell)" ;;
        4) echo "  ペイン$PANE_NUM: 🔒 Feature-E (非機能要件)" ;;
    esac
done

echo ""
echo "⌨️ ペイン切り替え (実際の番号):"
echo "  Ctrl+b + ${PANE_INDEXES[0]}: 🎯 Feature-A"
echo "  Ctrl+b + ${PANE_INDEXES[1]}: 🎨 Feature-B"
echo "  Ctrl+b + ${PANE_INDEXES[2]}: 🔧 Feature-C"
echo "  Ctrl+b + ${PANE_INDEXES[3]}: 💻 Feature-D"
echo "  Ctrl+b + ${PANE_INDEXES[4]}: 🔒 Feature-E"
echo ""
echo "  Ctrl+b + q: ペイン番号を一時表示"
echo ""
echo "💡 各ペインのプロンプトが Feature 名で識別できるようになりました！"