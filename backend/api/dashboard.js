const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// データベース接続
const dbPath = path.join(__dirname, '..', process.env.DB_PATH || 'db/itsm.sqlite');
const db = new sqlite3.Database(dbPath);

// 外部キー制約を有効化
db.run('PRAGMA foreign_keys = ON');

/**
 * ユーザーダッシュボード用統合データAPI
 * Feature-A要求: ユーザー情報、アクティビティ、統計データを効率的に取得
 */
const getDashboardData = (req, res) => {
  const userId = req.user?.user_id;
  const userRole = req.user?.role;
  
  if (!userId) {
    return res.status(401).json({ error: '認証が必要です' });
  }

  // 並列データ取得クエリ定義
  const queries = {
    // 1. ユーザー基本情報
    userInfo: `
      SELECT user_id, username, display_name, email, role, 
             created_at, last_login, status,
             (SELECT COUNT(*) FROM logs WHERE user_id = ?) as total_activities
      FROM users WHERE user_id = ?
    `,
    
    // 2. 最近のアクティビティ（過去7日）
    recentActivity: `
      SELECT log_id, timestamp, event_type, action, target_table, details
      FROM logs 
      WHERE user_id = ? AND timestamp >= datetime('now', '-7 days')
      ORDER BY timestamp DESC LIMIT 10
    `,
    
    // 3. 担当中のインシデント
    activeIncidents: `
      SELECT incident_id, title, priority, status, created_at
      FROM incidents 
      WHERE assigned_to = ? AND status NOT IN ('Resolved', 'Closed')
      ORDER BY priority DESC, created_at DESC LIMIT 5
    `,
    
    // 4. 管理中の資産
    managedAssets: `
      SELECT asset_id, asset_tag, name, type, status
      FROM assets 
      WHERE owner = ? OR assigned_to = ?
      ORDER BY created_at DESC LIMIT 5
    `,
    
    // 5. システム全体統計（権限に応じて）
    systemStats: userRole === 'administrator' || userRole === 'operator' ? `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE status = 'Active') as active_users,
        (SELECT COUNT(*) FROM assets WHERE status = 'Active') as active_assets,
        (SELECT COUNT(*) FROM incidents WHERE status NOT IN ('Resolved', 'Closed')) as open_incidents,
        (SELECT COUNT(*) FROM service_requests WHERE status = 'Open') as open_requests,
        (SELECT COUNT(*) FROM logs WHERE DATE(timestamp) = DATE('now')) as today_activities
    ` : null,
    
    // 6. 個人統計
    personalStats: `
      SELECT 
        (SELECT COUNT(*) FROM incidents WHERE assigned_to = ?) as assigned_incidents,
        (SELECT COUNT(*) FROM incidents WHERE created_by = ?) as created_incidents,
        (SELECT COUNT(*) FROM assets WHERE owner = ?) as owned_assets,
        (SELECT COUNT(*) FROM service_requests WHERE requested_by = ?) as my_requests,
        (SELECT COUNT(*) FROM logs WHERE user_id = ? AND DATE(timestamp) = DATE('now')) as today_my_activities
    `,
    
    // 7. アラート・通知
    alerts: `
      SELECT 
        'Incident' as type, 
        'incident_' || incident_id as reference_id,
        title as message,
        priority as severity,
        created_at as timestamp
      FROM incidents 
      WHERE assigned_to = ? AND priority IN ('High', 'Critical') AND status = 'Open'
      UNION ALL
      SELECT 
        'Asset' as type,
        'asset_' || asset_id as reference_id,
        name || ' - ' || status as message,
        CASE WHEN status = 'Maintenance' THEN 'Medium' ELSE 'Low' END as severity,
        updated_at as timestamp
      FROM assets 
      WHERE (owner = ? OR assigned_to = ?) AND status IN ('Maintenance', 'Retired')
      ORDER BY timestamp DESC LIMIT 5
    `,
    
    // 8. 月間サマリー
    monthlySummary: `
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as activity_count,
        COUNT(CASE WHEN event_type = 'Authentication' THEN 1 END) as logins,
        COUNT(CASE WHEN action IN ('Create', 'Update', 'Delete') THEN 1 END) as modifications
      FROM logs 
      WHERE user_id = ? AND timestamp >= datetime('now', '-30 days')
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `
  };

  // Promise化されたクエリ実行
  const executeQuery = (query, params) => {
    return new Promise((resolve, reject) => {
      if (!query) {
        resolve(null);
        return;
      }
      
      db.all(query, params, (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  };

  // 全クエリを並列実行
  Promise.all([
    executeQuery(queries.userInfo, [userId, userId]),
    executeQuery(queries.recentActivity, [userId]),
    executeQuery(queries.activeIncidents, [userId]),
    executeQuery(queries.managedAssets, [userId, userId]),
    executeQuery(queries.systemStats, []),
    executeQuery(queries.personalStats, [userId, userId, userId, userId, userId]),
    executeQuery(queries.alerts, [userId, userId, userId]),
    executeQuery(queries.monthlySummary, [userId])
  ])
  .then(([
    userInfoResult,
    recentActivityResult,
    activeIncidentsResult,
    managedAssetsResult,
    systemStatsResult,
    personalStatsResult,
    alertsResult,
    monthlySummaryResult
  ]) => {
    
    // APIアクセスを監査ログに記録
    const logData = {
      event_type: 'Data Access',
      event_subtype: 'Dashboard Data',
      user_id: userId,
      username: req.user.username,
      action: 'Read',
      details: 'Dashboard data retrieved successfully'
    };
    
    db.run(`
      INSERT INTO logs (event_type, event_subtype, user_id, username, action, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `, Object.values(logData));

    // レスポンス構築
    const dashboardData = {
      timestamp: new Date().toISOString(),
      user: userInfoResult?.[0] || null,
      
      personal_stats: personalStatsResult?.[0] || {
        assigned_incidents: 0,
        created_incidents: 0,
        owned_assets: 0,
        my_requests: 0,
        today_my_activities: 0
      },
      
      recent_activity: recentActivityResult?.map(activity => ({
        ...activity,
        details: activity.details ? activity.details.substring(0, 100) : null // 詳細を制限
      })) || [],
      
      active_incidents: activeIncidentsResult || [],
      managed_assets: managedAssetsResult || [],
      alerts: alertsResult || [],
      
      monthly_summary: monthlySummaryResult || [],
      
      // システム統計は権限がある場合のみ
      system_stats: systemStatsResult?.[0] || null,
      
      // メタ情報
      meta: {
        user_role: userRole,
        has_system_access: ['administrator', 'operator'].includes(userRole),
        data_freshness: 'real-time',
        query_time: Date.now()
      }
    };

    res.json(dashboardData);
  })
  .catch(err => {
    console.error('Dashboard API error:', err);
    res.status(500).json({ 
      error: 'ダッシュボードデータの取得に失敗しました',
      timestamp: new Date().toISOString()
    });
  });
};

/**
 * ユーザーアクティビティ履歴取得
 */
const getUserActivity = (req, res) => {
  const userId = req.user?.user_id;
  const { page = 1, limit = 20, days = 30 } = req.query;
  const offset = (page - 1) * Math.min(limit, 100);
  
  if (!userId) {
    return res.status(401).json({ error: '認証が必要です' });
  }

  // アクティビティ詳細取得
  const query = `
    SELECT 
      log_id, timestamp, event_type, event_subtype, action, 
      target_table, target_record_id, details, ip_address
    FROM logs 
    WHERE user_id = ? AND timestamp >= datetime('now', '-${days} days')
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `;
  
  // 総数カウント
  const countQuery = `
    SELECT COUNT(*) as total
    FROM logs 
    WHERE user_id = ? AND timestamp >= datetime('now', '-${days} days')
  `;

  db.get(countQuery, [userId], (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: 'データベースエラー' });
    }

    db.all(query, [userId, Math.min(limit, 100), offset], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'データベースエラー' });
      }

      res.json({
        activities: rows,
        pagination: {
          page: parseInt(page),
          limit: Math.min(limit, 100),
          total: countResult.total,
          total_pages: Math.ceil(countResult.total / Math.min(limit, 100))
        },
        period_days: days
      });
    });
  });
};

/**
 * クイック統計データ取得
 */
const getQuickStats = (req, res) => {
  const userId = req.user?.user_id;
  const userRole = req.user?.role;
  
  if (!userId) {
    return res.status(401).json({ error: '認証が必要です' });
  }

  // 基本統計クエリ
  const baseQuery = `
    SELECT 
      (SELECT COUNT(*) FROM incidents WHERE assigned_to = ?) as my_incidents,
      (SELECT COUNT(*) FROM assets WHERE owner = ?) as my_assets,
      (SELECT COUNT(*) FROM service_requests WHERE requested_by = ?) as my_requests,
      (SELECT COUNT(*) FROM logs WHERE user_id = ? AND DATE(timestamp) = DATE('now')) as today_activities
  `;

  // 管理者用追加統計
  const adminQuery = userRole === 'administrator' ? `
    SELECT 
      (SELECT COUNT(*) FROM users WHERE status = 'Active') as total_users,
      (SELECT COUNT(*) FROM incidents WHERE status NOT IN ('Resolved', 'Closed')) as open_incidents,
      (SELECT COUNT(*) FROM assets WHERE status = 'Active') as active_assets,
      (SELECT COUNT(*) FROM logs WHERE DATE(timestamp) = DATE('now')) as system_activities_today
  ` : null;

  const executeQuickQuery = (query, params) => {
    return new Promise((resolve, reject) => {
      if (!query) resolve(null);
      else {
        db.get(query, params, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      }
    });
  };

  Promise.all([
    executeQuickQuery(baseQuery, [userId, userId, userId, userId]),
    executeQuickQuery(adminQuery, [])
  ])
  .then(([personalStats, systemStats]) => {
    res.json({
      personal: personalStats,
      system: systemStats,
      timestamp: new Date().toISOString(),
      user_role: userRole
    });
  })
  .catch(err => {
    console.error('Quick stats error:', err);
    res.status(500).json({ error: '統計データの取得に失敗しました' });
  });
};

module.exports = {
  getDashboardData,
  getUserActivity,
  getQuickStats
};