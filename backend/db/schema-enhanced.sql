-- ITSM準拠IT運用システムプラットフォーム 強化版データベーススキーマ
-- SQLite用 - 外部キー制約と参照整合性を強化
-- 作成日: 2025年6月6日

-- 外部キー制約を有効化
PRAGMA foreign_keys = ON;

-- 既存テーブルを削除（開発環境での再作成用）
DROP TABLE IF EXISTS compliance_risks;
DROP TABLE IF EXISTS compliance_audits;
DROP TABLE IF EXISTS compliance_controls;
DROP TABLE IF EXISTS availability;
DROP TABLE IF EXISTS capacity;
DROP TABLE IF EXISTS slas;
DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS problems;
DROP TABLE IF EXISTS releases;
DROP TABLE IF EXISTS changes;
DROP TABLE IF EXISTS knowledge;
DROP TABLE IF EXISTS service_requests;
DROP TABLE IF EXISTS incidents;
DROP TABLE IF EXISTS assets;
DROP TABLE IF EXISTS users;

-- ========================================
-- 基幹テーブル: ユーザー管理
-- ========================================
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    display_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    department TEXT,
    manager_user_id INTEGER,
    last_login DATETIME,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked BOOLEAN DEFAULT FALSE,
    account_locked_until DATETIME,
    password_reset_token TEXT,
    password_reset_expires DATETIME,
    active BOOLEAN DEFAULT TRUE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT users_role_check CHECK (role IN ('administrator', 'operator', 'user', 'readonly')),
    CONSTRAINT users_email_check CHECK (email LIKE '%@%.%'),
    CONSTRAINT users_phone_check CHECK (phone IS NULL OR LENGTH(phone) >= 10),
    FOREIGN KEY (manager_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ========================================
-- 資産管理テーブル（CMDB）
-- ========================================
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
    owner_user_id INTEGER,
    assigned_user_id INTEGER,
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
    criticality TEXT DEFAULT 'Medium' CHECK (criticality IN ('Low', 'Medium', 'High', 'Critical')),
    environment TEXT DEFAULT 'Production' CHECK (environment IN ('Development', 'Test', 'Staging', 'Production')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    updated_by_user_id INTEGER,
    
    -- 制約
    CONSTRAINT assets_status_check CHECK (status IN ('Active', 'Inactive', 'Maintenance', 'Retired', 'Lost', 'Stolen', 'Disposed')),
    CONSTRAINT assets_category_check CHECK (category IN ('Hardware', 'Software', 'Network', 'Virtual', 'Cloud', 'Document', 'Service')),
    FOREIGN KEY (owner_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ========================================
-- インシデント管理テーブル
-- ========================================
CREATE TABLE incidents (
    incident_id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_number VARCHAR(20) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Open',
    priority TEXT NOT NULL DEFAULT 'Medium',
    severity TEXT DEFAULT 'Minor',
    category TEXT,
    subcategory TEXT,
    affected_asset_id INTEGER,
    reporter_user_id INTEGER,
    assignee_user_id INTEGER,
    resolver_user_id INTEGER,
    escalation_level INTEGER DEFAULT 0,
    reported_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    acknowledged_date DATETIME,
    resolved_date DATETIME,
    closed_date DATETIME,
    resolution_notes TEXT,
    workaround TEXT,
    root_cause TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    updated_by_user_id INTEGER,
    
    -- 制約
    CONSTRAINT incidents_status_check CHECK (status IN ('Open', 'In Progress', 'Pending', 'Resolved', 'Closed', 'Cancelled')),
    CONSTRAINT incidents_priority_check CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    CONSTRAINT incidents_severity_check CHECK (severity IN ('Minor', 'Major', 'Critical')),
    FOREIGN KEY (affected_asset_id) REFERENCES assets(asset_id) ON DELETE SET NULL,
    FOREIGN KEY (reporter_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (assignee_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (resolver_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ========================================
-- サービス要求管理テーブル
-- ========================================
CREATE TABLE service_requests (
    request_id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_number VARCHAR(20) UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    detail TEXT,
    status TEXT NOT NULL DEFAULT 'Submitted',
    category TEXT,
    subcategory TEXT,
    priority TEXT DEFAULT 'Medium',
    requested_item TEXT,
    business_justification TEXT,
    estimated_cost DECIMAL(12,2),
    requested_delivery_date DATE,
    requester_user_id INTEGER NOT NULL,
    approver_user_id INTEGER,
    fulfiller_user_id INTEGER,
    requested_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_date DATETIME,
    rejected_date DATETIME,
    completed_date DATETIME,
    rejection_reason TEXT,
    fulfillment_notes TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    updated_by_user_id INTEGER,
    
    -- 制約
    CONSTRAINT service_requests_status_check CHECK (status IN ('Submitted', 'Pending Approval', 'Approved', 'Rejected', 'In Progress', 'Fulfilled', 'Cancelled')),
    CONSTRAINT service_requests_priority_check CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    FOREIGN KEY (requester_user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (approver_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (fulfiller_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ========================================
-- 変更管理テーブル
-- ========================================
CREATE TABLE changes (
    change_id INTEGER PRIMARY KEY AUTOINCREMENT,
    change_number VARCHAR(20) UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    detail TEXT,
    status TEXT NOT NULL DEFAULT 'Requested',
    type TEXT DEFAULT 'Standard',
    priority TEXT DEFAULT 'Medium',
    risk_level TEXT DEFAULT 'Low',
    impact_level TEXT DEFAULT 'Low',
    change_reason TEXT,
    implementation_plan TEXT,
    backout_plan TEXT,
    test_plan TEXT,
    business_impact TEXT,
    requested_by_user_id INTEGER NOT NULL,
    approved_by_user_id INTEGER,
    implemented_by_user_id INTEGER,
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    approve_date DATETIME,
    scheduled_start_date DATETIME,
    scheduled_end_date DATETIME,
    actual_start_date DATETIME,
    actual_end_date DATETIME,
    implementation_status TEXT,
    post_implementation_review TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    updated_by_user_id INTEGER,
    
    -- 制約
    CONSTRAINT changes_status_check CHECK (status IN ('Requested', 'Pending CAB', 'Approved', 'Rejected', 'Scheduled', 'In Progress', 'Implemented', 'Failed', 'Cancelled')),
    CONSTRAINT changes_type_check CHECK (type IN ('Emergency', 'Normal', 'Standard')),
    CONSTRAINT changes_priority_check CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    CONSTRAINT changes_risk_level_check CHECK (risk_level IN ('Low', 'Medium', 'High')),
    CONSTRAINT changes_impact_level_check CHECK (impact_level IN ('Low', 'Medium', 'High')),
    FOREIGN KEY (requested_by_user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (implemented_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ========================================
-- 問題管理テーブル
-- ========================================
CREATE TABLE problems (
    problem_id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_number VARCHAR(20) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Logged',
    priority TEXT DEFAULT 'Medium',
    category TEXT,
    affected_service TEXT,
    workaround TEXT,
    root_cause TEXT,
    root_cause_analysis TEXT,
    permanent_solution TEXT,
    reporter_user_id INTEGER,
    assignee_user_id INTEGER,
    resolver_user_id INTEGER,
    registered_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    acknowledged_date DATETIME,
    resolved_date DATETIME,
    closed_date DATETIME,
    review_date DATETIME,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    updated_by_user_id INTEGER,
    
    -- 制約
    CONSTRAINT problems_status_check CHECK (status IN ('Logged', 'In Progress', 'Known Error', 'Resolved', 'Closed')),
    CONSTRAINT problems_priority_check CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    FOREIGN KEY (reporter_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (assignee_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (resolver_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ========================================
-- ナレッジ管理テーブル
-- ========================================
CREATE TABLE knowledge (
    knowledge_id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_number VARCHAR(20) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    category TEXT,
    tags TEXT, -- JSON array
    keywords TEXT,
    status TEXT DEFAULT 'Draft',
    approval_status TEXT DEFAULT 'Pending',
    version INTEGER DEFAULT 1,
    language TEXT DEFAULT 'ja',
    view_count INTEGER DEFAULT 0,
    rating_total INTEGER DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    author_user_id INTEGER NOT NULL,
    reviewer_user_id INTEGER,
    approved_by_user_id INTEGER,
    published_date DATETIME,
    review_date DATETIME,
    expiry_date DATETIME,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    updated_by_user_id INTEGER,
    
    -- 制約
    CONSTRAINT knowledge_status_check CHECK (status IN ('Draft', 'Under Review', 'Published', 'Archived', 'Retired')),
    CONSTRAINT knowledge_approval_status_check CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')),
    CONSTRAINT knowledge_language_check CHECK (language IN ('ja', 'en')),
    FOREIGN KEY (author_user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (reviewer_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ========================================
-- リリース管理テーブル
-- ========================================
CREATE TABLE releases (
    release_id INTEGER PRIMARY KEY AUTOINCREMENT,
    release_number VARCHAR(20) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Planning',
    type TEXT DEFAULT 'Minor',
    priority TEXT DEFAULT 'Medium',
    release_manager_user_id INTEGER,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    go_live_date DATE,
    deployment_notes TEXT,
    rollback_plan TEXT,
    success_criteria TEXT,
    responsible_team TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    updated_by_user_id INTEGER,
    
    -- 制約
    CONSTRAINT releases_status_check CHECK (status IN ('Planning', 'In Development', 'Ready for Testing', 'Testing', 'Ready for Deployment', 'Deployed', 'Closed', 'Cancelled')),
    CONSTRAINT releases_type_check CHECK (type IN ('Major', 'Minor', 'Emergency', 'Patch')),
    CONSTRAINT releases_priority_check CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    FOREIGN KEY (release_manager_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ========================================
-- SLA管理テーブル
-- ========================================
CREATE TABLE slas (
    sla_id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    target_value REAL NOT NULL,
    actual_value REAL,
    unit TEXT,
    measurement_period TEXT DEFAULT 'Monthly',
    measurement_date DATE NOT NULL,
    status TEXT DEFAULT 'Met',
    breach_reason TEXT,
    corrective_action TEXT,
    responsible_team TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    
    -- 制約
    CONSTRAINT slas_metric_type_check CHECK (metric_type IN ('Availability', 'Performance', 'Response Time', 'Resolution Time', 'Quality')),
    CONSTRAINT slas_status_check CHECK (status IN ('Met', 'Breached', 'At Risk', 'Unknown')),
    CONSTRAINT slas_measurement_period_check CHECK (measurement_period IN ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually')),
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ========================================
-- キャパシティ管理テーブル
-- ========================================
CREATE TABLE capacity (
    capacity_id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_name TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    current_usage REAL NOT NULL,
    max_capacity REAL NOT NULL,
    threshold_warning REAL DEFAULT 80.0,
    threshold_critical REAL DEFAULT 90.0,
    usage_percent REAL GENERATED ALWAYS AS (ROUND((current_usage * 100.0) / max_capacity, 2)) VIRTUAL,
    unit TEXT,
    location TEXT,
    measurement_date DATETIME NOT NULL,
    forecast_3months REAL,
    forecast_6months REAL,
    forecast_12months REAL,
    status TEXT DEFAULT 'Normal',
    notes TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    
    -- 制約
    CONSTRAINT capacity_resource_type_check CHECK (resource_type IN ('CPU', 'Memory', 'Storage', 'Network', 'Database', 'Application', 'Other')),
    CONSTRAINT capacity_status_check CHECK (status IN ('Normal', 'Warning', 'Critical', 'Exceeded')),
    CONSTRAINT capacity_usage_check CHECK (current_usage >= 0 AND max_capacity > 0),
    CONSTRAINT capacity_threshold_check CHECK (threshold_warning <= threshold_critical),
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ========================================
-- 可用性管理テーブル
-- ========================================
CREATE TABLE availability (
    availability_id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT NOT NULL,
    service_type TEXT DEFAULT 'Application',
    measurement_period TEXT NOT NULL,
    period_start_date DATETIME NOT NULL,
    period_end_date DATETIME NOT NULL,
    total_minutes INTEGER NOT NULL,
    downtime_minutes INTEGER DEFAULT 0,
    planned_downtime_minutes INTEGER DEFAULT 0,
    unplanned_downtime_minutes INTEGER DEFAULT 0,
    uptime_percent REAL GENERATED ALWAYS AS (ROUND(((total_minutes - downtime_minutes) * 100.0) / total_minutes, 4)) VIRTUAL,
    availability_target REAL DEFAULT 99.9,
    sla_met BOOLEAN GENERATED ALWAYS AS (uptime_percent >= availability_target) VIRTUAL,
    major_incidents_count INTEGER DEFAULT 0,
    minor_incidents_count INTEGER DEFAULT 0,
    maintenance_windows_count INTEGER DEFAULT 0,
    notes TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    
    -- 制約
    CONSTRAINT availability_service_type_check CHECK (service_type IN ('Application', 'Infrastructure', 'Network', 'Database', 'Platform', 'Other')),
    CONSTRAINT availability_period_check CHECK (measurement_period IN ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually')),
    CONSTRAINT availability_downtime_check CHECK (downtime_minutes <= total_minutes),
    CONSTRAINT availability_planned_downtime_check CHECK (planned_downtime_minutes <= downtime_minutes),
    CONSTRAINT availability_dates_check CHECK (period_end_date > period_start_date),
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ========================================
-- 監査ログテーブル
-- ========================================
CREATE TABLE logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    event_subtype TEXT,
    event_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    username TEXT,
    source_ip TEXT,
    user_agent TEXT,
    session_id TEXT,
    resource_type TEXT,
    resource_id TEXT,
    action TEXT NOT NULL,
    target_table TEXT,
    target_record_id INTEGER,
    old_values TEXT, -- JSON
    new_values TEXT, -- JSON
    result TEXT DEFAULT 'Success',
    error_message TEXT,
    severity TEXT DEFAULT 'Info',
    details TEXT,
    correlation_id TEXT,
    
    -- 制約
    CONSTRAINT logs_event_type_check CHECK (event_type IN ('Authentication', 'Authorization', 'Data Access', 'Data Modification', 'System', 'Security', 'Audit')),
    CONSTRAINT logs_action_check CHECK (action IN ('Create', 'Read', 'Update', 'Delete', 'Login', 'Logout', 'Failed Login', 'Password Change', 'Other')),
    CONSTRAINT logs_result_check CHECK (result IN ('Success', 'Failure', 'Warning')),
    CONSTRAINT logs_severity_check CHECK (severity IN ('Debug', 'Info', 'Warning', 'Error', 'Critical')),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ========================================
-- コンプライアンス統制管理テーブル
-- ========================================
CREATE TABLE compliance_controls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    control_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    standard TEXT NOT NULL,
    framework TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    control_type TEXT DEFAULT 'Manual',
    frequency TEXT DEFAULT 'Annual',
    responsible_team TEXT,
    responsible_user_id INTEGER,
    owner_user_id INTEGER,
    status TEXT NOT NULL DEFAULT 'Active',
    implementation_status TEXT DEFAULT 'Not Implemented',
    effectiveness TEXT DEFAULT 'Unknown',
    risk_level TEXT DEFAULT 'Medium',
    last_audit_date DATE,
    next_audit_date DATE,
    last_test_date DATE,
    next_test_date DATE,
    evidence_location TEXT,
    evidence_links TEXT,
    automation_level TEXT DEFAULT 'Manual',
    cost_estimate DECIMAL(12,2),
    notes TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    updated_by_user_id INTEGER,
    
    -- 制約
    CONSTRAINT compliance_controls_standard_check CHECK (standard IN ('ISO27001/27002', '社内規定XYZ', 'PCI DSS', 'GDPR', 'SOX', '個人情報保護法', 'その他')),
    CONSTRAINT compliance_controls_type_check CHECK (control_type IN ('Preventive', 'Detective', 'Corrective', 'Manual', 'Automated', 'Hybrid')),
    CONSTRAINT compliance_controls_frequency_check CHECK (frequency IN ('Continuous', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Ad-hoc')),
    CONSTRAINT compliance_controls_status_check CHECK (status IN ('Active', 'Inactive', 'Deprecated', 'Under Review')),
    CONSTRAINT compliance_controls_implementation_check CHECK (implementation_status IN ('Not Implemented', 'Partially Implemented', 'Implemented', 'Needs Improvement')),
    CONSTRAINT compliance_controls_effectiveness_check CHECK (effectiveness IN ('Effective', 'Partially Effective', 'Ineffective', 'Unknown')),
    CONSTRAINT compliance_controls_risk_check CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
    CONSTRAINT compliance_controls_automation_check CHECK (automation_level IN ('Manual', 'Semi-Automated', 'Fully Automated')),
    FOREIGN KEY (responsible_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (owner_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ========================================
-- コンプライアンス監査管理テーブル
-- ========================================
CREATE TABLE compliance_audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_number VARCHAR(20) UNIQUE NOT NULL,
    audit_name TEXT NOT NULL,
    description TEXT,
    standard TEXT NOT NULL,
    framework TEXT,
    scope TEXT,
    type TEXT NOT NULL,
    scheduled_start_date DATE NOT NULL,
    scheduled_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    status TEXT NOT NULL DEFAULT 'Planned',
    lead_auditor_user_id INTEGER,
    internal_auditor_user_id INTEGER,
    external_auditor_company TEXT,
    audit_criteria TEXT,
    audit_methodology TEXT,
    findings_count INTEGER DEFAULT 0,
    high_findings_count INTEGER DEFAULT 0,
    medium_findings_count INTEGER DEFAULT 0,
    low_findings_count INTEGER DEFAULT 0,
    open_findings_count INTEGER DEFAULT 0,
    closed_findings_count INTEGER DEFAULT 0,
    overall_conclusion TEXT,
    recommendations TEXT,
    management_response TEXT,
    follow_up_date DATE,
    certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_expiry_date DATE,
    report_url TEXT,
    summary_url TEXT,
    cost DECIMAL(12,2),
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    updated_by_user_id INTEGER,
    
    -- 制約
    CONSTRAINT compliance_audits_type_check CHECK (type IN ('Internal', 'External', 'Certification', 'Regulatory', 'Vendor')),
    CONSTRAINT compliance_audits_status_check CHECK (status IN ('Planned', 'In Progress', 'Field Work Complete', 'Draft Report', 'Final Report', 'Completed', 'On Hold', 'Cancelled')),
    CONSTRAINT compliance_audits_dates_check CHECK (scheduled_end_date >= scheduled_start_date),
    FOREIGN KEY (lead_auditor_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (internal_auditor_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ========================================
-- コンプライアンスリスク管理テーブル
-- ========================================
CREATE TABLE compliance_risks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    risk_id VARCHAR(20) UNIQUE NOT NULL,
    risk_title TEXT NOT NULL,
    risk_description TEXT NOT NULL,
    related_control_id TEXT,
    related_standard TEXT,
    risk_category TEXT,
    threat_source TEXT,
    vulnerability TEXT,
    likelihood TEXT NOT NULL,
    impact TEXT NOT NULL,
    inherent_risk TEXT NOT NULL,
    control_effectiveness TEXT DEFAULT 'Unknown',
    residual_risk TEXT NOT NULL,
    risk_appetite TEXT DEFAULT 'Medium',
    risk_tolerance TEXT DEFAULT 'Medium',
    mitigation_strategy TEXT,
    mitigation_plan TEXT,
    contingency_plan TEXT,
    responsible_team TEXT,
    risk_owner_user_id INTEGER,
    status TEXT NOT NULL DEFAULT 'Open',
    priority TEXT DEFAULT 'Medium',
    identified_date DATE DEFAULT (DATE('now')),
    review_date DATE,
    closure_date DATE,
    due_date DATE,
    cost_of_mitigation DECIMAL(12,2),
    potential_loss DECIMAL(12,2),
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    updated_by_user_id INTEGER,
    
    -- 制約
    CONSTRAINT compliance_risks_likelihood_check CHECK (likelihood IN ('Very Low', 'Low', 'Medium', 'High', 'Very High')),
    CONSTRAINT compliance_risks_impact_check CHECK (impact IN ('Very Low', 'Low', 'Medium', 'High', 'Very High')),
    CONSTRAINT compliance_risks_inherent_risk_check CHECK (inherent_risk IN ('Very Low', 'Low', 'Medium', 'High', 'Very High')),
    CONSTRAINT compliance_risks_residual_risk_check CHECK (residual_risk IN ('Very Low', 'Low', 'Medium', 'High', 'Very High')),
    CONSTRAINT compliance_risks_status_check CHECK (status IN ('Open', 'Mitigating', 'Monitoring', 'Closed', 'Accepted', 'Transferred')),
    CONSTRAINT compliance_risks_priority_check CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    CONSTRAINT compliance_risks_appetite_check CHECK (risk_appetite IN ('Very Low', 'Low', 'Medium', 'High', 'Very High')),
    CONSTRAINT compliance_risks_tolerance_check CHECK (risk_tolerance IN ('Very Low', 'Low', 'Medium', 'High', 'Very High')),
    CONSTRAINT compliance_risks_effectiveness_check CHECK (control_effectiveness IN ('Ineffective', 'Partially Effective', 'Effective', 'Unknown')),
    FOREIGN KEY (related_control_id) REFERENCES compliance_controls(control_id) ON DELETE SET NULL,
    FOREIGN KEY (risk_owner_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ========================================
-- 関連テーブル: インシデント-問題の関連
-- ========================================
CREATE TABLE incident_problem_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,
    relationship_type TEXT DEFAULT 'Caused By',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    
    -- 制約
    CONSTRAINT incident_problem_rel_type_check CHECK (relationship_type IN ('Caused By', 'Related To', 'Duplicate Of')),
    FOREIGN KEY (incident_id) REFERENCES incidents(incident_id) ON DELETE CASCADE,
    FOREIGN KEY (problem_id) REFERENCES problems(problem_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    UNIQUE(incident_id, problem_id, relationship_type)
);

-- ========================================
-- 関連テーブル: 変更-リリースの関連
-- ========================================
CREATE TABLE change_release_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    change_id INTEGER NOT NULL,
    release_id INTEGER NOT NULL,
    relationship_type TEXT DEFAULT 'Included In',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    
    -- 制約
    CONSTRAINT change_release_rel_type_check CHECK (relationship_type IN ('Included In', 'Enables', 'Depends On')),
    FOREIGN KEY (change_id) REFERENCES changes(change_id) ON DELETE CASCADE,
    FOREIGN KEY (release_id) REFERENCES releases(release_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    UNIQUE(change_id, release_id, relationship_type)
);

-- ========================================
-- インデックス作成 - パフォーマンス最適化
-- ========================================

-- ユーザー関連インデックス
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(active);
CREATE INDEX idx_users_department ON users(department);

-- 資産管理関連インデックス
CREATE INDEX idx_assets_tag ON assets(asset_tag);
CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_type ON assets(type);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_location ON assets(location);
CREATE INDEX idx_assets_owner ON assets(owner_user_id);
CREATE INDEX idx_assets_assigned ON assets(assigned_user_id);
CREATE INDEX idx_assets_created_at ON assets(created_at);
CREATE INDEX idx_assets_criticality ON assets(criticality);
CREATE INDEX idx_assets_environment ON assets(environment);

-- インシデント管理関連インデックス
CREATE INDEX idx_incidents_number ON incidents(incident_number);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_assignee ON incidents(assignee_user_id);
CREATE INDEX idx_incidents_reporter ON incidents(reporter_user_id);
CREATE INDEX idx_incidents_created_date ON incidents(created_date);
CREATE INDEX idx_incidents_resolved_date ON incidents(resolved_date);

-- サービス要求関連インデックス
CREATE INDEX idx_service_requests_number ON service_requests(request_number);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_priority ON service_requests(priority);
CREATE INDEX idx_service_requests_requester ON service_requests(requester_user_id);
CREATE INDEX idx_service_requests_created_date ON service_requests(created_date);

-- 変更管理関連インデックス
CREATE INDEX idx_changes_number ON changes(change_number);
CREATE INDEX idx_changes_status ON changes(status);
CREATE INDEX idx_changes_type ON changes(type);
CREATE INDEX idx_changes_priority ON changes(priority);
CREATE INDEX idx_changes_risk_level ON changes(risk_level);
CREATE INDEX idx_changes_requested_by ON changes(requested_by_user_id);
CREATE INDEX idx_changes_request_date ON changes(request_date);

-- 問題管理関連インデックス
CREATE INDEX idx_problems_number ON problems(problem_number);
CREATE INDEX idx_problems_status ON problems(status);
CREATE INDEX idx_problems_priority ON problems(priority);
CREATE INDEX idx_problems_assignee ON problems(assignee_user_id);
CREATE INDEX idx_problems_created_date ON problems(created_date);

-- ナレッジ管理関連インデックス
CREATE INDEX idx_knowledge_number ON knowledge(article_number);
CREATE INDEX idx_knowledge_status ON knowledge(status);
CREATE INDEX idx_knowledge_category ON knowledge(category);
CREATE INDEX idx_knowledge_author ON knowledge(author_user_id);
CREATE INDEX idx_knowledge_created_date ON knowledge(created_date);

-- リリース管理関連インデックス
CREATE INDEX idx_releases_number ON releases(release_number);
CREATE INDEX idx_releases_status ON releases(status);
CREATE INDEX idx_releases_type ON releases(type);
CREATE INDEX idx_releases_manager ON releases(release_manager_user_id);
CREATE INDEX idx_releases_go_live_date ON releases(go_live_date);

-- SLA管理関連インデックス
CREATE INDEX idx_slas_service_name ON slas(service_name);
CREATE INDEX idx_slas_metric_type ON slas(metric_type);
CREATE INDEX idx_slas_measurement_date ON slas(measurement_date);
CREATE INDEX idx_slas_status ON slas(status);

-- キャパシティ管理関連インデックス
CREATE INDEX idx_capacity_resource_name ON capacity(resource_name);
CREATE INDEX idx_capacity_resource_type ON capacity(resource_type);
CREATE INDEX idx_capacity_measurement_date ON capacity(measurement_date);
CREATE INDEX idx_capacity_status ON capacity(status);

-- 可用性管理関連インデックス
CREATE INDEX idx_availability_service_name ON availability(service_name);
CREATE INDEX idx_availability_service_type ON availability(service_type);
CREATE INDEX idx_availability_period_start ON availability(period_start_date);
CREATE INDEX idx_availability_period_end ON availability(period_end_date);

-- ログ関連インデックス
CREATE INDEX idx_logs_event_time ON logs(event_time);
CREATE INDEX idx_logs_event_type ON logs(event_type);
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_username ON logs(username);
CREATE INDEX idx_logs_action ON logs(action);
CREATE INDEX idx_logs_target_table ON logs(target_table);
CREATE INDEX idx_logs_severity ON logs(severity);
CREATE INDEX idx_logs_result ON logs(result);

-- コンプライアンス関連インデックス
CREATE INDEX idx_compliance_controls_control_id ON compliance_controls(control_id);
CREATE INDEX idx_compliance_controls_standard ON compliance_controls(standard);
CREATE INDEX idx_compliance_controls_status ON compliance_controls(status);
CREATE INDEX idx_compliance_controls_responsible ON compliance_controls(responsible_user_id);

CREATE INDEX idx_compliance_audits_number ON compliance_audits(audit_number);
CREATE INDEX idx_compliance_audits_standard ON compliance_audits(standard);
CREATE INDEX idx_compliance_audits_status ON compliance_audits(status);
CREATE INDEX idx_compliance_audits_lead_auditor ON compliance_audits(lead_auditor_user_id);

CREATE INDEX idx_compliance_risks_risk_id ON compliance_risks(risk_id);
CREATE INDEX idx_compliance_risks_inherent_risk ON compliance_risks(inherent_risk);
CREATE INDEX idx_compliance_risks_residual_risk ON compliance_risks(residual_risk);
CREATE INDEX idx_compliance_risks_status ON compliance_risks(status);
CREATE INDEX idx_compliance_risks_owner ON compliance_risks(risk_owner_user_id);

-- ========================================
-- トリガー作成 - 自動化とデータ整合性
-- ========================================

-- 更新日時自動更新トリガー
CREATE TRIGGER update_users_timestamp 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_date = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
    END;

CREATE TRIGGER update_assets_timestamp 
    AFTER UPDATE ON assets
    BEGIN
        UPDATE assets SET updated_at = CURRENT_TIMESTAMP WHERE asset_id = NEW.asset_id;
    END;

CREATE TRIGGER update_incidents_timestamp 
    AFTER UPDATE ON incidents
    BEGIN
        UPDATE incidents SET updated_date = CURRENT_TIMESTAMP WHERE incident_id = NEW.incident_id;
    END;

CREATE TRIGGER update_service_requests_timestamp 
    AFTER UPDATE ON service_requests
    BEGIN
        UPDATE service_requests SET updated_date = CURRENT_TIMESTAMP WHERE request_id = NEW.request_id;
    END;

CREATE TRIGGER update_changes_timestamp 
    AFTER UPDATE ON changes
    BEGIN
        UPDATE changes SET updated_date = CURRENT_TIMESTAMP WHERE change_id = NEW.change_id;
    END;

CREATE TRIGGER update_problems_timestamp 
    AFTER UPDATE ON problems
    BEGIN
        UPDATE problems SET updated_date = CURRENT_TIMESTAMP WHERE problem_id = NEW.problem_id;
    END;

CREATE TRIGGER update_knowledge_timestamp 
    AFTER UPDATE ON knowledge
    BEGIN
        UPDATE knowledge SET updated_date = CURRENT_TIMESTAMP WHERE knowledge_id = NEW.knowledge_id;
    END;

CREATE TRIGGER update_releases_timestamp 
    AFTER UPDATE ON releases
    BEGIN
        UPDATE releases SET updated_date = CURRENT_TIMESTAMP WHERE release_id = NEW.release_id;
    END;

CREATE TRIGGER update_slas_timestamp 
    AFTER UPDATE ON slas
    BEGIN
        UPDATE slas SET updated_date = CURRENT_TIMESTAMP WHERE sla_id = NEW.sla_id;
    END;

CREATE TRIGGER update_compliance_controls_timestamp 
    AFTER UPDATE ON compliance_controls
    BEGIN
        UPDATE compliance_controls SET updated_date = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_compliance_audits_timestamp 
    AFTER UPDATE ON compliance_audits
    BEGIN
        UPDATE compliance_audits SET updated_date = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_compliance_risks_timestamp 
    AFTER UPDATE ON compliance_risks
    BEGIN
        UPDATE compliance_risks SET updated_date = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- 自動番号生成トリガー
CREATE TRIGGER generate_incident_number
    AFTER INSERT ON incidents
    WHEN NEW.incident_number IS NULL
    BEGIN
        UPDATE incidents 
        SET incident_number = 'INC-' || SUBSTR('000000' || NEW.incident_id, -6)
        WHERE incident_id = NEW.incident_id;
    END;

CREATE TRIGGER generate_service_request_number
    AFTER INSERT ON service_requests
    WHEN NEW.request_number IS NULL
    BEGIN
        UPDATE service_requests 
        SET request_number = 'REQ-' || SUBSTR('000000' || NEW.request_id, -6)
        WHERE request_id = NEW.request_id;
    END;

CREATE TRIGGER generate_change_number
    AFTER INSERT ON changes
    WHEN NEW.change_number IS NULL
    BEGIN
        UPDATE changes 
        SET change_number = 'CHG-' || SUBSTR('000000' || NEW.change_id, -6)
        WHERE change_id = NEW.change_id;
    END;

CREATE TRIGGER generate_problem_number
    AFTER INSERT ON problems
    WHEN NEW.problem_number IS NULL
    BEGIN
        UPDATE problems 
        SET problem_number = 'PRB-' || SUBSTR('000000' || NEW.problem_id, -6)
        WHERE problem_id = NEW.problem_id;
    END;

CREATE TRIGGER generate_knowledge_number
    AFTER INSERT ON knowledge
    WHEN NEW.article_number IS NULL
    BEGIN
        UPDATE knowledge 
        SET article_number = 'KB-' || SUBSTR('000000' || NEW.knowledge_id, -6)
        WHERE knowledge_id = NEW.knowledge_id;
    END;

CREATE TRIGGER generate_release_number
    AFTER INSERT ON releases
    WHEN NEW.release_number IS NULL
    BEGIN
        UPDATE releases 
        SET release_number = 'REL-' || SUBSTR('000000' || NEW.release_id, -6)
        WHERE release_id = NEW.release_id;
    END;

CREATE TRIGGER generate_audit_number
    AFTER INSERT ON compliance_audits
    WHEN NEW.audit_number IS NULL
    BEGIN
        UPDATE compliance_audits 
        SET audit_number = 'AUD-' || SUBSTR('000000' || NEW.id, -6)
        WHERE id = NEW.id;
    END;

CREATE TRIGGER generate_risk_id
    AFTER INSERT ON compliance_risks
    WHEN NEW.risk_id IS NULL
    BEGIN
        UPDATE compliance_risks 
        SET risk_id = 'RISK-' || SUBSTR('000000' || NEW.id, -6)
        WHERE id = NEW.id;
    END;

-- 監査ログ自動記録トリガー
CREATE TRIGGER log_user_changes
    AFTER UPDATE ON users
    BEGIN
        INSERT INTO logs (event_type, event_subtype, user_id, username, action, target_table, target_record_id, old_values, new_values, details)
        VALUES (
            'Data Modification',
            'User Update',
            NEW.user_id,
            NEW.username,
            'Update',
            'users',
            NEW.user_id,
            json_object('username', OLD.username, 'role', OLD.role, 'email', OLD.email, 'active', OLD.active),
            json_object('username', NEW.username, 'role', NEW.role, 'email', NEW.email, 'active', NEW.active),
            'User record updated'
        );
    END;

CREATE TRIGGER log_asset_changes
    AFTER UPDATE ON assets
    BEGIN
        INSERT INTO logs (event_type, event_subtype, user_id, action, target_table, target_record_id, old_values, new_values, details)
        VALUES (
            'Data Modification',
            'Asset Update',
            NEW.updated_by_user_id,
            'Update',
            'assets',
            NEW.asset_id,
            json_object('asset_tag', OLD.asset_tag, 'name', OLD.name, 'status', OLD.status, 'assigned_user_id', OLD.assigned_user_id),
            json_object('asset_tag', NEW.asset_tag, 'name', NEW.name, 'status', NEW.status, 'assigned_user_id', NEW.assigned_user_id),
            'Asset record updated: ' || NEW.asset_tag
        );
    END;

-- 数据一致性检查触发器
CREATE TRIGGER check_incident_dates
    BEFORE UPDATE ON incidents
    BEGIN
        SELECT CASE
            WHEN NEW.resolved_date IS NOT NULL AND NEW.reported_date IS NOT NULL AND NEW.resolved_date < NEW.reported_date
            THEN RAISE(ABORT, 'Resolved date cannot be earlier than reported date')
            WHEN NEW.closed_date IS NOT NULL AND NEW.resolved_date IS NOT NULL AND NEW.closed_date < NEW.resolved_date
            THEN RAISE(ABORT, 'Closed date cannot be earlier than resolved date')
        END;
    END;

CREATE TRIGGER check_change_dates
    BEFORE UPDATE ON changes
    BEGIN
        SELECT CASE
            WHEN NEW.scheduled_end_date IS NOT NULL AND NEW.scheduled_start_date IS NOT NULL AND NEW.scheduled_end_date < NEW.scheduled_start_date
            THEN RAISE(ABORT, 'Scheduled end date cannot be earlier than start date')
            WHEN NEW.actual_end_date IS NOT NULL AND NEW.actual_start_date IS NOT NULL AND NEW.actual_end_date < NEW.actual_start_date
            THEN RAISE(ABORT, 'Actual end date cannot be earlier than start date')
        END;
    END;

-- ========================================
-- 初期データ投入
-- ========================================

-- 管理者ユーザー作成（パスワードは別途ハッシュ化が必要）
INSERT INTO users (username, password_hash, password_salt, role, display_name, email, department, active) 
VALUES 
    ('admin', 'initial_hash_placeholder', 'initial_salt_placeholder', 'administrator', '管理者', 'admin@company.com', 'IT部', TRUE),
    ('operator', 'initial_hash_placeholder', 'initial_salt_placeholder', 'operator', 'オペレータ', 'operator@company.com', 'IT部', TRUE),
    ('user1', 'initial_hash_placeholder', 'initial_salt_placeholder', 'user', '一般ユーザー1', 'user1@company.com', '営業部', TRUE),
    ('readonly', 'initial_hash_placeholder', 'initial_salt_placeholder', 'readonly', '閲覧ユーザー', 'readonly@company.com', '経理部', TRUE);

-- サンプル資産データ
INSERT INTO assets (asset_tag, name, category, type, status, location, owner_user_id, created_by_user_id) 
VALUES 
    ('SRV-001', 'Webサーバー1', 'Hardware', 'Server', 'Active', 'データセンターA', 1, 1),
    ('DSK-001', '営業部PC1', 'Hardware', 'Desktop', 'Active', '営業部フロア', 3, 1),
    ('NET-001', 'コアスイッチ', 'Hardware', 'Network Equipment', 'Active', 'サーバールーム', 1, 1);

-- サンプルSLAデータ
INSERT INTO slas (service_name, metric_name, metric_type, target_value, actual_value, unit, measurement_date, status, created_by_user_id)
VALUES 
    ('Webサービス', 'システム可用性', 'Availability', 99.9, 99.95, '%', DATE('now'), 'Met', 1),
    ('メールサービス', 'レスポンス時間', 'Response Time', 2.0, 1.8, '秒', DATE('now'), 'Met', 1),
    ('ファイルサーバー', 'システム可用性', 'Availability', 99.5, 98.2, '%', DATE('now'), 'Breached', 1);

-- サンプルコンプライアンス統制
INSERT INTO compliance_controls (control_id, name, description, standard, category, responsible_user_id, status, created_by_user_id)
VALUES 
    ('ISO-AC-001', 'アクセス制御ポリシー', 'システムへのアクセス制御に関する統制', 'ISO27001/27002', 'アクセス制御', 1, 'Active', 1),
    ('ISO-IA-001', '情報資産管理', '重要な情報資産の特定と管理', 'ISO27001/27002', '情報資産管理', 1, 'Active', 1),
    ('SEC-001', 'パスワードポリシー', 'パスワードの複雑性と変更頻度', '社内規定XYZ', 'セキュリティ', 2, 'Active', 1);

-- 設定完了メッセージ
-- SELECT 'Enhanced ITSM database schema created successfully with foreign key constraints!' as Status;