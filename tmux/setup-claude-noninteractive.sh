#!/bin/bash

# 非対話型Claude Code環境設定

SESSION_NAME="itsm-requirement"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🤖 非対話型Claude Code環境設定中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

# Claude Code確認
if ! command -v claude &> /dev/null; then
    echo "❌ Claude Codeがインストールされていません"
    exit 1
fi

echo "✅ Claude Codeバージョン: $(claude --version)"

# 各ペイン設定
setup_panes() {
    local pane_configs=(
        "0:Feature-B-UI:フロントエンド開発:React・TypeScript・Jest・テスト自動化"
        "1:Feature-C-API:バックエンド開発:Node.js・Express・API・データベース"
        "2:Feature-D-PowerShell:PowerShell開発:Windows統合・PowerShellスクリプト"
        "3:Feature-E-NonFunc:非機能要件:セキュリティ・監視・SLA・ログ管理"
        "4:Feature-A-Leader:統合リーダー:アーキテクチャ・設計統一・プロジェクト管理"
    )
    
    for config in "${pane_configs[@]}"; do
        IFS=':' read -r pane_num feature_name description details <<< "$config"
        
        echo "  ペイン$pane_num: $feature_name 設定中..."
        
        # 基本環境設定
        tmux send-keys -t "$SESSION_NAME.$pane_num" "cd $PROJECT_ROOT" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "export PS1='[$feature_name] \\w$ '" C-m
        
        # .env読み込み
        if [ -f "$PROJECT_ROOT/.env" ]; then
            tmux send-keys -t "$SESSION_NAME.$pane_num" "source .env" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "export \$(cat .env | grep -v ^# | xargs)" C-m
        fi
        
        # ディレクトリ移動 (Feature-CとDはbackend)
        if [[ "$feature_name" == "Feature-C-API" || "$feature_name" == "Feature-D-PowerShell" ]]; then
            tmux send-keys -t "$SESSION_NAME.$pane_num" "cd backend" C-m
        fi
        
        # 表示
        tmux send-keys -t "$SESSION_NAME.$pane_num" "clear" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '✅ $feature_name 環境準備完了!'" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '📋 担当: $description'" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '🔧 技術: $details'" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo ''" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '🤖 Claude Code使用例:'" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  claude \"こんにちは、$description をお手伝いしてください\"'" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  claude \"現在のプロジェクト状況を確認してください\"'" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo ''" C-m
        
        # ペインタイトル設定
        tmux select-pane -t "$SESSION_NAME.$pane_num" -T "$feature_name"
        
        sleep 0.3
    done
}

# Claude Codeテスト実行
test_claude() {
    echo "🧪 Claude Code実行テスト中..."
    
    # 各ペインでテストメッセージ実行
    local test_messages=(
        "0:こんにちは！フロントエンド開発をお手伝いします。現在のReactプロジェクト構造を簡潔に確認してください。"
        "1:こんにちは！バックエンドAPI開発をお手伝いします。現在のAPIエンドポイントを確認してください。"
        "2:こんにちは！PowerShell開発をお手伝いします。現在のWindows統合状況を確認してください。"
        "3:こんにちは！非機能要件をお手伝いします。現在のセキュリティ設定を確認してください。"
        "4:こんにちは！統合リーダーとしてお手伝いします。プロジェクト全体の概要を確認してください。"
    )
    
    for test_msg in "${test_messages[@]}"; do
        IFS=':' read -r pane_num message <<< "$test_msg"
        
        echo "  ペイン$pane_num でClaude実行中..."
        tmux send-keys -t "$SESSION_NAME.$pane_num" "claude \"$message\"" C-m
        
        sleep 2  # Claude実行間隔
    done
}

# 引数に応じて実行
case "${1:-setup}" in
    setup|prepare)
        setup_panes
        echo ""
        echo "✅ 非対話型Claude Code環境設定完了！"
        echo "🧪 Claude Codeテスト実行: $0 test"
        ;;
    test)
        test_claude
        echo ""
        echo "✅ Claude Codeテスト実行完了！"
        echo "📋 各ペインの結果を確認してください"
        ;;
    both|all)
        setup_panes
        echo ""
        sleep 2
        test_claude
        echo ""
        echo "🎉 非対話型Claude Code完全セットアップ完了！"
        ;;
    *)
        echo "使用方法: $0 [setup|test|both]"
        echo "  setup : 非対話型Claude Code環境設定"
        echo "  test  : Claude Codeコマンドテスト実行"
        echo "  both  : 環境設定 + テスト実行"
        ;;
esac