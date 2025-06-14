/**
 * サービス要求管理API実装 - 強化版
 * ワークフロー承認、SLA追跡、通知機能を含む包括的なAPI
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { 
  createValidationError, 
  createDatabaseError, 
  createNotFoundError,
  apiResponse,
  asyncHandler 
} = require('../utils/errorHandler');

const DB_PATH = path.join(__dirname, '..', 'db', 'itsm.sqlite');

// データベース接続取得
function getDbConnection() {
  return new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('データベース接続エラー:', err.message);
    }
  });
}

// サービス要求カテゴリ
const SERVICE_REQUEST_CATEGORIES = [
  'Hardware Request', 'Software Request', 'Access Request', 
  'Account Management', 'Training Request', 'Information Request',
  'Infrastructure Change', 'Other'
];

// ワークフローステータス
const WORKFLOW_STATUSES = [
  'Submitted', 'Pending Approval', 'Approved', 'In Progress', 
  'Fulfilled', 'Rejected', 'Cancelled'
];

// 承認レベル定義
const APPROVAL_LEVELS = {
  'Hardware Request': ['supervisor', 'it_manager'],
  'Software Request': ['supervisor', 'it_manager'],
  'Access Request': ['supervisor', 'security_manager'],
  'Account Management': ['it_manager'],
  'Training Request': ['supervisor', 'hr_manager'],
  'Information Request': ['supervisor'],
  'Infrastructure Change': ['supervisor', 'it_manager', 'infrastructure_manager'],
  'Other': ['supervisor']
};

/**
 * 承認ワークフローの進行判定
 */
function calculateNextApprovalStep(category, currentApprovals = []) {
  const requiredLevels = APPROVAL_LEVELS[category] || ['supervisor'];
  const approvedLevels = currentApprovals.map(a => a.level);
  
  for (const level of requiredLevels) {
    if (!approvedLevels.includes(level)) {
      return {
        nextLevel: level,
        isComplete: false,
        progress: approvedLevels.length / requiredLevels.length
      };
    }
  }
  
  return {
    nextLevel: null,
    isComplete: true,
    progress: 1.0
  };
}

/**
 * SLA目標時間計算（カテゴリ別）
 */
function calculateSlaTarget(category, priority = 'Medium') {
  const baseTimes = {
    'Hardware Request': { 'High': 24, 'Medium': 72, 'Low': 168 },
    'Software Request': { 'High': 8, 'Medium': 24, 'Low': 72 },
    'Access Request': { 'High': 4, 'Medium': 8, 'Low': 24 },
    'Account Management': { 'High': 2, 'Medium': 4, 'Low': 8 },
    'Training Request': { 'High': 168, 'Medium': 336, 'Low': 672 },
    'Information Request': { 'High': 4, 'Medium': 8, 'Low': 24 },
    'Infrastructure Change': { 'High': 168, 'Medium': 336, 'Low': 672 },
    'Other': { 'High': 24, 'Medium': 72, 'Low': 168 }
  };
  
  return (baseTimes[category] || baseTimes['Other'])[priority] || 72;
}

/**
 * サービス要求データのバリデーション
 */
function validateServiceRequestData(data, isUpdate = false) {
  const errors = [];
  
  // 件名バリデーション
  if (!isUpdate || data.subject !== undefined) {
    if (!data.subject || data.subject.trim().length === 0) {
      errors.push('件名は必須です');
    } else if (data.subject.length < 5) {
      errors.push('件名は5文字以上で入力してください');
    } else if (data.subject.length > 200) {
      errors.push('件名は200文字以内で入力してください');
    }
  }
  
  // 詳細バリデーション
  if (!isUpdate || data.detail !== undefined) {
    if (!data.detail || data.detail.trim().length === 0) {
      errors.push('詳細は必須です');
    } else if (data.detail.length < 20) {
      errors.push('詳細は20文字以上で入力してください');
    } else if (data.detail.length > 2000) {
      errors.push('詳細は2000文字以内で入力してください');
    }
  }
  
  // カテゴリバリデーション
  if (data.category && !SERVICE_REQUEST_CATEGORIES.includes(data.category)) {
    errors.push('カテゴリの値が無効です');
  }
  
  // 優先度バリデーション
  if (data.priority && !['Low', 'Medium', 'High'].includes(data.priority)) {
    errors.push('優先度の値が無効です');
  }
  
  // ステータスバリデーション
  if (data.status && !WORKFLOW_STATUSES.includes(data.status)) {
    errors.push('ステータスの値が無効です');
  }
  
  // 申請者バリデーション
  if (!isUpdate || data.applicant !== undefined) {
    if (!data.applicant || data.applicant.trim().length === 0) {
      errors.push('申請者は必須です');
    } else if (data.applicant.length > 100) {
      errors.push('申請者は100文字以内で入力してください');
    }
  }
  
  // メールアドレスバリデーション
  if (data.applicant_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.applicant_email)) {
    errors.push('有効なメールアドレスを入力してください');
  }
  
  return errors;
}

/**
 * サービス要求一覧取得
 */
const getServiceRequests = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    status, 
    category, 
    priority,
    applicant,
    search 
  } = req.query;
  
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let whereConditions = [];
  let params = [];
  
  // フィルタ条件の構築
  if (status) {
    whereConditions.push('status = ?');
    params.push(status);
  }
  
  if (category) {
    whereConditions.push('category = ?');
    params.push(category);
  }
  
  if (priority) {
    whereConditions.push('priority = ?');
    params.push(priority);
  }
  
  if (applicant) {
    whereConditions.push('applicant = ?');
    params.push(applicant);
  }
  
  if (search) {
    whereConditions.push('(subject LIKE ? OR detail LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  
  const whereClause = whereConditions.length > 0 ? 
    `WHERE ${whereConditions.join(' AND ')}` : '';
  
  const db = getDbConnection();
  
  // 総件数取得
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM service_requests 
    ${whereClause}
  `;
  
  const totalCount = await new Promise((resolve, reject) => {
    db.get(countQuery, params, (err, row) => {
      if (err) reject(err);
      else resolve(row.total);
    });
  });
  
  // データ取得（SLA情報付き）
  const dataQuery = `
    SELECT 
      sr.*,
      (julianday('now') - julianday(sr.requested_date)) * 24 as hours_elapsed,
      CASE 
        WHEN sr.status IN ('Fulfilled', 'Rejected', 'Cancelled') THEN 
          (julianday(sr.updated_at) - julianday(sr.requested_date)) * 24
        ELSE 
          (julianday('now') - julianday(sr.requested_date)) * 24
      END as total_hours
    FROM service_requests sr 
    ${whereClause}
    ORDER BY sr.requested_date DESC 
    LIMIT ? OFFSET ?
  `;
  
  const requests = await new Promise((resolve, reject) => {
    db.all(dataQuery, [...params, parseInt(limit), offset], (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
  
  // SLA情報の付与
  const enrichedRequests = requests.map(request => {
    const slaTarget = calculateSlaTarget(request.category, request.priority);
    const isBreached = request.hours_elapsed > slaTarget;
    const remainingHours = Math.max(0, slaTarget - request.hours_elapsed);
    
    return {
      ...request,
      sla_target_hours: slaTarget,
      is_sla_breached: isBreached,
      remaining_hours: remainingHours,
      sla_progress: Math.min(1, request.hours_elapsed / slaTarget)
    };
  });
  
  res.json(apiResponse({
    data: enrichedRequests,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalCount,
      totalPages: Math.ceil(totalCount / parseInt(limit))
    },
    filters: { status, category, priority, applicant, search }
  }));
});

/**
 * サービス要求作成
 */
const createServiceRequest = asyncHandler(async (req, res) => {
  const validationErrors = validateServiceRequestData(req.body);
  if (validationErrors.length > 0) {
    throw createValidationError('入力データに問題があります', validationErrors);
  }
  
  const {
    subject,
    detail,
    category = 'Other',
    priority = 'Medium',
    applicant,
    applicant_email,
    requested_date,
    due_date
  } = req.body;
  
  const db = getDbConnection();
  
  const insertQuery = `
    INSERT INTO service_requests (
      subject, detail, category, priority, applicant, applicant_email,
      status, requested_date, due_date, created_date
    ) VALUES (?, ?, ?, ?, ?, ?, 'Submitted', ?, ?, datetime('now'))
  `;
  
  const result = await new Promise((resolve, reject) => {
    db.run(insertQuery, [
      subject, detail, category, priority, applicant, applicant_email,
      requested_date || new Date().toISOString(),
      due_date
    ], function(err) {
      db.close();
      if (err) reject(err);
      else resolve({ id: this.lastID });
    });
  });
  
  res.status(201).json(apiResponse({
    data: {
      request_id: result.id,
      subject,
      status: 'Submitted',
      created_date: new Date().toISOString()
    },
    message: 'サービス要求が正常に作成されました'
  }));
});

/**
 * ワークフロー承認/却下
 */
const processApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, approver_id, approver_role, comments } = req.body;
  
  if (!['approve', 'reject'].includes(action)) {
    throw createValidationError('アクションは approve または reject である必要があります');
  }
  
  const db = getDbConnection();
  
  // 現在のサービス要求を取得
  const getRequestQuery = 'SELECT * FROM service_requests WHERE request_id = ?';
  const currentRequest = await new Promise((resolve, reject) => {
    db.get(getRequestQuery, [id], (err, row) => {
      if (err) reject(err);
      else if (!row) reject(createNotFoundError('サービス要求が見つかりません'));
      else resolve(row);
    });
  });
  
  if (currentRequest.status !== 'Pending Approval' && currentRequest.status !== 'Submitted') {
    throw createValidationError('このサービス要求は承認待ち状態ではありません');
  }
  
  let newStatus;
  let updateQuery;
  
  if (action === 'approve') {
    // 承認ワークフローの進行チェック
    const workflowStep = calculateNextApprovalStep(currentRequest.category, []);
    
    if (workflowStep.isComplete) {
      newStatus = 'Approved';
    } else {
      newStatus = 'Pending Approval';
    }
    
    updateQuery = `
      UPDATE service_requests 
      SET status = ?, approved_by = ?, approved_date = datetime('now'), 
          approval_comments = ?, updated_at = datetime('now')
      WHERE request_id = ?
    `;
  } else {
    newStatus = 'Rejected';
    updateQuery = `
      UPDATE service_requests 
      SET status = 'Rejected', rejected_by = ?, rejected_date = datetime('now'), 
          rejection_comments = ?, updated_at = datetime('now')
      WHERE request_id = ?
    `;
  }
  
  await new Promise((resolve, reject) => {
    db.run(updateQuery, [newStatus, approver_id, comments, id], function(err) {
      db.close();
      if (err) reject(err);
      else resolve();
    });
  });
  
  res.json(apiResponse({
    message: `サービス要求が正常に${action === 'approve' ? '承認' : '却下'}されました`,
    data: { 
      request_id: parseInt(id), 
      new_status: newStatus,
      action: action === 'approve' ? '承認' : '却下'
    }
  }));
});

/**
 * サービス要求統計情報
 */
const getServiceRequestStats = asyncHandler(async (req, res) => {
  const db = getDbConnection();
  
  const statsQuery = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Submitted' THEN 1 ELSE 0 END) as submitted,
      SUM(CASE WHEN status = 'Pending Approval' THEN 1 ELSE 0 END) as pending_approval,
      SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'Fulfilled' THEN 1 ELSE 0 END) as fulfilled,
      SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
      
      SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as high_priority,
      SUM(CASE WHEN priority = 'Medium' THEN 1 ELSE 0 END) as medium_priority,
      SUM(CASE WHEN priority = 'Low' THEN 1 ELSE 0 END) as low_priority,
      
      SUM(CASE WHEN category = 'Hardware Request' THEN 1 ELSE 0 END) as hardware_requests,
      SUM(CASE WHEN category = 'Software Request' THEN 1 ELSE 0 END) as software_requests,
      SUM(CASE WHEN category = 'Access Request' THEN 1 ELSE 0 END) as access_requests,
      
      AVG(CASE 
        WHEN status IN ('Fulfilled', 'Rejected') AND requested_date IS NOT NULL AND updated_at IS NOT NULL
        THEN (julianday(updated_at) - julianday(requested_date)) * 24 
        ELSE NULL 
      END) as avg_resolution_hours
    FROM service_requests
  `;
  
  const stats = await new Promise((resolve, reject) => {
    db.get(statsQuery, [], (err, row) => {
      db.close();
      if (err) reject(err);
      else resolve(row);
    });
  });
  
  res.json(apiResponse({
    data: {
      total: stats.total || 0,
      by_status: {
        submitted: stats.submitted || 0,
        pending_approval: stats.pending_approval || 0,
        approved: stats.approved || 0,
        in_progress: stats.in_progress || 0,
        fulfilled: stats.fulfilled || 0,
        rejected: stats.rejected || 0,
        cancelled: stats.cancelled || 0
      },
      by_priority: {
        high: stats.high_priority || 0,
        medium: stats.medium_priority || 0,
        low: stats.low_priority || 0
      },
      by_category: {
        hardware: stats.hardware_requests || 0,
        software: stats.software_requests || 0,
        access: stats.access_requests || 0
      },
      average_resolution_hours: Math.round((stats.avg_resolution_hours || 0) * 100) / 100
    }
  }));
});

module.exports = {
  getServiceRequests,
  createServiceRequest,
  processApproval,
  getServiceRequestStats,
  
  // ヘルパー関数のエクスポート（テスト用）
  validateServiceRequestData,
  calculateNextApprovalStep,
  calculateSlaTarget
};