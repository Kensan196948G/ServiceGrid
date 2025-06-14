#!/bin/bash

# 正確な3段構成レイアウト作成スクリプト

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

print_info "正確な3段構成tmuxレイアウトを作成中..."

# 既存セッション削除
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# 新しいセッション作成
tmux new-session -d -s "$SESSION_NAME" -c "/mnt/e/ServiceGrid"

print_info "3段構成を段階的に作成中..."

# ステップ1: 1段目を2つに分割（Pane 0, 1）
tmux split-window -h -t "$SESSION_NAME:0" -c "/mnt/e/ServiceGrid"

# ステップ2: 下部エリアを作成（Pane 2）
tmux split-window -v -t "$SESSION_NAME:0" -c "/mnt/e/ServiceGrid"

# ステップ3: 右下部エリアを作成（Pane 3）
tmux split-window -v -t "$SESSION_NAME:1" -c "/mnt/e/ServiceGrid"

# ステップ4: 最下部フル幅エリアを作成（Pane 4）
tmux split-window -v -t "$SESSION_NAME:2" -c "/mnt/e/ServiceGrid"

# レイアウト調整
tmux select-layout -t "$SESSION_NAME" tiled
tmux resize-pane -t "$SESSION_NAME:4" -y 8

# 各ペインの設定
print_info "各ペインの初期設定中..."

declare -A pane_info=(
    [0]="🎨 Feature-B:UI/テスト"
    [1]="🔧 Feature-C:API開発"  
    [2]="💻 Feature-D:PowerShell"
    [3]="🔒 Feature-E:非機能要件"
    [4]="🎯 Feature-A:統合リーダー"
)

for pane_num in "${!pane_info[@]}"; do
    info="${pane_info[$pane_num]}"
    tmux send-keys -t "$SESSION_NAME:$pane_num" "clear" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_num" "echo '$info'" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_num" "echo '================================'" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_num" "echo 'ペイン$pane_num: Claude準備完了'" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_num" "echo 'claudeコマンドで起動可能'" C-m
    tmux send-keys -t "$SESSION_NAME:$pane_num" "echo ''" C-m
done

print_success "3段構成レイアウト作成完了！"

echo ""
echo "🎯 作成されたペイン配置:"
echo "  ┌─────────────────────────────────────┐"
echo "  │ 1段目                               │"
echo "  │ 0:Feature-B │ 1:Feature-C           │"
echo "  │ UI/テスト   │ API開発               │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 2段目                               │"
echo "  │ 2:Feature-D │ 3:Feature-E           │"
echo "  │ PowerShell  │ 非機能要件            │"
echo "  ├─────────────────────────────────────┤"
echo "  │ 3段目 (フル幅)                      │"
echo "  │ 4:Feature-A (統合リーダー)          │"
echo "  └─────────────────────────────────────┘"
echo ""

# レイアウト確認
print_info "実際のペイン配置:"
tmux list-panes -t "$SESSION_NAME" -F '  Pane #P: #{pane_width}x#{pane_height} at #{pane_left},#{pane_top}'

echo ""
echo "🚀 接続: tmux attach-session -t $SESSION_NAME"