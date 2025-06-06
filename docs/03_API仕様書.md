# ServiceGrid API 仕様書

## 1. API概要

### 1.1 基本情報
- **ベースURL**: `http://localhost:8082`
- **プロトコル**: HTTP/HTTPS
- **データ形式**: JSON
- **文字エンコーディング**: UTF-8
- **認証方式**: JWT Bearer Token (モック実装)

### 1.2 API構成（実装済み）
ServiceGridは完全にNode.js/Express APIに移行済み：
- **Node.js/Express API** - JavaScript実装・SQLite連携
- **実装済みモジュール**: incidents, assets, compliance, auth
- **セキュリティ機能**: CORS, Helmet, Rate Limiting, 入力検証

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

### 2.3 認証エンドポイント（実装済み）

#### ログイン
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**レスポンス（実装済み）**:
```json
{
  "success": true,
  "token": "mock-jwt-token-1640995200000",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "administrator",
    "email": "admin@company.com"
  },
  "message": "✅ Login successful (mock)"
}
```

**エラーレスポンス**:
```json
{
  "error": "Invalid credentials"
}
```

#### 実装済み認証ユーザー
- **admin/admin123** → role: administrator
- **operator/operator123** → role: operator

## 3. 実装済みコアAPI仕様

### 3.1 インシデント管理API（完全実装済み）

#### 3.1.1 インシデント一覧取得
```http
GET /api/incidents?page=1&limit=20&status=Open&priority=High
```

**実装済みクエリパラメータ**:
| パラメータ | 型 | デフォルト | 説明 | 実装状況 |
|-----------|---|-----------|------|---------|
| page | integer | 1 | ページ番号 | ✅ 実装済み |
| limit | integer | 20 | 1ページあたりの件数(最大100) | ✅ 実装済み |
| status | enum | - | Open,In Progress,Resolved,Closed,Pending | ✅ 実装済み |
| priority | enum | - | Low,Medium,High,Critical | ✅ 実装済み |
| category | string | - | カテゴリフィルタ | ✅ 実装済み |
| assigned_to | string | - | 担当者フィルタ | ✅ 実装済み |
| search | string | - | タイトル・説明文検索 | ✅ 実装済み |

**実装済みレスポンス**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Webサーバーダウン",
      "description": "メインWebサーバー（srv-web-01）が応答しません。",
      "reported_by": "user01",
      "assigned_to": "admin",
      "status": "Open",
      "priority": "Critical",
      "category": "Infrastructure",
      "impact": "High",
      "urgency": "High",
      "created_at": "2024-01-01T09:00:00Z",
      "updated_at": "2024-01-01T09:30:00Z",
      "resolved_at": null,
      "closed_at": null,
      "resolution": null,
      "workaround": "代替サーバーに切り替え",
      "relatedAssets": ["SRV-001"],
      "tags": ["production", "critical"]
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
    "priority": "Critical"
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

### 3.2 資産管理API（完全実装済み）

#### 3.2.1 資産一覧取得
```http
GET /api/assets?page=1&limit=20&status=Active&category=Server
```

**実装済みクエリパラメータ**:
| パラメータ | 型 | 説明 | 実装状況 |
|-----------|---|------|---------|
| page, limit | integer | ページネーション | ✅ 実装済み |
| status | enum | Active,Inactive,Maintenance,Retired,Lost,Stolen,Disposed | ✅ 実装済み |
| category | string | カテゴリフィルタ | ✅ 実装済み |
| location | string | 設置場所フィルタ（LIKE検索） | ✅ 実装済み |
| assigned_to | string | 担当者フィルタ | ✅ 実装済み |
| search | string | 名前,資産タグ,説明,製造元,モデル検索 | ✅ 実装済み |

#### 3.2.2 資産タグ自動生成（新機能）
```http
GET /api/assets/generate-tag?type=Server
```

**実装済み自動生成ルール**:
| 資産種別 | プレフィックス | 例 |
|---------|-------------|-----|
| Server | SRV | SRV-001, SRV-002... |
| Desktop | DSK | DSK-001, DSK-002... |
| Laptop | LAP | LAP-001, LAP-002... |
| Network Equipment | NET | NET-001, NET-002... |
| Storage | STG | STG-001, STG-002... |
| その他 | AST | AST-001, AST-002... |

**レスポンス**:
```json
{
  "assetTag": "SRV-001"
}
```

#### 3.2.3 資産統計情報（新機能）
```http
GET /api/assets/stats
```

**実装済みレスポンス**:
```json
{
  "overall": {
    "total_assets": 245,
    "total_cost": 5420000.00,
    "avg_cost": 22122.45
  },
  "byCategory": [
    {
      "category": "Server",
      "status": "Active",
      "count": 12,
      "total_cost": 2400000.00
    }
  ],
  "byStatus": [
    {
      "status": "Active",
      "count": 198
    }
  ],
  "warranty": [
    {
      "warranty_status": "Expired",
      "count": 15
    },
    {
      "warranty_status": "Expiring Soon",
      "count": 8
    }
  ]
}
```

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

### 3.3 コンプライアンス管理API（完全実装済み）

#### 3.3.1 統制管理
```http
GET /api/compliance/controls    # 統制一覧取得
POST /api/compliance/controls   # 統制作成
PUT /api/compliance/controls/:id # 統制更新
DELETE /api/compliance/controls/:id # 統制削除
```

**統制作成リクエスト例**:
```json
{
  "controlId": "AC-001",
  "name": "アクセス制御ポリシー",
  "description": "システムアクセスに関する統制",
  "standard": "ISO27001/27002",
  "category": "アクセス制御",
  "responsibleTeam": "IT部門",
  "status": "実装済み",
  "lastAuditDate": "2024-01-15",
  "nextAuditDate": "2024-07-15",
  "evidenceLinks": ["doc1.pdf", "screenshot.png"],
  "notes": "定期監査完了",
  "riskLevel": "Medium",
  "capStatus": "完了"
}
```

#### 3.3.2 監査管理
```http
GET /api/compliance/audits    # 監査一覧取得
```

**レスポンス例**:
```json
[
  {
    "id": "1",
    "auditName": "年次ISO27001監査",
    "standard": "ISO27001/27002",
    "type": "External",
    "scheduledStartDate": "2024-03-01",
    "scheduledEndDate": "2024-03-15",
    "status": "Planned",
    "leadAuditor": "監査法人ABC",
    "findingsCount": 0,
    "openFindingsCount": 0
  }
]
```

#### 3.3.3 リスク管理
```http
GET /api/compliance/risks    # リスク一覧取得
```

**レスポンス例**:
```json
[
  {
    "id": "1",
    "riskDescription": "データ漏洩リスク",
    "relatedControlId": "AC-001",
    "relatedStandard": "ISO27001/27002",
    "likelihood": "Medium",
    "impact": "High",
    "overallRisk": "High",
    "mitigationPlan": "暗号化強化、アクセス制御見直し",
    "responsibleTeam": "セキュリティ部門",
    "status": "Mitigating",
    "dueDate": "2024-06-30"
  }
]
```

### 3.4 その他のITSMモジュールAPI（基本実装済み）

#### データベーススキーマ準備完了
```http
# 変更管理 (基本テーブル実装済み)
GET|POST|PUT|DELETE /api/changes

# リリース管理 (基本テーブル実装済み)
GET|POST|PUT|DELETE /api/releases

# 問題管理 (基本テーブル実装済み)
GET|POST|PUT|DELETE /api/problems

# ナレッジ管理 (基本テーブル実装済み)
GET|POST|PUT|DELETE /api/knowledge

# SLA管理 (基本テーブル実装済み)
GET|POST|PUT|DELETE /api/slas

# キャパシティ管理 (基本テーブル実装済み)
GET|POST|PUT|DELETE /api/capacity

# 可用性管理 (基本テーブル実装済み)
GET|POST|PUT|DELETE /api/availability

# 監査ログ (基本テーブル実装済み)
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

## 6. セキュリティ仕様（実装済み）

### 6.1 CORS設定（実装済み）
```javascript
// 実装済み許可オリジン
origins: [
  "http://localhost:3001",
  "http://127.0.0.1:3001", 
  "http://192.168.3.92:3001",
  "http://10.212.134.20:3001"
]

// 実装済み許可メソッド
methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]

// 実装済み許可ヘッダー
allowedHeaders: ["Content-Type", "Authorization"]

// 追加設定
credentials: true
```

### 6.2 レート制限（実装済み）
- **時間窓**: 15分
- **最大リクエスト数**: 100件/IP
- **適用範囲**: `/api/*` エンドポイント
- **実装**: express-rate-limit 7.5.0

### 6.3 セキュリティヘッダー（実装済み）
```javascript
// Helmet 8.1.0 による実装済みヘッダー
app.use(helmet());

// 自動適用されるヘッダー
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY  
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Permitted-Cross-Domain-Policies: none
```

### 6.4 入力検証（実装済み）

#### 6.4.1 インシデント検証
```javascript
// validateIncidentData() 実装済み
{
  title: { required: true, maxLength: 200 },
  description: { required: true, maxLength: 2000 },
  reported_by: { required: true },
  status: { enum: ["Open", "In Progress", "Resolved", "Closed", "Pending"] },
  priority: { enum: ["Low", "Medium", "High", "Critical"] },
  impact: { enum: ["Low", "Medium", "High"] },
  urgency: { enum: ["Low", "Medium", "High"] }
}
```

#### 6.4.2 資産検証
```javascript
// validateAssetData() 実装済み
{
  asset_tag: { required: true, unique: true, maxLength: 50 },
  name: { required: true, maxLength: 200 },
  status: { enum: ["Active", "Inactive", "Maintenance", "Retired", "Lost", "Stolen", "Disposed"] },
  ip_address: { pattern: "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$" },
  mac_address: { pattern: "^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$" },
  purchase_cost: { type: "number", min: 0 },
  date_fields: { pattern: "^\\d{4}-\\d{2}-\\d{2}$" }
}
```

### 6.5 データベースセキュリティ（実装済み）
- **SQLインジェクション防止**: パラメータ化クエリ徹底使用
- **制約チェック**: CHECK制約によるデータ整合性
- **トリガー**: 自動バリデーション・タイムスタンプ更新
- **インデックス**: 効率的な検索のための最適化

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

## 8. 監視・ヘルスチェック（実装済み）

### 8.1 ヘルスチェックエンドポイント（実装済み）
```http
GET /api/health
```

**実装済みレスポンス**:
```json
{
  "status": "✅ OK",
  "timestamp": "2024-01-01T10:00:00Z",
  "version": "1.0.0-quick",
  "database": "🔧 Mock",
  "server": "Express Quick Server",
  "uptime": 3600.5
}
```

### 8.2 追加監視エンドポイント（実装済み）
```http
GET /ping             # シンプルpingエンドポイント → "pong"
GET /                 # API情報・エンドポイント一覧
GET /api/test         # 詳細システム情報
```

**API情報エンドポイントレスポンス**:
```json
{
  "message": "✅ ITSM API Server is running successfully!",
  "status": "OK",
  "timestamp": "2024-01-01T10:00:00Z",
  "version": "1.0.0-quick",
  "server": "Express Quick Server",
  "platform": "linux",
  "nodeVersion": "v22.16.0",
  "networkInfo": {
    "eth0": "192.168.1.100"
  },
  "endpoints": [
    "GET / - This endpoint",
    "GET /api/health - Health check",
    "POST /api/auth/login - Mock login",
    "GET /api/test - Test endpoint",
    "GET /api/incidents - Incidents API",
    "GET /api/assets - Assets API",
    "GET /api/compliance - Compliance API"
  ]
}
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