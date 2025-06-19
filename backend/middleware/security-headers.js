/**
 * セキュリティヘッダーミドルウェア
 * API セキュリティ強化版
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// レート制限設定（API保護）
const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests') => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// 一般APIレート制限
const apiLimiter = createRateLimit(15 * 60 * 1000, 100, 'APIリクエスト制限に達しました');

// 認証APIレート制限（厳格）
const authLimiter = createRateLimit(15 * 60 * 1000, 10, 'ログイン試行制限に達しました');

// 管理者APIレート制限
const adminLimiter = createRateLimit(15 * 60 * 1000, 50, '管理者APIリクエスト制限に達しました');

// セキュリティヘッダー設定
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: ['same-origin'] }
});

// API キー検証ミドルウェア
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];
  
  // 開発環境では API キーチェックをスキップ
  if (process.env.NODE_ENV === 'development' || validApiKeys.length === 0) {
    return next();
  }
  
  if (!apiKey || !validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      error: 'Invalid API key',
      message: 'Valid API key required'
    });
  }
  
  next();
};

// リクエストログ強化
const enhancedLogging = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
      user: req.user?.username || 'anonymous'
    });
    
    originalSend.call(this, data);
  };
  
  next();
};

// セキュリティメトリクス
const securityMetrics = {
  requests: 0,
  authAttempts: 0,
  failedAuth: 0,
  blockedRequests: 0,
  
  increment(type) {
    this[type] = (this[type] || 0) + 1;
  },
  
  getStats() {
    return {
      totalRequests: this.requests,
      authAttempts: this.authAttempts,
      failedAuth: this.failedAuth,
      blockedRequests: this.blockedRequests,
      successRate: this.authAttempts > 0 ? 
        ((this.authAttempts - this.failedAuth) / this.authAttempts * 100).toFixed(2) + '%' : 'N/A'
    };
  }
};

// セキュリティメトリクス収集ミドルウェア
const collectSecurityMetrics = (req, res, next) => {
  securityMetrics.increment('requests');
  
  if (req.path.includes('/auth/')) {
    securityMetrics.increment('authAttempts');
    
    const originalSend = res.send;
    res.send = function(data) {
      if (res.statusCode >= 400) {
        securityMetrics.increment('failedAuth');
      }
      originalSend.call(this, data);
    };
  }
  
  next();
};

module.exports = {
  securityHeaders,
  apiLimiter,
  authLimiter,
  adminLimiter,
  validateApiKey,
  enhancedLogging,
  collectSecurityMetrics,
  securityMetrics
};