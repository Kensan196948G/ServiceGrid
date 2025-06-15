/**
 * Enhanced Assets API with comprehensive security, validation, performance optimization,
 * and advanced features for ServiceGrid ITSM
 */

const { pool } = require('../services/enhanced-database');
const { 
  ITSMError,
  ERROR_TYPES,
  HTTP_STATUS,
  createValidationError,
  createDatabaseError,
  createNotFoundError,
  apiResponse,
  apiError,
  asyncHandler,
  validateRequiredFields,
  sanitizeInput
} = require('../utils/errorHandler');

// Asset validation schema
const ASSET_VALIDATION_SCHEMA = {
  name: { 
    required: true, 
    type: 'string', 
    minLength: 2, 
    maxLength: 200,
    pattern: /^[a-zA-Z0-9\s\-_.()]+$/
  },
  type: { 
    required: true, 
    enum: [
      'Server', 'Desktop', 'Laptop', 'Tablet', 'Phone', 
      'Network Equipment', 'Storage', 'Printer', 'Monitor', 
      'Peripheral', 'Software', 'License', 'Virtual Machine', 
      'Cloud Service', 'Other'
    ]
  },
  status: { 
    required: true, 
    enum: ['Active', 'Inactive', 'Maintenance', 'Retired', 'Lost', 'Stolen', 'Disposed']
  },
  asset_tag: { 
    required: true, 
    type: 'string', 
    pattern: /^[A-Z]{2,4}-\d{3,4}$/,
    unique: true
  },
  purchase_cost: { 
    type: 'number', 
    min: 0, 
    max: 999999999.99 
  },
  ip_address: { 
    pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    unique: true
  },
  mac_address: { 
    pattern: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
    unique: true
  },
  email: { 
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  serial_number: {
    type: 'string',
    maxLength: 100,
    unique: true
  }
};

// Asset category priorities for ordering
const ASSET_PRIORITIES = {
  'Critical': 1,
  'High': 2, 
  'Medium': 3,
  'Low': 4
};

/**
 * Comprehensive asset data validation
 */
function validateAssetData(data, isUpdate = false) {
  const errors = [];
  const sanitizedData = sanitizeInput(data);
  
  Object.entries(ASSET_VALIDATION_SCHEMA).forEach(([field, rules]) => {
    const value = sanitizedData[field];
    
    // Required field check (skip for updates unless explicitly provided)
    if (rules.required && !isUpdate && (!value || value.toString().trim() === '')) {
      errors.push(`${field} is required`);
      return;
    }
    
    // Skip validation if field is not provided in update
    if (isUpdate && value === undefined) return;
    
    if (value !== undefined && value !== null && value !== '') {
      // Type validation
      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push(`${field} must be a string`);
        return;
      }
      
      if (rules.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push(`${field} must be a valid number`);
          return;
        }
        if (rules.min !== undefined && num < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && num > rules.max) {
          errors.push(`${field} must not exceed ${rules.max}`);
        }
      }
      
      // String length validation
      if (typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must not exceed ${rules.maxLength} characters`);
        }
      }
      
      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }
      
      // Pattern validation
      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        errors.push(`${field} has invalid format`);
      }
    }
  });
  
  if (errors.length > 0) {
    throw createValidationError('Asset validation failed', { validationErrors: errors });
  }
  
  return sanitizedData;
}

/**
 * Check for unique constraint violations
 */
async function validateUniqueConstraints(data, excludeId = null) {
  const uniqueFields = Object.entries(ASSET_VALIDATION_SCHEMA)
    .filter(([field, rules]) => rules.unique && data[field])
    .map(([field]) => field);
  
  if (uniqueFields.length === 0) return;
  
  for (const field of uniqueFields) {
    const query = excludeId 
      ? `SELECT asset_id FROM assets WHERE ${field} = ? AND asset_id != ?`
      : `SELECT asset_id FROM assets WHERE ${field} = ?`;
    
    const params = excludeId ? [data[field], excludeId] : [data[field]];
    
    try {
      const existing = await pool.query(query, params);
      if (existing.length > 0) {
        throw createValidationError(`${field} '${data[field]}' already exists`);
      }
    } catch (error) {
      if (error instanceof ITSMError) throw error;
      throw createDatabaseError(`Failed to check unique constraint for ${field}`, error);
    }
  }
}

/**
 * Generate next available asset tag for a given type
 */
async function generateAssetTag(type) {
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
  
  try {
    const query = `
      SELECT MAX(CAST(SUBSTR(asset_tag, INSTR(asset_tag, "-") + 1) AS INTEGER)) as max_num 
      FROM assets 
      WHERE asset_tag LIKE ?
    `;
    
    const result = await pool.query(query, [`${prefix}-%`]);
    const nextNum = (result[0]?.max_num || 0) + 1;
    
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
    
  } catch (error) {
    throw createDatabaseError('Failed to generate asset tag', error);
  }
}

/**
 * Build dynamic WHERE clause for filtering
 */
function buildFilterClause(filters) {
  const conditions = [];
  const params = [];
  
  // Status filter
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      conditions.push(`status IN (${filters.status.map(() => '?').join(',')})`);
      params.push(...filters.status);
    } else {
      conditions.push('status = ?');
      params.push(filters.status);
    }
  }
  
  // Type filter
  if (filters.type) {
    if (Array.isArray(filters.type)) {
      conditions.push(`type IN (${filters.type.map(() => '?').join(',')})`);
      params.push(...filters.type);
    } else {
      conditions.push('type = ?');
      params.push(filters.type);
    }
  }
  
  // Category filter
  if (filters.category) {
    conditions.push('category = ?');
    params.push(filters.category);
  }
  
  // Location filter (partial match)
  if (filters.location) {
    conditions.push('location LIKE ?');
    params.push(`%${filters.location}%`);
  }
  
  // Department filter
  if (filters.department) {
    conditions.push('department = ?');
    params.push(filters.department);
  }
  
  // Owner filter
  if (filters.owner) {
    conditions.push('owner = ?');
    params.push(filters.owner);
  }
  
  // Assigned to filter
  if (filters.assigned_to) {
    conditions.push('assigned_to = ?');
    params.push(filters.assigned_to);
  }
  
  // Date range filters
  if (filters.purchase_date_from) {
    conditions.push('purchase_date >= ?');
    params.push(filters.purchase_date_from);
  }
  
  if (filters.purchase_date_to) {
    conditions.push('purchase_date <= ?');
    params.push(filters.purchase_date_to);
  }
  
  // Cost range filters
  if (filters.cost_min) {
    conditions.push('purchase_cost >= ?');
    params.push(parseFloat(filters.cost_min));
  }
  
  if (filters.cost_max) {
    conditions.push('purchase_cost <= ?');
    params.push(parseFloat(filters.cost_max));
  }
  
  // Warranty expiry filter
  if (filters.warranty_status) {
    switch (filters.warranty_status) {
      case 'expired':
        conditions.push('warranty_expiry < date("now")');
        break;
      case 'expiring_soon':
        conditions.push('warranty_expiry BETWEEN date("now") AND date("now", "+30 days")');
        break;
      case 'valid':
        conditions.push('warranty_expiry > date("now", "+30 days")');
        break;
    }
  }
  
  // Search filter (multiple fields)
  if (filters.search) {
    const searchFields = [
      'name', 'asset_tag', 'description', 'manufacturer', 
      'model', 'serial_number', 'location', 'notes'
    ];
    const searchConditions = searchFields.map(field => `${field} LIKE ?`);
    conditions.push(`(${searchConditions.join(' OR ')})`);
    
    const searchTerm = `%${filters.search}%`;
    params.push(...Array(searchFields.length).fill(searchTerm));
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  return { whereClause, params };
}

/**
 * Get assets with advanced filtering and pagination
 */
const getAssets = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  
  const sortBy = req.query.sort || 'created_at';
  const sortOrder = req.query.order === 'asc' ? 'ASC' : 'DESC';
  
  // Validate sort field to prevent SQL injection
  const allowedSortFields = [
    'asset_tag', 'name', 'type', 'status', 'created_at', 
    'updated_at', 'purchase_date', 'purchase_cost'
  ];
  
  if (!allowedSortFields.includes(sortBy)) {
    throw createValidationError(`Invalid sort field: ${sortBy}`);
  }
  
  const { whereClause, params } = buildFilterClause(req.query);
  
  try {
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM assets ${whereClause}`;
    const [countResult] = await pool.query(countQuery, params);
    
    // Get assets data with optimized query
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
        updated_by,
        -- Computed fields
        CASE 
          WHEN warranty_expiry < date('now') THEN 'expired'
          WHEN warranty_expiry < date('now', '+30 days') THEN 'expiring_soon'
          ELSE 'valid'
        END as warranty_status,
        julianday('now') - julianday(created_at) as age_days
      FROM assets 
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN '${sortBy}' = 'status' THEN
            CASE status 
              WHEN 'Active' THEN 1 
              WHEN 'Maintenance' THEN 2 
              WHEN 'Inactive' THEN 3 
              ELSE 4 
            END
          ELSE NULL
        END,
        ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    
    const assets = await pool.query(dataQuery, [...params, limit, offset], { cache: true });
    
    // Process JSON fields and compute additional properties
    const processedAssets = assets.map(asset => ({
      ...asset,
      software_licenses: asset.software_licenses ? JSON.parse(asset.software_licenses) : [],
      configuration: asset.configuration ? JSON.parse(asset.configuration) : {},
      tags: asset.tags ? JSON.parse(asset.tags) : [],
      age_days: Math.floor(asset.age_days),
      warranty_days_remaining: asset.warranty_expiry ? 
        Math.ceil((new Date(asset.warranty_expiry) - new Date()) / (1000 * 60 * 60 * 24)) : null
    }));
    
    const totalPages = Math.ceil(countResult.total / limit);
    
    return apiResponse(res, {
      assets: processedAssets,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: req.query,
      sort: { field: sortBy, order: sortOrder }
    });
    
  } catch (error) {
    throw createDatabaseError('Failed to retrieve assets', error);
  }
});

/**
 * Get asset by ID with related information
 */
const getAssetById = asyncHandler(async (req, res) => {
  const assetId = parseInt(req.params.id);
  
  if (!assetId || assetId <= 0) {
    throw createValidationError('Invalid asset ID');
  }
  
  try {
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
        updated_by,
        -- Computed fields
        CASE 
          WHEN warranty_expiry < date('now') THEN 'expired'
          WHEN warranty_expiry < date('now', '+30 days') THEN 'expiring_soon'
          ELSE 'valid'
        END as warranty_status,
        julianday('now') - julianday(created_at) as age_days
      FROM assets 
      WHERE asset_id = ?
    `;
    
    const assets = await pool.query(query, [assetId]);
    
    if (assets.length === 0) {
      throw createNotFoundError('Asset');
    }
    
    const asset = assets[0];
    
    // Process JSON fields
    const processedAsset = {
      ...asset,
      software_licenses: asset.software_licenses ? JSON.parse(asset.software_licenses) : [],
      configuration: asset.configuration ? JSON.parse(asset.configuration) : {},
      tags: asset.tags ? JSON.parse(asset.tags) : [],
      age_days: Math.floor(asset.age_days),
      warranty_days_remaining: asset.warranty_expiry ? 
        Math.ceil((new Date(asset.warranty_expiry) - new Date()) / (1000 * 60 * 60 * 24)) : null
    };
    
    // Get related incidents (last 5)
    const incidentsQuery = `
      SELECT incident_id, title, status, priority, created_at
      FROM incidents 
      WHERE related_assets LIKE ?
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    const relatedIncidents = await pool.query(incidentsQuery, [`%"${asset.asset_tag}"%`]);
    
    return apiResponse(res, {
      asset: processedAsset,
      related_incidents: relatedIncidents
    });
    
  } catch (error) {
    if (error instanceof ITSMError) throw error;
    throw createDatabaseError('Failed to retrieve asset', error);
  }
});

/**
 * Create new asset with comprehensive validation
 */
const createAsset = asyncHandler(async (req, res) => {
  const validatedData = validateAssetData(req.body);
  
  // Auto-generate asset tag if not provided
  if (!validatedData.asset_tag && validatedData.type) {
    validatedData.asset_tag = await generateAssetTag(validatedData.type);
  }
  
  // Check unique constraints
  await validateUniqueConstraints(validatedData);
  
  const {
    asset_tag, name, description, category, type, manufacturer, model,
    serial_number, location, department, owner, assigned_to, status,
    purchase_date, purchase_cost, warranty_expiry, last_maintenance, next_maintenance,
    ip_address, mac_address, operating_system, software_licenses, configuration,
    notes, tags, created_by
  } = validatedData;
  
  try {
    const query = `
      INSERT INTO assets (
        asset_tag, name, description, category, type, manufacturer, model,
        serial_number, location, department, owner, assigned_to, status,
        purchase_date, purchase_cost, warranty_expiry, last_maintenance, next_maintenance,
        ip_address, mac_address, operating_system, software_licenses, configuration,
        notes, tags, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    const params = [
      asset_tag,
      name,
      description || null,
      category || 'Hardware',
      type,
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
      notes || null,
      JSON.stringify(tags || []),
      created_by || req.user?.username || 'system'
    ];
    
    const result = await pool.query(query, params);
    
    // Fetch the created asset
    const createdAsset = await pool.query(
      'SELECT * FROM assets WHERE asset_id = ?',
      [result.lastID]
    );
    
    if (createdAsset.length === 0) {
      throw createDatabaseError('Failed to retrieve created asset');
    }
    
    const asset = createdAsset[0];
    
    return apiResponse(res, {
      message: 'Asset created successfully',
      asset: {
        ...asset,
        software_licenses: asset.software_licenses ? JSON.parse(asset.software_licenses) : [],
        configuration: asset.configuration ? JSON.parse(asset.configuration) : {},
        tags: asset.tags ? JSON.parse(asset.tags) : []
      }
    }, 'Asset created successfully', HTTP_STATUS.CREATED);
    
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      const field = error.message.includes('asset_tag') ? 'asset_tag' : 
                   error.message.includes('ip_address') ? 'ip_address' :
                   error.message.includes('mac_address') ? 'mac_address' :
                   error.message.includes('serial_number') ? 'serial_number' : 'unknown field';
      throw createValidationError(`Duplicate ${field}: value already exists`);
    }
    throw createDatabaseError('Failed to create asset', error);
  }
});

/**
 * Update asset with partial data support
 */
const updateAsset = asyncHandler(async (req, res) => {
  const assetId = parseInt(req.params.id);
  
  if (!assetId || assetId <= 0) {
    throw createValidationError('Invalid asset ID');
  }
  
  const validatedData = validateAssetData(req.body, true);
  
  // Check unique constraints (excluding current asset)
  await validateUniqueConstraints(validatedData, assetId);
  
  // Build dynamic update query
  const updateFields = [];
  const params = [];
  
  Object.entries(validatedData).forEach(([field, value]) => {
    if (value !== undefined) {
      if (['software_licenses', 'configuration', 'tags'].includes(field)) {
        updateFields.push(`${field} = ?`);
        params.push(JSON.stringify(value));
      } else {
        updateFields.push(`${field} = ?`);
        params.push(value);
      }
    }
  });
  
  if (updateFields.length === 0) {
    throw createValidationError('No fields to update');
  }
  
  // Add updated_by and updated_at
  updateFields.push('updated_by = ?', 'updated_at = CURRENT_TIMESTAMP');
  params.push(req.user?.username || 'system');
  params.push(assetId);
  
  try {
    const query = `UPDATE assets SET ${updateFields.join(', ')} WHERE asset_id = ?`;
    const result = await pool.query(query, params);
    
    if (result.changes === 0) {
      throw createNotFoundError('Asset');
    }
    
    // Fetch updated asset
    const updatedAsset = await pool.query(
      'SELECT * FROM assets WHERE asset_id = ?',
      [assetId]
    );
    
    const asset = updatedAsset[0];
    
    return apiResponse(res, {
      message: 'Asset updated successfully',
      asset: {
        ...asset,
        software_licenses: asset.software_licenses ? JSON.parse(asset.software_licenses) : [],
        configuration: asset.configuration ? JSON.parse(asset.configuration) : {},
        tags: asset.tags ? JSON.parse(asset.tags) : []
      }
    });
    
  } catch (error) {
    if (error instanceof ITSMError) throw error;
    throw createDatabaseError('Failed to update asset', error);
  }
});

/**
 * Delete asset with dependency checks
 */
const deleteAsset = asyncHandler(async (req, res) => {
  const assetId = parseInt(req.params.id);
  
  if (!assetId || assetId <= 0) {
    throw createValidationError('Invalid asset ID');
  }
  
  try {
    // Check if asset exists
    const existing = await pool.query('SELECT asset_tag FROM assets WHERE asset_id = ?', [assetId]);
    if (existing.length === 0) {
      throw createNotFoundError('Asset');
    }
    
    const assetTag = existing[0].asset_tag;
    
    // Check for dependencies
    const incidentCheck = await pool.query(
      'SELECT COUNT(*) as count FROM incidents WHERE related_assets LIKE ?',
      [`%"${assetTag}"%`]
    );
    
    if (incidentCheck[0].count > 0) {
      throw createValidationError(`Cannot delete asset: ${incidentCheck[0].count} related incidents exist`);
    }
    
    // Soft delete by updating status instead of hard delete
    const result = await pool.query(
      'UPDATE assets SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE asset_id = ?',
      ['Disposed', req.user?.username || 'system', assetId]
    );
    
    return apiResponse(res, {
      message: 'Asset marked as disposed successfully',
      asset_id: assetId
    });
    
  } catch (error) {
    if (error instanceof ITSMError) throw error;
    throw createDatabaseError('Failed to delete asset', error);
  }
});

/**
 * Get comprehensive asset statistics
 */
const getAssetStats = asyncHandler(async (req, res) => {
  try {
    const queries = [
      // Overall statistics
      `SELECT 
        COUNT(*) as total_assets,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_count,
        COUNT(CASE WHEN status = 'Maintenance' THEN 1 END) as maintenance_count,
        COUNT(CASE WHEN status = 'Retired' THEN 1 END) as retired_count,
        COALESCE(SUM(purchase_cost), 0) as total_value,
        COALESCE(AVG(purchase_cost), 0) as average_value
      FROM assets`,
      
      // By type
      `SELECT type, COUNT(*) as count, COALESCE(SUM(purchase_cost), 0) as total_cost
       FROM assets GROUP BY type ORDER BY count DESC`,
      
      // By status
      `SELECT status, COUNT(*) as count, COALESCE(SUM(purchase_cost), 0) as total_cost
       FROM assets GROUP BY status`,
      
      // Warranty status
      `SELECT 
        COUNT(CASE WHEN warranty_expiry < date('now') THEN 1 END) as expired,
        COUNT(CASE WHEN warranty_expiry BETWEEN date('now') AND date('now', '+30 days') THEN 1 END) as expiring_soon,
        COUNT(CASE WHEN warranty_expiry > date('now', '+30 days') THEN 1 END) as valid,
        COUNT(CASE WHEN warranty_expiry IS NULL THEN 1 END) as no_warranty
      FROM assets`,
      
      // Age distribution
      `SELECT 
        COUNT(CASE WHEN julianday('now') - julianday(created_at) <= 365 THEN 1 END) as less_than_1_year,
        COUNT(CASE WHEN julianday('now') - julianday(created_at) BETWEEN 365 AND 1095 THEN 1 END) as one_to_three_years,
        COUNT(CASE WHEN julianday('now') - julianday(created_at) > 1095 THEN 1 END) as more_than_3_years
      FROM assets`,
      
      // Top manufacturers
      `SELECT manufacturer, COUNT(*) as count
       FROM assets 
       WHERE manufacturer IS NOT NULL AND manufacturer != ''
       GROUP BY manufacturer 
       ORDER BY count DESC 
       LIMIT 10`
    ];
    
    const [overall, byType, byStatus, warranty, age, manufacturers] = await Promise.all(
      queries.map(query => pool.query(query, [], { cache: true }))
    );
    
    return apiResponse(res, {
      overall: overall[0],
      by_type: byType,
      by_status: byStatus,
      warranty_status: warranty[0],
      age_distribution: age[0],
      top_manufacturers: manufacturers
    });
    
  } catch (error) {
    throw createDatabaseError('Failed to retrieve asset statistics', error);
  }
});

/**
 * Generate asset tag endpoint
 */
const generateAssetTagEndpoint = asyncHandler(async (req, res) => {
  const { type } = req.query;
  
  if (!type) {
    throw createValidationError('Asset type is required');
  }
  
  if (!ASSET_VALIDATION_SCHEMA.type.enum.includes(type)) {
    throw createValidationError(`Invalid asset type: ${type}`);
  }
  
  try {
    const assetTag = await generateAssetTag(type);
    
    return apiResponse(res, {
      asset_tag: assetTag,
      type: type
    });
    
  } catch (error) {
    throw createDatabaseError('Failed to generate asset tag', error);
  }
});

/**
 * Bulk operations for assets
 */
const bulkUpdateAssets = asyncHandler(async (req, res) => {
  const { asset_ids, updates } = req.body;
  
  if (!Array.isArray(asset_ids) || asset_ids.length === 0) {
    throw createValidationError('Asset IDs array is required');
  }
  
  if (!updates || typeof updates !== 'object') {
    throw createValidationError('Updates object is required');
  }
  
  // Validate update data
  const validatedUpdates = validateAssetData(updates, true);
  
  try {
    const results = await pool.transaction(
      asset_ids.map(id => {
        const updateFields = [];
        const params = [];
        
        Object.entries(validatedUpdates).forEach(([field, value]) => {
          updateFields.push(`${field} = ?`);
          params.push(['software_licenses', 'configuration', 'tags'].includes(field) 
            ? JSON.stringify(value) : value);
        });
        
        updateFields.push('updated_by = ?', 'updated_at = CURRENT_TIMESTAMP');
        params.push(req.user?.username || 'system', id);
        
        return {
          sql: `UPDATE assets SET ${updateFields.join(', ')} WHERE asset_id = ?`,
          params
        };
      })
    );
    
    const totalUpdated = results.reduce((sum, result) => sum + result.changes, 0);
    
    return apiResponse(res, {
      message: `Successfully updated ${totalUpdated} assets`,
      updated_count: totalUpdated,
      total_requested: asset_ids.length
    });
    
  } catch (error) {
    throw createDatabaseError('Failed to perform bulk update', error);
  }
});

module.exports = {
  getAssets,
  getAssetById, 
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetStats,
  generateAssetTagEndpoint,
  bulkUpdateAssets,
  
  // Utility functions for testing
  validateAssetData,
  generateAssetTag
};