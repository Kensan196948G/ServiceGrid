/**
 * Enhanced Security Middleware for ServiceGrid ITSM
 * Comprehensive security measures including advanced rate limiting, 
 * input sanitization, security headers, and threat detection
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { logError } = require('../utils/errorHandler');

// Security configuration
const SECURITY_CONFIG = {
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5, // Stricter for auth endpoints
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  security: {
    enableCSP: process.env.ENABLE_CSP !== 'false',
    enableHSTS: process.env.ENABLE_HSTS !== 'false',
    enableXFrameOptions: process.env.ENABLE_X_FRAME_OPTIONS !== 'false'
  }
};

// Request ID generation for tracing
const requestIdMiddleware = (req, res, next) => {
  req.id = req.get('X-Request-ID') || crypto.randomBytes(16).toString('hex');
  res.set('X-Request-ID', req.id);
  next();
};

// Enhanced Helmet security headers
const helmetConfig = helmet({
  contentSecurityPolicy: SECURITY_CONFIG.security.enableCSP ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'strict-dynamic'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.servicegrid.local"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: []
    },
  } : false,
  
  hsts: SECURITY_CONFIG.security.enableHSTS ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  } : false,
  
  frameguard: SECURITY_CONFIG.security.enableXFrameOptions ? { action: 'deny' } : false,
  
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // Additional security headers
  hidePoweredBy: true,
  ieNoOpen: true,
  dnsPrefetchControl: { allow: false },
  
  // Custom headers
  crossOriginEmbedderPolicy: false, // Disable for compatibility
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
});

// Advanced rate limiting with different tiers
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: SECURITY_CONFIG.rateLimit.windowMs,
    max: SECURITY_CONFIG.rateLimit.max,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(SECURITY_CONFIG.rateLimit.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    
    // Enhanced options
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/api/health' || req.path === '/ping';
    },
    
    keyGenerator: (req) => {
      // Use X-Forwarded-For if available, otherwise req.ip
      return req.get('X-Forwarded-For') || req.ip;
    },
    
    handler: (req, res, options) => {
      const context = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        rateLimitExceeded: true
      };
      
      logError(new Error(`Rate limit exceeded for ${req.ip}`), context);
      
      return res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  };
  
  return rateLimit({ ...defaultOptions, ...options });
};

// General API rate limiter
const generalRateLimit = createRateLimiter({
  max: SECURITY_CONFIG.rateLimit.max,
  message: {
    error: 'リクエスト数が制限を超えました。しばらく時間をおいてから再試行してください。',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Strict rate limiter for authentication endpoints
const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: SECURITY_CONFIG.rateLimit.authMax,
  skipSuccessfulRequests: true, // Don't count successful auth attempts
  message: {
    error: '認証試行回数が制限を超えました。15分後に再試行してください。',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  }
});

// Extra strict rate limiter for admin operations
const adminRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: '管理者操作の制限を超えました。しばらく時間をおいてから再試行してください。',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED'
  }
});

// SQL Injection and XSS protection middleware
const inputSanitizationMiddleware = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Basic SQL injection patterns
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
        /('|("|;|--|\/\*|\*\/|xp_|sp_))/gi,
        /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi
      ];
      
      // XSS patterns
      const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ];
      
      let sanitized = value;
      
      // Check for suspicious patterns and log them
      const suspicious = [...sqlPatterns, ...xssPatterns].some(pattern => pattern.test(value));
      
      if (suspicious) {
        const context = {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          suspiciousInput: value.substring(0, 100), // First 100 chars
          path: req.path,
          method: req.method
        };
        
        logError(new Error('Suspicious input detected'), context);
        
        // More aggressive sanitization for suspicious input
        sanitized = value
          .replace(/<[^>]*>/g, '') // Remove all HTML tags
          .replace(/['"`;]/g, '') // Remove quotes and semicolons
          .replace(/--/g, '') // Remove SQL comments
          .trim();
      } else {
        // Basic sanitization
        sanitized = value
          .replace(/[<>'"]/g, (match) => {
            const entities = {
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#x27;'
            };
            return entities[match];
          })
          .trim();
      }
      
      return sanitized;
    }
    
    return value;
  };
  
  const sanitizeObject = (obj) => {
    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      }
      
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = sanitizeValue(key);
        sanitized[sanitizedKey] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return sanitizeValue(obj);
  };
  
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

// Content type validation middleware
const contentTypeValidation = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    
    if (!contentType) {
      return res.status(400).json({
        error: 'Content-Type header is required',
        code: 'MISSING_CONTENT_TYPE'
      });
    }
    
    if (!contentType.includes('application/json')) {
      return res.status(415).json({
        error: 'Unsupported Media Type. Expected application/json',
        code: 'UNSUPPORTED_MEDIA_TYPE'
      });
    }
  }
  
  next();
};

// Request size validation middleware
const requestSizeValidation = (req, res, next) => {
  const maxSize = parseInt(process.env.MAX_REQUEST_SIZE) || 10 * 1024 * 1024; // 10MB default
  
  if (req.get('Content-Length')) {
    const contentLength = parseInt(req.get('Content-Length'));
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Request entity too large',
        code: 'REQUEST_TOO_LARGE',
        maxSize: `${maxSize / 1024 / 1024}MB`
      });
    }
  }
  
  next();
};

// IP whitelist/blacklist middleware
const ipFilterMiddleware = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // IP blacklist check
  const blacklistedIPs = process.env.IP_BLACKLIST ? process.env.IP_BLACKLIST.split(',') : [];
  if (blacklistedIPs.includes(clientIP)) {
    const context = {
      ip: clientIP,
      blacklisted: true,
      path: req.path,
      method: req.method
    };
    
    logError(new Error(`Blacklisted IP attempted access: ${clientIP}`), context);
    
    return res.status(403).json({
      error: 'Access denied',
      code: 'IP_BLACKLISTED'
    });
  }
  
  // IP whitelist check (if configured)
  const whitelistedIPs = process.env.IP_WHITELIST ? process.env.IP_WHITELIST.split(',') : [];
  if (whitelistedIPs.length > 0 && !whitelistedIPs.includes(clientIP)) {
    const context = {
      ip: clientIP,
      notWhitelisted: true,
      path: req.path,
      method: req.method
    };
    
    logError(new Error(`Non-whitelisted IP attempted access: ${clientIP}`), context);
    
    return res.status(403).json({
      error: 'Access denied',
      code: 'IP_NOT_WHITELISTED'
    });
  }
  
  next();
};

// Security headers middleware
const securityHeadersMiddleware = (req, res, next) => {
  // Additional custom security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'X-Download-Options': 'noopen',
    'X-DNS-Prefetch-Control': 'off',
    'Expect-CT': 'max-age=86400, enforce'
  });
  
  // Remove potentially sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

// Comprehensive security middleware stack
const securityMiddlewareStack = [
  requestIdMiddleware,
  helmetConfig,
  securityHeadersMiddleware,
  requestSizeValidation,
  contentTypeValidation,
  ipFilterMiddleware,
  inputSanitizationMiddleware
];

module.exports = {
  // Individual middleware
  requestIdMiddleware,
  helmetConfig,
  inputSanitizationMiddleware,
  contentTypeValidation,
  requestSizeValidation,
  ipFilterMiddleware,
  securityHeadersMiddleware,
  
  // Rate limiters
  generalRateLimit,
  authRateLimit,
  adminRateLimit,
  createRateLimiter,
  
  // Complete security stack
  securityMiddlewareStack,
  
  // Configuration
  SECURITY_CONFIG
};