const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

/**
 * 監査ログ記録
 */
const logActivity = (req, action, details = null) => {
  console.log(`[AUDIT] ${new Date().toISOString()} | User: ${req.user?.username || 'anonymous'} | Action: ${action} | IP: ${req.ip} | Details: ${details}`);
};

/**
 * JWT認証ミドルウェア（強化版）
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    logActivity(req, 'AUTHENTICATION_FAILED', 'Missing token');
    return res.status(401).json({ 
      success: false,
      error: {
        type: 'AUTHENTICATION_ERROR',
        message: 'アクセストークンが必要です',
        code: 'MISSING_TOKEN',
        timestamp: new Date().toISOString()
      }
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logActivity(req, 'AUTHENTICATION_FAILED', `Invalid token: ${err.message}`);
      return res.status(403).json({ 
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'トークンが無効です',
          code: 'INVALID_TOKEN',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // トークンの有効期限をチェック
    if (user.exp && Date.now() >= user.exp * 1000) {
      logActivity(req, 'AUTHENTICATION_FAILED', 'Token expired');
      return res.status(401).json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'トークンの有効期限が切れています',
          code: 'TOKEN_EXPIRED',
          timestamp: new Date().toISOString()
        }
      });
    }

    req.user = user;
    logActivity(req, 'AUTHENTICATION_SUCCESS', `User authenticated: ${user.username}`);
    next();
  });
};

/**
 * ロール認証ミドルウェア（強化版）
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logActivity(req, 'AUTHORIZATION_FAILED', 'User not authenticated');
      return res.status(401).json({ 
        success: false,
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: '認証が必要です',
          code: 'AUTHENTICATION_REQUIRED',
          timestamp: new Date().toISOString()
        }
      });
    }

    // rolesが配列でない場合は配列に変換
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      logActivity(req, 'AUTHORIZATION_FAILED', `Insufficient permissions: required=${allowedRoles.join(',')}, current=${req.user.role}`);
      return res.status(403).json({ 
        success: false,
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: 'このリソースにアクセスする権限がありません',
          code: 'INSUFFICIENT_PERMISSIONS',
          details: {
            required: allowedRoles,
            current: req.user.role
          },
          timestamp: new Date().toISOString()
        }
      });
    }

    logActivity(req, 'AUTHORIZATION_SUCCESS', `Role check passed: ${req.user.role}`);
    next();
  };
};

/**
 * パスワードハッシュ化
 */
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * パスワード検証
 */
const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * JWTトークン生成（強化版）
 */
const generateToken = (user) => {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    userId: user.user_id,
    username: user.username,
    role: user.role,
    email: user.email,
    iat: now,
    jti: require('crypto').randomBytes(16).toString('hex') // JWT ID for token revocation
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    issuer: 'ServiceGrid-ITSM',
    audience: 'ServiceGrid-Users'
  });
};

/**
 * リフレッシュトークン生成（将来的に使用）
 */
const generateRefreshToken = (user) => {
  const payload = {
    userId: user.user_id,
    username: user.username,
    type: 'refresh'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

/**
 * セキュリティヘッダー設定
 */
const setSecurityHeaders = (req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

/**
 * API統合バリデーション強化
 * 全API共通のバリデーション・エラーハンドリング統一
 */
const validateApiRequest = (req, res, next) => {
  // リクエストボディサイズ制限
  if (req.body && JSON.stringify(req.body).length > 1048576) { // 1MB
    return res.status(413).json({ 
      error: 'リクエストサイズが制限を超えています',
      max_size: '1MB'
    });
  }
  
  // 必須ヘッダーチェック
  if (!req.headers['content-type'] && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return res.status(400).json({ 
      error: 'Content-Typeヘッダーが必要です',
      required: 'application/json'
    });
  }
  
  next();
};

/**
 * SQLインジェクション防止
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[';"\\]/g, '').trim();
  };
  
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object') {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
    return obj;
  };
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

/**
 * レート制限チェック（簡易版）
 */
const requests = new Map();
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!requests.has(key)) {
      requests.set(key, []);
    }
    
    const userRequests = requests.get(key).filter(time => time > windowStart);
    
    if (userRequests.length >= maxRequests) {
      logActivity(req, 'RATE_LIMIT_EXCEEDED', `IP: ${key}, Requests: ${userRequests.length}`);
      return res.status(429).json({
        success: false,
        error: {
          type: 'RATE_LIMIT_ERROR',
          message: 'リクエスト制限に達しました。しばらく待ってから再試行してください。',
          code: 'TOO_MANY_REQUESTS',
          retryAfter: Math.ceil(windowMs / 1000),
          timestamp: new Date().toISOString()
        }
      });
    }
    
    userRequests.push(now);
    requests.set(key, userRequests);
    
    // 古いエントリをクリーンアップ
    if (Math.random() < 0.01) {
      for (const [ip, times] of requests.entries()) {
        const validTimes = times.filter(time => time > windowStart);
        if (validTimes.length === 0) {
          requests.delete(ip);
        } else {
          requests.set(ip, validTimes);
        }
      }
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  hashPassword,
  verifyPassword,
  generateToken,
  generateRefreshToken,
  setSecurityHeaders,
  rateLimit,
  validateApiRequest,
  sanitizeInput,
  logActivity
};