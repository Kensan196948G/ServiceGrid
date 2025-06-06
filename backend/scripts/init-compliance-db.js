const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'itsm.sqlite');

console.log('コンプライアンス管理データベースの初期化開始...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('データベース接続エラー:', err);
        process.exit(1);
    }
    console.log('データベースに接続しました');
});

// テーブル作成
const createTables = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // コンプライアンス統制管理テーブル
            db.run(`
                CREATE TABLE IF NOT EXISTS compliance_controls (
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
                )
            `, (err) => {
                if (err) console.error('compliance_controls テーブル作成エラー:', err);
                else console.log('✅ compliance_controls テーブル作成完了');
            });

            // コンプライアンス監査管理テーブル
            db.run(`
                CREATE TABLE IF NOT EXISTS compliance_audits (
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
                )
            `, (err) => {
                if (err) console.error('compliance_audits テーブル作成エラー:', err);
                else console.log('✅ compliance_audits テーブル作成完了');
            });

            // コンプライアンスリスク管理テーブル
            db.run(`
                CREATE TABLE IF NOT EXISTS compliance_risks (
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
                )
            `, (err) => {
                if (err) console.error('compliance_risks テーブル作成エラー:', err);
                else console.log('✅ compliance_risks テーブル作成完了');
            });

            // インデックス作成
            db.run('CREATE INDEX IF NOT EXISTS idx_compliance_controls_control_id ON compliance_controls(control_id)', (err) => {
                if (err) console.error('インデックス作成エラー:', err);
            });
            db.run('CREATE INDEX IF NOT EXISTS idx_compliance_controls_standard ON compliance_controls(standard)', (err) => {
                if (err) console.error('インデックス作成エラー:', err);
            });
            db.run('CREATE INDEX IF NOT EXISTS idx_compliance_controls_status ON compliance_controls(status)', (err) => {
                if (err) console.error('インデックス作成エラー:', err);
            });
            db.run('CREATE INDEX IF NOT EXISTS idx_compliance_audits_standard ON compliance_audits(standard)', (err) => {
                if (err) console.error('インデックス作成エラー:', err);
            });
            db.run('CREATE INDEX IF NOT EXISTS idx_compliance_audits_status ON compliance_audits(status)', (err) => {
                if (err) console.error('インデックス作成エラー:', err);
            });
            db.run('CREATE INDEX IF NOT EXISTS idx_compliance_risks_overall_risk ON compliance_risks(overall_risk)', (err) => {
                if (err) console.error('インデックス作成エラー:', err);
            });
            db.run('CREATE INDEX IF NOT EXISTS idx_compliance_risks_status ON compliance_risks(status)', (err) => {
                if (err) console.error('インデックス作成エラー:', err);
                else {
                    console.log('✅ インデックス作成完了');
                    resolve();
                }
            });
        });
    });
};

// サンプルデータ投入
const insertSampleData = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // サンプル統制データ
            const sampleControls = [
                {
                    control_id: 'ISO27001-A.5.1.1',
                    name: '情報セキュリティポリシー文書',
                    description: '情報セキュリティポリシー及び手順の文書化と承認',
                    standard: 'ISO27001/27002',
                    category: 'アクセス制御',
                    responsible_team: 'セキュリティ管理部',
                    status: 'Compliant',
                    risk_level: 'Medium',
                    cap_status: 'Not Applicable'
                },
                {
                    control_id: 'ISO27001-A.9.1.1',
                    name: 'アクセス制御ポリシー',
                    description: '業務及び情報処理施設へのアクセス制御ポリシー',
                    standard: 'ISO27001/27002',
                    category: 'アクセス制御',
                    responsible_team: 'IT運用部',
                    status: 'In Review',
                    risk_level: 'High',
                    cap_status: 'In Progress'
                },
                {
                    control_id: 'INTERNAL-001',
                    name: 'データバックアップ規程',
                    description: '重要データの定期バックアップ実施規程',
                    standard: '社内規定XYZ',
                    category: 'データ保護',
                    responsible_team: 'インフラ運用部',
                    status: 'Compliant',
                    risk_level: 'Medium',
                    cap_status: 'Not Applicable'
                }
            ];

            console.log('サンプル統制データを投入中...');
            sampleControls.forEach((control, index) => {
                db.run(`
                    INSERT INTO compliance_controls (
                        control_id, name, description, standard, category, 
                        responsible_team, status, risk_level, cap_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    control.control_id, control.name, control.description, 
                    control.standard, control.category, control.responsible_team,
                    control.status, control.risk_level, control.cap_status
                ], (err) => {
                    if (err) {
                        console.error(`サンプル統制データ${index + 1}の投入エラー:`, err);
                    } else {
                        console.log(`✅ サンプル統制データ${index + 1}投入完了: ${control.control_id}`);
                    }
                });
            });

            // サンプル監査データ
            const sampleAudits = [
                {
                    audit_name: 'ISO27001 年次内部監査',
                    standard: 'ISO27001/27002',
                    type: 'Internal',
                    scheduled_start_date: '2025-07-01',
                    scheduled_end_date: '2025-07-15',
                    status: 'Planned',
                    lead_auditor: '内部監査室',
                    findings_count: 0,
                    open_findings_count: 0
                },
                {
                    audit_name: '社内規定遵守状況確認',
                    standard: '社内規定XYZ',
                    type: 'Internal',
                    scheduled_start_date: '2025-08-01',
                    scheduled_end_date: '2025-08-10',
                    status: 'Planned',
                    lead_auditor: 'コンプライアンス部',
                    findings_count: 0,
                    open_findings_count: 0
                }
            ];

            console.log('サンプル監査データを投入中...');
            sampleAudits.forEach((audit, index) => {
                db.run(`
                    INSERT INTO compliance_audits (
                        audit_name, standard, type, scheduled_start_date, 
                        scheduled_end_date, status, lead_auditor, findings_count, open_findings_count
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    audit.audit_name, audit.standard, audit.type, 
                    audit.scheduled_start_date, audit.scheduled_end_date,
                    audit.status, audit.lead_auditor, audit.findings_count, audit.open_findings_count
                ], (err) => {
                    if (err) {
                        console.error(`サンプル監査データ${index + 1}の投入エラー:`, err);
                    } else {
                        console.log(`✅ サンプル監査データ${index + 1}投入完了: ${audit.audit_name}`);
                    }
                });
            });

            // サンプルリスクデータ
            const sampleRisks = [
                {
                    risk_description: 'アクセス権限の過剰付与によるデータ漏洩リスク',
                    related_control_id: 'ISO27001-A.9.1.1',
                    related_standard: 'ISO27001/27002',
                    likelihood: 'Medium',
                    impact: 'High',
                    overall_risk: 'High',
                    mitigation_plan: '定期的なアクセス権レビューの実施',
                    responsible_team: 'IT運用部',
                    status: 'Open',
                    due_date: '2025-09-30'
                },
                {
                    risk_description: 'バックアップ失敗による重要データ消失リスク',
                    related_control_id: 'INTERNAL-001',
                    related_standard: '社内規定XYZ',
                    likelihood: 'Low',
                    impact: 'Critical',
                    overall_risk: 'Medium',
                    mitigation_plan: 'バックアップ監視システムの強化',
                    responsible_team: 'インフラ運用部',
                    status: 'Mitigating',
                    due_date: '2025-08-31'
                }
            ];

            console.log('サンプルリスクデータを投入中...');
            sampleRisks.forEach((risk, index) => {
                db.run(`
                    INSERT INTO compliance_risks (
                        risk_description, related_control_id, related_standard,
                        likelihood, impact, overall_risk, mitigation_plan,
                        responsible_team, status, due_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    risk.risk_description, risk.related_control_id, risk.related_standard,
                    risk.likelihood, risk.impact, risk.overall_risk, risk.mitigation_plan,
                    risk.responsible_team, risk.status, risk.due_date
                ], (err) => {
                    if (err) {
                        console.error(`サンプルリスクデータ${index + 1}の投入エラー:`, err);
                    } else {
                        console.log(`✅ サンプルリスクデータ${index + 1}投入完了`);
                    }
                    
                    if (index === sampleRisks.length - 1) {
                        resolve();
                    }
                });
            });
        });
    });
};

// 初期化実行
createTables()
    .then(() => insertSampleData())
    .then(() => {
        console.log('\n🎉 コンプライアンス管理データベースの初期化が完了しました！');
        console.log('📋 作成されたテーブル:');
        console.log('  - compliance_controls (統制管理)');
        console.log('  - compliance_audits (監査管理)');
        console.log('  - compliance_risks (リスク管理)');
        console.log('\n📊 投入されたサンプルデータ:');
        console.log('  - 統制データ: 3件');
        console.log('  - 監査データ: 2件');
        console.log('  - リスクデータ: 2件');
        db.close();
    })
    .catch((error) => {
        console.error('❌ 初期化エラー:', error);
        db.close();
        process.exit(1);
    });