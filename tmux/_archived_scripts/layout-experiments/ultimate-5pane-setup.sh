#!/bin/bash

# 確実に動作する5ペイン3段構成作成スクリプト

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

# 既存セッション削除
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
sleep 1

print_info "最終版: 確実な5ペイン作成開始..."

# セッション作成（Pane 0）
tmux new-session -d -s "$SESSION_NAME" -c "/mnt/e/ServiceGrid"
print_info "✅ Pane 0 作成"

# 順次ペイン作成
tmux split-window -h -t "$SESSION_NAME" -c "/mnt/e/ServiceGrid"
print_info "✅ Pane 1 作成"

tmux split-window -v -t "$SESSION_NAME:0" -c "/mnt/e/ServiceGrid"  
print_info "✅ Pane 2 作成"

tmux split-window -v -t "$SESSION_NAME:1" -c "/mnt/e/ServiceGrid"
print_info "✅ Pane 3 作成"

tmux split-window -v -t "$SESSION_NAME:2" -c "/mnt/e/ServiceGrid"
print_info "✅ Pane 4 作成"

# ペイン数確認
pane_count=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
print_info "作成されたペイン数: $pane_count"

if [ "$pane_count" -ne 5 ]; then
    print_error "5ペイン作成失敗"
    exit 1
fi

print_success "5ペイン作成成功！"

# 各ペインの設定と自動Claude起動
print_info "各ペインの設定とClaude自動起動..."

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
    tmux send-keys -t "$SESSION_NAME:$pane_id" "echo 'Pane $pane_id 準備完了'" C-m
    
    # Claude自動起動
    tmux send-keys -t "$SESSION_NAME:$pane_id" "echo 'Claude起動中...'" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_id" "claude" C-m
    
    print_info "Pane $pane_id: $feature + Claude起動完了"
    sleep 1
done

print_success "全ペイン設定・Claude起動完了！"

echo ""
echo "🎯 最終構成 (5ペイン + Claude自動起動):"
echo ""
echo "  📋 ペイン配置:"
tmux list-panes -t "$SESSION_NAME" -F '    Pane #P: #{pane_width}x#{pane_height} at (#{pane_left},#{pane_top})'

echo ""
echo "  🎛️ ペイン機能:"
echo "    Pane 0: 🎨 Feature-B (UI/テスト) - Claude起動済"
echo "    Pane 1: 🔧 Feature-C (API開発) - Claude起動済"
echo "    Pane 2: 💻 Feature-D (PowerShell) - Claude起動済"
echo "    Pane 3: 🔒 Feature-E (非機能要件) - Claude起動済"
echo "    Pane 4: 🎯 Feature-A (統合リーダー) - Claude起動済"
echo ""
echo "⌨️ 操作方法:"
echo "  Ctrl+b + 0-4: 各ペインに移動"
echo "  Ctrl+b + q: ペイン番号表示"
echo "  Ctrl+b + z: ペインズーム"
echo ""
echo "🚀 接続:"
echo "  tmux attach-session -t $SESSION_NAME"
echo ""
echo "✨ 各ペインでClaudeが自動起動されています！"
echo "   そのまま使用開始できます。"
echo ""