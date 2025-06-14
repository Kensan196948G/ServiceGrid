#!/bin/bash

# 全ペインでClaude Code環境を自動設定するスクリプト

SESSION_NAME="itsm-requirement"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🔧 全ペインClaude Code環境自動設定中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

# 実際のペイン番号を取得
PANE_INDEXES=($(tmux list-panes -t "$SESSION_NAME" -F "#{pane_index}"))
PANE_COUNT=${#PANE_INDEXES[@]}

echo "📋 検出されたペイン: ${PANE_INDEXES[*]} (計${PANE_COUNT}個)"

# .envファイル確認
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "❌ .envファイルが見つかりません: $PROJECT_ROOT/.env"
    exit 1
fi

echo "🔧 各ペインでClaude Code環境設定中..."

for i in "${!PANE_INDEXES[@]}"; do
    PANE_NUM="${PANE_INDEXES[$i]}"
    
    case $i in
        0) FEATURE_NAME="Feature-B (UI/テスト)" ;;
        1) FEATURE_NAME="Feature-C (API開発)" ;;
        2) FEATURE_NAME="Feature-D (PowerShell)" ;;
        3) FEATURE_NAME="Feature-E (非機能要件)" ;;
        4) FEATURE_NAME="Feature-A (統合リーダー)" ;;
        *) FEATURE_NAME="Feature-$(($i+1))" ;;
    esac
    
    echo "  ペイン$PANE_NUM: $FEATURE_NAME を設定中..."
    
    # プロジェクトディレクトリに移動
    tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd $PROJECT_ROOT" C-m
    
    # 環境変数読み込み
    tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "source .env" C-m
    tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export \$(cat .env | grep -v ^# | xargs)" C-m
    
    # Claude Code動作確認
    tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🧪 Claude Code動作確認中...'" C-m
    tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "claude --version" C-m
    
    # 各ペインに応じたディレクトリ移動
    case $i in
        0) 
            # Feature-B: プロジェクトルート (フロントエンド)
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🎨 UI/テスト環境準備完了'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '💡 実行例: npm run dev'" C-m
            ;;
        1) 
            # Feature-C: バックエンド
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd backend" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🔧 API開発環境準備完了'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '💡 実行例: npm start'" C-m
            ;;
        2) 
            # Feature-D: バックエンド (PowerShell)
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd backend" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '💻 PowerShell環境準備完了'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '💡 実行例: pwsh'" C-m
            ;;
        3) 
            # Feature-E: プロジェクトルート
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🔒 非機能要件環境準備完了'" C-m
            ;;
        4) 
            # Feature-A: プロジェクトルート
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🎯 統合リーダー環境準備完了'" C-m
            ;;
    esac
    
    sleep 0.5  # ペイン間の処理間隔
done

echo ""
echo "✅ 全ペインClaude Code環境設定完了！"
echo ""
echo "🎯 各ペインの準備状況:"
for i in "${!PANE_INDEXES[@]}"; do
    PANE_NUM="${PANE_INDEXES[$i]}"
    case $i in
        0) echo "  ペイン$PANE_NUM: 🎨 Feature-B (UI/テスト) - フロントエンド開発" ;;
        1) echo "  ペイン$PANE_NUM: 🔧 Feature-C (API開発) - バックエンドAPI" ;;
        2) echo "  ペイン$PANE_NUM: 💻 Feature-D (PowerShell) - Windows環境対応" ;;
        3) echo "  ペイン$PANE_NUM: 🔒 Feature-E (非機能要件) - セキュリティ・監視" ;;
        4) echo "  ペイン$PANE_NUM: 🎯 Feature-A (統合リーダー) - プロジェクト全体管理" ;;
    esac
done

echo ""
echo "🚀 Claude Code使用例："
echo "  claude 'こんにちは、このペインでの作業を支援してください'"
echo "  claude 'プロジェクトの構造を確認して'"
echo "  claude 'このディレクトリのファイルを分析して'"
echo ""
echo "⌨️ ペイン切り替え:"
echo "  Ctrl+b + ${PANE_INDEXES[0]}: 🎨 Feature-B | Ctrl+b + ${PANE_INDEXES[1]}: 🔧 Feature-C"
echo "  Ctrl+b + ${PANE_INDEXES[2]}: 💻 Feature-D | Ctrl+b + ${PANE_INDEXES[3]}: 🔒 Feature-E"
echo "  Ctrl+b + ${PANE_INDEXES[4]}: 🎯 Feature-A"
echo ""
echo "🎉 5ペイン並列Claude Code開発環境が完成しました！"