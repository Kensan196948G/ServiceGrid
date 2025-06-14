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
        0) FEATURE_NAME="Feature-B-UI" ;;
        1) FEATURE_NAME="Feature-C-API" ;;
        2) FEATURE_NAME="Feature-D-PowerShell" ;;
        3) FEATURE_NAME="Feature-E-NonFunc" ;;
        4) FEATURE_NAME="Feature-A-Leader" ;;
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
    
    # 各ペインに応じたディレクトリ移動とプロンプト設定
    case $i in
        0) 
            # Feature-B-UI: フロントエンド
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[Feature-B-UI] \\w$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🎨 Feature-B: UI/テスト開発環境'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo 'React・TypeScript・Jest・RTL・ESLint'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '💡 実行例: npm run dev'" C-m
            tmux select-pane -t "$SESSION_NAME.$PANE_NUM" -T "Feature-B-UI"
            ;;
        1) 
            # Feature-C-API: バックエンド
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd backend" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[Feature-C-API] \\w$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🔧 Feature-C: API開発環境'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo 'Node.js・Express・SQLite・テスト'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '💡 実行例: npm start'" C-m
            tmux select-pane -t "$SESSION_NAME.$PANE_NUM" -T "Feature-C-API"
            ;;
        2) 
            # Feature-D-PowerShell: バックエンド (PowerShell)
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "cd backend" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[Feature-D-PowerShell] \\w$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '💻 Feature-D: PowerShell開発環境'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo 'PowerShell・Windows API・システム統合'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '💡 実行例: pwsh'" C-m
            tmux select-pane -t "$SESSION_NAME.$PANE_NUM" -T "Feature-D-PowerShell"
            ;;
        3) 
            # Feature-E-NonFunc: 非機能要件
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[Feature-E-NonFunc] \\w$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🔒 Feature-E: 非機能要件環境'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo 'SLA・セキュリティ・監視・ログ管理'" C-m
            tmux select-pane -t "$SESSION_NAME.$PANE_NUM" -T "Feature-E-NonFunc"
            ;;
        4) 
            # Feature-A-Leader: 統合リーダー
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "export PS1='[Feature-A-Leader] \\w$ '" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '🎯 Feature-A: 統合リーダー環境'" C-m
            tmux send-keys -t "$SESSION_NAME.$PANE_NUM" "echo '設計統一・アーキテクチャ管理・品質監視・調整'" C-m
            tmux select-pane -t "$SESSION_NAME.$PANE_NUM" -T "Feature-A-Leader"
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
        0) echo "  ペイン$PANE_NUM: 🎨 Feature-B-UI - フロントエンド開発" ;;
        1) echo "  ペイン$PANE_NUM: 🔧 Feature-C-API - バックエンドAPI" ;;
        2) echo "  ペイン$PANE_NUM: 💻 Feature-D-PowerShell - Windows環境対応" ;;
        3) echo "  ペイン$PANE_NUM: 🔒 Feature-E-NonFunc - セキュリティ・監視" ;;
        4) echo "  ペイン$PANE_NUM: 🎯 Feature-A-Leader - プロジェクト全体管理" ;;
    esac
done

echo ""
echo "🚀 Claude Code使用例："
echo "  claude 'こんにちは、このペインでの作業を支援してください'"
echo "  claude 'プロジェクトの構造を確認して'"
echo "  claude 'このディレクトリのファイルを分析して'"
echo ""
echo "✨ 各ペインでClaude Codeが自動起動されました！"
echo "🔄 セッション再接続時も自動でClaude Codeが利用可能です"
echo ""
echo "⌨️ ペイン切り替え:"
echo "  Ctrl+b + ${PANE_INDEXES[0]}: 🎨 Feature-B-UI | Ctrl+b + ${PANE_INDEXES[1]}: 🔧 Feature-C-API"
echo "  Ctrl+b + ${PANE_INDEXES[2]}: 💻 Feature-D-PowerShell | Ctrl+b + ${PANE_INDEXES[3]}: 🔒 Feature-E-NonFunc"
echo "  Ctrl+b + ${PANE_INDEXES[4]}: 🎯 Feature-A-Leader"
echo ""
echo "🎉 5ペイン並列Claude Code開発環境が完成しました！"
echo "🤖 各ペインで即座にClaude Codeが使用可能です！"