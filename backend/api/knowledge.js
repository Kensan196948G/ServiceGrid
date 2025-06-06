const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// データベース接続
const dbPath = path.join(__dirname, '..', process.env.DB_PATH || 'db/itsm.sqlite');
const db = new sqlite3.Database(dbPath);

/**
 * ナレッジ一覧取得
 */
const getKnowledge = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  
  // フィルタリング条件
  const { category, created_by, search } = req.query;
  
  let whereConditions = [];
  let queryParams = [];
  
  if (category) {
    whereConditions.push('category = ?');
    queryParams.push(category);
  }
  
  if (created_by) {
    whereConditions.push('created_by = ?');
    queryParams.push(created_by);
  }
  
  if (search) {
    whereConditions.push('(title LIKE ? OR content LIKE ?)');
    queryParams.push(`%${search}%`, `%${search}%`);
  }
  
  const whereClause = whereConditions.length > 0 
    ? 'WHERE ' + whereConditions.join(' AND ') 
    : '';
  
  // カウントクエリ
  const countQuery = `SELECT COUNT(*) as total FROM knowledge ${whereClause}`;
  
  db.get(countQuery, queryParams, (err, countResult) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);
    
    // データ取得クエリ
    const dataQuery = `
      SELECT knowledge_id, title, 
             SUBSTR(content, 1, 200) as excerpt,
             category, created_by, created_date, updated_date
      FROM knowledge 
      ${whereClause} 
      ORDER BY updated_date DESC 
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
        filters: { category, created_by, search }
      });
    });
  });
};

/**
 * ナレッジ統計取得
 */
const getKnowledgeStats = (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total FROM knowledge',
    'SELECT category, COUNT(*) as count FROM knowledge GROUP BY category',
    'SELECT created_by, COUNT(*) as count FROM knowledge GROUP BY created_by ORDER BY count DESC LIMIT 10'
  ];
  
  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }))
  .then(([totalResult, categoryResult, authorResult]) => {
    res.json({
      total: totalResult[0].total,
      by_category: categoryResult.reduce((acc, row) => {
        acc[row.category] = row.count;
        return acc;
      }, {}),
      top_authors: authorResult
    });
  })
  .catch(err => {
    console.error('Database error:', err);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  });
};

/**
 * ナレッジ詳細取得
 */
const getKnowledgeById = (req, res) => {
  const { id } = req.params;
  
  db.get(
    'SELECT * FROM knowledge WHERE knowledge_id = ?',
    [id],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'ナレッジが見つかりません' });
      }
      
      res.json(row);
    }
  );
};

/**
 * ナレッジ作成
 */
const createKnowledge = (req, res) => {
  const {
    title,
    content,
    category,
    created_by
  } = req.body;
  
  // 入力検証
  if (!title || !content || !category) {
    return res.status(400).json({ 
      error: 'タイトル、内容、カテゴリは必須項目です',
      details: {
        title: !title ? 'タイトルが必要です' : null,
        content: !content ? '内容が必要です' : null,
        category: !category ? 'カテゴリが必要です' : null
      }
    });
  }
  
  if (title.length > 200) {
    return res.status(400).json({ error: 'タイトルは200文字以内で入力してください' });
  }
  
  if (content.length > 10000) {
    return res.status(400).json({ error: '内容は10000文字以内で入力してください' });
  }
  
  const author = created_by || req.user?.username || 'anonymous';
  const today = new Date().toISOString().split('T')[0];
  
  const query = `
    INSERT INTO knowledge (title, content, category, created_by, created_date, updated_date)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `;
  
  db.run(query, [title, content, category, author, today], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    // 監査ログ
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO logs (event_type, event_time, user, detail) VALUES (?, ?, ?, ?)',
      ['KNOWLEDGE_CREATE', now, req.user?.username || 'system', `Created knowledge article: ${title}`]
    );
    
    // 作成されたナレッジを返す
    db.get(
      'SELECT * FROM knowledge WHERE knowledge_id = ?',
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
 * ナレッジ更新
 */
const updateKnowledge = (req, res) => {
  const { id } = req.params;
  const {
    title,
    content,
    category
  } = req.body;
  
  // 既存データの確認
  db.get(
    'SELECT * FROM knowledge WHERE knowledge_id = ?',
    [id],
    (err, existingKnowledge) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!existingKnowledge) {
        return res.status(404).json({ error: 'ナレッジが見つかりません' });
      }
      
      // 権限チェック（作成者または管理者のみ編集可能）
      if (req.user && 
          req.user.username !== existingKnowledge.created_by && 
          req.user.role !== 'administrator') {
        return res.status(403).json({ 
          error: 'このナレッジを編集する権限がありません',
          owner: existingKnowledge.created_by,
          current_user: req.user.username
        });
      }
      
      // 更新するフィールドを決定
      const updatedData = {
        title: title || existingKnowledge.title,
        content: content || existingKnowledge.content,
        category: category || existingKnowledge.category,
        updated_date: new Date().toISOString()
      };
      
      const query = `
        UPDATE knowledge 
        SET title = ?, content = ?, category = ?, updated_date = ?
        WHERE knowledge_id = ?
      `;
      
      db.run(query, [
        updatedData.title,
        updatedData.content,
        updatedData.category,
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
          ['KNOWLEDGE_UPDATE', now, req.user?.username || 'system', `Updated knowledge article ID: ${id}`]
        );
        
        // 更新後のデータを返す
        db.get(
          'SELECT * FROM knowledge WHERE knowledge_id = ?',
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
 * ナレッジ削除
 */
const deleteKnowledge = (req, res) => {
  const { id } = req.params;
  
  // 存在確認
  db.get(
    'SELECT title, created_by FROM knowledge WHERE knowledge_id = ?',
    [id],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'ナレッジが見つかりません' });
      }
      
      // 権限チェック（作成者または管理者のみ削除可能）
      if (req.user && 
          req.user.username !== row.created_by && 
          req.user.role !== 'administrator') {
        return res.status(403).json({ 
          error: 'このナレッジを削除する権限がありません',
          owner: row.created_by,
          current_user: req.user.username
        });
      }
      
      // 削除実行
      db.run(
        'DELETE FROM knowledge WHERE knowledge_id = ?',
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
            ['KNOWLEDGE_DELETE', now, req.user?.username || 'system', `Deleted knowledge article: ${row.title}`]
          );
          
          res.json({ 
            success: true, 
            message: 'ナレッジが正常に削除されました',
            deleted_id: id
          });
        }
      );
    }
  );
};

/**
 * ナレッジ検索（高度検索機能）
 */
const searchKnowledge = (req, res) => {
  const { q, category, created_by, date_from, date_to } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: '検索キーワードは2文字以上で入力してください' });
  }
  
  let whereConditions = ['(title LIKE ? OR content LIKE ?)'];
  let queryParams = [`%${q}%`, `%${q}%`];
  
  if (category) {
    whereConditions.push('category = ?');
    queryParams.push(category);
  }
  
  if (created_by) {
    whereConditions.push('created_by = ?');
    queryParams.push(created_by);
  }
  
  if (date_from) {
    whereConditions.push('created_date >= ?');
    queryParams.push(date_from);
  }
  
  if (date_to) {
    whereConditions.push('created_date <= ?');
    queryParams.push(date_to);
  }
  
  const whereClause = 'WHERE ' + whereConditions.join(' AND ');
  
  // カウントクエリ
  const countQuery = `SELECT COUNT(*) as total FROM knowledge ${whereClause}`;
  
  db.get(countQuery, queryParams, (err, countResult) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);
    
    // データ取得クエリ（関連度でソート）
    const dataQuery = `
      SELECT knowledge_id, title, 
             SUBSTR(content, 1, 300) as excerpt,
             category, created_by, created_date, updated_date,
             CASE 
               WHEN title LIKE ? THEN 10
               WHEN title LIKE ? THEN 5
               ELSE 1
             END as relevance_score
      FROM knowledge 
      ${whereClause} 
      ORDER BY relevance_score DESC, updated_date DESC
      LIMIT ? OFFSET ?
    `;
    
    const searchParams = [`%${q}%`, `${q}%`, ...queryParams, limit, offset];
    
    db.all(dataQuery, searchParams, (err, rows) => {
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
        search_query: q,
        filters: { category, created_by, date_from, date_to }
      });
    });
  });
};

module.exports = {
  getKnowledge,
  getKnowledgeStats,
  getKnowledgeById,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
  searchKnowledge
};