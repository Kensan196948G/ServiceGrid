#!/bin/bash

# Feature-A-Leader（ペイン4）に統合リーダー機能を設定

SESSION_NAME="itsm-requirement"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🎯 Feature-A-Leader ペイン設定中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

# Feature-A-Leaderペイン設定
setup_leader_pane() {
    echo "🎯 統合リーダー環境設定中..."
    
    # 基本環境設定
    tmux send-keys -t "$SESSION_NAME.4" "cd $PROJECT_ROOT/tmux" C-m
    tmux send-keys -t "$SESSION_NAME.4" "export PS1='[Feature-A-Leader] \\w$ '" C-m
    tmux send-keys -t "$SESSION_NAME.4" "export TMUX_DIR=$PROJECT_ROOT/tmux" C-m
    
    # .env読み込み
    if [ -f "$PROJECT_ROOT/.env" ]; then
        tmux send-keys -t "$SESSION_NAME.4" "source ../env" C-m
        tmux send-keys -t "$SESSION_NAME.4" "export \$(cat ../.env | grep -v ^# | xargs)" C-m
    fi
    
    # 便利エイリアス設定（絶対パス）
    tmux send-keys -t "$SESSION_NAME.4" "alias leader='$PROJECT_ROOT/tmux/coordination/leader-command.sh'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "alias send-all='$PROJECT_ROOT/tmux/coordination/send-to-all-fixed.sh'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "alias demo='$PROJECT_ROOT/tmux/coordination/integration-demo.sh'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "alias check='$PROJECT_ROOT/tmux/coordination/leader-command.sh status'" C-m
    
    # 画面表示
    tmux send-keys -t "$SESSION_NAME.4" "clear" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '🎯 Feature-A統合リーダー 制御センター'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '=========================================='" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo ''" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '📋 統合リーダー専用コマンド:'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '  leader all \"メッセージ\"     - 全ペインに指示'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '  leader ui \"メッセージ\"      - Feature-B (UI) に指示'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '  leader api \"メッセージ\"     - Feature-C (API) に指示'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '  leader ps \"メッセージ\"      - Feature-D (PowerShell) に指示'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '  leader sec \"メッセージ\"     - Feature-E (非機能要件) に指示'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '  leader demo               - 連携デモ実行'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '  leader status             - 各ペイン状況確認'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo ''" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '🤖 Claude Code統合指示例:'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '  leader all \"プロジェクト全体の進捗を報告してください\"'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '  send-all --files \"package.json,README.md\" \"プロジェクト概要確認\"'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo ''" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '🔧 Claude Code統合リーダー機能:'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '  claude \"プロジェクト全体のアーキテクチャを確認してください\"'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo ''" C-m
    
    # ペインタイトル設定
    tmux select-pane -t "$SESSION_NAME.4" -T "Feature-A-Leader"
}

# 連携テスト実行
test_coordination() {
    echo "🧪 Feature-A連携機能テスト実行中..."
    
    echo "  1. ペイン状況確認テスト..."
    tmux send-keys -t "$SESSION_NAME.4" "leader status" C-m
    
    sleep 2
    
    echo "  2. 簡単な連携テスト..."
    tmux send-keys -t "$SESSION_NAME.4" "leader all 'Feature-A統合リーダーからの連携テストです。簡潔に応答してください。'" C-m
    
    sleep 2
    
    echo "  3. 個別指示テスト..."
    tmux send-keys -t "$SESSION_NAME.4" "leader ui 'UI開発の現在の状況を教えてください'" C-m
}

# 引数に応じて実行
case "${1:-setup}" in
    setup|init)
        setup_leader_pane
        echo ""
        echo "✅ Feature-A-Leader統合リーダー設定完了！"
        echo "🧪 連携機能テスト実行: $0 test"
        ;;
    test)
        test_coordination
        echo ""
        echo "✅ Feature-A連携機能テスト実行完了！"
        echo "📋 各ペインの結果を確認してください"
        ;;
    both)
        setup_leader_pane
        sleep 2
        test_coordination
        echo ""
        echo "🎉 Feature-A統合リーダー完全セットアップ完了！"
        ;;
    *)
        echo "使用方法: $0 [setup|test|both]"
        echo "  setup : Feature-A-Leader統合リーダー機能設定"
        echo "  test  : 連携機能テスト実行"
        echo "  both  : 設定 + テスト実行"
        ;;
esac