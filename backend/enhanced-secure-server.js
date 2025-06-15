/**
 * Enhanced Secure Server for ServiceGrid ITSM
 * Comprehensive security, performance monitoring, and robust error handling
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const fs = require('fs').promises;

// Import enhanced security middleware
const {
  authenticateToken,
  requireRole,
  validateAndSanitize,
  requestResponseLogger,
  securityHeaders,
  databaseHealthCheck,
  RATE_LIMITS,
  logAuditEvent,
  logSecurityEvent,
  generateRequestId
} = require('./middleware/enhanced-security');

// Import enhanced APIs
const authEnhanced = require('./api/auth-enhanced');
const assetsEnhanced = require('./api/assets-enhanced');

// Import utilities
const { 
  errorHandler,
  apiResponse,
  generateRequestId: genReqId
} = require('./utils/errorHandler');
const { pool } = require('./services/enhanced-database');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8082;

// Trust proxy for proper IP detection
app.set('trust proxy', true);

// Global error handling for uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await logSecurityEvent('UNCAUGHT_EXCEPTION', {
    details: { error: error.message, stack: error.stack },
    severity: 'CRITICAL'
  });
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await logSecurityEvent('UNHANDLED_REJECTION', {
    details: { reason: reason?.message || reason, stack: reason?.stack },
    severity: 'HIGH'
  });
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    try {
      // Close database connections
      await pool.close();
      
      await logAuditEvent('SERVER_SHUTDOWN', {
        details: { signal, timestamp: new Date().toISOString() }
      });
      
      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.log('Force shutdown');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3001', 'http://localhost:5173'];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 
    'Authorization', 'X-Request-ID', 'X-Device-Fingerprint'
  ],
  exposedHeaders: ['X-Request-ID', 'X-Rate-Limit-Remaining'],
  maxAge: 86400 // 24 hours
};

// Security middleware stack
app.use(helmet({
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
  }
}));

app.use(securityHeaders);
app.use(compression());
app.use(cors(corsOptions));

// Request parsing middleware with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = req.get('X-Request-ID') || generateRequestId();
  res.set('X-Request-ID', req.requestId);
  next();
});

// Request/Response logging
app.use(requestResponseLogger);

// Database health check for all API routes
app.use('/api', databaseHealthCheck);

// Input validation and sanitization
app.use('/api', validateAndSanitize({ maxSize: 10 * 1024 * 1024 })); // 10MB

// Health check endpoint (no auth required)
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    
    // Get system stats
    const stats = pool.getStats();
    
    return apiResponse(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      database: {
        connected: true,
        poolStats: stats
      },
      memory: process.memoryUsage(),
      nodeVersion: process.version
    });
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Authentication routes (with auth rate limiting)
app.use('/api/auth', RATE_LIMITS.auth);
app.post('/api/auth/login', authEnhanced.login);
app.post('/api/auth/refresh', authEnhanced.refreshToken);

// Protected authentication routes
app.get('/api/auth/me', authenticateToken, authEnhanced.getMe);
app.post('/api/auth/logout', authenticateToken, authEnhanced.logout);
app.put('/api/auth/password', authenticateToken, authEnhanced.changePassword);

// Assets API routes with role-based access control
app.use('/api/assets', RATE_LIMITS.api);

// Assets endpoints with proper authorization
app.get('/api/assets', 
  authenticateToken, 
  requireRole(['readonly', 'user', 'operator', 'administrator']),
  assetsEnhanced.getAssets
);

app.get('/api/assets/stats', 
  authenticateToken, 
  requireRole(['user', 'operator', 'administrator']),
  assetsEnhanced.getAssetStats
);

app.get('/api/assets/generate-tag',
  authenticateToken,
  requireRole(['operator', 'administrator']),
  assetsEnhanced.generateAssetTagEndpoint
);

app.get('/api/assets/:id', 
  authenticateToken, 
  requireRole(['readonly', 'user', 'operator', 'administrator']),
  assetsEnhanced.getAssetById
);

app.post('/api/assets', 
  authenticateToken, 
  requireRole(['operator', 'administrator']),
  assetsEnhanced.createAsset
);

app.put('/api/assets/:id', 
  authenticateToken, 
  requireRole(['operator', 'administrator']),
  assetsEnhanced.updateAsset
);

app.delete('/api/assets/:id', 
  authenticateToken, 
  requireRole(['administrator']),
  assetsEnhanced.deleteAsset
);

// Admin-only endpoints with strict rate limiting
app.use('/api/admin', RATE_LIMITS.critical);
app.use('/api/admin', authenticateToken, requireRole(['administrator']));

// System administration endpoints
app.get('/api/admin/audit-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, eventType, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    const params = [];
    
    if (eventType) {
      whereClause += 'WHERE event_type = ?';
      params.push(eventType);
    }
    
    if (startDate) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += 'created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += 'created_at <= ?';
      params.push(endDate);
    }
    
    const [logs, totalResult] = await Promise.all([
      pool.query(`
        SELECT * FROM audit_logs 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), offset]),
      
      pool.query(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`, params)
    ]);
    
    await logAuditEvent('AUDIT_LOGS_ACCESSED', {
      userId: req.user.userId,
      username: req.user.username,
      ip: req.ip,
      requestId: req.requestId,
      details: { page, limit, eventType, startDate, endDate }
    });
    
    return apiResponse(res, {
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult[0].total,
        totalPages: Math.ceil(totalResult[0].total / limit)
      }
    });
    
  } catch (error) {
    throw error;
  }
});

app.get('/api/admin/security-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, severity, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    const params = [];
    
    if (severity) {
      whereClause += 'WHERE severity = ?';
      params.push(severity);
    }
    
    if (startDate) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += 'created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += 'created_at <= ?';
      params.push(endDate);
    }
    
    const [logs, totalResult] = await Promise.all([
      pool.query(`
        SELECT * FROM security_logs 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), offset]),
      
      pool.query(`SELECT COUNT(*) as total FROM security_logs ${whereClause}`, params)
    ]);
    
    await logAuditEvent('SECURITY_LOGS_ACCESSED', {
      userId: req.user.userId,
      username: req.user.username,
      ip: req.ip,
      requestId: req.requestId,
      details: { page, limit, severity, startDate, endDate }
    });
    
    return apiResponse(res, {
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult[0].total,
        totalPages: Math.ceil(totalResult[0].total / limit)
      }
    });
    
  } catch (error) {
    throw error;
  }
});

app.get('/api/admin/system-stats', async (req, res) => {
  try {
    const dbStats = pool.getStats();
    const memUsage = process.memoryUsage();
    
    const stats = {
      server: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        }
      },
      database: dbStats,
      timestamp: new Date().toISOString()
    };
    
    await logAuditEvent('SYSTEM_STATS_ACCESSED', {
      userId: req.user.userId,
      username: req.user.username,
      ip: req.ip,
      requestId: req.requestId
    });
    
    return apiResponse(res, stats);
    
  } catch (error) {
    throw error;
  }
});

// Catch all for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      type: 'NOT_FOUND_ERROR',
      message: 'API endpoint not found',
      code: 'ENDPOINT_NOT_FOUND',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    }
  });
});

// Global error handler
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database pool
    await pool.initialize();
    
    // Ensure required tables exist
    await ensureTablesExist();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Enhanced Secure Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 Security features enabled: JWT, Rate limiting, Audit logging`);
      console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
      
      // Log server startup
      logAuditEvent('SERVER_STARTED', {
        details: { 
          port: PORT, 
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          timestamp: new Date().toISOString()
        }
      });
    });
    
    // Store server reference for graceful shutdown
    global.server = server;
    
    return server;
    
  } catch (error) {
    console.error('Failed to start server:', error);
    await logSecurityEvent('SERVER_START_FAILED', {
      details: { error: error.message },
      severity: 'CRITICAL'
    });
    process.exit(1);
  }
}

// Ensure required database tables exist
async function ensureTablesExist() {
  const requiredTables = [
    {
      name: 'audit_logs',
      sql: `
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type VARCHAR(50) NOT NULL,
          user_id INTEGER,
          username VARCHAR(100),
          ip_address VARCHAR(45),
          user_agent TEXT,
          endpoint VARCHAR(255),
          method VARCHAR(10),
          details TEXT,
          success BOOLEAN DEFAULT 1,
          error_code VARCHAR(50),
          request_id VARCHAR(100),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    {
      name: 'security_logs',
      sql: `
        CREATE TABLE IF NOT EXISTS security_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) DEFAULT 'MEDIUM',
          ip_address VARCHAR(45),
          user_agent TEXT,
          endpoint VARCHAR(255),
          method VARCHAR(10),
          details TEXT,
          blocked BOOLEAN DEFAULT 0,
          request_id VARCHAR(100),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    {
      name: 'user_sessions',
      sql: `
        CREATE TABLE IF NOT EXISTS user_sessions (
          session_id VARCHAR(100) PRIMARY KEY,
          user_id INTEGER NOT NULL,
          refresh_token TEXT,
          ip_address VARCHAR(45),
          user_agent TEXT,
          device_fingerprint VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
      `
    },
    {
      name: 'login_attempts',
      sql: `
        CREATE TABLE IF NOT EXISTS login_attempts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ip_address VARCHAR(45),
          username VARCHAR(100),
          success BOOLEAN DEFAULT 0,
          reason VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    }
  ];
  
  for (const table of requiredTables) {
    try {
      await pool.query(table.sql);
      console.log(`✅ Table ${table.name} ready`);
    } catch (error) {
      console.error(`❌ Failed to create table ${table.name}:`, error);
      throw error;
    }
  }
  
  // Create indexes for performance
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON security_logs(severity)',
    'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_username ON login_attempts(ip_address, username)',
    'CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at)'
  ];
  
  for (const indexSql of indexes) {
    try {
      await pool.query(indexSql);
    } catch (error) {
      console.warn('Index creation warning:', error.message);
    }
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;