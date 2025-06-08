# ITSM準拠IT運用システムプラットフォーム - API仕様書

**最終更新日**: 2025年6月8日  
**ドキュメントバージョン**: v2.0  
**API実装数**: 35ファイル

本ドキュメントは、ServiceGridのREST API仕様を記載しています。

## API設計原則

### RESTful設計
- **標準HTTPメソッド準拠**: GET、POST、PUT、DELETE
- **リソース指向**: エンドポイントURLの統一命名規則
- **ステートレス**: サーバー側でセッション状態を保持しない
- **JSON通信**: Request/ResponseともにJSON形式

### セキュリティ設計
- **JWT認証**: Bearer Token方式
- **レート制限**: 15分間100リクエスト
- **CORS設定**: 許可オリジン制限
- **入力検証**: 全パラメータの厳密検証
- **SQLインジェクション対策**: パラメータ化クエリ

## ベースURL・接続情報

```
開発環境ベースURL: http://localhost:8082
本番環境ベースURL: [本番環境設定時に決定]
フロントエンドURL: http://localhost:3001

認証方式: JWT Bearer Token
Content-Type: application/json
```

## 統一レスポンス形式

### 成功レスポンス（2xx）
```json
{
  "success": true,
  "message": "操作が完了しました",
  "data": {
    /* 実際のデータ */
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### エラーレスポンス（4xx/5xx）
```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "入力データに問題があります",
    "details": {
      /* エラー詳細 */
    },
    "timestamp": "2025-06-08T10:30:00.000Z"
  }
}
```

## 認証API（/api/auth/*）

### POST /api/auth/login
ユーザーログイン

**リクエスト**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**レスポンス（200）**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "administrator",
    "display_name": "システム管理者",
    "email": "admin@company.com"
  },
  "message": "ログインが完了しました"
}
```

### POST /api/auth/logout
ログアウト

**Headers**: Authorization: Bearer {token}

**レスポンス（200）**
```json
{
  "success": true,
  "message": "ログアウトが完了しました"
}
```

### GET /api/auth/me
ユーザー情報取得

**Headers**: Authorization: Bearer {token}

**レスポンス（200）**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "role": "administrator",
    "display_name": "システム管理者",
    "email": "admin@company.com",
    "last_login": "2025-06-08T10:30:00.000Z"
  }
}
```

## 資産管理API（/api/assets/*）

### GET /api/assets
資産一覧取得（フィルタリング・ページネーション対応）

**クエリパラメータ**
```
?page=1                    # ページ番号（デフォルト: 1）
&limit=25                  # 件数制限（デフォルト: 20、最大: 100）
&status=Active             # ステータスフィルタ
&type=Server               # 資産タイプフィルタ
&search=web                # 全文検索
&owner=admin               # 所有者フィルタ
&location=東京本社         # 設置場所フィルタ
```

**レスポンス（200）**
```json
{
  "data": [
    {
      "asset_id": 1,
      "asset_tag": "SRV-001",
      "name": "Webサーバー01",
      "type": "Server",
      "status": "Active",
      "owner": "IT部",
      "location": "東京本社",
      "purchase_cost": 500000,
      "created_date": "2025-06-08T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 150,
    "totalPages": 6
  },
  "filters": {
    "status": "Active",
    "type": "Server"
  }
}
```

### GET /api/assets/generate-tag
資産タグ自動生成

**クエリパラメータ**
```
?type=Server               # 資産タイプ（必須）
```

**レスポンス（200）**
```json
{
  "asset_tag": "SRV-003",
  "type": "Server",
  "next_sequence": 3
}
```

### GET /api/assets/stats
資産統計情報取得

**レスポンス（200）**
```json
{
  "total": 150,
  "by_type": {
    "Server": 25,
    "Desktop": 80,
    "Laptop": 30,
    "Network Equipment": 15
  },
  "by_status": {
    "Active": 120,
    "Inactive": 20,
    "Maintenance": 5,
    "Retired": 5
  },
  "total_value": 15000000,
  "warranty_expiring": 12
}
```

### POST /api/assets
資産作成

**Headers**: Authorization: Bearer {token}

**リクエスト**
```json
{
  "name": "新Webサーバー",
  "type": "Server",
  "status": "Active",
  "owner": "IT部",
  "location": "東京本社",
  "purchase_cost": 500000,
  "warranty_expiry": "2026-06-08",
  "ip_address": "192.168.1.100",
  "notes": "開発環境用サーバー"
}
```

**レスポンス（201）**
```json
{
  "success": true,
  "message": "資産が正常に作成されました",
  "data": {
    "asset_id": 151,
    "asset_tag": "SRV-026",
    "name": "新Webサーバー",
    "type": "Server",
    "status": "Active",
    "created_date": "2025-06-08T10:30:00.000Z"
  }
}
```

### PUT /api/assets/:id
資産更新

**Headers**: Authorization: Bearer {token}

**リクエスト**
```json
{
  "name": "更新されたWebサーバー",
  "status": "Maintenance",
  "notes": "定期メンテナンス中"
}
```

**レスポンス（200）**
```json
{
  "success": true,
  "message": "資産が正常に更新されました",
  "data": {
    "asset_id": 151,
    "asset_tag": "SRV-026",
    "name": "更新されたWebサーバー",
    "status": "Maintenance",
    "updated_date": "2025-06-08T10:30:00.000Z"
  }
}
```

### DELETE /api/assets/:id
資産削除

**Headers**: Authorization: Bearer {token}

**レスポンス（200）**
```json
{
  "success": true,
  "message": "資産が正常に削除されました",
  "deleted_id": 151
}
```

## インシデント管理API（/api/incidents/*）

### GET /api/incidents
インシデント一覧取得

**クエリパラメータ**
```
?page=1                    # ページ番号
&limit=20                  # 件数制限
&status=Open               # ステータスフィルタ
&priority=High             # 優先度フィルタ
&assigned_to=admin         # 担当者フィルタ
&search=サーバー           # 全文検索
```

**レスポンス（200）**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Webサーバーダウン",
      "description": "メインWebサーバーが応答しません",
      "status": "Open",
      "priority": "Critical",
      "reported_by": "user01",
      "assigned_to": "admin",
      "category": "Infrastructure",
      "created_at": "2025-06-08T04:17:40.000Z",
      "updated_at": "2025-06-08T04:17:40.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

### GET /api/incidents/stats
インシデント統計情報

**レスポンス（200）**
```json
{
  "total": 5,
  "by_status": {
    "Open": 2,
    "In Progress": 2,
    "Resolved": 1
  },
  "by_priority": {
    "Critical": 1,
    "High": 2,
    "Medium": 1,
    "Low": 1
  },
  "by_category": {
    "Infrastructure": 2,
    "Application": 2,
    "Hardware": 1
  },
  "average_resolution_time": "2.5 hours"
}
```

### POST /api/incidents
インシデント作成

**Headers**: Authorization: Bearer {token}

**リクエスト**
```json
{
  "title": "新しいインシデント",
  "description": "システムの詳細な問題説明",
  "priority": "Medium",
  "category": "Application",
  "reported_by": "user01",
  "assigned_to": "operator"
}
```

**レスポンス（201）**
```json
{
  "success": true,
  "message": "インシデントが正常に作成されました",
  "data": {
    "id": 6,
    "title": "新しいインシデント",
    "status": "Open",
    "priority": "Medium",
    "created_at": "2025-06-08T10:30:00.000Z"
  }
}
```

## サービス要求管理API（/api/service-requests/*）

### GET /api/service-requests
サービス要求一覧取得

**クエリパラメータ**
```
?page=1                    # ページ番号
&limit=20                  # 件数制限
&status=Submitted          # ステータスフィルタ
&search=ライセンス         # 全文検索
```

**レスポンス（200）**
```json
{
  "data": [
    {
      "request_id": 1,
      "subject": "ノートパソコンの交換申請",
      "detail": "現在使用中のノートパソコンが故障のため、新しいノートパソコンへの交換を申請します。",
      "status": "Submitted",
      "applicant": "user01",
      "requested_date": "2025-06-08T07:49:01.000Z",
      "created_date": "2025-06-08T07:49:01.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

### POST /api/service-requests
サービス要求作成

**Headers**: Authorization: Bearer {token}

**リクエスト**
```json
{
  "subject": "新しいソフトウェアライセンス申請",
  "detail": "業務に必要なソフトウェアのライセンス購入を申請します。",
  "applicant": "user01",
  "status": "Submitted"
}
```

**レスポンス（201）**
```json
{
  "success": true,
  "message": "サービス要求が正常に作成されました",
  "data": {
    "request_id": 4,
    "subject": "新しいソフトウェアライセンス申請",
    "status": "Submitted",
    "created_date": "2025-06-08T10:30:00.000Z"
  }
}
```

### PUT /api/service-requests/:id/approve
サービス要求承認/却下

**Headers**: Authorization: Bearer {token}
**必要権限**: operator以上

**リクエスト**
```json
{
  "action": "approve"        # "approve" または "reject"
}
```

**レスポンス（200）**
```json
{
  "success": true,
  "message": "サービス要求が正常に承認されました"
}
```

## SLA管理API（/api/slas/*）

### GET /api/slas
SLA一覧取得

**レスポンス（200）**
```json
{
  "data": [
    {
      "sla_id": 1,
      "service_name": "Webサービス",
      "metric_type": "Availability",
      "target_value": 99.9,
      "actual_value": 99.95,
      "measurement_period": "Monthly",
      "status": "Met",
      "last_updated": "2025-06-08T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

### POST /api/slas/bulk-update
SLA一括更新（最大100件）

**Headers**: Authorization: Bearer {token}

**リクエスト**
```json
{
  "updates": [
    {
      "sla_id": 1,
      "actual_value": 99.95
    },
    {
      "sla_id": 2,
      "actual_value": 1.2
    }
  ]
}
```

**レスポンス（200）**
```json
{
  "success": true,
  "message": "SLAが正常に一括更新されました",
  "updated_count": 2,
  "results": [
    {
      "sla_id": 1,
      "status": "Met",
      "previous_status": "At Risk"
    }
  ]
}
```

## その他管理API（シンプル実装）

### GET /api/changes
変更管理一覧

**レスポンス（200）**
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  },
  "filters": {}
}
```

### GET /api/knowledge
ナレッジ管理一覧

**レスポンス（200）**
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  },
  "filters": {}
}
```

### GET /api/problems
問題管理一覧

**レスポンス（200）**
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  },
  "filters": {}
}
```

### GET /api/releases
リリース管理一覧

**レスポンス（200）**
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  },
  "filters": {}
}
```

### GET /api/availability
可用性管理

**レスポンス（200）**
```json
{
  "data": [],
  "metrics": {
    "uptime": 99.9,
    "downtime": 0.1,
    "incidents": 0
  }
}
```

### GET /api/capacity
キャパシティ管理

**レスポンス（200）**
```json
{
  "data": [],
  "metrics": {
    "cpu_usage": 45,
    "memory_usage": 60,
    "disk_usage": 70
  }
}
```

### GET /api/audit-logs
監査ログ

**レスポンス（200）**
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  },
  "filters": {}
}
```

### GET /api/security
セキュリティ管理

**レスポンス（200）**
```json
{
  "data": [],
  "security_metrics": {
    "threats": 0,
    "vulnerabilities": 0,
    "security_score": 95
  }
}
```

### GET /api/compliance-management
コンプライアンス管理

**レスポンス（200）**
```json
{
  "data": [],
  "compliance_status": {
    "overall_score": 92,
    "passed": 18,
    "failed": 2
  }
}
```

## システム情報API

### GET /ping
疎通確認

**レスポンス（200）**
```
pong
```

### GET /api/health
ヘルスチェック

**レスポンス（200）**
```json
{
  "status": "✅ OK",
  "timestamp": "2025-06-08T10:30:00.000Z",
  "version": "1.0.0",
  "server": "Express Quick Server",
  "uptime": 3600
}
```

### GET /api/test
テストエンドポイント

**レスポンス（200）**
```json
{
  "message": "🎉 API is working perfectly!",
  "timestamp": "2025-06-08T10:30:00.000Z",
  "server": "Node.js Express Quick Server",
  "environment": "development"
}
```

## エラーコード一覧

### 認証エラー（4xx）
- **400 Bad Request**: 必須パラメータ不足、形式エラー
- **401 Unauthorized**: 認証トークン不正・期限切れ
- **403 Forbidden**: 権限不足
- **404 Not Found**: リソースが存在しない
- **409 Conflict**: データ重複エラー（資産タグ重複等）
- **422 Unprocessable Entity**: バリデーションエラー
- **429 Too Many Requests**: レート制限超過

### サーバーエラー（5xx）
- **500 Internal Server Error**: サーバー内部エラー
- **502 Bad Gateway**: 外部API連携エラー
- **503 Service Unavailable**: サービス利用不可

## パフォーマンス・制限事項

### レート制限
- **制限**: 15分間100リクエスト/IP
- **応答**: HTTP 429 + Retry-After ヘッダー

### ページネーション制限
- **デフォルト件数**: 20件
- **最大件数**: 100件/リクエスト
- **大量データ**: 1万件超の場合はCSVエクスポート推奨

### リクエストサイズ制限
- **JSON**: 10MB以下
- **ファイルアップロード**: 将来実装予定（50MB以下予定）

### レスポンス時間目標
- **一般API**: 1秒以内
- **検索API**: 3秒以内
- **統計API**: 5秒以内
- **一括処理**: 30秒以内

## API開発ロードマップ

### 完了済み（2025年6月）
- ✅ 認証API（JWT + bcrypt）
- ✅ 資産管理API（完全CRUD + 統計）
- ✅ インシデント管理API（完全CRUD）
- ✅ サービス要求API（ワークフロー付き）
- ✅ SLA管理API（自動評価機能）

### 短期実装予定（3ヶ月以内）
- 🔄 変更管理API（承認ワークフロー）
- 🔄 問題管理API（インシデント連携）
- 🔄 リリース管理API（変更連携）
- 🔄 ナレッジ管理API（検索機能）
- 🔄 通知API（メール・Slack統合）

### 中期実装予定（6ヶ月以内）
- 🔄 ファイル管理API（添付ファイル）
- 🔄 レポートAPI（PDF生成）
- 🔄 ワークフローAPI（BPMN対応）
- 🔄 AI統合API（Gemini活用）

### 長期実装予定（1年以内）
- 🔄 GraphQL対応
- 🔄 WebSocket対応（リアルタイム更新）
- 🔄 OpenAPI 3.0仕様書自動生成
- 🔄 API バージョニング（v2.0）