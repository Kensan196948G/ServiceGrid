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
      'GET /api/assets - Mock assets',
      'GET /api/compliance - Compliance management',
      'POST /api/compliance - Create compliance item',
      'PUT /api/compliance/:id - Update compliance item',
      'DELETE /api/compliance/:id - Delete compliance item',
      'GET /api/compliance/stats - Compliance statistics',
      'GET /api/audit-logs - Audit logs',
      'POST /api/audit-logs - Create audit log',
      'GET /api/audit-logs/stats - Audit log statistics',
      'GET /api/settings - System settings',
      'PUT /api/settings/:category - Update settings category',
      'GET /api/settings/users - User management',
      'POST /api/settings/users - Create user',
      'PUT /api/settings/users/:id - Update user',
      'DELETE /api/settings/users/:id - Delete user',
      'GET /api/settings/roles - Role management',
      'GET /api/settings/stats - System statistics',
      'GET /api/settings/health - System health'
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


// ==========================================
// System Settings APIs
// ==========================================

// Mock system settings data
const systemSettings = {
  general: {
    systemName: 'ServiceGrid ITSM',
    systemVersion: '2.1.0',
    organizationName: '株式会社サンプル',
    supportEmail: 'support@example.com',
    timezone: 'Asia/Tokyo',
    language: 'ja-JP',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    passwordComplexity: true
  },
  security: {
    enableTwoFactor: false,
    forcePasswordChange: false,
    passwordExpiryDays: 90,
    accountLockoutDuration: 15,
    enableAuditLog: true,
    enableSecurityAlerts: true,
    allowApiAccess: true,
    enableSSO: false,
    ipWhitelist: [],
    maxSessionsPerUser: 3
  },
  notifications: {
    enableEmailNotifications: true,
    enableSMSNotifications: false,
    enablePushNotifications: true,
    sendDailyReports: true,
    sendWeeklyReports: true,
    sendIncidentAlerts: true,
    sendMaintenanceNotices: true,
    defaultEmailTemplate: 'standard',
    emailFromAddress: 'noreply@example.com',
    emailFromName: 'ServiceGrid System'
  },
  backup: {
    enableAutoBackup: true,
    backupFrequency: 'daily',
    backupRetentionDays: 30,
    backupLocation: '/backup/itsm',
    enableCloudBackup: false,
    cloudProvider: 'aws',
    lastBackupDate: new Date().toISOString(),
    nextBackupDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  integration: {
    enableRestAPI: true,
    enableWebhooks: false,
    enableLDAP: false,
    ldapServer: '',
    ldapPort: 389,
    enableActiveDirectory: false,
    adDomain: '',
    enableSAML: false,
    samlProvider: '',
    enableSlackIntegration: false,
    slackWebhookUrl: ''
  }
};

// Mock users data for user management
const systemUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    fullName: '管理者ユーザー',
    role: 'administrator',
    status: 'active',
    lastLogin: '2025-06-20T08:30:00Z',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-20T08:30:00Z',
    loginAttempts: 0,
    isLocked: false,
    mustChangePassword: false,
    twoFactorEnabled: false
  },
  {
    id: 2,
    username: 'operator',
    email: 'operator@example.com',
    fullName: 'オペレータユーザー',
    role: 'operator',
    status: 'active',
    lastLogin: '2025-06-20T09:15:00Z',
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-06-20T09:15:00Z',
    loginAttempts: 0,
    isLocked: false,
    mustChangePassword: false,
    twoFactorEnabled: false
  },
  {
    id: 3,
    username: 'user01',
    email: 'user01@example.com',
    fullName: '一般ユーザー01',
    role: 'user',
    status: 'active',
    lastLogin: '2025-06-19T16:45:00Z',
    createdAt: '2025-02-01T00:00:00Z',
    updatedAt: '2025-06-19T16:45:00Z',
    loginAttempts: 0,
    isLocked: false,
    mustChangePassword: true,
    twoFactorEnabled: false
  },
  {
    id: 4,
    username: 'readonly',
    email: 'readonly@example.com',
    fullName: '読み取り専用ユーザー',
    role: 'readonly',
    status: 'inactive',
    lastLogin: '2025-06-15T14:20:00Z',
    createdAt: '2025-03-01T00:00:00Z',
    updatedAt: '2025-06-15T14:20:00Z',
    loginAttempts: 0,
    isLocked: false,
    mustChangePassword: false,
    twoFactorEnabled: false
  }
];

// Mock roles data
const systemRoles = [
  {
    id: 'administrator',
    name: 'Administrator',
    nameJa: '管理者',
    description: 'Full system access with all privileges',
    descriptionJa: 'すべての権限を持つシステム管理者',
    permissions: [
      'user.create', 'user.read', 'user.update', 'user.delete',
      'asset.create', 'asset.read', 'asset.update', 'asset.delete',
      'incident.create', 'incident.read', 'incident.update', 'incident.delete',
      'settings.read', 'settings.update', 'audit.read', 'reports.generate'
    ],
    isSystem: true,
    userCount: 1
  },
  {
    id: 'operator',
    name: 'Operator',
    nameJa: 'オペレータ',
    description: 'Operational access for daily ITSM tasks',
    descriptionJa: '日常的なITSM業務を実行できるオペレータ',
    permissions: [
      'asset.read', 'asset.update',
      'incident.create', 'incident.read', 'incident.update',
      'user.read'
    ],
    isSystem: true,
    userCount: 1
  },
  {
    id: 'user',
    name: 'User',
    nameJa: '一般ユーザー',
    description: 'Standard user access for basic operations',
    descriptionJa: '基本的な操作が可能な一般ユーザー',
    permissions: [
      'asset.read', 'incident.read', 'incident.create'
    ],
    isSystem: true,
    userCount: 1
  },
  {
    id: 'readonly',
    name: 'Read Only',
    nameJa: '読み取り専用',
    description: 'Read-only access to system data',
    descriptionJa: 'システムデータの読み取り専用アクセス',
    permissions: [
      'asset.read', 'incident.read', 'user.read'
    ],
    isSystem: true,
    userCount: 1
  }
];

// System Settings - Get all settings
app.get('/api/settings', (req, res) => {
  try {
    console.log('Fetching system settings');
    res.json({
      data: systemSettings,
      categories: ['general', 'security', 'notifications', 'backup', 'integration'],
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// System Settings - Update settings
app.put('/api/settings/:category', (req, res) => {
  try {
    const { category } = req.params;
    const updates = req.body;
    
    if (!systemSettings[category]) {
      return res.status(404).json({ error: 'Settings category not found' });
    }
    
    console.log(`Updating ${category} settings:`, updates);
    
    // Update settings
    systemSettings[category] = {
      ...systemSettings[category],
      ...updates
    };
    
    res.json({
      message: `${category} settings updated successfully`,
      data: systemSettings[category],
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// User Management - Get all users
app.get('/api/settings/users', (req, res) => {
  try {
    const { page = 1, pageSize = 20, role, status, search } = req.query;
    
    let filteredUsers = [...systemUsers];
    
    // Apply filters
    if (role) {
      filteredUsers = filteredUsers.filter(user => user.role === role);
    }
    if (status) {
      filteredUsers = filteredUsers.filter(user => user.status === status);
    }
    if (search) {
      filteredUsers = filteredUsers.filter(user => 
        user.username.toLowerCase().includes(search.toLowerCase()) ||
        user.fullName.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Pagination
    const totalCount = filteredUsers.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + parseInt(pageSize));
    
    console.log(`Fetching users: page ${page}, found ${totalCount} users`);
    
    res.json({
      data: paginatedUsers,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// User Management - Create user
app.post('/api/settings/users', (req, res) => {
  try {
    const userData = req.body;
    const newUser = {
      id: systemUsers.length + 1,
      username: userData.username,
      email: userData.email,
      fullName: userData.fullName,
      role: userData.role || 'user',
      status: 'active',
      lastLogin: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      loginAttempts: 0,
      isLocked: false,
      mustChangePassword: true,
      twoFactorEnabled: false
    };
    
    systemUsers.push(newUser);
    
    console.log('Created new user:', newUser.username);
    
    res.status(201).json({
      message: 'User created successfully',
      data: newUser
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// User Management - Update user
app.put('/api/settings/users/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const updates = req.body;
    
    const userIndex = systemUsers.findIndex(user => user.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    systemUsers[userIndex] = {
      ...systemUsers[userIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    console.log(`Updated user ${userId}:`, updates);
    
    res.json({
      message: 'User updated successfully',
      data: systemUsers[userIndex]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// User Management - Delete user
app.delete('/api/settings/users/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const userIndex = systemUsers.findIndex(user => user.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const deletedUser = systemUsers.splice(userIndex, 1)[0];
    
    console.log('Deleted user:', deletedUser.username);
    
    res.json({
      message: 'User deleted successfully',
      data: deletedUser
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Role Management - Get all roles
app.get('/api/settings/roles', (req, res) => {
  try {
    console.log('Fetching system roles');
    res.json({
      data: systemRoles,
      permissions: [
        'user.create', 'user.read', 'user.update', 'user.delete',
        'asset.create', 'asset.read', 'asset.update', 'asset.delete',
        'incident.create', 'incident.read', 'incident.update', 'incident.delete',
        'settings.read', 'settings.update', 'audit.read', 'reports.generate'
      ]
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// System Statistics for settings
app.get('/api/settings/stats', (req, res) => {
  try {
    const stats = {
      users: {
        total: systemUsers.length,
        active: systemUsers.filter(u => u.status === 'active').length,
        inactive: systemUsers.filter(u => u.status === 'inactive').length,
        locked: systemUsers.filter(u => u.isLocked).length,
        byRole: {
          administrator: systemUsers.filter(u => u.role === 'administrator').length,
          operator: systemUsers.filter(u => u.role === 'operator').length,
          user: systemUsers.filter(u => u.role === 'user').length,
          readonly: systemUsers.filter(u => u.role === 'readonly').length
        }
      },
      security: {
        passwordComplexityEnabled: systemSettings.general.passwordComplexity,
        twoFactorEnabled: systemSettings.security.enableTwoFactor,
        auditLogEnabled: systemSettings.security.enableAuditLog,
        sessionTimeoutMinutes: systemSettings.general.sessionTimeout
      },
      system: {
        version: systemSettings.general.systemVersion,
        lastBackup: systemSettings.backup.lastBackupDate,
        nextBackup: systemSettings.backup.nextBackupDate,
        autoBackupEnabled: systemSettings.backup.enableAutoBackup
      }
    };
    
    console.log('Fetching system statistics');
    res.json({
      data: stats,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({ error: 'Failed to fetch system statistics' });
  }
});

// System Health Check
app.get('/api/settings/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      version: systemSettings.general.systemVersion,
      timestamp: new Date().toISOString(),
      services: {
        database: { status: 'operational', responseTime: '2ms' },
        api: { status: 'operational', responseTime: '1ms' },
        authentication: { status: 'operational', responseTime: '5ms' },
        storage: { status: 'operational', responseTime: '3ms' }
      }
    };
    
    console.log('System health check requested');
    res.json({ data: health });
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({ error: 'Failed to check system health' });
  }
});

// 404ハンドラー（すべてのルートの最後に配置）
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
      'GET /api/assets',
      'GET /api/releases',
      'GET /api/releases/stats',
      'POST /api/releases',
      'PUT /api/releases/:id',
      'DELETE /api/releases/:id',
      'GET /api/problems',
      'GET /api/problems/stats',
      'POST /api/problems',
      'PUT /api/problems/:id',
      'DELETE /api/problems/:id',
      'GET /api/security/incidents',
      'GET /api/security/stats',
      'POST /api/security/incidents',
      'PUT /api/security/incidents/:id',
      'DELETE /api/security/incidents/:id',
      'GET /api/compliance',
      'GET /api/compliance/stats',
      'POST /api/compliance',
      'PUT /api/compliance/:id',
      'DELETE /api/compliance/:id',
      'GET /api/audit-logs',
      'GET /api/audit-logs/stats',
      'POST /api/audit-logs',
      'GET /api/settings',
      'PUT /api/settings/:category',
      'GET /api/settings/users',
      'POST /api/settings/users',
      'PUT /api/settings/users/:id',
      'DELETE /api/settings/users/:id',
      'GET /api/settings/roles',
      'GET /api/settings/stats',
      'GET /api/settings/health'
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