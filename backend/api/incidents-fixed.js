/**
 * インシデント管理API実装 - 修正版
 * データベース接続エラー修正、簡素化版
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'itsm.sqlite');

// データベース接続取得（エラーハンドリング強化）
function getDbConnection() {
  return new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error('データベース接続エラー:', err.message);
      throw new Error(`データベース接続に失敗しました: ${err.message}`);
    }
  });
}

/**
 * インシデント一覧取得（修正版）
 */
function getIncidents(req, res) {
  let db;
  
  try {
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
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    db = getDbConnection();
    
    // 総件数取得
    const countQuery = `SELECT COUNT(*) as total FROM incidents ${whereClause}`;
    
    db.get(countQuery, params, (err, countResult) => {
      if (err) {
        console.error('Count query error:', err);
        db.close();
        return res.status(500).json({ 
          error: 'データベースエラーが発生しました',
          details: err.message
        });
      }
      
      const total = countResult?.total || 0;
      const totalPages = Math.ceil(total / limit);
      
      // データ取得（基本フィールドのみ）
      const dataQuery = `
        SELECT 
          incident_id as id,
          title,
          description,
          status,
          priority,
          assignee,
          reported_date,
          resolved_date,
          created_date,
          updated_date
        FROM incidents 
        ${whereClause}
        ORDER BY created_date DESC 
        LIMIT ? OFFSET ?
      `;
      
      db.all(dataQuery, [...params, limit, offset], (err, rows) => {
        db.close();
        
        if (err) {
          console.error('Data query error:', err);
          return res.status(500).json({ 
            error: 'データベースエラーが発生しました',
            details: err.message
          });
        }
        
        // 成功レスポンス
        res.json({
          success: true,
          data: rows || [],
          pagination: {
            page,
            limit,
            total,
            totalPages
          },
          filters: { status, priority, search }
        });
      });
    });
    
  } catch (error) {
    console.error('getIncidents error:', error);
    if (db) db.close();
    res.status(500).json({ 
      error: 'システムエラーが発生しました',
      details: error.message
    });
  }
}

/**
 * インシデント統計取得（修正版）
 */
function getIncidentStats(req, res) {
  let db;
  
  try {
    db = getDbConnection();
    
    const queries = [
      'SELECT COUNT(*) as total FROM incidents',
      'SELECT status, COUNT(*) as count FROM incidents GROUP BY status',
      'SELECT priority, COUNT(*) as count FROM incidents GROUP BY priority'
    ];
    
    Promise.all(queries.map(query => {
      return new Promise((resolve, reject) => {
        db.all(query, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }))
    .then(([totalResult, statusResult, priorityResult]) => {
      db.close();
      
      res.json({
        success: true,
        data: {
          total: totalResult[0]?.total || 0,
          by_status: statusResult.reduce((acc, row) => {
            acc[row.status] = row.count;
            return acc;
          }, {}),
          by_priority: priorityResult.reduce((acc, row) => {
            acc[row.priority] = row.count;
            return acc;
          }, {})
        }
      });
    })
    .catch(err => {
      console.error('getIncidentStats error:', err);
      if (db) db.close();
      res.status(500).json({ 
        error: 'データベースエラーが発生しました',
        details: err.message
      });
    });
    
  } catch (error) {
    console.error('getIncidentStats error:', error);
    if (db) db.close();
    res.status(500).json({ 
      error: 'システムエラーが発生しました',
      details: error.message
    });
  }
}

/**
 * インシデント詳細取得（修正版）
 */
function getIncidentById(req, res) {
  let db;
  
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: '有効なインシデントIDを指定してください' 
      });
    }
    
    db = getDbConnection();
    
    const query = `
      SELECT 
        incident_id as id,
        title,
        description,
        status,
        priority,
        assignee,
        reported_date,
        resolved_date,
        created_date,
        updated_date
      FROM incidents 
      WHERE incident_id = ?
    `;
    
    db.get(query, [id], (err, row) => {
      db.close();
      
      if (err) {
        console.error('getIncidentById error:', err);
        return res.status(500).json({ 
          error: 'データベースエラーが発生しました',
          details: err.message
        });
      }
      
      if (!row) {
        return res.status(404).json({ 
          error: 'インシデントが見つかりません' 
        });
      }
      
      res.json({
        success: true,
        data: row
      });
    });
    
  } catch (error) {
    console.error('getIncidentById error:', error);
    if (db) db.close();
    res.status(500).json({ 
      error: 'システムエラーが発生しました',
      details: error.message
    });
  }
}

/**
 * インシデント作成（修正版）
 */
function createIncident(req, res) {
  let db;
  
  try {
    const { title, description, priority = 'Medium', assignee, status = 'Open' } = req.body;
    
    // 基本バリデーション
    if (!title || !description) {
      return res.status(400).json({ 
        error: 'タイトルと説明は必須です' 
      });
    }
    
    db = getDbConnection();
    
    const query = `
      INSERT INTO incidents (
        title, description, status, priority, assignee,
        reported_date, created_date, updated_date
      )
      VALUES (?, ?, ?, ?, ?, date('now'), datetime('now'), datetime('now'))
    `;
    
    db.run(query, [title, description, status, priority, assignee], function(err) {
      if (err) {
        console.error('createIncident error:', err);
        db.close();
        return res.status(500).json({ 
          error: 'データベースエラーが発生しました',
          details: err.message
        });
      }
      
      // 作成されたインシデントを取得
      db.get('SELECT * FROM incidents WHERE incident_id = ?', [this.lastID], (err, row) => {
        db.close();
        
        if (err) {
          console.error('Created incident fetch error:', err);
          return res.status(500).json({ 
            error: 'インシデントは作成されましたが、取得に失敗しました' 
          });
        }
        
        res.status(201).json({
          success: true,
          message: 'インシデントが正常に作成されました',
          data: row
        });
      });
    });
    
  } catch (error) {
    console.error('createIncident error:', error);
    if (db) db.close();
    res.status(500).json({ 
      error: 'システムエラーが発生しました',
      details: error.message
    });
  }
}

/**
 * インシデント更新（修正版）
 */
function updateIncident(req, res) {
  let db;
  
  try {
    const { id } = req.params;
    const { title, description, status, priority, assignee } = req.body;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: '有効なインシデントIDを指定してください' 
      });
    }
    
    db = getDbConnection();
    
    // 既存インシデント確認
    db.get('SELECT * FROM incidents WHERE incident_id = ?', [id], (err, existingIncident) => {
      if (err) {
        console.error('Existing incident check error:', err);
        db.close();
        return res.status(500).json({ 
          error: 'データベースエラーが発生しました' 
        });
      }
      
      if (!existingIncident) {
        db.close();
        return res.status(404).json({ 
          error: 'インシデントが見つかりません' 
        });
      }
      
      // 更新データの準備
      const updateData = {
        title: title || existingIncident.title,
        description: description || existingIncident.description,
        status: status || existingIncident.status,
        priority: priority || existingIncident.priority,
        assignee: assignee || existingIncident.assignee
      };
      
      const query = `
        UPDATE incidents 
        SET title = ?, description = ?, status = ?, priority = ?, assignee = ?, 
            updated_date = datetime('now')
        WHERE incident_id = ?
      `;
      
      db.run(query, [
        updateData.title,
        updateData.description,
        updateData.status,
        updateData.priority,
        updateData.assignee,
        id
      ], function(err) {
        if (err) {
          console.error('updateIncident error:', err);
          db.close();
          return res.status(500).json({ 
            error: 'データベースエラーが発生しました',
            details: err.message
          });
        }
        
        // 更新後のデータを取得
        db.get('SELECT * FROM incidents WHERE incident_id = ?', [id], (err, row) => {
          db.close();
          
          if (err) {
            console.error('Updated incident fetch error:', err);
            return res.status(500).json({ 
              error: 'インシデントは更新されましたが、取得に失敗しました' 
            });
          }
          
          res.json({
            success: true,
            message: 'インシデントが正常に更新されました',
            data: row
          });
        });
      });
    });
    
  } catch (error) {
    console.error('updateIncident error:', error);
    if (db) db.close();
    res.status(500).json({ 
      error: 'システムエラーが発生しました',
      details: error.message
    });
  }
}

/**
 * インシデント削除（修正版）
 */
function deleteIncident(req, res) {
  let db;
  
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: '有効なインシデントIDを指定してください' 
      });
    }
    
    db = getDbConnection();
    
    db.run('DELETE FROM incidents WHERE incident_id = ?', [id], function(err) {
      db.close();
      
      if (err) {
        console.error('deleteIncident error:', err);
        return res.status(500).json({ 
          error: 'データベースエラーが発生しました',
          details: err.message
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ 
          error: 'インシデントが見つかりません' 
        });
      }
      
      res.json({
        success: true,
        message: 'インシデントが正常に削除されました'
      });
    });
    
  } catch (error) {
    console.error('deleteIncident error:', error);
    if (db) db.close();
    res.status(500).json({ 
      error: 'システムエラーが発生しました',
      details: error.message
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