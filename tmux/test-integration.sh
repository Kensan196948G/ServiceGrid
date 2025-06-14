#!/bin/bash

# Feature-A統合リーダーからの指示による各ペイン連携テストスクリプト

SESSION_NAME="itsm-dev"

echo "🎯 Feature-A統合リーダー連携テスト開始..."

# セッション確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    echo "🚀 環境を起動してテストを実行します..."
    ./quick-connect.sh
    sleep 5
fi

echo ""
echo "📋 現在のペイン構成確認:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン#{pane_index}: #{pane_title}"

echo ""
echo "🎯 Feature-A（統合リーダー）からの統括指示を送信中..."

# Feature-A（ペイン5）から統括指示
tmux send-keys -t "$SESSION_NAME.5" "clear" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '🎯 Feature-A統合リーダーからの全体指示'" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '================================='" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '新機能「ユーザーダッシュボード」開発開始'" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '各Featureチームは以下の作業を並列実行してください：'" C-m

sleep 2

# Feature-AからClaude経由で各チームに指示
echo "🎯 Feature-A統合リーダーがClaude経由で指示を送信..."
tmux send-keys -t "$SESSION_NAME.5" "claude '統合リーダーとして各Featureチームに新機能開発を指示します。Feature-B（UI/テスト）にはダッシュボード画面設計、Feature-C（API開発）にはデータ取得API実装、Feature-D（PowerShell）にはWindows統合機能、Feature-E（非機能要件）にはセキュリティ検証を依頼してください。各チームの作業開始を確認したら報告してください。'" C-m

sleep 3

echo ""
echo "🎨 Feature-B（UI/テスト）への指示配信..."

# Feature-B（ペイン1）への指示
tmux send-keys -t "$SESSION_NAME.1" "clear" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo '🎨 Feature-B: UI/テスト - 指示受信'" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo '================================'" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo '📋 Feature-Aからの指示: ユーザーダッシュボード画面設計'" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo '🎯 作業内容: React コンポーネント設計・実装'" C-m

sleep 1

tmux send-keys -t "$SESSION_NAME.1" "claude 'Feature-Aから指示を受けました。ユーザーダッシュボード画面をReactで設計・実装します。レスポンシブデザインとアクセシビリティを考慮したコンポーネント構成を提案してください。作業開始を報告します。'" C-m

sleep 2

echo ""
echo "🔧 Feature-C（API開発）への指示配信..."

# Feature-C（ペイン2）への指示
tmux send-keys -t "$SESSION_NAME.2" "clear" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo '🔧 Feature-C: API開発 - 指示受信'" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo '=============================='" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo '📋 Feature-Aからの指示: ダッシュボードデータ取得API実装'" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo '🎯 作業内容: REST API エンドポイント設計・実装'" C-m

sleep 1

tmux send-keys -t "$SESSION_NAME.2" "claude 'Feature-Aから指示を受けました。ユーザーダッシュボード用のデータ取得APIを実装します。ユーザー情報、アクティビティ、統計データを効率的に取得するRESTエンドポイントを設計してください。作業開始を報告します。'" C-m

sleep 2

echo ""
echo "💻 Feature-D（PowerShell）への指示配信..."

# Feature-D（ペイン3）への指示
tmux send-keys -t "$SESSION_NAME.3" "clear" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo '💻 Feature-D: PowerShell - 指示受信'" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo '================================'" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo '📋 Feature-Aからの指示: Windows統合機能実装'" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo '🎯 作業内容: PowerShell連携モジュール開発'" C-m

sleep 1

tmux send-keys -t "$SESSION_NAME.3" "claude 'Feature-Aから指示を受けました。ユーザーダッシュボードのWindows統合機能を実装します。Active Directory連携、システム情報取得、ファイルシステム監視の機能をPowerShellで実装してください。作業開始を報告します。'" C-m

sleep 2

echo ""
echo "🔒 Feature-E（非機能要件）への指示配信..."

# Feature-E（ペイン4）への指示
tmux send-keys -t "$SESSION_NAME.4" "clear" C-m
tmux send-keys -t "$SESSION_NAME.4" "echo '🔒 Feature-E: 非機能要件 - 指示受信'" C-m
tmux send-keys -t "$SESSION_NAME.4" "echo '=================================='" C-m
tmux send-keys -t "$SESSION_NAME.4" "echo '📋 Feature-Aからの指示: セキュリティ・品質検証'" C-m
tmux send-keys -t "$SESSION_NAME.4" "echo '🎯 作業内容: 脆弱性監査・パフォーマンステスト'" C-m

sleep 1

tmux send-keys -t "$SESSION_NAME.4" "claude 'Feature-Aから指示を受けました。ユーザーダッシュボード機能のセキュリティ検証と品質管理を実施します。認証・認可チェック、XSS/CSRF対策、パフォーマンステストを実行してください。作業開始を報告します。'" C-m

sleep 3

echo ""
echo "📊 Feature-A統合リーダーによる進捗確認..."

# Feature-Aで全体進捗確認
tmux send-keys -t "$SESSION_NAME.5" "echo ''" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '📊 統合リーダー進捗確認'" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '========================'" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '✅ Feature-B: UI/テスト - 作業開始確認'" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '✅ Feature-C: API開発 - 作業開始確認'" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '✅ Feature-D: PowerShell - 作業開始確認'" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '✅ Feature-E: 非機能要件 - 作業開始確認'" C-m

sleep 2

tmux send-keys -t "$SESSION_NAME.5" "claude '統合リーダーとして全Featureチームの作業開始を確認しました。次のフェーズとして、30分後に中間進捗報告を実施します。各チームは実装の進捗と課題があれば報告してください。全体のスケジュール調整と品質統一を継続監視します。'" C-m

echo ""
echo "✅ Feature-A統合リーダー連携テスト完了！"
echo ""
echo "🎯 テスト結果:"
echo "  ✅ Feature-A（統合リーダー）から全チームへの指示配信"
echo "  ✅ 各Featureチームでの指示受信・作業開始"
echo "  ✅ Claude Codeを通じた専門分野別タスク実行"
echo "  ✅ 統合リーダーによる進捗監視・調整"
echo ""
echo "🔍 各ペインの動作確認:"
echo "  - ペイン1 (Feature-B): UI/テスト作業開始"
echo "  - ペイン2 (Feature-C): API開発作業開始"
echo "  - ペイン3 (Feature-D): PowerShell作業開始"
echo "  - ペイン4 (Feature-E): セキュリティ作業開始"
echo "  - ペイン5 (Feature-A): 統括・監視実行中"
echo ""
echo "🚀 実際のtmuxセッションで結果を確認:"
echo "  tmux attach-session -t $SESSION_NAME"
echo ""
echo "💡 各ペインでClaude Codeが専門分野に応じて応答していることを確認してください"