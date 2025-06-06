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
 * キャパシティ一覧取得（拡張版）
 */
const getCapacities = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  
  // 拡張フィルタリング条件
  const { resource_name, resource_type, status, location, search, date_from, date_to, threshold_exceeded } = req.query;
  
  let whereConditions = [];
  let queryParams = [];
  
  if (resource_name) {
    whereConditions.push('c.resource_name LIKE ?');
    queryParams.push(`%${resource_name}%`);
  }
  
  if (resource_type) {
    whereConditions.push('c.resource_type = ?');
    queryParams.push(resource_type);
  }
  
  if (status) {
    whereConditions.push('c.status = ?');
    queryParams.push(status);
  }
  
  if (location) {
    whereConditions.push('c.location LIKE ?');
    queryParams.push(`%${location}%`);
  }
  
  if (search) {
    whereConditions.push('(c.resource_name LIKE ? OR c.notes LIKE ?)');
    queryParams.push(`%${search}%`, `%${search}%`);
  }
  
  if (date_from) {
    whereConditions.push('DATE(c.measurement_date) >= ?');
    queryParams.push(date_from);
  }
  
  if (date_to) {
    whereConditions.push('DATE(c.measurement_date) <= ?');
    queryParams.push(date_to);
  }
  
  if (threshold_exceeded === 'true') {
    whereConditions.push('c.usage_percent >= c.threshold_warning');
  }
  
  const whereClause = whereConditions.length > 0 
    ? 'WHERE ' + whereConditions.join(' AND ') 
    : '';
  
  // カウントクエリ
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM capacity c
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
        c.capacity_id, c.resource_name, c.resource_type, c.current_usage, 
        c.max_capacity, c.threshold_warning, c.threshold_critical, c.usage_percent,
        c.unit, c.location, c.measurement_date, c.forecast_3months, 
        c.forecast_6months, c.forecast_12months, c.status, c.notes,
        u_created.username as created_by_username, u_created.display_name as created_by_name,
        c.created_date,
        CASE 
          WHEN c.usage_percent >= c.threshold_critical THEN 'Critical'
          WHEN c.usage_percent >= c.threshold_warning THEN 'Warning'
          ELSE 'Normal'
        END as alert_level
      FROM capacity c
      LEFT JOIN users u_created ON c.created_by_user_id = u_created.user_id
      ${whereClause} 
      ORDER BY c.measurement_date DESC, c.usage_percent DESC
      LIMIT ? OFFSET ?
    `;
    
    db.all(dataQuery, [...queryParams, limit, offset], (err, rows) => {
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
        filters: { resource_name, resource_type, status, location, search, date_from, date_to, threshold_exceeded }
      });
    });
  });
};

/**
 * キャパシティ統計取得（拡張版）
 */
const getCapacityStats = (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total FROM capacity',
    'SELECT resource_type, COUNT(*) as count FROM capacity GROUP BY resource_type ORDER BY count DESC',
    'SELECT status, COUNT(*) as count FROM capacity GROUP BY status',
    'SELECT COUNT(*) as critical_resources FROM capacity WHERE usage_percent >= threshold_critical',
    'SELECT COUNT(*) as warning_resources FROM capacity WHERE usage_percent >= threshold_warning AND usage_percent < threshold_critical',
    'SELECT AVG(usage_percent) as avg_utilization FROM capacity WHERE measurement_date >= date("now", "-7 days")',
    'SELECT resource_type, AVG(usage_percent) as avg_utilization FROM capacity WHERE measurement_date >= date("now", "-7 days") GROUP BY resource_type ORDER BY avg_utilization DESC',
    'SELECT resource_name, usage_percent, max_capacity, current_usage, resource_type FROM capacity WHERE usage_percent >= 90 ORDER BY usage_percent DESC LIMIT 10',
    'SELECT DATE(measurement_date) as date, AVG(usage_percent) as avg_usage FROM capacity WHERE measurement_date >= date("now", "-30 days") GROUP BY DATE(measurement_date) ORDER BY date',
    'SELECT resource_name, forecast_12months, max_capacity, (forecast_12months / max_capacity * 100) as predicted_usage_percent FROM capacity WHERE forecast_12months IS NOT NULL AND forecast_12months > max_capacity'
  ];
  
  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }))
  .then(([totalResult, typeResult, statusResult, criticalResult, warningResult, avgUtilizationResult, typeUtilizationResult, highUsageResult, dailyTrendResult, forecastOvercapacityResult]) => {
    res.json({
      total: totalResult[0].total,
      by_resource_type: typeResult.reduce((acc, row) => {
        acc[row.resource_type] = row.count;
        return acc;
      }, {}),
      by_status: statusResult.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {}),
      alert_summary: {
        critical_resources: criticalResult[0].critical_resources || 0,
        warning_resources: warningResult[0].warning_resources || 0,
        avg_utilization: Math.round((avgUtilizationResult[0].avg_utilization || 0) * 10) / 10
      },
      utilization_by_type: typeUtilizationResult.map(row => ({
        resource_type: row.resource_type,
        avg_utilization: Math.round((row.avg_utilization || 0) * 10) / 10
      })),
      high_usage_resources: highUsageResult,
      daily_trends: dailyTrendResult.map(row => ({
        date: row.date,
        avg_usage: Math.round((row.avg_usage || 0) * 10) / 10
      })),
      forecast_alerts: {
        overcapacity_predicted: forecastOvercapacityResult.length,
        resources: forecastOvercapacityResult.map(row => ({
          resource_name: row.resource_name,
          predicted_usage_percent: Math.round((row.predicted_usage_percent || 0) * 10) / 10
        }))
      }
    });
  })
  .catch(err => {
    console.error('Database error:', err);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  });
};

/**
 * キャパシティ詳細取得（拡張版）
 */
const getCapacityById = (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      c.*,
      u_created.username as created_by_username, u_created.display_name as created_by_name, u_created.email as created_by_email,
      CASE 
        WHEN c.usage_percent >= c.threshold_critical THEN 'Critical'
        WHEN c.usage_percent >= c.threshold_warning THEN 'Warning'
        ELSE 'Normal'
      END as alert_level
    FROM capacity c
    LEFT JOIN users u_created ON c.created_by_user_id = u_created.user_id
    WHERE c.capacity_id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'キャパシティレコードが見つかりません' });
    }
    
    // 同じリソースの履歴データも取得
    const historyQuery = `
      SELECT 
        measurement_date, current_usage, max_capacity, usage_percent, status,
        forecast_3months, forecast_6months, forecast_12months
      FROM capacity 
      WHERE resource_name = ? AND resource_type = ?
      ORDER BY measurement_date DESC 
      LIMIT 24
    `;
    
    db.all(historyQuery, [row.resource_name, row.resource_type], (err, history) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      res.json({
        ...row,
        historical_data: history || []
      });
    });
  });
};

/**
 * キャパシティ作成（拡張版）
 */
const createCapacity = (req, res) => {
  const {
    resource_name,
    resource_type,
    current_usage,
    max_capacity,
    threshold_warning = 80.0,
    threshold_critical = 90.0,
    unit,
    location,
    measurement_date,
    forecast_3months,
    forecast_6months,
    forecast_12months,
    notes
  } = req.body;
  
  // 入力検証
  if (!resource_name || !resource_type || current_usage === undefined || !max_capacity || !measurement_date) {
    return res.status(400).json({ 
      error: 'リソース名、リソース種別、現在使用量、最大容量、測定日は必須項目です',
      details: {
        resource_name: !resource_name ? 'リソース名が必要です' : null,
        resource_type: !resource_type ? 'リソース種別が必要です' : null,
        current_usage: current_usage === undefined ? '現在使用量が必要です' : null,
        max_capacity: !max_capacity ? '最大容量が必要です' : null,
        measurement_date: !measurement_date ? '測定日が必要です' : null
      }
    });
  }
  
  // フィールド長チェック
  if (resource_name.length > 100) {
    return res.status(400).json({ error: 'リソース名は100文字以内で入力してください' });
  }
  
  // 列挙値チェック
  const validResourceTypes = ['CPU', 'Memory', 'Storage', 'Network', 'Database', 'Application', 'Other'];
  if (!validResourceTypes.includes(resource_type)) {
    return res.status(400).json({ 
      error: '無効なリソース種別です',
      valid_resource_types: validResourceTypes
    });
  }
  
  // 数値チェック
  if (isNaN(current_usage) || current_usage < 0) {
    return res.status(400).json({ error: '現在使用量は0以上の数値である必要があります' });
  }
  
  if (isNaN(max_capacity) || max_capacity <= 0) {
    return res.status(400).json({ error: '最大容量は正の数値である必要があります' });
  }
  
  if (current_usage > max_capacity) {
    return res.status(400).json({ error: '現在使用量は最大容量を超えることはできません' });
  }
  
  if (threshold_warning < 0 || threshold_warning > 100 || threshold_critical < 0 || threshold_critical > 100) {
    return res.status(400).json({ error: '閾値は0-100の範囲で入力してください' });
  }
  
  if (threshold_warning >= threshold_critical) {
    return res.status(400).json({ error: '警告閾値は危険閾値より小さい値である必要があります' });
  }
  
  // 使用率計算
  const usage_percent = Math.round((current_usage / max_capacity) * 100 * 100) / 100;
  
  // ステータス自動判定
  let status = 'Normal';
  if (usage_percent >= threshold_critical) {
    status = 'Critical';
  } else if (usage_percent >= threshold_warning) {
    status = 'Warning';
  }
  
  const query = `
    INSERT INTO capacity (
      resource_name, resource_type, current_usage, max_capacity, 
      threshold_warning, threshold_critical, unit, location, 
      measurement_date, forecast_3months, forecast_6months, forecast_12months,
      status, notes, created_date, created_by_user_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
  `;
  
  const currentUserId = req.user?.user_id;
  
  db.run(query, [
    resource_name, resource_type, current_usage, max_capacity,
    threshold_warning, threshold_critical, unit, location,
    measurement_date, forecast_3months, forecast_6months, forecast_12months,
    status, notes, currentUserId
  ], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    // 監査ログ記録
    const logData = {
      event_type: 'Data Modification',
      event_subtype: 'Capacity Create',
      user_id: currentUserId,
      username: req.user?.username || 'system',
      action: 'Create',
      target_table: 'capacity',
      target_record_id: this.lastID,
      new_values: JSON.stringify({
        resource_name, resource_type, current_usage, max_capacity, usage_percent, status, measurement_date
      }),
      details: `Created capacity record: ${resource_name} (${usage_percent}% usage, ${status})`
    };
    
    db.run(
      `INSERT INTO logs (
        event_type, event_subtype, user_id, username, action, 
        target_table, target_record_id, new_values, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      Object.values(logData)
    );
    
    // 作成されたキャパシティレコードを詳細情報付きで返す
    const detailQuery = `
      SELECT 
        c.*,
        u_created.username as created_by_username, u_created.display_name as created_by_name,
        CASE 
          WHEN c.usage_percent >= c.threshold_critical THEN 'Critical'
          WHEN c.usage_percent >= c.threshold_warning THEN 'Warning'
          ELSE 'Normal'
        END as alert_level
      FROM capacity c
      LEFT JOIN users u_created ON c.created_by_user_id = u_created.user_id
      WHERE c.capacity_id = ?
    `;
    
    db.get(detailQuery, [this.lastID], (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      res.status(201).json({
        success: true,
        message: 'キャパシティレコードが正常に作成されました',
        data: row
      });
    });
  });
};

/**
 * キャパシティ更新
 */
const updateCapacity = (req, res) => {
  const { id } = req.params;
  const {
    resource_name,
    resource_type,
    current_usage,
    max_capacity,
    threshold_warning,
    threshold_critical,
    unit,
    location,
    measurement_date,
    forecast_3months,
    forecast_6months,
    forecast_12months,
    notes
  } = req.body;
  
  // 権限チェック（オペレータ以上）
  if (!req.user || !['administrator', 'operator'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'キャパシティレコードを更新する権限がありません',
      required_role: ['administrator', 'operator'],
      current_role: req.user?.role
    });
  }
  
  // 既存データの確認
  db.get(
    'SELECT * FROM capacity WHERE capacity_id = ?',
    [id],
    (err, existingCapacity) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!existingCapacity) {
        return res.status(404).json({ error: 'キャパシティレコードが見つかりません' });
      }
      
      // 更新するフィールドを決定（既存値保持）
      const updatedData = {
        resource_name: resource_name || existingCapacity.resource_name,
        resource_type: resource_type || existingCapacity.resource_type,
        current_usage: current_usage !== undefined ? current_usage : existingCapacity.current_usage,
        max_capacity: max_capacity !== undefined ? max_capacity : existingCapacity.max_capacity,
        threshold_warning: threshold_warning !== undefined ? threshold_warning : existingCapacity.threshold_warning,
        threshold_critical: threshold_critical !== undefined ? threshold_critical : existingCapacity.threshold_critical,
        unit: unit !== undefined ? unit : existingCapacity.unit,
        location: location !== undefined ? location : existingCapacity.location,
        measurement_date: measurement_date || existingCapacity.measurement_date,
        forecast_3months: forecast_3months !== undefined ? forecast_3months : existingCapacity.forecast_3months,
        forecast_6months: forecast_6months !== undefined ? forecast_6months : existingCapacity.forecast_6months,
        forecast_12months: forecast_12months !== undefined ? forecast_12months : existingCapacity.forecast_12months,
        notes: notes !== undefined ? notes : existingCapacity.notes
      };
      
      // 入力検証
      if (updatedData.resource_name.length > 100) {
        return res.status(400).json({ error: 'リソース名は100文字以内で入力してください' });
      }
      
      if (isNaN(updatedData.current_usage) || updatedData.current_usage < 0) {
        return res.status(400).json({ error: '現在使用量は0以上の数値である必要があります' });
      }
      
      if (isNaN(updatedData.max_capacity) || updatedData.max_capacity <= 0) {
        return res.status(400).json({ error: '最大容量は正の数値である必要があります' });
      }
      
      if (updatedData.current_usage > updatedData.max_capacity) {
        return res.status(400).json({ error: '現在使用量は最大容量を超えることはできません' });
      }
      
      if (updatedData.threshold_warning >= updatedData.threshold_critical) {
        return res.status(400).json({ error: '警告閾値は危険閾値より小さい値である必要があります' });
      }
      
      // 使用率とステータス再計算
      const usage_percent = Math.round((updatedData.current_usage / updatedData.max_capacity) * 100 * 100) / 100;
      
      let status = 'Normal';
      if (usage_percent >= updatedData.threshold_critical) {
        status = 'Critical';
      } else if (usage_percent >= updatedData.threshold_warning) {
        status = 'Warning';
      }
      
      const query = `
        UPDATE capacity 
        SET resource_name = ?, resource_type = ?, current_usage = ?, max_capacity = ?,
            threshold_warning = ?, threshold_critical = ?, unit = ?, location = ?,
            measurement_date = ?, forecast_3months = ?, forecast_6months = ?, forecast_12months = ?,
            status = ?, notes = ?
        WHERE capacity_id = ?
      `;
      
      db.run(query, [
        updatedData.resource_name,
        updatedData.resource_type,
        updatedData.current_usage,
        updatedData.max_capacity,
        updatedData.threshold_warning,
        updatedData.threshold_critical,
        updatedData.unit,
        updatedData.location,
        updatedData.measurement_date,
        updatedData.forecast_3months,
        updatedData.forecast_6months,
        updatedData.forecast_12months,
        status,
        updatedData.notes,
        id
      ], function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'データベースエラーが発生しました' });
        }
        
        // 監査ログ
        const logData = {
          event_type: 'Data Modification',
          event_subtype: 'Capacity Update',
          user_id: req.user?.user_id,
          username: req.user?.username || 'system',
          action: 'Update',
          target_table: 'capacity',
          target_record_id: id,
          old_values: JSON.stringify({
            resource_name: existingCapacity.resource_name,
            current_usage: existingCapacity.current_usage,
            status: existingCapacity.status
          }),
          new_values: JSON.stringify({
            resource_name: updatedData.resource_name,
            current_usage: updatedData.current_usage,
            status: status
          }),
          details: `Updated capacity: ${updatedData.resource_name} (${usage_percent}% usage, ${existingCapacity.status} → ${status})`
        };
        
        db.run(
          `INSERT INTO logs (
            event_type, event_subtype, user_id, username, action, 
            target_table, target_record_id, old_values, new_values, details
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          Object.values(logData)
        );
        
        res.json({
          success: true,
          message: 'キャパシティレコードが正常に更新されました',
          status_changed: existingCapacity.status !== status,
          new_status: status,
          usage_percent: usage_percent
        });
      });
    }
  );
};

/**
 * キャパシティアラート生成
 */
const generateCapacityAlerts = (req, res) => {
  const { days_ahead = 30 } = req.query;
  
  // 権限チェック（オペレータ以上）
  if (!req.user || !['administrator', 'operator'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'キャパシティアラートを生成する権限がありません',
      required_role: ['administrator', 'operator'],
      current_role: req.user?.role
    });
  }
  
  const queries = [
    // 危険レベル超過
    `SELECT 'critical' as alert_type, resource_name, resource_type, current_usage, 
            max_capacity, usage_percent, threshold_critical, location, measurement_date
     FROM capacity 
     WHERE usage_percent >= threshold_critical 
     ORDER BY usage_percent DESC`,
    
    // 警告レベル超過
    `SELECT 'warning' as alert_type, resource_name, resource_type, current_usage, 
            max_capacity, usage_percent, threshold_warning, location, measurement_date
     FROM capacity 
     WHERE usage_percent >= threshold_warning AND usage_percent < threshold_critical 
     ORDER BY usage_percent DESC`,
    
    // 将来のキャパシティ不足予測
    `SELECT 'forecast_critical' as alert_type, resource_name, resource_type, 
            current_usage, max_capacity, usage_percent,
            CASE 
              WHEN forecast_3months > max_capacity THEN '3ヶ月以内'
              WHEN forecast_6months > max_capacity THEN '6ヶ月以内'  
              WHEN forecast_12months > max_capacity THEN '12ヶ月以内'
            END as forecast_period,
            CASE 
              WHEN forecast_3months > max_capacity THEN forecast_3months
              WHEN forecast_6months > max_capacity THEN forecast_6months
              WHEN forecast_12months > max_capacity THEN forecast_12months
            END as forecast_usage,
            location, measurement_date
     FROM capacity 
     WHERE forecast_3months > max_capacity 
        OR forecast_6months > max_capacity 
        OR forecast_12months > max_capacity
     ORDER BY 
       CASE 
         WHEN forecast_3months > max_capacity THEN 1
         WHEN forecast_6months > max_capacity THEN 2
         WHEN forecast_12months > max_capacity THEN 3
       END`,
    
    // 古い測定データ
    `SELECT 'stale_data' as alert_type, resource_name, resource_type, 
            current_usage, max_capacity, usage_percent, location, measurement_date,
            JULIANDAY('now') - JULIANDAY(measurement_date) as days_old
     FROM capacity 
     WHERE JULIANDAY('now') - JULIANDAY(measurement_date) > ?
     ORDER BY days_old DESC`
  ];
  
  Promise.all([
    new Promise((resolve, reject) => {
      db.all(queries[0], [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),
    new Promise((resolve, reject) => {
      db.all(queries[1], [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),
    new Promise((resolve, reject) => {
      db.all(queries[2], [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),
    new Promise((resolve, reject) => {
      db.all(queries[3], [days_ahead], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    })
  ])
  .then(([criticalAlerts, warningAlerts, forecastAlerts, staleDataAlerts]) => {
    const allAlerts = [
      ...criticalAlerts,
      ...warningAlerts,
      ...forecastAlerts,
      ...staleDataAlerts
    ];
    
    // アラートの優先度付け
    const prioritizedAlerts = allAlerts.map(alert => ({
      ...alert,
      priority: alert.alert_type === 'critical' ? 'Critical' : 
                alert.alert_type === 'forecast_critical' ? 'High' :
                alert.alert_type === 'warning' ? 'Medium' : 'Low',
      message: generateCapacityAlertMessage(alert)
    }));
    
    // 監査ログ記録
    const logData = {
      event_type: 'Data Access',
      event_subtype: 'Capacity Alert Generation',
      user_id: req.user?.user_id,
      username: req.user?.username || 'system',
      action: 'Read',
      target_table: 'capacity',
      details: `Generated ${allAlerts.length} capacity alerts`
    };
    
    db.run(
      `INSERT INTO logs (
        event_type, event_subtype, user_id, username, action, 
        target_table, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      Object.values(logData)
    );
    
    res.json({
      alerts: prioritizedAlerts,
      summary: {
        total_alerts: allAlerts.length,
        critical: criticalAlerts.length,
        warning: warningAlerts.length,
        forecast_critical: forecastAlerts.length,
        stale_data: staleDataAlerts.length
      },
      generated_at: new Date().toISOString()
    });
  })
  .catch(err => {
    console.error('Database error:', err);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  });
};

function generateCapacityAlertMessage(alert) {
  switch (alert.alert_type) {
    case 'critical':
      return `キャパシティ危険: ${alert.resource_name}の使用率が危険レベル(${alert.usage_percent}%)に達しています`;
    case 'warning':
      return `キャパシティ警告: ${alert.resource_name}の使用率が警告レベル(${alert.usage_percent}%)に達しています`;
    case 'forecast_critical':
      return `キャパシティ予測: ${alert.resource_name}が${alert.forecast_period}にキャパシティ不足になる予測です`;
    case 'stale_data':
      return `データ更新: ${alert.resource_name}の測定データが${Math.floor(alert.days_old)}日間更新されていません`;
    default:
      return 'キャパシティアラート';
  }
}

/**
 * キャパシティ削除
 */
const deleteCapacity = (req, res) => {
  const { id } = req.params;
  
  // 権限チェック（管理者のみ削除可能）
  if (req.user && req.user.role !== 'administrator') {
    return res.status(403).json({ 
      error: 'キャパシティレコードを削除する権限がありません',
      required_role: 'administrator',
      current_role: req.user.role
    });
  }
  
  // 存在確認
  db.get(
    'SELECT resource_name, resource_type, measurement_date FROM capacity WHERE capacity_id = ?',
    [id],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'キャパシティレコードが見つかりません' });
      }
      
      // 削除実行
      db.run(
        'DELETE FROM capacity WHERE capacity_id = ?',
        [id],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'データベースエラーが発生しました' });
          }
          
          // 監査ログ
          const logData = {
            event_type: 'Data Modification',
            event_subtype: 'Capacity Delete',
            user_id: req.user?.user_id,
            username: req.user?.username || 'system',
            action: 'Delete',
            target_table: 'capacity',
            target_record_id: id,
            details: `Deleted capacity: ${row.resource_name} (${row.resource_type}) - ${row.measurement_date}`
          };
          
          db.run(
            `INSERT INTO logs (
              event_type, event_subtype, user_id, username, action, 
              target_table, target_record_id, details
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            Object.values(logData)
          );
          
          res.json({ 
            success: true, 
            message: 'キャパシティレコードが正常に削除されました',
            deleted_id: id
          });
        }
      );
    }
  );
};

module.exports = {
  getCapacities,
  getCapacityStats,
  getCapacityById,
  createCapacity,
  updateCapacity,
  generateCapacityAlerts,
  deleteCapacity
};