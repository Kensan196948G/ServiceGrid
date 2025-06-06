-- ITSM準拠IT運用システムプラットフォーム データベーススキーマ
-- SQLite用初期化スクリプト

-- 資産管理テーブル (拡張版 - assets-schema.sqlと統合)
CREATE TABLE assets (
  asset_id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_tag VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL DEFAULT 'Hardware',
  type VARCHAR(100),
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  location VARCHAR(200),
  department VARCHAR(100),
  owner VARCHAR(100),
  assigned_to VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  purchase_date DATE,
  purchase_cost DECIMAL(12,2),
  warranty_expiry DATE,
  last_maintenance DATE,
  next_maintenance DATE,
  ip_address VARCHAR(45),
  mac_address VARCHAR(17),
  operating_system VARCHAR(100),
  software_licenses TEXT, -- JSON array
  configuration TEXT, -- JSON object
  notes TEXT,
  tags TEXT, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  updated_by VARCHAR(100)
);

-- インシデント管理テーブル
CREATE TABLE incidents (
    incident_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    status TEXT,
    priority TEXT,
    assignee TEXT,
    reported_date DATE,
    resolved_date DATE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- サービス要求管理テーブル
CREATE TABLE service_requests (
    request_id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT,
    detail TEXT,
    status TEXT,
    applicant TEXT,
    requested_date DATE,
    approved_by TEXT,
    approved_date DATE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ナレッジ管理テーブル
CREATE TABLE knowledge (
    knowledge_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    category TEXT,
    created_by TEXT,
    created_date DATE,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 変更管理テーブル
CREATE TABLE changes (
    change_id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT,
    detail TEXT,
    status TEXT,
    requested_by TEXT,
    approved_by TEXT,
    request_date DATE,
    approve_date DATE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- リリース管理テーブル
CREATE TABLE releases (
    release_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    status TEXT,
    release_date DATE,
    responsible TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 問題管理テーブル
CREATE TABLE problems (
    problem_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    root_cause TEXT,
    status TEXT,
    registered_date DATE,
    closed_date DATE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 監査ログテーブル
CREATE TABLE logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT,
    event_time DATETIME,
    user TEXT,
    detail TEXT
);

-- ユーザー管理テーブル
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    display_name TEXT,
    email TEXT,
    last_login DATETIME,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked BOOLEAN DEFAULT FALSE,
    account_locked_until DATETIME,
    password_reset_token TEXT,
    password_reset_expires DATETIME,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT users_role_check CHECK (role IN ('administrator', 'operator', 'user', 'readonly')),
    CONSTRAINT users_email_check CHECK (email LIKE '%@%')
);

-- SLA管理テーブル
CREATE TABLE slas (
    sla_id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT,
    target_value REAL,
    actual_value REAL,
    measurement_date DATE,
    status TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- キャパシティ管理テーブル
CREATE TABLE capacity (
    capacity_id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_name TEXT,
    current_usage REAL,
    max_capacity REAL,
    threshold_percent REAL,
    measurement_date DATE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 可用性管理テーブル
CREATE TABLE availability (
    availability_id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT,
    uptime_percent REAL,
    downtime_minutes INTEGER,
    measurement_date DATE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 初期データ投入（パスワードハッシュ化版）
-- パスワード: admin123 (ハッシュ化後)
INSERT INTO users (username, password_hash, password_salt, role, display_name, email) 
VALUES ('admin', 'initial_hash_placeholder', 'initial_salt_placeholder', 'administrator', '管理者', 'admin@company.com');

-- パスワード: operator123 (ハッシュ化後) 
INSERT INTO users (username, password_hash, password_salt, role, display_name, email) 
VALUES ('operator', 'initial_hash_placeholder', 'initial_salt_placeholder', 'operator', 'オペレータ', 'operator@company.com');

-- コンプライアンス統制管理テーブル
CREATE TABLE compliance_controls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    control_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    standard TEXT NOT NULL CHECK (standard IN ('ISO27001/27002', '社内規定XYZ', 'その他')),
    category TEXT NOT NULL,
    responsible_team TEXT,
    status TEXT NOT NULL,
    last_audit_date DATE,
    next_audit_date DATE,
    evidence_links TEXT,
    notes TEXT,
    risk_level TEXT,
    cap_status TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- コンプライアンス監査管理テーブル
CREATE TABLE compliance_audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_name TEXT NOT NULL,
    standard TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Internal', 'External', 'Certification')),
    scheduled_start_date DATE NOT NULL,
    scheduled_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    status TEXT NOT NULL CHECK (status IN ('Planned', 'In Progress', 'Completed', 'On Hold', 'Cancelled')),
    lead_auditor TEXT,
    findings_count INTEGER DEFAULT 0,
    open_findings_count INTEGER DEFAULT 0,
    summary_url TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- コンプライアンスリスク管理テーブル
CREATE TABLE compliance_risks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    risk_description TEXT NOT NULL,
    related_control_id TEXT,
    related_standard TEXT,
    likelihood TEXT NOT NULL CHECK (likelihood IN ('Low', 'Medium', 'High', 'Critical')),
    impact TEXT NOT NULL CHECK (impact IN ('Low', 'Medium', 'High', 'Critical')),
    overall_risk TEXT NOT NULL CHECK (overall_risk IN ('Low', 'Medium', 'High', 'Critical')),
    mitigation_plan TEXT,
    responsible_team TEXT,
    status TEXT NOT NULL CHECK (status IN ('Open', 'Mitigating', 'Closed', 'Accepted')),
    due_date DATE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
-- ユーザー関連
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- 資産管理関連
CREATE INDEX idx_assets_tag ON assets(asset_tag);
CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_location ON assets(location);
CREATE INDEX idx_assets_assigned_to ON assets(assigned_to);
CREATE INDEX idx_assets_created_at ON assets(created_at);

-- インシデント管理関連
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_created_date ON incidents(created_date);

-- サービス要求関連
CREATE INDEX idx_service_requests_status ON service_requests(status);

-- ログ関連
CREATE INDEX idx_logs_event_time ON logs(event_time);
CREATE INDEX idx_logs_user ON logs(user);

-- コンプライアンス関連インデックス
CREATE INDEX idx_compliance_controls_control_id ON compliance_controls(control_id);
CREATE INDEX idx_compliance_controls_standard ON compliance_controls(standard);
CREATE INDEX idx_compliance_controls_status ON compliance_controls(status);
CREATE INDEX idx_compliance_audits_standard ON compliance_audits(standard);
CREATE INDEX idx_compliance_audits_status ON compliance_audits(status);
CREATE INDEX idx_compliance_risks_overall_risk ON compliance_risks(overall_risk);
CREATE INDEX idx_compliance_risks_status ON compliance_risks(status);

-- 資産管理テーブル用トリガー
-- 更新日時自動更新トリガー
CREATE TRIGGER update_assets_timestamp 
  AFTER UPDATE ON assets
  BEGIN
    UPDATE assets SET updated_at = CURRENT_TIMESTAMP WHERE asset_id = NEW.asset_id;
  END;

-- バリデーション制約
CREATE TRIGGER validate_asset_status
  BEFORE INSERT ON assets
  BEGIN
    SELECT CASE
      WHEN NEW.status NOT IN ('Active', 'Inactive', 'Maintenance', 'Retired', 'Lost', 'Stolen', 'Disposed')
      THEN RAISE(ABORT, 'Invalid asset status')
    END;
  END;

CREATE TRIGGER validate_asset_status_update
  BEFORE UPDATE ON assets
  BEGIN
    SELECT CASE
      WHEN NEW.status NOT IN ('Active', 'Inactive', 'Maintenance', 'Retired', 'Lost', 'Stolen', 'Disposed')
      THEN RAISE(ABORT, 'Invalid asset status')
    END;
  END;