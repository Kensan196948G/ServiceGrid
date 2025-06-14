#!/bin/bash

# Feature-A統合リーダーによる実演シナリオスクリプト
# 各ペインが統合リーダーの指示に従って連携する様子をデモンストレーション

SESSION_NAME="itsm-dev"

echo "🎬 Feature-A統合リーダー連携実演シナリオ"
echo "============================================"
echo ""
echo "📋 シナリオ: 「緊急セキュリティインシデント対応」"
echo ""

# 事前確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ tmuxセッションが必要です。先に ./quick-connect.sh を実行してください"
    exit 1
fi

echo "🚨 緊急事態発生シミュレーション開始..."
echo ""

# Phase 1: インシデント発生
echo "📢 Phase 1: インシデント検知"
echo "----------------------------"

tmux send-keys -t "$SESSION_NAME.5" "clear" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '🚨 緊急事態: セキュリティインシデント発生'" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '========================================'" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '📋 インシデント詳細:'" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '  - 不正アクセス検知'" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '  - 管理者権限の異常使用'" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '  - データベースへの不審なクエリ'" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo ''" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '🎯 統合リーダーとして緊急対応を指示します'" C-m

echo "  統合リーダーがインシデントを検知しました..."
sleep 3

# Phase 2: 緊急対応指示
echo ""
echo "📢 Phase 2: 緊急対応指示"
echo "------------------------"

tmux send-keys -t "$SESSION_NAME.5" "claude '緊急セキュリティインシデントが発生しました。統合リーダーとして各チームに以下の緊急対応を指示します：Feature-E（非機能要件）は即座にセキュリティ監査を実施、Feature-C（API開発）はAPIアクセスログを解析、Feature-B（UI/テスト）は緊急メンテナンス画面を準備、Feature-D（PowerShell）はWindowsシステムログを調査してください。15分以内の初期報告を求めます。'" C-m

echo "  統合リーダーがClaude経由で緊急指示を送信中..."
sleep 2

# Feature-E: セキュリティチーム緊急対応
echo ""
echo "🔒 Feature-E（セキュリティ）緊急対応開始..."

tmux send-keys -t "$SESSION_NAME.4" "clear" C-m
tmux send-keys -t "$SESSION_NAME.4" "echo '🚨 緊急セキュリティ対応'" C-m
tmux send-keys -t "$SESSION_NAME.4" "echo '===================='" C-m
tmux send-keys -t "$SESSION_NAME.4" "echo '🔒 Feature-E: セキュリティ監査実行中...'" C-m

sleep 1

tmux send-keys -t "$SESSION_NAME.4" "claude '緊急指示を受信。セキュリティインシデント対応を開始します。不正アクセスの侵入経路分析、影響範囲調査、緊急パッチの検討を実施中。ファイアウォールログとアクセス記録を精査しています。'" C-m

# Feature-C: API開発チーム対応
echo ""
echo "🔧 Feature-C（API開発）ログ解析開始..."

tmux send-keys -t "$SESSION_NAME.2" "clear" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo '🚨 API緊急解析'" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo '=============='" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo '🔧 Feature-C: APIアクセスログ解析中...'" C-m

sleep 1

tmux send-keys -t "$SESSION_NAME.2" "claude '緊急指示受信。APIアクセスログの詳細解析を開始します。異常なクエリパターン、権限昇格の痕跡、不正なデータアクセスを調査中。データベース接続ログとAPI呼び出し履歴を相関分析しています。'" C-m

# Feature-B: UI/テストチーム対応
echo ""
echo "🎨 Feature-B（UI/テスト）緊急対応準備..."

tmux send-keys -t "$SESSION_NAME.1" "clear" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo '🚨 緊急メンテナンス準備'" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo '==================='" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo '🎨 Feature-B: 緊急メンテナンス画面準備中...'" C-m

sleep 1

tmux send-keys -t "$SESSION_NAME.1" "claude '緊急指示受信。システム緊急メンテナンス画面を準備します。ユーザー向けセキュリティ通知、サービス復旧予定時刻表示、緊急連絡先情報を含む専用ページを作成中。'" C-m

# Feature-D: PowerShellチーム対応
echo ""
echo "💻 Feature-D（PowerShell）システム調査開始..."

tmux send-keys -t "$SESSION_NAME.3" "clear" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo '🚨 システムログ調査'" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo '=================='" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo '💻 Feature-D: Windowsシステムログ調査中...'" C-m

sleep 1

tmux send-keys -t "$SESSION_NAME.3" "claude '緊急指示受信。Windowsシステムログの詳細調査を開始します。イベントログ、セキュリティログ、Active Directory認証ログを分析。不正ログオン試行、権限変更、ファイルアクセス異常を調査中。'" C-m

sleep 3

# Phase 3: 初期報告収集
echo ""
echo "📢 Phase 3: 初期報告収集"
echo "------------------------"

tmux send-keys -t "$SESSION_NAME.5" "echo ''" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '📊 各チーム初期報告収集中...'" C-m
tmux send-keys -t "$SESSION_NAME.5" "echo '=============================='" C-m

sleep 2

# 各チームからの報告
tmux send-keys -t "$SESSION_NAME.4" "echo '📋 セキュリティ初期報告: 不正アクセス元IP特定、ファイアウォール緊急ブロック実施'" C-m
tmux send-keys -t "$SESSION_NAME.2" "echo '📋 API解析初期報告: 異常クエリ50件検知、データベース緊急読み取り専用モード移行'" C-m
tmux send-keys -t "$SESSION_NAME.1" "echo '📋 UI初期報告: 緊急メンテナンス画面デプロイ完了、ユーザー通知開始'" C-m
tmux send-keys -t "$SESSION_NAME.3" "echo '📋 PowerShell初期報告: 管理者アカウント不正使用確認、該当アカウント無効化実施'" C-m

sleep 2

# Phase 4: 統合判断
echo ""
echo "📢 Phase 4: 統合リーダー判断"
echo "----------------------------"

tmux send-keys -t "$SESSION_NAME.5" "claude '各チームからの初期報告を受領しました。統合判断：1)不正アクセスはブロック済み、2)データベースは保護済み、3)ユーザーには適切に通知済み、4)不正アカウントは無効化済み。次フェーズとして詳細調査と恒久対策の策定を指示します。優秀な連携対応でした。'" C-m

sleep 2

echo ""
echo "✅ 緊急対応シナリオ完了！"
echo ""
echo "🎯 実演結果:"
echo "  ✅ Feature-A（統合リーダー）による緊急事態統括"
echo "  ✅ 各Featureチームの迅速な専門対応"
echo "  ✅ リアルタイム情報共有と連携"
echo "  ✅ 統合判断による次フェーズ移行"
echo ""
echo "💡 このように、Feature-A統合リーダーの指示で"
echo "   各ペインが専門分野で連携動作することを確認できました！"
echo ""
echo "🔍 tmuxセッションで詳細確認:"
echo "  tmux attach-session -t $SESSION_NAME"