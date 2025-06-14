#!/bin/bash

# 完璧な3段構成を実現するスクリプト

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

print_info "完璧な3段構成を作成中..."

# 既存セッション削除
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
sleep 1

# 新しいセッション作成
tmux new-session -d -s "$SESSION_NAME" -c "/mnt/e/ServiceGrid"

# 3段構成の作成手順
print_info "1段目: 左右分割（Pane 0, 1）"
tmux split-window -h -t "$SESSION_NAME:0" -c "/mnt/e/ServiceGrid"

print_info "2段目を作成: 下部に分割領域を作成"  
tmux split-window -v -t "$SESSION_NAME:0" -c "/mnt/e/ServiceGrid"  # Pane 2
tmux split-window -h -t "$SESSION_NAME:2" -c "/mnt/e/ServiceGrid"  # Pane 3

print_info "3段目を作成: 最下部にフル幅"
tmux split-window -v -t "$SESSION_NAME:2" -c "/mnt/e/ServiceGrid"  # Pane 4

# レイアウト微調整
print_info "レイアウト調整中..."
tmux resize-pane -t "$SESSION_NAME:0" -U 5  # 1段目を上に
tmux resize-pane -t "$SESSION_NAME:1" -U 5  # 1段目を上に  
tmux resize-pane -t "$SESSION_NAME:4" -D 8  # 3段目を下に拡張

# ペイン確認
pane_count=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
print_info "作成されたペイン数: $pane_count"

# 各ペインの初期設定
print_info "各ペインの設定..."

declare -A pane_features=(
    [0]="🎨 Feature-B (UI/テスト)"
    [1]="🔧 Feature-C (API開発)"
    [2]="💻 Feature-D (PowerShell)"
    [3]="🔒 Feature-E (非機能要件)"
    [4]="🎯 Feature-A (統合リーダー)"
)

for pane_id in "${!pane_features[@]}"; do
    feature="${pane_features[$pane_id]}"
    tmux send-keys -t "$SESSION_NAME:$pane_id" "clear" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_id" "echo '$feature'" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_id" "echo '================================'" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_id" "echo 'Pane $pane_id: 準備完了'" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_id" "echo '>> claude でClaude起動 <<'" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_id" "echo ''" C-m
    print_info "Pane $pane_id: $feature 設定完了"
done

print_success "3段構成作成完了！"

echo ""
echo "🎯 作成されたペイン配置:"
echo "  ┌─────────────────────────────────────┐"
echo "  │ 1段目: Pane 0    │ Pane 1          │"
echo "  │ 🎨 Feature-B     │ 🔧 Feature-C   │"
echo "  │ (UI/テスト)      │ (API開発)       │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 2段目: Pane 2    │ Pane 3          │"
echo "  │ 💻 Feature-D     │ 🔒 Feature-E   │"
echo "  │ (PowerShell)     │ (非機能要件)    │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 3段目: Pane 4 (フル幅)              │"
echo "  │ 🎯 Feature-A (統合リーダー)        │"
echo "  └─────────────────────────────────────┘"
echo ""

# 実際の配置確認
print_info "実際のペイン配置確認:"
tmux list-panes -t "$SESSION_NAME" -F '  Pane #P: #{pane_width}x#{pane_height} at (#{pane_left},#{pane_top})'

echo ""
echo "🚀 接続方法:"
echo "  tmux attach-session -t $SESSION_NAME"
echo ""
echo "⌨️ ペイン切り替え:"
echo "  Ctrl+b + 0: 🎨 Feature-B"
echo "  Ctrl+b + 1: 🔧 Feature-C"
echo "  Ctrl+b + 2: 💻 Feature-D" 
echo "  Ctrl+b + 3: 🔒 Feature-E"
echo "  Ctrl+b + 4: 🎯 Feature-A"
echo ""
echo "💡 Claudeを全ペインで起動:"
echo "  各ペインで 'claude' コマンドを実行"
echo ""