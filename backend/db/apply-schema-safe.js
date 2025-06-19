/**
 * 安全なスキーマ適用スクリプト - カラム存在チェック付き
 */
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = './db/itsm.sqlite';

async function checkColumnExists(db, tableName, columnName) {
    return new Promise((resolve, reject) => {
        db.get(`PRAGMA table_info(${tableName})`, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            // 全カラム情報を取得
            db.all(`PRAGMA table_info(${tableName})`, (err, allRows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const columnExists = allRows.some(row => row.name === columnName);
                resolve(columnExists);
            });
        });
    });
}

async function applySchemaSafely() {
    const db = new sqlite3.Database(DB_PATH);
    
    try {
        console.log('📋 既存テーブル構造確認中...');
        
        // service_requests テーブルの構造確認
        const columns = await new Promise((resolve, reject) => {
            db.all("PRAGMA table_info(service_requests)", (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.name));
            });
        });
        
        console.log('既存カラム:', columns);
        
        // 新規カラムの追加（存在チェック付き）
        const newColumns = [
            { name: 'request_type', definition: 'VARCHAR(50) DEFAULT \'general\'' },
            { name: 'approval_level', definition: 'INTEGER DEFAULT 1' },
            { name: 'auto_processing', definition: 'BOOLEAN DEFAULT FALSE' },
            { name: 'sla_target_hours', definition: 'INTEGER DEFAULT 24' },
            { name: 'escalation_level', definition: 'INTEGER DEFAULT 0' },
            { name: 'integration_status', definition: 'VARCHAR(50) DEFAULT \'pending\'' },
            { name: 'windows_task_id', definition: 'VARCHAR(100)' },
            { name: 'powershell_job_id', definition: 'VARCHAR(100)' }
        ];
        
        for (const column of newColumns) {
            if (!columns.includes(column.name)) {
                console.log(`➕ Adding column: ${column.name}`);
                await new Promise((resolve, reject) => {
                    db.run(`ALTER TABLE service_requests ADD COLUMN ${column.name} ${column.definition}`, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            } else {
                console.log(`⏭️  Column already exists: ${column.name}`);
            }
        }
        
        // 新規テーブル作成
        console.log('📋 Creating new tables...');
        
        const createApprovalTable = `
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
            )
        `;
        
        const createJobsTable = `
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
            )
        `;
        
        const createTypesTable = `
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
            )
        `;
        
        await new Promise((resolve, reject) => {
            db.run(createApprovalTable, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        await new Promise((resolve, reject) => {
            db.run(createJobsTable, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        await new Promise((resolve, reject) => {
            db.run(createTypesTable, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // 初期データ投入
        console.log('📋 Inserting initial data...');
        const insertTypes = `
            INSERT OR IGNORE INTO service_request_types (type_name, display_name, description, required_approval_levels, auto_processing_enabled, sla_hours, powershell_integration) VALUES
            ('user_creation', 'ユーザー作成', 'Active Directoryユーザーアカウント作成', 2, 1, 4, 1),
            ('group_access', 'グループアクセス', 'Active Directoryグループアクセス権限付与', 1, 1, 8, 1),
            ('software_install', 'ソフトウェアインストール', 'ソフトウェアの自動インストール', 1, 1, 24, 1),
            ('password_reset', 'パスワードリセット', 'ユーザーパスワードのリセット', 1, 1, 2, 1)
        `;
        
        await new Promise((resolve, reject) => {
            db.run(insertTypes, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // インデックス作成
        console.log('📋 Creating indexes...');
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_service_request_approvals_request_id ON service_request_approvals(request_id)',
            'CREATE INDEX IF NOT EXISTS idx_windows_integration_jobs_request_id ON windows_integration_jobs(request_id)',
            'CREATE INDEX IF NOT EXISTS idx_service_requests_type ON service_requests(request_type)'
        ];
        
        for (const index of indexes) {
            await new Promise((resolve, reject) => {
                db.run(index, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
        
        console.log('✅ Schema applied successfully!');
        
    } catch (error) {
        console.error('❌ Schema application failed:', error);
        throw error;
    } finally {
        db.close();
    }
}

if (require.main === module) {
    applySchemaSafely().catch(console.error);
}

module.exports = { applySchemaSafely };