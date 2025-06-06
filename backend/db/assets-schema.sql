-- 資産管理テーブルスキーマ

-- 既存のテーブルがあれば削除
DROP TABLE IF EXISTS assets;

-- 資産テーブル作成
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

-- インデックス作成
CREATE INDEX idx_assets_tag ON assets(asset_tag);
CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_location ON assets(location);
CREATE INDEX idx_assets_assigned_to ON assets(assigned_to);
CREATE INDEX idx_assets_created_at ON assets(created_at);

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

-- サンプルデータ挿入
INSERT INTO assets (
  asset_tag, name, description, category, type, manufacturer, model, 
  serial_number, location, department, owner, assigned_to, status,
  purchase_date, purchase_cost, warranty_expiry, ip_address, mac_address,
  operating_system, software_licenses, configuration, notes, tags, created_by
) VALUES
(
  'SRV-001', 'メインWebサーバー', 'プロダクション用Webサーバー', 'Server', 'Physical Server',
  'Dell', 'PowerEdge R740', 'DL1234567890', 'データセンター A-1', 'IT部門',
  'admin', 'admin', 'Active', '2023-01-15', 850000.00, '2026-01-15',
  '192.168.1.10', '00:1B:21:12:34:56', 'Ubuntu Server 22.04 LTS',
  '["Apache", "MySQL", "PHP"]', '{"cpu": "Intel Xeon", "ram": "32GB", "storage": "1TB SSD"}',
  '重要なプロダクションサーバー', '["production", "web", "critical"]', 'admin'
),
(
  'WS-001', '開発用ワークステーション', '開発者用デスクトップPC', 'Workstation', 'Desktop PC',
  'HP', 'EliteDesk 800', 'HP9876543210', 'オフィス 3F-15', '開発部門',
  'developer01', 'developer01', 'Active', '2023-03-20', 120000.00, '2026-03-20',
  '192.168.1.101', '00:1B:21:98:76:54', 'Windows 11 Pro',
  '["Visual Studio", "Docker", "Git"]', '{"cpu": "Intel i7", "ram": "16GB", "storage": "512GB SSD"}',
  '開発環境設定済み', '["development", "workstation"]', 'admin'
),
(
  'NW-001', 'メインスイッチ', 'データセンターコアスイッチ', 'Network', 'Switch',
  'Cisco', 'Catalyst 9300', 'CS2468135790', 'データセンター A-1', 'IT部門',
  'network_admin', 'network_admin', 'Active', '2023-02-10', 450000.00, '2028-02-10',
  '192.168.1.1', '00:1B:21:11:22:33', 'IOS XE',
  '[]', '{"ports": 48, "speed": "1Gbps", "management": "SNMP"}',
  'ネットワークコア機器', '["network", "core", "switch"]', 'admin'
),
(
  'LAP-001', 'ノートPC', '営業部用ノートパソコン', 'Laptop', 'Mobile Device',
  'Lenovo', 'ThinkPad X1', 'LP1357924680', 'オフィス 2F-営業', '営業部門',
  'sales_manager', 'sales01', 'Active', '2023-04-05', 180000.00, '2026-04-05',
  NULL, '00:1B:21:55:66:77', 'Windows 11 Pro',
  '["Office 365", "Teams", "Chrome"]', '{"cpu": "Intel i5", "ram": "8GB", "storage": "256GB SSD"}',
  'モバイル営業用', '["mobile", "sales", "laptop"]', 'admin'
),
(
  'PR-001', 'オフィスプリンター', '多機能プリンター複合機', 'Printer', 'Peripheral',
  'Canon', 'imageRUNNER C3720', 'PR0987654321', 'オフィス 2F-共用', '総務部門',
  'general_affairs', NULL, 'Active', '2023-01-30', 320000.00, '2026-01-30',
  '192.168.1.200', NULL, 'Embedded System',
  '[]', '{"type": "Color Laser", "speed": "20ppm", "functions": ["Print", "Scan", "Copy", "Fax"]}',
  'オフィス共用プリンター', '["printer", "office", "shared"]', 'admin'
),
(
  'DB-001', 'データベースサーバー', 'メインデータベースサーバー', 'Server', 'Virtual Server',
  'VMware', 'vSphere VM', 'VM-DB-001', 'データセンター A-1', 'IT部門',
  'dba', 'dba', 'Active', '2023-02-01', 0.00, NULL,
  '192.168.1.20', '00:50:56:12:34:56', 'CentOS 8',
  '["MySQL", "phpMyAdmin"]', '{"cpu": "4 vCPU", "ram": "16GB", "storage": "500GB"}',
  '仮想マシン上のDBサーバー', '["database", "virtual", "mysql"]', 'admin'
),
(
  'MON-001', '液晶モニター', '開発用デュアルモニター', 'Monitor', 'Peripheral',
  'ASUS', 'ProArt PA248QV', 'AS1122334455', 'オフィス 3F-15', '開発部門',
  'developer01', 'developer01', 'Active', '2023-03-25', 35000.00, '2026-03-25',
  NULL, NULL, NULL,
  '[]', '{"size": "24inch", "resolution": "1920x1200", "type": "IPS"}',
  'デュアルモニター構成', '["monitor", "development", "display"]', 'admin'
),
(
  'FIRE-001', 'ファイアウォール', 'セキュリティファイアウォール', 'Security', 'Firewall',
  'Fortinet', 'FortiGate 100F', 'FG987654321', 'データセンター A-1', 'IT部門',
  'security_admin', 'security_admin', 'Active', '2023-01-20', 280000.00, '2026-01-20',
  '192.168.1.254', '00:1B:21:AA:BB:CC', 'FortiOS',
  '["FortiGuard", "SSL-VPN"]', '{"throughput": "10Gbps", "concurrent_sessions": "50000"}',
  'ネットワークセキュリティ機器', '["security", "firewall", "network"]', 'admin'
);

-- 資産統計ビュー
CREATE VIEW asset_stats AS
SELECT 
  category,
  status,
  COUNT(*) as count,
  AVG(purchase_cost) as avg_cost,
  SUM(purchase_cost) as total_cost
FROM assets 
GROUP BY category, status;

-- 期限切れ保証ビュー
CREATE VIEW warranty_expiring AS
SELECT 
  asset_id,
  asset_tag,
  name,
  warranty_expiry,
  CASE 
    WHEN warranty_expiry < date('now') THEN 'Expired'
    WHEN warranty_expiry < date('now', '+30 days') THEN 'Expiring Soon'
    ELSE 'Valid'
  END as warranty_status
FROM assets 
WHERE warranty_expiry IS NOT NULL
ORDER BY warranty_expiry ASC;

-- メンテナンス予定ビュー
CREATE VIEW maintenance_schedule AS
SELECT 
  asset_id,
  asset_tag,
  name,
  last_maintenance,
  next_maintenance,
  CASE 
    WHEN next_maintenance < date('now') THEN 'Overdue'
    WHEN next_maintenance < date('now', '+7 days') THEN 'Due Soon'
    ELSE 'Scheduled'
  END as maintenance_status
FROM assets 
WHERE next_maintenance IS NOT NULL
ORDER BY next_maintenance ASC;