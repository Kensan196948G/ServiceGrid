const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// データベース接続
const dbPath = path.join(__dirname, '..', 'db', 'itsm.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Service Requests DB connection error:', err);
  } else {
    console.log('Service Requests API connected to database:', dbPath);
  }
});

/**
 * サービスリクエスト一覧取得（シンプル版）
 */
const getServiceRequests = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  
  // フィルタリング条件
  const { status, search } = req.query;
  
  let whereConditions = [];
  let queryParams = [];
  
  if (status) {
    whereConditions.push('status = ?');
    queryParams.push(status);
  }
  
  if (search) {
    whereConditions.push('(subject LIKE ? OR detail LIKE ?)');
    queryParams.push(`%${search}%`, `%${search}%`);
  }
  
  const whereClause = whereConditions.length > 0 
    ? 'WHERE ' + whereConditions.join(' AND ') 
    : '';
  
  // カウントクエリ
  const countQuery = `SELECT COUNT(*) as total FROM service_requests ${whereClause}`;
  
  db.get(countQuery, queryParams, (err, countResult) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);
    
    // データ取得クエリ
    const dataQuery = `
      SELECT * FROM service_requests 
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
        filters: { status, search }
      });
    });
  });
};

/**
 * サービスリクエスト統計取得（シンプル版）
 */
const getServiceRequestStats = (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total FROM service_requests',
    'SELECT status, COUNT(*) as count FROM service_requests GROUP BY status ORDER BY count DESC',
    'SELECT DATE(created_date) as date, COUNT(*) as count FROM service_requests WHERE created_date >= date("now", "-30 days") GROUP BY DATE(created_date) ORDER BY date'
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
      daily_requests: dailyResult
    });
  })
  .catch(err => {
    console.error('Database error:', err);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  });
};

/**
 * サービスリクエスト詳細取得（シンプル版）
 */
const getServiceRequestById = (req, res) => {
  const { id } = req.params;
  
  const query = 'SELECT * FROM service_requests WHERE request_id = ?';
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'サービスリクエストが見つかりません' });
    }
    
    res.json(row);
  });
};

/**
 * サービスリクエスト作成（シンプル版）
 */
const createServiceRequest = (req, res) => {
  const {
    subject,
    detail,
    status = 'Submitted',
    applicant
  } = req.body;
  
  // 入力検証
  if (!subject || !detail || !applicant) {
    return res.status(400).json({ 
      error: '件名、詳細、申請者は必須項目です'
    });
  }
  
  const query = `
    INSERT INTO service_requests (
      subject, detail, status, applicant, requested_date, created_date, updated_date
    )
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
  `;
  
  db.run(query, [subject, detail, status, applicant], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    // 作成されたサービスリクエストを返す
    db.get('SELECT * FROM service_requests WHERE request_id = ?', [this.lastID], (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      res.status(201).json({
        success: true,
        message: 'サービスリクエストが正常に作成されました',
        data: row
      });
    });
  });
};

/**
 * サービスリクエスト更新（シンプル版）
 */
const updateServiceRequest = (req, res) => {
  const { id } = req.params;
  const { subject, detail, status, approved_by } = req.body;
  
  // 既存データの確認
  db.get('SELECT * FROM service_requests WHERE request_id = ?', [id], (err, existingRequest) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    if (!existingRequest) {
      return res.status(404).json({ error: 'サービスリクエストが見つかりません' });
    }
    
    // 更新するフィールドを決定
    const updatedData = {
      subject: subject || existingRequest.subject,
      detail: detail || existingRequest.detail,
      status: status || existingRequest.status,
      approved_by: approved_by || existingRequest.approved_by
    };
    
    // 承認日の設定
    let approved_date = existingRequest.approved_date;
    if (status === 'Approved' && !approved_date) {
      approved_date = new Date().toISOString().split('T')[0];
    }
    
    const query = `
      UPDATE service_requests 
      SET subject = ?, detail = ?, status = ?, approved_by = ?, approved_date = ?, updated_date = datetime('now')
      WHERE request_id = ?
    `;
    
    db.run(query, [
      updatedData.subject,
      updatedData.detail,
      updatedData.status,
      updatedData.approved_by,
      approved_date,
      id
    ], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      // 更新後のデータを返す
      db.get('SELECT * FROM service_requests WHERE request_id = ?', [id], (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'データベースエラーが発生しました' });
        }
        
        res.json({
          success: true,
          message: 'サービスリクエストが正常に更新されました',
          data: row
        });
      });
    });
  });
};

/**
 * サービスリクエスト承認/却下（シンプル版）
 */
const approveServiceRequest = (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // action: 'approve' or 'reject'
  
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'actionは "approve" または "reject" である必要があります' });
  }
  
  const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
  const approved_by = req.user?.username || 'system';
  const approved_date = new Date().toISOString().split('T')[0];
  
  const query = `
    UPDATE service_requests 
    SET status = ?, approved_by = ?, approved_date = ?, updated_date = datetime('now')
    WHERE request_id = ?
  `;
  
  db.run(query, [newStatus, approved_by, approved_date, id], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    res.json({
      success: true,
      message: `サービスリクエストが正常に${action === 'approve' ? '承認' : '却下'}されました`
    });
  });
};

/**
 * サービスリクエスト完了処理（シンプル版）
 */
const fulfillServiceRequest = (req, res) => {
  const { id } = req.params;
  
  const query = `
    UPDATE service_requests 
    SET status = 'Fulfilled', updated_date = datetime('now')
    WHERE request_id = ?
  `;
  
  db.run(query, [id], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    res.json({
      success: true,
      message: 'サービスリクエストが正常に完了されました'
    });
  });
};

/**
 * ワークフロー遷移（シンプル版）
 */
const transitionServiceRequest = (req, res) => {
  const { id } = req.params;
  const { new_status } = req.body;
  
  const query = `
    UPDATE service_requests 
    SET status = ?, updated_date = datetime('now')
    WHERE request_id = ?
  `;
  
  db.run(query, [new_status, id], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    res.json({
      success: true,
      message: `ステータスが ${new_status} に変更されました`
    });
  });
};

/**
 * サービスリクエスト削除（シンプル版）
 */
const deleteServiceRequest = (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM service_requests WHERE request_id = ?', [id], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    res.json({ 
      success: true, 
      message: 'サービスリクエストが正常に削除されました'
    });
  });
};

module.exports = {
  getServiceRequests,
  getServiceRequestStats,
  getServiceRequestById,
  createServiceRequest,
  updateServiceRequest,
  approveServiceRequest,
  fulfillServiceRequest,
  transitionServiceRequest,
  deleteServiceRequest
};