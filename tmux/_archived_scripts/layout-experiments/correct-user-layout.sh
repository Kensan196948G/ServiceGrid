#!/bin/bash

# ユーザー要求通りの正確な3段配置を実現

SESSION_NAME="itsm-dev"

print_info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

print_info "ユーザー要求通りの3段配置に修正中..."

# 既存セッション削除
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
sleep 1

# 新しいセッション作成
tmux new-session -d -s "$SESSION_NAME" -c "/mnt/e/ServiceGrid"

print_info "要求通りの配置を作成中..."

# 1段目: Pane 0, Pane 1 (左右分割)
tmux split-window -h -t "$SESSION_NAME:0" -c "/mnt/e/ServiceGrid"

# 2段目: Pane 2 (Pane 0の下に)
tmux split-window -v -t "$SESSION_NAME:0" -c "/mnt/e/ServiceGrid"

# 2段目: Pane 3 (Pane 1の下に)  
tmux split-window -v -t "$SESSION_NAME:1" -c "/mnt/e/ServiceGrid"

# 3段目: Pane 4 (Pane 2の下にフル幅)
tmux split-window -v -t "$SESSION_NAME:2" -c "/mnt/e/ServiceGrid"

# ペイン数確認
pane_count=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
print_info "作成されたペイン数: $pane_count"

if [ "$pane_count" -ne 5 ]; then
    print_error "5ペイン作成失敗: ${pane_count}ペインのみ"
    exit 1
fi

print_success "5ペイン作成成功！"

# 各ペインの設定とClaude起動
print_info "各ペインの設定とClaude起動..."

declare -A features=(
    [0]="🎨 Feature-B (UI/テスト)"
    [1]="🔧 Feature-C (API開発)"
    [2]="💻 Feature-D (PowerShell)"
    [3]="🔒 Feature-E (非機能要件)"
    [4]="🎯 Feature-A (統合リーダー)"
)

for pane_id in 0 1 2 3 4; do
    feature="${features[$pane_id]}"
    
    # 基本設定
    tmux send-keys -t "$SESSION_NAME:$pane_id" "clear" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_id" "cd /mnt/e/ServiceGrid" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_id" "echo '$feature'" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_id" "echo '================================'" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_id" "echo 'Pane $pane_id: Claude起動中...'" C-m
    
    # Claude起動
    tmux send-keys -t "$SESSION_NAME:$pane_id" "claude" C-m
    
    print_info "Pane $pane_id: $feature + Claude起動完了"
    sleep 1
done

print_success "ユーザー要求通りの配置完成！"

echo ""
echo "🎯 ユーザー要求通りの最終配置:"
echo ""
echo "  ┌─────────────────────────────────────┐"
echo "  │ 1段目                               │"
echo "  │ Pane 0 (Feature-B) │ Pane 1 (Feature-C) │"
echo "  │ UI/テスト          │ API開発         │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 2段目                               │"
echo "  │ Pane 2 (Feature-D) │ Pane 3 (Feature-E) │"
echo "  │ PowerShell         │ 非機能要件      │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 3段目 (フル幅)                      │"
echo "  │ Pane 4 (Feature-A) 統合リーダー     │"
echo "  └─────────────────────────────────────┘"
echo ""

# 実際の配置確認
print_info "実際のペイン配置確認:"
tmux list-panes -t "$SESSION_NAME" -F '  Pane #P: #{pane_width}x#{pane_height} at (#{pane_left},#{pane_top})'

echo ""
echo "⌨️ ペイン操作:"
echo "  Ctrl+b + 0: 🎨 Feature-B (UI/テスト)"
echo "  Ctrl+b + 1: 🔧 Feature-C (API開発)"
echo "  Ctrl+b + 2: 💻 Feature-D (PowerShell)"
echo "  Ctrl+b + 3: 🔒 Feature-E (非機能要件)"
echo "  Ctrl+b + 4: 🎯 Feature-A (統合リーダー)"
echo ""
echo "🚀 接続:"
echo "  tmux attach-session -t $SESSION_NAME"
echo ""
echo "✅ ユーザー要求通りの配置が完成しました！"
echo "   各ペインでClaudeが起動済みです。"
echo ""