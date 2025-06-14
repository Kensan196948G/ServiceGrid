#!/bin/bash

# 各ペインでClaude Codeを使用するためのセットアップスクリプト

PROJECT_ROOT="/mnt/e/ServiceGrid"
ENV_FILE="$PROJECT_ROOT/.env"

echo "🔧 Claude Code 5ペイン対応セットアップ"
echo ""

# .envファイル確認
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .envファイルが見つかりません: $ENV_FILE"
    exit 1
fi

echo "📋 現在の.env設定:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$ENV_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# APIキーの入力確認
if grep -q "your_claude_api_key_here" "$ENV_FILE"; then
    echo "⚠️ Claude APIキーが設定されていません"
    echo ""
    echo "🔑 Claude APIキーを入力してください:"
    echo "   (空白で現在の設定を保持)"
    read -p "Claude API Key: " CLAUDE_KEY
    
    if [ -n "$CLAUDE_KEY" ]; then
        # APIキーを更新
        sed -i "s/your_claude_api_key_here/$CLAUDE_KEY/g" "$ENV_FILE"
        echo "✅ Claude APIキーを更新しました"
    fi
fi

# Anthropic APIキーの確認
if grep -q "your_claude_api_key_here" "$ENV_FILE"; then
    echo "⚠️ ANTHROPIC_API_KEYも同じキーで設定しますか？ (y/n)"
    read -p "回答: " UPDATE_ANTHROPIC
    
    if [[ "$UPDATE_ANTHROPIC" =~ ^[Yy]$ ]] && [ -n "$CLAUDE_KEY" ]; then
        sed -i "s/ANTHROPIC_API_KEY=your_claude_api_key_here/ANTHROPIC_API_KEY=$CLAUDE_KEY/" "$ENV_FILE"
        echo "✅ ANTHROPIC_API_KEYも更新しました"
    fi
fi

echo ""
echo "📋 各ペインでのClaude Code使用方法:"
echo ""

echo "🎯 Feature-A: 統合リーダー"
echo "   設計統一・アーキテクチャ管理・調整"
echo "   使用例: 'claude コード品質をチェックして'"
echo "   使用例: 'claude 全体のアーキテクチャを確認して'"
echo ""

echo "🎨 Feature-B: UI/テスト"
echo "   フロントエンド・Jest/RTL・自動修復"
echo "   使用例: 'claude Reactコンポーネントのテストを作成して'"
echo "   使用例: 'claude ESLintエラーを修正して'"
echo ""

echo "🔧 Feature-C: API開発"
echo "   Node.js API・テスト通過ループ"
echo "   使用例: 'claude REST APIエンドポイントを実装して'"
echo "   使用例: 'claude APIテストを修正して'"
echo ""

echo "💻 Feature-D: PowerShell"
echo "   PowerShell API・run-tests.sh修復"
echo "   使用例: 'claude PowerShellスクリプトをデバッグして'"
echo "   使用例: 'claude Windows環境対応を追加して'"
echo ""

echo "🔒 Feature-E: 非機能要件"
echo "   SLA・ログ・セキュリティ実装"
echo "   使用例: 'claude セキュリティ脆弱性をチェックして'"
echo "   使用例: 'claude SLA監視機能を実装して'"
echo ""

echo "⚙️ Claude Code基本コマンド:"
echo "   claude <質問や依頼>        # 基本的な使用方法"
echo "   claude --help              # ヘルプ表示"
echo "   claude --model             # 使用モデル確認"
echo "   claude --version           # バージョン確認"
echo ""

echo "🔧 環境変数の読み込み:"
echo "   source .env                # 現在のシェルに読み込み"
echo "   export \$(cat .env | xargs) # 環境変数をエクスポート"
echo ""

echo "✅ Claude Code 5ペイン対応セットアップ完了！"
echo ""
echo "🚀 次のステップ:"
echo "1. 各ペインで 'source /mnt/e/ServiceGrid/.env' を実行"
echo "2. 'claude --version' でClaude Codeの動作確認"
echo "3. 各ペインの担当領域に応じてClaude Codeを活用"
echo ""

# 環境変数のエクスポート例を表示
echo "💡 各ペインで実行するコマンド例:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "cd /mnt/e/ServiceGrid"
echo "source .env"
echo "export \$(cat .env | grep -v ^# | xargs)"
echo "claude --version"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"