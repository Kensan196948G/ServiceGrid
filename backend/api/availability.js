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
 * 可用性一覧取得（拡張版）
 */
const getAvailabilities = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  
  // 拡張フィルタリング条件
  const { service_name, service_type, measurement_period, sla_met, search, date_from, date_to } = req.query;
  
  let whereConditions = [];
  let queryParams = [];
  
  if (service_name) {
    whereConditions.push('a.service_name LIKE ?');
    queryParams.push(`%${service_name}%`);
  }
  
  if (service_type) {
    whereConditions.push('a.service_type = ?');
    queryParams.push(service_type);
  }
  
  if (measurement_period) {
    whereConditions.push('a.measurement_period = ?');
    queryParams.push(measurement_period);
  }
  
  if (sla_met === 'true') {
    whereConditions.push('a.sla_met = 1');
  } else if (sla_met === 'false') {
    whereConditions.push('a.sla_met = 0');
  }
  
  if (search) {
    whereConditions.push('(a.service_name LIKE ? OR a.notes LIKE ?)');
    queryParams.push(`%${search}%`, `%${search}%`);
  }
  
  if (date_from) {
    whereConditions.push('DATE(a.period_start_date) >= ?');
    queryParams.push(date_from);
  }
  
  if (date_to) {
    whereConditions.push('DATE(a.period_end_date) <= ?');
    queryParams.push(date_to);
  }
  
  const whereClause = whereConditions.length > 0 
    ? 'WHERE ' + whereConditions.join(' AND ') 
    : '';
  
  // カウントクエリ
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM availability a
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
        a.availability_id, a.service_name, a.service_type, a.measurement_period,
        a.period_start_date, a.period_end_date, a.total_minutes, 
        a.downtime_minutes, a.planned_downtime_minutes, a.unplanned_downtime_minutes,
        a.uptime_percent, a.availability_target, a.sla_met,
        a.major_incidents_count, a.minor_incidents_count, a.maintenance_windows_count,
        a.notes,
        u_created.username as created_by_username, u_created.display_name as created_by_name,
        a.created_date,
        CASE 
          WHEN a.sla_met = 1 THEN 'Met'
          WHEN a.uptime_percent >= a.availability_target * 0.95 THEN 'At Risk'
          ELSE 'Breached'
        END as sla_status,
        ROUND(a.uptime_percent - a.availability_target, 4) as sla_variance
      FROM availability a
      LEFT JOIN users u_created ON a.created_by_user_id = u_created.user_id
      ${whereClause} 
      ORDER BY a.period_start_date DESC, a.service_name ASC
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
        filters: { service_name, service_type, measurement_period, sla_met, search, date_from, date_to }
      });
    });
  });
};

/**
 * 可用性統計取得（拡張版）
 */
const getAvailabilityStats = (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total FROM availability',
    'SELECT service_type, COUNT(*) as count FROM availability GROUP BY service_type ORDER BY count DESC',
    'SELECT measurement_period, COUNT(*) as count FROM availability GROUP BY measurement_period',
    'SELECT COUNT(*) as sla_met_count FROM availability WHERE sla_met = 1',
    'SELECT COUNT(*) as sla_breached_count FROM availability WHERE sla_met = 0',
    'SELECT AVG(uptime_percent) as avg_uptime FROM availability WHERE period_start_date >= date("now", "-30 days")',
    'SELECT service_name, AVG(uptime_percent) as avg_uptime FROM availability WHERE period_start_date >= date("now", "-90 days") GROUP BY service_name ORDER BY avg_uptime ASC LIMIT 5',
    'SELECT service_name, AVG(uptime_percent) as avg_uptime FROM availability WHERE period_start_date >= date("now", "-90 days") GROUP BY service_name ORDER BY avg_uptime DESC LIMIT 5',
    'SELECT DATE(period_start_date) as date, AVG(uptime_percent) as avg_uptime FROM availability WHERE period_start_date >= date("now", "-30 days") GROUP BY DATE(period_start_date) ORDER BY date',
    'SELECT SUM(downtime_minutes) as total_downtime, SUM(planned_downtime_minutes) as total_planned_downtime, SUM(unplanned_downtime_minutes) as total_unplanned_downtime FROM availability WHERE period_start_date >= date("now", "-30 days")',
    'SELECT service_name, uptime_percent, availability_target, (uptime_percent - availability_target) as variance FROM availability WHERE sla_met = 0 ORDER BY variance ASC LIMIT 10'
  ];
  
  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }))
  .then(([totalResult, serviceTypeResult, periodResult, slaMetResult, slaBreachedResult, avgUptimeResult, worstPerformingResult, bestPerformingResult, dailyTrendResult, downtimeResult, slaViolationsResult]) => {
    const total = totalResult[0].total;
    const slaMetCount = slaMetResult[0].sla_met_count;
    const slaComplianceRate = total > 0 ? Math.round((slaMetCount / total) * 100 * 10) / 10 : 0;
    
    res.json({
      total: total,
      by_service_type: serviceTypeResult.reduce((acc, row) => {
        acc[row.service_type] = row.count;
        return acc;
      }, {}),
      by_measurement_period: periodResult.reduce((acc, row) => {
        acc[row.measurement_period] = row.count;
        return acc;
      }, {}),
      sla_compliance: {
        met: slaMetCount,
        breached: slaBreachedResult[0].sla_breached_count || 0,
        compliance_rate: slaComplianceRate
      },
      performance_metrics: {
        avg_uptime_last_30_days: Math.round((avgUptimeResult[0].avg_uptime || 0) * 10000) / 100,
        total_downtime_minutes_last_30_days: downtimeResult[0].total_downtime || 0,
        planned_downtime_minutes_last_30_days: downtimeResult[0].total_planned_downtime || 0,
        unplanned_downtime_minutes_last_30_days: downtimeResult[0].total_unplanned_downtime || 0
      },
      worst_performing_services: worstPerformingResult.map(row => ({
        service_name: row.service_name,
        avg_uptime: Math.round((row.avg_uptime || 0) * 10000) / 100
      })),
      best_performing_services: bestPerformingResult.map(row => ({
        service_name: row.service_name,
        avg_uptime: Math.round((row.avg_uptime || 0) * 10000) / 100
      })),
      daily_trends: dailyTrendResult.map(row => ({
        date: row.date,
        avg_uptime: Math.round((row.avg_uptime || 0) * 10000) / 100
      })),
      sla_violations: slaViolationsResult.map(row => ({
        service_name: row.service_name,
        uptime_percent: Math.round((row.uptime_percent || 0) * 10000) / 100,
        availability_target: Math.round((row.availability_target || 0) * 10000) / 100,
        variance: Math.round((row.variance || 0) * 10000) / 100
      }))
    });
  })
  .catch(err => {
    console.error('Database error:', err);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  });
};

/**
 * 可用性詳細取得（拡張版）
 */
const getAvailabilityById = (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      a.*,
      u_created.username as created_by_username, u_created.display_name as created_by_name, u_created.email as created_by_email,
      CASE 
        WHEN a.sla_met = 1 THEN 'Met'
        WHEN a.uptime_percent >= a.availability_target * 0.95 THEN 'At Risk'
        ELSE 'Breached'
      END as sla_status,
      ROUND(a.uptime_percent - a.availability_target, 4) as sla_variance,
      ROUND((a.total_minutes - a.downtime_minutes) / 60.0, 2) as uptime_hours,
      ROUND(a.downtime_minutes / 60.0, 2) as downtime_hours,
      ROUND(a.planned_downtime_minutes / 60.0, 2) as planned_downtime_hours,
      ROUND(a.unplanned_downtime_minutes / 60.0, 2) as unplanned_downtime_hours
    FROM availability a
    LEFT JOIN users u_created ON a.created_by_user_id = u_created.user_id
    WHERE a.availability_id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    if (!row) {
      return res.status(404).json({ error: '可用性レコードが見つかりません' });
    }
    
    // 同じサービスの履歴データも取得
    const historyQuery = `
      SELECT 
        measurement_period, period_start_date, period_end_date, 
        uptime_percent, availability_target, sla_met,
        downtime_minutes, planned_downtime_minutes, unplanned_downtime_minutes,
        major_incidents_count, minor_incidents_count, maintenance_windows_count
      FROM availability 
      WHERE service_name = ? AND service_type = ?
      ORDER BY period_start_date DESC 
      LIMIT 12
    `;
    
    db.all(historyQuery, [row.service_name, row.service_type], (err, history) => {
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
 * 可用性作成（拡張版）
 */
const createAvailability = (req, res) => {
  const {
    service_name,
    service_type = 'Application',
    measurement_period,
    period_start_date,
    period_end_date,
    total_minutes,
    downtime_minutes = 0,
    planned_downtime_minutes = 0,
    unplanned_downtime_minutes = 0,
    availability_target = 99.9,
    major_incidents_count = 0,
    minor_incidents_count = 0,
    maintenance_windows_count = 0,
    notes
  } = req.body;
  
  // 入力検証
  if (!service_name || !measurement_period || !period_start_date || !period_end_date || !total_minutes) {
    return res.status(400).json({ 
      error: 'サービス名、測定期間、開始日、終了日、総時間（分）は必須項目です',
      details: {
        service_name: !service_name ? 'サービス名が必要です' : null,
        measurement_period: !measurement_period ? '測定期間が必要です' : null,
        period_start_date: !period_start_date ? '開始日が必要です' : null,
        period_end_date: !period_end_date ? '終了日が必要です' : null,
        total_minutes: !total_minutes ? '総時間（分）が必要です' : null
      }
    });
  }
  
  // フィールド長チェック
  if (service_name.length > 100) {
    return res.status(400).json({ error: 'サービス名は100文字以内で入力してください' });
  }
  
  // 列挙値チェック
  const validServiceTypes = ['Application', 'Infrastructure', 'Network', 'Database', 'Platform', 'Other'];
  if (!validServiceTypes.includes(service_type)) {
    return res.status(400).json({ 
      error: '無効なサービス種別です',
      valid_service_types: validServiceTypes
    });
  }
  
  const validMeasurementPeriods = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually'];
  if (!validMeasurementPeriods.includes(measurement_period)) {
    return res.status(400).json({ 
      error: '無効な測定期間です',
      valid_measurement_periods: validMeasurementPeriods
    });
  }
  
  // 数値チェック
  if (isNaN(total_minutes) || total_minutes <= 0) {
    return res.status(400).json({ error: '総時間（分）は正の数値である必要があります' });
  }
  
  if (isNaN(downtime_minutes) || downtime_minutes < 0) {
    return res.status(400).json({ error: 'ダウンタイム（分）は0以上の数値である必要があります' });
  }
  
  if (downtime_minutes > total_minutes) {
    return res.status(400).json({ error: 'ダウンタイムは総時間を超えることはできません' });
  }
  
  if (planned_downtime_minutes + unplanned_downtime_minutes !== downtime_minutes) {
    return res.status(400).json({ error: '計画ダウンタイム + 非計画ダウンタイム = 総ダウンタイムである必要があります' });
  }
  
  if (availability_target < 0 || availability_target > 100) {
    return res.status(400).json({ error: '可用性目標は0-100の範囲で入力してください' });
  }
  
  // 日付チェック
  if (new Date(period_end_date) <= new Date(period_start_date)) {
    return res.status(400).json({ error: '終了日は開始日より後である必要があります' });
  }
  
  // 可用性計算（Virtual Columnで自動計算されるが、検証のため手動計算）
  const uptime_percent = Math.round(((total_minutes - downtime_minutes) / total_minutes) * 100 * 10000) / 100;
  const sla_met = uptime_percent >= availability_target;
  
  const query = `
    INSERT INTO availability (
      service_name, service_type, measurement_period, period_start_date, period_end_date,
      total_minutes, downtime_minutes, planned_downtime_minutes, unplanned_downtime_minutes,
      availability_target, major_incidents_count, minor_incidents_count, maintenance_windows_count,
      notes, created_date, created_by_user_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
  `;
  
  const currentUserId = req.user?.user_id;
  
  db.run(query, [
    service_name, service_type, measurement_period, period_start_date, period_end_date,
    total_minutes, downtime_minutes, planned_downtime_minutes, unplanned_downtime_minutes,
    availability_target, major_incidents_count, minor_incidents_count, maintenance_windows_count,
    notes, currentUserId
  ], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    // 監査ログ記録
    const logData = {
      event_type: 'Data Modification',
      event_subtype: 'Availability Create',
      user_id: currentUserId,
      username: req.user?.username || 'system',
      action: 'Create',
      target_table: 'availability',
      target_record_id: this.lastID,
      new_values: JSON.stringify({
        service_name, service_type, measurement_period, period_start_date, period_end_date,
        uptime_percent, availability_target, sla_met
      }),
      details: `Created availability record: ${service_name} (${uptime_percent}% uptime, SLA ${sla_met ? 'Met' : 'Breached'})`
    };
    
    db.run(
      `INSERT INTO logs (
        event_type, event_subtype, user_id, username, action, 
        target_table, target_record_id, new_values, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      Object.values(logData)
    );
    
    // 作成された可用性レコードを詳細情報付きで返す
    const detailQuery = `
      SELECT 
        a.*,
        u_created.username as created_by_username, u_created.display_name as created_by_name,
        CASE 
          WHEN a.sla_met = 1 THEN 'Met'
          WHEN a.uptime_percent >= a.availability_target * 0.95 THEN 'At Risk'
          ELSE 'Breached'
        END as sla_status
      FROM availability a
      LEFT JOIN users u_created ON a.created_by_user_id = u_created.user_id
      WHERE a.availability_id = ?
    `;
    
    db.get(detailQuery, [this.lastID], (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      res.status(201).json({
        success: true,
        message: '可用性レコードが正常に作成されました',
        data: row
      });
    });
  });
};

/**
 * 可用性更新
 */
const updateAvailability = (req, res) => {
  const { id } = req.params;
  const {
    service_name,
    service_type,
    measurement_period,
    period_start_date,
    period_end_date,
    total_minutes,
    downtime_minutes,
    planned_downtime_minutes,
    unplanned_downtime_minutes,
    availability_target,
    major_incidents_count,
    minor_incidents_count,
    maintenance_windows_count,
    notes
  } = req.body;
  
  // 権限チェック（オペレータ以上）
  if (!req.user || !['administrator', 'operator'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: '可用性レコードを更新する権限がありません',
      required_role: ['administrator', 'operator'],
      current_role: req.user?.role
    });
  }
  
  // 既存データの確認
  db.get(
    'SELECT * FROM availability WHERE availability_id = ?',
    [id],
    (err, existingAvailability) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!existingAvailability) {
        return res.status(404).json({ error: '可用性レコードが見つかりません' });
      }
      
      // 更新するフィールドを決定（既存値保持）
      const updatedData = {
        service_name: service_name || existingAvailability.service_name,
        service_type: service_type || existingAvailability.service_type,
        measurement_period: measurement_period || existingAvailability.measurement_period,
        period_start_date: period_start_date || existingAvailability.period_start_date,
        period_end_date: period_end_date || existingAvailability.period_end_date,
        total_minutes: total_minutes !== undefined ? total_minutes : existingAvailability.total_minutes,
        downtime_minutes: downtime_minutes !== undefined ? downtime_minutes : existingAvailability.downtime_minutes,
        planned_downtime_minutes: planned_downtime_minutes !== undefined ? planned_downtime_minutes : existingAvailability.planned_downtime_minutes,
        unplanned_downtime_minutes: unplanned_downtime_minutes !== undefined ? unplanned_downtime_minutes : existingAvailability.unplanned_downtime_minutes,
        availability_target: availability_target !== undefined ? availability_target : existingAvailability.availability_target,
        major_incidents_count: major_incidents_count !== undefined ? major_incidents_count : existingAvailability.major_incidents_count,
        minor_incidents_count: minor_incidents_count !== undefined ? minor_incidents_count : existingAvailability.minor_incidents_count,
        maintenance_windows_count: maintenance_windows_count !== undefined ? maintenance_windows_count : existingAvailability.maintenance_windows_count,
        notes: notes !== undefined ? notes : existingAvailability.notes
      };
      
      // 入力検証
      if (updatedData.service_name.length > 100) {
        return res.status(400).json({ error: 'サービス名は100文字以内で入力してください' });
      }
      
      if (isNaN(updatedData.total_minutes) || updatedData.total_minutes <= 0) {
        return res.status(400).json({ error: '総時間（分）は正の数値である必要があります' });
      }
      
      if (isNaN(updatedData.downtime_minutes) || updatedData.downtime_minutes < 0) {
        return res.status(400).json({ error: 'ダウンタイム（分）は0以上の数値である必要があります' });
      }
      
      if (updatedData.downtime_minutes > updatedData.total_minutes) {
        return res.status(400).json({ error: 'ダウンタイムは総時間を超えることはできません' });
      }
      
      if (updatedData.planned_downtime_minutes + updatedData.unplanned_downtime_minutes !== updatedData.downtime_minutes) {
        return res.status(400).json({ error: '計画ダウンタイム + 非計画ダウンタイム = 総ダウンタイムである必要があります' });
      }
      
      if (new Date(updatedData.period_end_date) <= new Date(updatedData.period_start_date)) {
        return res.status(400).json({ error: '終了日は開始日より後である必要があります' });
      }
      
      // 可用性再計算
      const uptime_percent = Math.round(((updatedData.total_minutes - updatedData.downtime_minutes) / updatedData.total_minutes) * 100 * 10000) / 100;
      const sla_met = uptime_percent >= updatedData.availability_target;
      
      const query = `
        UPDATE availability 
        SET service_name = ?, service_type = ?, measurement_period = ?, 
            period_start_date = ?, period_end_date = ?, total_minutes = ?,
            downtime_minutes = ?, planned_downtime_minutes = ?, unplanned_downtime_minutes = ?,
            availability_target = ?, major_incidents_count = ?, minor_incidents_count = ?,
            maintenance_windows_count = ?, notes = ?
        WHERE availability_id = ?
      `;
      
      db.run(query, [
        updatedData.service_name,
        updatedData.service_type,
        updatedData.measurement_period,
        updatedData.period_start_date,
        updatedData.period_end_date,
        updatedData.total_minutes,
        updatedData.downtime_minutes,
        updatedData.planned_downtime_minutes,
        updatedData.unplanned_downtime_minutes,
        updatedData.availability_target,
        updatedData.major_incidents_count,
        updatedData.minor_incidents_count,
        updatedData.maintenance_windows_count,
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
          event_subtype: 'Availability Update',
          user_id: req.user?.user_id,
          username: req.user?.username || 'system',
          action: 'Update',
          target_table: 'availability',
          target_record_id: id,
          old_values: JSON.stringify({
            service_name: existingAvailability.service_name,
            uptime_percent: existingAvailability.uptime_percent,
            sla_met: existingAvailability.sla_met
          }),
          new_values: JSON.stringify({
            service_name: updatedData.service_name,
            uptime_percent: uptime_percent,
            sla_met: sla_met
          }),
          details: `Updated availability: ${updatedData.service_name} (${uptime_percent}% uptime, SLA ${sla_met ? 'Met' : 'Breached'})`
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
          message: '可用性レコードが正常に更新されました',
          sla_status_changed: existingAvailability.sla_met !== sla_met,
          new_uptime_percent: uptime_percent,
          sla_met: sla_met
        });
      });
    }
  );
};

/**
 * 可用性アラート生成
 */
const generateAvailabilityAlerts = (req, res) => {
  const { days_ahead = 7 } = req.query;
  
  // 権限チェック（オペレータ以上）
  if (!req.user || !['administrator', 'operator'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: '可用性アラートを生成する権限がありません',
      required_role: ['administrator', 'operator'],
      current_role: req.user?.role
    });
  }
  
  const queries = [
    // SLA違反
    `SELECT 'sla_breach' as alert_type, service_name, service_type, 
            uptime_percent, availability_target, (uptime_percent - availability_target) as variance,
            downtime_minutes, unplanned_downtime_minutes, major_incidents_count,
            period_start_date, period_end_date
     FROM availability 
     WHERE sla_met = 0 
     ORDER BY variance ASC`,
    
    // SLAリスク（95%閾値）
    `SELECT 'sla_at_risk' as alert_type, service_name, service_type, 
            uptime_percent, availability_target, (uptime_percent - availability_target) as variance,
            downtime_minutes, unplanned_downtime_minutes,
            period_start_date, period_end_date
     FROM availability 
     WHERE sla_met = 1 AND uptime_percent < availability_target * 1.05
     ORDER BY variance ASC`,
    
    // 高いインシデント発生率
    `SELECT 'high_incident_rate' as alert_type, service_name, service_type, 
            uptime_percent, major_incidents_count, minor_incidents_count,
            (major_incidents_count + minor_incidents_count) as total_incidents,
            period_start_date, period_end_date
     FROM availability 
     WHERE (major_incidents_count + minor_incidents_count) > 5
        OR major_incidents_count > 2
     ORDER BY total_incidents DESC`,
    
    // 測定データが古い
    `SELECT 'stale_data' as alert_type, service_name, service_type, 
            uptime_percent, period_end_date,
            JULIANDAY('now') - JULIANDAY(period_end_date) as days_old
     FROM availability a1
     WHERE NOT EXISTS (
       SELECT 1 FROM availability a2 
       WHERE a2.service_name = a1.service_name 
         AND a2.service_type = a1.service_type
         AND a2.period_end_date > a1.period_end_date
     )
     AND JULIANDAY('now') - JULIANDAY(period_end_date) > ?
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
  .then(([slaBreachAlerts, slaRiskAlerts, highIncidentAlerts, staleDataAlerts]) => {
    const allAlerts = [
      ...slaBreachAlerts,
      ...slaRiskAlerts,
      ...highIncidentAlerts,
      ...staleDataAlerts
    ];
    
    // アラートの優先度付け
    const prioritizedAlerts = allAlerts.map(alert => ({
      ...alert,
      priority: alert.alert_type === 'sla_breach' ? 'Critical' : 
                alert.alert_type === 'high_incident_rate' ? 'High' :
                alert.alert_type === 'sla_at_risk' ? 'Medium' : 'Low',
      message: generateAvailabilityAlertMessage(alert)
    }));
    
    // 監査ログ記録
    const logData = {
      event_type: 'Data Access',
      event_subtype: 'Availability Alert Generation',
      user_id: req.user?.user_id,
      username: req.user?.username || 'system',
      action: 'Read',
      target_table: 'availability',
      details: `Generated ${allAlerts.length} availability alerts`
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
        sla_breaches: slaBreachAlerts.length,
        sla_at_risk: slaRiskAlerts.length,
        high_incident_rate: highIncidentAlerts.length,
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

function generateAvailabilityAlertMessage(alert) {
  switch (alert.alert_type) {
    case 'sla_breach':
      return `可用性SLA違反: ${alert.service_name}の可用性が目標値を下回っています (実績: ${alert.uptime_percent}%, 目標: ${alert.availability_target}%)`;
    case 'sla_at_risk':
      return `可用性SLAリスク: ${alert.service_name}の可用性が警告レベルに達しています (実績: ${alert.uptime_percent}%, 目標: ${alert.availability_target}%)`;
    case 'high_incident_rate':
      return `高インシデント発生率: ${alert.service_name}で${alert.total_incidents}件のインシデントが発生しています`;
    case 'stale_data':
      return `データ更新: ${alert.service_name}の可用性データが${Math.floor(alert.days_old)}日間更新されていません`;
    default:
      return '可用性アラート';
  }
}

/**
 * 可用性削除
 */
const deleteAvailability = (req, res) => {
  const { id } = req.params;
  
  // 権限チェック（管理者のみ削除可能）
  if (req.user && req.user.role !== 'administrator') {
    return res.status(403).json({ 
      error: '可用性レコードを削除する権限がありません',
      required_role: 'administrator',
      current_role: req.user.role
    });
  }
  
  // 存在確認
  db.get(
    'SELECT service_name, service_type, period_start_date, period_end_date FROM availability WHERE availability_id = ?',
    [id],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!row) {
        return res.status(404).json({ error: '可用性レコードが見つかりません' });
      }
      
      // 削除実行
      db.run(
        'DELETE FROM availability WHERE availability_id = ?',
        [id],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'データベースエラーが発生しました' });
          }
          
          // 監査ログ
          const logData = {
            event_type: 'Data Modification',
            event_subtype: 'Availability Delete',
            user_id: req.user?.user_id,
            username: req.user?.username || 'system',
            action: 'Delete',
            target_table: 'availability',
            target_record_id: id,
            details: `Deleted availability: ${row.service_name} (${row.service_type}) - ${row.period_start_date} to ${row.period_end_date}`
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
            message: '可用性レコードが正常に削除されました',
            deleted_id: id
          });
        }
      );
    }
  );
};

module.exports = {
  getAvailabilities,
  getAvailabilityStats,
  getAvailabilityById,
  createAvailability,
  updateAvailability,
  generateAvailabilityAlerts,
  deleteAvailability
};