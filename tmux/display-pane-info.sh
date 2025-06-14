#!/bin/bash

# 各ペインにFeature情報を表示

SESSION_NAME="itsm-dev"

print_info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_info "各ペインにFeature情報を表示中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

# Pane 0: Feature-B (UI/テスト)
print_info "Pane 0: Feature-B情報を表示中..."
tmux send-keys -t "$SESSION_NAME:0.0" "clear" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo '0:claude:🎨 Feature-B (UI/テスト)'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo '================================'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'React・TypeScript・Jest・ESLint'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'UI/UXテスト自動化担当'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo '統合リーダーからの指示待機中...'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo ''" C-m

# Pane 1: Feature-C (API開発)  
print_info "Pane 1: Feature-C情報を表示中..."
tmux send-keys -t "$SESSION_NAME:0.1" "clear" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo '1:claude:🔧 Feature-C (API開発)'" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo '================================'" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo 'Node.js・Express・REST API'" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo 'バックエンドAPI開発担当'" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo '統合リーダーからの指示待機中...'" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo ''" C-m

# Pane 2: Feature-D (PowerShell)
print_info "Pane 2: Feature-D情報を表示中..."
tmux send-keys -t "$SESSION_NAME:0.2" "clear" C-m
tmux send-keys -t "$SESSION_NAME:0.2" "echo '2:claude:💻 Feature-D (PowerShell)'" C-m
tmux send-keys -t "$SESSION_NAME:0.2" "echo '================================'" C-m
tmux send-keys -t "$SESSION_NAME:0.2" "echo 'PowerShell・Windows統合・スクリプト'" C-m
tmux send-keys -t "$SESSION_NAME:0.2" "echo 'Windows環境統合担当'" C-m
tmux send-keys -t "$SESSION_NAME:0.2" "echo '統合リーダーからの指示待機中...'" C-m
tmux send-keys -t "$SESSION_NAME:0.2" "echo ''" C-m

# Pane 3: Feature-E (非機能要件)
print_info "Pane 3: Feature-E情報を表示中..."
tmux send-keys -t "$SESSION_NAME:0.3" "clear" C-m
tmux send-keys -t "$SESSION_NAME:0.3" "echo '3:claude:🔒 Feature-E (非機能要件)'" C-m
tmux send-keys -t "$SESSION_NAME:0.3" "echo '================================'" C-m
tmux send-keys -t "$SESSION_NAME:0.3" "echo 'セキュリティ・パフォーマンス・監視'" C-m
tmux send-keys -t "$SESSION_NAME:0.3" "echo '非機能要件検証担当'" C-m
tmux send-keys -t "$SESSION_NAME:0.3" "echo '統合リーダーからの指示待機中...'" C-m
tmux send-keys -t "$SESSION_NAME:0.3" "echo ''" C-m

print_success "全ペインにFeature情報表示完了！"

echo ""
echo "🎯 表示されたペイン情報:"
echo "  Pane 0: 🎨 Feature-B (UI/テスト)"
echo "  Pane 1: 🔧 Feature-C (API開発)"
echo "  Pane 2: 💻 Feature-D (PowerShell)"
echo "  Pane 3: 🔒 Feature-E (非機能要件)"
echo ""
echo "🚀 CLI確認:"
echo "  tmux attach-session -t $SESSION_NAME"
echo ""
echo "✅ 各ペインでFeature識別情報が表示されました！"
echo ""