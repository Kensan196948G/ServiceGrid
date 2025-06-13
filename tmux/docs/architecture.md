# ITSM Platform アーキテクチャ設計

## 概要

ITSM Platformは、ITサービスマネジメントのベストプラクティスに基づいた統合管理システムです。
モジュール化されたアーキテクチャで、拡張性と保守性を両立しています。

## システムアーキテクチャ

### 全体構成

```mermaid
graph TB
    subgraph "フロントエンド層"
        UI[React 19 + TypeScript]
        Router[React Router]
        State[Context API]
    end
    
    subgraph "APIゲートウェイ層"
        Gateway[Express.js]
        Auth[JWT認証]
        Rate[Rate Limiting]
    end
    
    subgraph "ビジネスロジック層"
        NodeAPI[Node.js APIs]
        PSAPI[PowerShell APIs]
        Services[サービス層]
    end
    
    subgraph "データ層"
        SQLite[(SQLite DB)]
        Files[ファイルシステム]
        Logs[ログストア]
    end
    
    UI --> Gateway
    Gateway --> NodeAPI
    Gateway --> PSAPI
    NodeAPI --> SQLite
    PSAPI --> SQLite
    Services --> Files
    Services --> Logs
```

### テクノロジースタック

| 層 | テクノロジー | 目的 |
|------|------------|------|
| **フロントエンド** | React 19 + TypeScript | UIコンポーネント、状態管理 |
| **ビルドツール** | Vite | 高速ビルド、HMR |
| **スタイリング** | Tailwind CSS | ユーティリティファーストCSS |
| **バックエンド** | Node.js + Express | REST API、ミドルウェア |
| **スクリプト** | PowerShell | Windows統合、システム連携 |
| **データベース** | SQLite | 組み込みデータベース |
| **認証** | JWT + bcrypt | トークンベース認証 |
| **テスト** | Jest + RTL | 単体テスト、結合テスト |

## モジュール設計

### フロントエンドモジュール

```
src/
├── components/          # 共通UIコンポーネント
│   ├── Layout.tsx
│   ├── CommonUI.tsx
│   └── ErrorBoundary.tsx
├── pages/               # ページコンポーネント
│   ├── DashboardPage.tsx
│   ├── AssetPage.tsx
│   └── IncidentPage.tsx
├── contexts/            # React Context
│   └── AuthContext.tsx
├── services/            # API通信サービス
│   ├── apiUtils.ts
│   └── authApiService.ts
├── types/               # TypeScript型定義
│   ├── common.ts
│   └── asset.ts
└── utils/               # ユーティリティ関数
    ├── errorHandler.ts
    └── formValidation.ts
```

### バックエンドモジュール

```
backend/
├── api/                 # REST APIエンドポイント
│   ├── assets.js        # 資産管理API
│   ├── incidents.js     # インシデントAPI
│   └── auth.js          # 認証API
├── middleware/          # Expressミドルウェア
│   └── auth.js          # JWT認証
├── modules/             # PowerShellモジュール
│   ├── Config.psm1
│   └── DBUtil.psm1
├── db/                  # データベース
│   ├── itsm.sqlite
│   └── schema.sql
└── utils/               # ユーティリティ
    └── errorHandler.js
```

## データモデル

### エンティティ関係図

```mermaid
erDiagram
    USERS {
        int user_id PK
        string username
        string password_hash
        string email
        string role
        datetime created_at
    }
    
    ASSETS {
        int asset_id PK
        string asset_tag UK
        string name
        string category
        string type
        string status
        int owner_id FK
        datetime created_at
    }
    
    INCIDENTS {
        int incident_id PK
        string title
        string description
        string priority
        string status
        int assigned_to FK
        int reported_by FK
        datetime created_at
    }
    
    SERVICE_REQUESTS {
        int request_id PK
        string title
        string description
        string category
        string status
        int requester_id FK
        datetime created_at
    }
    
    SLA {
        int sla_id PK
        string name
        string description
        int target_time
        string metric_type
        datetime created_at
    }
    
    USERS ||--o{ ASSETS : owns
    USERS ||--o{ INCIDENTS : "reports/assigned"
    USERS ||--o{ SERVICE_REQUESTS : requests
    INCIDENTS }o--|| SLA : "subject to"
```

### データフロー

```mermaid
flowchart LR
    subgraph "ユーザー入力"
        Input[Web UI]
    end
    
    subgraph "API処理"
        Valid[Validation]
        Auth[Authentication]
        Proc[Business Logic]
    end
    
    subgraph "データ永続化"
        DB[(SQLite)]
        Cache[Memory Cache]
        Files[File System]
    end
    
    subgraph "外部連携"
        AD[Active Directory]
        Email[Email Service]
        Monitoring[Monitoring Tools]
    end
    
    Input --> Valid
    Valid --> Auth
    Auth --> Proc
    Proc --> DB
    Proc --> Cache
    Proc --> Files
    Proc --> AD
    Proc --> Email
    Proc --> Monitoring
```

## セキュリティアーキテクチャ

### 認証・許可モデル

```mermaid
sequenceDiagram
    participant Client as クライアント
    participant Gateway as API Gateway
    participant Auth as 認証サービス
    participant API as ビジネスAPI
    participant DB as データベース
    
    Client->>Gateway: ログインリクエスト
    Gateway->>Auth: 認証情報検証
    Auth->>DB: ユーザー情報取得
    DB-->>Auth: ユーザーデータ
    Auth-->>Gateway: JWTトークン
    Gateway-->>Client: トークン返却
    
    Client->>Gateway: APIリクエスト + Token
    Gateway->>Auth: トークン検証
    Auth-->>Gateway: ユーザー情報
    Gateway->>API: 許可済みリクエスト
    API->>DB: データ操作
    DB-->>API: 結果
    API-->>Gateway: レスポンス
    Gateway-->>Client: 最終レスポンス
```

### セキュリティ層

| 層 | セキュリティ対策 | 実装方法 |
|------|----------------|----------|
| **フロントエンド** | XSS対策 | ReactのSanitization |
| **通信** | HTTPS強制 | TLS 1.2+ |
| **API** | CSRF対策 | CSRF Token |
| **認証** | パスワードハッシュ化 | bcrypt |
| **データベース** | SQLインジェクション | Prepared Statements |
| **ファイル** | パストラバーサル | パス検証 |

## パフォーマンス設計

### スケーラビリティ戦略

```mermaid
graph LR
    subgraph "フロントエンド最適化"
        LazyLoad[Lazy Loading]
        CodeSplit[Code Splitting]
        Bundling[Bundle Optimization]
    end
    
    subgraph "バックエンド最適化"
        Caching[Response Caching]
        DBIndex[DB Indexing]
        ConnPool[Connection Pooling]
    end
    
    subgraph "インフラ最適化"
        CDN[CDN Distribution]
        LoadBalance[Load Balancing]
        Monitoring[Performance Monitoring]
    end
```

### パフォーマンスメトリクス

| メトリクス | 目標値 | 測定方法 |
|-----------|--------|----------|
| **初期表示時間** | < 2秒 | FCP (First Contentful Paint) |
| **インタラクティブ時間** | < 3秒 | TTI (Time to Interactive) |
| **APIレスポンス** | < 500ms | エンドポイント監視 |
| **データベースクエリ** | < 100ms | クエリ実行計画 |
| **メモリ使用量** | < 512MB | システムモニタリング |

## デプロイメントアーキテクチャ

### 環境構成

```mermaid
graph TB
    subgraph "開発環境"
        DevFE[Dev Frontend<br/>Vite Dev Server]
        DevBE[Dev Backend<br/>Node.js]
        DevDB[(Dev SQLite)]
    end
    
    subgraph "ステージング環境"
        StageFE[Stage Frontend<br/>Nginx]
        StageBE[Stage Backend<br/>PM2]
        StageDB[(Stage SQLite)]
    end
    
    subgraph "本番環境"
        ProdFE[Prod Frontend<br/>Nginx + CDN]
        ProdBE[Prod Backend<br/>PM2 Cluster]
        ProdDB[(Prod SQLite<br/>+ Backup)]
    end
    
    DevFE --> DevBE
    DevBE --> DevDB
    
    StageFE --> StageBE
    StageBE --> StageDB
    
    ProdFE --> ProdBE
    ProdBE --> ProdDB
```

### CI/CDパイプライン

```mermaid
flowchart LR
    subgraph "Source Control"
        Git[Git Repository]
    end
    
    subgraph "CI Pipeline"
        Build[Build & Test]
        Lint[Code Quality Check]
        Security[Security Scan]
        Package[Package Artifacts]
    end
    
    subgraph "CD Pipeline"
        Deploy[Deploy to Staging]
        Test[Integration Test]
        Approve[Manual Approval]
        Prod[Deploy to Production]
    end
    
    Git --> Build
    Build --> Lint
    Lint --> Security
    Security --> Package
    Package --> Deploy
    Deploy --> Test
    Test --> Approve
    Approve --> Prod
```

## 監視・ログアーキテクチャ

### ログ集約システム

```mermaid
flowchart TD
    subgraph "Application Layer"
        FrontendLogs[Frontend Logs]
        BackendLogs[Backend Logs]
        PSLogs[PowerShell Logs]
    end
    
    subgraph "Log Processing"
        Aggregator[Log Aggregator]
        Parser[Log Parser]
        Enricher[Log Enricher]
    end
    
    subgraph "Storage & Analysis"
        LogDB[(Log Database)]
        Search[Log Search Engine]
        Dashboard[Monitoring Dashboard]
    end
    
    FrontendLogs --> Aggregator
    BackendLogs --> Aggregator
    PSLogs --> Aggregator
    
    Aggregator --> Parser
    Parser --> Enricher
    Enricher --> LogDB
    LogDB --> Search
    Search --> Dashboard
```

### メトリクス収集

| カテゴリ | メトリクス | 収集間隔 |
|----------|-----------|----------|
| **システム** | CPU, Memory, Disk | 1分 |
| **アプリケーション** | Response Time, Error Rate | 30秒 |
| **ビジネス** | User Activity, SLA Metrics | 5分 |
| **セキュリティ** | Failed Logins, Access Violations | リアルタイム |

## バックアップ・災害復旧

### バックアップ戦略

```mermaid
timeline
    title バックアップスケジュール
    
    section 日次
        データベース全体バックアップ : 毎日 2:00 AM
        アプリケーションファイルバックアップ : 毎日 3:00 AM
    
    section 週次
        設定ファイルバックアップ : 毎週日曜日
        ログアーカイブ : 毎週日曜日
    
    section 月次
        システム全体バックアップ : 毎月第1日曜日
        オフサイトバックアップ : 毎月第1日曜日
```

### 災害復旧手順

1. **緊急対応フェーズ** (0-4時間)
   - システム停止の確認
   - バックアップからの最低限機能復旧
   - ステークホルダーへの通知

2. **システム復旧フェーズ** (4-24時間)
   - 完全バックアップからの復元
   - データ整合性チェック
   - 機能テスト実行

3. **完全復旧フェーズ** (24-72時間)
   - 全機能の正常化
   - パフォーマンス調整
   - 本格運用再開

## 拡張性考慮事項

### スケールアウト戦略

1. **水平スケーリング**
   - ロードバランサー導入
   - データベースクラスタリング
   - CDN活用

2. **垂直スケーリング**
   - サーバースペック向上
   - メモリ増設
   - SSD化

3. **マイクロサービス化**
   - APIゲートウェイ導入
   - サービス分割
   - コンテナ化

### テクノロジーロードマップ

| フェーズ | 期間 | 主な改善 |
|----------|------|----------|
| **Phase 1** | 0-6ヶ月 | 現行アーキテクチャの安定化 |
| **Phase 2** | 6-12ヶ月 | マイクロサービス化開始 |
| **Phase 3** | 12-18ヶ月 | コンテナ化・オーケストレーション |
| **Phase 4** | 18-24ヶ月 | クラウドネイティブ化 |

---

**更新日**: 2025年6月14日  
**バージョン**: v1.0  
**作成者**: Claude Code AI Assistant