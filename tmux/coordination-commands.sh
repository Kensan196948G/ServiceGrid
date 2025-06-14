#!/bin/bash

# Feature-A → B,C,D,E 連携メカニズム構築

print_info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

SESSION_NAME="itsm-dev-4pane"

print_info "Feature-A連携メカニズムを構築中..."

# 連携用スクリプト作成
mkdir -p /mnt/e/ServiceGrid/tmux/coordination

# Feature-A → 全ペイン指示送信スクリプト
cat > /mnt/e/ServiceGrid/tmux/coordination/send-to-all.sh << 'EOF'
#!/bin/bash
# Feature-A統合リーダーから全ペインに指示送信

SESSION="itsm-dev-4pane"
INSTRUCTION="$1"

if [ -z "$INSTRUCTION" ]; then
    echo "使用方法: $0 '指示内容'"
    echo "例: $0 '新機能開発を開始してください'"
    exit 1
fi

echo "🎯 Feature-A統合指示を全ペインに送信中..."
echo "指示内容: $INSTRUCTION"

# 各ペインに指示送信
tmux send-keys -t "$SESSION:0" "echo 'Feature-A統合指示: $INSTRUCTION'" C-m
tmux send-keys -t "$SESSION:0.3" "echo 'Feature-A統合指示: $INSTRUCTION'" C-m  
tmux send-keys -t "$SESSION:0.1" "echo 'Feature-A統合指示: $INSTRUCTION'" C-m
tmux send-keys -t "$SESSION:0.2" "echo 'Feature-A統合指示: $INSTRUCTION'" C-m

echo "✅ 全ペインに指示送信完了"
EOF

# Feature-B専用指示送信
cat > /mnt/e/ServiceGrid/tmux/coordination/send-to-feature-b.sh << 'EOF'
#!/bin/bash
# Feature-A → Feature-B (UI/テスト) 指示送信

SESSION="itsm-dev-4pane"
INSTRUCTION="$1"

if [ -z "$INSTRUCTION" ]; then
    echo "使用方法: $0 'UI/テスト指示'"
    echo "例: $0 'Reactコンポーネントのテストを実行してください'"
    exit 1
fi

echo "🎨 Feature-B (UI/テスト) に指示送信中..."
tmux send-keys -t "$SESSION:0" "echo '🎯➡️🎨 Feature-A→B指示: $INSTRUCTION'" C-m
echo "✅ Feature-B指示送信完了"
EOF

# Feature-C専用指示送信
cat > /mnt/e/ServiceGrid/tmux/coordination/send-to-feature-c.sh << 'EOF'  
#!/bin/bash
# Feature-A → Feature-C (API開発) 指示送信

SESSION="itsm-dev-4pane"
INSTRUCTION="$1"

if [ -z "$INSTRUCTION" ]; then
    echo "使用方法: $0 'API開発指示'"
    echo "例: $0 'REST APIエンドポイントを実装してください'"
    exit 1
fi

echo "🔧 Feature-C (API開発) に指示送信中..."
tmux send-keys -t "$SESSION:0.3" "echo '🎯➡️🔧 Feature-A→C指示: $INSTRUCTION'" C-m
echo "✅ Feature-C指示送信完了"
EOF

# Feature-D専用指示送信
cat > /mnt/e/ServiceGrid/tmux/coordination/send-to-feature-d.sh << 'EOF'
#!/bin/bash
# Feature-A → Feature-D (PowerShell) 指示送信

SESSION="itsm-dev-4pane"
INSTRUCTION="$1"

if [ -z "$INSTRUCTION" ]; then
    echo "使用方法: $0 'PowerShell指示'"
    echo "例: $0 'PowerShellスクリプトをテストしてください'"
    exit 1
fi

echo "💻 Feature-D (PowerShell) に指示送信中..."
tmux send-keys -t "$SESSION:0.1" "echo '🎯➡️💻 Feature-A→D指示: $INSTRUCTION'" C-m
echo "✅ Feature-D指示送信完了"
EOF

# Feature-E専用指示送信
cat > /mnt/e/ServiceGrid/tmux/coordination/send-to-feature-e.sh << 'EOF'
#!/bin/bash
# Feature-A → Feature-E (非機能要件) 指示送信

SESSION="itsm-dev-4pane"
INSTRUCTION="$1"

if [ -z "$INSTRUCTION" ]; then
    echo "使用方法: $0 '非機能要件指示'"
    echo "例: $0 'セキュリティテストを実行してください'"
    exit 1
fi

echo "🔒 Feature-E (非機能要件) に指示送信中..."
tmux send-keys -t "$SESSION:0.2" "echo '🎯➡️🔒 Feature-A→E指示: $INSTRUCTION'" C-m
echo "✅ Feature-E指示送信完了"
EOF

# 全スクリプトに実行権限付与
chmod +x /mnt/e/ServiceGrid/tmux/coordination/*.sh

# 統合連携スクリプト
cat > /mnt/e/ServiceGrid/tmux/coordination/integration-demo.sh << 'EOF'
#!/bin/bash
# Feature-A統合リーダー連携デモ

SESSION="itsm-dev-4pane"

echo "🎯 Feature-A統合リーダー連携デモ開始"
echo "========================================"

echo "1. 全ペインに開発開始指示..."
sleep 2
./send-to-all.sh "新機能「ユーザーダッシュボード」開発を開始してください"

echo ""
echo "2. 各Feature専門指示..."
sleep 2

echo "  Feature-B (UI/テスト) への指示..."
./send-to-feature-b.sh "ユーザーダッシュボードのReactコンポーネントを設計・実装してください"

sleep 1
echo "  Feature-C (API開発) への指示..."
./send-to-feature-c.sh "ダッシュボード用のデータ取得APIエンドポイントを実装してください"

sleep 1  
echo "  Feature-D (PowerShell) への指示..."
./send-to-feature-d.sh "Windows環境でのダッシュボードデータ収集スクリプトを作成してください"

sleep 1
echo "  Feature-E (非機能要件) への指示..."
./send-to-feature-e.sh "ダッシュボード機能のセキュリティ・パフォーマンステストを実施してください"

echo ""
echo "✅ Feature-A統合リーダー連携デモ完了"
echo "各ペインで作業が開始されました！"
EOF

chmod +x /mnt/e/ServiceGrid/tmux/coordination/integration-demo.sh

print_success "Feature-A連携メカニズム構築完了！"

echo ""
echo "🎯 Feature-A → B,C,D,E 連携メカニズム:"
echo ""
echo "  📁 連携スクリプト:"
echo "    tmux/coordination/send-to-all.sh: 全ペイン同時指示"
echo "    tmux/coordination/send-to-feature-b.sh: Feature-B専用指示"
echo "    tmux/coordination/send-to-feature-c.sh: Feature-C専用指示"
echo "    tmux/coordination/send-to-feature-d.sh: Feature-D専用指示"
echo "    tmux/coordination/send-to-feature-e.sh: Feature-E専用指示"
echo "    tmux/coordination/integration-demo.sh: 連携デモ"
echo ""
echo "  🚀 使用例:"
echo "    cd /mnt/e/ServiceGrid/tmux/coordination"
echo "    ./send-to-all.sh '品質チェックを実行してください'"
echo "    ./send-to-feature-b.sh 'UIテストを実行してください'"
echo "    ./integration-demo.sh  # 連携デモ実行"
echo ""
echo "  ⌨️ VSCodeからの操作:"
echo "    Ctrl+Shift+P → 'Tasks: Run Task' → 各Feature指示送信"
echo ""
echo "✅ 統合連携メカニズム完成！"
echo ""