const express = require('express');
const cors = require('cors');
const os = require('os');

// API モジュールインポート
const incidentsApi = require('./api/incidents');
const assetsApi = require('./api/assets');
const serviceRequestsApi = require('./api/service-requests-simple');
const complianceApi = require('./api/compliance');
const changesApi = require('./api/changes-enhanced');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 8082;

// より寛容なCORS設定
app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://192.168.3.92:3001',
    'http://10.212.134.20:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// リクエストログ
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.get('Origin')} - IP: ${req.ip}`);
  next();
});

// ルートエンドポイント
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    message: '✅ ITSM API Server is running successfully!',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0-quick',
    server: 'Express Quick Server',
    platform: process.platform,
    nodeVersion: process.version,
    networkInfo: getNetworkInfo(),
    endpoints: [
      'GET / - This endpoint',
      'GET /api/health - Health check',
      'POST /api/auth/login - Mock login',
      'GET /api/test - Test endpoint',
      'GET /api/incidents - Incidents API',
      'GET /api/assets - Assets API',
      'GET /api/compliance - Compliance API',
      'GET /api/changes - Change Management API'
    ]
  });
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ 
    status: '✅ OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0-quick',
    database: '🔧 Mock',
    server: 'Express Quick Server',
    uptime: process.uptime()
  });
});

// テストエンドポイント
app.get('/api/test', (req, res) => {
  res.json({
    message: '🎉 API is working perfectly!',
    timestamp: new Date().toISOString(),
    server: 'Node.js Express Quick Server',
    environment: process.env.NODE_ENV || 'development',
    platform: process.platform,
    nodeVersion: process.version,
    requestInfo: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      ip: req.ip
    }
  });
});

// ネットワーク情報取得
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

// モック認証API
app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // 簡易認証（テスト用）
  if ((username === 'admin' && password === 'admin123') || 
      (username === 'operator' && password === 'operator123')) {
    
    const mockToken = `mock-jwt-token-${Date.now()}`;
    
    const response = {
      success: true,
      token: mockToken,
      user: {
        id: username === 'admin' ? 1 : 2,
        username: username,
        role: username === 'admin' ? 'administrator' : 'operator',
        email: `${username}@company.com`
      },
      message: '✅ Login successful (mock)'
    };
    
    console.log('Login successful:', response);
    res.json(response);
  } else {
    console.log('Login failed: Invalid credentials');
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// 簡単なPingエンドポイント
app.get('/ping', (req, res) => {
  res.send('pong');
});

// インシデント管理API（認証なしで開始）
app.get('/api/incidents', incidentsApi.getIncidents);
app.get('/api/incidents/stats', incidentsApi.getIncidentStats);
app.get('/api/incidents/:id', incidentsApi.getIncidentById);
app.post('/api/incidents', incidentsApi.createIncident);
app.put('/api/incidents/:id', incidentsApi.updateIncident);
app.delete('/api/incidents/:id', incidentsApi.deleteIncident);

// 資産管理API
app.get('/api/assets', assetsApi.getAssets);
app.get('/api/assets/stats', assetsApi.getAssetStats);
app.get('/api/assets/generate-tag', assetsApi.generateAssetTagEndpoint);
app.get('/api/assets/:id', assetsApi.getAssetById);
app.post('/api/assets', assetsApi.createAsset);
app.put('/api/assets/:id', assetsApi.updateAsset);
app.delete('/api/assets/:id', assetsApi.deleteAsset);

// コンプライアンス管理API
app.use('/api/compliance', complianceApi);

// Mock user middleware for development
const mockAuthMiddleware = (req, res, next) => {
  // For development, use mock user info
  const token = req.headers['authorization'];
  if (token && token.includes('mock-jwt-token')) {
    // Extract user info from mock token or use default
    req.user = {
      user_id: 1,
      username: 'admin',
      role: 'administrator',
      email: 'admin@company.com'
    };
  }
  next();
};

// サービスリクエスト管理API
app.get('/api/service-requests', mockAuthMiddleware, serviceRequestsApi.getServiceRequests);
app.get('/api/service-requests/stats', mockAuthMiddleware, serviceRequestsApi.getServiceRequestStats);
app.get('/api/service-requests/:id', mockAuthMiddleware, serviceRequestsApi.getServiceRequestById);
app.post('/api/service-requests', mockAuthMiddleware, serviceRequestsApi.createServiceRequest);
app.put('/api/service-requests/:id', mockAuthMiddleware, serviceRequestsApi.updateServiceRequest);
app.put('/api/service-requests/:id/approve', mockAuthMiddleware, serviceRequestsApi.approveServiceRequest);
app.put('/api/service-requests/:id/fulfill', mockAuthMiddleware, serviceRequestsApi.fulfillServiceRequest);
app.put('/api/service-requests/:id/transition', mockAuthMiddleware, serviceRequestsApi.transitionServiceRequest);
app.delete('/api/service-requests/:id', mockAuthMiddleware, serviceRequestsApi.deleteServiceRequest);

// 変更管理API
app.get('/api/changes', changesApi.getChanges);
app.get('/api/changes/stats', changesApi.getChangeStats);
app.get('/api/changes/:id', changesApi.getChangeById);
app.post('/api/changes', mockAuthMiddleware, changesApi.createChange);
app.put('/api/changes/:id', mockAuthMiddleware, changesApi.updateChange);
app.delete('/api/changes/:id', mockAuthMiddleware, changesApi.deleteChange);
app.post('/api/changes/:id/approve', mockAuthMiddleware, changesApi.approveChange);
app.post('/api/changes/:id/start-implementation', mockAuthMiddleware, changesApi.startImplementation);
app.post('/api/changes/:id/complete-implementation', mockAuthMiddleware, changesApi.completeImplementation);

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({ 
    error: '❌ API endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/test',
      'GET /ping',
      'POST /api/auth/login',
      'GET /api/incidents',
      'GET /api/incidents/stats',
      'GET /api/incidents/:id',
      'POST /api/incidents',
      'PUT /api/incidents/:id',
      'DELETE /api/incidents/:id',
      'GET /api/assets',
      'GET /api/assets/stats',
      'GET /api/assets/:id',
      'POST /api/assets',
      'PUT /api/assets/:id',
      'DELETE /api/assets/:id',
      'GET /api/compliance/controls',
      'POST /api/compliance/controls',
      'PUT /api/compliance/controls/:id',
      'DELETE /api/compliance/controls/:id',
      'GET /api/compliance/audits',
      'GET /api/compliance/risks',
      'GET /api/changes',
      'GET /api/changes/stats',
      'GET /api/changes/:id',
      'POST /api/changes',
      'PUT /api/changes/:id',
      'DELETE /api/changes/:id',
      'POST /api/changes/:id/approve'
    ]
  });
});

// サーバー起動
const server = app.listen(PORT, '0.0.0.0', () => {
  const networkInfo = getNetworkInfo();
  
  console.log('\n🚀 ITSM Quick API Server Started Successfully!');
  console.log('================================================');
  console.log(`📍 Server bound to: 0.0.0.0:${PORT}`);
  console.log(`🕒 Started at: ${new Date().toISOString()}`);
  console.log('================================================');
  console.log('🌐 Access URLs:');
  console.log(`   http://localhost:${PORT}`);
  console.log(`   http://127.0.0.1:${PORT}`);
  
  Object.entries(networkInfo).forEach(([name, address]) => {
    console.log(`   http://${address}:${PORT} (${name})`);
  });
  
  console.log('================================================');
  console.log('🔗 Test Endpoints:');
  console.log(`   GET  http://localhost:${PORT}/ping`);
  console.log(`   GET  http://localhost:${PORT}/api/test`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   POST http://localhost:${PORT}/api/auth/login`);
  console.log('================================================');
  console.log('🔑 Test Login Credentials:');
  console.log('   Username: admin    Password: admin123');
  console.log('   Username: operator Password: operator123');
  console.log('================================================');
  console.log('📝 Server is ready to accept connections!');
  console.log('   Press Ctrl+C to stop the server');
  console.log('================================================\n');
});

// エラーハンドリング
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.log('💡 Try using a different port or stop other services:');
    console.log(`   PORT=8081 npm start`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});