#!/bin/bash

# 確実に5ペインを作成する最終スクリプト

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

print_info "確実な5ペインレイアウトを作成中..."

# 既存セッション完全削除
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
sleep 1

# 新しいセッション作成（最初のペイン = Pane 0）
tmux new-session -d -s "$SESSION_NAME" -c "/mnt/e/ServiceGrid"
print_info "Pane 0 作成完了"

# Pane 1作成（水平分割）
tmux split-window -h -t "$SESSION_NAME:0.0" -c "/mnt/e/ServiceGrid"
print_info "Pane 1 作成完了"

# Pane 2作成（Pane 0を垂直分割）
tmux split-window -v -t "$SESSION_NAME:0.0" -c "/mnt/e/ServiceGrid"  
print_info "Pane 2 作成完了"

# Pane 3作成（Pane 1を垂直分割）
tmux split-window -v -t "$SESSION_NAME:0.1" -c "/mnt/e/ServiceGrid"
print_info "Pane 3 作成完了"

# Pane 4作成（Pane 2を垂直分割）
tmux split-window -v -t "$SESSION_NAME:0.2" -c "/mnt/e/ServiceGrid"
print_info "Pane 4 作成完了"

# ペイン数確認
pane_count=$(tmux list-panes -t "$SESSION_NAME:0" | wc -l)
print_info "作成されたペイン数: $pane_count"

if [ "$pane_count" -eq 5 ]; then
    print_success "5ペイン作成成功！"
else
    print_error "ペイン作成失敗: ${pane_count}ペインのみ"
    exit 1
fi

# 各ペインの情報設定
print_info "各ペインの初期設定..."

declare -A features=(
    [0]="🎨 Feature-B (UI/テスト)"
    [1]="🔧 Feature-C (API開発)"
    [2]="💻 Feature-D (PowerShell)"
    [3]="🔒 Feature-E (非機能要件)"
    [4]="🎯 Feature-A (統合リーダー)"
)

for pane_id in "${!features[@]}"; do
    feature="${features[$pane_id]}"
    tmux send-keys -t "$SESSION_NAME:0.$pane_id" "clear" C-m
    tmux send-keys -t "$SESSION_NAME:0.$pane_id" "echo '$feature'" C-m
    tmux send-keys -t "$SESSION_NAME:0.$pane_id" "echo '================================'" C-m
    tmux send-keys -t "$SESSION_NAME:0.$pane_id" "echo 'Pane $pane_id: Claude起動準備完了'" C-m
    tmux send-keys -t "$SESSION_NAME:0.$pane_id" "echo ''" C-m
    tmux send-keys -t "$SESSION_NAME:0.$pane_id" "cd /mnt/e/ServiceGrid" C-m
    print_info "Pane $pane_id: $feature 設定完了"
done

print_success "全ペイン設定完了！"

echo ""
echo "🎯 最終ペイン構成:"
echo "  実際のペイン配置:"
tmux list-panes -t "$SESSION_NAME:0" -F '    Pane #P: #{pane_width}x#{pane_height} at (#{pane_left},#{pane_top}) - #{pane_title}'

echo ""
echo "⌨️ ペイン操作:"
echo "  Ctrl+b + 0: 🎨 Feature-B (UI/テスト)"
echo "  Ctrl+b + 1: 🔧 Feature-C (API開発)"
echo "  Ctrl+b + 2: 💻 Feature-D (PowerShell)"  
echo "  Ctrl+b + 3: 🔒 Feature-E (非機能要件)"
echo "  Ctrl+b + 4: 🎯 Feature-A (統合リーダー)"
echo ""
echo "🚀 セッション接続:"
echo "  tmux attach-session -t $SESSION_NAME"
echo ""
echo "💡 各ペインでClaudeを起動:"
echo "  claude"
echo ""