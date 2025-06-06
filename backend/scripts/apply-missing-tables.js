const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// データベースファイルパス
const dbPath = path.join(__dirname, '..', 'db', 'itsm.sqlite');

console.log('🔧 Adding missing tables to ITSM database...');
console.log(`📁 Database: ${dbPath}`);

// データベース接続
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// 外部キー制約を有効化
db.run('PRAGMA foreign_keys = ON');

// 必要なテーブルを作成
const createTables = [
  // Service Requests テーブル
  `CREATE TABLE IF NOT EXISTS service_requests (
    request_id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_number VARCHAR(50) UNIQUE DEFAULT ('SR-' || printf('%06d', request_id)),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    status VARCHAR(50) DEFAULT 'Requested' CHECK (status IN ('Requested', 'Approved', 'In Progress', 'Fulfilled', 'Cancelled', 'Rejected')),
    requested_by_user_id INTEGER,
    approved_by_user_id INTEGER,
    fulfilled_by_user_id INTEGER,
    request_date DATE DEFAULT CURRENT_DATE,
    required_date DATE,
    approved_date DATE,
    fulfilled_date DATE,
    cost_estimate DECIMAL(10,2),
    business_justification TEXT,
    notes TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    updated_by_user_id INTEGER,
    FOREIGN KEY (requested_by_user_id) REFERENCES users(user_id),
    FOREIGN KEY (approved_by_user_id) REFERENCES users(user_id),
    FOREIGN KEY (fulfilled_by_user_id) REFERENCES users(user_id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id),
    FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id)
  )`,

  // Changes テーブル  
  `CREATE TABLE IF NOT EXISTS changes (
    change_id INTEGER PRIMARY KEY AUTOINCREMENT,
    change_number VARCHAR(50) UNIQUE DEFAULT ('CHG-' || printf('%06d', change_id)),
    subject VARCHAR(200) NOT NULL,
    detail TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'Normal' CHECK (type IN ('Emergency', 'Normal', 'Standard')),
    status VARCHAR(50) DEFAULT 'Requested' CHECK (status IN ('Requested', 'Pending CAB', 'Approved', 'Rejected', 'Scheduled', 'In Progress', 'Implemented', 'Failed', 'Cancelled')),
    priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    risk_level VARCHAR(20) DEFAULT 'Low' CHECK (risk_level IN ('Low', 'Medium', 'High')),
    impact_level VARCHAR(20) DEFAULT 'Low' CHECK (impact_level IN ('Low', 'Medium', 'High')),
    change_reason TEXT,
    implementation_plan TEXT,
    backout_plan TEXT,
    test_plan TEXT,
    business_impact TEXT,
    requested_by_user_id INTEGER,
    approved_by_user_id INTEGER,
    implemented_by_user_id INTEGER,
    request_date DATE DEFAULT CURRENT_DATE,
    approve_date DATE,
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
    FOREIGN KEY (requested_by_user_id) REFERENCES users(user_id),
    FOREIGN KEY (approved_by_user_id) REFERENCES users(user_id),
    FOREIGN KEY (implemented_by_user_id) REFERENCES users(user_id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id),
    FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id)
  )`,

  // Problems テーブル
  `CREATE TABLE IF NOT EXISTS problems (
    problem_id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_number VARCHAR(50) UNIQUE DEFAULT ('PRB-' || printf('%06d', problem_id)),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Logged' CHECK (status IN ('Logged', 'In Progress', 'Known Error', 'Resolved', 'Closed')),
    priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    category VARCHAR(100),
    affected_service VARCHAR(200),
    workaround TEXT,
    root_cause TEXT,
    root_cause_analysis TEXT,
    permanent_solution TEXT,
    reporter_user_id INTEGER,
    assignee_user_id INTEGER,
    resolver_user_id INTEGER,
    registered_date DATE DEFAULT CURRENT_DATE,
    acknowledged_date DATE,
    resolved_date DATE,
    closed_date DATE,
    review_date DATE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    updated_by_user_id INTEGER,
    FOREIGN KEY (reporter_user_id) REFERENCES users(user_id),
    FOREIGN KEY (assignee_user_id) REFERENCES users(user_id),
    FOREIGN KEY (resolver_user_id) REFERENCES users(user_id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id),
    FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id)
  )`,

  // Knowledge テーブル
  `CREATE TABLE IF NOT EXISTS knowledge (
    knowledge_id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_number VARCHAR(50) UNIQUE DEFAULT ('KB-' || printf('%06d', knowledge_id)),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    keywords TEXT,
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Review', 'Published', 'Archived')),
    visibility VARCHAR(20) DEFAULT 'Internal' CHECK (visibility IN ('Public', 'Internal', 'Restricted')),
    author_user_id INTEGER,
    reviewer_user_id INTEGER,
    publish_date DATE,
    review_date DATE,
    expiry_date DATE,
    version_number VARCHAR(20) DEFAULT '1.0',
    view_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.0,
    rating_count INTEGER DEFAULT 0,
    tags TEXT,
    related_articles TEXT,
    attachments TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    updated_by_user_id INTEGER,
    FOREIGN KEY (author_user_id) REFERENCES users(user_id),
    FOREIGN KEY (reviewer_user_id) REFERENCES users(user_id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id),
    FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id)
  )`,

  // SLAs テーブル
  `CREATE TABLE IF NOT EXISTS slas (
    sla_id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) DEFAULT 'Availability' CHECK (metric_type IN ('Availability', 'Performance', 'Response Time', 'Resolution Time', 'Quality')),
    target_value DECIMAL(10,4) NOT NULL,
    actual_value DECIMAL(10,4),
    unit VARCHAR(20),
    measurement_period VARCHAR(20) DEFAULT 'Monthly' CHECK (measurement_period IN ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually')),
    measurement_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Unknown' CHECK (status IN ('Met', 'Breached', 'At Risk', 'Unknown')),
    breach_reason TEXT,
    corrective_action TEXT,
    responsible_team VARCHAR(100),
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
  )`,

  // Capacity テーブル
  `CREATE TABLE IF NOT EXISTS capacity (
    capacity_id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_name VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) DEFAULT 'Other' CHECK (resource_type IN ('CPU', 'Memory', 'Storage', 'Network', 'Database', 'Application', 'Other')),
    current_usage DECIMAL(15,4) NOT NULL,
    max_capacity DECIMAL(15,4) NOT NULL,
    usage_percent DECIMAL(5,2) GENERATED ALWAYS AS (ROUND((current_usage / max_capacity) * 100, 2)) STORED,
    threshold_warning DECIMAL(5,2) DEFAULT 80.0,
    threshold_critical DECIMAL(5,2) DEFAULT 90.0,
    unit VARCHAR(20),
    location VARCHAR(100),
    measurement_date DATE NOT NULL,
    forecast_3months DECIMAL(15,4),
    forecast_6months DECIMAL(15,4),
    forecast_12months DECIMAL(15,4),
    status VARCHAR(20) DEFAULT 'Normal' CHECK (status IN ('Normal', 'Warning', 'Critical')),
    notes TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
  )`,

  // Availability テーブル
  `CREATE TABLE IF NOT EXISTS availability (
    availability_id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name VARCHAR(100) NOT NULL,
    service_type VARCHAR(50) DEFAULT 'Application' CHECK (service_type IN ('Application', 'Infrastructure', 'Network', 'Database', 'Platform', 'Other')),
    measurement_period VARCHAR(20) DEFAULT 'Monthly' CHECK (measurement_period IN ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually')),
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    total_minutes INTEGER NOT NULL,
    downtime_minutes INTEGER DEFAULT 0,
    planned_downtime_minutes INTEGER DEFAULT 0,
    unplanned_downtime_minutes INTEGER DEFAULT 0,
    uptime_percent DECIMAL(5,4) GENERATED ALWAYS AS (ROUND(((total_minutes - downtime_minutes) * 100.0 / total_minutes), 4)) STORED,
    availability_target DECIMAL(5,2) DEFAULT 99.9,
    sla_met INTEGER GENERATED ALWAYS AS (CASE WHEN uptime_percent >= availability_target THEN 1 ELSE 0 END) STORED,
    major_incidents_count INTEGER DEFAULT 0,
    minor_incidents_count INTEGER DEFAULT 0,
    maintenance_windows_count INTEGER DEFAULT 0,
    notes TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
  )`,

  // Incident-Problem Relationships テーブル
  `CREATE TABLE IF NOT EXISTS incident_problem_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,
    relationship_type VARCHAR(50) DEFAULT 'Caused By' CHECK (relationship_type IN ('Caused By', 'Related To', 'Duplicate Of')),
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    FOREIGN KEY (incident_id) REFERENCES incidents(incident_id) ON DELETE CASCADE,
    FOREIGN KEY (problem_id) REFERENCES problems(problem_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
  )`
];

let createdCount = 0;

function createTable(index) {
  if (index >= createTables.length) {
    console.log(`\n🎉 Table creation completed!`);
    console.log(`✅ Successfully created: ${createdCount} tables`);
    
    // データベースを閉じる
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('🔒 Database connection closed');
      }
      process.exit(0);
    });
    return;
  }
  
  const sql = createTables[index];
  const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
  
  db.run(sql, (err) => {
    if (err) {
      console.log(`❌ Table ${tableName}: ${err.message}`);
    } else {
      console.log(`✅ Table ${tableName}: Created successfully`);
      createdCount++;
    }
    
    // 次のテーブルを作成
    createTable(index + 1);
  });
}

// テーブル作成開始
console.log(`\n🚀 Starting table creation (${createTables.length} tables)...\n`);
createTable(0);