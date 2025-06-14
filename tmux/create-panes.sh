#!/bin/bash

# ITSM Platform - 確実な5ペイン作成スクリプト
# tmux 3.4対応版

SESSION_NAME="itsm-dev"
PROJECT_ROOT="/mnt/e/ServiceGrid"
TMUX_DIR="$PROJECT_ROOT/tmux"

echo "🚀 ITSM Platform 5ペイン並列開発環境"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 既存セッション確認・削除
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "⚠️  既存セッション '$SESSION_NAME' を削除します..."
    tmux kill-session -t "$SESSION_NAME"
    sleep 1
fi

# スクリプト実行権限確認
echo "🔧 スクリプト実行権限を確認中..."
chmod +x "$TMUX_DIR"/panes/*.sh
chmod +x "$TMUX_DIR"/tools/*.sh

# 新セッション作成（基本）
echo "📝 新しいセッションを作成中..."
tmux new-session -d -s "$SESSION_NAME" -c "$TMUX_DIR"

# セッション作成確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション作成に失敗しました"
    exit 1
fi

echo "✅ セッション '$SESSION_NAME' 作成完了"

# ペイン分割を段階的に実行（確実な方法）
echo "🔄 ペイン分割を実行中..."

# ステップ1: 水平分割（左右に分ける）
echo "  ステップ1: 水平分割..."
if tmux split-window -h -t "$SESSION_NAME"; then
    echo "    ✅ 水平分割成功"
else
    echo "    ❌ 水平分割失敗"
    exit 1
fi

# ステップ2: 左側を垂直分割
echo "  ステップ2: 左側垂直分割..."
if tmux split-window -v -t "$SESSION_NAME.0"; then
    echo "    ✅ 左側垂直分割成功"
else
    echo "    ❌ 左側垂直分割失敗"
fi

# ステップ3: 右側を垂直分割
echo "  ステップ3: 右側垂直分割..."
if tmux split-window -v -t "$SESSION_NAME.1"; then
    echo "    ✅ 右側垂直分割成功"
else
    echo "    ❌ 右側垂直分割失敗"
fi

# ステップ4: 追加ペイン作成
echo "  ステップ4: 追加ペイン作成..."
if tmux split-window -h -t "$SESSION_NAME.2"; then
    echo "    ✅ 追加ペイン作成成功"
else
    echo "    ❌ 追加ペイン作成失敗"
fi

# ペイン数確認
PANE_COUNT=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
echo "📊 作成されたペイン数: $PANE_COUNT"

# レイアウト調整
echo "🎨 レイアウトを調整中..."
tmux select-layout -t "$SESSION_NAME" tiled

# 現在のペイン構成を表示
echo ""
echo "📋 現在のペイン構成:"
tmux list-panes -t "$SESSION_NAME" -F "ペイン #{pane_index}: #{pane_width}x#{pane_height}"

echo ""
echo "🎯 各ペインにコマンドを設定中..."

# 各ペインに安全にコマンドを送信
declare -a pane_commands=(
    "clear && echo '🎯 Feature-A: 統合リーダー' && echo '設計統一・アーキテクチャ管理・調整' && echo '' && ./panes/feature-a-leader.sh"
    "clear && echo '🎨 Feature-B: UI/テスト自動修復' && echo 'React/TypeScript・Jest/RTL・ESLint' && echo '' && ./panes/feature-b-ui.sh"
    "clear && echo '🔧 Feature-C: API開発' && echo 'Node.js・Express・テスト通過ループ' && echo '' && ./panes/feature-c-api.sh"
    "clear && echo '💻 Feature-D: PowerShell API' && echo 'PowerShell・run-tests.sh・Windows対応' && echo '' && ./panes/feature-d-powershell.sh"
    "clear && echo '🔒 Feature-E: 非機能要件' && echo 'SLA・ログ・セキュリティ・監視' && echo '' && ./panes/feature-e-nonfunc.sh"
)

# 各ペインにコマンド送信（存在確認付き）
for i in "${!pane_commands[@]}"; do
    if tmux list-panes -t "$SESSION_NAME" | grep -q "^$i:"; then
        echo "  ペイン$i: コマンド送信中..."
        tmux send-keys -t "$SESSION_NAME.$i" "${pane_commands[$i]}" C-m
        echo "    ✅ ペイン$i設定完了"
        sleep 0.5
    else
        echo "    ⚠️  ペイン$i が存在しません"
    fi
done

# 最初のペインを選択
tmux select-pane -t "$SESSION_NAME.0"

echo ""
echo "✅ 5ペイン並列開発環境の準備が完了しました！"
echo ""
echo "🔧 tmux操作方法:"
echo "  Ctrl+b → 0,1,2,3,4: ペイン切り替え"
echo "  Ctrl+b → 矢印キー: ペイン移動"
echo "  Ctrl+b → d: デタッチ（バックグラウンド実行）"
echo "  Ctrl+b → &: セッション終了"
echo ""
echo "📁 Worktree管理:"
echo "  各ペインは独立したGit Worktreeで動作"
echo "  Feature-Aで統合管理を実行"
echo ""
echo "🎯 統合開発の流れ:"
echo "  1. 各ペインで並列開発"
echo "  2. 定期的なWorktree同期"
echo "  3. Feature-Aで統合管理"
echo ""

# デバッグ情報表示
echo "🔍 デバッグ情報:"
echo "  セッション名: $SESSION_NAME"
echo "  作業ディレクトリ: $TMUX_DIR"
echo "  ペイン数: $PANE_COUNT"
echo ""

# セッション接続オプション
read -p "今すぐセッションに接続しますか？ [Y/n]: " connect_now
if [[ ! $connect_now =~ ^[Nn]$ ]]; then
    echo "🚀 セッションに接続しています..."
    sleep 1
    exec tmux attach-session -t "$SESSION_NAME"
else
    echo ""
    echo "💡 後で接続する場合:"
    echo "  tmux attach-session -t $SESSION_NAME"
    echo ""
    echo "📋 セッション状況確認:"
    echo "  tmux list-sessions"
    echo "  tmux list-panes -t $SESSION_NAME"
fi