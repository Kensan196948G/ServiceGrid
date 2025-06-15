// Comprehensive error handling utilities for backend APIs - Enhanced version with performance monitoring
const fs = require('fs');
const path = require('path');

// Log levels
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// Error types for ITSM system
const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR'
};

// HTTP status codes mapping
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
};

// Custom error class for ITSM application
class ITSMError extends Error {
  constructor(message, type = ERROR_TYPES.INTERNAL_ERROR, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) {
    super(message);
    this.name = 'ITSMError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Pre-defined error creators
const createValidationError = (message, details = null) => 
  new ITSMError(message, ERROR_TYPES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST, details);

const createDatabaseError = (message, details = null) => 
  new ITSMError(message, ERROR_TYPES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR, details);

const createAuthenticationError = (message = '認証が必要です') => 
  new ITSMError(message, ERROR_TYPES.AUTHENTICATION_ERROR, HTTP_STATUS.UNAUTHORIZED);

const createAuthorizationError = (message = 'アクセス権限がありません') => 
  new ITSMError(message, ERROR_TYPES.AUTHORIZATION_ERROR, HTTP_STATUS.FORBIDDEN);

const createNotFoundError = (resource = 'リソース') => 
  new ITSMError(`${resource}が見つかりません`, ERROR_TYPES.NOT_FOUND_ERROR, HTTP_STATUS.NOT_FOUND);

const createConflictError = (message) => 
  new ITSMError(message, ERROR_TYPES.CONFLICT_ERROR, HTTP_STATUS.CONFLICT);

// Enhanced logging function
function logError(error, context = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: LOG_LEVELS.ERROR,
    message: error.message,
    type: error.type || ERROR_TYPES.INTERNAL_ERROR,
    statusCode: error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
    stack: error.stack,
    context: context,
    details: error.details
  };

  // Write to log file
  const logDir = path.join(__dirname, '..', '..', 'logs');
  const logFile = path.join(logDir, 'backend.log');
  
  try {
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logString = JSON.stringify(logEntry, null, 2) + '\n';
    fs.appendFileSync(logFile, logString);
  } catch (logWriteError) {
    console.error('Failed to write to log file:', logWriteError);
  }

  // Also log to console for development
  console.error(`[${logEntry.timestamp}] ${logEntry.level}: ${logEntry.message}`, {
    type: logEntry.type,
    context: logEntry.context,
    details: logEntry.details
  });
}

// Express error handling middleware
function errorHandler(error, req, res, next) {
  // Log the error with request context
  const context = {
    method: req.method,
    url: req.url,
    userAgent: req.get('user-agent'),
    ip: req.ip,
    user: req.user ? req.user.username : 'anonymous'
  };

  logError(error, context);

  // Handle different error types
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = 'システム内部エラーが発生しました';
  let errorType = ERROR_TYPES.INTERNAL_ERROR;

  if (error instanceof ITSMError) {
    statusCode = error.statusCode;
    message = error.message;
    errorType = error.type;
  } else if (error.code === 'SQLITE_CONSTRAINT') {
    statusCode = HTTP_STATUS.CONFLICT;
    message = 'データの重複または制約違反が発生しました';
    errorType = ERROR_TYPES.CONFLICT_ERROR;
  } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
    message = '外部サービスに接続できません';
    errorType = ERROR_TYPES.EXTERNAL_API_ERROR;
  } else if (error.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = error.message;
    errorType = ERROR_TYPES.VALIDATION_ERROR;
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      type: errorType,
      message: message,
      timestamp: new Date().toISOString(),
      requestId: req.id || generateRequestId()
    }
  });
}

// API response wrapper for consistent responses
function apiResponse(res, data, message = 'OK', statusCode = HTTP_STATUS.OK) {
  return res.status(statusCode).json({
    success: true,
    message: message,
    data: data,
    timestamp: new Date().toISOString()
  });
}

// API error response wrapper
function apiError(res, error, context = {}) {
  logError(error, context);
  
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = 'システム内部エラーが発生しました';
  
  if (error instanceof ITSMError) {
    statusCode = error.statusCode;
    message = error.message;
  }
  
  return res.status(statusCode).json({
    success: false,
    error: {
      type: error.type || ERROR_TYPES.INTERNAL_ERROR,
      message: message,
      timestamp: new Date().toISOString()
    }
  });
}

// Async wrapper to catch errors in async route handlers
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Database operation wrapper with error handling
function executeDbOperation(operation, errorMessage = 'データベース操作に失敗しました') {
  return new Promise((resolve, reject) => {
    try {
      operation((err, result) => {
        if (err) {
          const dbError = createDatabaseError(`${errorMessage}: ${err.message}`, {
            sqliteError: err.code,
            query: err.sql || 'unknown'
          });
          reject(dbError);
        } else {
          resolve(result);
        }
      });
    } catch (error) {
      const dbError = createDatabaseError(`${errorMessage}: ${error.message}`);
      reject(dbError);
    }
  });
}

// Input validation helper
function validateRequiredFields(data, requiredFields) {
  const missingFields = [];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      missingFields.push(field);
    }
  }
  
  if (missingFields.length > 0) {
    throw createValidationError(
      `必須フィールドが不足しています: ${missingFields.join(', ')}`,
      { missingFields }
    );
  }
}

// Data sanitization helper
function sanitizeInput(data) {
  if (typeof data === 'string') {
    return data.trim();
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
}

// Generate unique request ID
function generateRequestId() {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Rate limiting helper
const rateLimitStore = new Map();

function checkRateLimit(identifier, limit = 100, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimitStore.has(identifier)) {
    rateLimitStore.set(identifier, []);
  }
  
  const requests = rateLimitStore.get(identifier);
  
  // Clean old requests
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);
  
  if (recentRequests.length >= limit) {
    throw new ITSMError(
      'リクエスト制限に達しました。しばらく待ってから再試行してください。',
      ERROR_TYPES.VALIDATION_ERROR,
      HTTP_STATUS.TOO_MANY_REQUESTS
    );
  }
  
  recentRequests.push(now);
  rateLimitStore.set(identifier, recentRequests);
}

module.exports = {
  ITSMError,
  ERROR_TYPES,
  HTTP_STATUS,
  LOG_LEVELS,
  
  // Error creators
  createValidationError,
  createDatabaseError,
  createAuthenticationError,
  createAuthorizationError,
  createNotFoundError,
  createConflictError,
  
  // Utilities
  logError,
  errorHandler,
  apiResponse,
  apiError,
  asyncHandler,
  executeDbOperation,
  validateRequiredFields,
  sanitizeInput,
  generateRequestId,
  checkRateLimit
};