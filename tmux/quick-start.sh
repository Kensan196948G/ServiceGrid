#!/bin/bash

# ITSM Platform - クイックスタート（最小限）
# 確実にtmux 5ペイン環境を作成

SESSION_NAME="itsm-dev"
PROJECT_ROOT="/mnt/e/ServiceGrid"
TMUX_DIR="$PROJECT_ROOT/tmux"

# 既存セッション終了
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
sleep 1

echo "🚀 tmux並列開発環境を作成中..."

# 新セッション作成
tmux new-session -d -s "$SESSION_NAME" -c "$TMUX_DIR"

# ペインを段階的に分割
echo "📝 ペイン分割中..."
tmux split-window -h -t "$SESSION_NAME:0"     # 縦分割 -> 2ペイン
tmux split-window -v -t "$SESSION_NAME:0.0"   # 左を横分割 -> 3ペイン  
tmux split-window -v -t "$SESSION_NAME:0.2"   # 右を横分割 -> 4ペイン
tmux split-window -h -t "$SESSION_NAME:0.1"   # 左下を縦分割 -> 5ペイン

# レイアウト調整
tmux select-layout -t "$SESSION_NAME:0" tiled

echo "🎯 各ペインにスクリプト設定中..."

# 各ペインにスクリプト設定（確実な方法）
tmux send-keys -t "$SESSION_NAME:0.0" "echo '🎯 Feature-A: 統合リーダー' && cd $TMUX_DIR && ./panes/feature-a-leader.sh" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo '🎨 Feature-B: UI/テスト' && cd $TMUX_DIR && ./panes/feature-b-ui.sh" C-m  
tmux send-keys -t "$SESSION_NAME:0.2" "echo '🔧 Feature-C: API開発' && cd $TMUX_DIR && ./panes/feature-c-api.sh" C-m
tmux send-keys -t "$SESSION_NAME:0.3" "echo '💻 Feature-D: PowerShell' && cd $TMUX_DIR && ./panes/feature-d-powershell.sh" C-m
tmux send-keys -t "$SESSION_NAME:0.4" "echo '🔒 Feature-E: 非機能要件' && cd $TMUX_DIR && ./panes/feature-e-nonfunc.sh" C-m

# 最初のペインを選択
tmux select-pane -t "$SESSION_NAME:0.0"

echo ""
echo "✅ 5ペイン並列開発環境が準備完了！"
echo ""
echo "🔧 tmux操作方法:"
echo "  Ctrl+b → 0~4: ペイン切り替え"
echo "  Ctrl+b → d: デタッチ"
echo "  Ctrl+b → &: 終了"
echo ""
echo "📋 接続コマンド:"
echo "  tmux attach-session -t $SESSION_NAME"
echo ""

# セッションに接続
echo "セッションに接続しています..."
tmux attach-session -t "$SESSION_NAME"