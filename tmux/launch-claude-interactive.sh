#!/bin/bash

# 各ペインでClaude Codeを対話的に起動するスクリプト

SESSION_NAME="itsm-requirement"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🤖 Claude Code対話的起動スクリプト"

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

# Claude Code確認
if ! command -v claude &> /dev/null; then
    echo "❌ Claude Codeがインストールされていません"
    echo "💡 インストール方法:"
    echo "   npm install -g @anthropic-ai/claude-code"
    echo "   または"
    echo "   pip install claude-code"
    exit 1
fi

# 各ペインでClaude Code準備
prepare_claude_environment() {
    local pane_indexes=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}"))
    
    echo "🔧 各ペインでClaude Code環境準備中..."
    
    for i in "${!pane_indexes[@]}"; do
        local pane_num="${pane_indexes[$i]}"
        
        case $i in
            0) 
                local feature_name="Feature-B-UI"
                local prompt_msg="フロントエンド開発アシスタントです。React、TypeScript、テストについてお手伝いします。"
                ;;
            1) 
                local feature_name="Feature-C-API"
                local prompt_msg="バックエンドAPI開発アシスタントです。Node.js、Express、データベースについてお手伝いします。"
                ;;
            2) 
                local feature_name="Feature-D-PowerShell"
                local prompt_msg="PowerShell開発アシスタントです。Windows API、システム統合についてお手伝いします。"
                ;;
            3) 
                local feature_name="Feature-E-NonFunc"
                local prompt_msg="非機能要件アシスタントです。セキュリティ、監視、SLAについてお手伝いします。"
                ;;
            4) 
                local feature_name="Feature-A-Leader"
                local prompt_msg="統合リーダーアシスタントです。アーキテクチャ、設計統一、プロジェクト管理についてお手伝いします。"
                ;;
        esac
        
        echo "  ペイン$pane_num: $feature_name 設定中..."
        
        # 環境変数設定
        tmux send-keys -t "$SESSION_NAME.$pane_num" "cd $PROJECT_ROOT" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "export PS1='[$feature_name] \\w$ '" C-m
        
        # .env読み込み
        if [ -f "$PROJECT_ROOT/.env" ]; then
            tmux send-keys -t "$SESSION_NAME.$pane_num" "source .env" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "export \$(cat .env | grep -v ^# | xargs)" C-m
        fi
        
        # Claude Code準備完了メッセージ
        tmux send-keys -t "$SESSION_NAME.$pane_num" "clear" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '✅ $feature_name Claude Code準備完了!'" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '$prompt_msg'" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo ''" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '🚀 Claude Code起動方法:'" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  claude \"こんにちは、開発をお手伝いしてください\"'" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  claude \"プロジェクトの状況を確認してください\"'" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo ''" C-m
        
        # ペインタイトル設定
        tmux select-pane -t "$SESSION_NAME.$pane_num" -T "$feature_name"
        
        sleep 0.3
    done
}

# ウェルカムメッセージでClaude Codeを起動
start_welcome_claude() {
    local pane_indexes=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}"))
    
    echo "👋 各ペインでClaude Codeウェルカムメッセージ実行中..."
    
    for i in "${!pane_indexes[@]}"; do
        local pane_num="${pane_indexes[$i]}"
        
        case $i in
            0) local welcome_msg="こんにちは！フロントエンド開発をお手伝いします。現在のプロジェクト構造を確認してください。" ;;
            1) local welcome_msg="こんにちは！バックエンドAPI開発をお手伝いします。現在のAPIエンドポイントを確認してください。" ;;
            2) local welcome_msg="こんにちは！PowerShell開発をお手伝いします。現在のWindows統合状況を確認してください。" ;;
            3) local welcome_msg="こんにちは！非機能要件をお手伝いします。セキュリティ設定を確認してください。" ;;
            4) local welcome_msg="こんにちは！統合リーダーとしてお手伝いします。プロジェクト全体の状況を確認してください。" ;;
        esac
        
        # Claude Codeでウェルカムメッセージ実行
        tmux send-keys -t "$SESSION_NAME.$pane_num" "claude \"$welcome_msg\"" C-m
        
        sleep 2  # Claude Code実行間隔
    done
}

# 引数に応じて実行
case "${1:-prepare}" in
    prepare|setup)
        prepare_claude_environment
        echo ""
        echo "✅ 全ペインでClaude Code環境準備完了！"
        echo "💡 各ペインで 'claude \"メッセージ\"' コマンドが使用可能です"
        echo ""
        echo "🚀 ウェルカムメッセージ実行: $0 welcome"
        ;;
    welcome|start)
        start_welcome_claude
        echo ""
        echo "✅ 全ペインでClaude Codeウェルカムメッセージ実行完了！"
        ;;
    both|all)
        prepare_claude_environment
        echo ""
        sleep 2
        start_welcome_claude
        echo ""
        echo "🎉 Claude Code完全起動完了！各ペインでAIアシスタントが動作中です"
        ;;
    *)
        echo "使用方法: $0 [prepare|welcome|both]"
        echo "  prepare : Claude Code環境準備のみ"
        echo "  welcome : ウェルカムメッセージでClaude Code実行"
        echo "  both    : 環境準備 + ウェルカムメッセージ実行"
        ;;
esac