# 🚀 サービス要求管理モジュール - PowerShell連携設計書

**作成者**: Feature-D-PowerShell  
**作成日**: 2025年6月19日  
**設計フェーズ**: 初期構造案  

## 📋 PowerShell連携における設計概要

### 1. 🔧 PowerShell API強化設計

#### A. 既存ServiceRequests.ps1の拡張
```powershell
# 承認ワークフロー機能追加
function Invoke-ServiceRequestApproval {
    param(
        [string]$RequestId,
        [string]$ApproverToken,
        [string]$Decision,  # "approved", "rejected", "pending"
        [string]$Comments
    )
}

# 自動処理機能
function Start-ServiceRequestAutoProcessing {
    param(
        [string]$RequestType,
        [hashtable]$ProcessingRules
    )
}

# Windows統合処理
function Invoke-WindowsServiceRequest {
    param(
        [string]$RequestType,  # "user_creation", "group_access", "software_install"
        [hashtable]$RequestData
    )
}
```

#### B. 新機能モジュール
```powershell
# ServiceRequestWorkflow.ps1
- 承認フロー自動化
- エスカレーション処理
- SLA監視

# ServiceRequestIntegration.ps1
- Active Directory連携
- Microsoft 365統合
- Windows自動化処理
```

### 2. 🗄️ データスキーマ拡張案

#### A. service_requests テーブル強化
```sql
-- 既存テーブルに追加カラム
ALTER TABLE service_requests ADD COLUMN request_type VARCHAR(50) DEFAULT 'general';
ALTER TABLE service_requests ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE service_requests ADD COLUMN approval_level INTEGER DEFAULT 1;
ALTER TABLE service_requests ADD COLUMN auto_processing BOOLEAN DEFAULT FALSE;
ALTER TABLE service_requests ADD COLUMN sla_target_hours INTEGER DEFAULT 24;
ALTER TABLE service_requests ADD COLUMN escalation_level INTEGER DEFAULT 0;
ALTER TABLE service_requests ADD COLUMN integration_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE service_requests ADD COLUMN windows_task_id VARCHAR(100);
ALTER TABLE service_requests ADD COLUMN powershell_job_id VARCHAR(100);
```

#### B. 新規テーブル
```sql
-- 承認ワークフローテーブル
CREATE TABLE service_request_approvals (
    approval_id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER REFERENCES service_requests(request_id),
    approver_id VARCHAR(100),
    approval_level INTEGER,
    status VARCHAR(20), -- pending, approved, rejected
    comments TEXT,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Windows統合ジョブテーブル
CREATE TABLE windows_integration_jobs (
    job_id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER REFERENCES service_requests(request_id),
    job_type VARCHAR(50), -- ad_user, group_access, software_install
    job_status VARCHAR(20), -- queued, running, completed, failed
    powershell_script TEXT,
    execution_result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);
```

### 3. 🔗 Windows統合機能設計

#### A. Active Directory連携
```powershell
# ユーザー作成要求の自動処理
function New-ADUserFromServiceRequest {
    param($RequestData)
    
    # AD ユーザー作成
    # メール通知
    # 監査ログ記録
}

# グループアクセス要求処理
function Grant-ADGroupAccessFromRequest {
    param($RequestData)
    
    # グループメンバーシップ追加
    # 権限確認
    # 監査ログ記録
}
```

#### B. Microsoft 365統合
```powershell
# Teams チャンネル作成要求
function New-TeamsChannelFromRequest {
    param($RequestData)
    
    # Teams チャンネル作成
    # 権限設定
    # 通知送信
}

# SharePoint サイト作成要求
function New-SharePointSiteFromRequest {
    param($RequestData)
    
    # サイト作成
    # 権限設定
    # 初期設定
}
```

### 4. ⚡ 自動化処理設計

#### A. ワークフロー自動化
```powershell
# サービス要求種別別自動処理
$AutoProcessingRules = @{
    "user_creation" = @{
        RequiredApprovals = 2
        AutoExecute = $true
        SLAHours = 4
    }
    "software_install" = @{
        RequiredApprovals = 1
        AutoExecute = $true
        SLAHours = 24
    }
    "access_request" = @{
        RequiredApprovals = 1
        AutoExecute = $false
        SLAHours = 8
    }
}
```

#### B. PowerShellジョブ管理
```powershell
# バックグラウンドジョブでの処理実行
function Start-ServiceRequestJob {
    param(
        [string]$RequestId,
        [string]$JobType,
        [scriptblock]$ProcessingScript
    )
    
    # PowerShell Job として実行
    # 進捗監視
    # 結果記録
}
```

### 5. 🎯 API エンドポイント拡張

#### A. 新規エンドポイント
```
POST   /api/service-requests/{id}/approve     # 承認処理
POST   /api/service-requests/{id}/reject      # 却下処理
GET    /api/service-requests/workflow         # ワークフロー状況
POST   /api/service-requests/auto-process     # 自動処理開始
GET    /api/service-requests/integration      # Windows統合状況
```

#### B. PowerShell統合エンドポイント
```
POST   /api/powershell/execute-request        # PowerShell実行
GET    /api/powershell/jobs                   # ジョブ状況
POST   /api/windows/ad-integration            # AD統合
POST   /api/windows/m365-integration          # M365統合
```

### 6. 🔒 セキュリティ考慮事項

#### A. 権限管理
- 承認者権限の階層化
- Windows統合実行権限の制限
- 監査ログの完全記録

#### B. PowerShell実行セキュリティ
- スクリプト署名必須
- 実行ポリシー強制
- サンドボックス実行

### 7. 📊 監視・ログ設計

#### A. パフォーマンス監視
```powershell
# SLA監視
function Monitor-ServiceRequestSLA {
    # 期限超過チェック
    # エスカレーション処理
    # アラート送信
}

# Windows統合ジョブ監視
function Monitor-WindowsIntegrationJobs {
    # ジョブ状況監視
    # 失敗時の再試行
    # 通知処理
}
```

#### B. 監査ログ
- 全ての承認・却下記録
- Windows統合処理の詳細ログ
- PowerShell実行ログ

---

## 🎯 実装優先順位 (PowerShell観点)

### 高優先度
1. **承認ワークフロー機能** - 基本的な承認フロー
2. **Active Directory統合** - ユーザー管理要求の自動処理
3. **PowerShellジョブ管理** - バックグラウンド処理

### 中優先度
1. **Microsoft 365統合** - Teams/SharePoint連携
2. **SLA監視機能** - 期限管理・エスカレーション
3. **監査ログ強化** - 完全なトレーサビリティ

### 低優先度
1. **高度な自動化** - AI支援承認判定
2. **外部システム連携** - 他システムとのAPI統合
3. **レポート機能** - PowerBI連携

---

**Feature-D-PowerShell 設計完了**  
**共有準備**: 15分後統合レビュー対応可能