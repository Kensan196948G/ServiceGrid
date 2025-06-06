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
 * サービスリクエスト一覧取得
 * 新しいスキーマに対応した拡張版実装
 */
const getServiceRequests = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  
  // 拡張フィルタリング条件
  const { status, category, priority, requester, search, date_from, date_to } = req.query;
  
  let whereConditions = [];
  let queryParams = [];
  
  if (status) {
    whereConditions.push('sr.status = ?');
    queryParams.push(status);
  }
  
  if (category) {
    whereConditions.push('sr.category = ?');
    queryParams.push(category);
  }
  
  if (priority) {
    whereConditions.push('sr.priority = ?');
    queryParams.push(priority);
  }
  
  if (requester) {
    whereConditions.push('(u_req.username LIKE ? OR u_req.display_name LIKE ?)');
    queryParams.push(`%${requester}%`, `%${requester}%`);
  }
  
  if (search) {
    whereConditions.push('(sr.subject LIKE ? OR sr.detail LIKE ? OR sr.requested_item LIKE ?)');
    queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  if (date_from) {
    whereConditions.push('DATE(sr.requested_date) >= ?');
    queryParams.push(date_from);
  }
  
  if (date_to) {
    whereConditions.push('DATE(sr.requested_date) <= ?');
    queryParams.push(date_to);
  }
  
  const whereClause = whereConditions.length > 0 
    ? 'WHERE ' + whereConditions.join(' AND ') 
    : '';
  
  // カウントクエリ
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM service_requests sr
    LEFT JOIN users u_req ON sr.requester_user_id = u_req.user_id
    ${whereClause}
  `;
  
  db.get(countQuery, queryParams, (err, countResult) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);
    
    // データ取得クエリ（JOIN使用）
    const dataQuery = `
      SELECT 
        sr.request_id, sr.request_number, sr.subject, sr.detail, sr.status, 
        sr.category, sr.subcategory, sr.priority, sr.requested_item,
        sr.business_justification, sr.estimated_cost, sr.requested_delivery_date,
        sr.requested_date, sr.approved_date, sr.rejected_date, sr.completed_date,
        sr.rejection_reason, sr.fulfillment_notes,
        u_req.username as requester_username, u_req.display_name as requester_name,
        u_app.username as approver_username, u_app.display_name as approver_name,
        u_ful.username as fulfiller_username, u_ful.display_name as fulfiller_name,
        sr.created_date, sr.updated_date
      FROM service_requests sr
      LEFT JOIN users u_req ON sr.requester_user_id = u_req.user_id
      LEFT JOIN users u_app ON sr.approver_user_id = u_app.user_id
      LEFT JOIN users u_ful ON sr.fulfiller_user_id = u_ful.user_id
      ${whereClause} 
      ORDER BY sr.created_date DESC 
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
        filters: { status, category, priority, requester, search, date_from, date_to }
      });
    });
  });
};

/**
 * サービスリクエスト統計取得（拡張版）
 */
const getServiceRequestStats = (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total FROM service_requests',
    'SELECT status, COUNT(*) as count FROM service_requests GROUP BY status ORDER BY count DESC',
    'SELECT category, COUNT(*) as count FROM service_requests WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC',
    'SELECT priority, COUNT(*) as count FROM service_requests GROUP BY priority ORDER BY CASE priority WHEN "Urgent" THEN 1 WHEN "High" THEN 2 WHEN "Medium" THEN 3 WHEN "Low" THEN 4 END',
    'SELECT DATE(created_date) as date, COUNT(*) as count FROM service_requests WHERE created_date >= date("now", "-30 days") GROUP BY DATE(created_date) ORDER BY date',
    'SELECT AVG(JULIANDAY(approved_date) - JULIANDAY(requested_date)) as avg_approval_days FROM service_requests WHERE approved_date IS NOT NULL AND requested_date IS NOT NULL',
    'SELECT AVG(JULIANDAY(completed_date) - JULIANDAY(approved_date)) as avg_fulfillment_days FROM service_requests WHERE completed_date IS NOT NULL AND approved_date IS NOT NULL',
    'SELECT AVG(estimated_cost) as avg_cost, SUM(estimated_cost) as total_cost FROM service_requests WHERE estimated_cost IS NOT NULL'
  ];
  
  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }))
  .then(([totalResult, statusResult, categoryResult, priorityResult, dailyResult, approvalTimeResult, fulfillmentTimeResult, costResult]) => {
    res.json({
      total: totalResult[0].total,
      by_status: statusResult.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {}),
      by_category: categoryResult.reduce((acc, row) => {
        acc[row.category] = row.count;
        return acc;
      }, {}),
      by_priority: priorityResult.reduce((acc, row) => {
        acc[row.priority] = row.count;
        return acc;
      }, {}),
      daily_requests: dailyResult,
      performance_metrics: {
        avg_approval_days: Math.round((approvalTimeResult[0].avg_approval_days || 0) * 10) / 10,
        avg_fulfillment_days: Math.round((fulfillmentTimeResult[0].avg_fulfillment_days || 0) * 10) / 10,
        avg_cost: Math.round((costResult[0].avg_cost || 0) * 100) / 100,
        total_cost: Math.round((costResult[0].total_cost || 0) * 100) / 100
      }
    });
  })
  .catch(err => {
    console.error('Database error:', err);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  });
};

/**
 * サービスリクエスト詳細取得（拡張版）
 */
const getServiceRequestById = (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      sr.*,
      u_req.username as requester_username, u_req.display_name as requester_name, u_req.email as requester_email,
      u_app.username as approver_username, u_app.display_name as approver_name, u_app.email as approver_email,
      u_ful.username as fulfiller_username, u_ful.display_name as fulfiller_name, u_ful.email as fulfiller_email,
      u_created.username as created_by_username, u_created.display_name as created_by_name,
      u_updated.username as updated_by_username, u_updated.display_name as updated_by_name
    FROM service_requests sr
    LEFT JOIN users u_req ON sr.requester_user_id = u_req.user_id
    LEFT JOIN users u_app ON sr.approver_user_id = u_app.user_id
    LEFT JOIN users u_ful ON sr.fulfiller_user_id = u_ful.user_id
    LEFT JOIN users u_created ON sr.created_by_user_id = u_created.user_id
    LEFT JOIN users u_updated ON sr.updated_by_user_id = u_updated.user_id
    WHERE sr.request_id = ?
  `;
  
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
 * サービスリクエスト作成（拡張版）
 */
const createServiceRequest = (req, res) => {
  const {
    subject,
    detail,
    category,
    subcategory,
    priority = 'Medium',
    requested_item,
    business_justification,
    estimated_cost,
    requested_delivery_date,
    requester_user_id,
    status = 'Submitted'
  } = req.body;
  
  // 入力検証
  if (!subject || !detail || !requester_user_id) {
    return res.status(400).json({ 
      error: '件名、詳細、申請者は必須項目です',
      details: {
        subject: !subject ? '件名が必要です' : null,
        detail: !detail ? '詳細が必要です' : null,
        requester_user_id: !requester_user_id ? '申請者が必要です' : null
      }
    });
  }
  
  // フィールド長チェック
  if (subject.length > 200) {
    return res.status(400).json({ error: '件名は200文字以内で入力してください' });
  }
  
  if (detail.length > 5000) {
    return res.status(400).json({ error: '詳細は5000文字以内で入力してください' });
  }
  
  // 優先度チェック
  const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ 
      error: '無効な優先度です',
      valid_priorities: validPriorities
    });
  }
  
  // 申請者の存在確認
  db.get(
    'SELECT user_id, username, display_name FROM users WHERE user_id = ? AND active = TRUE',
    [requester_user_id],
    (err, requester) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!requester) {
        return res.status(400).json({ error: '指定された申請者が見つかりません' });
      }
      
      const query = `
        INSERT INTO service_requests (
          subject, detail, category, subcategory, priority, requested_item,
          business_justification, estimated_cost, requested_delivery_date,
          requester_user_id, status, requested_date, created_date, updated_date,
          created_by_user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), ?)
      `;
      
      const currentUserId = req.user?.user_id || requester_user_id;
      
      db.run(query, [
        subject, detail, category, subcategory, priority, requested_item,
        business_justification, estimated_cost, requested_delivery_date,
        requester_user_id, status, currentUserId
      ], function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'データベースエラーが発生しました' });
        }
        
        // 監査ログ記録
        const logData = {
          event_type: 'Data Modification',
          event_subtype: 'Service Request Create',
          user_id: currentUserId,
          username: req.user?.username || requester.username,
          action: 'Create',
          target_table: 'service_requests',
          target_record_id: this.lastID,
          new_values: JSON.stringify({
            subject, status, priority, category,
            requester_user_id, estimated_cost
          }),
          details: `Created service request: ${subject}`
        };
        
        db.run(
          `INSERT INTO logs (
            event_type, event_subtype, user_id, username, action, 
            target_table, target_record_id, new_values, details
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          Object.values(logData)
        );
        
        // 作成されたサービスリクエストを詳細情報付きで返す
        const detailQuery = `
          SELECT 
            sr.*,
            u_req.username as requester_username, u_req.display_name as requester_name,
            u_created.username as created_by_username, u_created.display_name as created_by_name
          FROM service_requests sr
          LEFT JOIN users u_req ON sr.requester_user_id = u_req.user_id
          LEFT JOIN users u_created ON sr.created_by_user_id = u_created.user_id
          WHERE sr.request_id = ?
        `;
        
        db.get(detailQuery, [this.lastID], (err, row) => {
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
    }
  );
};

/**
 * レガシーサービスリクエスト更新（下位互換性のため保持）
 */
const updateServiceRequest = (req, res) => {
  const { id } = req.params;
  const {
    subject,
    detail,
    category,
    subcategory,
    priority,
    requested_item,
    business_justification,
    estimated_cost,
    requested_delivery_date,
    status
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
      
      // 権限チェック：申請者本人または管理者・オペレータのみ編集可能
      const canEdit = !req.user || 
                     req.user.user_id === existingRequest.requester_user_id ||
                     ['administrator', 'operator'].includes(req.user.role);
      
      if (!canEdit) {
        return res.status(403).json({ 
          error: '本リクエストを編集する権限がありません',
          reason: '申請者本人または管理者・オペレータのみ編集可能です'
        });
      }
      
      // ステータスチェック：完了済み・キャンセル済みは編集不可
      if (['Fulfilled', 'Cancelled'].includes(existingRequest.status)) {
        return res.status(400).json({ 
          error: '完了済みまたはキャンセル済みのリクエストは編集できません',
          current_status: existingRequest.status
        });
      }
      
      // 更新するフィールドを決定（既存値保持）
      const updatedData = {
        subject: subject || existingRequest.subject,
        detail: detail || existingRequest.detail,
        category: category || existingRequest.category,
        subcategory: subcategory || existingRequest.subcategory,
        priority: priority || existingRequest.priority,
        requested_item: requested_item || existingRequest.requested_item,
        business_justification: business_justification || existingRequest.business_justification,
        estimated_cost: estimated_cost !== undefined ? estimated_cost : existingRequest.estimated_cost,
        requested_delivery_date: requested_delivery_date || existingRequest.requested_delivery_date,
        status: status || existingRequest.status
      };
      
      // 入力検証
      if (updatedData.subject.length > 200) {
        return res.status(400).json({ error: '件名は200文字以内で入力してください' });
      }
      
      if (updatedData.detail.length > 5000) {
        return res.status(400).json({ error: '詳細は5000文字以内で入力してください' });
      }
      
      const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
      if (updatedData.priority && !validPriorities.includes(updatedData.priority)) {
        return res.status(400).json({ 
          error: '無効な優先度です',
          valid_priorities: validPriorities
        });
      }
      
      const query = `
        UPDATE service_requests 
        SET subject = ?, detail = ?, category = ?, subcategory = ?, priority = ?,
            requested_item = ?, business_justification = ?, estimated_cost = ?,
            requested_delivery_date = ?, status = ?, updated_date = datetime('now'),
            updated_by_user_id = ?
        WHERE request_id = ?
      `;
      
      db.run(query, [
        updatedData.subject,
        updatedData.detail,
        updatedData.category,
        updatedData.subcategory,
        updatedData.priority,
        updatedData.requested_item,
        updatedData.business_justification,
        updatedData.estimated_cost,
        updatedData.requested_delivery_date,
        updatedData.status,
        req.user?.user_id,
        id
      ], function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'データベースエラーが発生しました' });
        }
        
        // 監査ログ
        const logData = {
          event_type: 'Data Modification',
          event_subtype: 'Service Request Update',
          user_id: req.user?.user_id,
          username: req.user?.username || 'system',
          action: 'Update',
          target_table: 'service_requests',
          target_record_id: id,
          old_values: JSON.stringify({
            subject: existingRequest.subject,
            status: existingRequest.status,
            priority: existingRequest.priority
          }),
          new_values: JSON.stringify({
            subject: updatedData.subject,
            status: updatedData.status,
            priority: updatedData.priority
          }),
          details: `Updated service request: ${updatedData.subject}`
        };
        
        db.run(
          `INSERT INTO logs (
            event_type, event_subtype, user_id, username, action, 
            target_table, target_record_id, old_values, new_values, details
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          Object.values(logData)
        );
        
        // 更新後のデータを詳細情報付きで返す
        const detailQuery = `
          SELECT 
            sr.*,
            u_req.username as requester_username, u_req.display_name as requester_name,
            u_updated.username as updated_by_username, u_updated.display_name as updated_by_name
          FROM service_requests sr
          LEFT JOIN users u_req ON sr.requester_user_id = u_req.user_id
          LEFT JOIN users u_updated ON sr.updated_by_user_id = u_updated.user_id
          WHERE sr.request_id = ?
        `;
        
        db.get(detailQuery, [id], (err, row) => {
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
    }
  );
};

/**
 * サービスリクエスト承認/却下
 */
const approveServiceRequest = (req, res) => {
  const { id } = req.params;
  const { action, rejection_reason } = req.body; // action: 'approve' or 'reject'
  
  // 権限チェック（オペレータ以上）
  if (!req.user || !['administrator', 'operator'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'サービスリクエストを承認/却下する権限がありません',
      required_role: ['administrator', 'operator'],
      current_role: req.user?.role
    });
  }
  
  // バリデーション
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'actionは "approve" または "reject" である必要があります' });
  }
  
  if (action === 'reject' && !rejection_reason) {
    return res.status(400).json({ error: '却下理由は必須です' });
  }
  
  // 現在のリクエスト確認
  db.get(
    'SELECT * FROM service_requests WHERE request_id = ?',
    [id],
    (err, request) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!request) {
        return res.status(404).json({ error: 'サービスリクエストが見つかりません' });
      }
      
      if (!['Submitted', 'Pending Approval'].includes(request.status)) {
        return res.status(400).json({ 
          error: '承認待ち状態のリクエストのみ承認/却下できます',
          current_status: request.status
        });
      }
      
      const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
      const updateDate = new Date().toISOString().split('T')[0];
      
      let query, params;
      
      if (action === 'approve') {
        query = `
          UPDATE service_requests 
          SET status = ?, approver_user_id = ?, approved_date = ?, 
              updated_date = datetime('now'), updated_by_user_id = ?
          WHERE request_id = ?
        `;
        params = [newStatus, req.user.user_id, updateDate, req.user.user_id, id];
      } else {
        query = `
          UPDATE service_requests 
          SET status = ?, approver_user_id = ?, rejected_date = ?, 
              rejection_reason = ?, updated_date = datetime('now'), updated_by_user_id = ?
          WHERE request_id = ?
        `;
        params = [newStatus, req.user.user_id, updateDate, rejection_reason, req.user.user_id, id];
      }
      
      db.run(query, params, function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'データベースエラーが発生しました' });
        }
        
        // 監査ログ記録
        const logData = {
          event_type: 'Data Modification',
          event_subtype: 'Service Request Approval',
          user_id: req.user.user_id,
          username: req.user.username,
          action: 'Update',
          target_table: 'service_requests',
          target_record_id: id,
          old_values: JSON.stringify({ status: request.status }),
          new_values: JSON.stringify({ 
            status: newStatus, 
            approver_user_id: req.user.user_id,
            rejection_reason: rejection_reason || null
          }),
          details: `${action === 'approve' ? 'Approved' : 'Rejected'} service request: ${request.subject}`
        };
        
        db.run(
          `INSERT INTO logs (
            event_type, event_subtype, user_id, username, action, 
            target_table, target_record_id, old_values, new_values, details
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          Object.values(logData)
        );
        
        // 更新後のデータを返す
        const detailQuery = `
          SELECT 
            sr.*,
            u_req.username as requester_username, u_req.display_name as requester_name,
            u_app.username as approver_username, u_app.display_name as approver_name
          FROM service_requests sr
          LEFT JOIN users u_req ON sr.requester_user_id = u_req.user_id
          LEFT JOIN users u_app ON sr.approver_user_id = u_app.user_id
          WHERE sr.request_id = ?
        `;
        
        db.get(detailQuery, [id], (err, row) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'データベースエラーが発生しました' });
          }
          
          res.json({
            success: true,
            message: `サービスリクエストが正常に${action === 'approve' ? '承認' : '却下'}されました`,
            data: row
          });
        });
      });
    }
  );
};

/**
 * サービスリクエスト完了処理
 */
const fulfillServiceRequest = (req, res) => {
  const { id } = req.params;
  const { fulfillment_notes } = req.body;
  
  // 権限チェック（オペレータ以上）
  if (!req.user || !['administrator', 'operator'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'サービスリクエストを完了する権限がありません',
      required_role: ['administrator', 'operator'],
      current_role: req.user?.role
    });
  }
  
  // 現在のリクエスト確認
  db.get(
    'SELECT * FROM service_requests WHERE request_id = ?',
    [id],
    (err, request) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!request) {
        return res.status(404).json({ error: 'サービスリクエストが見つかりません' });
      }
      
      if (!['Approved', 'In Progress'].includes(request.status)) {
        return res.status(400).json({ 
          error: '承認済みまたは進行中のリクエストのみ完了できます',
          current_status: request.status
        });
      }
      
      const query = `
        UPDATE service_requests 
        SET status = 'Fulfilled', fulfiller_user_id = ?, completed_date = ?, 
            fulfillment_notes = ?, updated_date = datetime('now'), updated_by_user_id = ?
        WHERE request_id = ?
      `;
      
      const completedDate = new Date().toISOString().split('T')[0];
      
      db.run(query, [
        req.user.user_id, 
        completedDate, 
        fulfillment_notes, 
        req.user.user_id, 
        id
      ], function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'データベースエラーが発生しました' });
        }
        
        // 監査ログ記録
        const logData = {
          event_type: 'Data Modification',
          event_subtype: 'Service Request Fulfillment',
          user_id: req.user.user_id,
          username: req.user.username,
          action: 'Update',
          target_table: 'service_requests',
          target_record_id: id,
          old_values: JSON.stringify({ status: request.status }),
          new_values: JSON.stringify({ 
            status: 'Fulfilled', 
            fulfiller_user_id: req.user.user_id,
            completed_date: completedDate
          }),
          details: `Fulfilled service request: ${request.subject}`
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
          message: 'サービスリクエストが正常に完了されました',
          completed_date: completedDate
        });
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
    'SELECT subject, status FROM service_requests WHERE request_id = ?',
    [id],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'サービスリクエストが見つかりません' });
      }
      
      // 完了済みのリクエストは削除不可
      if (['Fulfilled', 'Cancelled'].includes(row.status)) {
        return res.status(400).json({ 
          error: '完了済みまたはキャンセル済みのリクエストは削除できません',
          current_status: row.status
        });
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
          const logData = {
            event_type: 'Data Modification',
            event_subtype: 'Service Request Delete',
            user_id: req.user?.user_id,
            username: req.user?.username || 'system',
            action: 'Delete',
            target_table: 'service_requests',
            target_record_id: id,
            details: `Deleted service request: ${row.subject}`
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
            message: 'サービスリクエストが正常に削除されました',
            deleted_id: id
          });
        }
      );
    }
  );
};

/**
 * ワークフロー遷移
 */
const transitionServiceRequest = (req, res) => {
  const { id } = req.params;
  const { new_status, notes } = req.body;
  
  // 有効なステータス遷移を定義
  const validTransitions = {
    'Submitted': ['Pending Approval', 'Cancelled'],
    'Pending Approval': ['Approved', 'Rejected', 'Cancelled'],
    'Approved': ['In Progress', 'Cancelled'],
    'In Progress': ['Fulfilled', 'Cancelled'],
    'Rejected': ['Submitted'], // 再申請可能
    'Fulfilled': [], // 終了状態
    'Cancelled': [] // 終了状態
  };
  
  // 現在のリクエスト確認
  db.get(
    'SELECT * FROM service_requests WHERE request_id = ?',
    [id],
    (err, request) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!request) {
        return res.status(404).json({ error: 'サービスリクエストが見つかりません' });
      }
      
      // 遷移可能性チェック
      const allowedStatuses = validTransitions[request.status] || [];
      if (!allowedStatuses.includes(new_status)) {
        return res.status(400).json({ 
          error: `${request.status} から ${new_status} への遷移は無効です`,
          current_status: request.status,
          allowed_statuses: allowedStatuses
        });
      }
      
      // ステータス更新
      const query = `
        UPDATE service_requests 
        SET status = ?, updated_date = datetime('now'), updated_by_user_id = ?
        WHERE request_id = ?
      `;
      
      db.run(query, [new_status, req.user?.user_id, id], function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'データベースエラーが発生しました' });
        }
        
        // 監査ログ
        const logData = {
          event_type: 'Data Modification',
          event_subtype: 'Service Request Status Transition',
          user_id: req.user?.user_id,
          username: req.user?.username || 'system',
          action: 'Update',
          target_table: 'service_requests',
          target_record_id: id,
          old_values: JSON.stringify({ status: request.status }),
          new_values: JSON.stringify({ status: new_status }),
          details: `Status transition: ${request.status} -> ${new_status}${notes ? '. Notes: ' + notes : ''}`
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
          message: `ステータスが ${request.status} から ${new_status} に変更されました`,
          old_status: request.status,
          new_status: new_status
        });
      });
    }
  );
};

module.exports = {
  getServiceRequests,
  getServiceRequestStats,
  getServiceRequestById,
  createServiceRequest,
  updateServiceRequest: updateServiceRequest, // Legacy-updateの代わりに既存関数を使用
  approveServiceRequest,
  fulfillServiceRequest,
  transitionServiceRequest,
  deleteServiceRequest
};