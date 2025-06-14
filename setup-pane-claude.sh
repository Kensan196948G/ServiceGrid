#!/bin/bash

# 個別ペインでClaude Code環境をセットアップするスクリプト
# 各ペインで実行してください

PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🔧 このペイン用Claude Code環境セットアップ中..."

# プロジェクトディレクトリに移動
cd "$PROJECT_ROOT"

# .envファイルの確認
if [ ! -f ".env" ]; then
    echo "❌ .envファイルが見つかりません"
    echo "先に './tmux/setup-claude.sh' を実行してください"
    exit 1
fi

# 環境変数を読み込み
echo "📋 環境変数を読み込み中..."
set -a  # 自動エクスポート有効
source .env
set +a  # 自動エクスポート無効

echo "✅ 環境変数読み込み完了"

# Claude Code動作確認
echo ""
echo "🧪 Claude Code動作テスト中..."

if command -v claude &> /dev/null; then
    echo "✅ Claude Codeコマンド: 利用可能"
    
    # バージョン確認
    if claude --version 2>/dev/null; then
        echo "✅ Claude Code: 正常動作"
    else
        echo "⚠️ Claude Code: コマンドは存在するが、動作に問題がある可能性"
    fi
    
    # APIキー確認
    if [ -n "$ANTHROPIC_API_KEY" ] && [ "$ANTHROPIC_API_KEY" != "your_claude_api_key_here" ]; then
        echo "✅ ANTHROPIC_API_KEY: 設定済み"
    else
        echo "⚠️ ANTHROPIC_API_KEY: 未設定または既定値のまま"
    fi
    
    if [ -n "$CLAUDE_API_KEY" ] && [ "$CLAUDE_API_KEY" != "your_claude_api_key_here" ]; then
        echo "✅ CLAUDE_API_KEY: 設定済み"
    else
        echo "⚠️ CLAUDE_API_KEY: 未設定または既定値のまま"
    fi
    
else
    echo "❌ Claude Codeコマンドが見つかりません"
    echo "💡 Claude Codeをインストールしてください:"
    echo "   curl -fsSL https://claude.ai/install.sh | sh"
fi

echo ""
echo "🎯 このペインでの推奨Claude Code使用方法:"

# 現在のディレクトリに基づいて推奨事項を表示
CURRENT_DIR=$(basename "$PWD")
case "$CURRENT_DIR" in
    "ServiceGrid")
        echo "📁 メインプロジェクトディレクトリ"
        echo "   使用例: claude 'プロジェクト全体の構造を確認して'"
        ;;
    "backend")
        echo "📁 バックエンドディレクトリ"
        echo "   使用例: claude 'APIエンドポイントを実装して'"
        ;;
    "src")
        echo "📁 フロントエンドソースディレクトリ"
        echo "   使用例: claude 'Reactコンポーネントを作成して'"
        ;;
    "tmux")
        echo "📁 tmux設定ディレクトリ"
        echo "   使用例: claude 'tmux設定を最適化して'"
        ;;
    *)
        echo "📁 汎用ディレクトリ"
        echo "   使用例: claude 'このディレクトリの内容を分析して'"
        ;;
esac

echo ""
echo "✅ このペイン用Claude Code環境セットアップ完了！"
echo ""
echo "🚀 すぐに使用開始:"
echo "   claude 'こんにちは、このペインでの作業を支援してください'"