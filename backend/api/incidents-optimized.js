/**
 * インシデント管理API実装 - パフォーマンス最適化版
 * 接続プール + インデックス + キャッシュ対応
 */
const { pool } = require('../services/database');
const { recordDatabaseQuery } = require('../middleware/metrics');

// メモリキャッシュ（簡単な実装）
const cache = new Map();
const CACHE_TTL = 30000; // 30秒

function getCacheKey(req) {
  const { page, limit, status, priority, search } = req.query;
  return `incidents_${page || 1}_${limit || 20}_${status || ''}_${priority || ''}_${search || ''}`;
}

function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

function getCache(key) {
  const cached = cache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

/**
 * インシデント一覧取得（最適化版）
 */
async function getIncidents(req, res) {
  const startTime = Date.now();
  
  try {
    // キャッシュチェック
    const cacheKey = getCacheKey(req);
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({
        ...cached,
        cached: true,
        responseTime: `${Date.now() - startTime}ms`
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    
    // フィルター条件
    const { status, priority, search } = req.query;
    
    let whereConditions = [];
    let params = [];
    
    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
    }
    
    if (priority) {
      whereConditions.push('priority = ?');
      params.push(priority);
    }
    
    if (search) {
      whereConditions.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    
    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 並列クエリ実行（データ取得 + 件数取得）
    const [incidents, countResult] = await Promise.all([
      pool.query(`
        SELECT id, title, description, status, priority, assignee, 
               reported_date, resolved_date, created_date, updated_date
        FROM incidents 
        ${whereClause}
        ORDER BY 
          CASE status 
            WHEN 'Open' THEN 1 
            WHEN 'In Progress' THEN 2 
            WHEN 'Resolved' THEN 3 
            WHEN 'Closed' THEN 4 
            ELSE 5 
          END,
          CASE priority 
            WHEN 'Critical' THEN 1 
            WHEN 'High' THEN 2 
            WHEN 'Medium' THEN 3 
            WHEN 'Low' THEN 4 
            ELSE 5 
          END,
          created_date DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]),
      
      pool.query(`
        SELECT COUNT(*) as total 
        FROM incidents 
        ${whereClause}
      `, params)
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const response = {
      success: true,
      data: incidents,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: { status, priority, search },
      responseTime: `${Date.now() - startTime}ms`,
      cached: false
    };

    // キャッシュに保存
    setCache(cacheKey, response);
    
    recordDatabaseQuery(true);
    res.json(response);

  } catch (error) {
    console.error('インシデント一覧取得エラー:', error);
    recordDatabaseQuery(false);
    
    res.status(500).json({
      success: false,
      error: 'インシデント一覧の取得に失敗しました',
      message: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
}

/**
 * インシデント統計取得（最適化版）
 */
async function getIncidentStats(req, res) {
  const startTime = Date.now();
  
  try {
    // キャッシュチェック
    const cacheKey = 'incident_stats';
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({
        ...cached,
        cached: true,
        responseTime: `${Date.now() - startTime}ms`
      });
    }

    // 統計データを並列取得
    const [statusStats, priorityStats, dailyStats, recentStats] = await Promise.all([
      // ステータス別統計
      pool.query(`
        SELECT status, COUNT(*) as count 
        FROM incidents 
        GROUP BY status
      `),
      
      // 優先度別統計
      pool.query(`
        SELECT priority, COUNT(*) as count 
        FROM incidents 
        GROUP BY priority
      `),
      
      // 日別統計（過去30日）
      pool.query(`
        SELECT 
          DATE(created_date) as date,
          COUNT(*) as count
        FROM incidents 
        WHERE created_date >= datetime('now', '-30 days')
        GROUP BY DATE(created_date)
        ORDER BY date DESC
      `),
      
      // 最近のインシデント
      pool.query(`
        SELECT id, title, status, priority, created_date
        FROM incidents 
        ORDER BY created_date DESC 
        LIMIT 5
      `)
    ]);

    // 統計データの整形
    const byStatus = {};
    statusStats.forEach(row => {
      byStatus[row.status] = row.count;
    });

    const byPriority = {};
    priorityStats.forEach(row => {
      byPriority[row.priority] = row.count;
    });

    const response = {
      success: true,
      data: {
        total: statusStats.reduce((sum, row) => sum + row.count, 0),
        by_status: byStatus,
        by_priority: byPriority,
        daily_incidents: dailyStats,
        recent_incidents: recentStats
      },
      responseTime: `${Date.now() - startTime}ms`,
      cached: false
    };

    // キャッシュに保存
    setCache(cacheKey, response);
    
    recordDatabaseQuery(true);
    res.json(response);

  } catch (error) {
    console.error('インシデント統計取得エラー:', error);
    recordDatabaseQuery(false);
    
    res.status(500).json({
      success: false,
      error: 'インシデント統計の取得に失敗しました',
      message: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
}

/**
 * インシデント詳細取得（最適化版）
 */
async function getIncidentById(req, res) {
  const startTime = Date.now();
  const { id } = req.params;
  
  try {
    // キャッシュチェック
    const cacheKey = `incident_${id}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({
        ...cached,
        cached: true,
        responseTime: `${Date.now() - startTime}ms`
      });
    }

    const incidents = await pool.query(
      'SELECT * FROM incidents WHERE id = ?',
      [id]
    );

    if (incidents.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'インシデントが見つかりません',
        responseTime: `${Date.now() - startTime}ms`
      });
    }

    const response = {
      success: true,
      data: incidents[0],
      responseTime: `${Date.now() - startTime}ms`,
      cached: false
    };

    // キャッシュに保存
    setCache(cacheKey, response);
    
    recordDatabaseQuery(true);
    res.json(response);

  } catch (error) {
    console.error('インシデント詳細取得エラー:', error);
    recordDatabaseQuery(false);
    
    res.status(500).json({
      success: false,
      error: 'インシデント詳細の取得に失敗しました',
      message: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
}

/**
 * インシデント作成（最適化版）
 */
async function createIncident(req, res) {
  const startTime = Date.now();
  
  try {
    const { title, description, status = 'Open', priority = 'Medium', assignee } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'タイトルと説明は必須です',
        responseTime: `${Date.now() - startTime}ms`
      });
    }

    const result = await pool.query(`
      INSERT INTO incidents (title, description, status, priority, assignee, reported_date, created_date, updated_date)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
    `, [title, description, status, priority, assignee]);

    // キャッシュクリア
    cache.clear();

    recordDatabaseQuery(true);
    res.status(201).json({
      success: true,
      data: {
        id: result.lastID,
        title,
        description,
        status,
        priority,
        assignee
      },
      message: 'インシデントが正常に作成されました',
      responseTime: `${Date.now() - startTime}ms`
    });

  } catch (error) {
    console.error('インシデント作成エラー:', error);
    recordDatabaseQuery(false);
    
    res.status(500).json({
      success: false,
      error: 'インシデントの作成に失敗しました',
      message: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
}

/**
 * インシデント更新（最適化版）
 */
async function updateIncident(req, res) {
  const startTime = Date.now();
  const { id } = req.params;
  
  try {
    const updates = req.body;
    const allowedFields = ['title', 'description', 'status', 'priority', 'assignee'];
    const updateFields = [];
    const params = [];

    // 許可されたフィールドのみ更新
    Object.keys(updates).forEach(field => {
      if (allowedFields.includes(field) && updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(updates[field]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: '更新可能なフィールドがありません',
        responseTime: `${Date.now() - startTime}ms`
      });
    }

    updateFields.push('updated_date = datetime(\'now\')');
    params.push(id);

    const result = await pool.query(`
      UPDATE incidents 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, params);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'インシデントが見つかりません',
        responseTime: `${Date.now() - startTime}ms`
      });
    }

    // キャッシュクリア
    cache.delete(`incident_${id}`);
    cache.delete('incident_stats');

    recordDatabaseQuery(true);
    res.json({
      success: true,
      data: { id, ...updates },
      message: 'インシデントが正常に更新されました',
      responseTime: `${Date.now() - startTime}ms`
    });

  } catch (error) {
    console.error('インシデント更新エラー:', error);
    recordDatabaseQuery(false);
    
    res.status(500).json({
      success: false,
      error: 'インシデントの更新に失敗しました',
      message: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
}

/**
 * インシデント削除（最適化版）
 */
async function deleteIncident(req, res) {
  const startTime = Date.now();
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM incidents WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'インシデントが見つかりません',
        responseTime: `${Date.now() - startTime}ms`
      });
    }

    // キャッシュクリア
    cache.delete(`incident_${id}`);
    cache.delete('incident_stats');

    recordDatabaseQuery(true);
    res.json({
      success: true,
      message: 'インシデントが正常に削除されました',
      responseTime: `${Date.now() - startTime}ms`
    });

  } catch (error) {
    console.error('インシデント削除エラー:', error);
    recordDatabaseQuery(false);
    
    res.status(500).json({
      success: false,
      error: 'インシデントの削除に失敗しました',
      message: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
}

module.exports = {
  getIncidents,
  getIncidentStats,
  getIncidentById,
  createIncident,
  updateIncident,
  deleteIncident
};