#!/bin/bash

# 新構成: 4ペインtmux + VSCode統合リーダー

SESSION_NAME="itsm-dev-4pane"

print_info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

print_info "新構成: 4ペインtmux環境を作成中..."

# 既存セッション削除
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
sleep 1

# 新しいセッション作成
tmux new-session -d -s "$SESSION_NAME" -c "/mnt/e/ServiceGrid"

print_info "4ペイン構成を作成中..."

# 2x2グリッド構成作成
# 1段目: Feature-B | Feature-C
tmux split-window -h -t "$SESSION_NAME:0" -c "/mnt/e/ServiceGrid"

# 2段目: Feature-D | Feature-E  
tmux split-window -v -t "$SESSION_NAME:0" -c "/mnt/e/ServiceGrid"
tmux split-window -v -t "$SESSION_NAME:1" -c "/mnt/e/ServiceGrid"

# ペイン数確認
pane_count=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
print_info "作成されたペイン数: $pane_count"

if [ "$pane_count" -ne 4 ]; then
    print_error "4ペイン作成失敗: ${pane_count}ペインのみ"
    exit 1
fi

print_success "4ペイン作成成功！"

# 各ペインの設定とClaude自動起動
print_info "各ペインの設定とClaude自動起動..."

declare -A features=(
    [0]="🎨 Feature-B (UI/テスト)"
    [1]="🔧 Feature-C (API開発)"
    [2]="💻 Feature-D (PowerShell)"
    [3]="🔒 Feature-E (非機能要件)"
)

for pane_id in 0 1 2 3; do
    feature="${features[$pane_id]}"
    
    # 基本設定
    tmux send-keys -t "$SESSION_NAME:$pane_id" "clear" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_id" "cd /mnt/e/ServiceGrid" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_id" "echo '$feature'" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_id" "echo '================================'" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_id" "echo 'Pane $pane_id: Claude自動起動中...'" C-m
    
    # Claude自動起動
    tmux send-keys -t "$SESSION_NAME:$pane_id" "claude" C-m
    
    print_info "Pane $pane_id: $feature + Claude起動完了"
    sleep 2
done

print_success "4ペインtmux環境完成！"

echo ""
echo "🎯 新構成完成:"
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
echo "  📋 Feature-A（統合リーダー）:"
echo "     VSCode + Claude で統合管理"
echo "     tmuxの4ペインに指示を送信"
echo ""

# 実際の配置確認
print_info "実際のペイン配置:"
tmux list-panes -t "$SESSION_NAME" -F '  Pane #P: #{pane_width}x#{pane_height} at (#{pane_left},#{pane_top})'

echo ""
echo "⌨️ tmuxペイン操作:"
echo "  Ctrl+b + 0: 🎨 Feature-B (UI/テスト)"
echo "  Ctrl+b + 1: 🔧 Feature-C (API開発)"
echo "  Ctrl+b + 2: 💻 Feature-D (PowerShell)"
echo "  Ctrl+b + 3: 🔒 Feature-E (非機能要件)"
echo ""
echo "🚀 tmux接続:"
echo "  tmux attach-session -t $SESSION_NAME"
echo ""
echo "💡 VSCode統合リーダー:"
echo "  VSCodeで統合開発環境を開き、"
echo "  Claudeから4ペインに指示を送信"
echo ""
echo "✅ 新構成（4ペインtmux + VSCode統合）完成！"
echo ""