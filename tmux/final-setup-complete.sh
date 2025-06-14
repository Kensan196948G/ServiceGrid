#!/bin/bash

# 最終完成版: 5ペイン3段構成 + Claude自動起動

SESSION_NAME="itsm-dev"

print_info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_info "現在の5ペイン構成にClaude自動起動を追加中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    print_error "セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

# 各ペインでClaude起動
print_info "各ペインでClaude自動起動中..."

# Feature設定
declare -A features=(
    [0]="🎨 Feature-B (UI/テスト)"
    [1]="🔧 Feature-C (API開発)"
    [2]="💻 Feature-D (PowerShell)"
    [3]="🔒 Feature-E (非機能要件)"
    [4]="🎯 Feature-A (統合リーダー)"
)

for pane_id in 0 1 2 3 4; do
    feature="${features[$pane_id]}"
    
    # ペイン基本設定
    tmux send-keys -t "$SESSION_NAME:0.$pane_id" "cd /mnt/e/ServiceGrid" C-m
    tmux send-keys -t "$SESSION_NAME:0.$pane_id" "clear" C-m
    tmux send-keys -t "$SESSION_NAME:0.$pane_id" "echo '$feature'" C-m
    tmux send-keys -t "$SESSION_NAME:0.$pane_id" "echo '================================'" C-m
    tmux send-keys -t "$SESSION_NAME:0.$pane_id" "echo 'Pane $pane_id: Claude起動中...'" C-m
    
    # Claude自動起動
    tmux send-keys -t "$SESSION_NAME:0.$pane_id" "claude" C-m
    
    print_info "Pane $pane_id: $feature - Claude起動完了"
    sleep 2  # Claude起動待機
done

print_success "全ペインでClaude自動起動完了！"

echo ""
echo "🎯 最終完成構成:"
echo ""
echo "  📋 実際のペイン配置:"
tmux list-panes -t "$SESSION_NAME" -F '    Pane #P: #{pane_width}x#{pane_height} at (#{pane_left},#{pane_top})'

echo ""
echo "  🎛️ 機能配置 (現在の配置):"
echo "    ┌─────────────────────────────────────┐"
echo "    │ 1段目: Pane 0 │ Pane 1 │ Pane 2   │"
echo "    │  🎨Feature-B  │🔧Feature-C│💻Feature-D│"
echo "    │  (UI/テスト)  │(API開発) │(PowerShell)│"
echo "    ├─────────────────────────────────────┤"
echo "    │ 2段目: Pane 3 (フル幅)              │"
echo "    │  🔒 Feature-E (非機能要件)         │"
echo "    ├─────────────────────────────────────┤"
echo "    │ 3段目: Pane 4 (フル幅)              │"
echo "    │  🎯 Feature-A (統合リーダー)       │"
echo "    └─────────────────────────────────────┘"
echo ""
echo "⌨️ ペイン操作:"
echo "  Ctrl+b + 0: 🎨 Feature-B (UI/テスト)"
echo "  Ctrl+b + 1: 🔧 Feature-C (API開発)"
echo "  Ctrl+b + 2: 💻 Feature-D (PowerShell)"
echo "  Ctrl+b + 3: 🔒 Feature-E (非機能要件)"
echo "  Ctrl+b + 4: 🎯 Feature-A (統合リーダー)"
echo ""
echo "✨ 状態:"
echo "  • 全5ペイン作成済み ✅"
echo "  • 各ペインでClaude自動起動済み ✅"
echo "  • 開発環境準備完了 ✅"
echo ""
echo "🚀 接続方法:"
echo "  tmux attach-session -t $SESSION_NAME"
echo ""
echo "💡 各ペインでClaudeがすでに起動しているので、"
echo "   そのまま作業を開始できます！"
echo ""