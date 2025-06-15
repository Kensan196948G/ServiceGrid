# 🚀 ITSM準拠IT運用システムプラットフォーム セットアップガイド

## 📋 事前準備

### 1. システム要件
- Node.js 18+ 
- Git
- tmux
- PowerShell (オプション)

### 2. APIキー取得
1. [Anthropic Console](https://console.anthropic.com/) にアクセス
2. APIキーを作成・取得

## 🔧 初期セットアップ

### 1. リポジトリクローン
```bash
git clone <repository-url>
cd ServiceGrid
```

### 2. 環境変数設定
```bash
# テンプレートから.envファイル作成
cp .env.example .env

# .envファイルを編集してAPIキーを設定
# ANTHROPIC_API_KEY=your_actual_api_key_here
# CLAUDE_API_KEY=your_actual_api_key_here
```

### 3. 依存関係インストール
```bash
npm install
```

### 4. Claude Code OAuth認証
```bash
claude auth login
# ブラウザで認証完了
claude config list  # apiKeyが表示されることを確認
```

### 5. データベース初期化
```bash
node backend/scripts/init-database.js
node backend/scripts/init-assets-db.js
```

## 🎯 tmux並列開発環境

### 起動手順
```bash
cd tmux
./start-development.sh
tmux attach-session -t itsm-requirement
```

### ペイン構成
- **ペイン0**: Feature-B (UI/テスト)
- **ペイン1**: Feature-C (API開発)  
- **ペイン2**: Feature-D (PowerShell)
- **ペイン3**: Feature-E (非機能要件)
- **ペイン4**: Feature-A-Leader (統合リーダー)

### 統合指示システム
```bash
# Feature-A-Leaderペイン(4)から実行
leader all "プロジェクト状況を報告してください"
leader ui "UIコンポーネントを最適化してください"
leader api "APIエンドポイントを強化してください"
```

## 🔒 セキュリティ設定

### APIキー管理
- ✅ `.env`ファイルはGitにコミットされません
- ✅ `.env.example`テンプレートを使用
- ✅ OAuth認証による追加セキュリティ
- ✅ ハードコードされたAPIキーは削除済み

### 重要ファイル
- `.env` - 実際のAPIキー（Git管理外）
- `.env.example` - テンプレート（Git管理内）
- `.gitignore` - 機密情報除外設定

## 🚨 注意事項

1. **APIキーの取り扱い**
   - `.env`ファイルを絶対に共有しない
   - Slack/メールでAPIキーを送信しない
   - スクリーンショットにAPIキーを含めない

2. **開発環境の維持**
   - `.env.example`を最新状態に保つ
   - 新しい環境変数は必ずテンプレートに追加

3. **tmux環境**
   - 初回は必ずOAuth認証完了後に起動
   - エラー時は`tmux kill-session -t itsm-requirement`で再起動

## 📚 参考資料

- [CLAUDE.md](./CLAUDE.md) - 詳細開発ガイド
- [tmux/QUICK_START.md](./tmux/QUICK_START.md) - tmux環境クイックスタート
- [tmux/CHANGELOG.md](./tmux/CHANGELOG.md) - 変更履歴

---
**更新日**: 2025年6月15日  
**バージョン**: v2.0 (セキュア管理対応)