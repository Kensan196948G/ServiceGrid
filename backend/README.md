# ITSM準拠IT運用システムプラットフォーム - バックエンド

## 概要

本システムは、PowerShell 7とSQLiteを使用したITSM（IT Service Management）準拠のバックエンドシステムです。
資産管理、インシデント管理、サービス要求管理などの基本的なITSM機能を提供します。

## システム要件

- PowerShell 7.0 以上
- SQLite データベース
- Windows OS（推奨）

## ディレクトリ構成

```
backend/
├── api/                    # REST API機能
│   ├── Assets.ps1         # 資産管理API
│   ├── Incidents.ps1      # インシデント管理API
│   ├── ServiceRequests.ps1 # サービス要求管理API
│   ├── Knowledge.ps1      # ナレッジ管理API
│   ├── Changes.ps1        # 変更管理API
│   ├── Releases.ps1       # リリース管理API
│   ├── Problems.ps1       # 問題管理API
│   ├── SLAs.ps1          # SLA管理API
│   ├── Capacity.ps1      # キャパシティ管理API
│   ├── Availability.ps1  # 可用性管理API
│   ├── Users.ps1         # ユーザー管理API
│   ├── Auth.ps1          # 認証API
│   └── AuditLog.ps1      # 監査ログAPI
├── modules/               # 共通モジュール
│   ├── DBUtil.psm1       # データベース操作
│   ├── AuthUtil.psm1     # 認証機能
│   ├── LogUtil.psm1      # ログ記録
│   └── Config.psm1       # 設定管理
├── db/                   # データベース
│   ├── itsm.sqlite      # SQLiteデータベース
│   └── schema.sql       # データベーススキーマ
├── backup/              # バックアップファイル
├── jobs/                # バッチジョブ
│   ├── BackupJob.ps1    # バックアップジョブ
│   ├── LogArchiveJob.ps1 # ログアーカイブジョブ
│   └── UserExpireCheck.ps1 # ユーザー期限チェック
├── test/                # テストスクリプト
│   ├── Test-APIs.ps1    # APIテストスイート
│   └── run-tests.sh     # テスト実行スクリプト
└── README.md            # このファイル
```

## セットアップ手順

### 1. データベースの初期化

```powershell
Import-Module ./modules/DBUtil.psm1
Initialize-Database -DatabasePath "db/itsm.sqlite" -SchemaPath "db/schema.sql"
```

### 2. 設定の確認

```powershell
Import-Module ./modules/Config.psm1
Test-ConfigValid
```

### 3. APIモジュールの読み込み

```powershell
# 認証API
Import-Module ./api/Auth.ps1

# 資産管理API
Import-Module ./api/Assets.ps1

# インシデント管理API
Import-Module ./api/Incidents.ps1

# サービス要求管理API
Import-Module ./api/ServiceRequests.ps1
```

## API使用例

### 認証

```powershell
# ログイン
$loginData = @{
    username = "admin"
    password = "admin123"
}
$loginResult = Invoke-Login -LoginData $loginData
$token = $loginResult.Data.Token

# トークン検証
$validationResult = Test-Token -Token $token
```

### 資産管理

```powershell
# 資産作成
$assetData = @{
    asset_no = "SRV001"
    name = "Webサーバー"
    type = "Server"
    user = "IT部"
    location = "データセンターA"
    status = "Active"
}
$createResult = New-Asset -Token $token -AssetData $assetData

# 資産一覧取得
$assetsResult = Get-Assets -Token $token -Page 1 -PageSize 20

# 資産詳細取得
$assetResult = Get-Asset -Token $token -AssetId 1
```

### インシデント管理

```powershell
# インシデント作成
$incidentData = @{
    title = "サーバーダウン"
    description = "Webサーバーが応答しません"
    priority = "High"
    assignee = "admin"
}
$incidentResult = New-Incident -Token $token -IncidentData $incidentData

# インシデント更新
$updateData = @{
    status = "In Progress"
}
$updateResult = Update-Incident -Token $token -IncidentId 1 -IncidentData $updateData
```

### サービス要求管理

```powershell
# サービス要求作成
$requestData = @{
    subject = "新規アカウント作成"
    detail = "新入社員用のアカウントを作成してください"
    applicant = "user@company.com"
}
$requestResult = New-ServiceRequest -Token $token -RequestData $requestData

# サービス要求承認
$approvalData = @{
    action = "approve"
    comments = "承認します"
}
$approvalResult = Approve-ServiceRequest -Token $token -RequestId 1 -ApprovalData $approvalData
```

## テストの実行

### PowerShellがインストールされている場合

```bash
cd test
./run-tests.sh
```

または直接PowerShellで実行：

```powershell
cd test
./Test-APIs.ps1
```

### テスト内容

- データベース初期化テスト
- 設定管理テスト
- 認証APIテスト（ログイン・ログアウト・トークン検証）
- 資産管理APIテスト（CRUD操作）
- インシデント管理APIテスト（CRUD操作）
- サービス要求管理APIテスト（CRUD操作・承認フロー）
- ログ機能テスト
- 監査ログテスト

## セキュリティ機能

### 認証・認可

- トークンベース認証
- ロールベースアクセス制御
- セッション管理

### データ保護

- SQLインジェクション対策（パラメータ化クエリ）
- 監査ログ記録
- エラーハンドリング

## ログ機能

### アプリケーションログ

- ファイル: `../logs/backend.log`
- レベル: INFO, WARNING, ERROR
- 自動ローテーション対応

### APIアクセスログ

- ファイル: `../logs/api_access.log`
- 内容: リクエスト詳細、レスポンス時間、ユーザー情報

### 監査ログ

- データベース保存
- ユーザーアクション追跡
- 変更履歴記録

## 初期ユーザー

システム初期化時に以下のユーザーが作成されます：

| ユーザー名 | パスワード | ロール |
|------------|------------|---------|
| admin | admin123 | administrator |
| operator | operator123 | operator |

**注意**: 本番環境では必ずパスワードを変更してください。

## エラーハンドリング

### HTTPステータスコード

- 200: 成功
- 201: 作成成功
- 400: 不正なリクエスト
- 401: 認証失敗
- 403: 権限不足
- 404: リソースが見つからない
- 409: 競合（重複など）
- 500: サーバーエラー

### エラーレスポンス形式

```json
{
    "Status": 400,
    "Message": "エラーメッセージ",
    "Data": null
}
```

## パフォーマンス

- 1秒以内のレスポンス（想定）
- 同時10ユーザー対応
- ページネーション対応（最大100件/ページ）

## 保守・運用

### バックアップ

- 定期自動バックアップ（未実装）
- 手動バックアップ機能

### ログローテーション

- 30日間保持
- 自動アーカイブ機能

## 開発情報

### バージョン

- Version: 1.0.0
- 作成日: 2025年12月
- PowerShell: 7.0+
- SQLite: 3.x

### ライセンス

本システムは仕様書に基づいて開発されており、カスタマイズや拡張が可能です。

## トラブルシューティング

### よくある問題

1. **PowerShellモジュールが読み込めない**
   - モジュールパスを確認
   - 実行ポリシーを設定: `Set-ExecutionPolicy RemoteSigned`

2. **データベースファイルが作成されない**
   - ディレクトリの書き込み権限を確認
   - SQLiteの利用可能性を確認

3. **認証トークンが無効**
   - トークンの有効期限を確認（デフォルト60分）
   - セッション管理の状態を確認

### ログの確認

```powershell
# アプリケーションログ
Get-Content ../logs/backend.log -Tail 50

# APIアクセスログ
Get-Content ../logs/api_access.log -Tail 50

# ログ取得（モジュール経由）
Import-Module ./modules/LogUtil.psm1
Get-LogEntries -Level "ERROR" -Limit 10
```

## 今後の拡張予定

- REST APIサーバー機能
- フロントエンド連携
- 詳細レポート機能
- SLA・キャパシティ・可用性管理の完全実装
- バッチジョブスケジューラー