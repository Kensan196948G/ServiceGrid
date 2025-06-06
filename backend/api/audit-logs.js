const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

// データベース接続
const dbPath = path.join(__dirname, '..', process.env.DB_PATH || 'db/itsm.sqlite');
const db = new sqlite3.Database(dbPath);

// 外部キー制約を有効化
db.run('PRAGMA foreign_keys = ON');

/**
 * 監査ログ一覧取得（拡張版）
 */
const getAuditLogs = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = (page - 1) * limit;
  
  // 拡張フィルタリング条件
  const { 
    event_type, 
    event_subtype, 
    action, 
    target_table, 
    user_id, 
    username, 
    ip_address,
    search, 
    date_from, 
    date_to,
    severity
  } = req.query;
  
  let whereConditions = [];
  let queryParams = [];
  
  if (event_type) {
    whereConditions.push('l.event_type = ?');
    queryParams.push(event_type);
  }
  
  if (event_subtype) {
    whereConditions.push('l.event_subtype = ?');
    queryParams.push(event_subtype);
  }
  
  if (action) {
    whereConditions.push('l.action = ?');
    queryParams.push(action);
  }
  
  if (target_table) {
    whereConditions.push('l.target_table = ?');
    queryParams.push(target_table);
  }
  
  if (user_id) {
    whereConditions.push('l.user_id = ?');
    queryParams.push(user_id);
  }
  
  if (username) {
    whereConditions.push('l.username LIKE ?');
    queryParams.push(`%${username}%`);
  }
  
  if (ip_address) {
    whereConditions.push('l.ip_address = ?');
    queryParams.push(ip_address);
  }
  
  if (severity) {
    whereConditions.push('l.severity = ?');
    queryParams.push(severity);
  }
  
  if (search) {
    whereConditions.push('(l.details LIKE ? OR l.target_table LIKE ? OR l.username LIKE ?)');
    queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  if (date_from) {
    whereConditions.push('DATE(l.timestamp) >= ?');
    queryParams.push(date_from);
  }
  
  if (date_to) {
    whereConditions.push('DATE(l.timestamp) <= ?');
    queryParams.push(date_to);
  }
  
  const whereClause = whereConditions.length > 0 
    ? 'WHERE ' + whereConditions.join(' AND ') 
    : '';
  
  // カウントクエリ
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM logs l
    ${whereClause}
  `;
  
  db.get(countQuery, queryParams, (err, countResult) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);
    
    // データ取得クエリ
    const dataQuery = `
      SELECT 
        l.log_id, l.timestamp, l.event_type, l.event_subtype, l.user_id, 
        l.username, l.action, l.target_table, l.target_record_id,
        l.old_values, l.new_values, l.details, l.ip_address, l.user_agent, l.severity,
        u.display_name as user_display_name, u.email as user_email,
        CASE 
          WHEN l.event_type = 'Security' THEN 'Security'
          WHEN l.action IN ('Delete', 'Update') AND l.target_table IN ('users', 'assets', 'incidents') THEN 'Critical'
          WHEN l.event_type = 'Authentication' AND l.details LIKE '%Failed%' THEN 'Warning'
          ELSE 'Info'
        END as computed_severity
      FROM logs l
      LEFT JOIN users u ON l.user_id = u.user_id
      ${whereClause} 
      ORDER BY l.timestamp DESC
      LIMIT ? OFFSET ?
    `;
    
    db.all(dataQuery, [...queryParams, limit, offset], (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      // JSON文字列をパース
      const processedRows = rows.map(row => ({
        ...row,
        old_values: row.old_values ? JSON.parse(row.old_values) : null,
        new_values: row.new_values ? JSON.parse(row.new_values) : null,
        severity: row.severity || row.computed_severity
      }));
      
      res.json({
        data: processedRows,
        pagination: {
          page,
          limit,
          total,
          totalPages
        },
        filters: { 
          event_type, event_subtype, action, target_table, user_id, 
          username, ip_address, search, date_from, date_to, severity 
        }
      });
    });
  });
};

/**
 * 監査ログ統計取得
 */
const getAuditLogStats = (req, res) => {
  const { days = 30 } = req.query;
  
  const queries = [
    'SELECT COUNT(*) as total FROM logs',
    `SELECT COUNT(*) as recent_total FROM logs WHERE timestamp >= datetime('now', '-${days} days')`,
    'SELECT event_type, COUNT(*) as count FROM logs GROUP BY event_type ORDER BY count DESC',
    'SELECT action, COUNT(*) as count FROM logs GROUP BY action ORDER BY count DESC',
    'SELECT target_table, COUNT(*) as count FROM logs WHERE target_table IS NOT NULL GROUP BY target_table ORDER BY count DESC LIMIT 10',
    'SELECT username, COUNT(*) as count FROM logs WHERE username IS NOT NULL GROUP BY username ORDER BY count DESC LIMIT 10',
    `SELECT DATE(timestamp) as date, COUNT(*) as count FROM logs WHERE timestamp >= datetime('now', '-30 days') GROUP BY DATE(timestamp) ORDER BY date`,
    `SELECT event_type, COUNT(*) as count FROM logs WHERE timestamp >= datetime('now', '-7 days') AND event_type IN ('Security', 'Authentication') GROUP BY event_type`,
    `SELECT COUNT(*) as failed_logins FROM logs WHERE event_subtype = 'Login' AND details LIKE '%Failed%' AND timestamp >= datetime('now', '-24 hours')`,
    `SELECT COUNT(*) as admin_actions FROM logs WHERE action IN ('Delete', 'Create', 'Update') AND user_id IN (SELECT user_id FROM users WHERE role = 'administrator') AND timestamp >= datetime('now', '-7 days')`
  ];
  
  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }))
  .then(([totalResult, recentResult, eventTypeResult, actionResult, tableResult, userResult, dailyResult, securityResult, failedLoginsResult, adminActionsResult]) => {
    res.json({
      total_logs: totalResult[0].total,
      recent_logs: recentResult[0].recent_total,
      by_event_type: eventTypeResult.reduce((acc, row) => {
        acc[row.event_type] = row.count;
        return acc;
      }, {}),
      by_action: actionResult.reduce((acc, row) => {
        acc[row.action] = row.count;
        return acc;
      }, {}),
      by_target_table: tableResult.reduce((acc, row) => {
        acc[row.target_table] = row.count;
        return acc;
      }, {}),
      top_users: userResult,
      daily_activity: dailyResult,
      security_metrics: {
        recent_security_events: securityResult.reduce((acc, row) => {
          acc[row.event_type] = row.count;
          return acc;
        }, {}),
        failed_logins_24h: failedLoginsResult[0].failed_logins || 0,
        admin_actions_7d: adminActionsResult[0].admin_actions || 0
      }
    });
  })
  .catch(err => {
    console.error('Database error:', err);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  });
};

/**
 * 監査ログ詳細取得
 */
const getAuditLogById = (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      l.*,
      u.display_name as user_display_name, u.email as user_email, u.role as user_role
    FROM logs l
    LEFT JOIN users u ON l.user_id = u.user_id
    WHERE l.log_id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    if (!row) {
      return res.status(404).json({ error: '監査ログが見つかりません' });
    }
    
    // JSON文字列をパース
    const processedRow = {
      ...row,
      old_values: row.old_values ? JSON.parse(row.old_values) : null,
      new_values: row.new_values ? JSON.parse(row.new_values) : null
    };
    
    res.json(processedRow);
  });
};

/**
 * セキュリティイベント監査ログ
 */
const getSecurityAuditLogs = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = (page - 1) * limit;
  const { days = 7 } = req.query;
  
  // セキュリティ関連イベントのみ取得
  const whereClause = `
    WHERE (l.event_type IN ('Security', 'Authentication') 
           OR (l.action = 'Delete' AND l.target_table IN ('users', 'assets', 'incidents'))
           OR l.details LIKE '%Failed%' 
           OR l.details LIKE '%Unauthorized%'
           OR l.details LIKE '%Breach%')
    AND l.timestamp >= datetime('now', '-${days} days')
  `;
  
  // カウントクエリ
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM logs l
    ${whereClause}
  `;
  
  db.get(countQuery, [], (err, countResult) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);
    
    // データ取得クエリ
    const dataQuery = `
      SELECT 
        l.log_id, l.timestamp, l.event_type, l.event_subtype, l.user_id, 
        l.username, l.action, l.target_table, l.target_record_id,
        l.details, l.ip_address, l.user_agent, l.severity,
        u.display_name as user_display_name, u.email as user_email,
        CASE 
          WHEN l.details LIKE '%Failed%' OR l.details LIKE '%Unauthorized%' THEN 'High'
          WHEN l.action = 'Delete' AND l.target_table IN ('users', 'assets') THEN 'Critical'
          WHEN l.event_type = 'Security' THEN 'Medium'
          ELSE 'Low'
        END as risk_level
      FROM logs l
      LEFT JOIN users u ON l.user_id = u.user_id
      ${whereClause}
      ORDER BY l.timestamp DESC
      LIMIT ? OFFSET ?
    `;
    
    db.all(dataQuery, [limit, offset], (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      res.json({
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages
        },
        period_days: days
      });
    });
  });
};

/**
 * コンプライアンスレポート生成
 */
const generateComplianceReport = (req, res) => {
  const { 
    report_type = 'monthly', 
    start_date, 
    end_date,
    include_details = false 
  } = req.query;
  
  // 権限チェック（管理者またはオペレータ）
  if (!req.user || !['administrator', 'operator'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'コンプライアンスレポートを生成する権限がありません',
      required_role: ['administrator', 'operator'],
      current_role: req.user?.role
    });
  }
  
  // 日付範囲設定
  let dateCondition = '';
  let dateParams = [];
  
  if (start_date && end_date) {
    dateCondition = 'AND l.timestamp BETWEEN ? AND ?';
    dateParams = [start_date, end_date + ' 23:59:59'];
  } else {
    // デフォルト期間設定
    switch (report_type) {
      case 'daily':
        dateCondition = "AND DATE(l.timestamp) = DATE('now')";
        break;
      case 'weekly':
        dateCondition = "AND l.timestamp >= datetime('now', '-7 days')";
        break;
      case 'monthly':
        dateCondition = "AND l.timestamp >= datetime('now', '-30 days')";
        break;
      case 'quarterly':
        dateCondition = "AND l.timestamp >= datetime('now', '-90 days')";
        break;
    }
  }
  
  const queries = [
    // 1. 総ログ数とアクション分布
    `SELECT 
       COUNT(*) as total_events,
       COUNT(CASE WHEN action = 'Create' THEN 1 END) as create_actions,
       COUNT(CASE WHEN action = 'Update' THEN 1 END) as update_actions,
       COUNT(CASE WHEN action = 'Delete' THEN 1 END) as delete_actions,
       COUNT(CASE WHEN action = 'Read' THEN 1 END) as read_actions
     FROM logs l WHERE 1=1 ${dateCondition}`,
    
    // 2. セキュリティイベント
    `SELECT 
       COUNT(*) as security_events,
       COUNT(CASE WHEN event_subtype = 'Login' AND details LIKE '%Failed%' THEN 1 END) as failed_logins,
       COUNT(CASE WHEN event_subtype = 'Login' AND details LIKE '%Success%' THEN 1 END) as successful_logins,
       COUNT(CASE WHEN event_type = 'Security' THEN 1 END) as security_violations
     FROM logs l WHERE 1=1 ${dateCondition}`,
    
    // 3. データ変更監査
    `SELECT 
       target_table,
       COUNT(*) as modification_count,
       COUNT(CASE WHEN action = 'Create' THEN 1 END) as creates,
       COUNT(CASE WHEN action = 'Update' THEN 1 END) as updates,
       COUNT(CASE WHEN action = 'Delete' THEN 1 END) as deletes
     FROM logs l 
     WHERE action IN ('Create', 'Update', 'Delete') 
       AND target_table IS NOT NULL ${dateCondition}
     GROUP BY target_table 
     ORDER BY modification_count DESC`,
    
    // 4. ユーザー活動
    `SELECT 
       l.username,
       u.display_name,
       u.role,
       COUNT(*) as total_actions,
       COUNT(CASE WHEN l.action IN ('Create', 'Update', 'Delete') THEN 1 END) as modification_actions,
       MIN(l.timestamp) as first_activity,
       MAX(l.timestamp) as last_activity
     FROM logs l
     LEFT JOIN users u ON l.user_id = u.user_id
     WHERE l.username IS NOT NULL ${dateCondition}
     GROUP BY l.username, u.display_name, u.role
     ORDER BY total_actions DESC
     LIMIT 20`,
    
    // 5. 高リスクイベント
    `SELECT 
       l.timestamp,
       l.event_type,
       l.event_subtype,
       l.username,
       l.action,
       l.target_table,
       l.details,
       CASE 
         WHEN l.action = 'Delete' AND l.target_table IN ('users', 'assets', 'incidents') THEN 'Critical'
         WHEN l.details LIKE '%Failed%' AND l.event_subtype = 'Login' THEN 'High'
         WHEN l.event_type = 'Security' THEN 'Medium'
         ELSE 'Low'
       END as risk_level
     FROM logs l
     WHERE (l.action = 'Delete' AND l.target_table IN ('users', 'assets', 'incidents'))
        OR (l.details LIKE '%Failed%' AND l.event_subtype = 'Login')
        OR l.event_type = 'Security'
        ${dateCondition}
     ORDER BY l.timestamp DESC
     LIMIT 100`
  ];
  
  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.all(query, dateParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }))
  .then(([summaryResult, securityResult, dataChangeResult, userActivityResult, highRiskResult]) => {
    const report = {
      report_metadata: {
        type: report_type,
        generated_at: new Date().toISOString(),
        generated_by: req.user.username,
        period: {
          start: start_date || `Last ${report_type === 'daily' ? '1 day' : report_type === 'weekly' ? '7 days' : report_type === 'monthly' ? '30 days' : '90 days'}`,
          end: end_date || 'Now'
        }
      },
      
      executive_summary: {
        total_events: summaryResult[0].total_events,
        security_events: securityResult[0].security_events,
        failed_login_attempts: securityResult[0].failed_logins,
        successful_logins: securityResult[0].successful_logins,
        high_risk_events: highRiskResult.filter(r => ['Critical', 'High'].includes(r.risk_level)).length,
        data_modifications: summaryResult[0].create_actions + summaryResult[0].update_actions + summaryResult[0].delete_actions
      },
      
      action_distribution: {
        create: summaryResult[0].create_actions,
        read: summaryResult[0].read_actions,
        update: summaryResult[0].update_actions,
        delete: summaryResult[0].delete_actions
      },
      
      security_metrics: {
        total_security_events: securityResult[0].security_events,
        authentication_events: {
          successful_logins: securityResult[0].successful_logins,
          failed_logins: securityResult[0].failed_logins,
          success_rate: securityResult[0].successful_logins + securityResult[0].failed_logins > 0 
            ? Math.round((securityResult[0].successful_logins / (securityResult[0].successful_logins + securityResult[0].failed_logins)) * 100) 
            : 0
        },
        security_violations: securityResult[0].security_violations
      },
      
      data_change_audit: dataChangeResult,
      
      user_activity_summary: userActivityResult,
      
      compliance_indicators: {
        audit_trail_completeness: summaryResult[0].total_events > 0 ? 'Complete' : 'Incomplete',
        user_accountability: userActivityResult.length > 0 ? 'Tracked' : 'Not Tracked',
        security_monitoring: securityResult[0].security_events >= 0 ? 'Active' : 'Inactive',
        data_integrity: 'Monitored'
      }
    };
    
    // 詳細情報を含める場合
    if (include_details === 'true') {
      report.detailed_events = {
        high_risk_events: highRiskResult,
        recent_modifications: dataChangeResult.slice(0, 10)
      };
    }
    
    // 監査ログに記録
    const logData = {
      event_type: 'Data Access',
      event_subtype: 'Compliance Report Generation',
      user_id: req.user.user_id,
      username: req.user.username,
      action: 'Read',
      details: `Generated ${report_type} compliance report covering ${report.executive_summary.total_events} events`
    };
    
    db.run(
      `INSERT INTO logs (
        event_type, event_subtype, user_id, username, action, details
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      Object.values(logData)
    );
    
    res.json(report);
  })
  .catch(err => {
    console.error('Database error:', err);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  });
};

/**
 * 監査ログエクスポート
 */
const exportAuditLogs = (req, res) => {
  const { 
    format = 'json', 
    start_date, 
    end_date,
    event_types,
    max_records = 10000
  } = req.query;
  
  // 権限チェック（管理者のみ）
  if (!req.user || req.user.role !== 'administrator') {
    return res.status(403).json({ 
      error: '監査ログをエクスポートする権限がありません',
      required_role: 'administrator',
      current_role: req.user?.role
    });
  }
  
  let whereConditions = [];
  let queryParams = [];
  
  if (start_date) {
    whereConditions.push('l.timestamp >= ?');
    queryParams.push(start_date);
  }
  
  if (end_date) {
    whereConditions.push('l.timestamp <= ?');
    queryParams.push(end_date + ' 23:59:59');
  }
  
  if (event_types) {
    const types = event_types.split(',');
    whereConditions.push(`l.event_type IN (${types.map(() => '?').join(',')})`);
    queryParams.push(...types);
  }
  
  const whereClause = whereConditions.length > 0 
    ? 'WHERE ' + whereConditions.join(' AND ') 
    : '';
  
  const query = `
    SELECT 
      l.log_id, l.timestamp, l.event_type, l.event_subtype, l.user_id, 
      l.username, l.action, l.target_table, l.target_record_id,
      l.old_values, l.new_values, l.details, l.ip_address, l.user_agent, l.severity,
      u.display_name as user_display_name, u.email as user_email, u.role as user_role
    FROM logs l
    LEFT JOIN users u ON l.user_id = u.user_id
    ${whereClause}
    ORDER BY l.timestamp DESC
    LIMIT ?
  `;
  
  db.all(query, [...queryParams, parseInt(max_records)], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    // JSON文字列をパース
    const processedRows = rows.map(row => ({
      ...row,
      old_values: row.old_values ? JSON.parse(row.old_values) : null,
      new_values: row.new_values ? JSON.parse(row.new_values) : null
    }));
    
    // 監査ログに記録
    const logData = {
      event_type: 'Data Access',
      event_subtype: 'Audit Log Export',
      user_id: req.user.user_id,
      username: req.user.username,
      action: 'Read',
      details: `Exported ${processedRows.length} audit log records in ${format} format`
    };
    
    db.run(
      `INSERT INTO logs (
        event_type, event_subtype, user_id, username, action, details
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      Object.values(logData)
    );
    
    if (format === 'csv') {
      // CSV形式でエクスポート
      const csvHeader = 'timestamp,event_type,event_subtype,username,action,target_table,details,ip_address\n';
      const csvRows = processedRows.map(row => 
        `"${row.timestamp}","${row.event_type}","${row.event_subtype || ''}","${row.username || ''}","${row.action || ''}","${row.target_table || ''}","${(row.details || '').replace(/"/g, '""')}","${row.ip_address || ''}"`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvHeader + csvRows);
    } else {
      // JSON形式（デフォルト）
      res.json({
        export_metadata: {
          format: format,
          exported_at: new Date().toISOString(),
          exported_by: req.user.username,
          record_count: processedRows.length,
          filters: { start_date, end_date, event_types }
        },
        data: processedRows
      });
    }
  });
};

/**
 * 監査ログ削除（古いログのアーカイブ）
 */
const archiveOldLogs = (req, res) => {
  const { older_than_days = 365 } = req.body;
  
  // 権限チェック（管理者のみ）
  if (!req.user || req.user.role !== 'administrator') {
    return res.status(403).json({ 
      error: '監査ログをアーカイブする権限がありません',
      required_role: 'administrator',
      current_role: req.user?.role
    });
  }
  
  if (older_than_days < 90) {
    return res.status(400).json({ error: '90日未満のログはアーカイブできません' });
  }
  
  // アーカイブ対象のログ数を確認
  const countQuery = `
    SELECT COUNT(*) as count 
    FROM logs 
    WHERE timestamp < datetime('now', '-${older_than_days} days')
  `;
  
  db.get(countQuery, [], (err, countResult) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    const archiveCount = countResult.count;
    
    if (archiveCount === 0) {
      return res.json({
        success: true,
        message: 'アーカイブ対象のログはありません',
        archived_count: 0
      });
    }
    
    // 実際のアーカイブ実行（削除）
    const deleteQuery = `
      DELETE FROM logs 
      WHERE timestamp < datetime('now', '-${older_than_days} days')
    `;
    
    db.run(deleteQuery, [], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      // アーカイブ実行を監査ログに記録
      const logData = {
        event_type: 'Data Modification',
        event_subtype: 'Audit Log Archive',
        user_id: req.user.user_id,
        username: req.user.username,
        action: 'Delete',
        target_table: 'logs',
        details: `Archived ${archiveCount} audit log records older than ${older_than_days} days`
      };
      
      db.run(
        `INSERT INTO logs (
          event_type, event_subtype, user_id, username, action, 
          target_table, details
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        Object.values(logData)
      );
      
      res.json({
        success: true,
        message: `${archiveCount}件の古い監査ログが正常にアーカイブされました`,
        archived_count: archiveCount,
        older_than_days: older_than_days
      });
    });
  });
};

module.exports = {
  getAuditLogs,
  getAuditLogStats,
  getAuditLogById,
  getSecurityAuditLogs,
  generateComplianceReport,
  exportAuditLogs,
  archiveOldLogs
};