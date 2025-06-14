#!/bin/bash

# ユーザー要求通りの2×2グリッド配置を作成

SESSION_NAME="itsm-dev"

print_info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_info "正確な2×2グリッド配置に修正中..."

# 既存セッション削除
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
sleep 1

# 新しいセッション作成
tmux new-session -d -s "$SESSION_NAME" -c "/mnt/e/ServiceGrid"

print_info "2×2グリッド配置を作成中..."

# 1段目: Feature-B | Feature-C（横分割）
tmux split-window -h -t "$SESSION_NAME:0" -c "/mnt/e/ServiceGrid"

# 2段目: Feature-D（左下）
tmux split-window -v -t "$SESSION_NAME:0" -c "/mnt/e/ServiceGrid"

# 2段目: Feature-E（右下）  
tmux split-window -v -t "$SESSION_NAME:1" -c "/mnt/e/ServiceGrid"

# ペイン数確認
pane_count=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
print_info "作成されたペイン数: $pane_count"

if [ "$pane_count" -ne 4 ]; then
    print_error "4ペイン作成失敗: ${pane_count}ペインのみ"
    exit 1
fi

print_success "2×2グリッド作成成功！"

# 各ペインの設定とClaude起動
print_info "各ペインの設定とClaude起動..."

# Pane 0: Feature-B (UI/テスト) - 1段目左
tmux send-keys -t "$SESSION_NAME:0" "clear" C-m
tmux send-keys -t "$SESSION_NAME:0" "cd /mnt/e/ServiceGrid" C-m
tmux send-keys -t "$SESSION_NAME:0" "echo '🎨 Feature-B (UI/テスト)'" C-m
tmux send-keys -t "$SESSION_NAME:0" "echo 'ClaudeCode + Tmux - 1段目左'" C-m
tmux send-keys -t "$SESSION_NAME:0" "echo 'Claude起動中...'" C-m
tmux send-keys -t "$SESSION_NAME:0" "claude" C-m

sleep 2

# Pane 1: Feature-C (API開発) - 1段目右  
tmux send-keys -t "$SESSION_NAME:1" "clear" C-m
tmux send-keys -t "$SESSION_NAME:1" "cd /mnt/e/ServiceGrid" C-m
tmux send-keys -t "$SESSION_NAME:1" "echo '🔧 Feature-C (API開発)'" C-m
tmux send-keys -t "$SESSION_NAME:1" "echo 'ClaudeCode + Tmux - 1段目右'" C-m
tmux send-keys -t "$SESSION_NAME:1" "echo 'Claude起動中...'" C-m
tmux send-keys -t "$SESSION_NAME:1" "claude" C-m

sleep 2

# Pane 2: Feature-D (PowerShell) - 2段目左
tmux send-keys -t "$SESSION_NAME:2" "clear" C-m
tmux send-keys -t "$SESSION_NAME:2" "cd /mnt/e/ServiceGrid" C-m
tmux send-keys -t "$SESSION_NAME:2" "echo '💻 Feature-D (PowerShell)'" C-m
tmux send-keys -t "$SESSION_NAME:2" "echo 'ClaudeCode + Tmux - 2段目左'" C-m
tmux send-keys -t "$SESSION_NAME:2" "echo 'Claude起動中...'" C-m
tmux send-keys -t "$SESSION_NAME:2" "claude" C-m

sleep 2

# Pane 3: Feature-E (非機能要件) - 2段目右
tmux send-keys -t "$SESSION_NAME:3" "clear" C-m
tmux send-keys -t "$SESSION_NAME:3" "cd /mnt/e/ServiceGrid" C-m
tmux send-keys -t "$SESSION_NAME:3" "echo '🔒 Feature-E (非機能要件)'" C-m
tmux send-keys -t "$SESSION_NAME:3" "echo 'ClaudeCode + Tmux - 2段目右'" C-m
tmux send-keys -t "$SESSION_NAME:3" "echo 'Claude起動中...'" C-m
tmux send-keys -t "$SESSION_NAME:3" "claude" C-m

print_success "2×2グリッド配置完成！"

echo ""
echo "🎯 ユーザー要求通りの2×2グリッド配置:"
echo ""
echo "  ┌─────────────────────────────────────┐"
echo "  │ 1段目                               │"
echo "  │ Pane 0 (Feature-B) │ Pane 1 (Feature-C) │"
echo "  │ UI/テスト          │ API開発         │"
echo "  │ ClaudeCode+Tmux    │ ClaudeCode+Tmux │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 2段目                               │"
echo "  │ Pane 2 (Feature-D) │ Pane 3 (Feature-E) │"
echo "  │ PowerShell         │ 非機能要件      │"
echo "  │ ClaudeCode+Tmux    │ ClaudeCode+Tmux │"
echo "  └─────────────────────────────────────┘"
echo ""

# 実際の配置確認
print_info "実際のペイン配置:"
tmux list-panes -t "$SESSION_NAME" -F '  Pane #P: #{pane_width}x#{pane_height} at (#{pane_left},#{pane_top})'

echo ""
echo "⌨️ ペイン操作:"
echo "  Ctrl+b + 0: 🎨 Feature-B (UI/テスト)"
echo "  Ctrl+b + 1: 🔧 Feature-C (API開発)"
echo "  Ctrl+b + 2: 💻 Feature-D (PowerShell)"
echo "  Ctrl+b + 3: 🔒 Feature-E (非機能要件)"
echo ""
echo "🚀 CLI表示:"
echo "  tmux attach-session -t $SESSION_NAME"
echo ""
echo "✅ ユーザー要求通りの配置完成！"
echo "   各ペインでClaudeが起動されています。"
echo ""