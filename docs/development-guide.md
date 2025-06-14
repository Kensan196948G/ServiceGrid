# ITSM準拠IT運用システムプラットフォーム - 開発ガイド

## 📋 概要

このドキュメントは、ITSM準拠IT運用システムプラットフォームの開発環境セットアップ、アーキテクチャ詳細、および開発プロセスについて説明します。

## 🚀 最新の改善点（2025年12月）

### ✅ 完了済み改善
- ✅ **Node.js + Express REST APIサーバー実装** - PowerShellからの完全移行
- ✅ **セキュリティ脆弱性修正** - XSS対策、セッション管理改善
- ✅ **React Error Boundary実装** - エラーハンドリング強化
- ✅ **型定義の分割** - モジュール化による保守性向上
- ✅ **包括的テスト環境構築** - Jest + Testing Library
- ✅ **統一エラーハンドリング** - カスタムエラークラス実装

## 🏗️ アーキテクチャ

### フロントエンド
- **React 19** + **TypeScript** - モダンなUI開発
- **Vite** - 高速な開発・ビルド環境
- **React Router v7** - SPAルーティング
- **Tailwind CSS** - ユーティリティファーストCSS
- **Recharts** - データ可視化
- **Jest + Testing Library** - テスト環境

### バックエンド
- **Node.js 18+** + **Express** - REST APIサーバー
- **SQLite** - 軽量データベース
- **JWT** - 認証トークン管理
- **bcrypt** - パスワードハッシュ化
- **Helmet** - セキュリティヘッダー
- **Rate Limiting** - API制限

## 📁 プロジェクト構造

```
ServiceGrid/
├── src/                          # フロントエンドソース
│   ├── components/              # UIコンポーネント
│   │   ├── CommonUI.tsx         # 共通UIコンポーネント
│   │   ├── Layout.tsx           # レイアウトコンポーネント
│   │   ├── ErrorBoundary.tsx    # エラー境界
│   │   └── Toast.tsx            # トースト通知
│   ├── pages/                   # ページコンポーネント
│   ├── contexts/                # Reactコンテキスト
│   ├── services/                # APIサービス
│   ├── hooks/                   # カスタムhooks
│   ├── utils/                   # ユーティリティ
│   └── types/                   # 型定義（分割済み）
│       ├── index.ts             # メインエクスポート
│       ├── user.ts              # ユーザー関連型
│       ├── incident.ts          # インシデント関連型
│       ├── asset.ts             # 資産関連型
│       └── ...
├── backend/                     # バックエンドソース
│   ├── server.js               # Expressサーバー
│   ├── package.json            # Node.js依存関係
│   ├── scripts/                # データベーススクリプト
│   ├── tests/                  # バックエンドテスト
│   └── api/                    # 旧PowerShell API（参考用）
├── jest.config.js              # Jest設定
├── package.json                # フロントエンド依存関係
├── vite.config.ts              # Vite設定
└── tsconfig.json               # TypeScript設定
```

## 🛠️ 開発環境セットアップ

### 前提条件
- Node.js 18以上
- npm または yarn
- Git

### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd ServiceGrid
```

### 2. フロントエンド依存関係のインストール
```bash
npm install
```

### 3. バックエンド依存関係のインストール
```bash
cd backend
npm install
cd ..
```

### 4. 環境変数の設定
```bash
cd backend
cp .env.example .env
# .envファイルを編集して必要な設定を行う
```

### 5. データベースの初期化
```bash
cd backend
npm run init-db
```

### 6. 開発サーバーの起動

**バックエンドサーバー（ターミナル1）:**
```bash
cd backend
npm run dev
```

**フロントエンドサーバー（ターミナル2）:**
```bash
npm run dev
```

### 7. アクセス
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8080

## 🧪 テスト

### フロントエンドテスト
```bash
# 全テスト実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジ付き
npm run test:coverage
```

### バックエンドテスト
```bash
cd backend
npm test
```

## 📊 コード品質

### TypeScript型チェック
```bash
npm run lint
```

### ビルド確認
```bash
npm run build
```

## 🔐 セキュリティ

### 実装済みセキュリティ機能
- JWT認証
- bcryptパスワードハッシュ化
- Helmetセキュリティヘッダー
- Rate Limiting
- CORS設定
- XSS対策
- SQLインジェクション対策

### セキュリティベストプラクティス
1. 環境変数で機密情報を管理
2. sessionStorageを使用（localStorageは使用しない）
3. 入力値のサニタイゼーション
4. エラーメッセージでの情報漏洩防止

## 📦 ビルドとデプロイ

### プロダクションビルド
```bash
# フロントエンド
npm run build

# バックエンド
cd backend
npm start
```

### 環境別設定
- `development` - 開発環境
- `production` - 本番環境

## 🐛 デバッグ

### ログ確認
```bash
# バックエンドログ
tail -f backend/logs/backend.log

# APIアクセスログ
tail -f backend/logs/api_access.log
```

### データベース確認
```bash
cd backend
sqlite3 db/itsm.sqlite
```

## 🔄 開発ワークフロー

### ブランチ戦略
- `main` - 本番環境
- `develop` - 開発環境
- `feature/*` - 機能開発
- `hotfix/*` - 緊急修正

### コミット規則
```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル修正
refactor: リファクタリング
test: テスト追加・修正
chore: その他の変更
```

## 📚 API仕様

### 認証エンドポイント
- `POST /api/auth/login` - ログイン
- `GET /api/auth/me` - ユーザー情報取得

### リソースエンドポイント
- `GET /api/incidents` - インシデント一覧
- `POST /api/incidents` - インシデント作成
- `GET /api/assets` - 資産一覧
- `POST /api/assets` - 資産作成

### レスポンス形式
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## 🚧 今後の予定

### 高優先度
- [ ] 全APIエンドポイントの実装完了
- [ ] フロントエンドのバックエンド連携
- [ ] パフォーマンス最適化
- [ ] アクセシビリティ対応

### 中優先度
- [ ] Docker化
- [ ] CI/CD パイプライン
- [ ] 監視・ロギング強化
- [ ] 国際化対応

### 低優先度
- [ ] PWA対応
- [ ] モバイル最適化
- [ ] 高度なキャッシュ戦略

## 🤝 貢献ガイドライン

1. Issueの確認または作成
2. フィーチャーブランチの作成
3. 変更の実装とテストの追加
4. コードレビューの実施
5. マージリクエストの作成

## 📞 サポート

問題が発生した場合：
1. ログファイルの確認
2. 既知の問題の確認
3. Issueの作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。