#!/bin/bash

# tmux接続時に自動でClaude Codeを各ペインで起動するスクリプト

SESSION_NAME="itsm-dev"
PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🚀 tmux接続時Claude Code自動起動設定中..."

# セッション存在確認
if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "❌ セッション '$SESSION_NAME' が見つかりません"
    exit 1
fi

echo "🔧 各ペインでClaude Code自動実行中..."

# ペイン1: Feature-B (UI/テスト)
echo "  ペイン1: Feature-B Claude起動中..."
tmux send-keys -t "$SESSION_NAME.1" "claude 'こんにちは！Feature-B（UI/テスト）担当のClaude Codeです。フロントエンド開発とテスト自動化をサポートします。現在のプロジェクト状況を確認して、必要な作業があれば教えてください。'" C-m

sleep 1

# ペイン2: Feature-C (API開発)  
echo "  ペイン2: Feature-C Claude起動中..."
tmux send-keys -t "$SESSION_NAME.2" "claude 'こんにちは！Feature-C（API開発）担当のClaude Codeです。バックエンドAPI開発とデータベース管理をサポートします。現在のAPI状況を確認して、開発タスクがあれば支援します。'" C-m

sleep 1

# ペイン3: Feature-D (PowerShell)
echo "  ペイン3: Feature-D Claude起動中..."
tmux send-keys -t "$SESSION_NAME.3" "claude 'こんにちは！Feature-D（PowerShell）担当のClaude Codeです。Windows環境対応とPowerShell API実装をサポートします。PowerShell関連の作業があれば支援します。'" C-m

sleep 1

# ペイン4: Feature-E (非機能要件)
echo "  ペイン4: Feature-E Claude起動中..."
tmux send-keys -t "$SESSION_NAME.4" "claude 'こんにちは！Feature-E（非機能要件）担当のClaude Codeです。セキュリティ、パフォーマンス、品質管理をサポートします。システムの非機能要件について確認・改善提案を行います。'" C-m

sleep 1

# ペイン5: Feature-A (統合リーダー)
echo "  ペイン5: Feature-A Claude起動中..."
tmux send-keys -t "$SESSION_NAME.5" "claude 'こんにちは！Feature-A（統合リーダー）担当のClaude Codeです。プロジェクト全体の統括、アーキテクチャ管理、品質監視をサポートします。全体的な状況確認と調整作業を支援します。'" C-m

echo ""
echo "✅ 全ペインでClaude Code自動起動完了！"
echo ""
echo "🎯 各ペインのClaude担当:"
echo "  ペイン1: 🎨 Feature-B - フロントエンド・テスト専門Claude"
echo "  ペイン2: 🔧 Feature-C - バックエンド・API専門Claude" 
echo "  ペイン3: 💻 Feature-D - PowerShell・Windows専門Claude"
echo "  ペイン4: 🔒 Feature-E - セキュリティ・品質専門Claude"
echo "  ペイン5: 🎯 Feature-A - 統括・アーキテクチャ専門Claude"
echo ""
echo "🚀 tmux接続コマンド:"
echo "  tmux attach-session -t $SESSION_NAME"
echo ""
echo "💡 各ペインで既にClaude Codeが起動済みです！"