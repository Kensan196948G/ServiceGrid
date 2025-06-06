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
 * 問題管理一覧取得（拡張版）
 */
const getProblems = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  
  // 拡張フィルタリング条件
  const { status, priority, category, assignee, search, date_from, date_to } = req.query;
  
  let whereConditions = [];
  let queryParams = [];
  
  if (status) {
    whereConditions.push('p.status = ?');
    queryParams.push(status);
  }
  
  if (priority) {
    whereConditions.push('p.priority = ?');
    queryParams.push(priority);
  }
  
  if (category) {
    whereConditions.push('p.category = ?');
    queryParams.push(category);
  }
  
  if (assignee) {
    whereConditions.push('(u_assignee.username LIKE ? OR u_assignee.display_name LIKE ?)');
    queryParams.push(`%${assignee}%`, `%${assignee}%`);
  }
  
  if (search) {
    whereConditions.push('(p.title LIKE ? OR p.description LIKE ? OR p.workaround LIKE ? OR p.root_cause LIKE ?)');
    queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  if (date_from) {
    whereConditions.push('DATE(p.registered_date) >= ?');
    queryParams.push(date_from);
  }
  
  if (date_to) {
    whereConditions.push('DATE(p.registered_date) <= ?');
    queryParams.push(date_to);
  }
  
  const whereClause = whereConditions.length > 0 
    ? 'WHERE ' + whereConditions.join(' AND ') 
    : '';
  
  // カウントクエリ
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM problems p
    LEFT JOIN users u_assignee ON p.assignee_user_id = u_assignee.user_id
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
        p.problem_id, p.problem_number, p.title, p.description, p.status, 
        p.priority, p.category, p.affected_service, p.workaround,
        p.root_cause, p.permanent_solution,
        u_reporter.username as reporter_username, u_reporter.display_name as reporter_name,
        u_assignee.username as assignee_username, u_assignee.display_name as assignee_name,
        u_resolver.username as resolver_username, u_resolver.display_name as resolver_name,
        p.registered_date, p.acknowledged_date, p.resolved_date, p.closed_date, p.review_date,
        p.created_date, p.updated_date
      FROM problems p
      LEFT JOIN users u_reporter ON p.reporter_user_id = u_reporter.user_id
      LEFT JOIN users u_assignee ON p.assignee_user_id = u_assignee.user_id
      LEFT JOIN users u_resolver ON p.resolver_user_id = u_resolver.user_id
      ${whereClause} 
      ORDER BY p.registered_date DESC, p.priority DESC
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
        filters: { status, priority, category, assignee, search, date_from, date_to }
      });
    });
  });
};

/**
 * 問題管理統計取得（拡張版）
 */
const getProblemStats = (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total FROM problems',
    'SELECT status, COUNT(*) as count FROM problems GROUP BY status ORDER BY count DESC',
    'SELECT priority, COUNT(*) as count FROM problems GROUP BY priority ORDER BY CASE priority WHEN "Critical" THEN 1 WHEN "High" THEN 2 WHEN "Medium" THEN 3 WHEN "Low" THEN 4 END',
    'SELECT category, COUNT(*) as count FROM problems WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC',
    'SELECT DATE(registered_date) as date, COUNT(*) as count FROM problems WHERE registered_date >= date("now", "-30 days") GROUP BY DATE(registered_date) ORDER BY date',
    'SELECT AVG(JULIANDAY(acknowledged_date) - JULIANDAY(registered_date)) as avg_acknowledgment_days FROM problems WHERE acknowledged_date IS NOT NULL AND registered_date IS NOT NULL',
    'SELECT AVG(JULIANDAY(resolved_date) - JULIANDAY(registered_date)) as avg_resolution_days FROM problems WHERE resolved_date IS NOT NULL AND registered_date IS NOT NULL',
    'SELECT AVG(JULIANDAY(closed_date) - JULIANDAY(resolved_date)) as avg_closure_days FROM problems WHERE closed_date IS NOT NULL AND resolved_date IS NOT NULL',
    'SELECT COUNT(*) as known_errors FROM problems WHERE status = "Known Error"',
    'SELECT COUNT(*) as overdue_problems FROM problems WHERE review_date IS NOT NULL AND review_date < date("now") AND status NOT IN ("Resolved", "Closed")'
  ];
  
  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }))
  .then(([totalResult, statusResult, priorityResult, categoryResult, dailyResult, ackTimeResult, resolutionTimeResult, closureTimeResult, knownErrorsResult, overdueResult]) => {
    res.json({
      total: totalResult[0].total,
      by_status: statusResult.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {}),
      by_priority: priorityResult.reduce((acc, row) => {
        acc[row.priority] = row.count;
        return acc;
      }, {}),
      by_category: categoryResult.reduce((acc, row) => {
        acc[row.category] = row.count;
        return acc;
      }, {}),
      daily_problems: dailyResult,
      performance_metrics: {
        avg_acknowledgment_days: Math.round((ackTimeResult[0].avg_acknowledgment_days || 0) * 10) / 10,
        avg_resolution_days: Math.round((resolutionTimeResult[0].avg_resolution_days || 0) * 10) / 10,
        avg_closure_days: Math.round((closureTimeResult[0].avg_closure_days || 0) * 10) / 10,
        known_errors: knownErrorsResult[0].known_errors || 0,
        overdue_problems: overdueResult[0].overdue_problems || 0
      }
    });
  })
  .catch(err => {
    console.error('Database error:', err);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  });
};

/**
 * 問題詳細取得（拡張版）
 */
const getProblemById = (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      p.*,
      u_reporter.username as reporter_username, u_reporter.display_name as reporter_name, u_reporter.email as reporter_email,
      u_assignee.username as assignee_username, u_assignee.display_name as assignee_name, u_assignee.email as assignee_email,
      u_resolver.username as resolver_username, u_resolver.display_name as resolver_name, u_resolver.email as resolver_email,
      u_created.username as created_by_username, u_created.display_name as created_by_name,
      u_updated.username as updated_by_username, u_updated.display_name as updated_by_name
    FROM problems p
    LEFT JOIN users u_reporter ON p.reporter_user_id = u_reporter.user_id
    LEFT JOIN users u_assignee ON p.assignee_user_id = u_assignee.user_id
    LEFT JOIN users u_resolver ON p.resolver_user_id = u_resolver.user_id
    LEFT JOIN users u_created ON p.created_by_user_id = u_created.user_id
    LEFT JOIN users u_updated ON p.updated_by_user_id = u_updated.user_id
    WHERE p.problem_id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    if (!row) {
      return res.status(404).json({ error: '問題が見つかりません' });
    }
    
    // 関連インシデントも取得
    const relatedIncidentsQuery = `
      SELECT 
        i.incident_id, i.incident_number, i.title, i.status, i.priority,
        ipr.relationship_type,
        u_reporter.username as reporter_username, u_reporter.display_name as reporter_name
      FROM incident_problem_relationships ipr
      JOIN incidents i ON ipr.incident_id = i.incident_id
      LEFT JOIN users u_reporter ON i.reporter_user_id = u_reporter.user_id
      WHERE ipr.problem_id = ?
      ORDER BY ipr.created_date DESC
    `;
    
    db.all(relatedIncidentsQuery, [id], (err, incidents) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      res.json({
        ...row,
        related_incidents: incidents || []
      });
    });
  });
};

/**
 * 問題作成（拡張版）
 */
const createProblem = (req, res) => {
  const {
    title,
    description,
    priority = 'Medium',
    category,
    affected_service,
    workaround,
    reporter_user_id,
    assignee_user_id,
    status = 'Logged'
  } = req.body;
  
  // 入力検証
  if (!title || !description || !reporter_user_id) {
    return res.status(400).json({ 
      error: 'タイトル、説明、報告者は必須項目です',
      details: {
        title: !title ? 'タイトルが必要です' : null,
        description: !description ? '説明が必要です' : null,
        reporter_user_id: !reporter_user_id ? '報告者が必要です' : null
      }
    });
  }
  
  // フィールド長チェック
  if (title.length > 200) {
    return res.status(400).json({ error: 'タイトルは200文字以内で入力してください' });
  }
  
  if (description.length > 5000) {
    return res.status(400).json({ error: '説明は5000文字以内で入力してください' });
  }
  
  // 優先度チェック
  const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ 
      error: '無効な優先度です',
      valid_priorities: validPriorities
    });
  }
  
  // ステータスチェック
  const validStatuses = ['Logged', 'In Progress', 'Known Error', 'Resolved', 'Closed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      error: '無効なステータスです',
      valid_statuses: validStatuses
    });
  }
  
  // 報告者の存在確認
  db.get(
    'SELECT user_id, username, display_name FROM users WHERE user_id = ? AND active = TRUE',
    [reporter_user_id],
    (err, reporter) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!reporter) {
        return res.status(400).json({ error: '指定された報告者が見つかりません' });
      }
      
      // 担当者が指定されている場合の存在確認
      if (assignee_user_id) {
        db.get(
          'SELECT user_id FROM users WHERE user_id = ? AND active = TRUE',
          [assignee_user_id],
          (err, assignee) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'データベースエラーが発生しました' });
            }
            
            if (!assignee) {
              return res.status(400).json({ error: '指定された担当者が見つかりません' });
            }
            
            createProblemRecord();
          }
        );
      } else {
        createProblemRecord();
      }
      
      function createProblemRecord() {
        const query = `
          INSERT INTO problems (
            title, description, priority, category, affected_service, workaround,
            reporter_user_id, assignee_user_id, status, registered_date, 
            created_date, updated_date, created_by_user_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), ?)
        `;
        
        const currentUserId = req.user?.user_id || reporter_user_id;
        
        db.run(query, [
          title, description, priority, category, affected_service, workaround,
          reporter_user_id, assignee_user_id || null, status, currentUserId
        ], function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'データベースエラーが発生しました' });
          }
          
          // 監査ログ記録
          const logData = {
            event_type: 'Data Modification',
            event_subtype: 'Problem Create',
            user_id: currentUserId,
            username: req.user?.username || reporter.username,
            action: 'Create',
            target_table: 'problems',
            target_record_id: this.lastID,
            new_values: JSON.stringify({
              title, priority, category, status, reporter_user_id, assignee_user_id
            }),
            details: `Created problem: ${title}`
          };
          
          db.run(
            `INSERT INTO logs (
              event_type, event_subtype, user_id, username, action, 
              target_table, target_record_id, new_values, details
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            Object.values(logData)
          );
          
          // 作成された問題を詳細情報付きで返す
          const detailQuery = `
            SELECT 
              p.*,
              u_reporter.username as reporter_username, u_reporter.display_name as reporter_name,
              u_assignee.username as assignee_username, u_assignee.display_name as assignee_name,
              u_created.username as created_by_username, u_created.display_name as created_by_name
            FROM problems p
            LEFT JOIN users u_reporter ON p.reporter_user_id = u_reporter.user_id
            LEFT JOIN users u_assignee ON p.assignee_user_id = u_assignee.user_id
            LEFT JOIN users u_created ON p.created_by_user_id = u_created.user_id
            WHERE p.problem_id = ?
          `;
          
          db.get(detailQuery, [this.lastID], (err, row) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'データベースエラーが発生しました' });
            }
            
            res.status(201).json({
              success: true,
              message: '問題が正常に作成されました',
              data: row
            });
          });
        });
      }
    }
  );
};

/**
 * 問題の根本原因分析開始
 */
const startRootCauseAnalysis = (req, res) => {
  const { id } = req.params;
  const { root_cause_analysis } = req.body;
  
  // 権限チェック（オペレータ以上）
  if (!req.user || !['administrator', 'operator'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: '根本原因分析を開始する権限がありません',
      required_role: ['administrator', 'operator'],
      current_role: req.user?.role
    });
  }
  
  // 現在の問題確認
  db.get(
    'SELECT * FROM problems WHERE problem_id = ?',
    [id],
    (err, problem) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!problem) {
        return res.status(404).json({ error: '問題が見つかりません' });
      }
      
      if (problem.status !== 'Logged') {
        return res.status(400).json({ 
          error: '登録済み状態の問題のみ根本原因分析を開始できます',
          current_status: problem.status
        });
      }
      
      const query = `
        UPDATE problems 
        SET status = 'In Progress', assignee_user_id = ?, acknowledged_date = ?, 
            root_cause_analysis = ?, updated_date = datetime('now'), updated_by_user_id = ?
        WHERE problem_id = ?
      `;
      
      const acknowledgedDate = new Date().toISOString().split('T')[0];
      
      db.run(query, [
        req.user.user_id, 
        acknowledgedDate, 
        root_cause_analysis, 
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
          event_subtype: 'Problem RCA Start',
          user_id: req.user.user_id,
          username: req.user.username,
          action: 'Update',
          target_table: 'problems',
          target_record_id: id,
          old_values: JSON.stringify({ status: problem.status }),
          new_values: JSON.stringify({ 
            status: 'In Progress', 
            assignee_user_id: req.user.user_id,
            acknowledged_date: acknowledgedDate
          }),
          details: `Started root cause analysis for problem: ${problem.title}`
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
          message: '根本原因分析が正常に開始されました',
          acknowledged_date: acknowledgedDate
        });
      });
    }
  );
};

/**
 * 既知のエラーとして登録
 */
const markAsKnownError = (req, res) => {
  const { id } = req.params;
  const { root_cause, permanent_solution, workaround } = req.body;
  
  // 権限チェック（オペレータ以上）
  if (!req.user || !['administrator', 'operator'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: '既知のエラーとして登録する権限がありません',
      required_role: ['administrator', 'operator'],
      current_role: req.user?.role
    });
  }
  
  if (!root_cause) {
    return res.status(400).json({ error: '根本原因の記載は必須です' });
  }
  
  // 現在の問題確認
  db.get(
    'SELECT * FROM problems WHERE problem_id = ?',
    [id],
    (err, problem) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!problem) {
        return res.status(404).json({ error: '問題が見つかりません' });
      }
      
      if (problem.status !== 'In Progress') {
        return res.status(400).json({ 
          error: '分析中の問題のみ既知のエラーとして登録できます',
          current_status: problem.status
        });
      }
      
      const query = `
        UPDATE problems 
        SET status = 'Known Error', root_cause = ?, permanent_solution = ?, 
            workaround = COALESCE(?, workaround), updated_date = datetime('now'), 
            updated_by_user_id = ?
        WHERE problem_id = ?
      `;
      
      db.run(query, [
        root_cause, 
        permanent_solution, 
        workaround, 
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
          event_subtype: 'Problem Known Error',
          user_id: req.user.user_id,
          username: req.user.username,
          action: 'Update',
          target_table: 'problems',
          target_record_id: id,
          old_values: JSON.stringify({ status: problem.status }),
          new_values: JSON.stringify({ 
            status: 'Known Error', 
            root_cause: root_cause,
            permanent_solution: permanent_solution
          }),
          details: `Marked problem as known error: ${problem.title}`
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
          message: '問題が既知のエラーとして正常に登録されました'
        });
      });
    }
  );
};

/**
 * 問題解決完了
 */
const resolveProblem = (req, res) => {
  const { id } = req.params;
  const { root_cause, permanent_solution } = req.body;
  
  // 権限チェック（オペレータ以上）
  if (!req.user || !['administrator', 'operator'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: '問題を解決する権限がありません',
      required_role: ['administrator', 'operator'],
      current_role: req.user?.role
    });
  }
  
  if (!root_cause || !permanent_solution) {
    return res.status(400).json({ 
      error: '根本原因と恒久対策の記載は必須です',
      details: {
        root_cause: !root_cause ? '根本原因が必要です' : null,
        permanent_solution: !permanent_solution ? '恒久対策が必要です' : null
      }
    });
  }
  
  // 現在の問題確認
  db.get(
    'SELECT * FROM problems WHERE problem_id = ?',
    [id],
    (err, problem) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!problem) {
        return res.status(404).json({ error: '問題が見つかりません' });
      }
      
      if (!['In Progress', 'Known Error'].includes(problem.status)) {
        return res.status(400).json({ 
          error: '分析中または既知エラーの問題のみ解決できます',
          current_status: problem.status
        });
      }
      
      const resolvedDate = new Date().toISOString().split('T')[0];
      
      const query = `
        UPDATE problems 
        SET status = 'Resolved', root_cause = ?, permanent_solution = ?, 
            resolver_user_id = ?, resolved_date = ?, updated_date = datetime('now'), 
            updated_by_user_id = ?
        WHERE problem_id = ?
      `;
      
      db.run(query, [
        root_cause, 
        permanent_solution, 
        req.user.user_id, 
        resolvedDate, 
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
          event_subtype: 'Problem Resolution',
          user_id: req.user.user_id,
          username: req.user.username,
          action: 'Update',
          target_table: 'problems',
          target_record_id: id,
          old_values: JSON.stringify({ status: problem.status }),
          new_values: JSON.stringify({ 
            status: 'Resolved', 
            resolver_user_id: req.user.user_id,
            resolved_date: resolvedDate
          }),
          details: `Resolved problem: ${problem.title}`
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
          message: '問題が正常に解決されました',
          resolved_date: resolvedDate
        });
      });
    }
  );
};

/**
 * インシデントと問題の関連付け
 */
const linkIncident = (req, res) => {
  const { id } = req.params;
  const { incident_id, relationship_type = 'Caused By' } = req.body;
  
  if (!incident_id) {
    return res.status(400).json({ error: 'インシデントIDは必須です' });
  }
  
  const validRelationships = ['Caused By', 'Related To', 'Duplicate Of'];
  if (!validRelationships.includes(relationship_type)) {
    return res.status(400).json({ 
      error: '無効な関連タイプです',
      valid_relationships: validRelationships
    });
  }
  
  // 問題とインシデントの存在確認
  const checkQuery = `
    SELECT 
      (SELECT COUNT(*) FROM problems WHERE problem_id = ?) as problem_exists,
      (SELECT COUNT(*) FROM incidents WHERE incident_id = ?) as incident_exists
  `;
  
  db.get(checkQuery, [id, incident_id], (err, counts) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    if (counts.problem_exists === 0) {
      return res.status(404).json({ error: '問題が見つかりません' });
    }
    
    if (counts.incident_exists === 0) {
      return res.status(404).json({ error: 'インシデントが見つかりません' });
    }
    
    // 重複チェック
    db.get(
      'SELECT id FROM incident_problem_relationships WHERE incident_id = ? AND problem_id = ? AND relationship_type = ?',
      [incident_id, id, relationship_type],
      (err, existing) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'データベースエラーが発生しました' });
        }
        
        if (existing) {
          return res.status(400).json({ error: '既に同じ関連が存在します' });
        }
        
        // 関連付け実行
        const insertQuery = `
          INSERT INTO incident_problem_relationships (incident_id, problem_id, relationship_type, created_by_user_id)
          VALUES (?, ?, ?, ?)
        `;
        
        db.run(insertQuery, [incident_id, id, relationship_type, req.user?.user_id], function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'データベースエラーが発生しました' });
          }
          
          // 監査ログ記録
          const logData = {
            event_type: 'Data Modification',
            event_subtype: 'Problem Incident Link',
            user_id: req.user?.user_id,
            username: req.user?.username || 'system',
            action: 'Create',
            target_table: 'incident_problem_relationships',
            target_record_id: this.lastID,
            details: `Linked incident ${incident_id} to problem ${id} (${relationship_type})`
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
            message: 'インシデントと問題が正常に関連付けられました',
            relationship_id: this.lastID
          });
        });
      }
    );
  });
};

/**
 * 問題更新（レガシー互換性維持）
 */
const updateProblem = (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    priority,
    category,
    affected_service,
    workaround,
    root_cause,
    root_cause_analysis,
    permanent_solution,
    assignee_user_id,
    status
  } = req.body;
  
  // 既存データの確認
  db.get(
    'SELECT * FROM problems WHERE problem_id = ?',
    [id],
    (err, existingProblem) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!existingProblem) {
        return res.status(404).json({ error: '問題が見つかりません' });
      }
      
      // 権限チェック：報告者本人または管理者・オペレータのみ編集可能
      const canEdit = !req.user || 
                     req.user.user_id === existingProblem.reporter_user_id ||
                     req.user.user_id === existingProblem.assignee_user_id ||
                     ['administrator', 'operator'].includes(req.user.role);
      
      if (!canEdit) {
        return res.status(403).json({ 
          error: '本問題を編集する権限がありません',
          reason: '報告者・担当者本人または管理者・オペレータのみ編集可能です'
        });
      }
      
      // クローズ済みは編集不可
      if (existingProblem.status === 'Closed') {
        return res.status(400).json({ 
          error: 'クローズ済みの問題は編集できません',
          current_status: existingProblem.status
        });
      }
      
      // 更新するフィールドを決定（既存値保持）
      const updatedData = {
        title: title || existingProblem.title,
        description: description || existingProblem.description,
        priority: priority || existingProblem.priority,
        category: category !== undefined ? category : existingProblem.category,
        affected_service: affected_service !== undefined ? affected_service : existingProblem.affected_service,
        workaround: workaround !== undefined ? workaround : existingProblem.workaround,
        root_cause: root_cause !== undefined ? root_cause : existingProblem.root_cause,
        root_cause_analysis: root_cause_analysis !== undefined ? root_cause_analysis : existingProblem.root_cause_analysis,
        permanent_solution: permanent_solution !== undefined ? permanent_solution : existingProblem.permanent_solution,
        assignee_user_id: assignee_user_id !== undefined ? assignee_user_id : existingProblem.assignee_user_id,
        status: status || existingProblem.status
      };
      
      // 入力検証
      if (updatedData.title.length > 200) {
        return res.status(400).json({ error: 'タイトルは200文字以内で入力してください' });
      }
      
      if (updatedData.description.length > 5000) {
        return res.status(400).json({ error: '説明は5000文字以内で入力してください' });
      }
      
      const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
      if (updatedData.priority && !validPriorities.includes(updatedData.priority)) {
        return res.status(400).json({ 
          error: '無効な優先度です',
          valid_priorities: validPriorities
        });
      }
      
      const query = `
        UPDATE problems 
        SET title = ?, description = ?, priority = ?, category = ?, affected_service = ?,
            workaround = ?, root_cause = ?, root_cause_analysis = ?, permanent_solution = ?,
            assignee_user_id = ?, status = ?, updated_date = datetime('now'), updated_by_user_id = ?
        WHERE problem_id = ?
      `;
      
      db.run(query, [
        updatedData.title,
        updatedData.description,
        updatedData.priority,
        updatedData.category,
        updatedData.affected_service,
        updatedData.workaround,
        updatedData.root_cause,
        updatedData.root_cause_analysis,
        updatedData.permanent_solution,
        updatedData.assignee_user_id,
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
          event_subtype: 'Problem Update',
          user_id: req.user?.user_id,
          username: req.user?.username || 'system',
          action: 'Update',
          target_table: 'problems',
          target_record_id: id,
          old_values: JSON.stringify({
            title: existingProblem.title,
            status: existingProblem.status,
            priority: existingProblem.priority
          }),
          new_values: JSON.stringify({
            title: updatedData.title,
            status: updatedData.status,
            priority: updatedData.priority
          }),
          details: `Updated problem: ${updatedData.title}`
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
          message: '問題が正常に更新されました'
        });
      });
    }
  );
};

/**
 * 問題削除
 */
const deleteProblem = (req, res) => {
  const { id } = req.params;
  
  // 権限チェック（管理者のみ削除可能）
  if (req.user && req.user.role !== 'administrator') {
    return res.status(403).json({ 
      error: '問題を削除する権限がありません',
      required_role: 'administrator',
      current_role: req.user.role
    });
  }
  
  // 存在確認
  db.get(
    'SELECT title, status FROM problems WHERE problem_id = ?',
    [id],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!row) {
        return res.status(404).json({ error: '問題が見つかりません' });
      }
      
      // 解決済み・クローズ済みの問題は削除不可
      if (['Resolved', 'Closed'].includes(row.status)) {
        return res.status(400).json({ 
          error: '解決済みまたはクローズ済みの問題は削除できません',
          current_status: row.status
        });
      }
      
      // 関連データも削除
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // 関連インシデントとの関連付けを削除
        db.run('DELETE FROM incident_problem_relationships WHERE problem_id = ?', [id]);
        
        // 問題本体を削除
        db.run('DELETE FROM problems WHERE problem_id = ?', [id], function(err) {
          if (err) {
            db.run('ROLLBACK');
            console.error('Database error:', err);
            return res.status(500).json({ error: 'データベースエラーが発生しました' });
          }
          
          db.run('COMMIT');
          
          // 監査ログ
          const logData = {
            event_type: 'Data Modification',
            event_subtype: 'Problem Delete',
            user_id: req.user?.user_id,
            username: req.user?.username || 'system',
            action: 'Delete',
            target_table: 'problems',
            target_record_id: id,
            details: `Deleted problem: ${row.title} (Status: ${row.status})`
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
            message: '問題が正常に削除されました',
            deleted_id: id
          });
        });
      });
    }
  );
};

module.exports = {
  getProblems,
  getProblemStats,
  getProblemById,
  createProblem,
  updateProblem,
  startRootCauseAnalysis,
  markAsKnownError,
  resolveProblem,
  linkIncident,
  deleteProblem
};