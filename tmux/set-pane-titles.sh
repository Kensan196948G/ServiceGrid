#!/bin/bash

# tmuxペインタイトルを設定

SESSION_NAME="itsm-dev"

echo "🏷️ tmuxペインタイトルを設定中..."

# 各ペインのタイトル設定
tmux rename-window -t "$SESSION_NAME:0" "ITSM-Dev"

# ペインタイトル設定（select-pane -T は一部のtmuxバージョンで利用可能）
tmux select-pane -t "$SESSION_NAME:0.0" -T "🎨 Feature-B"
tmux select-pane -t "$SESSION_NAME:0.1" -T "🔧 Feature-C"
tmux select-pane -t "$SESSION_NAME:0.2" -T "💻 Feature-D"
tmux select-pane -t "$SESSION_NAME:0.3" -T "🔒 Feature-E"

echo "✅ ペインタイトル設定完了！"

# ペイン境界線表示設定
tmux set-option -t "$SESSION_NAME" pane-border-status top 2>/dev/null || echo "💡 ペインタイトル表示はtmux 2.3以降で対応"

echo ""
echo "🎯 設定されたペインタイトル:"
echo "  Pane 0: 🎨 Feature-B"
echo "  Pane 1: 🔧 Feature-C"
echo "  Pane 2: 💻 Feature-D"
echo "  Pane 3: 🔒 Feature-E"
echo ""