const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// ミドルウェア
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// リクエストログ
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    message: 'ITSM API Server is running',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0-quick',
    endpoints: [
      'GET / - This endpoint',
      'GET /api/health - Health check',
      'POST /api/auth/login - Mock login',
      'GET /api/test - Test endpoint',
      'GET /api/incidents - Mock incidents',
      'GET /api/assets - Mock assets'
    ]
  });
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0-quick',
    database: 'Mock',
    server: 'Express Quick Server'
  });
});

// テストエンドポイント
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working perfectly!',
    timestamp: new Date().toISOString(),
    server: 'Node.js Express Quick Server',
    environment: process.env.NODE_ENV || 'development',
    platform: process.platform,
    nodeVersion: process.version
  });
});

// モック認証API
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // 簡易認証（テスト用）
  if ((username === 'admin' && password === 'admin123') || 
      (username === 'operator' && password === 'operator123')) {
    
    const mockToken = `mock-jwt-token-${Date.now()}`;
    
    res.json({
      token: mockToken,
      user: {
        id: username === 'admin' ? 1 : 2,
        username: username,
        role: username === 'admin' ? 'administrator' : 'operator',
        email: `${username}@company.com`
      },
      message: 'Login successful (mock)'
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// モックユーザー情報取得
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || !token.startsWith('mock-jwt-token')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  res.json({
    user_id: 1,
    username: 'admin',
    role: 'administrator',
    email: 'admin@company.com',
    display_name: '管理者'
  });
});

// モックインシデント一覧
app.get('/api/incidents', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  
  const mockIncidents = [
    {
      id: '1',
      title: 'サーバーダウン',
      description: 'Webサーバーが応答しません',
      status: 'Open',
      priority: 'High',
      assignee: 'admin',
      reported_date: '2024-01-15',
      created_date: '2024-01-15T10:00:00Z',
      updated_date: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      title: 'ネットワーク接続エラー',
      description: 'オフィスのネットワークが不安定です',
      status: 'In Progress',
      priority: 'Medium',
      assignee: 'operator',
      reported_date: '2024-01-16',
      created_date: '2024-01-16T14:30:00Z',
      updated_date: '2024-01-16T14:30:00Z'
    }
  ];
  
  res.json({
    data: mockIncidents,
    pagination: {
      page,
      limit,
      total: mockIncidents.length,
      totalPages: Math.ceil(mockIncidents.length / limit)
    }
  });
});

// モック資産一覧
app.get('/api/assets', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  
  const mockAssets = [
    {
      id: '1',
      asset_no: 'SRV001',
      name: 'Webサーバー',
      type: 'Server',
      user: 'IT部',
      location: 'データセンターA',
      status: 'Active',
      warranty_end: '2025-12-31',
      created_date: '2024-01-01T00:00:00Z',
      updated_date: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      asset_no: 'PC001',
      name: '管理者用PC',
      type: 'Hardware',
      user: 'admin',
      location: 'オフィス1F',
      status: 'Active',
      warranty_end: '2024-12-31',
      created_date: '2024-01-01T00:00:00Z',
      updated_date: '2024-01-01T00:00:00Z'
    }
  ];
  
  res.json({
    data: mockAssets,
    pagination: {
      page,
      limit,
      total: mockAssets.length,
      totalPages: Math.ceil(mockAssets.length / limit)
    }
  });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/test',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'GET /api/incidents',
      'GET /api/assets'
    ]
  });
});

// サーバー起動
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 ITSM Quick API Server Started!');
  console.log('================================');
  console.log(`📍 Server: http://0.0.0.0:${PORT}`);
  console.log(`💻 Windows Access: http://localhost:${PORT}`);
  console.log(`🌐 WSL Access: http://192.168.3.92:${PORT}`);
  console.log(`🔗 API Test: http://localhost:${PORT}/api/test`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🕒 Started at: ${new Date().toISOString()}`);
  console.log('================================');
  console.log('🔑 Test Login Credentials:');
  console.log('   admin / admin123');
  console.log('   operator / operator123');
  console.log('================================');
  console.log('🔧 Network Interfaces:');
  const os = require('os');
  const interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach(name => {
    interfaces[name].forEach(net => {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`   ${name}: http://${net.address}:${PORT}`);
      }
    });
  });
  console.log('================================');
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});