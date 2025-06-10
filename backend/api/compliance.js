const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'itsm.sqlite');

// 統制管理API
router.get('/controls', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    db.all(`
        SELECT * FROM compliance_controls 
        ORDER BY control_id ASC
    `, (err, rows) => {
        if (err) {
            console.error('統制一覧取得エラー:', err);
            res.status(500).json({ error: '統制一覧の取得に失敗しました' });
        } else {
            const controls = rows.map(row => ({
                id: row.id.toString(),
                controlId: row.control_id,
                name: row.name,
                description: row.description,
                standard: row.standard,
                category: row.category,
                responsibleTeam: row.responsible_team,
                status: row.status,
                lastAuditDate: row.last_audit_date,
                nextAuditDate: row.next_audit_date,
                evidenceLinks: row.evidence_links ? JSON.parse(row.evidence_links) : [],
                notes: row.notes,
                riskLevel: row.risk_level,
                capStatus: row.cap_status
            }));
            res.json(controls);
        }
        db.close();
    });
});

router.post('/controls', (req, res) => {
    const {
        controlId, name, description, standard, category, responsibleTeam,
        status, lastAuditDate, nextAuditDate, evidenceLinks, notes, riskLevel, capStatus
    } = req.body;

    if (!controlId || !name || !description || !standard || !category || !status) {
        return res.status(400).json({ error: '必須フィールドが不足しています' });
    }

    const db = new sqlite3.Database(dbPath);

    db.run(`
        INSERT INTO compliance_controls (
            control_id, name, description, standard, category, responsible_team,
            status, last_audit_date, next_audit_date, evidence_links, notes, risk_level, cap_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        controlId, name, description, standard, category, responsibleTeam,
        status, lastAuditDate, nextAuditDate, evidenceLinks ? JSON.stringify(evidenceLinks) : null,
        notes, riskLevel, capStatus
    ], function(err) {
        if (err) {
            console.error('統制作成エラー:', err);
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                res.status(409).json({ error: '統制IDが既に存在します' });
            } else {
                res.status(500).json({ error: '統制の作成に失敗しました' });
            }
        } else {
            res.status(201).json({ 
                message: '統制が正常に作成されました', 
                id: this.lastID.toString() 
            });
        }
        db.close();
    });
});

router.put('/controls/:id', (req, res) => {
    const id = req.params.id;
    const {
        controlId, name, description, standard, category, responsibleTeam,
        status, lastAuditDate, nextAuditDate, evidenceLinks, notes, riskLevel, capStatus
    } = req.body;

    const db = new sqlite3.Database(dbPath);

    db.run(`
        UPDATE compliance_controls SET
            control_id = ?, name = ?, description = ?, standard = ?, category = ?,
            responsible_team = ?, status = ?, last_audit_date = ?, next_audit_date = ?,
            evidence_links = ?, notes = ?, risk_level = ?, cap_status = ?,
            updated_date = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [
        controlId, name, description, standard, category, responsibleTeam,
        status, lastAuditDate, nextAuditDate, evidenceLinks ? JSON.stringify(evidenceLinks) : null,
        notes, riskLevel, capStatus, id
    ], function(err) {
        if (err) {
            console.error('統制更新エラー:', err);
            res.status(500).json({ error: '統制の更新に失敗しました' });
        } else if (this.changes === 0) {
            res.status(404).json({ error: '統制が見つかりません' });
        } else {
            res.json({ message: '統制が正常に更新されました' });
        }
        db.close();
    });
});

router.delete('/controls/:id', (req, res) => {
    const id = req.params.id;
    const db = new sqlite3.Database(dbPath);

    db.run('DELETE FROM compliance_controls WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('統制削除エラー:', err);
            res.status(500).json({ error: '統制の削除に失敗しました' });
        } else if (this.changes === 0) {
            res.status(404).json({ error: '統制が見つかりません' });
        } else {
            res.json({ message: '統制が正常に削除されました' });
        }
        db.close();
    });
});

// 監査管理API
router.get('/audits', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    db.all(`
        SELECT * FROM compliance_audits 
        ORDER BY scheduled_start_date DESC
    `, (err, rows) => {
        if (err) {
            console.error('監査一覧取得エラー:', err);
            res.status(500).json({ error: '監査一覧の取得に失敗しました' });
        } else {
            const audits = rows.map(row => ({
                id: row.id.toString(),
                auditName: row.audit_name,
                standard: row.standard,
                type: row.type,
                scheduledStartDate: row.scheduled_start_date,
                scheduledEndDate: row.scheduled_end_date,
                actualStartDate: row.actual_start_date,
                actualEndDate: row.actual_end_date,
                status: row.status,
                leadAuditor: row.lead_auditor,
                findingsCount: row.findings_count,
                openFindingsCount: row.open_findings_count,
                summaryUrl: row.summary_url
            }));
            res.json(audits);
        }
        db.close();
    });
});

// リスク管理API
router.get('/risks', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    db.all(`
        SELECT * FROM compliance_risks 
        ORDER BY 
            CASE overall_risk 
                WHEN 'Critical' THEN 1 
                WHEN 'High' THEN 2 
                WHEN 'Medium' THEN 3 
                WHEN 'Low' THEN 4 
            END ASC
    `, (err, rows) => {
        if (err) {
            console.error('リスク一覧取得エラー:', err);
            res.status(500).json({ error: 'リスク一覧の取得に失敗しました' });
        } else {
            const risks = rows.map(row => ({
                id: row.id.toString(),
                riskDescription: row.risk_description,
                relatedControlId: row.related_control_id,
                relatedStandard: row.related_standard,
                likelihood: row.likelihood,
                impact: row.impact,
                overallRisk: row.overall_risk,
                mitigationPlan: row.mitigation_plan,
                responsibleTeam: row.responsible_team,
                status: row.status,
                dueDate: row.due_date
            }));
            res.json(risks);
        }
        db.close();
    });
});

// ========================================
// 不足機能の実装追加
// ========================================

// 統制詳細取得API
router.get('/controls/:id', (req, res) => {
    const id = req.params.id;
    const db = new sqlite3.Database(dbPath);
    
    const query = `
        SELECT 
            cc.*,
            COUNT(ca.id) as audit_count,
            COUNT(CASE WHEN ca.status = 'Open' THEN 1 END) as open_audits
        FROM compliance_controls cc
        LEFT JOIN compliance_audits ca ON cc.control_id = ca.control_id
        WHERE cc.id = ?
        GROUP BY cc.id
    `;
    
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('統制詳細取得エラー:', err);
            res.status(500).json({ 
                success: false,
                error: { message: '統制詳細の取得に失敗しました' }
            });
        } else if (!row) {
            res.status(404).json({ 
                success: false,
                error: { message: '統制が見つかりません' }
            });
        } else {
            const control = {
                id: row.id.toString(),
                controlId: row.control_id,
                name: row.name,
                description: row.description,
                standard: row.standard,
                category: row.category,
                responsibleTeam: row.responsible_team,
                status: row.status,
                lastAuditDate: row.last_audit_date,
                nextAuditDate: row.next_audit_date,
                evidenceLinks: row.evidence_links ? JSON.parse(row.evidence_links) : [],
                notes: row.notes,
                riskLevel: row.risk_level,
                capStatus: row.cap_status,
                auditCount: row.audit_count,
                openAudits: row.open_audits,
                createdDate: row.created_date,
                updatedDate: row.updated_date
            };
            res.json({
                success: true,
                message: '統制詳細を取得しました',
                data: control
            });
        }
        db.close();
    });
});

// 監査CRUD操作
router.post('/audits', (req, res) => {
    const {
        auditName, standard, type, scheduledStartDate, scheduledEndDate,
        leadAuditor, controlId, scope, objectives
    } = req.body;

    if (!auditName || !standard || !type || !scheduledStartDate || !leadAuditor) {
        return res.status(400).json({ 
            success: false,
            error: { message: '必須フィールドが不足しています' }
        });
    }

    const db = new sqlite3.Database(dbPath);

    db.run(`
        INSERT INTO compliance_audits (
            audit_name, standard, type, scheduled_start_date, scheduled_end_date,
            status, lead_auditor, control_id, scope, objectives, created_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
        auditName, standard, type, scheduledStartDate, scheduledEndDate,
        'Planned', leadAuditor, controlId, scope, objectives
    ], function(err) {
        if (err) {
            console.error('監査作成エラー:', err);
            res.status(500).json({ 
                success: false,
                error: { message: '監査の作成に失敗しました' }
            });
        } else {
            res.status(201).json({ 
                success: true,
                message: '監査が正常に作成されました', 
                data: { id: this.lastID.toString() }
            });
        }
        db.close();
    });
});

router.get('/audits/:id', (req, res) => {
    const id = req.params.id;
    const db = new sqlite3.Database(dbPath);
    
    db.get(`
        SELECT * FROM compliance_audits WHERE id = ?
    `, [id], (err, row) => {
        if (err) {
            console.error('監査詳細取得エラー:', err);
            res.status(500).json({ 
                success: false,
                error: { message: '監査詳細の取得に失敗しました' }
            });
        } else if (!row) {
            res.status(404).json({ 
                success: false,
                error: { message: '監査が見つかりません' }
            });
        } else {
            const audit = {
                id: row.id.toString(),
                auditName: row.audit_name,
                standard: row.standard,
                type: row.type,
                scheduledStartDate: row.scheduled_start_date,
                scheduledEndDate: row.scheduled_end_date,
                actualStartDate: row.actual_start_date,
                actualEndDate: row.actual_end_date,
                status: row.status,
                leadAuditor: row.lead_auditor,
                controlId: row.control_id,
                scope: row.scope,
                objectives: row.objectives,
                findingsCount: row.findings_count,
                openFindingsCount: row.open_findings_count,
                summaryUrl: row.summary_url,
                createdDate: row.created_date,
                updatedDate: row.updated_date
            };
            res.json({
                success: true,
                message: '監査詳細を取得しました',
                data: audit
            });
        }
        db.close();
    });
});

router.put('/audits/:id', (req, res) => {
    const id = req.params.id;
    const {
        auditName, standard, type, scheduledStartDate, scheduledEndDate,
        actualStartDate, actualEndDate, status, leadAuditor, findingsCount,
        openFindingsCount, summaryUrl, scope, objectives
    } = req.body;

    const db = new sqlite3.Database(dbPath);

    db.run(`
        UPDATE compliance_audits SET
            audit_name = ?, standard = ?, type = ?, scheduled_start_date = ?,
            scheduled_end_date = ?, actual_start_date = ?, actual_end_date = ?,
            status = ?, lead_auditor = ?, findings_count = ?, open_findings_count = ?,
            summary_url = ?, scope = ?, objectives = ?, updated_date = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [
        auditName, standard, type, scheduledStartDate, scheduledEndDate,
        actualStartDate, actualEndDate, status, leadAuditor, findingsCount,
        openFindingsCount, summaryUrl, scope, objectives, id
    ], function(err) {
        if (err) {
            console.error('監査更新エラー:', err);
            res.status(500).json({ 
                success: false,
                error: { message: '監査の更新に失敗しました' }
            });
        } else if (this.changes === 0) {
            res.status(404).json({ 
                success: false,
                error: { message: '監査が見つかりません' }
            });
        } else {
            res.json({ 
                success: true,
                message: '監査が正常に更新されました' 
            });
        }
        db.close();
    });
});

router.delete('/audits/:id', (req, res) => {
    const id = req.params.id;
    const db = new sqlite3.Database(dbPath);

    db.run('DELETE FROM compliance_audits WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('監査削除エラー:', err);
            res.status(500).json({ 
                success: false,
                error: { message: '監査の削除に失敗しました' }
            });
        } else if (this.changes === 0) {
            res.status(404).json({ 
                success: false,
                error: { message: '監査が見つかりません' }
            });
        } else {
            res.json({ 
                success: true,
                message: '監査が正常に削除されました' 
            });
        }
        db.close();
    });
});

// リスクCRUD操作
router.post('/risks', (req, res) => {
    const {
        riskDescription, relatedControlId, relatedStandard, likelihood,
        impact, mitigationPlan, responsibleTeam, dueDate
    } = req.body;

    if (!riskDescription || !likelihood || !impact || !responsibleTeam) {
        return res.status(400).json({ 
            success: false,
            error: { message: '必須フィールドが不足しています' }
        });
    }

    // リスクレベル計算
    const riskMatrix = {
        'Very Low-Low': 'Low', 'Very Low-Medium': 'Low', 'Very Low-High': 'Medium', 'Very Low-Very High': 'Medium',
        'Low-Low': 'Low', 'Low-Medium': 'Low', 'Low-High': 'Medium', 'Low-Very High': 'High',
        'Medium-Low': 'Low', 'Medium-Medium': 'Medium', 'Medium-High': 'High', 'Medium-Very High': 'High',
        'High-Low': 'Medium', 'High-Medium': 'High', 'High-High': 'High', 'High-Very High': 'Critical',
        'Very High-Low': 'Medium', 'Very High-Medium': 'High', 'Very High-High': 'Critical', 'Very High-Very High': 'Critical'
    };
    
    const overallRisk = riskMatrix[`${likelihood}-${impact}`] || 'Medium';

    const db = new sqlite3.Database(dbPath);

    db.run(`
        INSERT INTO compliance_risks (
            risk_description, related_control_id, related_standard, likelihood,
            impact, overall_risk, mitigation_plan, responsible_team, status, 
            due_date, created_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
        riskDescription, relatedControlId, relatedStandard, likelihood,
        impact, overallRisk, mitigationPlan, responsibleTeam, 'Open', dueDate
    ], function(err) {
        if (err) {
            console.error('リスク作成エラー:', err);
            res.status(500).json({ 
                success: false,
                error: { message: 'リスクの作成に失敗しました' }
            });
        } else {
            res.status(201).json({ 
                success: true,
                message: 'リスクが正常に作成されました', 
                data: { id: this.lastID.toString(), overallRisk }
            });
        }
        db.close();
    });
});

router.get('/risks/:id', (req, res) => {
    const id = req.params.id;
    const db = new sqlite3.Database(dbPath);
    
    db.get(`
        SELECT * FROM compliance_risks WHERE id = ?
    `, [id], (err, row) => {
        if (err) {
            console.error('リスク詳細取得エラー:', err);
            res.status(500).json({ 
                success: false,
                error: { message: 'リスク詳細の取得に失敗しました' }
            });
        } else if (!row) {
            res.status(404).json({ 
                success: false,
                error: { message: 'リスクが見つかりません' }
            });
        } else {
            const risk = {
                id: row.id.toString(),
                riskDescription: row.risk_description,
                relatedControlId: row.related_control_id,
                relatedStandard: row.related_standard,
                likelihood: row.likelihood,
                impact: row.impact,
                overallRisk: row.overall_risk,
                mitigationPlan: row.mitigation_plan,
                responsibleTeam: row.responsible_team,
                status: row.status,
                dueDate: row.due_date,
                createdDate: row.created_date,
                updatedDate: row.updated_date
            };
            res.json({
                success: true,
                message: 'リスク詳細を取得しました',
                data: risk
            });
        }
        db.close();
    });
});

router.put('/risks/:id', (req, res) => {
    const id = req.params.id;
    const {
        riskDescription, relatedControlId, relatedStandard, likelihood,
        impact, mitigationPlan, responsibleTeam, status, dueDate
    } = req.body;

    // リスクレベル再計算
    const riskMatrix = {
        'Very Low-Low': 'Low', 'Very Low-Medium': 'Low', 'Very Low-High': 'Medium', 'Very Low-Very High': 'Medium',
        'Low-Low': 'Low', 'Low-Medium': 'Low', 'Low-High': 'Medium', 'Low-Very High': 'High',
        'Medium-Low': 'Low', 'Medium-Medium': 'Medium', 'Medium-High': 'High', 'Medium-Very High': 'High',
        'High-Low': 'Medium', 'High-Medium': 'High', 'High-High': 'High', 'High-Very High': 'Critical',
        'Very High-Low': 'Medium', 'Very High-Medium': 'High', 'Very High-High': 'Critical', 'Very High-Very High': 'Critical'
    };
    
    const overallRisk = riskMatrix[`${likelihood}-${impact}`] || 'Medium';

    const db = new sqlite3.Database(dbPath);

    db.run(`
        UPDATE compliance_risks SET
            risk_description = ?, related_control_id = ?, related_standard = ?,
            likelihood = ?, impact = ?, overall_risk = ?, mitigation_plan = ?,
            responsible_team = ?, status = ?, due_date = ?, updated_date = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [
        riskDescription, relatedControlId, relatedStandard, likelihood,
        impact, overallRisk, mitigationPlan, responsibleTeam, status, dueDate, id
    ], function(err) {
        if (err) {
            console.error('リスク更新エラー:', err);
            res.status(500).json({ 
                success: false,
                error: { message: 'リスクの更新に失敗しました' }
            });
        } else if (this.changes === 0) {
            res.status(404).json({ 
                success: false,
                error: { message: 'リスクが見つかりません' }
            });
        } else {
            res.json({ 
                success: true,
                message: 'リスクが正常に更新されました',
                data: { overallRisk }
            });
        }
        db.close();
    });
});

router.delete('/risks/:id', (req, res) => {
    const id = req.params.id;
    const db = new sqlite3.Database(dbPath);

    db.run('DELETE FROM compliance_risks WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('リスク削除エラー:', err);
            res.status(500).json({ 
                success: false,
                error: { message: 'リスクの削除に失敗しました' }
            });
        } else if (this.changes === 0) {
            res.status(404).json({ 
                success: false,
                error: { message: 'リスクが見つかりません' }
            });
        } else {
            res.json({ 
                success: true,
                message: 'リスクが正常に削除されました' 
            });
        }
        db.close();
    });
});

// コンプライアンス評価API
router.get('/assessment', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    // 統制の実施状況
    const controlsQuery = `
        SELECT 
            COUNT(*) as total_controls,
            COUNT(CASE WHEN status = 'Implemented' THEN 1 END) as implemented,
            COUNT(CASE WHEN status = 'Partially Implemented' THEN 1 END) as partial,
            COUNT(CASE WHEN status = 'Not Implemented' THEN 1 END) as not_implemented,
            standard,
            category
        FROM compliance_controls 
        GROUP BY standard, category
    `;
    
    db.all(controlsQuery, [], (err, controlStats) => {
        if (err) {
            console.error('統制統計エラー:', err);
            res.status(500).json({ 
                success: false,
                error: { message: '統制統計の取得に失敗しました' }
            });
            db.close();
            return;
        }
        
        // リスクの状況
        const riskQuery = `
            SELECT 
                COUNT(*) as total_risks,
                COUNT(CASE WHEN overall_risk = 'Critical' THEN 1 END) as critical,
                COUNT(CASE WHEN overall_risk = 'High' THEN 1 END) as high,
                COUNT(CASE WHEN overall_risk = 'Medium' THEN 1 END) as medium,
                COUNT(CASE WHEN overall_risk = 'Low' THEN 1 END) as low,
                COUNT(CASE WHEN status = 'Open' THEN 1 END) as open_risks,
                COUNT(CASE WHEN due_date < DATE('now') AND status != 'Closed' THEN 1 END) as overdue_risks
            FROM compliance_risks
        `;
        
        db.get(riskQuery, [], (err, riskStats) => {
            if (err) {
                console.error('リスク統計エラー:', err);
                res.status(500).json({ 
                    success: false,
                    error: { message: 'リスク統計の取得に失敗しました' }
                });
                db.close();
                return;
            }
            
            // 監査の状況
            const auditQuery = `
                SELECT 
                    COUNT(*) as total_audits,
                    COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress,
                    COUNT(CASE WHEN status = 'Planned' THEN 1 END) as planned,
                    AVG(findings_count) as avg_findings,
                    COUNT(CASE WHEN scheduled_start_date < DATE('now') AND status = 'Planned' THEN 1 END) as overdue_audits
                FROM compliance_audits
            `;
            
            db.get(auditQuery, [], (err, auditStats) => {
                if (err) {
                    console.error('監査統計エラー:', err);
                    res.status(500).json({ 
                        success: false,
                        error: { message: '監査統計の取得に失敗しました' }
                    });
                    db.close();
                    return;
                }
                
                // コンプライアンススコア計算
                const totalControls = controlStats.reduce((sum, item) => sum + item.total_controls, 0);
                const implementedControls = controlStats.reduce((sum, item) => sum + item.implemented, 0);
                const implementationRate = totalControls > 0 ? (implementedControls / totalControls) * 100 : 0;
                
                const criticalRiskRate = riskStats.total_risks > 0 ? (riskStats.critical / riskStats.total_risks) * 100 : 0;
                const riskScore = Math.max(0, 100 - (criticalRiskRate * 2) - (riskStats.high / riskStats.total_risks * 100));
                
                const overallScore = Math.round((implementationRate * 0.6) + (riskScore * 0.4));
                
                let complianceLevel;
                if (overallScore >= 90) complianceLevel = 'Excellent';
                else if (overallScore >= 75) complianceLevel = 'Good';
                else if (overallScore >= 60) complianceLevel = 'Satisfactory';
                else if (overallScore >= 40) complianceLevel = 'Needs Improvement';
                else complianceLevel = 'Poor';
                
                res.json({
                    success: true,
                    message: 'コンプライアンス評価を取得しました',
                    data: {
                        overall_score: overallScore,
                        compliance_level: complianceLevel,
                        implementation_rate: Math.round(implementationRate),
                        controls: {
                            total: totalControls,
                            implemented: implementedControls,
                            by_category: controlStats
                        },
                        risks: riskStats,
                        audits: auditStats,
                        recommendations: [
                            overallScore < 75 ? '統制の実装率向上が必要です' : null,
                            riskStats.critical > 0 ? 'クリティカルリスクの対応が必要です' : null,
                            auditStats.overdue_audits > 0 ? '遅延している監査があります' : null
                        ].filter(Boolean)
                    }
                });
                
                db.close();
            });
        });
    });
});

// 統制有効性テストAPI
router.post('/controls/:id/effectiveness-test', (req, res) => {
    const controlId = req.params.id;
    const { testType, testResults, effectiveness, notes, testDate } = req.body;
    
    if (!testType || !testResults || !effectiveness) {
        return res.status(400).json({ 
            success: false,
            error: { message: '必須フィールドが不足しています' }
        });
    }
    
    const db = new sqlite3.Database(dbPath);
    
    // 統制の有効性を更新
    db.run(`
        UPDATE compliance_controls 
        SET effectiveness = ?, 
            last_test_date = ?,
            test_results = ?,
            updated_date = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [effectiveness, testDate || new Date().toISOString().split('T')[0], JSON.stringify(testResults), controlId], function(err) {
        if (err) {
            console.error('統制有効性テスト更新エラー:', err);
            res.status(500).json({ 
                success: false,
                error: { message: '統制有効性テストの更新に失敗しました' }
            });
        } else if (this.changes === 0) {
            res.status(404).json({ 
                success: false,
                error: { message: '統制が見つかりません' }
            });
        } else {
            res.json({ 
                success: true,
                message: '統制有効性テストが完了しました',
                data: {
                    control_id: controlId,
                    effectiveness: effectiveness,
                    test_date: testDate
                }
            });
        }
        db.close();
    });
});

module.exports = router;