// 資産管理API実装
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'itsm.sqlite');

// データベース接続取得
function getDbConnection() {
  return new sqlite3.Database(DB_PATH);
}

// 資産タグ生成関数
function generateAssetTag(type) {
  const tagPrefixes = {
    'Server': 'SRV',
    'Desktop': 'DSK', 
    'Laptop': 'LAP',
    'Tablet': 'TAB',
    'Phone': 'PHN',
    'Network Equipment': 'NET',
    'Storage': 'STG',
    'Printer': 'PRT',
    'Monitor': 'MON',
    'Peripheral': 'PER',
    'Software': 'SFT',
    'License': 'LIC',
    'Virtual Machine': 'VM',
    'Cloud Service': 'CLD',
    'Other': 'OTH'
  };
  
  const prefix = tagPrefixes[type] || 'AST';
  return `${prefix}-${String(Date.now()).slice(-6)}`;
}

// 次の連番資産タグ生成関数
function generateNextAssetTag(type, callback) {
  const tagPrefixes = {
    'Server': 'SRV',
    'Desktop': 'DSK', 
    'Laptop': 'LAP',
    'Tablet': 'TAB',
    'Phone': 'PHN',
    'Network Equipment': 'NET',
    'Storage': 'STG',
    'Printer': 'PRT',
    'Monitor': 'MON',
    'Peripheral': 'PER',
    'Software': 'SFT',
    'License': 'LIC',
    'Virtual Machine': 'VM',
    'Cloud Service': 'CLD',
    'Other': 'OTH'
  };
  
  const prefix = tagPrefixes[type] || 'AST';
  const db = getDbConnection();
  
  // 同じプレフィックスを持つ最大の番号を取得
  db.get(
    `SELECT asset_tag FROM assets 
     WHERE asset_tag LIKE ? 
     ORDER BY CAST(SUBSTR(asset_tag, LENGTH(?) + 2) AS INTEGER) DESC 
     LIMIT 1`,
    [`${prefix}-%`, prefix],
    (err, row) => {
      db.close();
      
      if (err) {
        console.error('Error generating asset tag:', err);
        return callback(generateAssetTag(type)); // フォールバック
      }
      
      let nextNumber = 1;
      if (row && row.asset_tag) {
        const match = row.asset_tag.match(new RegExp(`^${prefix}-(\\d+)$`));
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      
      const nextTag = `${prefix}-${String(nextNumber).padStart(3, '0')}`;
      callback(nextTag);
    }
  );
}

// バリデーション関数
function validateAssetData(data, isUpdate = false) {
  const errors = [];
  
  if (!isUpdate || data.asset_tag !== undefined) {
    if (!data.asset_tag || data.asset_tag.trim().length === 0) {
      errors.push('資産タグは必須です');
    } else if (data.asset_tag.length > 50) {
      errors.push('資産タグは50文字以内で入力してください');
    }
  }
  
  if (!isUpdate || data.name !== undefined) {
    if (!data.name || data.name.trim().length === 0) {
      errors.push('資産名は必須です');
    } else if (data.name.length > 200) {
      errors.push('資産名は200文字以内で入力してください');
    }
  }
  
  if (data.status && !['Active', 'Inactive', 'Maintenance', 'Retired', 'Lost', 'Stolen', 'Disposed'].includes(data.status)) {
    errors.push('無効なステータスです');
  }
  
  if (data.category && data.category.length > 100) {
    errors.push('カテゴリは100文字以内で入力してください');
  }
  
  if (data.purchase_cost && (isNaN(data.purchase_cost) || data.purchase_cost < 0)) {
    errors.push('購入費用は正の数値を入力してください');
  }
  
  // 日付形式チェック
  const dateFields = ['purchase_date', 'warranty_expiry', 'last_maintenance', 'next_maintenance'];
  dateFields.forEach(field => {
    if (data[field] && data[field] !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(data[field])) {
      errors.push(`${field}は YYYY-MM-DD 形式で入力してください`);
    }
  });
  
  // IPアドレス形式チェック（簡易）
  if (data.ip_address && data.ip_address !== '' && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(data.ip_address)) {
    errors.push('IPアドレスの形式が正しくありません');
  }
  
  // MACアドレス形式チェック（簡易）
  if (data.mac_address && data.mac_address !== '' && !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(data.mac_address)) {
    errors.push('MACアドレスの形式が正しくありません');
  }
  
  return errors;
}

// 資産一覧取得
const getAssets = (req, res) => {
  console.log('Getting assets with query:', req.query);
  
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  
  // フィルター条件
  const filters = {};
  if (req.query.status) filters.status = req.query.status;
  if (req.query.category) filters.category = req.query.category;
  if (req.query.location) filters.location = req.query.location;
  if (req.query.assigned_to) filters.assigned_to = req.query.assigned_to;
  if (req.query.search) filters.search = req.query.search;
  
  // WHERE句構築
  let whereClause = '';
  let whereParams = [];
  
  if (Object.keys(filters).length > 0) {
    const conditions = [];
    
    if (filters.status) {
      conditions.push('status = ?');
      whereParams.push(filters.status);
    }
    
    if (filters.category) {
      conditions.push('category = ?');
      whereParams.push(filters.category);
    }
    
    if (filters.location) {
      conditions.push('location LIKE ?');
      whereParams.push(`%${filters.location}%`);
    }
    
    if (filters.assigned_to) {
      conditions.push('assigned_to = ?');
      whereParams.push(filters.assigned_to);
    }
    
    if (filters.search) {
      conditions.push('(name LIKE ? OR asset_tag LIKE ? OR description LIKE ? OR manufacturer LIKE ? OR model LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      whereParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }
  
  const db = getDbConnection();
  
  // 総件数取得
  db.get(
    `SELECT COUNT(*) as total FROM assets ${whereClause}`,
    whereParams,
    (err, countResult) => {
      if (err) {
        console.error('Count assets error:', err);
        db.close();
        return res.status(500).json({ error: 'データベースエラーが発生しました' });
      }
      
      // データ取得
      const dataQuery = `
        SELECT 
          asset_id as id,
          asset_tag,
          name,
          description,
          category,
          type,
          manufacturer,
          model,
          serial_number,
          location,
          department,
          owner,
          assigned_to,
          status,
          purchase_date,
          purchase_cost,
          warranty_expiry,
          last_maintenance,
          next_maintenance,
          ip_address,
          mac_address,
          operating_system,
          software_licenses,
          configuration,
          notes,
          tags,
          created_at,
          updated_at,
          created_by,
          updated_by
        FROM assets 
        ${whereClause}
        ORDER BY 
          CASE status 
            WHEN 'Active' THEN 1 
            WHEN 'Maintenance' THEN 2 
            WHEN 'Inactive' THEN 3 
            ELSE 4 
          END, 
          created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      db.all(
        dataQuery,
        [...whereParams, limit, offset],
        (err, assets) => {
          db.close();
          
          if (err) {
            console.error('Get assets error:', err);
            return res.status(500).json({ error: 'データベースエラーが発生しました' });
          }
          
          // JSONフィールドをパース
          const processedAssets = assets.map(asset => ({
            ...asset,
            software_licenses: asset.software_licenses ? JSON.parse(asset.software_licenses) : [],
            configuration: asset.configuration ? JSON.parse(asset.configuration) : {},
            tags: asset.tags ? JSON.parse(asset.tags) : []
          }));
          
          const totalPages = Math.ceil(countResult.total / limit);
          
          console.log(`Found ${processedAssets.length} assets (${countResult.total} total)`);
          
          res.json({
            data: processedAssets,
            pagination: {
              page,
              limit,
              total: countResult.total,
              totalPages
            },
            filters
          });
        }
      );
    }
  );
};

// 資産詳細取得
const getAssetById = (req, res) => {
  const assetId = req.params.id;
  console.log('Getting asset by ID:', assetId);
  
  if (!assetId || isNaN(assetId)) {
    return res.status(400).json({ error: '有効な資産IDを指定してください' });
  }
  
  const db = getDbConnection();
  
  const query = `
    SELECT 
      asset_id as id,
      asset_tag,
      name,
      description,
      category,
      type,
      manufacturer,
      model,
      serial_number,
      location,
      department,
      owner,
      assigned_to,
      status,
      purchase_date,
      purchase_cost,
      warranty_expiry,
      last_maintenance,
      next_maintenance,
      ip_address,
      mac_address,
      operating_system,
      software_licenses,
      configuration,
      notes,
      tags,
      created_at,
      updated_at,
      created_by,
      updated_by
    FROM assets 
    WHERE asset_id = ?
  `;
  
  db.get(query, [assetId], (err, asset) => {
    db.close();
    
    if (err) {
      console.error('Get asset by ID error:', err);
      return res.status(500).json({ error: 'データベースエラーが発生しました' });
    }
    
    if (!asset) {
      return res.status(404).json({ error: '指定された資産が見つかりません' });
    }
    
    // JSONフィールドをパース
    const processedAsset = {
      ...asset,
      software_licenses: asset.software_licenses ? JSON.parse(asset.software_licenses) : [],
      configuration: asset.configuration ? JSON.parse(asset.configuration) : {},
      tags: asset.tags ? JSON.parse(asset.tags) : []
    };
    
    console.log('Asset found:', processedAsset.asset_tag);
    res.json({ data: processedAsset });
  });
};

// 資産作成
const createAsset = (req, res) => {
  console.log('Creating asset:', req.body);
  
  const {
    asset_tag, name, description, category, type, manufacturer, model,
    serial_number, location, department, owner, assigned_to, status,
    purchase_date, purchase_cost, warranty_expiry, last_maintenance, next_maintenance,
    ip_address, mac_address, operating_system, software_licenses, configuration,
    notes, tags, created_by
  } = req.body;
  
  // バリデーション
  const validationErrors = validateAssetData(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ 
      error: 'バリデーションエラー',
      details: validationErrors 
    });
  }
  
  const db = getDbConnection();
  
  const query = `
    INSERT INTO assets (
      asset_tag, name, description, category, type, manufacturer, model,
      serial_number, location, department, owner, assigned_to, status,
      purchase_date, purchase_cost, warranty_expiry, last_maintenance, next_maintenance,
      ip_address, mac_address, operating_system, software_licenses, configuration,
      notes, tags, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    asset_tag?.trim(),
    name?.trim(),
    description?.trim() || null,
    category || 'Hardware',
    type || null,
    manufacturer || null,
    model || null,
    serial_number || null,
    location || null,
    department || null,
    owner || null,
    assigned_to || null,
    status || 'Active',
    purchase_date || null,
    purchase_cost || null,
    warranty_expiry || null,
    last_maintenance || null,
    next_maintenance || null,
    ip_address || null,
    mac_address || null,
    operating_system || null,
    JSON.stringify(software_licenses || []),
    JSON.stringify(configuration || {}),
    notes?.trim() || null,
    JSON.stringify(tags || []),
    created_by || null
  ];
  
  db.run(query, params, function(err) {
    if (err) {
      console.error('Create asset error:', err);
      console.error('Error code:', err.code);
      console.error('Error errno:', err.errno);
      db.close();
      
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === 'SQLITE_CONSTRAINT' || err.errno === 19) {
        return res.status(400).json({ error: '同じ資産タグが既に存在します' });
      }
      
      return res.status(500).json({ error: '資産の作成に失敗しました' });
    }
    
    const assetId = this.lastID;
    
    // 作成された資産を取得して返す
    db.get(
      'SELECT * FROM assets WHERE asset_id = ?',
      [assetId],
      (err, asset) => {
        db.close();
        
        if (err) {
          console.error('Get created asset error:', err);
          return res.status(500).json({ error: '資産は作成されましたが、データの取得に失敗しました' });
        }
        
        console.log('Asset created successfully:', assetId);
        
        res.status(201).json({
          message: '資産が正常に作成されました',
          id: assetId,
          data: {
            ...asset,
            software_licenses: asset.software_licenses ? JSON.parse(asset.software_licenses) : [],
            configuration: asset.configuration ? JSON.parse(asset.configuration) : {},
            tags: asset.tags ? JSON.parse(asset.tags) : []
          }
        });
      }
    );
  });
};

// 資産更新
const updateAsset = (req, res) => {
  const assetId = req.params.id;
  console.log('Updating asset:', assetId, req.body);
  
  if (!assetId || isNaN(assetId)) {
    return res.status(400).json({ error: '有効な資産IDを指定してください' });
  }
  
  // バリデーション
  const validationErrors = validateAssetData(req.body, true);
  if (validationErrors.length > 0) {
    return res.status(400).json({ 
      error: 'バリデーションエラー',
      details: validationErrors 
    });
  }
  
  const {
    asset_tag, name, description, category, type, manufacturer, model,
    serial_number, location, department, owner, assigned_to, status,
    purchase_date, purchase_cost, warranty_expiry, last_maintenance, next_maintenance,
    ip_address, mac_address, operating_system, software_licenses, configuration,
    notes, tags, updated_by
  } = req.body;
  
  const db = getDbConnection();
  
  // 更新するフィールドを動的に構築
  const updateFields = [];
  const updateParams = [];
  
  if (asset_tag !== undefined) { updateFields.push('asset_tag = ?'); updateParams.push(asset_tag?.trim()); }
  if (name !== undefined) { updateFields.push('name = ?'); updateParams.push(name?.trim()); }
  if (description !== undefined) { updateFields.push('description = ?'); updateParams.push(description?.trim() || null); }
  if (category !== undefined) { updateFields.push('category = ?'); updateParams.push(category); }
  if (type !== undefined) { updateFields.push('type = ?'); updateParams.push(type || null); }
  if (manufacturer !== undefined) { updateFields.push('manufacturer = ?'); updateParams.push(manufacturer || null); }
  if (model !== undefined) { updateFields.push('model = ?'); updateParams.push(model || null); }
  if (serial_number !== undefined) { updateFields.push('serial_number = ?'); updateParams.push(serial_number || null); }
  if (location !== undefined) { updateFields.push('location = ?'); updateParams.push(location || null); }
  if (department !== undefined) { updateFields.push('department = ?'); updateParams.push(department || null); }
  if (owner !== undefined) { updateFields.push('owner = ?'); updateParams.push(owner || null); }
  if (assigned_to !== undefined) { updateFields.push('assigned_to = ?'); updateParams.push(assigned_to || null); }
  if (status !== undefined) { updateFields.push('status = ?'); updateParams.push(status); }
  if (purchase_date !== undefined) { updateFields.push('purchase_date = ?'); updateParams.push(purchase_date || null); }
  if (purchase_cost !== undefined) { updateFields.push('purchase_cost = ?'); updateParams.push(purchase_cost || null); }
  if (warranty_expiry !== undefined) { updateFields.push('warranty_expiry = ?'); updateParams.push(warranty_expiry || null); }
  if (last_maintenance !== undefined) { updateFields.push('last_maintenance = ?'); updateParams.push(last_maintenance || null); }
  if (next_maintenance !== undefined) { updateFields.push('next_maintenance = ?'); updateParams.push(next_maintenance || null); }
  if (ip_address !== undefined) { updateFields.push('ip_address = ?'); updateParams.push(ip_address || null); }
  if (mac_address !== undefined) { updateFields.push('mac_address = ?'); updateParams.push(mac_address || null); }
  if (operating_system !== undefined) { updateFields.push('operating_system = ?'); updateParams.push(operating_system || null); }
  if (software_licenses !== undefined) { updateFields.push('software_licenses = ?'); updateParams.push(JSON.stringify(software_licenses || [])); }
  if (configuration !== undefined) { updateFields.push('configuration = ?'); updateParams.push(JSON.stringify(configuration || {})); }
  if (notes !== undefined) { updateFields.push('notes = ?'); updateParams.push(notes?.trim() || null); }
  if (tags !== undefined) { updateFields.push('tags = ?'); updateParams.push(JSON.stringify(tags || [])); }
  if (updated_by !== undefined) { updateFields.push('updated_by = ?'); updateParams.push(updated_by); }
  
  if (updateFields.length === 0) {
    return res.status(400).json({ error: '更新するフィールドが指定されていません' });
  }
  
  updateParams.push(assetId);
  
  const query = `UPDATE assets SET ${updateFields.join(', ')} WHERE asset_id = ?`;
  
  db.run(query, updateParams, function(err) {
    if (err) {
      console.error('Update asset error:', err);
      db.close();
      
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: '同じ資産タグが既に存在します' });
      }
      
      return res.status(500).json({ error: '資産の更新に失敗しました' });
    }
    
    if (this.changes === 0) {
      db.close();
      return res.status(404).json({ error: '指定された資産が見つかりません' });
    }
    
    // 更新された資産を取得して返す
    db.get(
      'SELECT * FROM assets WHERE asset_id = ?',
      [assetId],
      (err, asset) => {
        db.close();
        
        if (err) {
          console.error('Get updated asset error:', err);
          return res.status(500).json({ error: '資産は更新されましたが、データの取得に失敗しました' });
        }
        
        console.log('Asset updated successfully:', assetId);
        
        res.json({
          message: '資産が正常に更新されました',
          data: {
            ...asset,
            software_licenses: asset.software_licenses ? JSON.parse(asset.software_licenses) : [],
            configuration: asset.configuration ? JSON.parse(asset.configuration) : {},
            tags: asset.tags ? JSON.parse(asset.tags) : []
          }
        });
      }
    );
  });
};

// 資産削除
const deleteAsset = (req, res) => {
  const assetId = req.params.id;
  console.log('Deleting asset:', assetId);
  
  if (!assetId || isNaN(assetId)) {
    return res.status(400).json({ error: '有効な資産IDを指定してください' });
  }
  
  const db = getDbConnection();
  
  db.run(
    'DELETE FROM assets WHERE asset_id = ?',
    [assetId],
    function(err) {
      db.close();
      
      if (err) {
        console.error('Delete asset error:', err);
        return res.status(500).json({ error: '資産の削除に失敗しました' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: '指定された資産が見つかりません' });
      }
      
      console.log('Asset deleted successfully:', assetId);
      res.json({ message: '資産が正常に削除されました' });
    }
  );
};

// 資産タグ生成
const generateAssetTagEndpoint = (req, res) => {
  const { type } = req.query;
  
  if (!type) {
    return res.status(400).json({ error: '資産の種類を指定してください' });
  }
  
  generateNextAssetTag(type, (generatedTag) => {
    res.json({ assetTag: generatedTag });
  });
};

// 資産統計取得
const getAssetStats = (req, res) => {
  console.log('Getting asset statistics');
  
  const db = getDbConnection();
  
  // 複数の統計クエリを並行実行
  let completed = 0;
  const stats = {};
  
  // カテゴリ別統計
  db.all(
    'SELECT category, status, COUNT(*) as count, COALESCE(SUM(purchase_cost), 0) as total_cost FROM assets GROUP BY category, status',
    [],
    (err, categoryStats) => {
      if (err) {
        console.error('Category stats error:', err);
      } else {
        stats.byCategory = categoryStats;
      }
      completed++;
      if (completed === 4) sendStatsResponse();
    }
  );
  
  // ステータス別統計
  db.all(
    'SELECT status, COUNT(*) as count FROM assets GROUP BY status',
    [],
    (err, statusStats) => {
      if (err) {
        console.error('Status stats error:', err);
      } else {
        stats.byStatus = statusStats;
      }
      completed++;
      if (completed === 4) sendStatsResponse();
    }
  );
  
  // 保証期限統計
  db.all(
    `SELECT 
      CASE 
        WHEN warranty_expiry < date('now') THEN 'Expired'
        WHEN warranty_expiry < date('now', '+30 days') THEN 'Expiring Soon'
        ELSE 'Valid'
      END as warranty_status,
      COUNT(*) as count
    FROM assets 
    WHERE warranty_expiry IS NOT NULL
    GROUP BY warranty_status`,
    [],
    (err, warrantyStats) => {
      if (err) {
        console.error('Warranty stats error:', err);
      } else {
        stats.warranty = warrantyStats;
      }
      completed++;
      if (completed === 4) sendStatsResponse();
    }
  );
  
  // 全体統計
  db.get(
    `SELECT 
      COUNT(*) as total_assets,
      COALESCE(SUM(purchase_cost), 0) as total_cost,
      COALESCE(AVG(purchase_cost), 0) as avg_cost
    FROM assets`,
    [],
    (err, overallStats) => {
      if (err) {
        console.error('Overall stats error:', err);
      } else {
        stats.overall = overallStats;
      }
      completed++;
      if (completed === 4) sendStatsResponse();
    }
  );
  
  function sendStatsResponse() {
    db.close();
    
    if (Object.keys(stats).length === 0) {
      return res.status(500).json({ error: '統計データの取得に失敗しました' });
    }
    
    console.log('Asset statistics retrieved successfully');
    res.json(stats);
  }
};

module.exports = {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetStats,
  generateAssetTagEndpoint
};