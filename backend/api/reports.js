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
 * エグゼクティブダッシュボードレポート
 */
const getExecutiveDashboard = (req, res) => {
  const { period = 'monthly' } = req.query;
  
  // 権限チェック（管理者またはオペレータ）
  if (!req.user || !['administrator', 'operator'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'エグゼクティブダッシュボードを表示する権限がありません',
      required_role: ['administrator', 'operator'],
      current_role: req.user?.role
    });
  }
  
  // 期間設定
  let dateCondition = '';
  switch (period) {
    case 'weekly':
      dateCondition = "AND created_date >= datetime('now', '-7 days')";
      break;
    case 'monthly':
      dateCondition = "AND created_date >= datetime('now', '-30 days')";
      break;
    case 'quarterly':
      dateCondition = "AND created_date >= datetime('now', '-90 days')";
      break;
    case 'yearly':
      dateCondition = "AND created_date >= datetime('now', '-365 days')";
      break;
  }
  
  const queries = [
    // 1. インシデント概要
    `SELECT 
       COUNT(*) as total_incidents,
       COUNT(CASE WHEN status = 'Open' THEN 1 END) as open_incidents,
       COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved_incidents,
       COUNT(CASE WHEN priority = 'Critical' THEN 1 END) as critical_incidents,
       AVG(CASE 
         WHEN resolved_date IS NOT NULL AND created_date IS NOT NULL 
         THEN JULIANDAY(resolved_date) - JULIANDAY(created_date) 
       END) as avg_resolution_days
     FROM incidents WHERE 1=1 ${dateCondition}`,
    
    // 2. 資産管理概要
    `SELECT 
       COUNT(*) as total_assets,
       COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_assets,
       COUNT(CASE WHEN status = 'Maintenance' THEN 1 END) as maintenance_assets,
       COUNT(CASE WHEN status = 'Retired' THEN 1 END) as retired_assets
     FROM assets WHERE 1=1 ${dateCondition}`,
    
    // 3. 変更管理概要
    `SELECT 
       COUNT(*) as total_changes,
       COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_changes,
       COUNT(CASE WHEN status = 'Implemented' THEN 1 END) as implemented_changes,
       COUNT(CASE WHEN status = 'Failed' THEN 1 END) as failed_changes,
       COUNT(CASE WHEN risk_level = 'High' THEN 1 END) as high_risk_changes
     FROM changes WHERE 1=1 ${dateCondition}`,
    
    // 4. SLA概要
    `SELECT 
       COUNT(*) as total_slas,
       COUNT(CASE WHEN status = 'Met' THEN 1 END) as met_slas,
       COUNT(CASE WHEN status = 'Breached' THEN 1 END) as breached_slas,
       AVG(CASE 
         WHEN actual_value IS NOT NULL AND target_value > 0 
         THEN (actual_value / target_value) * 100 
       END) as avg_achievement_rate
     FROM slas WHERE 1=1 ${dateCondition}`,
    
    // 5. 問題管理概要
    `SELECT 
       COUNT(*) as total_problems,
       COUNT(CASE WHEN status = 'Known Error' THEN 1 END) as known_errors,
       COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved_problems,
       COUNT(CASE WHEN priority = 'Critical' THEN 1 END) as critical_problems
     FROM problems WHERE 1=1 ${dateCondition}`,
    
    // 6. サービス要求概要
    `SELECT 
       COUNT(*) as total_requests,
       COUNT(CASE WHEN status = 'Fulfilled' THEN 1 END) as fulfilled_requests,
       COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_requests,
       AVG(CASE 
         WHEN fulfilled_date IS NOT NULL AND request_date IS NOT NULL 
         THEN JULIANDAY(fulfilled_date) - JULIANDAY(request_date) 
       END) as avg_fulfillment_days
     FROM service_requests WHERE 1=1 ${dateCondition}`,
    
    // 7. キャパシティ警告
    `SELECT 
       COUNT(*) as total_capacity_items,
       COUNT(CASE WHEN usage_percent >= threshold_critical THEN 1 END) as critical_capacity,
       COUNT(CASE WHEN usage_percent >= threshold_warning AND usage_percent < threshold_critical THEN 1 END) as warning_capacity,
       AVG(usage_percent) as avg_utilization
     FROM capacity`,
    
    // 8. 可用性概要
    `SELECT 
       COUNT(*) as total_availability_records,
       COUNT(CASE WHEN sla_met = 1 THEN 1 END) as sla_met_count,
       AVG(uptime_percent) as avg_uptime_percent
     FROM availability WHERE measurement_date >= date('now', '-30 days')`
  ];
  
  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }))
  .then(([incidentResult, assetResult, changeResult, slaResult, problemResult, serviceRequestResult, capacityResult, availabilityResult]) => {
    
    const dashboard = {
      report_metadata: {
        generated_at: new Date().toISOString(),
        generated_by: req.user.username,
        period: period,
        dashboard_type: 'executive'
      },
      
      key_performance_indicators: {
        incidents: {
          total: incidentResult[0].total_incidents,
          resolution_rate: incidentResult[0].total_incidents > 0 ? 
            Math.round((incidentResult[0].resolved_incidents / incidentResult[0].total_incidents) * 100) : 0,
          avg_resolution_days: Math.round((incidentResult[0].avg_resolution_days || 0) * 10) / 10,
          critical_count: incidentResult[0].critical_incidents
        },
        
        changes: {
          total: changeResult[0].total_changes,
          success_rate: changeResult[0].total_changes > 0 ? 
            Math.round((changeResult[0].implemented_changes / changeResult[0].total_changes) * 100) : 0,
          failure_rate: changeResult[0].total_changes > 0 ? 
            Math.round((changeResult[0].failed_changes / changeResult[0].total_changes) * 100) : 0,
          high_risk_count: changeResult[0].high_risk_changes
        },
        
        sla_performance: {
          total: slaResult[0].total_slas,
          compliance_rate: slaResult[0].total_slas > 0 ? 
            Math.round((slaResult[0].met_slas / slaResult[0].total_slas) * 100) : 0,
          avg_achievement: Math.round((slaResult[0].avg_achievement_rate || 0) * 10) / 10,
          breached_count: slaResult[0].breached_slas
        },
        
        service_requests: {
          total: serviceRequestResult[0].total_requests,
          fulfillment_rate: serviceRequestResult[0].total_requests > 0 ? 
            Math.round((serviceRequestResult[0].fulfilled_requests / serviceRequestResult[0].total_requests) * 100) : 0,
          avg_fulfillment_days: Math.round((serviceRequestResult[0].avg_fulfillment_days || 0) * 10) / 10,
          pending_count: serviceRequestResult[0].pending_requests
        }
      },
      
      operational_metrics: {
        asset_health: {
          total_assets: assetResult[0].total_assets,
          active_rate: assetResult[0].total_assets > 0 ? 
            Math.round((assetResult[0].active_assets / assetResult[0].total_assets) * 100) : 0,
          maintenance_count: assetResult[0].maintenance_assets,
          retired_count: assetResult[0].retired_assets
        },
        
        capacity_status: {
          total_resources: capacityResult[0].total_capacity_items,
          critical_resources: capacityResult[0].critical_capacity,
          warning_resources: capacityResult[0].warning_capacity,
          avg_utilization: Math.round((capacityResult[0].avg_utilization || 0) * 10) / 10
        },
        
        availability_performance: {
          total_services: availabilityResult[0].total_availability_records,
          sla_compliance: availabilityResult[0].total_availability_records > 0 ? 
            Math.round((availabilityResult[0].sla_met_count / availabilityResult[0].total_availability_records) * 100) : 0,
          avg_uptime: Math.round((availabilityResult[0].avg_uptime_percent || 0) * 100) / 100
        },
        
        problem_management: {
          total_problems: problemResult[0].total_problems,
          known_errors: problemResult[0].known_errors,
          resolution_rate: problemResult[0].total_problems > 0 ? 
            Math.round((problemResult[0].resolved_problems / problemResult[0].total_problems) * 100) : 0,
          critical_problems: problemResult[0].critical_problems
        }
      },
      
      risk_indicators: {
        high_risk_changes: changeResult[0].high_risk_changes,
        critical_incidents: incidentResult[0].critical_incidents,
        sla_breaches: slaResult[0].breached_slas,
        critical_capacity_issues: capacityResult[0].critical_capacity,
        critical_problems: problemResult[0].critical_problems
      }
    };
    
    // 総合スコアの計算
    const totalScore = (
      dashboard.key_performance_indicators.incidents.resolution_rate +
      dashboard.key_performance_indicators.changes.success_rate +
      dashboard.key_performance_indicators.sla_performance.compliance_rate +
      dashboard.key_performance_indicators.service_requests.fulfillment_rate +
      dashboard.operational_metrics.asset_health.active_rate +
      dashboard.operational_metrics.availability_performance.sla_compliance
    ) / 6;
    
    dashboard.overall_health_score = Math.round(totalScore);
    
    // 監査ログ記録
    const logData = {
      event_type: 'Data Access',
      event_subtype: 'Executive Dashboard',
      user_id: req.user.user_id,
      username: req.user.username,
      action: 'Read',
      details: `Generated executive dashboard report for ${period} period`
    };
    
    db.run(
      `INSERT INTO logs (
        event_type, event_subtype, user_id, username, action, details
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      Object.values(logData)
    );
    
    res.json(dashboard);
  })
  .catch(err => {
    console.error('Database error:', err);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  });
};

/**
 * ITSMパフォーマンスレポート
 */
const getPerformanceReport = (req, res) => {
  const { start_date, end_date, metrics = 'all' } = req.query;
  
  let dateCondition = '';
  let dateParams = [];
  
  if (start_date && end_date) {
    dateCondition = 'AND created_date BETWEEN ? AND ?';
    dateParams = [start_date, end_date + ' 23:59:59'];
  } else {
    dateCondition = "AND created_date >= datetime('now', '-30 days')";
  }
  
  const queries = [
    // 1. インシデント解決時間分析
    `SELECT 
       priority,
       COUNT(*) as count,
       AVG(CASE 
         WHEN resolved_date IS NOT NULL AND created_date IS NOT NULL 
         THEN JULIANDAY(resolved_date) - JULIANDAY(created_date) 
       END) as avg_resolution_days,
       MIN(CASE 
         WHEN resolved_date IS NOT NULL AND created_date IS NOT NULL 
         THEN JULIANDAY(resolved_date) - JULIANDAY(created_date) 
       END) as min_resolution_days,
       MAX(CASE 
         WHEN resolved_date IS NOT NULL AND created_date IS NOT NULL 
         THEN JULIANDAY(resolved_date) - JULIANDAY(created_date) 
       END) as max_resolution_days
     FROM incidents 
     WHERE resolved_date IS NOT NULL ${dateCondition}
     GROUP BY priority`,
    
    // 2. 変更成功率分析
    `SELECT 
       type,
       risk_level,
       COUNT(*) as total_changes,
       COUNT(CASE WHEN status = 'Implemented' THEN 1 END) as successful_changes,
       COUNT(CASE WHEN status = 'Failed' THEN 1 END) as failed_changes,
       AVG(CASE 
         WHEN actual_end_date IS NOT NULL AND actual_start_date IS NOT NULL 
         THEN JULIANDAY(actual_end_date) - JULIANDAY(actual_start_date) 
       END) as avg_implementation_days
     FROM changes 
     WHERE status IN ('Implemented', 'Failed') ${dateCondition}
     GROUP BY type, risk_level`,
    
    // 3. SLAトレンド分析
    `SELECT 
       service_name,
       metric_type,
       COUNT(*) as measurement_count,
       COUNT(CASE WHEN status = 'Met' THEN 1 END) as met_count,
       AVG(CASE 
         WHEN actual_value IS NOT NULL AND target_value > 0 
         THEN (actual_value / target_value) * 100 
       END) as avg_achievement_rate,
       MIN(CASE 
         WHEN actual_value IS NOT NULL AND target_value > 0 
         THEN (actual_value / target_value) * 100 
       END) as min_achievement_rate,
       MAX(CASE 
         WHEN actual_value IS NOT NULL AND target_value > 0 
         THEN (actual_value / target_value) * 100 
       END) as max_achievement_rate
     FROM slas 
     WHERE actual_value IS NOT NULL ${dateCondition}
     GROUP BY service_name, metric_type
     ORDER BY avg_achievement_rate ASC`,
    
    // 4. 日次トレンド分析
    `SELECT 
       DATE(created_date) as date,
       COUNT(CASE WHEN target_table = 'incidents' THEN 1 END) as incidents_created,
       COUNT(CASE WHEN target_table = 'changes' THEN 1 END) as changes_created,
       COUNT(CASE WHEN target_table = 'service_requests' THEN 1 END) as requests_created,
       COUNT(CASE WHEN target_table = 'problems' THEN 1 END) as problems_created
     FROM logs 
     WHERE action = 'Create' 
       AND target_table IN ('incidents', 'changes', 'service_requests', 'problems')
       AND timestamp >= datetime('now', '-30 days')
     GROUP BY DATE(created_date)
     ORDER BY date`,
    
    // 5. ユーザー生産性分析
    `SELECT 
       u.username,
       u.display_name,
       u.role,
       COUNT(CASE WHEN l.target_table = 'incidents' AND l.action = 'Update' AND l.new_values LIKE '%Resolved%' THEN 1 END) as incidents_resolved,
       COUNT(CASE WHEN l.target_table = 'changes' AND l.action = 'Update' AND l.new_values LIKE '%Implemented%' THEN 1 END) as changes_implemented,
       COUNT(CASE WHEN l.target_table = 'service_requests' AND l.action = 'Update' AND l.new_values LIKE '%Fulfilled%' THEN 1 END) as requests_fulfilled,
       COUNT(l.log_id) as total_activities
     FROM users u
     LEFT JOIN logs l ON u.user_id = l.user_id AND l.timestamp >= datetime('now', '-30 days')
     WHERE u.active = TRUE
     GROUP BY u.user_id, u.username, u.display_name, u.role
     HAVING total_activities > 0
     ORDER BY total_activities DESC
     LIMIT 20`
  ];
  
  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.all(query, dateParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }))
  .then(([incidentMetrics, changeMetrics, slaMetrics, trendMetrics, userMetrics]) => {
    
    const report = {
      report_metadata: {
        generated_at: new Date().toISOString(),
        generated_by: req.user.username,
        period: {
          start: start_date || 'Last 30 days',
          end: end_date || 'Now'
        },
        metrics_included: metrics
      },
      
      incident_performance: {
        resolution_times_by_priority: incidentMetrics.map(row => ({
          priority: row.priority,
          count: row.count,
          avg_resolution_days: Math.round((row.avg_resolution_days || 0) * 100) / 100,
          min_resolution_days: Math.round((row.min_resolution_days || 0) * 100) / 100,
          max_resolution_days: Math.round((row.max_resolution_days || 0) * 100) / 100
        }))
      },
      
      change_performance: {
        success_rates_by_type_and_risk: changeMetrics.map(row => ({
          type: row.type,
          risk_level: row.risk_level,
          total_changes: row.total_changes,
          success_rate: row.total_changes > 0 ? 
            Math.round((row.successful_changes / row.total_changes) * 100) : 0,
          failure_rate: row.total_changes > 0 ? 
            Math.round((row.failed_changes / row.total_changes) * 100) : 0,
          avg_implementation_days: Math.round((row.avg_implementation_days || 0) * 100) / 100
        }))
      },
      
      sla_performance: {
        service_achievement_rates: slaMetrics.map(row => ({
          service_name: row.service_name,
          metric_type: row.metric_type,
          measurement_count: row.measurement_count,
          compliance_rate: row.measurement_count > 0 ? 
            Math.round((row.met_count / row.measurement_count) * 100) : 0,
          avg_achievement_rate: Math.round((row.avg_achievement_rate || 0) * 10) / 10,
          min_achievement_rate: Math.round((row.min_achievement_rate || 0) * 10) / 10,
          max_achievement_rate: Math.round((row.max_achievement_rate || 0) * 10) / 10
        }))
      },
      
      activity_trends: {
        daily_activity: trendMetrics
      },
      
      team_productivity: {
        user_performance: userMetrics
      },
      
      performance_summary: {
        total_incidents_analyzed: incidentMetrics.reduce((sum, row) => sum + row.count, 0),
        total_changes_analyzed: changeMetrics.reduce((sum, row) => sum + row.total_changes, 0),
        avg_incident_resolution_time: incidentMetrics.length > 0 ? 
          Math.round((incidentMetrics.reduce((sum, row) => sum + (row.avg_resolution_days || 0), 0) / incidentMetrics.length) * 100) / 100 : 0,
        overall_change_success_rate: changeMetrics.length > 0 ? 
          Math.round((changeMetrics.reduce((sum, row) => sum + (row.successful_changes / row.total_changes * 100), 0) / changeMetrics.length) * 10) / 10 : 0,
        overall_sla_compliance: slaMetrics.length > 0 ? 
          Math.round((slaMetrics.reduce((sum, row) => sum + (row.met_count / row.measurement_count * 100), 0) / slaMetrics.length) * 10) / 10 : 0
      }
    };
    
    // 監査ログ記録
    const logData = {
      event_type: 'Data Access',
      event_subtype: 'Performance Report',
      user_id: req.user.user_id,
      username: req.user.username,
      action: 'Read',
      details: `Generated ITSM performance report with ${metrics} metrics`
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
 * 月次運用レポート
 */
const getMonthlyOperationalReport = (req, res) => {
  const { year, month } = req.query;
  
  const currentDate = new Date();
  const targetYear = year || currentDate.getFullYear();
  const targetMonth = month || (currentDate.getMonth() + 1);
  
  const startDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01`;
  const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0] + ' 23:59:59';
  
  const queries = [
    // 月次サマリー
    `SELECT 
       'incidents' as category,
       COUNT(*) as total,
       COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as completed,
       COUNT(CASE WHEN priority = 'Critical' THEN 1 END) as critical
     FROM incidents 
     WHERE created_date BETWEEN ? AND ?
     UNION ALL
     SELECT 
       'changes' as category,
       COUNT(*) as total,
       COUNT(CASE WHEN status = 'Implemented' THEN 1 END) as completed,
       COUNT(CASE WHEN risk_level = 'High' THEN 1 END) as critical
     FROM changes 
     WHERE created_date BETWEEN ? AND ?
     UNION ALL
     SELECT 
       'service_requests' as category,
       COUNT(*) as total,
       COUNT(CASE WHEN status = 'Fulfilled' THEN 1 END) as completed,
       COUNT(CASE WHEN priority = 'Critical' THEN 1 END) as critical
     FROM service_requests 
     WHERE created_date BETWEEN ? AND ?
     UNION ALL
     SELECT 
       'problems' as category,
       COUNT(*) as total,
       COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as completed,
       COUNT(CASE WHEN priority = 'Critical' THEN 1 END) as critical
     FROM problems 
     WHERE created_date BETWEEN ? AND ?`,
    
    // 週別トレンド
    `SELECT 
       strftime('%W', created_date) as week_number,
       COUNT(CASE WHEN target_table = 'incidents' THEN 1 END) as incidents,
       COUNT(CASE WHEN target_table = 'changes' THEN 1 END) as changes,
       COUNT(CASE WHEN target_table = 'service_requests' THEN 1 END) as service_requests,
       COUNT(CASE WHEN target_table = 'problems' THEN 1 END) as problems
     FROM logs 
     WHERE action = 'Create' 
       AND timestamp BETWEEN ? AND ?
       AND target_table IN ('incidents', 'changes', 'service_requests', 'problems')
     GROUP BY strftime('%W', created_date)
     ORDER BY week_number`,
    
    // SLA達成状況
    `SELECT 
       service_name,
       metric_type,
       COUNT(*) as total_measurements,
       COUNT(CASE WHEN status = 'Met' THEN 1 END) as met_count,
       AVG(CASE 
         WHEN actual_value IS NOT NULL AND target_value > 0 
         THEN (actual_value / target_value) * 100 
       END) as avg_achievement
     FROM slas 
     WHERE measurement_date BETWEEN ? AND ?
     GROUP BY service_name, metric_type
     ORDER BY service_name, metric_type`,
    
    // 主要な課題とリスク
    `SELECT 
       'incident' as item_type,
       incident_number as item_id,
       title as description,
       priority,
       status,
       created_date
     FROM incidents 
     WHERE priority = 'Critical' 
       AND status NOT IN ('Resolved', 'Closed')
       AND created_date BETWEEN ? AND ?
     UNION ALL
     SELECT 
       'problem' as item_type,
       problem_number as item_id,
       title as description,
       priority,
       status,
       registered_date as created_date
     FROM problems 
     WHERE priority = 'Critical' 
       AND status NOT IN ('Resolved', 'Closed')
       AND registered_date BETWEEN ? AND ?
     ORDER BY created_date DESC
     LIMIT 20`
  ];
  
  const queryParams = [startDate, endDate];
  
  Promise.all(queries.map((query, index) => {
    return new Promise((resolve, reject) => {
      let params;
      if (index === 0) {
        // 月次サマリーは4つのUNIONクエリなので8つのパラメータ
        params = [startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate];
      } else if (index === 3) {
        // 課題とリスクは2つのUNIONクエリなので4つのパラメータ  
        params = [startDate, endDate, startDate, endDate];
      } else {
        params = queryParams;
      }
      
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }))
  .then(([summaryResult, trendResult, slaResult, issuesResult]) => {
    
    const report = {
      report_metadata: {
        generated_at: new Date().toISOString(),
        generated_by: req.user.username,
        report_period: {
          year: parseInt(targetYear),
          month: parseInt(targetMonth),
          month_name: new Date(targetYear, targetMonth - 1).toLocaleString('ja-JP', { month: 'long' }),
          start_date: startDate,
          end_date: endDate.split(' ')[0]
        }
      },
      
      executive_summary: summaryResult.reduce((acc, row) => {
        acc[row.category] = {
          total: row.total,
          completed: row.completed,
          completion_rate: row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0,
          critical_items: row.critical
        };
        return acc;
      }, {}),
      
      weekly_trends: trendResult,
      
      sla_performance: {
        by_service: slaResult.map(row => ({
          service_name: row.service_name,
          metric_type: row.metric_type,
          total_measurements: row.total_measurements,
          compliance_rate: row.total_measurements > 0 ? 
            Math.round((row.met_count / row.total_measurements) * 100) : 0,
          avg_achievement: Math.round((row.avg_achievement || 0) * 10) / 10
        })),
        overall_compliance: slaResult.length > 0 ? 
          Math.round((slaResult.reduce((sum, row) => sum + (row.met_count / row.total_measurements * 100), 0) / slaResult.length) * 10) / 10 : 0
      },
      
      critical_issues_and_risks: issuesResult,
      
      recommendations: generateMonthlyRecommendations(summaryResult, slaResult, issuesResult)
    };
    
    // 監査ログ記録
    const logData = {
      event_type: 'Data Access',
      event_subtype: 'Monthly Operational Report',
      user_id: req.user.user_id,
      username: req.user.username,
      action: 'Read',
      details: `Generated monthly operational report for ${targetYear}-${targetMonth}`
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
 * 月次レポートの推奨事項生成
 */
function generateMonthlyRecommendations(summaryData, slaData, criticalIssues) {
  const recommendations = [];
  
  // インシデント分析
  const incidents = summaryData.find(item => item.category === 'incidents');
  if (incidents && incidents.total > 0) {
    const resolutionRate = (incidents.completed / incidents.total) * 100;
    if (resolutionRate < 80) {
      recommendations.push({
        category: 'Incident Management',
        priority: 'High',
        recommendation: `インシデント解決率が${Math.round(resolutionRate)}%と低いため、解決プロセスの見直しが必要です。`,
        action: 'インシデント対応手順の再評価と担当者のスキル向上を検討してください。'
      });
    }
  }
  
  // 変更管理分析
  const changes = summaryData.find(item => item.category === 'changes');
  if (changes && changes.total > 0) {
    const successRate = (changes.completed / changes.total) * 100;
    if (successRate < 85) {
      recommendations.push({
        category: 'Change Management',
        priority: 'Medium',
        recommendation: `変更実装成功率が${Math.round(successRate)}%と目標を下回っています。`,
        action: '変更計画の詳細化とリスク評価プロセスの強化を推奨します。'
      });
    }
  }
  
  // SLA分析
  const avgSlaCompliance = slaData.length > 0 ? 
    slaData.reduce((sum, row) => sum + (row.met_count / row.total_measurements * 100), 0) / slaData.length : 0;
  
  if (avgSlaCompliance < 90) {
    recommendations.push({
      category: 'SLA Management',
      priority: 'High',
      recommendation: `SLA達成率が${Math.round(avgSlaCompliance)}%と目標を下回っています。`,
      action: 'サービス提供プロセスの改善とリソース配分の見直しが必要です。'
    });
  }
  
  // 重要課題分析
  if (criticalIssues.length > 5) {
    recommendations.push({
      category: 'Risk Management',
      priority: 'Critical',
      recommendation: `重要な未解決課題が${criticalIssues.length}件存在します。`,
      action: '優先度に基づく課題解決計画の策定と追加リソースの投入を検討してください。'
    });
  }
  
  return recommendations;
}

/**
 * カスタムレポート生成
 */
const generateCustomReport = (req, res) => {
  const { 
    report_name,
    data_sources = [],
    filters = {},
    aggregations = [],
    start_date,
    end_date
  } = req.body;
  
  // 権限チェック（管理者またはオペレータ）
  if (!req.user || !['administrator', 'operator'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'カスタムレポートを生成する権限がありません',
      required_role: ['administrator', 'operator'],
      current_role: req.user?.role
    });
  }
  
  if (!report_name || data_sources.length === 0) {
    return res.status(400).json({ 
      error: 'レポート名とデータソースは必須です',
      details: {
        report_name: !report_name ? 'レポート名が必要です' : null,
        data_sources: data_sources.length === 0 ? 'データソースが必要です' : null
      }
    });
  }
  
  // 利用可能なデータソース
  const validDataSources = ['incidents', 'changes', 'assets', 'service_requests', 'problems', 'slas', 'capacity', 'availability', 'logs'];
  
  // データソース検証
  const invalidSources = data_sources.filter(source => !validDataSources.includes(source));
  if (invalidSources.length > 0) {
    return res.status(400).json({ 
      error: '無効なデータソースが含まれています',
      invalid_sources: invalidSources,
      valid_sources: validDataSources
    });
  }
  
  // 動的クエリ生成
  const queries = data_sources.map(source => {
    let baseQuery = '';
    let dateField = 'created_date';
    
    switch (source) {
      case 'incidents':
        baseQuery = 'SELECT "incidents" as source, COUNT(*) as total, status, priority FROM incidents';
        break;
      case 'changes':
        baseQuery = 'SELECT "changes" as source, COUNT(*) as total, status, type, risk_level FROM changes';
        break;
      case 'assets':
        baseQuery = 'SELECT "assets" as source, COUNT(*) as total, status, type, location FROM assets';
        break;
      case 'service_requests':
        baseQuery = 'SELECT "service_requests" as source, COUNT(*) as total, status, priority FROM service_requests';
        break;
      case 'problems':
        baseQuery = 'SELECT "problems" as source, COUNT(*) as total, status, priority FROM problems';
        dateField = 'registered_date';
        break;
      case 'slas':
        baseQuery = 'SELECT "slas" as source, COUNT(*) as total, status, metric_type FROM slas';
        dateField = 'measurement_date';
        break;
      case 'capacity':
        baseQuery = 'SELECT "capacity" as source, COUNT(*) as total, status, resource_type FROM capacity';
        dateField = 'measurement_date';
        break;
      case 'availability':
        baseQuery = 'SELECT "availability" as source, COUNT(*) as total, sla_met, service_type FROM availability';
        dateField = 'period_start_date';
        break;
      case 'logs':
        baseQuery = 'SELECT "logs" as source, COUNT(*) as total, event_type, action FROM logs';
        dateField = 'timestamp';
        break;
    }
    
    // 日付フィルタ追加
    let whereClause = ' WHERE 1=1';
    let params = [];
    
    if (start_date) {
      whereClause += ` AND DATE(${dateField}) >= ?`;
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ` AND DATE(${dateField}) <= ?`;
      params.push(end_date);
    }
    
    // 追加フィルタ
    if (filters[source]) {
      Object.entries(filters[source]).forEach(([field, value]) => {
        whereClause += ` AND ${field} = ?`;
        params.push(value);
      });
    }
    
    // グループ化とソート
    const groupByFields = baseQuery.split('FROM')[0].split(',').slice(2).map(field => field.trim());
    if (groupByFields.length > 0) {
      baseQuery += whereClause + ' GROUP BY ' + groupByFields.join(', ') + ' ORDER BY total DESC';
    } else {
      baseQuery += whereClause;
    }
    
    return { query: baseQuery, params };
  });
  
  // クエリ実行
  Promise.all(queries.map(({ query, params }) => {
    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }))
  .then(results => {
    const report = {
      report_metadata: {
        name: report_name,
        generated_at: new Date().toISOString(),
        generated_by: req.user.username,
        data_sources: data_sources,
        filters: filters,
        period: {
          start: start_date || 'N/A',
          end: end_date || 'N/A'
        }
      },
      
      data: results.reduce((acc, result, index) => {
        acc[data_sources[index]] = result;
        return acc;
      }, {}),
      
      summary: {
        total_data_sources: data_sources.length,
        total_records: results.reduce((sum, result) => sum + result.reduce((sourceSum, row) => sourceSum + (row.total || 0), 0), 0)
      }
    };
    
    // 監査ログ記録
    const logData = {
      event_type: 'Data Access',
      event_subtype: 'Custom Report Generation',
      user_id: req.user.user_id,
      username: req.user.username,
      action: 'Read',
      details: `Generated custom report "${report_name}" with data sources: ${data_sources.join(', ')}`
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

module.exports = {
  getExecutiveDashboard,
  getPerformanceReport,
  getMonthlyOperationalReport,
  generateCustomReport
};