/**
 * Enhanced ServiceGrid ITSM API Server
 * 
 * Features:
 * - Advanced security with comprehensive middleware stack
 * - Enhanced database connection pooling and performance monitoring
 * - Structured error handling and audit logging
 * - Rate limiting with different tiers for different operations
 * - Input validation and sanitization
 * - Health monitoring and metrics collection
 * - Graceful shutdown and resource cleanup
 * - Performance optimizations and caching
 */

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const os = require('os');
const path = require('path');
require('dotenv').config();

// Enhanced modules
const { pool } = require('./services/enhanced-database');
const { 
  securityMiddlewareStack,
  generalRateLimit,
  authRateLimit,
  adminRateLimit
} = require('./middleware/enhanced-security');
const { 
  authenticateToken, 
  requireRole,
  setSecurityHeaders 
} = require('./middleware/auth');
const { errorHandler } = require('./utils/errorHandler');

// Enhanced API modules
const authApiEnhanced = require('./api/auth-enhanced');
const assetsApiEnhanced = require('./api/assets-enhanced');

// Legacy API modules (will be gradually replaced)
const incidentsApi = require('./api/incidents');
const serviceRequestsApi = require('./api/service-requests');
const changesApi = require('./api/changes');
const knowledgeApi = require('./api/knowledge');
const slasApi = require('./api/slas');

// Configuration
const PORT = process.env.PORT || 8082;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ENABLE_COMPRESSION = process.env.ENABLE_COMPRESSION !== 'false';
const ENABLE_DETAILED_LOGGING = process.env.ENABLE_DETAILED_LOGGING === 'true';

// Performance monitoring
const metrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    averageResponseTime: 0,
    totalResponseTime: 0
  },
  server: {
    startTime: Date.now(),
    uptime: 0
  }
};

// Express app setup
const app = express();

// Trust proxy for proper IP detection
app.set('trust proxy', true);

// Performance monitoring middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    metrics.requests.total++;
    metrics.requests.totalResponseTime += responseTime;
    metrics.requests.averageResponseTime = Math.round(metrics.requests.totalResponseTime / metrics.requests.total);
    
    if (res.statusCode < 400) {
      metrics.requests.successful++;
    } else {
      metrics.requests.failed++;
    }
    
    if (ENABLE_DETAILED_LOGGING) {
      console.log(`${req.method} ${req.path} - ${res.statusCode} - ${responseTime}ms`);
    }
  });
  
  next();
});

// Compression middleware
if (ENABLE_COMPRESSION) {
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6,
    threshold: 1024
  }));
}

// Security middleware stack
securityMiddlewareStack.forEach(middleware => {
  app.use(middleware);
});

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://192.168.3.92:3001',
      'http://10.212.134.20:3001'
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log unauthorized origin attempts
    console.warn(`❌ Blocked request from unauthorized origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-Session-ID',
    'X-Request-ID'
  ],
  exposedHeaders: ['X-Request-ID', 'X-Rate-Limit-Remaining']
}));

// Body parsing with size limits
app.use(express.json({ 
  limit: process.env.MAX_JSON_SIZE || '10mb',
  strict: true
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_URL_ENCODED_SIZE || '1mb'
}));

// Enhanced request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const ip = req.ip;
  const userAgent = req.get('User-Agent') || 'unknown';
  const requestId = req.id;
  
  console.log(`[${timestamp}] ${requestId} | ${method} ${path} | IP: ${ip}`);
  
  if (NODE_ENV === 'development' && ['POST', 'PUT', 'PATCH'].includes(method)) {
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`Body:`, JSON.stringify(req.body, null, 2).substring(0, 500));
    }
  }
  
  next();
});

// Health monitoring
function getSystemHealth() {
  const uptime = Date.now() - metrics.server.startTime;
  const memUsage = process.memoryUsage();
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: {
      ms: uptime,
      human: formatUptime(uptime)
    },
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    },
    performance: {
      requests: metrics.requests,
      database: pool.getStats()
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      env: NODE_ENV
    }
  };
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const info = {};
  
  Object.keys(interfaces).forEach(name => {
    interfaces[name].forEach(net => {
      if (net.family === 'IPv4' && !net.internal) {
        info[name] = net.address;
      }
    });
  });
  
  return info;
}

// ================================================
// PUBLIC ENDPOINTS (No Authentication Required)
// ================================================

// Root endpoint with comprehensive API information
app.get('/', (req, res) => {
  const health = getSystemHealth();
  
  res.json({
    message: '🛡️ ServiceGrid ITSM Enhanced API Server',
    status: 'OK',
    version: '3.0.0-enhanced',
    server: 'Express Enhanced Server',
    timestamp: new Date().toISOString(),
    uptime: health.uptime.human,
    health: {
      status: health.status,
      requests_processed: metrics.requests.total,
      success_rate: metrics.requests.total > 0 ? 
        Math.round((metrics.requests.successful / metrics.requests.total) * 100) : 100,
      average_response_time: `${metrics.requests.averageResponseTime}ms`
    },
    network: getNetworkInfo(),
    security_features: [
      'Enhanced JWT Authentication with Refresh Tokens',
      'Role-based Access Control (RBAC)',
      'Multi-tier Rate Limiting',
      'Advanced Input Sanitization',
      'SQL Injection Protection',
      'XSS Protection',
      'CSRF Protection',
      'Security Headers (Helmet)',
      'Request/Response Compression',
      'Audit Logging',
      'Session Management',
      'Account Lockout Protection',
      'Password Strength Validation'
    ],
    endpoints: {
      public: [
        'GET / - API Information',
        'GET /api/health - Detailed Health Check',
        'GET /ping - Simple Ping',
        'POST /api/auth/login - User Authentication'
      ],
      protected: [
        'GET /api/auth/me - User Profile',
        'POST /api/auth/logout - User Logout',
        'POST /api/auth/refresh - Token Refresh',
        'PUT /api/auth/password - Change Password',
        'GET /api/auth/sessions - Active Sessions',
        'GET /api/assets - Enhanced Assets Management',
        'GET /api/incidents - Incidents Management',
        'GET /api/service-requests - Service Requests',
        'GET /api/changes - Change Management',
        'GET /api/knowledge - Knowledge Base',
        'GET /api/slas - SLA Management'
      ],
      admin: [
        'DELETE /api/assets/:id - Delete Asset',
        'DELETE /api/incidents/:id - Delete Incident',
        'POST /api/assets/bulk-update - Bulk Asset Operations'
      ]
    }
  });
});

// Enhanced health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const health = getSystemHealth();
    
    // Test database connection
    const dbStart = Date.now();
    await pool.query('SELECT 1 as test');
    const dbResponseTime = Date.now() - dbStart;
    
    health.database = {
      status: 'connected',
      response_time: `${dbResponseTime}ms`,
      pool_stats: pool.getStats()
    };
    
    // Determine overall health status
    if (dbResponseTime > 5000 || metrics.requests.averageResponseTime > 2000) {
      health.status = 'degraded';
    }
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
    
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Simple ping endpoint
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Metrics endpoint (basic auth might be added later)
app.get('/api/metrics', (req, res) => {
  res.json({
    server: metrics,
    database: pool.getStats(),
    system: {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      platform: process.platform,
      nodeVersion: process.version
    }
  });
});

// ================================================
// AUTHENTICATION ENDPOINTS
// ================================================

// Apply auth rate limiting to authentication endpoints
app.use('/api/auth/login', authRateLimit);
app.use('/api/auth/refresh', authRateLimit);

// Authentication routes (enhanced)
app.post('/api/auth/login', authApiEnhanced.login);
app.post('/api/auth/refresh', authApiEnhanced.refreshToken);

// Protected auth routes
app.get('/api/auth/me', authenticateToken, authApiEnhanced.getMe);
app.post('/api/auth/logout', authenticateToken, authApiEnhanced.logout);
app.put('/api/auth/password', authenticateToken, authApiEnhanced.changePassword);
app.get('/api/auth/sessions', authenticateToken, authApiEnhanced.getSessions);
app.delete('/api/auth/sessions/:session_id', authenticateToken, authApiEnhanced.revokeSession);

// ================================================
// PROTECTED API ENDPOINTS
// ================================================

// Apply general rate limiting to all API endpoints
app.use('/api', generalRateLimit);

// Enhanced Assets API
app.get('/api/assets', authenticateToken, assetsApiEnhanced.getAssets);
app.get('/api/assets/stats', authenticateToken, assetsApiEnhanced.getAssetStats);
app.get('/api/assets/generate-tag', authenticateToken, assetsApiEnhanced.generateAssetTagEndpoint);
app.get('/api/assets/:id', authenticateToken, assetsApiEnhanced.getAssetById);
app.post('/api/assets', authenticateToken, assetsApiEnhanced.createAsset);
app.put('/api/assets/:id', authenticateToken, assetsApiEnhanced.updateAsset);
app.post('/api/assets/bulk-update', authenticateToken, requireRole(['administrator', 'operator']), assetsApiEnhanced.bulkUpdateAssets);
app.delete('/api/assets/:id', authenticateToken, requireRole(['administrator']), adminRateLimit, assetsApiEnhanced.deleteAsset);

// Incidents API (legacy - to be enhanced)
app.get('/api/incidents', authenticateToken, incidentsApi.getIncidents);
app.get('/api/incidents/stats', authenticateToken, incidentsApi.getIncidentStats);
app.get('/api/incidents/:id', authenticateToken, incidentsApi.getIncidentById);
app.post('/api/incidents', authenticateToken, incidentsApi.createIncident);
app.put('/api/incidents/:id', authenticateToken, incidentsApi.updateIncident);
app.delete('/api/incidents/:id', authenticateToken, requireRole(['administrator']), adminRateLimit, incidentsApi.deleteIncident);

// Service Requests API (legacy - to be enhanced)
app.get('/api/service-requests', authenticateToken, serviceRequestsApi.getServiceRequests);
app.get('/api/service-requests/stats', authenticateToken, serviceRequestsApi.getServiceRequestStats);
app.get('/api/service-requests/:id', authenticateToken, serviceRequestsApi.getServiceRequestById);
app.post('/api/service-requests', authenticateToken, serviceRequestsApi.createServiceRequest);
app.put('/api/service-requests/:id', authenticateToken, serviceRequestsApi.updateServiceRequest);
app.delete('/api/service-requests/:id', authenticateToken, requireRole(['administrator']), adminRateLimit, serviceRequestsApi.deleteServiceRequest);

// Changes API (legacy - to be enhanced)  
app.get('/api/changes', authenticateToken, changesApi.getChanges || ((req, res) => res.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })));
app.get('/api/changes/stats', authenticateToken, changesApi.getChangeStats || ((req, res) => res.json({ total: 0, by_status: {} })));

// Knowledge API (legacy - to be enhanced)
app.get('/api/knowledge', authenticateToken, knowledgeApi.getKnowledge || ((req, res) => res.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })));
app.get('/api/knowledge/stats', authenticateToken, knowledgeApi.getKnowledgeStats || ((req, res) => res.json({ total: 0, by_category: {} })));

// SLAs API (legacy - to be enhanced)
app.get('/api/slas', authenticateToken, slasApi.getSLAs || ((req, res) => res.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })));
app.get('/api/slas/stats', authenticateToken, slasApi.getSLAStats || ((req, res) => res.json({ total: 0, by_status: {} })));

// ================================================
// ERROR HANDLING
// ================================================

// Global error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      type: 'ENDPOINT_NOT_FOUND',
      message: 'API endpoint not found',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      request_id: req.id
    },
    suggestion: 'Check the API documentation at GET / for available endpoints'
  });
});

// ================================================
// SERVER LIFECYCLE MANAGEMENT
// ================================================

let server;

async function startServer() {
  try {
    // Initialize database pool
    console.log('🔄 Initializing enhanced database pool...');
    await pool.initialize();
    
    // Start server
    server = app.listen(PORT, '0.0.0.0', () => {
      const networkInfo = getNetworkInfo();
      
      console.log('\n🚀 ServiceGrid ITSM Enhanced API Server Started!');
      console.log('========================================================');
      console.log(`📍 Server: 0.0.0.0:${PORT}`);
      console.log(`🕒 Started: ${new Date().toISOString()}`);
      console.log(`⚙️  Environment: ${NODE_ENV}`);
      console.log(`🗃️  Database: Enhanced SQLite with connection pooling`);
      console.log('========================================================');
      console.log('🌐 Access URLs:');
      console.log(`   http://localhost:${PORT}`);
      console.log(`   http://127.0.0.1:${PORT}`);
      
      Object.entries(networkInfo).forEach(([name, address]) => {
        console.log(`   http://${address}:${PORT} (${name})`);
      });
      
      console.log('========================================================');
      console.log('🔗 Key Endpoints:');
      console.log(`   GET  http://localhost:${PORT}/ - API Documentation`);
      console.log(`   GET  http://localhost:${PORT}/api/health - Health Check`);
      console.log(`   POST http://localhost:${PORT}/api/auth/login - Authentication`);
      console.log(`   GET  http://localhost:${PORT}/api/metrics - Server Metrics`);
      console.log('========================================================');
      console.log('🛡️  Enhanced Security Features:');
      console.log('   ✅ Multi-tier Rate Limiting');
      console.log('   ✅ Advanced Input Sanitization');
      console.log('   ✅ Enhanced JWT with Refresh Tokens');
      console.log('   ✅ Session Management');
      console.log('   ✅ Account Lockout Protection'); 
      console.log('   ✅ Audit Logging');
      console.log('   ✅ Database Connection Pooling');
      console.log('   ✅ Performance Monitoring');
      console.log('   ✅ Error Tracking');
      console.log('========================================================');
      console.log('🔑 Test Credentials:');
      console.log('   Username: admin    Password: admin123');
      console.log('   Username: operator Password: operator123');
      console.log('========================================================');
      console.log('📊 Server is ready for enhanced ITSM operations!');
      console.log('   Press Ctrl+C for graceful shutdown');
      console.log('========================================================\n');
    });
    
    // Error handling
    server.on('error', handleServerError);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

function handleServerError(err) {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.log('💡 Solutions:');
    console.log(`   • Use different port: PORT=8081 npm start`);
    console.log(`   • Kill existing process: lsof -ti:${PORT} | xargs kill -9`);
    console.log(`   • Check running processes: netstat -tulpn | grep ${PORT}`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
}

async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}, initiating graceful shutdown...`);
  
  const shutdownTimeout = setTimeout(() => {
    console.log('⚠️  Graceful shutdown timeout, forcing exit...');
    process.exit(1);
  }, 30000); // 30 second timeout
  
  try {
    // Stop accepting new connections
    if (server) {
      console.log('🔄 Closing HTTP server...');
      await new Promise((resolve) => {
        server.close(() => {
          console.log('✅ HTTP server closed');
          resolve();
        });
      });
    }
    
    // Close database pool
    console.log('🔄 Closing database pool...');
    await pool.close();
    
    console.log('✅ Enhanced server shutdown complete');
    clearTimeout(shutdownTimeout);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

// Process signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, gracefulShutdown };