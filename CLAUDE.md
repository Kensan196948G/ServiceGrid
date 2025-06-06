# CLAUDE.md - ITSM準拠IT運用システムプラットフォーム 開発ガイド

## プロジェクト概要

**ITSM準拠IT運用システムプラットフォーム**は、IT資産管理・申請承認ワークフロー・運用ログ管理・状態監視・レポート出力を統合したWebベースの運用システムです。

### 技術スタック
- **フロントエンド**: React 19 + TypeScript + Vite + Tailwind CSS
- **バックエンド**: Node.js + Express (開発用) / PowerShell (本番用予定)
- **データベース**: SQLite
- **認証**: JWT + bcrypt
- **テスト**: Jest + React Testing Library

## ディレクトリ構成

```
ServiceGrid/
├── src/                          # フロントエンドソース
│   ├── components/               # 共通UIコンポーネント
│   ├── pages/                    # 各画面コンポーネント
│   ├── contexts/                 # React Context
│   ├── hooks/                    # カスタムフック
│   ├── services/                 # API連携サービス
│   ├── types/                    # TypeScript型定義
│   ├── utils/                    # ユーティリティ関数
│   └── localization.ts           # 日本語化定義
├── backend/                      # バックエンドソース
│   ├── api/                      # REST API実装
│   │   ├── assets.js             # 資産管理API (Node.js)
│   │   ├── incidents.js          # インシデント管理API (Node.js)
│   │   ├── auth.js               # 認証API (Node.js)
│   │   ├── Assets.ps1            # 資産管理API (PowerShell)
│   │   └── *.ps1                 # その他PowerShell API
│   ├── middleware/               # Express ミドルウェア
│   ├── modules/                  # PowerShell共通モジュール
│   ├── db/                       # データベース
│   │   ├── itsm.sqlite           # SQLiteデータベース
│   │   ├── schema.sql            # 基本スキーマ
│   │   └── assets-schema.sql     # 資産管理スキーマ
│   ├── jobs/                     # バッチ処理
│   └── backup/                   # バックアップ
├── docs/                         # ドキュメント
└── logs/                         # ログファイル
```

## 重要な設定・認証

### 環境変数 (.env)
```env
# JWT設定
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# データベース
DB_PATH=./backend/db/itsm.sqlite

# APIベースURL
VITE_API_BASE_URL=http://localhost:8082
```

### 認証システム
- **ファイル**: `backend/middleware/auth.js`, `src/contexts/AuthContext.tsx`
- **方式**: JWT Bearer Token
- **保存場所**: sessionStorage
- **権限**: administrator, operator, user, readonly

#### テスト用ログイン情報
```
管理者: username=admin, password=admin123
オペレータ: username=operator, password=operator123
```

## 主要機能モジュール

### 1. 資産管理 (CMDB)
- **画面**: `src/pages/AssetPage.tsx`
- **API**: `backend/api/assets.js`
- **型定義**: `src/types/asset.ts`

#### 実装済み機能
- ✅ 資産一覧表示（ID順ソート）
- ✅ 資産作成・編集・削除
- ✅ 資産タグ自動生成（種類別プレフィックス + 連番）
- ✅ フィルタリング（種類・ステータス・所有者・場所）
- ✅ 15種類の資産分類対応
- ✅ ページネーション機能
- ✅ 日本語グラフ表示

#### 資産タグ生成ルール
```
Server → SRV-001, SRV-002...
Desktop → DSK-001, DSK-002...
Laptop → LAP-001, LAP-002...
Network Equipment → NET-001, NET-002...
（全15分類対応）
```

### 2. インシデント管理
- **画面**: `src/pages/IncidentPage.tsx`
- **API**: `backend/api/incidents.js`
- **型定義**: `src/types/incident.ts`

#### 実装済み機能
- ✅ インシデント一覧・詳細表示
- ✅ 作成・編集・削除機能
- ✅ ステータス管理（Open/In Progress/Resolved/Closed）
- ✅ 優先度管理（Low/Medium/High/Critical）

### 3. 認証・ユーザー管理
- **画面**: `src/pages/LoginPage.tsx`
- **API**: `backend/api/auth.js`
- **サービス**: `src/services/authApiService.ts`

#### セキュリティ機能
- ✅ bcryptパスワードハッシュ化
- ✅ JWT トークン認証
- ✅ セッション管理
- ✅ 役割ベースアクセス制御
- ✅ Helmet セキュリティヘッダー
- ✅ Rate limiting

## 開発・実行コマンド

### フロントエンド開発
```bash
npm run dev          # 開発サーバー起動 (port 3001)
npm run build        # プロダクションビルド
npm run preview      # ビルド結果プレビュー
npm test             # Jest テスト実行
npm run lint         # ESLint実行
npm run typecheck    # TypeScript型チェック
```

### バックエンド開発
```bash
# Node.js サーバー
PORT=8082 node backend/start-server.js  # 開発用サーバー
PORT=8082 node backend/secure-server.js # セキュア版サーバー

# データベース初期化
node backend/scripts/init-database.js   # 基本初期化
node backend/scripts/init-assets-db.js  # 資産管理スキーマ
```

### 同時起動
```bash
chmod +x start-all.sh && ./start-all.sh  # フロント+バック同時起動
chmod +x stop-all.sh && ./stop-all.sh    # 同時停止
```

## API エンドポイント

### 認証API
```
POST /api/auth/login     # ログイン
POST /api/auth/logout    # ログアウト
GET  /api/auth/me        # ユーザー情報取得
PUT  /api/auth/password  # パスワード変更
```

### 資産管理API
```
GET    /api/assets                    # 資産一覧
GET    /api/assets/generate-tag?type  # 資産タグ生成
GET    /api/assets/stats              # 統計情報
GET    /api/assets/:id                # 資産詳細
POST   /api/assets                    # 資産作成
PUT    /api/assets/:id                # 資産更新
DELETE /api/assets/:id                # 資産削除
```

### インシデント管理API
```
GET    /api/incidents        # インシデント一覧
GET    /api/incidents/stats  # 統計情報
GET    /api/incidents/:id    # インシデント詳細
POST   /api/incidents        # インシデント作成
PUT    /api/incidents/:id    # インシデント更新
DELETE /api/incidents/:id    # インシデント削除
```

## データベーススキーマ

### 主要テーブル
- **assets**: 資産管理（拡張スキーマ: 30フィールド）
- **incidents**: インシデント管理
- **users**: ユーザー管理（パスワードハッシュ化対応）
- **service_requests**: サービス要求管理
- **knowledge**: ナレッジ管理
- **changes**: 変更管理
- **releases**: リリース管理
- **problems**: 問題管理

### 重要なフィールド例（assets）
```sql
asset_id INTEGER PRIMARY KEY AUTOINCREMENT,
asset_tag VARCHAR(50) UNIQUE NOT NULL,  -- 自動生成タグ
name VARCHAR(200) NOT NULL,
category VARCHAR(100) DEFAULT 'Hardware',
type VARCHAR(100),                       -- 15種類対応
status VARCHAR(50) DEFAULT 'Active',     -- Active/Inactive/Maintenance/Retired
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
-- 他25フィールド...
```

## テスト

### フロントエンドテスト
```bash
npm test                    # 全テスト実行
npm test -- --watch         # ウォッチモード
npm test -- --coverage      # カバレッジ付き
```

### テストファイル
- `src/components/__tests__/ErrorBoundary.test.tsx`
- `src/utils/__tests__/errorHandler.test.ts`

## トラブルシューティング

### よくある問題と解決

#### 1. 資産作成エラー「資産の保存に失敗しました」
**原因**: 
- 重複する資産タグ
- 必須フィールド不足
- 認証エラー

**解決策**:
```bash
# 現在の資産タグ確認
node -e "const sqlite3 = require('sqlite3').verbose(); const db = new sqlite3.Database('./backend/db/itsm.sqlite'); db.all('SELECT asset_tag FROM assets;', (err, rows) => { console.log(rows.map(r => r.asset_tag)); db.close(); });"

# 自動生成機能を使用
# または手動で一意のタグを入力
```

#### 2. 認証エラー
**確認事項**:
- JWT_SECRETが設定されているか
- セッションストレージにトークンが保存されているか
- サーバーが正常に起動しているか

#### 3. データベース接続エラー
```bash
# データベースファイル確認
ls -la backend/db/itsm.sqlite

# 権限確認
chmod 644 backend/db/itsm.sqlite
```

## 今後の開発予定

### 実装待ち機能
- [ ] サービス要求管理のフル実装
- [ ] 変更管理機能
- [ ] リリース管理機能
- [ ] 問題管理機能
- [ ] SLA管理機能
- [ ] キャパシティ管理機能
- [ ] 可用性管理機能
- [ ] 監査ログ表示機能
- [ ] レポート出力機能
- [ ] CSVインポート・エクスポート
- [ ] PowerShell APIとの統合

### 技術改善項目
- [ ] テストカバレッジ向上
- [ ] パフォーマンス最適化
- [ ] セキュリティ強化
- [ ] PWA対応
- [ ] Docker化

## 開発者向けTips

### コーディング規約
- TypeScript strict mode使用
- ESLint + Prettier適用
- React 19の新機能活用
- Tailwind CSSでスタイリング

### デバッグ
```bash
# フロントエンド
npm run dev -- --debug

# バックエンド
DEBUG=* PORT=8082 node backend/start-server.js

# データベース確認
sqlite3 backend/db/itsm.sqlite ".tables"
```

### Git ワークフロー
1. 機能ブランチ作成
2. 実装・テスト
3. ESLint/TypeScript チェック
4. プルリクエスト
5. レビュー・マージ

---

**更新日**: 2025年6月6日  
**バージョン**: v1.3  
**開発者**: Claude Code AI Assistant