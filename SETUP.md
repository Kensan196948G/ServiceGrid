# 🚀 ITSM準拠IT運用システムプラットフォーム セットアップガイド

> **最終更新**: 2025年6月20日 - 統合開発環境完成版

## 📋 事前準備

### 1. システム要件
- **Node.js 18+** - JavaScriptランタイム
- **Git** - バージョン管理
- **tmux** - 並列開発環境（Linux/WSL）
- **PowerShell 5.1+** - Windows統合機能（オプション）
- **Claude Code** - AI支援開発ツール

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
npm install           # フロントエンド依存関係
cd backend && npm install  # バックエンド依存関係
```

### 4. Claude Code OAuth認証
```bash
claude auth login
# ブラウザで認証完了
claude config list  # apiKeyが表示されることを確認
```

### 5. データベース初期化
```bash
# 基本スキーマ作成
node backend/scripts/init-database.js
# 資産管理スキーマ追加
node backend/scripts/init-assets-db.js
# 拡張スキーマ適用
node backend/scripts/apply-enhanced-schema.js
```

## 🎯 tmux並列開発環境

### 起動手順
```bash
cd tmux
./start-development.sh
tmux attach-session -t itsm-requirement
```

### ペイン構成（2x2+1レイアウト）
```
┌─────────────┬─────────────┐
│ ペイン0: Feature-B │ ペイン1: Feature-C │
│ UI/テスト開発    │ API開発・強化   │
├─────────────┼─────────────┤
│ ペイン2: Feature-D │ ペイン3: Feature-E │
│ PowerShell統合  │ セキュリティ強化 │
├─────────────┴─────────────┤
│ ペイン4: Feature-A-Leader        │
│ 統合リーダー・品質監視システム │
└───────────────────────────┘
```

### 統合指示システム
```bash
# Feature-A-Leaderペイン(4)から実行
# 基本コマンド
leader all "全チーム状況報告お願いします"
leader ui "UIコンポーネントを最適化してください"
leader api "APIエンドポイントを強化してください"
leader ps "PowerShell APIを堅牢化してください"
leader sec "セキュリティ監査を実行してください"

# 高度なオプション
leader all --files "src/**/*.tsx,backend/**/*.js" \
  --auto-approve "コード品質向上を実行してください"
```

## 🔒 セキュリティ設定

### APIキー管理
- ✅ **環境変数管理** - `.env`ファイルで安全なキー管理
- ✅ **Git除外設定** - `.gitignore`で機密情報を完全除外
- ✅ **OAuth認証** - Claude Code OAuthによる安全な認証
- ✅ **ハードコーディング防止** - コード内APIキーを完全削除

### ランタイムセキュリティ
- ✅ **JWT認証** - セッション管理・トークン無効化
- ✅ **bcryptハッシュ化** - パスワードの安全な保存
- ✅ **レート制限** - APIの不正アクセス防止
- ✅ **入力検証** - SQLインジェクション・XSS完全防御

### 重要ファイル
- `.env` - 実際のAPIキー（Git管理外）
- `.env.example` - テンプレート（Git管理内）
- `.gitignore` - 機密情報除外設定

## 🚨 重要な注意事項

### 1. セキュリティベストプラクティス
- **APIキーの取り扱い**
  - `.env`ファイルを絶対に共有しない
  - Slack/メール/チャットでAPIキーを送信しない
  - スクリーンショット・ログにAPIキーを含めない
  - パブリックリポジトリにアップロードしない

### 2. 開発環境の維持
- **設定管理**
  - `.env.example`を最新状態に保つ
  - 新しい環境変数は必ずテンプレートに追加
  - バージョン管理で重要な変更を追跡

### 3. tmux並列開発環境
- **起動手順**
  - 初回は必ずClaude Code OAuth認証完了後に起動
  - エラー時は`tmux kill-session -t itsm-requirement`でリセット
  - ペイン間の統合指示は必ずFeature-A-Leaderペインから実行

### 4. パフォーマンス最適化
- **リソース管理**
  - 同時実行は5ペインまでを推奨
  - 大きなファイルの編集時は他ペインを一時停止
  - メモリ使用量が高い場合はセッションを再起動

## 📚 参考資料

### 主要ガイド
- [CLAUDE.md](./CLAUDE.md) - プロジェクト全体の詳細開発ガイド
- [README.md](./README.md) - プロジェクト概要・機能一覧

### tmux並列開発環境
- [tmux/QUICK_START.md](./tmux/QUICK_START.md) - tmux環境クイックスタート
- [tmux/LEADER_REFERENCE.md](./tmux/LEADER_REFERENCE.md) - leaderコマンドリファレンス
- [tmux/CHANGELOG.md](./tmux/CHANGELOG.md) - tmux環境変更履歴

### 技術仕様
- [docs/specifications/](./docs/specifications/) - 統合仕様書
- [backend/README.md](./backend/README.md) - バックエンドAPI仕様
- [config/](./config/) - ビルド・テスト設定

## ⚙️ トラブルシューティング

### よくある問題

#### tmuxセッションが起動しない
```bash
# 既存セッションを終了して再起動
tmux kill-session -t itsm-requirement
cd tmux && ./start-development.sh
```

#### APIキー認証エラー
```bash
# Claude Code認証結果確認
claude config list
# 認証が必要な場合
claude auth login
```

#### ポート競合エラー
```bash
# ポート使用状況確認
lsof -i :3001 -i :8082
# プロセス終了
kill -9 <PID>
```

---
**更新日**: 2025年6月20日  
**バージョン**: v2.1 (統合開発環境完成版)