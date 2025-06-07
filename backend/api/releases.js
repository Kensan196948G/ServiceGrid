const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// データベース接続
const dbPath = path.join(__dirname, '..', process.env.DB_PATH || 'db/itsm.sqlite');
const db = new sqlite3.Database(dbPath);

/**
 * Convert database row to frontend Release format
 */
const mapDatabaseToFrontend = (dbRow) => {
  return {
    id: dbRow.release_id.toString(),
    version: dbRow.release_number || 'v1.0.0',
    title: dbRow.title,
    description: dbRow.description,
    status: dbRow.status,
    releaseType: dbRow.type || 'Minor',
    plannedDeploymentDate: dbRow.go_live_date || dbRow.planned_end_date,
    actualDeploymentDate: dbRow.actual_end_date,
    servicesAffected: [], // Will be populated from related table if exists
    rolloutPlan: dbRow.deployment_notes || '',
    rollbackPlan: dbRow.rollback_plan || '',
    testLead: '', // Not in current schema
    deploymentLead: dbRow.responsible_team || '',
    createdAt: dbRow.created_date,
    updatedAt: dbRow.updated_date
  };
};

/**
 * リリース一覧取得
 */
const getReleases = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100);
  const offset = (page - 1) * pageSize;
  
  // フィルタリング条件
  const { title, status, responsible } = req.query;
  
  let whereConditions = [];
  let queryParams = [];
  
  if (title) {
    whereConditions.push('title LIKE ?');
    queryParams.push(`%${title}%`);
  }
  
  if (status) {
    whereConditions.push('status = ?');
    queryParams.push(status);
  }
  
  if (responsible) {
    whereConditions.push('responsible_team LIKE ?');
    queryParams.push(`%${responsible}%`);
  }
  
  const whereClause = whereConditions.length > 0 
    ? 'WHERE ' + whereConditions.join(' AND ') 
    : '';
  
  // カウントクエリ
  const countQuery = `SELECT COUNT(*) as total FROM releases ${whereClause}`;
  
  db.get(countQuery, queryParams, (err, countResult) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    const total = countResult.total;
    const totalPages = Math.ceil(total / pageSize);
    
    // データ取得クエリ
    const dataQuery = `
      SELECT release_id, release_number, title, description, status, type, 
             planned_start_date, planned_end_date, actual_start_date, actual_end_date,
             go_live_date, deployment_notes, rollback_plan, success_criteria, 
             responsible_team, created_date, updated_date
      FROM releases 
      ${whereClause} 
      ORDER BY release_id DESC 
      LIMIT ? OFFSET ?
    `;
    
    db.all(dataQuery, [...queryParams, pageSize, offset], (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      // Map database format to frontend format
      const mappedData = rows.map(mapDatabaseToFrontend);
      
      res.json({
        data: mappedData,
        pagination: {
          page,
          pageSize,
          totalCount: total,
          totalPages
        }
      });
    });
  });
};

/**
 * リリース統計取得
 */
const getReleaseStats = (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total FROM releases',
    'SELECT status, COUNT(*) as count FROM releases GROUP BY status',
    'SELECT type, COUNT(*) as count FROM releases GROUP BY type',
    'SELECT COUNT(*) as upcoming_count FROM releases WHERE go_live_date > DATE("now") AND status NOT IN ("Deployed", "Closed", "Cancelled")'
  ];
  
  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }))
  .then(([totalResult, statusResult, typeResult, upcomingResult]) => {
    res.json({
      total: totalResult[0].total,
      by_status: statusResult.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {}),
      by_type: typeResult.reduce((acc, row) => {
        acc[row.type] = row.count;
        return acc;
      }, {}),
      upcoming_count: upcomingResult[0].upcoming_count
    });
  })
  .catch(err => {
    console.error('Database error:', err);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  });
};

/**
 * リリース詳細取得
 */
const getReleaseById = (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT release_id, release_number, title, description, status, type, priority,
           planned_start_date, planned_end_date, actual_start_date, actual_end_date,
           go_live_date, deployment_notes, rollback_plan, success_criteria, 
           responsible_team, created_date, updated_date
    FROM releases 
    WHERE release_id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'リリースが見つかりません' });
    }
    
    // Map to frontend format
    const frontendRelease = mapDatabaseToFrontend(row);
    res.json(frontendRelease);
  });
};

/**
 * Map frontend Release format to database fields
 */
const mapFrontendToDatabase = (frontendData, req) => {
  return {
    title: frontendData.title,
    description: frontendData.description,
    status: frontendData.status || 'Planning',
    type: frontendData.releaseType || 'Minor',
    priority: frontendData.priority || 'Medium',
    planned_end_date: frontendData.plannedDeploymentDate ? frontendData.plannedDeploymentDate.split('T')[0] : null,
    actual_end_date: frontendData.actualDeploymentDate ? frontendData.actualDeploymentDate.split('T')[0] : null,
    go_live_date: frontendData.plannedDeploymentDate ? frontendData.plannedDeploymentDate.split('T')[0] : null,
    deployment_notes: frontendData.rolloutPlan || '',
    rollback_plan: frontendData.rollbackPlan || '',
    success_criteria: frontendData.successCriteria || '',
    responsible_team: frontendData.deploymentLead || req.user?.username || 'system',
    release_number: frontendData.version || null // Will be auto-generated if null
  };
};

/**
 * リリース作成
 */
const createRelease = (req, res) => {
  const frontendData = req.body;
  
  // 入力検証
  if (!frontendData.title || !frontendData.description) {
    return res.status(400).json({ 
      error: 'タイトルと説明は必須項目です',
      details: {
        title: !frontendData.title ? 'タイトルが必要です' : null,
        description: !frontendData.description ? '説明が必要です' : null
      }
    });
  }
  
  if (frontendData.title.length > 200) {
    return res.status(400).json({ error: 'タイトルは200文字以内で入力してください' });
  }
  
  if (frontendData.description.length > 2000) {
    return res.status(400).json({ error: '説明は2000文字以内で入力してください' });
  }
  
  const dbData = mapFrontendToDatabase(frontendData, req);
  
  const query = `
    INSERT INTO releases (
      release_number, title, description, status, type, priority,
      go_live_date, planned_end_date, actual_end_date, 
      deployment_notes, rollback_plan, success_criteria, responsible_team,
      created_date, updated_date, created_by_user_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
  `;
  
  db.run(query, [
    dbData.release_number, dbData.title, dbData.description, dbData.status, dbData.type, dbData.priority,
    dbData.go_live_date, dbData.planned_end_date, dbData.actual_end_date,
    dbData.deployment_notes, dbData.rollback_plan, dbData.success_criteria, dbData.responsible_team,
    req.user?.userId || null
  ], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    // 監査ログ
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO logs (event_type, event_time, username, action, details) VALUES (?, ?, ?, ?, ?)',
      ['Data Modification', now, req.user?.username || 'system', 'Create Release', `Created release: ${frontendData.title}`]
    );
    
    // 作成されたリリースを返す
    const selectQuery = `
      SELECT release_id, release_number, title, description, status, type, priority,
             planned_start_date, planned_end_date, actual_start_date, actual_end_date,
             go_live_date, deployment_notes, rollback_plan, success_criteria, 
             responsible_team, created_date, updated_date
      FROM releases 
      WHERE release_id = ?
    `;
    
    db.get(selectQuery, [this.lastID], (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      const frontendRelease = mapDatabaseToFrontend(row);
      res.status(201).json({ releaseId: this.lastID, data: frontendRelease });
    });
  });
};

/**
 * リリース更新
 */
const updateRelease = (req, res) => {
  const { id } = req.params;
  const frontendData = req.body;
  
  // 既存データの確認
  const checkQuery = `
    SELECT release_id, responsible_team, created_by_user_id 
    FROM releases 
    WHERE release_id = ?
  `;
  
  db.get(checkQuery, [id], (err, existingRelease) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    if (!existingRelease) {
      return res.status(404).json({ error: 'リリースが見つかりません' });
    }
    
    // 権限チェック（作成者、担当者または管理者のみ編集可能）
    if (req.user && 
        req.user.userId !== existingRelease.created_by_user_id &&
        req.user.username !== existingRelease.responsible_team && 
        req.user.role !== 'administrator') {
      return res.status(403).json({ 
        error: 'このリリースを編集する権限がありません',
        responsible_team: existingRelease.responsible_team,
        current_user: req.user.username
      });
    }
    
    const dbData = mapFrontendToDatabase(frontendData, req);
    
    // 更新クエリの構築（提供されたフィールドのみ更新）
    const updateFields = [];
    const updateValues = [];
    
    if (frontendData.title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(dbData.title);
    }
    if (frontendData.description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(dbData.description);
    }
    if (frontendData.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(dbData.status);
    }
    if (frontendData.releaseType !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(dbData.type);
    }
    if (frontendData.plannedDeploymentDate !== undefined) {
      updateFields.push('go_live_date = ?, planned_end_date = ?');
      updateValues.push(dbData.go_live_date, dbData.planned_end_date);
    }
    if (frontendData.actualDeploymentDate !== undefined) {
      updateFields.push('actual_end_date = ?');
      updateValues.push(dbData.actual_end_date);
    }
    if (frontendData.rolloutPlan !== undefined) {
      updateFields.push('deployment_notes = ?');
      updateValues.push(dbData.deployment_notes);
    }
    if (frontendData.rollbackPlan !== undefined) {
      updateFields.push('rollback_plan = ?');
      updateValues.push(dbData.rollback_plan);
    }
    if (frontendData.deploymentLead !== undefined) {
      updateFields.push('responsible_team = ?');
      updateValues.push(dbData.responsible_team);
    }
    if (frontendData.version !== undefined) {
      updateFields.push('release_number = ?');
      updateValues.push(dbData.release_number);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: '更新するフィールドが指定されていません' });
    }
    
    updateFields.push('updated_date = CURRENT_TIMESTAMP');
    updateFields.push('updated_by_user_id = ?');
    updateValues.push(req.user?.userId || null);
    updateValues.push(id); // WHERE clause parameter
    
    const query = `
      UPDATE releases 
      SET ${updateFields.join(', ')}
      WHERE release_id = ?
    `;
    
    db.run(query, updateValues, function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      // 監査ログ
      const now = new Date().toISOString();
      db.run(
        'INSERT INTO logs (event_type, event_time, username, action, details) VALUES (?, ?, ?, ?, ?)',
        ['Data Modification', now, req.user?.username || 'system', 'Update Release', `Updated release ID: ${id}`]
      );
      
      // 更新後のデータを返す
      const selectQuery = `
        SELECT release_id, release_number, title, description, status, type, priority,
               planned_start_date, planned_end_date, actual_start_date, actual_end_date,
               go_live_date, deployment_notes, rollback_plan, success_criteria, 
               responsible_team, created_date, updated_date
        FROM releases 
        WHERE release_id = ?
      `;
      
      db.get(selectQuery, [id], (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'データベースエラーが発生しました' });
        }
        
        const frontendRelease = mapDatabaseToFrontend(row);
        res.json(frontendRelease);
      });
    });
  });
};

/**
 * リリース削除
 */
const deleteRelease = (req, res) => {
  const { id } = req.params;
  
  // 存在確認
  db.get(
    'SELECT title, responsible_team FROM releases WHERE release_id = ?',
    [id],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'リリースが見つかりません' });
      }
      
      // 権限チェック（管理者のみ削除可能）
      if (req.user && req.user.role !== 'administrator') {
        return res.status(403).json({ 
          error: 'リリースの削除は管理者のみ可能です',
          current_user: req.user.username,
          current_role: req.user.role
        });
      }
      
      // 削除実行
      db.run(
        'DELETE FROM releases WHERE release_id = ?',
        [id],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'データベースエラーが発生しました' });
          }
          
          // 監査ログ
          const now = new Date().toISOString();
          db.run(
            'INSERT INTO logs (event_type, event_time, username, action, details) VALUES (?, ?, ?, ?, ?)',
            ['Data Modification', now, req.user?.username || 'system', 'Delete Release', `Deleted release: ${row.title}`]
          );
          
          res.json({ 
            success: true, 
            message: 'リリースが正常に削除されました',
            deleted_id: id
          });
        }
      );
    }
  );
};

module.exports = {
  getReleases,
  getReleaseStats,
  getReleaseById,
  createRelease,
  updateRelease,
  deleteRelease
};