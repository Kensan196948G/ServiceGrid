-- サービス要求管理モジュール - 拡張スキーマ
-- PowerShell統合対応版
-- Version: 1.0.0

-- 既存 service_requests テーブル拡張（IF NOT EXISTS対応）
ALTER TABLE service_requests ADD COLUMN request_type VARCHAR(50) DEFAULT 'general';
-- priority列は既存の可能性があるためスキップ
-- ALTER TABLE service_requests ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE service_requests ADD COLUMN approval_level INTEGER DEFAULT 1;
ALTER TABLE service_requests ADD COLUMN auto_processing BOOLEAN DEFAULT FALSE;
ALTER TABLE service_requests ADD COLUMN sla_target_hours INTEGER DEFAULT 24;
ALTER TABLE service_requests ADD COLUMN escalation_level INTEGER DEFAULT 0;
ALTER TABLE service_requests ADD COLUMN integration_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE service_requests ADD COLUMN windows_task_id VARCHAR(100);
ALTER TABLE service_requests ADD COLUMN powershell_job_id VARCHAR(100);

-- サービス要求承認テーブル
CREATE TABLE IF NOT EXISTS service_request_approvals (
    approval_id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    approver_id VARCHAR(100) NOT NULL,
    approval_level INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    comments TEXT,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES service_requests(request_id)
);

-- Windows統合ジョブテーブル
CREATE TABLE IF NOT EXISTS windows_integration_jobs (
    job_id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    job_status VARCHAR(20) NOT NULL DEFAULT 'queued',
    powershell_script TEXT,
    execution_result TEXT,
    error_message TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES service_requests(request_id)
);

-- サービス要求種別マスタテーブル
CREATE TABLE IF NOT EXISTS service_request_types (
    type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    required_approval_levels INTEGER DEFAULT 1,
    auto_processing_enabled BOOLEAN DEFAULT FALSE,
    sla_hours INTEGER DEFAULT 24,
    powershell_integration BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 初期データ投入
INSERT OR IGNORE INTO service_request_types (type_name, display_name, description, required_approval_levels, auto_processing_enabled, sla_hours, powershell_integration) VALUES
('user_creation', 'ユーザー作成', 'Active Directoryユーザーアカウント作成', 2, 1, 4, 1),
('group_access', 'グループアクセス', 'Active Directoryグループアクセス権限付与', 1, 1, 8, 1),
('software_install', 'ソフトウェアインストール', 'ソフトウェアの自動インストール', 1, 1, 24, 1),
('password_reset', 'パスワードリセット', 'ユーザーパスワードのリセット', 1, 1, 2, 1);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_service_request_approvals_request_id ON service_request_approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_windows_integration_jobs_request_id ON windows_integration_jobs(request_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_type ON service_requests(request_type);