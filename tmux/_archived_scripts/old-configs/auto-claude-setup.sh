#!/bin/bash

# 全ペインでClaude Code自動起動設定スクリプト

SESSION_NAME="itsm-dev"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🚀 全ペインでClaude Code自動起動設定中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

echo "📋 現在のペイン構成確認:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: Y#{pane_top} 段#{?#{<:#{pane_top},10},1,#{?#{<:#{pane_top},20},2,3}} - #{pane_title}"

echo ""
echo "🔧 環境変数とClaude Code設定中..."

# 各ペインでClaude Code環境を設定
PANE_CONFIGS=(
    "1:Feature-B:UI/テスト:$PROJECT_ROOT"
    "2:Feature-C:API開発:$PROJECT_ROOT/backend"
    "3:Feature-D:PowerShell:$PROJECT_ROOT/backend"
    "4:Feature-E:非機能要件:$PROJECT_ROOT"
    "5:Feature-A:統合リーダー:$PROJECT_ROOT"
)

for config in "${PANE_CONFIGS[@]}"; do
    IFS=':' read -r pane_num feature_name feature_desc work_dir <<< "$config"
    
    echo "  🔧 ペイン$pane_num ($feature_name) 設定中..."
    
    # 作業ディレクトリに移動
    tmux send-keys -t "$SESSION_NAME.$pane_num" "cd $work_dir" C-m
    
    # 環境変数読み込み
    tmux send-keys -t "$SESSION_NAME.$pane_num" "source $PROJECT_ROOT/.env" C-m
    tmux send-keys -t "$SESSION_NAME.$pane_num" "export \$(cat $PROJECT_ROOT/.env | grep -v ^# | xargs)" C-m
    
    # Claude Code設定確認
    tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '🔍 Claude Code設定確認:'" C-m
    tmux send-keys -t "$SESSION_NAME.$pane_num" "echo \"  ANTHROPIC_API_KEY: \${ANTHROPIC_API_KEY:0:20}...\"" C-m
    tmux send-keys -t "$SESSION_NAME.$pane_num" "echo \"  ANTHROPIC_MODEL: \$ANTHROPIC_MODEL\"" C-m
    
    # Claude Code動作テスト
    tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '🧪 Claude Code動作テスト...'" C-m
    tmux send-keys -t "$SESSION_NAME.$pane_num" "claude --version 2>/dev/null || echo '⚠️ Claude Codeがインストールされていません'" C-m
    
    # ペイン固有の設定
    case $pane_num in
        1)
            # Feature-B: UI/テスト
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '🎨 Feature-B: UI/テスト環境準備完了'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '💡 利用可能コマンド:'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  npm run dev     # フロントエンド開発サーバー'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  npm test        # テスト実行'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  claude \"UI改善を提案して\"'" C-m
            ;;
        2)
            # Feature-C: API開発
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '🔧 Feature-C: API開発環境準備完了'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '💡 利用可能コマンド:'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  npm start       # バックエンドサーバー'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  node scripts/init-database.js'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  claude \"API設計をレビューして\"'" C-m
            ;;
        3)
            # Feature-D: PowerShell
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '💻 Feature-D: PowerShell環境準備完了'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '💡 利用可能コマンド:'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  pwsh            # PowerShell起動'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  ls api/*.ps1    # PowerShell API確認'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  claude \"PowerShell統合を支援して\"'" C-m
            ;;
        4)
            # Feature-E: 非機能要件
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '🔒 Feature-E: 非機能要件環境準備完了'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '💡 利用可能コマンド:'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  npm run lint    # コード品質チェック'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  npm run typecheck # 型チェック'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  claude \"セキュリティ監査をして\"'" C-m
            ;;
        5)
            # Feature-A: 統合リーダー
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '🎯 Feature-A: 統合リーダー環境準備完了'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '💡 利用可能コマンド:'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  ./start-all.sh  # 全体起動'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  git status      # 変更確認'" C-m
            tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  claude \"プロジェクト全体をレビューして\"'" C-m
            ;;
    esac
    
    # Claude Code自動起動設定（コメントアウト状態で提供）
    tmux send-keys -t "$SESSION_NAME.$pane_num" "echo ''" C-m
    tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '🚀 Claude Code自動起動設定 (必要に応じて実行):'" C-m
    tmux send-keys -t "$SESSION_NAME.$pane_num" "echo '  # claude \"こんにちは。$feature_name担当です。サポートをお願いします\"'" C-m
    
    sleep 0.5
done

echo ""
echo "✅ 全ペインClaude Code自動起動設定完了！"
echo ""
echo "🎯 設定完了ペイン一覧:"
echo "  ペイン1: 🎨 Feature-B (UI/テスト) - フロントエンド開発"
echo "  ペイン2: 🔧 Feature-C (API開発) - バックエンドAPI"
echo "  ペイン3: 💻 Feature-D (PowerShell) - Windows環境対応"
echo "  ペイン4: 🔒 Feature-E (非機能要件) - セキュリティ・品質"
echo "  ペイン5: 🎯 Feature-A (統合リーダー) - 全体統括"
echo ""
echo "🚀 Claude Code使用例:"
echo "  claude 'プロジェクトの現在の状況を教えて'"
echo "  claude 'この機能の実装方法を提案して'"
echo "  claude 'コードレビューをお願いします'"
echo "  claude 'テストケースを作成して'"
echo ""
echo "⚠️ 注意事項:"
echo "  - 各ペインで環境変数が正しく設定されていることを確認してください"
echo "  - Claude Codeが正常に動作することを確認してください"
echo "  - APIキーが有効であることを確認してください"
echo ""
echo "🔧 追加設定が必要な場合:"
echo "  1. Claude Codeインストール: curl -fsSL https://claude.ai/install.sh | sh"
echo "  2. 環境変数確認: echo \$ANTHROPIC_API_KEY"
echo "  3. 設定再読み込み: source ~/.bashrc"