#!/bin/bash

# ITSM Platform - シンプルtmux起動スクリプト
# 各ペインが表示されない問題の対応版

set -e

SESSION_NAME="itsm-dev"
PROJECT_ROOT="/mnt/e/ServiceGrid"
TMUX_DIR="$PROJECT_ROOT/tmux"

# 色付きメッセージ
info() { echo -e "\033[1;34m[INFO]\033[0m $1"; }
success() { echo -e "\033[1;32m[OK]\033[0m $1"; }
error() { echo -e "\033[1;31m[ERROR]\033[0m $1"; }

# 既存セッション確認
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    info "既存セッション '$SESSION_NAME' が見つかりました"
    echo "1) 既存セッションに接続"
    echo "2) 既存セッションを削除して新規作成"
    echo -n "選択 (1/2): "
    read choice
    
    case $choice in
        1)
            tmux attach-session -t "$SESSION_NAME"
            exit 0
            ;;
        2)
            tmux kill-session -t "$SESSION_NAME"
            info "既存セッションを削除しました"
            ;;
        *)
            error "無効な選択です"
            exit 1
            ;;
    esac
fi

# tmux環境確認
if ! command -v tmux &> /dev/null; then
    error "tmuxがインストールされていません"
    exit 1
fi

# プロジェクトディレクトリ確認
if [ ! -d "$PROJECT_ROOT" ]; then
    error "プロジェクトディレクトリが見つかりません: $PROJECT_ROOT"
    exit 1
fi

info "tmux並列開発環境を作成中..."

# セッション作成
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"
success "セッション作成完了"

# ペイン分割（確実な方法）
info "5ペインを作成中..."

# セッション名のみで指定（最初のウィンドウは自動的に0）
tmux split-window -h -t "$SESSION_NAME"           # 水平分割 (2ペイン)
tmux split-window -v -t "$SESSION_NAME.0"         # 左を垂直分割 (3ペイン)  
tmux split-window -v -t "$SESSION_NAME.1"         # 右を垂直分割 (4ペイン)
tmux split-window -h -t "$SESSION_NAME.2"         # 右下を水平分割 (5ペイン)

# レイアウト調整
tmux select-layout -t "$SESSION_NAME" tiled

# ペイン数確認
PANE_COUNT=$(tmux list-panes -t "$SESSION_NAME" | wc -l)
info "作成されたペイン数: $PANE_COUNT"

# 各ペインに基本設定
info "各ペインに情報を設定中..."

# ペイン0: Feature-A (統合リーダー)
tmux send-keys -t "$SESSION_NAME.0" "clear" C-m
tmux send-keys -t "$SESSION_NAME.0" "echo '🎯 Feature-A: 統合リーダー'" C-m
tmux send-keys -t "$SESSION_NAME.0" "echo '設計統一、アーキテクチャ管理、品質監視'" C-m
tmux send-keys -t "$SESSION_NAME.0" "echo ''" C-m
tmux send-keys -t "$SESSION_NAME.0" "cd $TMUX_DIR" C-m

# ペイン1: Feature-B (UI/テスト)
if [ "$PANE_COUNT" -ge 2 ]; then
    tmux send-keys -t "$SESSION_NAME.1" "clear" C-m
    tmux send-keys -t "$SESSION_NAME.1" "echo '🎨 Feature-B: UI/テスト'" C-m
    tmux send-keys -t "$SESSION_NAME.1" "echo 'フロントエンド開発、テスト自動修復'" C-m
    tmux send-keys -t "$SESSION_NAME.1" "echo ''" C-m
    tmux send-keys -t "$SESSION_NAME.1" "cd $PROJECT_ROOT" C-m
fi

# ペイン2: Feature-C (API開発)
if [ "$PANE_COUNT" -ge 3 ]; then
    tmux send-keys -t "$SESSION_NAME.2" "clear" C-m
    tmux send-keys -t "$SESSION_NAME.2" "echo '🔧 Feature-C: API開発'" C-m
    tmux send-keys -t "$SESSION_NAME.2" "echo 'バックエンドAPI、テスト通過ループ'" C-m
    tmux send-keys -t "$SESSION_NAME.2" "echo ''" C-m
    tmux send-keys -t "$SESSION_NAME.2" "cd $PROJECT_ROOT/backend" C-m
fi

# ペイン3: Feature-D (PowerShell)
if [ "$PANE_COUNT" -ge 4 ]; then
    tmux send-keys -t "$SESSION_NAME.3" "clear" C-m
    tmux send-keys -t "$SESSION_NAME.3" "echo '💻 Feature-D: PowerShell'" C-m
    tmux send-keys -t "$SESSION_NAME.3" "echo 'Windows対応、PowerShell API実装'" C-m
    tmux send-keys -t "$SESSION_NAME.3" "echo ''" C-m
    tmux send-keys -t "$SESSION_NAME.3" "cd $PROJECT_ROOT/backend" C-m
fi

# ペイン4: Feature-E (非機能要件)
if [ "$PANE_COUNT" -ge 5 ]; then
    tmux send-keys -t "$SESSION_NAME.4" "clear" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo '🔒 Feature-E: 非機能要件'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo 'SLA、セキュリティ、監視、パフォーマンス'" C-m
    tmux send-keys -t "$SESSION_NAME.4" "echo ''" C-m
    tmux send-keys -t "$SESSION_NAME.4" "cd $PROJECT_ROOT" C-m
fi

# 最初のペインを選択
tmux select-pane -t "$SESSION_NAME.0"

# 情報表示
echo ""
echo "🚀 ITSM Platform 並列開発環境が起動しました"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 プロジェクト: $PROJECT_ROOT"
echo "🎛️  セッション: $SESSION_NAME"
echo "🔢 ペイン数: $PANE_COUNT"
echo ""
echo "🎯 ペイン構成:"
echo "  0: 🎯 統合リーダー (Worktree管理)"
echo "  1: 🎨 UI/テスト (React・Jest)"
echo "  2: 🔧 API開発 (Node.js・Express)"
echo "  3: 💻 PowerShell (Windows統合)"
echo "  4: 🔒 非機能要件 (セキュリティ・監視)"
echo ""
echo "⌨️  操作:"
echo "  Ctrl+b 0-4: ペイン切り替え"
echo "  Ctrl+b d: デタッチ"
echo "  Ctrl+b &: セッション終了"
echo ""

# セッションにアタッチ
info "セッションに接続します..."
sleep 2
tmux attach-session -t "$SESSION_NAME"