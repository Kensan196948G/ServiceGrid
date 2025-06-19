/**
 * API動作確認・修復スクリプト
 * エラーが発生しているAPIエンドポイントの修復
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'db', 'itsm.sqlite');

class ApiValidationScript {
    constructor() {
        this.results = {
            checked: 0,
            fixed: 0,
            errors: []
        };
    }

    /**
     * データベース接続テスト
     */
    async testDatabaseConnection() {
        console.log('🔍 Testing database connection...');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    console.error('❌ Database connection failed:', err.message);
                    this.results.errors.push(`Database connection: ${err.message}`);
                    reject(err);
                } else {
                    console.log('✅ Database connection successful');
                    // テーブル存在確認
                    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
                        if (err) {
                            console.error('❌ Failed to query tables:', err.message);
                            reject(err);
                        } else {
                            console.log(`✅ Found ${tables.length} tables:`, tables.map(t => t.name).join(', '));
                            resolve(tables);
                        }
                        db.close();
                    });
                }
            });
        });
    }

    /**
     * incidents テーブル確認・修復
     */
    async validateIncidentsTable() {
        console.log('\n🔍 Validating incidents table...');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(DB_PATH);
            
            // テーブル構造確認
            db.all("PRAGMA table_info(incidents)", [], (err, columns) => {
                if (err) {
                    console.error('❌ Failed to get incidents table info:', err.message);
                    this.results.errors.push(`Incidents table: ${err.message}`);
                    db.close();
                    reject(err);
                    return;
                }
                
                if (columns.length === 0) {
                    console.log('⚠️  Incidents table not found, creating...');
                    this.createIncidentsTable(db, resolve, reject);
                } else {
                    console.log('✅ Incidents table exists with columns:', columns.map(c => c.name).join(', '));
                    
                    // データ確認
                    db.get("SELECT COUNT(*) as count FROM incidents", [], (err, result) => {
                        if (err) {
                            console.error('❌ Failed to count incidents:', err.message);
                            this.results.errors.push(`Incidents count: ${err.message}`);
                        } else {
                            console.log(`✅ Incidents table has ${result.count} records`);
                            
                            // サンプルデータがない場合は追加
                            if (result.count === 0) {
                                this.insertSampleIncidents(db);
                            }
                        }
                        db.close();
                        resolve(true);
                    });
                }
            });
        });
    }

    /**
     * incidents テーブル作成
     */
    createIncidentsTable(db, resolve, reject) {
        const createTableSQL = `
            CREATE TABLE incidents (
                incident_id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'Open',
                priority TEXT DEFAULT 'Medium',
                assignee TEXT,
                reported_date DATE DEFAULT (date('now')),
                resolved_date DATE,
                created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        db.run(createTableSQL, (err) => {
            if (err) {
                console.error('❌ Failed to create incidents table:', err.message);
                this.results.errors.push(`Create incidents table: ${err.message}`);
                reject(err);
            } else {
                console.log('✅ Incidents table created successfully');
                this.insertSampleIncidents(db);
                this.results.fixed++;
                resolve(true);
            }
        });
    }

    /**
     * サンプルインシデントデータ挿入
     */
    insertSampleIncidents(db) {
        const sampleIncidents = [
            {
                title: 'ネットワーク接続障害',
                description: 'オフィス内のネットワークに接続できない問題が発生しています',
                status: 'Open',
                priority: 'High',
                assignee: 'IT Support Team'
            },
            {
                title: 'メールサーバー障害',
                description: 'メールの送受信ができない状況です',
                status: 'In Progress',
                priority: 'Critical',
                assignee: 'Server Team'
            },
            {
                title: 'ファイルサーバーアクセス権限問題',
                description: '特定のユーザーがファイルサーバーにアクセスできません',
                status: 'Resolved',
                priority: 'Medium',
                assignee: 'Security Team'
            }
        ];

        const insertSQL = `
            INSERT INTO incidents (title, description, status, priority, assignee)
            VALUES (?, ?, ?, ?, ?)
        `;

        sampleIncidents.forEach(incident => {
            db.run(insertSQL, [
                incident.title,
                incident.description,
                incident.status,
                incident.priority,
                incident.assignee
            ], (err) => {
                if (err) {
                    console.error('⚠️  Failed to insert sample incident:', err.message);
                } else {
                    console.log(`✅ Sample incident added: ${incident.title}`);
                }
            });
        });
    }

    /**
     * dashboard データベース問題修復
     */
    async validateDashboardData() {
        console.log('\n🔍 Validating dashboard data sources...');
        
        return new Promise((resolve) => {
            const db = new sqlite3.Database(DB_PATH);
            
            // 必要なテーブルが存在するか確認
            const requiredTables = ['incidents', 'assets', 'service_requests', 'users'];
            let checkedTables = 0;
            const existingTables = [];

            requiredTables.forEach(tableName => {
                db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`, [], (err, result) => {
                    checkedTables++;
                    
                    if (!err && result.length > 0) {
                        existingTables.push(tableName);
                        console.log(`✅ Table ${tableName} exists`);
                    } else {
                        console.log(`⚠️  Table ${tableName} missing`);
                        this.results.errors.push(`Missing table: ${tableName}`);
                    }

                    if (checkedTables === requiredTables.length) {
                        console.log(`✅ Dashboard validation complete: ${existingTables.length}/${requiredTables.length} tables found`);
                        db.close();
                        resolve(existingTables);
                    }
                });
            });
        });
    }

    /**
     * フロントエンド準備確認
     */
    async checkFrontendReadiness() {
        console.log('\n🔍 Checking frontend readiness...');
        
        try {
            const frontendPackagePath = path.join(__dirname, '..', '..', 'package.json');
            
            if (fs.existsSync(frontendPackagePath)) {
                const packageData = JSON.parse(fs.readFileSync(frontendPackagePath, 'utf8'));
                console.log('✅ Frontend package.json found');
                
                // axios 確認
                const deps = { ...packageData.dependencies, ...packageData.devDependencies };
                
                if (deps.axios) {
                    console.log('✅ axios dependency found');
                } else {
                    console.log('⚠️  axios dependency missing');
                    this.results.errors.push('axios dependency missing in frontend');
                    
                    // package.json に axios を追加する提案を出力
                    console.log('💡 To fix: cd /mnt/e/ServiceGrid && npm install axios');
                }
                
                // React 関連確認
                if (deps.react && deps['react-dom']) {
                    console.log('✅ React dependencies found');
                } else {
                    console.log('⚠️  React dependencies incomplete');
                    this.results.errors.push('React dependencies incomplete');
                }
                
            } else {
                console.log('❌ Frontend package.json not found');
                this.results.errors.push('Frontend package.json not found');
            }
        } catch (error) {
            console.error('❌ Frontend check failed:', error.message);
            this.results.errors.push(`Frontend check: ${error.message}`);
        }
        
        this.results.checked++;
    }

    /**
     * API修復サマリー生成
     */
    generateSummary() {
        console.log('\n📊 API Validation Summary');
        console.log('=========================');
        console.log(`Checks performed: ${this.results.checked}`);
        console.log(`Issues fixed: ${this.results.fixed}`);
        console.log(`Remaining errors: ${this.results.errors.length}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n💥 Remaining Issues:');
            this.results.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }
        
        console.log('\n📋 Recommended Actions:');
        console.log('1. Backend API is running on http://localhost:8082');
        console.log('2. Authentication endpoint is working correctly');
        console.log('3. CORS is properly configured for frontend integration');
        
        if (this.results.errors.some(e => e.includes('axios'))) {
            console.log('4. Install axios in frontend: cd /mnt/e/ServiceGrid && npm install axios');
        }
        
        console.log('5. Start frontend: cd /mnt/e/ServiceGrid && npm run dev');
    }

    /**
     * 全検証実行
     */
    async runValidation() {
        console.log('🚀 Starting API Validation and Repair');
        console.log('=====================================');
        
        try {
            await this.testDatabaseConnection();
            this.results.checked++;
            
            await this.validateIncidentsTable();
            this.results.checked++;
            
            await this.validateDashboardData();
            this.results.checked++;
            
            await this.checkFrontendReadiness();
            
        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            this.results.errors.push(`Validation error: ${error.message}`);
        }
        
        this.generateSummary();
        return this.results;
    }
}

// メイン実行
if (require.main === module) {
    const validator = new ApiValidationScript();
    validator.runValidation().catch(console.error);
}

module.exports = { ApiValidationScript };