/**
 * 統一APIレスポンス形式とエラーハンドリング
 * ITSM準拠IT運用システムプラットフォーム
 * 
 * 全APIエンドポイントで統一されたレスポンス形式を提供し、
 * エラーハンドリングを標準化します。
 */

/**
 * 成功レスポンス形式
 * @param {Object} res - Express response object
 * @param {*} data - レスポンスデータ
 * @param {string} message - 成功メッセージ
 * @param {number} statusCode - HTTPステータスコード
 * @param {Object} metadata - 追加のメタデータ
 */
const sendSuccess = (res, data = null, message = '正常に処理されました', statusCode = 200, metadata = {}) => {
  const response = {
    success: true,
    status: statusCode,
    message,
    timestamp: new Date().toISOString(),
    data,
    ...metadata
  };
  
  return res.status(statusCode).json(response);
};

/**
 * エラーレスポンス形式
 * @param {Object} res - Express response object
 * @param {string} error - エラーメッセージ
 * @param {number} statusCode - HTTPステータスコード
 * @param {Object} details - エラー詳細情報
 * @param {string} errorCode - エラーコード
 */
const sendError = (res, error = 'エラーが発生しました', statusCode = 500, details = null, errorCode = null) => {
  const response = {
    success: false,
    status: statusCode,
    error,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
    ...(errorCode && { error_code: errorCode })
  };
  
  // 本番環境以外では詳細なエラー情報を含める
  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    response.debug_info = {
      environment: process.env.NODE_ENV || 'development',
      stack: details?.stack
    };
  }
  
  return res.status(statusCode).json(response);
};

/**
 * ページネーション付きレスポンス形式
 * @param {Object} res - Express response object
 * @param {Array} data - データ配列
 * @param {Object} pagination - ページネーション情報
 * @param {string} message - 成功メッセージ
 * @param {Object} filters - 適用されたフィルター
 * @param {Object} metadata - 追加のメタデータ
 */
const sendPaginatedSuccess = (res, data, pagination, message = '正常に取得されました', filters = {}, metadata = {}) => {
  const response = {
    success: true,
    status: 200,
    message,
    timestamp: new Date().toISOString(),
    data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      total: pagination.total || data.length,
      totalPages: pagination.totalPages || Math.ceil((pagination.total || data.length) / (pagination.limit || 20)),
      hasNext: (pagination.page || 1) < (pagination.totalPages || 1),
      hasPrev: (pagination.page || 1) > 1
    },
    ...(Object.keys(filters).length > 0 && { filters }),
    ...metadata
  };
  
  return res.status(200).json(response);
};

/**
 * 統計データレスポンス形式
 * @param {Object} res - Express response object
 * @param {Object} stats - 統計データ
 * @param {string} message - 成功メッセージ
 * @param {Object} metadata - 追加のメタデータ
 */
const sendStatsSuccess = (res, stats, message = '統計データが正常に取得されました', metadata = {}) => {
  const response = {
    success: true,
    status: 200,
    message,
    timestamp: new Date().toISOString(),
    statistics: stats,
    generated_at: new Date().toISOString(),
    ...metadata
  };
  
  return res.status(200).json(response);
};

/**
 * 作成成功レスポンス形式
 * @param {Object} res - Express response object
 * @param {*} data - 作成されたデータ
 * @param {string} message - 成功メッセージ
 * @param {string} resourceType - リソースタイプ
 */
const sendCreatedSuccess = (res, data, message = '正常に作成されました', resourceType = 'resource') => {
  const response = {
    success: true,
    status: 201,
    message,
    timestamp: new Date().toISOString(),
    data,
    resource_type: resourceType,
    created_at: new Date().toISOString()
  };
  
  return res.status(201).json(response);
};

/**
 * 更新成功レスポンス形式
 * @param {Object} res - Express response object
 * @param {*} data - 更新されたデータ
 * @param {string} message - 成功メッセージ
 * @param {string} resourceType - リソースタイプ
 */
const sendUpdatedSuccess = (res, data = null, message = '正常に更新されました', resourceType = 'resource') => {
  const response = {
    success: true,
    status: 200,
    message,
    timestamp: new Date().toISOString(),
    ...(data && { data }),
    resource_type: resourceType,
    updated_at: new Date().toISOString()
  };
  
  return res.status(200).json(response);
};

/**
 * 削除成功レスポンス形式
 * @param {Object} res - Express response object
 * @param {string|number} deletedId - 削除されたリソースのID
 * @param {string} message - 成功メッセージ
 * @param {string} resourceType - リソースタイプ
 */
const sendDeletedSuccess = (res, deletedId, message = '正常に削除されました', resourceType = 'resource') => {
  const response = {
    success: true,
    status: 200,
    message,
    timestamp: new Date().toISOString(),
    deleted_id: deletedId,
    resource_type: resourceType,
    deleted_at: new Date().toISOString()
  };
  
  return res.status(200).json(response);
};

/**
 * バリデーションエラーレスポンス形式
 * @param {Object} res - Express response object
 * @param {Object} validationErrors - バリデーションエラー詳細
 * @param {string} message - エラーメッセージ
 */
const sendValidationError = (res, validationErrors, message = 'バリデーションエラーが発生しました') => {
  const response = {
    success: false,
    status: 400,
    error: message,
    timestamp: new Date().toISOString(),
    error_code: 'VALIDATION_ERROR',
    validation_errors: validationErrors
  };
  
  return res.status(400).json(response);
};

/**
 * 認証エラーレスポンス形式
 * @param {Object} res - Express response object
 * @param {string} message - エラーメッセージ
 */
const sendAuthError = (res, message = '認証が必要です') => {
  const response = {
    success: false,
    status: 401,
    error: message,
    timestamp: new Date().toISOString(),
    error_code: 'AUTHENTICATION_ERROR'
  };
  
  return res.status(401).json(response);
};

/**
 * 認可エラーレスポンス形式
 * @param {Object} res - Express response object
 * @param {string} message - エラーメッセージ
 * @param {string} requiredRole - 必要な権限
 */
const sendAuthorizationError = (res, message = 'この操作を実行する権限がありません', requiredRole = null) => {
  const response = {
    success: false,
    status: 403,
    error: message,
    timestamp: new Date().toISOString(),
    error_code: 'AUTHORIZATION_ERROR',
    ...(requiredRole && { required_role: requiredRole })
  };
  
  return res.status(403).json(response);
};

/**
 * リソース未発見エラーレスポンス形式
 * @param {Object} res - Express response object
 * @param {string} resourceType - リソースタイプ
 * @param {string|number} resourceId - リソースID
 */
const sendNotFoundError = (res, resourceType = 'リソース', resourceId = null) => {
  const response = {
    success: false,
    status: 404,
    error: `${resourceType}が見つかりません`,
    timestamp: new Date().toISOString(),
    error_code: 'RESOURCE_NOT_FOUND',
    resource_type: resourceType,
    ...(resourceId && { resource_id: resourceId })
  };
  
  return res.status(404).json(response);
};

/**
 * データベースエラーレスポンス形式
 * @param {Object} res - Express response object
 * @param {Error} error - データベースエラーオブジェクト
 * @param {string} operation - 実行していた操作
 */
const sendDatabaseError = (res, error = null, operation = 'データベース操作') => {
  console.error(`Database error during ${operation}:`, error);
  
  const response = {
    success: false,
    status: 500,
    error: 'データベースエラーが発生しました',
    timestamp: new Date().toISOString(),
    error_code: 'DATABASE_ERROR',
    operation
  };
  
  // 開発環境では詳細なエラー情報を含める
  if (process.env.NODE_ENV !== 'production' && error) {
    response.debug_info = {
      message: error.message,
      stack: error.stack
    };
  }
  
  return res.status(500).json(response);
};

/**
 * Express エラーハンドリングミドルウェア
 * アプリケーション全体の未処理エラーをキャッチ
 */
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // すでにレスポンスが送信済みの場合は何もしない
  if (res.headersSent) {
    return next(err);
  }
  
  // エラータイプに応じた処理
  if (err.name === 'ValidationError') {
    return sendValidationError(res, err.errors, 'バリデーションエラーが発生しました');
  }
  
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return sendAuthError(res, 'トークンが無効または期限切れです');
  }
  
  if (err.name === 'ForbiddenError' || err.status === 403) {
    return sendAuthorizationError(res, 'この操作を実行する権限がありません');
  }
  
  if (err.code === 'SQLITE_ERROR' || err.code?.includes('SQLITE')) {
    return sendDatabaseError(res, err, 'データベース操作');
  }
  
  // その他の予期しないエラー
  return sendError(res, '内部サーバーエラーが発生しました', 500, {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  }, 'INTERNAL_SERVER_ERROR');
};

/**
 * 404エラーハンドラー（存在しないエンドポイント）
 */
const notFoundHandler = (req, res) => {
  const response = {
    success: false,
    status: 404,
    error: `エンドポイント ${req.method} ${req.path} が見つかりません`,
    timestamp: new Date().toISOString(),
    error_code: 'ENDPOINT_NOT_FOUND',
    available_endpoints: {
      message: 'APIドキュメントを参照してください',
      base_url: `${req.protocol}://${req.get('host')}/api`
    }
  };
  
  return res.status(404).json(response);
};

/**
 * レスポンスにヘルスチェック情報を追加するミドルウェア
 */
const addHealthInfo = (req, res, next) => {
  res.locals.startTime = Date.now();
  next();
};

/**
 * APIレスポンス時間の測定とロギング
 */
const responseTimeLogger = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (res.locals.startTime) {
      const responseTime = Date.now() - res.locals.startTime;
      
      // レスポンスに処理時間を追加（開発環境のみ）
      if (process.env.NODE_ENV !== 'production' && data && typeof data === 'object') {
        data.response_time_ms = responseTime;
      }
      
      // ログ出力
      console.log(`${req.method} ${req.path} - ${res.statusCode} - ${responseTime}ms`);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = {
  sendSuccess,
  sendError,
  sendPaginatedSuccess,
  sendStatsSuccess,
  sendCreatedSuccess,
  sendUpdatedSuccess,
  sendDeletedSuccess,
  sendValidationError,
  sendAuthError,
  sendAuthorizationError,
  sendNotFoundError,
  sendDatabaseError,
  errorHandler,
  notFoundHandler,
  addHealthInfo,
  responseTimeLogger
};