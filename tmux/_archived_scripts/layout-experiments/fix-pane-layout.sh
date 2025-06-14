#!/bin/bash

# ペイン配置修正スクリプト - 正確な3段構成を実現

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

print_info "tmuxペイン配置を3段構成に修正中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    print_error "セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

# 現在のペイン数確認
pane_count=$(tmux list-panes -t "$SESSION_NAME:0" | wc -l)
print_info "現在のペイン数: $pane_count"

if [ "$pane_count" -ne 5 ]; then
    print_error "5ペインが必要ですが、${pane_count}ペインしかありません"
    exit 1
fi

# 既存セッションを削除して新規作成
print_info "既存セッションを削除して正しい配置で再作成中..."
tmux kill-session -t "$SESSION_NAME"

# 新しいセッション作成
tmux new-session -d -s "$SESSION_NAME" -c "/mnt/e/ServiceGrid"

# 正確な3段構成を作成
print_info "3段構成を作成中..."

# 1段目: 横分割でPeane 0, 1
tmux split-window -h -t "$SESSION_NAME:0" -c "/mnt/e/ServiceGrid"

# 2段目: Pane 0を縦分割してPane 2を作成
tmux split-window -v -t "$SESSION_NAME:0.0" -c "/mnt/e/ServiceGrid"

# 2段目: Pane 1を縦分割してPane 3を作成
tmux split-window -v -t "$SESSION_NAME:0.1" -c "/mnt/e/ServiceGrid"

# 3段目: Pane 2を縦分割してPane 4を作成（フル幅）
tmux split-window -v -t "$SESSION_NAME:0.2" -c "/mnt/e/ServiceGrid"

# ペインサイズ調整
tmux resize-pane -t "$SESSION_NAME:0.4" -x 100 -y 15

# 各ペインにFeature情報設定
print_info "各ペインにFeature情報を設定中..."

pane_configs=(
    "0:Feature-B:UI/テスト:🎨"
    "1:Feature-C:API開発:🔧"
    "2:Feature-D:PowerShell:💻"
    "3:Feature-E:非機能要件:🔒"
    "4:Feature-A:統合リーダー:🎯"
)

for config in "${pane_configs[@]}"; do
    IFS=':' read -r pane_num feature_name description emoji <<< "$config"
    
    tmux send-keys -t "$SESSION_NAME:0.$pane_num" "clear" C-m
    tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo '${emoji} ${feature_name}: ${description}'" C-m
    tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo '================================'" C-m
    tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo 'ペイン$pane_num: Claude起動準備完了'" C-m
    tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo 'claude コマンドでClaude起動可能'" C-m
    tmux send-keys -t "$SESSION_NAME:0.$pane_num" "echo ''" C-m
done

print_success "3段ペイン構成修正完了！"

echo ""
echo "🎯 修正後のペイン配置:"
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
echo "⌨️ ペイン操作:"
echo "  Ctrl+b + 0: 🎨 Feature-B (UI/テスト)"
echo "  Ctrl+b + 1: 🔧 Feature-C (API開発)"
echo "  Ctrl+b + 2: 💻 Feature-D (PowerShell)"
echo "  Ctrl+b + 3: 🔒 Feature-E (非機能要件)"
echo "  Ctrl+b + 4: 🎯 Feature-A (統合リーダー)"
echo ""
echo "🚀 セッション接続: tmux attach-session -t $SESSION_NAME"