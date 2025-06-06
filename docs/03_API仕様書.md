# ServiceGrid API 仕様書

## 1. API概要

### 1.1 基本情報
- **ベースURL**: `http://localhost:8082`
- **プロトコル**: HTTP/HTTPS
- **データ形式**: JSON
- **文字エンコーディング**: UTF-8
- **認証方式**: JWT Bearer Token

### 1.2 API構成
ServiceGridは二層のAPI構成を採用：
1. **Node.js/Express API** (メイン) - JavaScript実装・SQLite連携
2. **PowerShell API** (レガシー) - Windows環境用PowerShellモジュール

## 2. 認証・認可

### 2.1 認証方式

#### 2.1.1 JWT認証 (推奨)
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### 2.1.2 テスト認証 (開発用)
- 管理者: `admin/admin123`
- オペレーター: `operator/operator123`

### 2.2 ユーザーロール
| ロール | 権限レベル | 説明 |
|--------|-----------|------|
| administrator | 全権限 | 全機能のCRUD操作 |
| operator | 制限付き書き込み | 削除権限なし |
| user | 読み書き | 基本操作権限 |
| readonly | 読み取り専用 | 閲覧のみ |

### 2.3 認証エンドポイント

#### ログイン
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**レスポンス**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "administrator",
    "email": "admin@example.com"
  },
  "expiresIn": 3600
}
```

#### ユーザー情報取得
```http
GET /api/auth/me
Authorization: Bearer <token>
```

## 3. コアAPI仕様

### 3.1 インシデント管理API

#### 3.1.1 インシデント一覧取得
```http
GET /api/incidents?page=1&limit=20&status=Open&priority=High
```

**クエリパラメータ**:
| パラメータ | 型 | デフォルト | 説明 |
|-----------|---|-----------|------|
| page | integer | 1 | ページ番号 |
| limit | integer | 20 | 1ページあたりの件数(最大100) |
| status | enum | - | Open,In Progress,Resolved,Closed,Pending |
| priority | enum | - | Low,Medium,High,Critical |
| category | string | - | カテゴリフィルタ |
| assigned_to | string | - | 担当者フィルタ |
| search | string | - | タイトル・説明文検索 |

**レスポンス**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "システム障害",
      "description": "Webサーバーが応答しない",
      "status": "Open",
      "priority": "Critical",
      "category": "Infrastructure",
      "reported_by": "user1",
      "assigned_to": "admin",
      "impact": "High",
      "urgency": "High",
      "created_at": "2024-01-01T09:00:00Z",
      "updated_at": "2024-01-01T09:30:00Z",
      "due_date": "2024-01-01T17:00:00Z",
      "resolution": null,
      "workaround": "代替サーバーに切り替え",
      "related_assets": ["SRV-001", "SRV-002"],
      "tags": ["urgent", "production"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  },
  "filters": {
    "status": "Open",
    "priority": "High"
  }
}
```

#### 3.1.2 インシデント作成
```http
POST /api/incidents
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "新規インシデント",
  "description": "詳細な説明",
  "reported_by": "user1",
  "assigned_to": "admin",
  "status": "Open",
  "priority": "High",
  "category": "Infrastructure",
  "impact": "High",
  "urgency": "High",
  "related_assets": ["SRV-001"],
  "tags": ["production"]
}
```

#### 3.1.3 インシデント更新
```http
PUT /api/incidents/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "Resolved",
  "resolution": "サーバー再起動により解決",
  "assigned_to": "admin"
}
```

#### 3.1.4 インシデント削除
```http
DELETE /api/incidents/:id
Authorization: Bearer <token>
```

#### 3.1.5 インシデント統計
```http
GET /api/incidents/stats
```

**レスポンス**:
```json
{
  "total": 245,
  "by_status": {
    "Open": 45,
    "In Progress": 23,
    "Resolved": 156,
    "Closed": 21
  },
  "by_priority": {
    "Critical": 5,
    "High": 23,
    "Medium": 156,
    "Low": 61
  },
  "resolution_times": {
    "average": "4.2 hours",
    "median": "2.1 hours"
  }
}
```

### 3.2 資産管理API

#### 3.2.1 資産一覧取得
```http
GET /api/assets?page=1&limit=20&status=Active&category=Server
```

**クエリパラメータ**:
| パラメータ | 型 | 説明 |
|-----------|---|------|
| page, limit | integer | ページネーション |
| status | enum | Active,Inactive,Maintenance,Retired,Lost,Stolen,Disposed |
| category | string | カテゴリフィルタ |
| location | string | 設置場所フィルタ |
| assigned_to | string | 担当者フィルタ |
| search | string | 名前,資産タグ,製造元,モデル検索 |

#### 3.2.2 資産作成
```http
POST /api/assets
Content-Type: application/json
Authorization: Bearer <token>

{
  "asset_tag": "SRV-001",
  "name": "Webサーバー1",
  "description": "本番Webサーバー",
  "category": "Server",
  "type": "Physical Server",
  "manufacturer": "Dell",
  "model": "PowerEdge R740",
  "serial_number": "ABC123456",
  "location": "データセンターA",
  "department": "IT部",
  "owner": "田中太郎",
  "assigned_to": "佐藤花子",
  "status": "Active",
  "purchase_date": "2023-01-15",
  "purchase_cost": 500000,
  "warranty_expiry": "2026-01-15",
  "ip_address": "192.168.1.100",
  "mac_address": "00:1B:44:11:3A:B7",
  "operating_system": "Windows Server 2022",
  "software_licenses": ["Windows Server 2022 Standard"],
  "configuration": {
    "cpu": "Intel Xeon Silver 4210",
    "memory": "32GB",
    "storage": "1TB SSD"
  },
  "notes": "重要システム",
  "tags": ["production", "critical"]
}
```

#### 3.2.3 資産更新・削除
```http
PUT /api/assets/:id
DELETE /api/assets/:id
```

### 3.3 サービスリクエストAPI

#### エンドポイント構造
```http
GET    /api/service-requests         # 一覧取得
GET    /api/service-requests/:id     # 詳細取得
POST   /api/service-requests         # 新規作成
PUT    /api/service-requests/:id     # 更新
DELETE /api/service-requests/:id     # 削除
```

### 3.4 その他のITSMモジュールAPI

#### 利用可能なエンドポイント
```http
# 変更管理
GET|POST|PUT|DELETE /api/changes

# リリース管理  
GET|POST|PUT|DELETE /api/releases

# 問題管理
GET|POST|PUT|DELETE /api/problems

# ナレッジ管理
GET|POST|PUT|DELETE /api/knowledge

# SLA管理
GET|POST|PUT|DELETE /api/slas

# キャパシティ管理
GET|POST|PUT|DELETE /api/capacity

# 可用性管理
GET|POST|PUT|DELETE /api/availability

# 監査ログ
GET /api/audit-logs
```

## 4. データ検証仕様

### 4.1 インシデント検証ルール
```javascript
{
  title: {
    required: true,
    maxLength: 200,
    type: "string"
  },
  description: {
    required: true,
    maxLength: 2000,
    type: "string"
  },
  status: {
    enum: ["Open", "In Progress", "Resolved", "Closed", "Pending"]
  },
  priority: {
    enum: ["Low", "Medium", "High", "Critical"]
  },
  impact: {
    enum: ["Low", "Medium", "High"]
  },
  urgency: {
    enum: ["Low", "Medium", "High"]
  }
}
```

### 4.2 資産検証ルール
```javascript
{
  asset_tag: {
    required: true,
    unique: true,
    maxLength: 50,
    pattern: "^[A-Z0-9-]+$"
  },
  name: {
    required: true,
    maxLength: 200
  },
  ip_address: {
    pattern: "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$"
  },
  mac_address: {
    pattern: "^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$"
  },
  email: {
    pattern: "^[\\w\\.-]+@[\\w\\.-]+\\.[A-Za-z]{2,}$"
  }
}
```

## 5. エラーハンドリング

### 5.1 HTTPステータスコード
| コード | 説明 | 使用例 |
|--------|------|--------|
| 200 | 成功 | GET、PUT正常完了 |
| 201 | 作成成功 | POST正常完了 |
| 400 | 不正なリクエスト | バリデーションエラー |
| 401 | 認証エラー | トークン無効 |
| 403 | 権限エラー | アクセス拒否 |
| 404 | リソース無し | データが存在しない |
| 409 | 競合エラー | 重複データ |
| 500 | サーバーエラー | 内部エラー |

### 5.2 エラーレスポンス形式
```json
{
  "error": "バリデーションエラー",
  "details": [
    "タイトルは必須です",
    "優先度が無効です"
  ],
  "timestamp": "2024-01-01T10:00:00Z",
  "path": "/api/incidents",
  "correlationId": "abc123-def456"
}
```

## 6. セキュリティ仕様

### 6.1 CORS設定
```javascript
// 許可オリジン
origins: [
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://192.168.3.92:3001",
  "http://10.212.134.20:3001"
]

// 許可メソッド
methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]

// 許可ヘッダー
headers: ["Content-Type", "Authorization"]
```

### 6.2 レート制限
- **時間窓**: 15分
- **最大リクエスト数**: 100件/IP
- **適用範囲**: `/api/*` エンドポイント

### 6.3 セキュリティヘッダー
```http
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

## 7. パフォーマンス仕様

### 7.1 ページネーション
- **デフォルトページサイズ**: 20件
- **最大ページサイズ**: 100件
- **ページ番号**: 1から始まる
- **レスポンス情報**: 総件数、総ページ数、現在ページ

### 7.2 レスポンス時間目標
| 操作種別 | 目標時間 |
|---------|---------|
| 単一リソース取得 | < 100ms |
| 一覧取得(20件) | < 200ms |
| 作成・更新 | < 300ms |
| 削除 | < 100ms |
| 複雑検索 | < 500ms |

## 8. 監視・ヘルスチェック

### 8.1 ヘルスチェックエンドポイント
```http
GET /api/health
```

**レスポンス**:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T10:00:00Z",
  "version": "1.0.0",
  "database": {
    "type": "SQLite",
    "status": "Connected",
    "response_time": "5ms"
  },
  "uptime": "24:15:30",
  "memory_usage": "256MB",
  "active_connections": 15
}
```

### 8.2 メトリクス
```http
GET /api/metrics      # プロメテウス形式メトリクス
GET /ping             # シンプルpingエンドポイント
```

## 9. APIバージョニング

### 9.1 現在のアプローチ
- **明示的バージョニング**: なし
- **後方互換性**: 追加変更による維持
- **バージョン情報**: ヘルスチェックで確認可能

### 9.2 将来のバージョニング戦略
```http
# URL パス方式（推奨）
GET /api/v2/incidents

# ヘッダー方式
GET /api/incidents
Accept: application/vnd.servicegrid.v2+json
```

この API 仕様書により、ServiceGrid ITSM プラットフォームの全 API エンドポイントを統一的に利用することができます。