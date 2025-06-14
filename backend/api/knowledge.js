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
    INSERT INTO knowledge (article_number, title, content, category, author_user_id, created_date, updated_date)
    VALUES (?, ?, ?, ?, (SELECT user_id FROM users WHERE username = ? LIMIT 1), ?, datetime('now'))
  `;
  
  // Generate article number
  const articleNumber = `KB-${Date.now().toString().slice(-6)}`;
  
  db.run(query, [articleNumber, title, content, category, author, today], function(err) {
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
 * ナレッジ検索（強化版高度検索機能）
 */
const searchKnowledge = (req, res) => {
  const { q, category, created_by, date_from, date_to, search_type = 'all', tags, min_rating } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: '検索キーワードは2文字以上で入力してください' });
  }
  
  // キーワード分解（スペース区切りで複数キーワード対応）
  const keywords = q.trim().split(/\s+/).filter(keyword => keyword.length > 1);
  
  let whereConditions = [];
  let queryParams = [];
  
  // 検索タイプによる条件分岐
  if (search_type === 'title') {
    const titleConditions = keywords.map(keyword => 'title LIKE ?').join(' AND ');
    whereConditions.push(`(${titleConditions})`);
    keywords.forEach(keyword => queryParams.push(`%${keyword}%`));
  } else if (search_type === 'content') {
    const contentConditions = keywords.map(keyword => 'content LIKE ?').join(' AND ');
    whereConditions.push(`(${contentConditions})`);
    keywords.forEach(keyword => queryParams.push(`%${keyword}%`));
  } else { // 'all'
    const allConditions = keywords.map(keyword => '(title LIKE ? OR content LIKE ?)').join(' AND ');
    whereConditions.push(`(${allConditions})`);
    keywords.forEach(keyword => {
      queryParams.push(`%${keyword}%`, `%${keyword}%`);
    });
  }
  
  if (category) {
    whereConditions.push('category = ?');
    queryParams.push(category);
  }
  
  if (created_by) {
    whereConditions.push('created_by = ?');
    queryParams.push(created_by);
  }
  
  if (date_from) {
    whereConditions.push('DATE(created_date) >= ?');
    queryParams.push(date_from);
  }
  
  if (date_to) {
    whereConditions.push('DATE(created_date) <= ?');
    queryParams.push(date_to);
  }
  
  if (tags) {
    const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    if (tagList.length > 0) {
      const tagConditions = tagList.map(() => 'tags LIKE ?').join(' OR ');
      whereConditions.push(`(${tagConditions})`);
      tagList.forEach(tag => queryParams.push(`%${tag}%`));
    }
  }
  
  if (min_rating) {
    const minRatingValue = parseFloat(min_rating);
    if (!isNaN(minRatingValue)) {
      whereConditions.push('(rating_total * 1.0 / NULLIF(rating_count, 0)) >= ?');
      queryParams.push(minRatingValue);
    }
  }
  
  // 公開済みのみ表示
  whereConditions.push("(status IS NULL OR status = 'Published')");
  
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
    
    // 強化された関連度スコア計算
    let relevanceQuery = `
      SELECT knowledge_id, title, 
             SUBSTR(content, 1, 300) as excerpt,
             category, created_by, created_date, updated_date, tags,
             (rating_total * 1.0 / NULLIF(rating_count, 0)) as avg_rating,
             rating_count,
             (
    `;
    
    // タイトルでのマッチスコア
    keywords.forEach((keyword, index) => {
      if (index > 0) relevanceQuery += ' + ';
      relevanceQuery += `CASE WHEN title LIKE '%${keyword}%' THEN 20 ELSE 0 END`;
    });
    
    relevanceQuery += ' + ';
    
    // タイトル先頭マッチスコア
    keywords.forEach((keyword, index) => {
      if (index > 0) relevanceQuery += ' + ';
      relevanceQuery += `CASE WHEN title LIKE '${keyword}%' THEN 10 ELSE 0 END`;
    });
    
    relevanceQuery += ' + ';
    
    // コンテンツでのマッチ回数
    keywords.forEach((keyword, index) => {
      if (index > 0) relevanceQuery += ' + ';
      relevanceQuery += `(LENGTH(content) - LENGTH(REPLACE(UPPER(content), UPPER('${keyword}'), ''))) / LENGTH('${keyword}') * 2`;
    });
    
    relevanceQuery += ` + 
               CASE WHEN category = ? THEN 5 ELSE 0 END +
               CASE WHEN (rating_total * 1.0 / NULLIF(rating_count, 0)) >= 4.0 THEN 15 ELSE 0 END +
               CASE WHEN rating_count >= 5 THEN 10 ELSE 0 END
             ) as relevance_score
      FROM knowledge 
      ${whereClause} 
      ORDER BY relevance_score DESC, avg_rating DESC, updated_date DESC
      LIMIT ? OFFSET ?
    `;
    
    const searchParams = [...queryParams, category || '', limit, offset];
    
    db.all(relevanceQuery, searchParams, (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      // ハイライトされた抜粋を生成
      const enhancedRows = rows.map(row => {
        let highlightedExcerpt = row.excerpt;
        keywords.forEach(keyword => {
          const regex = new RegExp(`(${keyword})`, 'gi');
          highlightedExcerpt = highlightedExcerpt.replace(regex, '<mark>$1</mark>');
        });
        
        return {
          ...row,
          highlighted_excerpt: highlightedExcerpt,
          avg_rating: row.avg_rating ? parseFloat(row.avg_rating.toFixed(2)) : null,
          relevance_score: Math.round(row.relevance_score)
        };
      });
      
      // 関連キーワード推奨
      const suggestionQuery = `
        SELECT DISTINCT category, COUNT(*) as count
        FROM knowledge 
        WHERE (title LIKE ? OR content LIKE ?) AND status = 'Published'
        GROUP BY category 
        ORDER BY count DESC 
        LIMIT 5
      `;
      
      db.all(suggestionQuery, [`%${keywords[0]}%`, `%${keywords[0]}%`], (err, suggestions) => {
        if (err) {
          console.error('Database error:', err);
          suggestions = [];
        }
        
        res.json({
          data: enhancedRows,
          pagination: {
            page,
            limit,
            total,
            totalPages
          },
          search_query: q,
          keywords_used: keywords,
          search_type,
          filters: { category, created_by, date_from, date_to, tags, min_rating },
          suggestions: suggestions || [],
          search_metadata: {
            total_keywords: keywords.length,
            search_scope: search_type,
            results_with_rating: enhancedRows.filter(row => row.avg_rating).length
          }
        });
      });
    });
  });
};

/**
 * ナレッジ承認
 */
const approveKnowledge = (req, res) => {
  const { id } = req.params;
  const { approved, comments } = req.body;
  
  // 管理者権限チェック
  if (!req.user || req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'ナレッジの承認は管理者のみ可能です' });
  }
  
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
      
      const status = approved ? 'Published' : 'Archived';
      const approval_status = approved ? 'Approved' : 'Rejected';
      const now = new Date().toISOString();
      
      const query = `
        UPDATE knowledge 
        SET status = ?, approval_status = ?, approved_by_user_id = (SELECT user_id FROM users WHERE username = ? LIMIT 1), updated_date = ?
        WHERE knowledge_id = ?
      `;
      
      db.run(query, [status, approval_status, req.user.username, now, id], function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'データベースエラーが発生しました' });
        }
        
        // 監査ログ
        db.run(
          'INSERT INTO logs (event_type, event_time, user, detail) VALUES (?, ?, ?, ?)',
          ['KNOWLEDGE_APPROVE', now, req.user.username, `${approved ? 'Approved' : 'Rejected'} knowledge article ID: ${id}${comments ? ' - ' + comments : ''}`]
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
            
            res.json({
              success: true,
              message: `ナレッジが正常に${approved ? '承認' : '却下'}されました`,
              data: row
            });
          }
        );
      });
    }
  );
};

/**
 * ナレッジ評価
 */
const rateKnowledge = (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  
  // 評価値検証
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: '評価は1-5の範囲で入力してください' });
  }
  
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
      
      const now = new Date().toISOString();
      
      // 評価記録の保存（拡張スキーマ使用）
      const currentTotal = existingKnowledge.rating_total || 0;
      const ratingCount = existingKnowledge.rating_count || 0;
      const newTotal = currentTotal + rating;
      const newCount = ratingCount + 1;
      
      const query = `
        UPDATE knowledge 
        SET rating_total = ?, rating_count = ?, updated_date = ?
        WHERE knowledge_id = ?
      `;
      
      db.run(query, [newTotal, newCount, now, id], function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'データベースエラーが発生しました' });
        }
        
        // 監査ログ
        db.run(
          'INSERT INTO logs (event_type, event_time, user, detail) VALUES (?, ?, ?, ?)',
          ['KNOWLEDGE_RATE', now, req.user?.username || 'anonymous', `Rated knowledge article ID: ${id} with ${rating} stars${comment ? ' - ' + comment : ''}`]
        );
        
        res.json({
          success: true,
          message: 'ナレッジの評価が正常に記録されました',
          rating: {
            average: parseFloat((newTotal / newCount).toFixed(2)),
            count: newCount,
            user_rating: rating
          }
        });
      });
    }
  );
};

/**
 * 関連ナレッジ推奨（コンテンツベースフィルタリング）
 */
const getRelatedKnowledge = (req, res) => {
  const { id } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 5, 10);
  
  // 現在のナレッジ情報取得
  db.get(
    'SELECT title, content, category, tags FROM knowledge WHERE knowledge_id = ?',
    [id],
    (err, currentKnowledge) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!currentKnowledge) {
        return res.status(404).json({ error: 'ナレッジが見つかりません' });
      }
      
      // キーワード抽出（タイトルから重要な単語を抽出）
      const titleWords = currentKnowledge.title
        .toLowerCase()
        .replace(/[^\w\sあ-んア-ン一-龯]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2);
      
      // タグがある場合はタグも使用
      const tags = currentKnowledge.tags ? 
        currentKnowledge.tags.split(',').map(tag => tag.trim()) : [];
      
      const searchTerms = [...titleWords, ...tags].slice(0, 5); // 上位5個のキーワード
      
      if (searchTerms.length === 0) {
        // キーワードがない場合はカテゴリー同じものを返す
        const categoryQuery = `
          SELECT knowledge_id, title, 
                 SUBSTR(content, 1, 200) as excerpt,
                 category, created_by, updated_date,
                 (rating_total * 1.0 / NULLIF(rating_count, 0)) as avg_rating,
                 rating_count
          FROM knowledge 
          WHERE category = ? AND knowledge_id != ? AND (status IS NULL OR status = 'Published')
          ORDER BY (rating_total * 1.0 / NULLIF(rating_count, 0)) DESC, updated_date DESC
          LIMIT ?
        `;
        
        db.all(categoryQuery, [currentKnowledge.category, id, limit], (err, rows) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'データベースエラーが発生しました' });
          }
          
          res.json({
            success: true,
            current_knowledge_id: id,
            related_knowledge: rows.map(row => ({
              ...row,
              avg_rating: row.avg_rating ? parseFloat(row.avg_rating.toFixed(2)) : null,
              relationship_reason: 'same_category'
            })),
            recommendation_basis: 'category_match'
          });
        });
        return;
      }
      
      // 関連度スコアでソート
      const relatedQuery = `
        SELECT knowledge_id, title, 
               SUBSTR(content, 1, 200) as excerpt,
               category, created_by, updated_date, tags,
               (rating_total * 1.0 / NULLIF(rating_count, 0)) as avg_rating,
               rating_count,
               (
                 CASE WHEN category = ? THEN 20 ELSE 0 END +
                 ${searchTerms.map(() => 'CASE WHEN (title LIKE ? OR content LIKE ? OR tags LIKE ?) THEN 10 ELSE 0 END').join(' + ')}
               ) as relevance_score
        FROM knowledge 
        WHERE knowledge_id != ? AND (status IS NULL OR status = 'Published')
        HAVING relevance_score > 0
        ORDER BY relevance_score DESC, (rating_total * 1.0 / NULLIF(rating_count, 0)) DESC, updated_date DESC
        LIMIT ?
      `;
      
      const queryParams = [currentKnowledge.category];
      searchTerms.forEach(term => {
        queryParams.push(`%${term}%`, `%${term}%`, `%${term}%`);
      });
      queryParams.push(id, limit);
      
      db.all(relatedQuery, queryParams, (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'データベースエラーが発生しました' });
        }
        
        const enhancedRows = rows.map(row => {
          let relationshipReason = [];
          if (row.category === currentKnowledge.category) relationshipReason.push('same_category');
          
          searchTerms.forEach(term => {
            if (row.title.toLowerCase().includes(term.toLowerCase())) relationshipReason.push('title_match');
            if (row.tags && row.tags.toLowerCase().includes(term.toLowerCase())) relationshipReason.push('tag_match');
          });
          
          return {
            ...row,
            avg_rating: row.avg_rating ? parseFloat(row.avg_rating.toFixed(2)) : null,
            relevance_score: Math.round(row.relevance_score),
            relationship_reason: relationshipReason.join(', ') || 'content_match'
          };
        });
        
        res.json({
          success: true,
          current_knowledge_id: id,
          related_knowledge: enhancedRows,
          recommendation_basis: 'content_similarity',
          search_terms_used: searchTerms
        });
      });
    }
  );
};

/**
 * ナレッジベース検索推奨（よく検索されるキーワード等）
 */
const getSearchSuggestions = (req, res) => {
  const { query } = req.query;
  
  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'クエリは2文字以上で入力してください' });
  }
  
  const queries = [
    // タイトルの部分一致
    `SELECT title as suggestion, 'title' as type, COUNT(*) as frequency
     FROM knowledge 
     WHERE title LIKE ? AND (status IS NULL OR status = 'Published')
     GROUP BY title 
     ORDER BY frequency DESC 
     LIMIT 5`,
    
    // カテゴリー推奨
    `SELECT category as suggestion, 'category' as type, COUNT(*) as frequency
     FROM knowledge 
     WHERE category LIKE ? AND (status IS NULL OR status = 'Published')
     GROUP BY category 
     ORDER BY frequency DESC 
     LIMIT 3`,
    
    // タグ推奨
    `SELECT DISTINCT TRIM(tag_value) as suggestion, 'tag' as type, 1 as frequency
     FROM (
       SELECT TRIM(SUBSTR(tags, 1, INSTR(tags||',', ',')-1)) as tag_value FROM knowledge WHERE tags LIKE ? AND tags IS NOT NULL
       UNION ALL
       SELECT TRIM(SUBSTR(tags, INSTR(tags, ',')+1)) as tag_value FROM knowledge WHERE tags LIKE ? AND INSTR(tags, ',') > 0
     ) tag_split
     WHERE tag_value LIKE ?
     LIMIT 3`
  ];
  
  const searchPattern = `%${query}%`;
  
  Promise.all([
    new Promise((resolve, reject) => {
      db.all(queries[0], [searchPattern], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),
    new Promise((resolve, reject) => {
      db.all(queries[1], [searchPattern], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),
    new Promise((resolve, reject) => {
      db.all(queries[2], [searchPattern, searchPattern, searchPattern], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    })
  ])
  .then(([titleSuggestions, categorySuggestions, tagSuggestions]) => {
    const allSuggestions = [
      ...titleSuggestions,
      ...categorySuggestions,
      ...tagSuggestions
    ];
    
    // 重複除去とソート
    const uniqueSuggestions = allSuggestions
      .filter((suggestion, index, self) => 
        index === self.findIndex(s => s.suggestion === suggestion.suggestion))
      .sort((a, b) => {
        // タイプ別優先度: title > category > tag
        const typeOrder = { title: 3, category: 2, tag: 1 };
        if (typeOrder[a.type] !== typeOrder[b.type]) {
          return typeOrder[b.type] - typeOrder[a.type];
        }
        return b.frequency - a.frequency;
      })
      .slice(0, 10);
    
    res.json({
      success: true,
      query,
      suggestions: uniqueSuggestions,
      total_suggestions: uniqueSuggestions.length
    });
  })
  .catch(err => {
    console.error('Database error:', err);
    res.status(500).json({ error: 'データベースエラーが発生しました' });
  });
};

module.exports = {
  getKnowledge,
  getKnowledgeStats,
  getKnowledgeById,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
  searchKnowledge,
  getRelatedKnowledge,
  getSearchSuggestions,
  approveKnowledge,
  rateKnowledge
};