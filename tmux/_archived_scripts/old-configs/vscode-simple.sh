#!/bin/bash

# VSCode内ターミナル用 - シンプルな開発環境セットアップ
# tmuxの複雑な操作を避け、VSCode内で完結する軽量版

PROJECT_ROOT="/mnt/e/ServiceGrid"

echo "🔧 VSCode統合開発環境セットアップ中..."
echo ""

# プロジェクトディレクトリ確認
if [ ! -d "$PROJECT_ROOT" ]; then
    echo "❌ プロジェクトディレクトリが見つかりません: $PROJECT_ROOT"
    exit 1
fi

cd "$PROJECT_ROOT"

echo "✅ プロジェクトディレクトリ: $PROJECT_ROOT"
echo ""

# 各機能の状況確認
echo "🎯 開発機能領域の状況確認:"
echo ""

# Feature-A: 統合リーダー
echo "🎯 Feature-A: 統合リーダー"
echo "   📁 設計統一、アーキテクチャ管理、品質監視"
echo "   🔧 実行: cd tmux && ./panes/feature-a-leader.sh"
if [ -f "tmux/panes/feature-a-leader.sh" ]; then
    echo "   ✅ スクリプト: 利用可能"
else
    echo "   ⚠️ スクリプト: 要確認"
fi
echo ""

# Feature-B: UI/テスト
echo "🎨 Feature-B: UI/テスト"
echo "   📁 フロントエンド開発、テスト自動修復"
echo "   🔧 実行: cd tmux && ./panes/feature-b-ui.sh"
echo "   🚀 開発サーバー: npm run dev (port 3001)"
echo "   🧪 テスト: npm test"
if [ -f "package.json" ]; then
    echo "   ✅ package.json: 確認済み"
else
    echo "   ⚠️ package.json: 要確認"
fi
echo ""

# Feature-C: API開発
echo "🔧 Feature-C: API開発"
echo "   📁 バックエンドAPI、テスト通過ループ"
echo "   🔧 実行: cd tmux && ./panes/feature-c-api.sh"
echo "   🚀 APIサーバー: cd backend && npm start (port 8082)"
if [ -f "backend/package.json" ]; then
    echo "   ✅ backend/package.json: 確認済み"
else
    echo "   ⚠️ backend/package.json: 要確認"
fi
echo ""

# Feature-D: PowerShell
echo "💻 Feature-D: PowerShell"
echo "   📁 Windows対応、PowerShell API実装"
echo "   🔧 実行: cd tmux && ./panes/feature-d-powershell.sh"
echo "   💻 PowerShell: cd backend && pwsh"
if command -v pwsh &> /dev/null; then
    echo "   ✅ PowerShell: インストール済み"
elif command -v powershell &> /dev/null; then
    echo "   ✅ PowerShell: インストール済み (legacy)"
else
    echo "   ⚠️ PowerShell: 未インストール"
fi
echo ""

# Feature-E: 非機能要件
echo "🔒 Feature-E: 非機能要件"
echo "   📁 SLA、セキュリティ、監視、パフォーマンス"
echo "   🔧 実行: cd tmux && ./panes/feature-e-nonfunc.sh"
if [ -f "backend/middleware/auth.js" ]; then
    echo "   ✅ 認証ミドルウェア: 確認済み"
else
    echo "   ⚠️ 認証ミドルウェア: 要確認"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 VSCode内での推奨開発方法:"
echo ""
echo "📋 方法1: 統合ターミナルタブ活用"
echo "   • Ctrl+Shift+\` で新しいターミナル作成"
echo "   • 各FeatureごとにタブでCLIリストして管理"
echo "   • タブ名変更で識別しやすく"
echo ""
echo "📋 方法2: VSCodeタスク活用"
echo "   • Ctrl+Shift+P → 'Tasks: Run Task'"
echo "   • package.jsonのscripts実行"
echo "   • 複数タスクの並列実行"
echo ""
echo "📋 方法3: デバッグ設定活用"
echo "   • .vscode/launch.json設定"
echo "   • フロントエンド・バックエンド同時デバッグ"
echo "   • ブレークポイント・変数監視"
echo ""
echo "📋 方法4: 拡張機能活用"
echo "   • REST Client: API テスト"
echo "   • Thunder Client: API 開発"
echo "   • GitLens: Git 統合"
echo "   • PowerShell: PowerShell開発"
echo ""

echo "🚀 クイックスタート コマンド例:"
echo ""
echo "# フロントエンド開発サーバー起動"
echo "npm run dev"
echo ""
echo "# バックエンドAPIサーバー起動" 
echo "cd backend && npm run start"
echo ""
echo "# テスト実行"
echo "npm test"
echo ""
echo "# Lint & 型チェック"
echo "npm run lint && npm run typecheck"
echo ""

echo "✅ VSCode統合開発環境の準備完了！"
echo "   各機能は上記のコマンドで個別に実行してください。"