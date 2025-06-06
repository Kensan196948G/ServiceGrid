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
 * SLA一覧取得（拡張版）
 */
const getSLAs = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  
  // 拡張フィルタリング条件
  const { service_name, metric_type, status, measurement_period, search, date_from, date_to } = req.query;
  
  let whereConditions = [];
  let queryParams = [];
  
  if (service_name) {
    whereConditions.push('s.service_name LIKE ?');
    queryParams.push(`%${service_name}%`);
  }
  
  if (metric_type) {
    whereConditions.push('s.metric_type = ?');
    queryParams.push(metric_type);
  }
  
  if (status) {
    whereConditions.push('s.status = ?');
    queryParams.push(status);
  }
  
  if (measurement_period) {
    whereConditions.push('s.measurement_period = ?');
    queryParams.push(measurement_period);
  }
  
  if (search) {
    whereConditions.push('(s.service_name LIKE ? OR s.metric_name LIKE ? OR s.responsible_team LIKE ?)');
    queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  if (date_from) {
    whereConditions.push('DATE(s.measurement_date) >= ?');
    queryParams.push(date_from);
  }
  
  if (date_to) {
    whereConditions.push('DATE(s.measurement_date) <= ?');
    queryParams.push(date_to);
  }
  
  const whereClause = whereConditions.length > 0 
    ? 'WHERE ' + whereConditions.join(' AND ') 
    : '';
  
  // カウントクエリ
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM slas s
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
        s.sla_id, s.service_name, s.metric_name, s.metric_type, 
        s.target_value, s.actual_value, s.unit, s.measurement_period,
        s.measurement_date, s.status, s.breach_reason, s.corrective_action,
        s.responsible_team,
        CASE 
          WHEN s.actual_value IS NOT NULL AND s.target_value > 0 
          THEN ROUND((s.actual_value / s.target_value) * 100, 2)
          ELSE NULL 
        END as achievement_percentage,
        u_created.username as created_by_username, u_created.display_name as created_by_name,
        s.created_date, s.updated_date
      FROM slas s
      LEFT JOIN users u_created ON s.created_by_user_id = u_created.user_id
      ${whereClause} 
      ORDER BY s.measurement_date DESC, s.service_name ASC
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
        filters: { service_name, metric_type, status, measurement_period, search, date_from, date_to }
      });
    });
  });
};

/**
 * SLA統計取得（拡張版）
 */
const getSLAStats = (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total FROM slas',
    'SELECT service_name, COUNT(*) as count FROM slas GROUP BY service_name ORDER BY count DESC LIMIT 10',
    'SELECT metric_type, COUNT(*) as count FROM slas GROUP BY metric_type ORDER BY count DESC',
    'SELECT status, COUNT(*) as count FROM slas GROUP BY status',
    'SELECT measurement_period, COUNT(*) as count FROM slas GROUP BY measurement_period',
    'SELECT DATE(measurement_date) as date, COUNT(*) as count, AVG(CASE WHEN actual_value IS NOT NULL AND target_value > 0 THEN (actual_value / target_value) * 100 ELSE NULL END) as avg_achievement FROM slas WHERE measurement_date >= date("now", "-30 days") GROUP BY DATE(measurement_date) ORDER BY date',
    'SELECT AVG(CASE WHEN actual_value IS NOT NULL AND target_value > 0 THEN (actual_value / target_value) * 100 ELSE NULL END) as overall_achievement FROM slas WHERE actual_value IS NOT NULL',
    'SELECT COUNT(*) as breached_slas FROM slas WHERE status = "Breached"',
    'SELECT COUNT(*) as at_risk_slas FROM slas WHERE status = "At Risk"',
    'SELECT service_name, metric_type, AVG(CASE WHEN actual_value IS NOT NULL AND target_value > 0 THEN (actual_value / target_value) * 100 ELSE NULL END) as avg_achievement FROM slas WHERE actual_value IS NOT NULL GROUP BY service_name, metric_type ORDER BY avg_achievement ASC LIMIT 5'
  ];
  
  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }))
  .then(([totalResult, serviceResult, metricTypeResult, statusResult, periodResult, dailyResult, achievementResult, breachedResult, atRiskResult, worstPerformingResult]) => {
    res.json({
      total: totalResult[0].total,
      by_service: serviceResult.reduce((acc, row) => {
        acc[row.service_name] = row.count;
        return acc;
      }, {}),
      by_metric_type: metricTypeResult.reduce((acc, row) => {
        acc[row.metric_type] = row.count;
        return acc;
      }, {}),
      by_status: statusResult.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {}),
      by_measurement_period: periodResult.reduce((acc, row) => {
        acc[row.measurement_period] = row.count;
        return acc;
      }, {}),
      daily_trends: dailyResult,
      performance_metrics: {
        overall_achievement_rate: Math.round((achievementResult[0].overall_achievement || 0) * 10) / 10,
        breached_slas: breachedResult[0].breached_slas || 0,
        at_risk_slas: atRiskResult[0].at_risk_slas || 0
      },
      worst_performing_services: worstPerformingResult
    });
  })
  .catch(err => {
    console.error('Database error:', err);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  });
};

/**
 * SLA詳細取得（拡張版）
 */
const getSLAById = (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      s.*,
      CASE 
        WHEN s.actual_value IS NOT NULL AND s.target_value > 0 
        THEN ROUND((s.actual_value / s.target_value) * 100, 2)
        ELSE NULL 
      END as achievement_percentage,
      u_created.username as created_by_username, u_created.display_name as created_by_name, u_created.email as created_by_email
    FROM slas s
    LEFT JOIN users u_created ON s.created_by_user_id = u_created.user_id
    WHERE s.sla_id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'SLAレコードが見つかりません' });
    }
    
    // 同じサービスの履歴データも取得
    const historyQuery = `
      SELECT 
        measurement_date, actual_value, target_value, status,
        CASE 
          WHEN actual_value IS NOT NULL AND target_value > 0 
          THEN ROUND((actual_value / target_value) * 100, 2)
          ELSE NULL 
        END as achievement_percentage
      FROM slas 
      WHERE service_name = ? AND metric_type = ? AND measurement_period = ?
      ORDER BY measurement_date DESC 
      LIMIT 12
    `;
    
    db.all(historyQuery, [row.service_name, row.metric_type, row.measurement_period], (err, history) => {
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
 * SLA作成（拡張版）
 */
const createSLA = (req, res) => {
  const {
    service_name,
    metric_name,
    metric_type,
    target_value,
    actual_value,
    unit,
    measurement_period = 'Monthly',
    measurement_date,
    responsible_team
  } = req.body;
  
  // 入力検証
  if (!service_name || !metric_name || !metric_type || !target_value || !measurement_date) {
    return res.status(400).json({ 
      error: 'サービス名、メトリック名、メトリック種別、目標値、測定日は必須項目です',
      details: {
        service_name: !service_name ? 'サービス名が必要です' : null,
        metric_name: !metric_name ? 'メトリック名が必要です' : null,
        metric_type: !metric_type ? 'メトリック種別が必要です' : null,
        target_value: !target_value ? '目標値が必要です' : null,
        measurement_date: !measurement_date ? '測定日が必要です' : null
      }
    });
  }
  
  // フィールド長チェック
  if (service_name.length > 100) {
    return res.status(400).json({ error: 'サービス名は100文字以内で入力してください' });
  }
  
  if (metric_name.length > 100) {
    return res.status(400).json({ error: 'メトリック名は100文字以内で入力してください' });
  }
  
  // 列挙値チェック
  const validMetricTypes = ['Availability', 'Performance', 'Response Time', 'Resolution Time', 'Quality'];
  if (!validMetricTypes.includes(metric_type)) {
    return res.status(400).json({ 
      error: '無効なメトリック種別です',
      valid_metric_types: validMetricTypes
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
  if (isNaN(target_value) || target_value <= 0) {
    return res.status(400).json({ error: '目標値は正の数値である必要があります' });
  }
  
  if (actual_value !== undefined && actual_value !== null && isNaN(actual_value)) {
    return res.status(400).json({ error: '実績値は数値である必要があります' });
  }
  
  // SLA達成状況を自動判定
  let status = 'Unknown';
  let breach_reason = null;
  
  if (actual_value !== undefined && actual_value !== null) {
    if (metric_type === 'Availability' || metric_type === 'Quality') {
      // 可用性や品質は実績値が目標値以上であれば達成
      status = actual_value >= target_value ? 'Met' : 'Breached';
      if (status === 'Breached') {
        breach_reason = `実績値 ${actual_value}${unit || ''} が目標値 ${target_value}${unit || ''} を下回りました`;
      }
    } else {
      // レスポンス時間や解決時間は実績値が目標値以下であれば達成
      status = actual_value <= target_value ? 'Met' : 'Breached';
      if (status === 'Breached') {
        breach_reason = `実績値 ${actual_value}${unit || ''} が目標値 ${target_value}${unit || ''} を上回りました`;
      }
    }
    
    // At Risk判定（目標値の90%ライン）
    const threshold = metric_type === 'Availability' || metric_type === 'Quality' ? 
      target_value * 0.9 : target_value * 1.1;
    
    if (status === 'Met') {
      if (metric_type === 'Availability' || metric_type === 'Quality') {
        if (actual_value < threshold) {
          status = 'At Risk';
        }
      } else {
        if (actual_value > threshold) {
          status = 'At Risk';
        }
      }
    }
  }
  
  const query = `
    INSERT INTO slas (
      service_name, metric_name, metric_type, target_value, actual_value, 
      unit, measurement_period, measurement_date, status, breach_reason, 
      responsible_team, created_date, updated_date, created_by_user_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
  `;
  
  const currentUserId = req.user?.user_id;
  
  db.run(query, [
    service_name, metric_name, metric_type, target_value, actual_value,
    unit, measurement_period, measurement_date, status, breach_reason,
    responsible_team, currentUserId
  ], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    // 監査ログ記録
    const logData = {
      event_type: 'Data Modification',
      event_subtype: 'SLA Create',
      user_id: currentUserId,
      username: req.user?.username || 'system',
      action: 'Create',
      target_table: 'slas',
      target_record_id: this.lastID,
      new_values: JSON.stringify({
        service_name, metric_type, target_value, actual_value, status, measurement_date
      }),
      details: `Created SLA record: ${service_name} - ${metric_name} (${status})`
    };
    
    db.run(
      `INSERT INTO logs (
        event_type, event_subtype, user_id, username, action, 
        target_table, target_record_id, new_values, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      Object.values(logData)
    );
    
    // 作成されたSLAレコードを詳細情報付きで返す
    const detailQuery = `
      SELECT 
        s.*,
        CASE 
          WHEN s.actual_value IS NOT NULL AND s.target_value > 0 
          THEN ROUND((s.actual_value / s.target_value) * 100, 2)
          ELSE NULL 
        END as achievement_percentage,
        u_created.username as created_by_username, u_created.display_name as created_by_name
      FROM slas s
      LEFT JOIN users u_created ON s.created_by_user_id = u_created.user_id
      WHERE s.sla_id = ?
    `;
    
    db.get(detailQuery, [this.lastID], (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      res.status(201).json({
        success: true,
        message: 'SLAレコードが正常に作成されました',
        data: row
      });
    });
  });
};

/**
 * SLA更新
 */
const updateSLA = (req, res) => {
  const { id } = req.params;
  const {
    service_name,
    metric_name,
    metric_type,
    target_value,
    actual_value,
    unit,
    measurement_period,
    measurement_date,
    responsible_team,
    corrective_action
  } = req.body;
  
  // 権限チェック（オペレータ以上）
  if (!req.user || !['administrator', 'operator'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'SLAレコードを更新する権限がありません',
      required_role: ['administrator', 'operator'],
      current_role: req.user?.role
    });
  }
  
  // 既存データの確認
  db.get(
    'SELECT * FROM slas WHERE sla_id = ?',
    [id],
    (err, existingSLA) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!existingSLA) {
        return res.status(404).json({ error: 'SLAレコードが見つかりません' });
      }
      
      // 更新するフィールドを決定（既存値保持）
      const updatedData = {
        service_name: service_name || existingSLA.service_name,
        metric_name: metric_name || existingSLA.metric_name,
        metric_type: metric_type || existingSLA.metric_type,
        target_value: target_value !== undefined ? target_value : existingSLA.target_value,
        actual_value: actual_value !== undefined ? actual_value : existingSLA.actual_value,
        unit: unit !== undefined ? unit : existingSLA.unit,
        measurement_period: measurement_period || existingSLA.measurement_period,
        measurement_date: measurement_date || existingSLA.measurement_date,
        responsible_team: responsible_team !== undefined ? responsible_team : existingSLA.responsible_team,
        corrective_action: corrective_action !== undefined ? corrective_action : existingSLA.corrective_action
      };
      
      // 入力検証
      if (updatedData.service_name.length > 100) {
        return res.status(400).json({ error: 'サービス名は100文字以内で入力してください' });
      }
      
      if (isNaN(updatedData.target_value) || updatedData.target_value <= 0) {
        return res.status(400).json({ error: '目標値は正の数値である必要があります' });
      }
      
      // SLA達成状況を再計算
      let status = 'Unknown';
      let breach_reason = null;
      
      if (updatedData.actual_value !== undefined && updatedData.actual_value !== null) {
        if (updatedData.metric_type === 'Availability' || updatedData.metric_type === 'Quality') {
          status = updatedData.actual_value >= updatedData.target_value ? 'Met' : 'Breached';
          if (status === 'Breached') {
            breach_reason = `実績値 ${updatedData.actual_value}${updatedData.unit || ''} が目標値 ${updatedData.target_value}${updatedData.unit || ''} を下回りました`;
          }
        } else {
          status = updatedData.actual_value <= updatedData.target_value ? 'Met' : 'Breached';
          if (status === 'Breached') {
            breach_reason = `実績値 ${updatedData.actual_value}${updatedData.unit || ''} が目標値 ${updatedData.target_value}${updatedData.unit || ''} を上回りました`;
          }
        }
        
        // At Risk判定
        const threshold = updatedData.metric_type === 'Availability' || updatedData.metric_type === 'Quality' ? 
          updatedData.target_value * 0.9 : updatedData.target_value * 1.1;
        
        if (status === 'Met') {
          if (updatedData.metric_type === 'Availability' || updatedData.metric_type === 'Quality') {
            if (updatedData.actual_value < threshold) {
              status = 'At Risk';
            }
          } else {
            if (updatedData.actual_value > threshold) {
              status = 'At Risk';
            }
          }
        }
      }
      
      const query = `
        UPDATE slas 
        SET service_name = ?, metric_name = ?, metric_type = ?, target_value = ?, actual_value = ?,
            unit = ?, measurement_period = ?, measurement_date = ?, status = ?, breach_reason = ?,
            responsible_team = ?, corrective_action = ?, updated_date = datetime('now')
        WHERE sla_id = ?
      `;
      
      db.run(query, [
        updatedData.service_name,
        updatedData.metric_name,
        updatedData.metric_type,
        updatedData.target_value,
        updatedData.actual_value,
        updatedData.unit,
        updatedData.measurement_period,
        updatedData.measurement_date,
        status,
        breach_reason,
        updatedData.responsible_team,
        updatedData.corrective_action,
        id
      ], function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'データベースエラーが発生しました' });
        }
        
        // 監査ログ
        const logData = {
          event_type: 'Data Modification',
          event_subtype: 'SLA Update',
          user_id: req.user?.user_id,
          username: req.user?.username || 'system',
          action: 'Update',
          target_table: 'slas',
          target_record_id: id,
          old_values: JSON.stringify({
            service_name: existingSLA.service_name,
            status: existingSLA.status,
            actual_value: existingSLA.actual_value
          }),
          new_values: JSON.stringify({
            service_name: updatedData.service_name,
            status: status,
            actual_value: updatedData.actual_value
          }),
          details: `Updated SLA: ${updatedData.service_name} - ${updatedData.metric_name} (${existingSLA.status} → ${status})`
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
          message: 'SLAレコードが正常に更新されました',
          status_changed: existingSLA.status !== status,
          new_status: status
        });
      });
    }
  );
};

/**
 * バルクSLA更新（月次測定値一括更新）
 */
const bulkUpdateSLAs = (req, res) => {
  const { updates } = req.body; // Array of {service_name, metric_type, actual_value, measurement_date}
  
  // 権限チェック（オペレータ以上）
  if (!req.user || !['administrator', 'operator'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'SLAレコードを一括更新する権限がありません',
      required_role: ['administrator', 'operator'],
      current_role: req.user?.role
    });
  }
  
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: '更新データが必要です' });
  }
  
  if (updates.length > 100) {
    return res.status(400).json({ error: '一度に更新できるレコード数は100件までです' });
  }
  
  // トランザクション実行
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    let completed = 0;
    let errors = [];
    
    updates.forEach((update, index) => {
      const { service_name, metric_type, actual_value, measurement_date } = update;
      
      if (!service_name || !metric_type || actual_value === undefined || !measurement_date) {
        errors.push(`レコード ${index + 1}: 必須フィールドが不足しています`);
        completed++;
        checkCompletion();
        return;
      }
      
      // 既存のSLAレコードを検索
      db.get(
        `SELECT * FROM slas 
         WHERE service_name = ? AND metric_type = ? AND measurement_date = ?
         ORDER BY created_date DESC LIMIT 1`,
        [service_name, metric_type, measurement_date],
        (err, existingSLA) => {
          if (err) {
            errors.push(`レコード ${index + 1}: データベースエラー`);
            completed++;
            checkCompletion();
            return;
          }
          
          if (!existingSLA) {
            errors.push(`レコード ${index + 1}: 対応するSLAレコードが見つかりません`);
            completed++;
            checkCompletion();
            return;
          }
          
          // ステータス再計算
          let status = 'Unknown';
          let breach_reason = null;
          
          if (existingSLA.metric_type === 'Availability' || existingSLA.metric_type === 'Quality') {
            status = actual_value >= existingSLA.target_value ? 'Met' : 'Breached';
            if (status === 'Breached') {
              breach_reason = `実績値 ${actual_value}${existingSLA.unit || ''} が目標値 ${existingSLA.target_value}${existingSLA.unit || ''} を下回りました`;
            }
          } else {
            status = actual_value <= existingSLA.target_value ? 'Met' : 'Breached';
            if (status === 'Breached') {
              breach_reason = `実績値 ${actual_value}${existingSLA.unit || ''} が目標値 ${existingSLA.target_value}${existingSLA.unit || ''} を上回りました`;
            }
          }
          
          // At Risk判定
          const threshold = existingSLA.metric_type === 'Availability' || existingSLA.metric_type === 'Quality' ? 
            existingSLA.target_value * 0.9 : existingSLA.target_value * 1.1;
          
          if (status === 'Met') {
            if (existingSLA.metric_type === 'Availability' || existingSLA.metric_type === 'Quality') {
              if (actual_value < threshold) {
                status = 'At Risk';
              }
            } else {
              if (actual_value > threshold) {
                status = 'At Risk';
              }
            }
          }
          
          // 更新実行
          db.run(
            `UPDATE slas 
             SET actual_value = ?, status = ?, breach_reason = ?, updated_date = datetime('now')
             WHERE sla_id = ?`,
            [actual_value, status, breach_reason, existingSLA.sla_id],
            function(updateErr) {
              if (updateErr) {
                errors.push(`レコード ${index + 1}: 更新エラー`);
              }
              
              completed++;
              checkCompletion();
            }
          );
        }
      );
    });
    
    function checkCompletion() {
      if (completed === updates.length) {
        if (errors.length > 0) {
          db.run('ROLLBACK');
          res.status(400).json({
            success: false,
            message: 'バルク更新中にエラーが発生しました',
            errors: errors,
            processed: updates.length,
            failed: errors.length
          });
        } else {
          db.run('COMMIT');
          
          // 監査ログ記録
          const logData = {
            event_type: 'Data Modification',
            event_subtype: 'SLA Bulk Update',
            user_id: req.user?.user_id,
            username: req.user?.username || 'system',
            action: 'Update',
            target_table: 'slas',
            details: `Bulk updated ${updates.length} SLA records`
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
            message: `${updates.length}件のSLAレコードが正常に一括更新されました`,
            processed: updates.length
          });
        }
      }
    }
  });
};

/**
 * SLAアラート生成
 */
const generateSLAAlerts = (req, res) => {
  const { days_ahead = 7 } = req.query;
  
  // 権限チェック（オペレータ以上）
  if (!req.user || !['administrator', 'operator'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'SLAアラートを生成する権限がありません',
      required_role: ['administrator', 'operator'],
      current_role: req.user?.role
    });
  }
  
  const queries = [
    // 違反中のSLA
    `SELECT 'breached' as alert_type, service_name, metric_name, metric_type, 
            target_value, actual_value, unit, measurement_date, breach_reason, responsible_team
     FROM slas 
     WHERE status = 'Breached' 
     ORDER BY measurement_date DESC`,
    
    // リスク状態のSLA
    `SELECT 'at_risk' as alert_type, service_name, metric_name, metric_type, 
            target_value, actual_value, unit, measurement_date, responsible_team
     FROM slas 
     WHERE status = 'At Risk' 
     ORDER BY measurement_date DESC`,
    
    // 測定期限が近いSLA（実績値未入力）
    `SELECT 'measurement_due' as alert_type, service_name, metric_name, metric_type, 
            target_value, unit, measurement_period, responsible_team,
            CASE measurement_period
              WHEN 'Daily' THEN date('now', '+1 day')
              WHEN 'Weekly' THEN date('now', '+7 days') 
              WHEN 'Monthly' THEN date('now', '+30 days')
              WHEN 'Quarterly' THEN date('now', '+90 days')
              WHEN 'Annually' THEN date('now', '+365 days')
            END as next_measurement_due
     FROM slas s1
     WHERE actual_value IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM slas s2 
         WHERE s2.service_name = s1.service_name 
           AND s2.metric_type = s1.metric_type
           AND s2.measurement_date > s1.measurement_date
       )
       AND CASE measurement_period
             WHEN 'Daily' THEN date('now', '+1 day')
             WHEN 'Weekly' THEN date('now', '+7 days') 
             WHEN 'Monthly' THEN date('now', '+30 days')
             WHEN 'Quarterly' THEN date('now', '+90 days')
             WHEN 'Annually' THEN date('now', '+365 days')
           END <= date('now', '+' || ? || ' days')
     ORDER BY next_measurement_due ASC`
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
      db.all(queries[2], [days_ahead], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    })
  ])
  .then(([breachedAlerts, atRiskAlerts, measurementDueAlerts]) => {
    const allAlerts = [
      ...breachedAlerts,
      ...atRiskAlerts,
      ...measurementDueAlerts
    ];
    
    // アラートの優先度付け
    const prioritizedAlerts = allAlerts.map(alert => ({
      ...alert,
      priority: alert.alert_type === 'breached' ? 'Critical' : 
                alert.alert_type === 'at_risk' ? 'High' : 'Medium',
      message: generateAlertMessage(alert)
    }));
    
    // 監査ログ記録
    const logData = {
      event_type: 'Data Access',
      event_subtype: 'SLA Alert Generation',
      user_id: req.user?.user_id,
      username: req.user?.username || 'system',
      action: 'Read',
      target_table: 'slas',
      details: `Generated ${allAlerts.length} SLA alerts`
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
        breached: breachedAlerts.length,
        at_risk: atRiskAlerts.length,
        measurement_due: measurementDueAlerts.length
      },
      generated_at: new Date().toISOString()
    });
  })
  .catch(err => {
    console.error('Database error:', err);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  });
};

function generateAlertMessage(alert) {
  switch (alert.alert_type) {
    case 'breached':
      return `SLA違反: ${alert.service_name}の${alert.metric_name}が目標値を下回っています (実績: ${alert.actual_value}${alert.unit || ''}, 目標: ${alert.target_value}${alert.unit || ''})`;
    case 'at_risk':
      return `SLAリスク: ${alert.service_name}の${alert.metric_name}が警告レベルに達しています (実績: ${alert.actual_value}${alert.unit || ''}, 目標: ${alert.target_value}${alert.unit || ''})`;
    case 'measurement_due':
      return `測定期限: ${alert.service_name}の${alert.metric_name}の測定が必要です (期限: ${alert.next_measurement_due})`;
    default:
      return 'SLAアラート';
  }
}

/**
 * SLA削除
 */
const deleteSLA = (req, res) => {
  const { id } = req.params;
  
  // 権限チェック（管理者のみ削除可能）
  if (req.user && req.user.role !== 'administrator') {
    return res.status(403).json({ 
      error: 'SLAレコードを削除する権限がありません',
      required_role: 'administrator',
      current_role: req.user.role
    });
  }
  
  // 存在確認
  db.get(
    'SELECT service_name, metric_name, measurement_date FROM slas WHERE sla_id = ?',
    [id],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'SLAレコードが見つかりません' });
      }
      
      // 削除実行
      db.run(
        'DELETE FROM slas WHERE sla_id = ?',
        [id],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'データベースエラーが発生しました' });
          }
          
          // 監査ログ
          const logData = {
            event_type: 'Data Modification',
            event_subtype: 'SLA Delete',
            user_id: req.user?.user_id,
            username: req.user?.username || 'system',
            action: 'Delete',
            target_table: 'slas',
            target_record_id: id,
            details: `Deleted SLA: ${row.service_name} - ${row.metric_name} (${row.measurement_date})`
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
            message: 'SLAレコードが正常に削除されました',
            deleted_id: id
          });
        }
      );
    }
  );
};

module.exports = {
  getSLAs,
  getSLAStats,
  getSLAById,
  createSLA,
  updateSLA,
  bulkUpdateSLAs,
  generateSLAAlerts,
  deleteSLA
};