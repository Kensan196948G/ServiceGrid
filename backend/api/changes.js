const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// データベース接続
const dbPath = path.join(__dirname, '..', process.env.DB_PATH || 'db/itsm.sqlite');
const db = new sqlite3.Database(dbPath);

/**
 * 変更管理一覧取得
 */
const getChanges = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  
  // フィルタリング条件
  const { status, requested_by, search } = req.query;
  
  let whereConditions = [];
  let queryParams = [];
  
  if (status) {
    whereConditions.push('status = ?');
    queryParams.push(status);
  }
  
  if (requested_by) {
    whereConditions.push('requested_by = ?');
    queryParams.push(requested_by);
  }
  
  if (search) {
    whereConditions.push('(subject LIKE ? OR detail LIKE ?)');
    queryParams.push(`%${search}%`, `%${search}%`);
  }
  
  const whereClause = whereConditions.length > 0 
    ? 'WHERE ' + whereConditions.join(' AND ') 
    : '';
  
  // カウントクエリ
  const countQuery = `SELECT COUNT(*) as total FROM changes ${whereClause}`;
  
  db.get(countQuery, queryParams, (err, countResult) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);
    
    // データ取得クエリ
    const dataQuery = `
      SELECT change_id, subject, detail, status, requested_by, approved_by,
             request_date, approve_date, created_date, updated_date
      FROM changes 
      ${whereClause} 
      ORDER BY created_date DESC 
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
        filters: { status, requested_by, search }
      });
    });
  });
};

/**
 * 変更管理統計取得
 */
const getChangeStats = (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total FROM changes',
    'SELECT status, COUNT(*) as count FROM changes GROUP BY status',
    'SELECT DATE(created_date) as date, COUNT(*) as count FROM changes WHERE created_date >= date("now", "-30 days") GROUP BY DATE(created_date) ORDER BY date'
  ];
  
  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }))
  .then(([totalResult, statusResult, dailyResult]) => {
    res.json({
      total: totalResult[0].total,
      by_status: statusResult.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {}),
      daily_changes: dailyResult
    });
  })
  .catch(err => {
    console.error('Database error:', err);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  });
};

/**
 * 変更管理詳細取得
 */
const getChangeById = (req, res) => {
  const { id } = req.params;
  
  db.get(
    'SELECT * FROM changes WHERE change_id = ?',
    [id],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!row) {
        return res.status(404).json({ error: '変更要求が見つかりません' });
      }
      
      res.json(row);
    }
  );
};

/**
 * 変更管理作成
 */
const createChange = (req, res) => {
  const {
    subject,
    detail,
    requested_by,
    status = 'Pending',
    request_date = new Date().toISOString().split('T')[0]
  } = req.body;
  
  // 入力検証
  if (!subject || !detail || !requested_by) {
    return res.status(400).json({ 
      error: '件名、詳細、要求者は必須項目です',
      details: {
        subject: !subject ? '件名が必要です' : null,
        detail: !detail ? '詳細が必要です' : null,
        requested_by: !requested_by ? '要求者が必要です' : null
      }
    });
  }
  
  if (subject.length > 200) {
    return res.status(400).json({ error: '件名は200文字以内で入力してください' });
  }
  
  if (detail.length > 2000) {
    return res.status(400).json({ error: '詳細は2000文字以内で入力してください' });
  }
  
  const query = `
    INSERT INTO changes (subject, detail, status, requested_by, request_date, created_date, updated_date)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `;
  
  db.run(query, [subject, detail, status, requested_by, request_date], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    // 監査ログ
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO logs (event_type, event_time, user, detail) VALUES (?, ?, ?, ?)',
      ['CHANGE_CREATE', now, req.user?.username || 'system', `Created change request: ${subject}`]
    );
    
    // 作成された変更要求を返す
    db.get(
      'SELECT * FROM changes WHERE change_id = ?',
      [this.lastID],
      (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'データベースエラーが発生しました' });
        }
        
        res.status(201).json(row);
      }
    );
  });
};

/**
 * 変更管理更新
 */
const updateChange = (req, res) => {
  const { id } = req.params;
  const {
    subject,
    detail,
    status,
    requested_by,
    approved_by,
    approve_date
  } = req.body;
  
  // 既存データの確認
  db.get(
    'SELECT * FROM changes WHERE change_id = ?',
    [id],
    (err, existingChange) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!existingChange) {
        return res.status(404).json({ error: '変更要求が見つかりません' });
      }
      
      // 更新するフィールドを決定
      const updatedData = {
        subject: subject || existingChange.subject,
        detail: detail || existingChange.detail,
        status: status || existingChange.status,
        requested_by: requested_by || existingChange.requested_by,
        approved_by: approved_by || existingChange.approved_by,
        approve_date: approve_date || existingChange.approve_date,
        updated_date: new Date().toISOString()
      };
      
      // 承認処理の場合
      if (status === 'Approved' && !existingChange.approve_date) {
        updatedData.approved_by = req.user?.username || approved_by;
        updatedData.approve_date = new Date().toISOString().split('T')[0];
      }
      
      const query = `
        UPDATE changes 
        SET subject = ?, detail = ?, status = ?, requested_by = ?, 
            approved_by = ?, approve_date = ?, updated_date = ?
        WHERE change_id = ?
      `;
      
      db.run(query, [
        updatedData.subject,
        updatedData.detail,
        updatedData.status,
        updatedData.requested_by,
        updatedData.approved_by,
        updatedData.approve_date,
        updatedData.updated_date,
        id
      ], function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'データベースエラーが発生しました' });
        }
        
        // 監査ログ
        const now = new Date().toISOString();
        db.run(
          'INSERT INTO logs (event_type, event_time, user, detail) VALUES (?, ?, ?, ?)',
          ['CHANGE_UPDATE', now, req.user?.username || 'system', `Updated change request ID: ${id}`]
        );
        
        // 更新後のデータを返す
        db.get(
          'SELECT * FROM changes WHERE change_id = ?',
          [id],
          (err, row) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'データベースエラーが発生しました' });
            }
            
            res.json(row);
          }
        );
      });
    }
  );
};

/**
 * 変更管理削除
 */
const deleteChange = (req, res) => {
  const { id } = req.params;
  
  // 権限チェック（管理者のみ削除可能）
  if (req.user && req.user.role !== 'administrator') {
    return res.status(403).json({ 
      error: '変更要求を削除する権限がありません',
      required_role: 'administrator',
      current_role: req.user.role
    });
  }
  
  // 存在確認
  db.get(
    'SELECT subject FROM changes WHERE change_id = ?',
    [id],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!row) {
        return res.status(404).json({ error: '変更要求が見つかりません' });
      }
      
      // 削除実行
      db.run(
        'DELETE FROM changes WHERE change_id = ?',
        [id],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'データベースエラーが発生しました' });
          }
          
          // 監査ログ
          const now = new Date().toISOString();
          db.run(
            'INSERT INTO logs (event_type, event_time, user, detail) VALUES (?, ?, ?, ?)',
            ['CHANGE_DELETE', now, req.user?.username || 'system', `Deleted change request: ${row.subject}`]
          );
          
          res.json({ 
            success: true, 
            message: '変更要求が正常に削除されました',
            deleted_id: id
          });
        }
      );
    }
  );
};

module.exports = {
  getChanges,
  getChangeStats,
  getChangeById,
  createChange,
  updateChange,
  deleteChange
};