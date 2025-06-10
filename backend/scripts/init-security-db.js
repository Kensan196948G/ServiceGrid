// セキュリティ管理データベース初期化スクリプト
// 作成日: 2025年6月10日

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../db/itsm.sqlite');

console.log('🛡️ セキュリティ管理データベースの初期化を開始...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ データベース接続エラー:', err);
    return;
  }
  console.log('✅ データベースに接続しました');
});

// セキュリティイベントテーブル
const createSecurityEventsTable = `
CREATE TABLE IF NOT EXISTS security_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    source_system VARCHAR(100),
    source_ip VARCHAR(45),
    target_asset VARCHAR(200),
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    assigned_to VARCHAR(100),
    indicators TEXT, -- JSON array
    mitigation_steps TEXT, -- JSON array
    evidence TEXT, -- JSON object
    resolution_notes TEXT,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// セキュリティポリシーテーブル
const createSecurityPoliciesTable = `
CREATE TABLE IF NOT EXISTS security_policies (
    policy_id INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    policy_content TEXT,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Draft', 'Under Review', 'Active', 'Archived')),
    compliance_level VARCHAR(50),
    applicable_systems TEXT, -- JSON array
    owner VARCHAR(100),
    approver VARCHAR(100),
    effective_date DATE,
    review_frequency INTEGER, -- months
    last_review_date DATE,
    next_review_date DATE,
    version VARCHAR(20) DEFAULT '1.0',
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// 脆弱性管理テーブル
const createVulnerabilitiesTable = `
CREATE TABLE IF NOT EXISTS vulnerabilities (
    vuln_id INTEGER PRIMARY KEY AUTOINCREMENT,
    vulnerability_name VARCHAR(200) NOT NULL,
    cve_id VARCHAR(50),
    severity VARCHAR(20) DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    cvss_score DECIMAL(3,1),
    affected_system VARCHAR(200),
    affected_version VARCHAR(100),
    description TEXT,
    status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Fixed', 'Risk Accepted', 'False Positive')),
    discovered_date DATE,
    disclosure_date DATE,
    patch_available BOOLEAN DEFAULT FALSE,
    patch_date DATE,
    patch_version VARCHAR(100),
    remediation_plan TEXT,
    workaround TEXT,
    target_fix_date DATE,
    actual_fix_date DATE,
    risk_assessment TEXT,
    business_impact TEXT,
    assigned_to VARCHAR(100),
    vendor_name VARCHAR(100),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// セキュリティインシデント対応チームテーブル
const createSecurityTeamsTable = `
CREATE TABLE IF NOT EXISTS security_teams (
    team_id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_name VARCHAR(100) NOT NULL,
    team_type VARCHAR(50) CHECK (team_type IN ('CSIRT', 'SOC', 'Incident Response', 'Security Engineering')),
    description TEXT,
    lead_contact VARCHAR(100),
    escalation_contact VARCHAR(100),
    on_call_schedule TEXT, -- JSON object
    specialization TEXT, -- JSON array
    contact_methods TEXT, -- JSON object
    active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// セキュリティ統制フレームワークテーブル
const createSecurityFrameworksTable = `
CREATE TABLE IF NOT EXISTS security_frameworks (
    framework_id INTEGER PRIMARY KEY AUTOINCREMENT,
    framework_name VARCHAR(100) NOT NULL,
    version VARCHAR(20),
    description TEXT,
    compliance_standard VARCHAR(100),
    implementation_status VARCHAR(50) DEFAULT 'Planning' CHECK (implementation_status IN ('Planning', 'In Progress', 'Implemented', 'Under Review')),
    controls_count INTEGER DEFAULT 0,
    implemented_controls INTEGER DEFAULT 0,
    last_assessment_date DATE,
    next_assessment_date DATE,
    responsible_team VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// インデックス作成
const createIndexes = [
  'CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity)',
  'CREATE INDEX IF NOT EXISTS idx_security_events_status ON security_events(status)',
  'CREATE INDEX IF NOT EXISTS idx_security_events_detected_at ON security_events(detected_at)',
  'CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type)',
  'CREATE INDEX IF NOT EXISTS idx_security_policies_category ON security_policies(category)',
  'CREATE INDEX IF NOT EXISTS idx_security_policies_status ON security_policies(status)',
  'CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity)',
  'CREATE INDEX IF NOT EXISTS idx_vulnerabilities_status ON vulnerabilities(status)',
  'CREATE INDEX IF NOT EXISTS idx_vulnerabilities_cve_id ON vulnerabilities(cve_id)',
  'CREATE INDEX IF NOT EXISTS idx_vulnerabilities_discovered_date ON vulnerabilities(discovered_date)'
];

// サンプルデータ挿入
const sampleSecurityEvents = `
INSERT OR IGNORE INTO security_events (event_id, title, description, event_type, severity, status, source_system, source_ip, target_asset, detected_at, assigned_to, indicators, mitigation_steps, created_by) VALUES
(1, '不審なログイン試行の検出', '管理者アカウントに対する複数回の失敗したログイン試行を検出', 'Authentication Failure', 'High', 'Open', 'AD Server', '192.168.1.100', 'DC01', '2025-06-10 09:00:00', 'security-team', '["multiple_failed_logins", "non_business_hours", "unusual_source_ip"]', '["account_lockout", "source_ip_blocking", "incident_investigation"]', 'system');

INSERT OR IGNORE INTO security_events (event_id, title, description, event_type, severity, status, source_system, source_ip, target_asset, detected_at, assigned_to, indicators, mitigation_steps, created_by) VALUES
(2, 'マルウェア感染の疑い', 'エンドポイントでマルウェアの可能性がある不審なプロセスを検出', 'Malware Detection', 'Critical', 'In Progress', 'Endpoint Protection', '192.168.1.50', 'WS001', '2025-06-10 08:30:00', 'incident-response', '["suspicious_process", "network_communication", "file_modification"]', '["isolation", "forensic_analysis", "malware_removal"]', 'system');
`;

const sampleSecurityPolicies = `
INSERT OR IGNORE INTO security_policies (policy_id, policy_name, category, description, status, compliance_level, owner, effective_date, review_frequency, last_review_date, next_review_date, created_by) VALUES
(1, 'パスワード管理ポリシー', 'Access Control', 'システムアクセスにおけるパスワードの要件と管理手順を定義', 'Active', 'High', 'security-team', '2025-01-01', 12, '2025-01-01', '2026-01-01', 'admin');

INSERT OR IGNORE INTO security_policies (policy_id, policy_name, category, description, status, compliance_level, owner, effective_date, review_frequency, last_review_date, next_review_date, created_by) VALUES
(2, 'インシデント対応手順', 'Incident Management', 'セキュリティインシデント発生時の対応手順と責任者を定義', 'Active', 'Critical', 'incident-response', '2025-01-01', 6, '2025-01-01', '2025-07-01', 'admin');
`;

const sampleVulnerabilities = `
INSERT OR IGNORE INTO vulnerabilities (vuln_id, vulnerability_name, cve_id, severity, cvss_score, affected_system, description, status, discovered_date, patch_available, target_fix_date, assigned_to, created_by) VALUES
(1, 'Windows Server RCE脆弱性', 'CVE-2025-0001', 'Critical', 9.8, 'Windows Server 2019', 'リモートコード実行が可能な脆弱性', 'Open', '2025-06-08', TRUE, '2025-06-15', 'system-admin', 'vulnerability-scanner');

INSERT OR IGNORE INTO vulnerabilities (vuln_id, vulnerability_name, cve_id, severity, cvss_score, affected_system, description, status, discovered_date, patch_available, target_fix_date, assigned_to, created_by) VALUES
(2, 'Apache HTTP Server情報漏洩', 'CVE-2025-0002', 'Medium', 5.3, 'Apache HTTP Server 2.4.51', 'サーバー情報が漏洩する可能性', 'In Progress', '2025-06-07', TRUE, '2025-06-20', 'web-admin', 'vulnerability-scanner');
`;

const sampleSecurityTeams = `
INSERT OR IGNORE INTO security_teams (team_id, team_name, team_type, description, lead_contact, escalation_contact, specialization, active) VALUES
(1, 'セキュリティ運用センター', 'SOC', '24時間体制のセキュリティ監視と初期対応', 'soc-lead@company.com', 'ciso@company.com', '["threat_monitoring", "incident_detection", "log_analysis"]', TRUE);

INSERT OR IGNORE INTO security_teams (team_id, team_name, team_type, description, lead_contact, escalation_contact, specialization, active) VALUES
(2, 'インシデント対応チーム', 'Incident Response', 'セキュリティインシデントの対応と復旧', 'ir-lead@company.com', 'ciso@company.com', '["forensics", "malware_analysis", "crisis_management"]', TRUE);
`;

const sampleSecurityFrameworks = `
INSERT OR IGNORE INTO security_frameworks (framework_id, framework_name, version, description, compliance_standard, implementation_status, controls_count, implemented_controls, last_assessment_date, responsible_team) VALUES
(1, 'ISO 27001', '2022', '情報セキュリティマネジメントシステム', 'ISO/IEC 27001:2022', 'In Progress', 114, 87, '2025-06-01', 'security-governance');

INSERT OR IGNORE INTO security_frameworks (framework_id, framework_name, version, description, compliance_standard, implementation_status, controls_count, implemented_controls, last_assessment_date, responsible_team) VALUES
(2, 'NIST Cybersecurity Framework', '1.1', 'NIST サイバーセキュリティフレームワーク', 'NIST CSF v1.1', 'Implemented', 108, 98, '2025-05-15', 'security-architecture');
`;

// 実行
db.serialize(() => {
  console.log('📝 セキュリティイベントテーブルを作成中...');
  db.run(createSecurityEventsTable, (err) => {
    if (err) console.error('❌ セキュリティイベントテーブル作成エラー:', err);
    else console.log('✅ セキュリティイベントテーブルを作成しました');
  });

  console.log('📝 セキュリティポリシーテーブルを作成中...');
  db.run(createSecurityPoliciesTable, (err) => {
    if (err) console.error('❌ セキュリティポリシーテーブル作成エラー:', err);
    else console.log('✅ セキュリティポリシーテーブルを作成しました');
  });

  console.log('📝 脆弱性管理テーブルを作成中...');
  db.run(createVulnerabilitiesTable, (err) => {
    if (err) console.error('❌ 脆弱性管理テーブル作成エラー:', err);
    else console.log('✅ 脆弱性管理テーブルを作成しました');
  });

  console.log('📝 セキュリティチームテーブルを作成中...');
  db.run(createSecurityTeamsTable, (err) => {
    if (err) console.error('❌ セキュリティチームテーブル作成エラー:', err);
    else console.log('✅ セキュリティチームテーブルを作成しました');
  });

  console.log('📝 セキュリティフレームワークテーブルを作成中...');
  db.run(createSecurityFrameworksTable, (err) => {
    if (err) console.error('❌ セキュリティフレームワークテーブル作成エラー:', err);
    else console.log('✅ セキュリティフレームワークテーブルを作成しました');
  });

  console.log('📊 インデックスを作成中...');
  createIndexes.forEach((indexSql, i) => {
    db.run(indexSql, (err) => {
      if (err) console.error(`❌ インデックス${i+1}作成エラー:`, err);
      else console.log(`✅ インデックス${i+1}を作成しました`);
    });
  });

  console.log('🗃️ サンプルデータを挿入中...');
  
  db.exec(sampleSecurityEvents, (err) => {
    if (err) console.error('❌ セキュリティイベントサンプルデータ挿入エラー:', err);
    else console.log('✅ セキュリティイベントサンプルデータを挿入しました');
  });

  db.exec(sampleSecurityPolicies, (err) => {
    if (err) console.error('❌ セキュリティポリシーサンプルデータ挿入エラー:', err);
    else console.log('✅ セキュリティポリシーサンプルデータを挿入しました');
  });

  db.exec(sampleVulnerabilities, (err) => {
    if (err) console.error('❌ 脆弱性サンプルデータ挿入エラー:', err);
    else console.log('✅ 脆弱性サンプルデータを挿入しました');
  });

  db.exec(sampleSecurityTeams, (err) => {
    if (err) console.error('❌ セキュリティチームサンプルデータ挿入エラー:', err);
    else console.log('✅ セキュリティチームサンプルデータを挿入しました');
  });

  db.exec(sampleSecurityFrameworks, (err) => {
    if (err) console.error('❌ セキュリティフレームワークサンプルデータ挿入エラー:', err);
    else console.log('✅ セキュリティフレームワークサンプルデータを挿入しました');
  });

  db.close((err) => {
    if (err) {
      console.error('❌ データベース切断エラー:', err);
    } else {
      console.log('🎉 セキュリティ管理データベースの初期化が完了しました！');
      console.log('');
      console.log('📋 作成されたテーブル:');
      console.log('  - security_events (セキュリティイベント)');
      console.log('  - security_policies (セキュリティポリシー)');
      console.log('  - vulnerabilities (脆弱性管理)');
      console.log('  - security_teams (セキュリティチーム)');
      console.log('  - security_frameworks (セキュリティフレームワーク)');
      console.log('');
      console.log('🔗 新しいAPIエンドポイント:');
      console.log('  GET/POST/PUT/DELETE /api/security/events');
      console.log('  GET /api/security/policies');
      console.log('  GET /api/security/vulnerabilities');
      console.log('  GET /api/security/compliance-status');
    }
  });
});