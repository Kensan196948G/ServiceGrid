const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// データベース接続
const dbPath = path.join(__dirname, '..', process.env.DB_PATH || 'db/itsm.sqlite');
const db = new sqlite3.Database(dbPath);

/**
 * サービスリクエスト一覧取得
 */
const getServiceRequests = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  
  // フィルタリング条件
  const { status, applicant, search } = req.query;
  
  let whereConditions = [];
  let queryParams = [];
  
  if (status) {
    whereConditions.push('status = ?');
    queryParams.push(status);
  }
  
  if (applicant) {
    whereConditions.push('applicant = ?');
    queryParams.push(applicant);
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
      SELECT request_id, subject, detail, status, applicant, 
             requested_date, approved_by, approved_date,
             created_date, updated_date
      FROM service_requests 
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
        filters: { status, applicant, search }
      });
    });
  });
};

/**
 * サービスリクエスト統計取得
 */
const getServiceRequestStats = (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total FROM service_requests',
    'SELECT status, COUNT(*) as count FROM service_requests GROUP BY status',
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
 * サービスリクエスト詳細取得
 */
const getServiceRequestById = (req, res) => {
  const { id } = req.params;
  
  db.get(
    'SELECT * FROM service_requests WHERE request_id = ?',
    [id],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'サービスリクエストが見つかりません' });
      }
      
      res.json(row);
    }
  );
};

/**
 * サービスリクエスト作成
 */
const createServiceRequest = (req, res) => {
  const {
    subject,
    detail,
    applicant,
    status = 'New',
    requested_date = new Date().toISOString().split('T')[0]
  } = req.body;
  
  // 入力検証
  if (!subject || !detail || !applicant) {
    return res.status(400).json({ 
      error: '件名、詳細、申請者は必須項目です',
      details: {
        subject: !subject ? '件名が必要です' : null,
        detail: !detail ? '詳細が必要です' : null,
        applicant: !applicant ? '申請者が必要です' : null
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
    INSERT INTO service_requests (subject, detail, status, applicant, requested_date, created_date, updated_date)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `;
  
  db.run(query, [subject, detail, status, applicant, requested_date], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    // 監査ログ
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO logs (event_type, event_time, user, detail) VALUES (?, ?, ?, ?)',
      ['SERVICE_REQUEST_CREATE', now, req.user?.username || 'system', `Created service request: ${subject}`]
    );
    
    // 作成されたサービスリクエストを返す
    db.get(
      'SELECT * FROM service_requests WHERE request_id = ?',
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
 * サービスリクエスト更新
 */
const updateServiceRequest = (req, res) => {
  const { id } = req.params;
  const {
    subject,
    detail,
    status,
    applicant,
    approved_by,
    approved_date
  } = req.body;
  
  // 既存データの確認
  db.get(
    'SELECT * FROM service_requests WHERE request_id = ?',
    [id],
    (err, existingRequest) => {
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
        applicant: applicant || existingRequest.applicant,
        approved_by: approved_by || existingRequest.approved_by,
        approved_date: approved_date || existingRequest.approved_date,
        updated_date: new Date().toISOString()
      };
      
      // 承認処理の場合
      if (status === 'Approved' && !existingRequest.approved_date) {
        updatedData.approved_by = req.user?.username || approved_by;
        updatedData.approved_date = new Date().toISOString().split('T')[0];
      }
      
      const query = `
        UPDATE service_requests 
        SET subject = ?, detail = ?, status = ?, applicant = ?, 
            approved_by = ?, approved_date = ?, updated_date = ?
        WHERE request_id = ?
      `;
      
      db.run(query, [
        updatedData.subject,
        updatedData.detail,
        updatedData.status,
        updatedData.applicant,
        updatedData.approved_by,
        updatedData.approved_date,
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
          ['SERVICE_REQUEST_UPDATE', now, req.user?.username || 'system', `Updated service request ID: ${id}`]
        );
        
        // 更新後のデータを返す
        db.get(
          'SELECT * FROM service_requests WHERE request_id = ?',
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
 * サービスリクエスト削除
 */
const deleteServiceRequest = (req, res) => {
  const { id } = req.params;
  
  // 権限チェック（管理者のみ削除可能）
  if (req.user && req.user.role !== 'administrator') {
    return res.status(403).json({ 
      error: 'サービスリクエストを削除する権限がありません',
      required_role: 'administrator',
      current_role: req.user.role
    });
  }
  
  // 存在確認
  db.get(
    'SELECT subject FROM service_requests WHERE request_id = ?',
    [id],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'サービスリクエストが見つかりません' });
      }
      
      // 削除実行
      db.run(
        'DELETE FROM service_requests WHERE request_id = ?',
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
            ['SERVICE_REQUEST_DELETE', now, req.user?.username || 'system', `Deleted service request: ${row.subject}`]
          );
          
          res.json({ 
            success: true, 
            message: 'サービスリクエストが正常に削除されました',
            deleted_id: id
          });
        }
      );
    }
  );
};

module.exports = {
  getServiceRequests,
  getServiceRequestStats,
  getServiceRequestById,
  createServiceRequest,
  updateServiceRequest,
  deleteServiceRequest
};