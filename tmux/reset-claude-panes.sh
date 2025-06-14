#!/bin/bash

# Claude Codeセッションをリセットして非対話型実行に変更

SESSION_NAME="itsm-requirement"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🔄 Claude Codeペインリセット中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

# 各ペインでClaude Codeセッション終了
reset_panes() {
    local pane_indexes=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}"))
    
    echo "⏹️ 各ペインのClaude Code対話セッション終了中..."
    
    for i in "${!pane_indexes[@]}"; do
        local pane_num="${pane_indexes[$i]}"
        
        case $i in
            0) local feature_name="Feature-B-UI" ;;
            1) local feature_name="Feature-C-API" ;;
            2) local feature_name="Feature-D-PowerShell" ;;
            3) local feature_name="Feature-E-NonFunc" ;;
            4) local feature_name="Feature-A-Leader" ;;
        esac
        
        echo "  ペイン$pane_num ($feature_name) リセット中..."
        
        # Claude Code対話セッション強制終了
        tmux send-keys -t "$SESSION_NAME.$pane_num" C-c
        sleep 0.5
        tmux send-keys -t "$SESSION_NAME.$pane_num" C-c
        sleep 0.5
        tmux send-keys -t "$SESSION_NAME.$pane_num" "exit" C-m
        sleep 0.5
        
        # 新しいシェルセッション開始
        tmux send-keys -t "$SESSION_NAME.$pane_num" "bash" C-m
        sleep 0.5
        
        # 環境設定
        tmux send-keys -t "$SESSION_NAME.$pane_num" "cd $PROJECT_ROOT" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "export PS1='[$feature_name] \\w$ '" C-m
        
        # .env読み込み
        if [ -f "$PROJECT_ROOT/.env" ]; then
            tmux send-keys -t "$SESSION_NAME.$pane_num" "source .env" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "export \$(cat .env | grep -v ^# | xargs)" C-m
        fi
        
        # ペイン表示
        tmux send-keys -t "$SESSION_NAME.$pane_num" "clear" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '✅ $feature_name リセット完了!'" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '🤖 Claude Code使用例:'" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  claude \"こんにちは、開発をお手伝いしてください\"'" C-m
        tmux send-keys -t "$SESSION_NAME.$pane_num" "echo ''" C-m
        
        # ペインタイトル設定
        tmux select-pane -t "$SESSION_NAME.$pane_num" -T "$feature_name"
    done
}

# 非対話型Claudeテスト実行
test_claude_commands() {
    echo "🧪 非対話型Claude Codeテスト実行中..."
    
    # Feature-B-UIでテスト
    echo "  Feature-B-UI でClaude Codeテスト..."
    tmux send-keys -t "$SESSION_NAME.0" "claude 'こんにちは、フロントエンド開発アシスタントです。現在のプロジェクト構造を簡潔に確認してください。'" C-m
    
    sleep 3
    
    # Feature-C-APIでテスト
    echo "  Feature-C-API でClaude Codeテスト..."
    tmux send-keys -t "$SESSION_NAME.1" "cd backend && claude 'こんにちは、バックエンド開発アシスタントです。現在のAPIファイルを確認してください。'" C-m
    
    sleep 3
    
    # Feature-A-Leaderでテスト
    echo "  Feature-A-Leader でClaude Codeテスト..."
    tmux send-keys -t "$SESSION_NAME.4" "claude 'こんにちは、統合リーダーアシスタントです。プロジェクトの概要を確認してください。'" C-m
}

# 引数に応じて実行
case "${1:-reset}" in
    reset|fix)
        reset_panes
        echo ""
        echo "✅ 全ペインリセット完了！"
        echo "🧪 Claude Codeテスト実行: $0 test"
        ;;
    test)
        test_claude_commands
        echo ""
        echo "✅ Claude Codeテスト実行完了！"
        echo "📋 各ペインの結果を確認してください"
        ;;
    both)
        reset_panes
        sleep 2
        test_claude_commands
        echo ""
        echo "🎉 ペインリセット + Claude Codeテスト完了！"
        ;;
    *)
        echo "使用方法: $0 [reset|test|both]"
        echo "  reset : 各ペインをリセットして非対話型Claude環境に変更"
        echo "  test  : 非対話型Claude Codeコマンドテスト実行"
        echo "  both  : リセット + テスト実行"
        ;;
esac