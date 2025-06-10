// セキュリティ管理API - ITSM準拠IT運用システムプラットフォーム
// 作成日: 2025年6月10日

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../db/itsm.sqlite');

// データベース接続関数
function getDbConnection() {
  return new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Security API: Database connection error:', err);
    }
  });
}

// 監査ログ記録関数
function logAuditEvent(action, details, userId = null, result = 'Success') {
  const db = getDbConnection();
  
  const insertLog = db.prepare(`
    INSERT INTO logs (event_type, event_subtype, user_id, action, target_table, 
                     details, result, event_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  insertLog.run([
    'Security Management',
    'Security API',
    userId,
    action,
    'security_events',
    details,
    result,
    new Date().toISOString()
  ]);
  
  insertLog.finalize();
  db.close();
}

// ========================================
// セキュリティイベント管理
// ========================================

// セキュリティイベント一覧取得
router.get('/events', (req, res) => {
  const db = getDbConnection();
  
  const {
    page = 1,
    limit = 20,
    severity,
    event_type,
    status,
    search,
    start_date,
    end_date
  } = req.query;
  
  const offset = (page - 1) * limit;
  let whereConditions = [];
  let params = [];
  
  // フィルタリング条件
  if (severity) {
    whereConditions.push('severity = ?');
    params.push(severity);
  }
  
  if (event_type) {
    whereConditions.push('event_type = ?');
    params.push(event_type);
  }
  
  if (status) {
    whereConditions.push('status = ?');
    params.push(status);
  }
  
  if (search) {
    whereConditions.push('(title LIKE ? OR description LIKE ? OR source_system LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  if (start_date) {
    whereConditions.push('detected_at >= ?');
    params.push(start_date);
  }
  
  if (end_date) {
    whereConditions.push('detected_at <= ?');
    params.push(end_date);
  }
  
  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
  
  // 総件数取得
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM security_events ${whereClause}
  `;
  
  db.get(countQuery, params, (err, countResult) => {
    if (err) {
      console.error('Security events count error:', err);
      return res.status(500).json({
        success: false,
        error: {
          type: 'DATABASE_ERROR',
          message: 'セキュリティイベント件数の取得に失敗しました'
        }
      });
    }
    
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);
    
    // データ取得
    const selectQuery = `
      SELECT 
        event_id,
        title,
        description,
        event_type,
        severity,
        status,
        source_system,
        source_ip,
        target_asset,
        detected_at,
        resolved_at,
        assigned_to,
        created_at,
        updated_at
      FROM security_events 
      ${whereClause}
      ORDER BY detected_at DESC, severity DESC
      LIMIT ? OFFSET ?
    `;
    
    const queryParams = [...params, parseInt(limit), offset];
    
    db.all(selectQuery, queryParams, (err, events) => {
      if (err) {
        console.error('Security events fetch error:', err);
        return res.status(500).json({
          success: false,
          error: {
            type: 'DATABASE_ERROR',
            message: 'セキュリティイベントの取得に失敗しました'
          }
        });
      }
      
      logAuditEvent('Read', `Retrieved ${events.length} security events`, req.user?.user_id);
      
      res.json({
        success: true,
        message: 'セキュリティイベント一覧を取得しました',
        data: events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages
        }
      });
    });
  });
  
  db.close();
});

// セキュリティイベント統計情報
router.get('/events/stats', (req, res) => {
  const db = getDbConnection();
  
  const statsQuery = `
    SELECT 
      COUNT(*) as total_events,
      COUNT(CASE WHEN severity = 'Critical' THEN 1 END) as critical_events,
      COUNT(CASE WHEN severity = 'High' THEN 1 END) as high_events,
      COUNT(CASE WHEN severity = 'Medium' THEN 1 END) as medium_events,
      COUNT(CASE WHEN severity = 'Low' THEN 1 END) as low_events,
      COUNT(CASE WHEN status = 'Open' THEN 1 END) as open_events,
      COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress_events,
      COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved_events,
      COUNT(CASE WHEN status = 'Closed' THEN 1 END) as closed_events,
      COUNT(CASE WHEN DATE(detected_at) = DATE('now') THEN 1 END) as today_events,
      COUNT(CASE WHEN DATE(detected_at) >= DATE('now', '-7 days') THEN 1 END) as week_events,
      COUNT(CASE WHEN DATE(detected_at) >= DATE('now', '-30 days') THEN 1 END) as month_events
    FROM security_events
  `;
  
  db.get(statsQuery, [], (err, stats) => {
    if (err) {
      console.error('Security events stats error:', err);
      return res.status(500).json({
        success: false,
        error: {
          type: 'DATABASE_ERROR',
          message: 'セキュリティイベント統計の取得に失敗しました'
        }
      });
    }
    
    // イベントタイプ別統計
    const typeStatsQuery = `
      SELECT 
        event_type,
        COUNT(*) as count,
        COUNT(CASE WHEN status IN ('Open', 'In Progress') THEN 1 END) as active_count
      FROM security_events 
      GROUP BY event_type 
      ORDER BY count DESC
    `;
    
    db.all(typeStatsQuery, [], (err, typeStats) => {
      if (err) {
        console.error('Security event type stats error:', err);
        return res.status(500).json({
          success: false,
          error: {
            type: 'DATABASE_ERROR',
            message: 'セキュリティイベントタイプ統計の取得に失敗しました'
          }
        });
      }
      
      res.json({
        success: true,
        message: 'セキュリティイベント統計を取得しました',
        data: {
          ...stats,
          event_type_stats: typeStats
        }
      });
    });
  });
  
  db.close();
});

// セキュリティイベント詳細取得
router.get('/events/:id', (req, res) => {
  const { id } = req.params;
  const db = getDbConnection();
  
  const selectQuery = `
    SELECT 
      se.*,
      u1.display_name as assigned_to_name,
      u2.display_name as created_by_name,
      u3.display_name as updated_by_name
    FROM security_events se
    LEFT JOIN users u1 ON se.assigned_to = u1.username
    LEFT JOIN users u2 ON se.created_by = u2.username  
    LEFT JOIN users u3 ON se.updated_by = u3.username
    WHERE se.event_id = ?
  `;
  
  db.get(selectQuery, [id], (err, event) => {
    if (err) {
      console.error('Security event fetch error:', err);
      return res.status(500).json({
        success: false,
        error: {
          type: 'DATABASE_ERROR',
          message: 'セキュリティイベントの取得に失敗しました'
        }
      });
    }
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND_ERROR',
          message: 'セキュリティイベントが見つかりません'
        }
      });
    }
    
    // JSONフィールドをパース
    try {
      if (event.indicators) {
        event.indicators = JSON.parse(event.indicators);
      }
      if (event.mitigation_steps) {
        event.mitigation_steps = JSON.parse(event.mitigation_steps);
      }
      if (event.evidence) {
        event.evidence = JSON.parse(event.evidence);
      }
    } catch (parseErr) {
      console.warn('JSON parse warning for security event:', parseErr);
    }
    
    logAuditEvent('Read', `Retrieved security event: ${event.title}`, req.user?.user_id);
    
    res.json({
      success: true,
      message: 'セキュリティイベント詳細を取得しました',
      data: event
    });
  });
  
  db.close();
});

// セキュリティイベント作成
router.post('/events', (req, res) => {
  const {
    title,
    description,
    event_type,
    severity = 'Medium',
    source_system,
    source_ip,
    target_asset,
    indicators,
    mitigation_steps,
    evidence,
    assigned_to
  } = req.body;
  
  // バリデーション
  if (!title || !description || !event_type) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'タイトル、説明、イベントタイプは必須です'
      }
    });
  }
  
  const db = getDbConnection();
  
  const insertQuery = `
    INSERT INTO security_events (
      title, description, event_type, severity, source_system, source_ip,
      target_asset, indicators, mitigation_steps, evidence, assigned_to,
      status, detected_at, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const now = new Date().toISOString();
  const username = req.user?.username || 'system';
  
  const insertParams = [
    title,
    description,
    event_type,
    severity,
    source_system || null,
    source_ip || null,
    target_asset || null,
    indicators ? JSON.stringify(indicators) : null,
    mitigation_steps ? JSON.stringify(mitigation_steps) : null,
    evidence ? JSON.stringify(evidence) : null,
    assigned_to || null,
    'Open',
    now,
    username,
    now,
    now
  ];
  
  db.run(insertQuery, insertParams, function(err) {
    if (err) {
      console.error('Security event creation error:', err);
      return res.status(500).json({
        success: false,
        error: {
          type: 'DATABASE_ERROR',
          message: 'セキュリティイベントの作成に失敗しました'
        }
      });
    }
    
    const eventId = this.lastID;
    
    logAuditEvent(
      'Create', 
      `Created security event: ${title} (ID: ${eventId})`, 
      req.user?.user_id
    );
    
    res.status(201).json({
      success: true,
      message: 'セキュリティイベントが作成されました',
      data: { event_id: eventId }
    });
  });
  
  db.close();
});

// セキュリティイベント更新
router.put('/events/:id', (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  const db = getDbConnection();
  
  // 更新可能フィールド
  const allowedFields = [
    'title', 'description', 'event_type', 'severity', 'status',
    'source_system', 'source_ip', 'target_asset', 'indicators',
    'mitigation_steps', 'evidence', 'assigned_to', 'resolution_notes'
  ];
  
  let updateFields = [];
  let updateParams = [];
  
  allowedFields.forEach(field => {
    if (updateData.hasOwnProperty(field)) {
      updateFields.push(`${field} = ?`);
      if (field === 'indicators' || field === 'mitigation_steps' || field === 'evidence') {
        updateParams.push(updateData[field] ? JSON.stringify(updateData[field]) : null);
      } else {
        updateParams.push(updateData[field]);
      }
    }
  });
  
  if (updateFields.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: '更新するフィールドが指定されていません'
      }
    });
  }
  
  // ステータスが解決済みの場合、解決日時を設定
  if (updateData.status === 'Resolved' || updateData.status === 'Closed') {
    updateFields.push('resolved_at = ?');
    updateParams.push(new Date().toISOString());
  }
  
  updateFields.push('updated_by = ?', 'updated_at = ?');
  updateParams.push(req.user?.username || 'system', new Date().toISOString());
  updateParams.push(id);
  
  const updateQuery = `
    UPDATE security_events 
    SET ${updateFields.join(', ')}
    WHERE event_id = ?
  `;
  
  db.run(updateQuery, updateParams, function(err) {
    if (err) {
      console.error('Security event update error:', err);
      return res.status(500).json({
        success: false,
        error: {
          type: 'DATABASE_ERROR',
          message: 'セキュリティイベントの更新に失敗しました'
        }
      });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND_ERROR',
          message: 'セキュリティイベントが見つかりません'
        }
      });
    }
    
    logAuditEvent(
      'Update', 
      `Updated security event ID: ${id}`, 
      req.user?.user_id
    );
    
    res.json({
      success: true,
      message: 'セキュリティイベントが更新されました'
    });
  });
  
  db.close();
});

// ========================================
// セキュリティポリシー管理
// ========================================

// セキュリティポリシー一覧取得
router.get('/policies', (req, res) => {
  const db = getDbConnection();
  
  const { category, status, search } = req.query;
  
  let whereConditions = [];
  let params = [];
  
  if (category) {
    whereConditions.push('category = ?');
    params.push(category);
  }
  
  if (status) {
    whereConditions.push('status = ?');
    params.push(status);
  }
  
  if (search) {
    whereConditions.push('(policy_name LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  
  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
  
  const selectQuery = `
    SELECT 
      policy_id,
      policy_name,
      category,
      description,
      status,
      compliance_level,
      last_review_date,
      next_review_date,
      created_at,
      updated_at
    FROM security_policies 
    ${whereClause}
    ORDER BY category, policy_name
  `;
  
  db.all(selectQuery, params, (err, policies) => {
    if (err) {
      console.error('Security policies fetch error:', err);
      return res.status(500).json({
        success: false,
        error: {
          type: 'DATABASE_ERROR',
          message: 'セキュリティポリシーの取得に失敗しました'
        }
      });
    }
    
    res.json({
      success: true,
      message: 'セキュリティポリシー一覧を取得しました',
      data: policies
    });
  });
  
  db.close();
});

// ========================================
// 脆弱性管理
// ========================================

// 脆弱性一覧取得
router.get('/vulnerabilities', (req, res) => {
  const db = getDbConnection();
  
  const { severity, status, system, search } = req.query;
  
  let whereConditions = [];
  let params = [];
  
  if (severity) {
    whereConditions.push('severity = ?');
    params.push(severity);
  }
  
  if (status) {
    whereConditions.push('status = ?');
    params.push(status);
  }
  
  if (system) {
    whereConditions.push('affected_system = ?');
    params.push(system);
  }
  
  if (search) {
    whereConditions.push('(vulnerability_name LIKE ? OR description LIKE ? OR cve_id LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
  
  const selectQuery = `
    SELECT 
      vuln_id,
      vulnerability_name,
      cve_id,
      severity,
      cvss_score,
      affected_system,
      description,
      status,
      discovered_date,
      patch_available,
      patch_date,
      remediation_plan,
      target_fix_date,
      actual_fix_date,
      created_at,
      updated_at
    FROM vulnerabilities 
    ${whereClause}
    ORDER BY severity DESC, cvss_score DESC, discovered_date DESC
  `;
  
  db.all(selectQuery, params, (err, vulnerabilities) => {
    if (err) {
      console.error('Vulnerabilities fetch error:', err);
      return res.status(500).json({
        success: false,
        error: {
          type: 'DATABASE_ERROR',
          message: '脆弱性情報の取得に失敗しました'
        }
      });
    }
    
    res.json({
      success: true,
      message: '脆弱性一覧を取得しました',
      data: vulnerabilities
    });
  });
  
  db.close();
});

// ========================================
// セキュリティコンプライアンス状況
// ========================================

// セキュリティコンプライアンス状況取得
router.get('/compliance-status', (req, res) => {
  const db = getDbConnection();
  
  // セキュリティ統制の実施状況
  const controlsQuery = `
    SELECT 
      COUNT(*) as total_controls,
      COUNT(CASE WHEN status = 'Implemented' THEN 1 END) as implemented_controls,
      COUNT(CASE WHEN status = 'Partially Implemented' THEN 1 END) as partial_controls,
      COUNT(CASE WHEN status = 'Not Implemented' THEN 1 END) as not_implemented_controls,
      COUNT(CASE WHEN effectiveness = 'Effective' THEN 1 END) as effective_controls
    FROM compliance_controls 
    WHERE control_type = 'Security'
  `;
  
  db.get(controlsQuery, [], (err, controlsStats) => {
    if (err) {
      console.error('Security controls stats error:', err);
      return res.status(500).json({
        success: false,
        error: {
          type: 'DATABASE_ERROR',
          message: 'セキュリティ統制状況の取得に失敗しました'
        }
      });
    }
    
    // セキュリティポリシーの状況
    const policiesQuery = `
      SELECT 
        COUNT(*) as total_policies,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_policies,
        COUNT(CASE WHEN status = 'Under Review' THEN 1 END) as review_policies,
        COUNT(CASE WHEN next_review_date < DATE('now') THEN 1 END) as overdue_reviews
      FROM security_policies
    `;
    
    db.get(policiesQuery, [], (err, policiesStats) => {
      if (err) {
        console.error('Security policies stats error:', err);
        return res.status(500).json({
          success: false,
          error: {
            type: 'DATABASE_ERROR',
            message: 'セキュリティポリシー状況の取得に失敗しました'
          }
        });
      }
      
      // 脆弱性の状況
      const vulnQuery = `
        SELECT 
          COUNT(*) as total_vulnerabilities,
          COUNT(CASE WHEN severity = 'Critical' THEN 1 END) as critical_vulns,
          COUNT(CASE WHEN severity = 'High' THEN 1 END) as high_vulns,
          COUNT(CASE WHEN status = 'Open' THEN 1 END) as open_vulns,
          COUNT(CASE WHEN target_fix_date < DATE('now') AND status != 'Fixed' THEN 1 END) as overdue_vulns
        FROM vulnerabilities
      `;
      
      db.get(vulnQuery, [], (err, vulnStats) => {
        if (err) {
          console.error('Vulnerabilities stats error:', err);
          return res.status(500).json({
            success: false,
            error: {
              type: 'DATABASE_ERROR',
              message: '脆弱性状況の取得に失敗しました'
            }
          });
        }
        
        // コンプライアンススコア計算
        const implementedRatio = controlsStats.total_controls > 0 
          ? (controlsStats.implemented_controls / controlsStats.total_controls) * 100 
          : 0;
        
        const effectivenessRatio = controlsStats.total_controls > 0 
          ? (controlsStats.effective_controls / controlsStats.total_controls) * 100 
          : 0;
        
        const complianceScore = Math.round((implementedRatio + effectivenessRatio) / 2);
        
        res.json({
          success: true,
          message: 'セキュリティコンプライアンス状況を取得しました',
          data: {
            controls: controlsStats,
            policies: policiesStats,
            vulnerabilities: vulnStats,
            compliance_score: complianceScore,
            status: complianceScore >= 90 ? 'Excellent' : 
                   complianceScore >= 75 ? 'Good' : 
                   complianceScore >= 60 ? 'Fair' : 'Poor'
          }
        });
      });
    });
  });
  
  db.close();
});

// エラーハンドリングミドルウェア
router.use((err, req, res, next) => {
  console.error('Security API error:', err);
  res.status(500).json({
    success: false,
    error: {
      type: 'INTERNAL_SERVER_ERROR',
      message: 'セキュリティ管理システムでエラーが発生しました'
    }
  });
});

module.exports = router;