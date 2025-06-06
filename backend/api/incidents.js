// インシデント管理API実装
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'itsm.sqlite');

// データベース接続取得
function getDbConnection() {
  return new sqlite3.Database(DB_PATH);
}

// バリデーション関数
function validateIncidentData(data, isUpdate = false) {
  const errors = [];
  
  if (!isUpdate || data.title !== undefined) {
    if (!data.title || data.title.trim().length === 0) {
      errors.push('タイトルは必須です');
    } else if (data.title.length > 200) {
      errors.push('タイトルは200文字以内で入力してください');
    }
  }
  
  if (!isUpdate || data.description !== undefined) {
    if (!data.description || data.description.trim().length === 0) {
      errors.push('説明は必須です');
    } else if (data.description.length > 2000) {
      errors.push('説明は2000文字以内で入力してください');
    }
  }
  
  if (!isUpdate || data.reported_by !== undefined) {
    if (!data.reported_by || data.reported_by.trim().length === 0) {
      errors.push('報告者は必須です');
    }
  }
  
  if (data.status && !['Open', 'In Progress', 'Resolved', 'Closed', 'Pending'].includes(data.status)) {
    errors.push('無効なステータスです');
  }
  
  if (data.priority && !['Low', 'Medium', 'High', 'Critical'].includes(data.priority)) {
    errors.push('無効な優先度です');
  }
  
  if (data.impact && !['Low', 'Medium', 'High'].includes(data.impact)) {
    errors.push('無効な影響度です');
  }
  
  if (data.urgency && !['Low', 'Medium', 'High'].includes(data.urgency)) {
    errors.push('無効な緊急度です');
  }
  
  return errors;
}

// インシデント一覧取得
function getIncidents(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    
    // フィルター条件
    const { status, priority, category, assigned_to, search } = req.query;
    
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
    
    if (category) {
      whereConditions.push('category = ?');
      params.push(category);
    }
    
    if (assigned_to) {
      whereConditions.push('assigned_to = ?');
      params.push(assigned_to);
    }
    
    if (search) {
      whereConditions.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const db = getDbConnection();
    
    // 総件数取得
    const countQuery = `SELECT COUNT(*) as total FROM incidents ${whereClause}`;
    
    db.get(countQuery, params, (err, countResult) => {
      if (err) {
        console.error('Count query error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      // データ取得
      const dataQuery = `
        SELECT 
          incident_id as id,
          title,
          description,
          reported_by,
          assigned_to,
          status,
          priority,
          category,
          impact,
          urgency,
          resolution,
          workaround,
          created_at,
          updated_at,
          resolved_at,
          closed_at,
          related_assets,
          tags
        FROM incidents 
        ${whereClause}
        ORDER BY 
          CASE priority 
            WHEN 'Critical' THEN 1 
            WHEN 'High' THEN 2 
            WHEN 'Medium' THEN 3 
            WHEN 'Low' THEN 4 
          END,
          created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      db.all(dataQuery, [...params, limit, offset], (err, incidents) => {
        db.close();
        
        if (err) {
          console.error('Data query error:', err);
          return res.status(500).json({ error: 'データベースエラーが発生しました' });
        }
        
        // JSON文字列をパース
        const processedIncidents = incidents.map(incident => ({
          ...incident,
          relatedAssets: incident.relatedAssets ? JSON.parse(incident.relatedAssets) : [],
          tags: incident.tags ? JSON.parse(incident.tags) : []
        }));
        
        res.json({
          data: processedIncidents,
          pagination: {
            page,
            limit,
            total: countResult.total,
            totalPages: Math.ceil(countResult.total / limit)
          },
          filters: {
            status,
            priority,
            category,
            assigned_to,
            search
          }
        });
      });
    });
    
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

// インシデント詳細取得
function getIncidentById(req, res) {
  try {
    const incidentId = parseInt(req.params.id);
    
    if (!incidentId || incidentId <= 0) {
      return res.status(400).json({ error: '無効なインシデントIDです' });
    }
    
    const db = getDbConnection();
    
    const query = `
      SELECT 
        incident_id as id,
        title,
        description,
        reported_by,
        assigned_to,
        status,
        priority,
        category,
        impact,
        urgency,
        resolution,
        workaround,
        created_at,
        updated_at,
        resolved_at,
        closed_at,
        related_assets,
        tags
      FROM incidents 
      WHERE incident_id = ?
    `;
    
    db.get(query, [incidentId], (err, incident) => {
      db.close();
      
      if (err) {
        console.error('Get incident by ID error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      if (!incident) {
        return res.status(404).json({ error: 'インシデントが見つかりません' });
      }
      
      // JSON文字列をパース
      const processedIncident = {
        ...incident,
        relatedAssets: incident.relatedAssets ? JSON.parse(incident.relatedAssets) : [],
        tags: incident.tags ? JSON.parse(incident.tags) : []
      };
      
      res.json(processedIncident);
    });
    
  } catch (error) {
    console.error('Get incident by ID error:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

// インシデント作成
function createIncident(req, res) {
  try {
    console.log('Create incident request:', req.body);
    
    const errors = validateIncidentData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    const {
      title,
      description,
      reported_by,
      assigned_to,
      status = 'Open',
      priority = 'Medium',
      category = 'General',
      impact,
      urgency,
      resolution,
      workaround,
      relatedAssets = [],
      tags = []
    } = req.body;
    
    const db = getDbConnection();
    
    const query = `
      INSERT INTO incidents (
        title, description, reported_by, assigned_to, status, priority, category,
        impact, urgency, resolution, workaround, related_assets, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      title.trim(),
      description.trim(),
      reported_by.trim(),
      assigned_to || null,
      status,
      priority,
      category || 'General',
      impact || null,
      urgency || null,
      resolution || null,
      workaround || null,
      JSON.stringify(relatedAssets),
      JSON.stringify(tags)
    ];
    
    db.run(query, params, function(err) {
      if (err) {
        console.error('Create incident error:', err);
        db.close();
        return res.status(500).json({ error: 'インシデントの作成に失敗しました' });
      }
      
      const incidentId = this.lastID;
      
      // 作成されたインシデントを取得して返す
      db.get(
        'SELECT * FROM incidents WHERE incident_id = ?',
        [incidentId],
        (err, incident) => {
          db.close();
          
          if (err) {
            console.error('Get created incident error:', err);
            return res.status(500).json({ error: 'インシデントは作成されましたが、データの取得に失敗しました' });
          }
          
          console.log('Incident created successfully:', incidentId);
          
          res.status(201).json({
            message: 'インシデントが正常に作成されました',
            id: incidentId,
            incident: {
              ...incident,
              relatedAssets: incident.related_assets ? JSON.parse(incident.related_assets) : [],
              tags: incident.tags ? JSON.parse(incident.tags) : []
            }
          });
        }
      );
    });
    
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

// インシデント更新
function updateIncident(req, res) {
  try {
    const incidentId = parseInt(req.params.id);
    
    if (!incidentId || incidentId <= 0) {
      return res.status(400).json({ error: '無効なインシデントIDです' });
    }
    
    const errors = validateIncidentData(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    const db = getDbConnection();
    
    // 更新可能なフィールドのみを処理
    const updateFields = [];
    const params = [];
    
    const allowedFields = [
      'title', 'description', 'assigned_to', 'status', 'priority', 
      'category', 'impact', 'urgency', 'resolution', 'workaround'
    ];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    });
    
    // 特別処理が必要なフィールド
    if (req.body.relatedAssets !== undefined) {
      updateFields.push('related_assets = ?');
      params.push(JSON.stringify(req.body.relatedAssets));
    }
    
    if (req.body.tags !== undefined) {
      updateFields.push('tags = ?');
      params.push(JSON.stringify(req.body.tags));
    }
    
    // ステータスに応じた日時設定
    if (req.body.status === 'Resolved' && !req.body.resolved_at) {
      updateFields.push('resolved_at = CURRENT_TIMESTAMP');
    }
    
    if (req.body.status === 'Closed' && !req.body.closed_at) {
      updateFields.push('closed_at = CURRENT_TIMESTAMP');
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: '更新する項目がありません' });
    }
    
    params.push(incidentId);
    
    const query = `
      UPDATE incidents 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE incident_id = ?
    `;
    
    db.run(query, params, function(err) {
      if (err) {
        console.error('Update incident error:', err);
        db.close();
        return res.status(500).json({ error: 'インシデントの更新に失敗しました' });
      }
      
      if (this.changes === 0) {
        db.close();
        return res.status(404).json({ error: 'インシデントが見つかりません' });
      }
      
      // 更新されたインシデントを取得
      db.get(
        'SELECT * FROM incidents WHERE incident_id = ?',
        [incidentId],
        (err, incident) => {
          db.close();
          
          if (err) {
            console.error('Get updated incident error:', err);
            return res.status(500).json({ error: 'インシデントは更新されましたが、データの取得に失敗しました' });
          }
          
          res.json({
            message: 'インシデントが正常に更新されました',
            incident: {
              ...incident,
              relatedAssets: incident.related_assets ? JSON.parse(incident.related_assets) : [],
              tags: incident.tags ? JSON.parse(incident.tags) : []
            }
          });
        }
      );
    });
    
  } catch (error) {
    console.error('Update incident error:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

// インシデント削除
function deleteIncident(req, res) {
  try {
    const incidentId = parseInt(req.params.id);
    
    if (!incidentId || incidentId <= 0) {
      return res.status(400).json({ error: '無効なインシデントIDです' });
    }
    
    const db = getDbConnection();
    
    db.run('DELETE FROM incidents WHERE incident_id = ?', [incidentId], function(err) {
      db.close();
      
      if (err) {
        console.error('Delete incident error:', err);
        return res.status(500).json({ error: 'インシデントの削除に失敗しました' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'インシデントが見つかりません' });
      }
      
      res.json({ message: 'インシデントが正常に削除されました' });
    });
    
  } catch (error) {
    console.error('Delete incident error:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

// ステータス別集計
function getIncidentStats(req, res) {
  try {
    const db = getDbConnection();
    
    const query = `
      SELECT 
        status,
        priority,
        COUNT(*) as count
      FROM incidents 
      GROUP BY status, priority
      ORDER BY 
        CASE priority 
          WHEN 'Critical' THEN 1 
          WHEN 'High' THEN 2 
          WHEN 'Medium' THEN 3 
          WHEN 'Low' THEN 4 
        END,
        status
    `;
    
    db.all(query, [], (err, stats) => {
      db.close();
      
      if (err) {
        console.error('Get incident stats error:', err);
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      res.json(stats);
    });
    
  } catch (error) {
    console.error('Get incident stats error:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

module.exports = {
  getIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  deleteIncident,
  getIncidentStats
};