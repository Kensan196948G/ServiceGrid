const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

/**
 * JWT認証ミドルウェア
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'アクセストークンが必要です',
      code: 'MISSING_TOKEN'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        error: 'トークンが無効です',
        code: 'INVALID_TOKEN'
      });
    }
    req.user = user;
    next();
  });
};

/**
 * ロール認証ミドルウェア
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: '認証が必要です',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    // rolesが配列でない場合は配列に変換
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'このリソースにアクセスする権限がありません',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.role
      });
    }

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
 * JWTトークン生成
 */
const generateToken = (user) => {
  const payload = {
    userId: user.user_id,
    username: user.username,
    role: user.role,
    email: user.email
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
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

module.exports = {
  authenticateToken,
  requireRole,
  hashPassword,
  verifyPassword,
  generateToken,
  generateRefreshToken
};