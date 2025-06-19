/**
 * 強化セキュリティミドルウェア
 * Feature-E 非機能要件実装
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const crypto = require('crypto');

/**
 * 強化された認証レート制限
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回の認証試行
  message: {
    error: '認証試行回数が制限を超えました',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip + ':' + (req.body?.username || 'anonymous');
  }
});

/**
 * 一般APIレート制限
 */
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'API呼び出し制限を超えました',
    code: 'API_RATE_LIMIT_EXCEEDED'
  }
});

/**
 * 管理者APIレート制限
 */
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    error: '管理者API呼び出し制限を超えました',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED'
  }
});

/**
 * 高度なヘルメット設定
 */
const advancedHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'strict-dynamic'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * 入力検証強化
 */
const validateInput = (req, res, next) => {
  const body = req.body;
  
  if (body) {
    // XSS攻撃防止
    for (const key in body) {
      if (typeof body[key] === 'string') {
        // HTMLタグ除去
        body[key] = validator.escape(body[key]);
        
        // SQLインジェクション基本パターン検出
        const sqlPatterns = [
          /(\bSELECT\b|\bUNION\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i,
          /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
          /['"]\s*;\s*--/,
          /\bEXEC\b|\bEXECUTE\b/i
        ];
        
        for (const pattern of sqlPatterns) {
          if (pattern.test(body[key])) {
            return res.status(400).json({
              error: '無効な入力が検出されました',
              code: 'INVALID_INPUT'
            });
          }
        }
      }
    }
  }
  
  next();
};

/**
 * APIキー検証
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (req.path.startsWith('/api/internal/')) {
    if (!apiKey || !isValidApiKey(apiKey)) {
      return res.status(401).json({
        error: 'APIキーが無効です',
        code: 'INVALID_API_KEY'
      });
    }
  }
  
  next();
};

/**
 * APIキー検証関数
 */
function isValidApiKey(apiKey) {
  const validKeys = process.env.VALID_API_KEYS?.split(',') || [];
  return validKeys.includes(apiKey);
}

/**
 * セキュリティイベントログ
 */
const logSecurityEvent = (eventType, req, details = {}) => {
  const timestamp = new Date().toISOString();
  const event = {
    timestamp,
    type: eventType,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    user: req.user?.username || 'anonymous',
    details
  };
  
  console.log(`[SECURITY] ${JSON.stringify(event)}`);
  
  // 重要なセキュリティイベントの場合、アラート送信
  if (['BRUTE_FORCE', 'SQL_INJECTION', 'XSS_ATTEMPT'].includes(eventType)) {
    // TODO: アラート通知システム実装
    console.warn(`[SECURITY ALERT] ${eventType} detected from ${req.ip}`);
  }
};

/**
 * セキュリティヘッダー追加
 */
const addSecurityHeaders = (req, res, next) => {
  // カスタムセキュリティヘッダー
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // セキュリティ情報の漏洩防止
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

module.exports = {
  authRateLimit,
  apiRateLimit,
  adminRateLimit,
  advancedHelmet,
  validateInput,
  validateApiKey,
  logSecurityEvent,
  addSecurityHeaders
};