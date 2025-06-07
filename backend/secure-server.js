const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const os = require('os');
require('dotenv').config();

// ミドルウェアとAPIモジュールのインポート
const { authenticateToken, requireRole } = require('./middleware/auth');
const authApi = require('./api/auth');
const incidentsApi = require('./api/incidents');
const assetsApi = require('./api/assets');
const serviceRequestsApi = require('./api/service-requests');
const changesApi = require('./api/changes');
const knowledgeApi = require('./api/knowledge');
const slasApi = require('./api/slas');

const app = express();
const PORT = process.env.PORT || 8082;

// セキュリティミドルウェア
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS設定
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://192.168.3.92:3001',
      'http://10.212.134.20:3001'
    ];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// レート制限
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'リクエスト数が制限を超えました。しばらく時間をおいてから再試行してください。',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// パーサー設定
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// リクエストログ
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const origin = req.get('Origin') || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`${timestamp} - ${method} ${path} - Origin: ${origin} - IP: ${ip}`);
  
  // デバッグ情報（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    console.log(`User-Agent: ${userAgent}`);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Request Body:', req.body);
    }
  }
  
  next();
});

// ネットワーク情報取得関数
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
// 公開エンドポイント（認証不要）
// ================================================

// ルートエンドポイント
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    message: '✅ ServiceGrid ITSM Secure API Server',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.0.0-secure',
    server: 'Express Secure Server',
    platform: process.platform,
    nodeVersion: process.version,
    networkInfo: getNetworkInfo(),
    security_features: [
      'JWT Authentication',
      'Role-based Access Control',
      'Rate Limiting',
      'Helmet Security Headers',
      'CORS Protection',
      'Password Hashing (bcrypt)',
      'Audit Logging'
    ],
    endpoints: {
      public: [
        'GET / - This endpoint',
        'GET /api/health - Health check',
        'GET /ping - Simple ping',
        'POST /api/auth/login - User login'
      ],
      protected: [
        'GET /api/auth/me - User profile (JWT required)',
        'POST /api/auth/logout - User logout (JWT required)',
        'PUT /api/auth/password - Change password (JWT required)',
        'GET /api/incidents - Incidents API (JWT required)',
        'GET /api/assets - Assets API (JWT required)',
        'GET /api/service-requests - Service Requests API (JWT required)',
        'GET /api/changes - Change Management API (JWT required)',
        'GET /api/knowledge - Knowledge Base API (JWT required)',
        'GET /api/slas - SLA Management API (JWT required)'
      ]
    }
  });
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
  const uptime = process.uptime();
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMinutes = Math.floor((uptime % 3600) / 60);
  
  res.json({ 
    status: '✅ OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0-secure',
    database: '💾 SQLite',
    server: 'Express Secure Server',
    uptime: `${uptimeHours}h ${uptimeMinutes}m`,
    uptime_seconds: Math.floor(uptime),
    memory_usage: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
    },
    environment: process.env.NODE_ENV || 'development',
    security_status: {
      jwt_configured: !!process.env.JWT_SECRET,
      rate_limiting: 'enabled',
      helmet_protection: 'enabled',
      cors_protection: 'enabled'
    }
  });
});

// 簡単なPingエンドポイント
app.get('/ping', (req, res) => {
  res.send('pong');
});

// ================================================
// 認証API（公開）
// ================================================

app.post('/api/auth/login', authApi.login);

// ================================================
// 保護されたエンドポイント（認証必須）
// ================================================

// 認証API（保護）
app.get('/api/auth/me', authenticateToken, authApi.getMe);
app.post('/api/auth/logout', authenticateToken, authApi.logout);
app.put('/api/auth/password', authenticateToken, authApi.changePassword);

// インシデント管理API
app.get('/api/incidents', authenticateToken, incidentsApi.getIncidents);
app.get('/api/incidents/stats', authenticateToken, incidentsApi.getIncidentStats);
app.get('/api/incidents/:id', authenticateToken, incidentsApi.getIncidentById);
app.post('/api/incidents', authenticateToken, incidentsApi.createIncident);
app.put('/api/incidents/:id', authenticateToken, incidentsApi.updateIncident);
app.delete('/api/incidents/:id', authenticateToken, requireRole(['administrator']), incidentsApi.deleteIncident);

// 資産管理API
app.get('/api/assets', authenticateToken, assetsApi.getAssets);
app.get('/api/assets/stats', authenticateToken, assetsApi.getAssetStats);
app.get('/api/assets/:id', authenticateToken, assetsApi.getAssetById);
app.post('/api/assets', authenticateToken, assetsApi.createAsset);
app.put('/api/assets/:id', authenticateToken, assetsApi.updateAsset);
app.delete('/api/assets/:id', authenticateToken, requireRole(['administrator']), assetsApi.deleteAsset);

// サービスリクエスト管理API
app.get('/api/service-requests', authenticateToken, serviceRequestsApi.getServiceRequests);
app.get('/api/service-requests/stats', authenticateToken, serviceRequestsApi.getServiceRequestStats);
app.get('/api/service-requests/:id', authenticateToken, serviceRequestsApi.getServiceRequestById);
app.post('/api/service-requests', authenticateToken, serviceRequestsApi.createServiceRequest);
app.put('/api/service-requests/:id', authenticateToken, serviceRequestsApi.updateServiceRequest);
app.delete('/api/service-requests/:id', authenticateToken, requireRole(['administrator']), serviceRequestsApi.deleteServiceRequest);

// 変更管理API
app.get('/api/changes', authenticateToken, changesApi.getChanges);
app.get('/api/changes/stats', authenticateToken, changesApi.getChangeStats);
app.get('/api/changes/:id', authenticateToken, changesApi.getChangeById);
app.post('/api/changes', authenticateToken, changesApi.createChange);
app.put('/api/changes/:id', authenticateToken, changesApi.updateChange);
app.delete('/api/changes/:id', authenticateToken, requireRole(['administrator']), changesApi.deleteChange);

// ナレッジ管理API
app.get('/api/knowledge', authenticateToken, knowledgeApi.getKnowledge);
app.get('/api/knowledge/stats', authenticateToken, knowledgeApi.getKnowledgeStats);
app.get('/api/knowledge/search', authenticateToken, knowledgeApi.searchKnowledge);
app.get('/api/knowledge/:id', authenticateToken, knowledgeApi.getKnowledgeById);
app.post('/api/knowledge', authenticateToken, knowledgeApi.createKnowledge);
app.put('/api/knowledge/:id', authenticateToken, knowledgeApi.updateKnowledge);
app.delete('/api/knowledge/:id', authenticateToken, knowledgeApi.deleteKnowledge);

// SLA管理API
app.get('/api/slas', authenticateToken, slasApi.getSLAs);
app.get('/api/slas/stats', authenticateToken, slasApi.getSLAStats);
app.get('/api/slas/alerts', authenticateToken, requireRole(['administrator', 'operator']), slasApi.generateSLAAlerts);
app.get('/api/slas/:id', authenticateToken, slasApi.getSLAById);
app.post('/api/slas', authenticateToken, requireRole(['administrator', 'operator']), slasApi.createSLA);
app.put('/api/slas/:id', authenticateToken, requireRole(['administrator', 'operator']), slasApi.updateSLA);
app.post('/api/slas/bulk-update', authenticateToken, requireRole(['administrator', 'operator']), slasApi.bulkUpdateSLAs);
app.delete('/api/slas/:id', authenticateToken, requireRole(['administrator']), slasApi.deleteSLA);

// ================================================
// エラーハンドリング
// ================================================

// グローバルエラーハンドラー
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  
  // JWT関連エラー
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      error: 'トークンが無効です',
      code: 'INVALID_TOKEN'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      error: 'トークンの有効期限が切れています',
      code: 'TOKEN_EXPIRED'
    });
  }
  
  // その他のエラー
  res.status(500).json({ 
    error: 'サーバー内部エラーが発生しました', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString(),
    code: 'INTERNAL_SERVER_ERROR'
  });
});

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({ 
    error: '❌ APIエンドポイントが見つかりません',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    code: 'ENDPOINT_NOT_FOUND',
    suggestion: 'GET / でAPI情報を確認してください'
  });
});

// ================================================
// サーバー起動
// ================================================

const server = app.listen(PORT, '0.0.0.0', () => {
  const networkInfo = getNetworkInfo();
  
  console.log('\n🛡️  ServiceGrid ITSM Secure API Server Started!');
  console.log('===================================================');
  console.log(`📍 Server bound to: 0.0.0.0:${PORT}`);
  console.log(`🕒 Started at: ${new Date().toISOString()}`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('===================================================');
  console.log('🌐 Access URLs:');
  console.log(`   http://localhost:${PORT}`);
  console.log(`   http://127.0.0.1:${PORT}`);
  
  Object.entries(networkInfo).forEach(([name, address]) => {
    console.log(`   http://${address}:${PORT} (${name})`);
  });
  
  console.log('===================================================');
  console.log('🔗 Available Endpoints:');
  console.log(`   GET  http://localhost:${PORT}/ping`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   POST http://localhost:${PORT}/api/auth/login`);
  console.log('===================================================');
  console.log('🔑 Test Login Credentials:');
  console.log('   Username: admin    Password: admin123');
  console.log('   Username: operator Password: operator123');
  console.log('===================================================');
  console.log('🛡️  Security Features Enabled:');
  console.log('   ✅ JWT Authentication');
  console.log('   ✅ Role-based Access Control');
  console.log('   ✅ Rate Limiting');
  console.log('   ✅ Helmet Security Headers');
  console.log('   ✅ CORS Protection');
  console.log('   ✅ Password Hashing');
  console.log('   ✅ Audit Logging');
  console.log('===================================================');
  console.log('📝 Server is ready to accept secure connections!');
  console.log('   Press Ctrl+C to stop the server');
  console.log('===================================================\n');
});

// エラーハンドリング
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.log('💡 Try using a different port or stop other services:');
    console.log(`   PORT=8081 npm start`);
    console.log(`   Or check: lsof -ti:${PORT} | xargs kill -9`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down secure server gracefully...');
  server.close(() => {
    console.log('✅ Secure server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down...');
  server.close(() => {
    console.log('✅ Secure server stopped');
    process.exit(0);
  });
});

module.exports = app;