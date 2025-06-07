const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// データベース接続
const dbPath = path.join(__dirname, '..', 'db', 'itsm.sqlite');
console.log('📁 Database path:', dbPath);

const db = new sqlite3.Database(dbPath);

// 外部キー制約を有効化
db.run('PRAGMA foreign_keys = ON');

console.log('🔧 Creating minimal tables for changes integration...');

// Users table creation
const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    display_name TEXT,
    email TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// Changes table creation (if not exists)
const createChangesTable = `
CREATE TABLE IF NOT EXISTS changes (
    change_id INTEGER PRIMARY KEY AUTOINCREMENT,
    change_number VARCHAR(20) UNIQUE,
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
    scheduled_start_date DATE,
    scheduled_end_date DATE,
    actual_start_date DATETIME,
    actual_end_date DATETIME,
    implementation_status TEXT,
    post_implementation_review TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER,
    updated_by_user_id INTEGER
);
`;

// Test data
const insertTestUsers = `
INSERT OR IGNORE INTO users (user_id, username, password_hash, role, display_name, email) VALUES
(1, 'admin', '$2b$12$dummy.hash.for.testing', 'administrator', 'Administrator', 'admin@company.com'),
(2, 'operator', '$2b$12$dummy.hash.for.testing', 'operator', 'Operator', 'operator@company.com'),
(3, 'user1', '$2b$12$dummy.hash.for.testing', 'user', 'Test User', 'user1@company.com');
`;

const insertTestChanges = `
INSERT OR IGNORE INTO changes (
    change_id, subject, detail, status, type, priority, risk_level, impact_level,
    change_reason, implementation_plan, backout_plan, test_plan, business_impact,
    requested_by_user_id, scheduled_start_date, scheduled_end_date
) VALUES
(1, 'メールサーバOSアップグレード', 'セキュリティパッチ適用のためOSを最新版にアップグレード', 'Requested', 'Normal', 'High', 'High', 'High',
 'セキュリティ脆弱性対応', '週末メンテナンス時間帯に実施', '旧バージョンにロールバック', '本番環境での動作確認', 'メール送受信に一時的な影響',
 1, '2025-06-14', '2025-06-14'),
(2, '人事システム新機能追加', '年末調整機能の追加', 'Approved', 'Standard', 'Medium', 'Medium', 'Medium',
 '年末調整業務効率化', '開発完了、テストフェーズ後展開', '機能フラグで制御', 'UAT実施', '年末調整業務への影響なし',
 2, '2025-06-21', '2025-06-21'),
(3, 'ネットワークスイッチ交換', '老朽化したコアスイッチの交換', 'Implemented', 'Emergency', 'Critical', 'High', 'High',
 '機器老朽化対応', '夜間作業にて完了', '旧スイッチ再接続', '通信テスト', 'ネットワーク全体への影響',
 1, '2025-06-04', '2025-06-04');
`;

// Execute SQL statements
async function createTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(createUsersTable, (err) => {
                if (err) {
                    console.error('❌ Error creating users table:', err);
                    reject(err);
                } else {
                    console.log('✅ Users table created or already exists');
                }
            });

            db.run(createChangesTable, (err) => {
                if (err) {
                    console.error('❌ Error creating changes table:', err);
                    reject(err);
                } else {
                    console.log('✅ Changes table created or already exists');
                }
            });

            db.run(insertTestUsers, (err) => {
                if (err) {
                    console.error('❌ Error inserting test users:', err);
                    reject(err);
                } else {
                    console.log('✅ Test users inserted');
                }
            });

            db.run(insertTestChanges, (err) => {
                if (err) {
                    console.error('❌ Error inserting test changes:', err);
                    reject(err);
                } else {
                    console.log('✅ Test changes inserted');
                }
            });

            db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('🎉 Database setup completed successfully!');
                    resolve();
                }
            });
        });
    });
}

// Run the setup
createTables().catch(err => {
    console.error('❌ Setup failed:', err);
    process.exit(1);
});