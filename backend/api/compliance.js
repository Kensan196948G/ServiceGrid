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

module.exports = router;