const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DB_PATH = path.join(__dirname, 'db', 'itsm.sqlite');

// セキュリティミドルウェア
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// レート制限
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: { error: 'Too many requests from this IP' }
});
app.use('/api/', limiter);

// ミドルウェア
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// リクエストログ
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// データベース接続
let db;
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Connected to SQLite database');
        resolve();
      }
    });
  });
};

// JWT認証ミドルウェア
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// エラーハンドリングミドルウェア
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(409).json({ error: 'Database constraint violation' });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  
  res.status(500).json({ error: 'Internal server error' });
};

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 認証API
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    db.get(
      'SELECT * FROM users WHERE username = ? AND account_locked = FALSE',
      [username],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
          // 失敗回数を増やす
          db.run(
            'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE user_id = ?',
            [user.user_id]
          );
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // ログイン成功時は失敗回数をリセット
        db.run(
          'UPDATE users SET failed_login_attempts = 0, last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
          [user.user_id]
        );

        const token = jwt.sign(
          { 
            userId: user.user_id, 
            username: user.username, 
            role: user.role 
          },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        // 監査ログ
        db.run(
          'INSERT INTO logs (event_type, event_time, username, action, details) VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?)',
          ['Authentication', user.username, 'User Login', `User ${user.username} logged in successfully`]
        );

        res.json({
          token,
          user: {
            id: user.user_id,
            username: user.username,
            role: user.role,
            email: user.email
          }
        });
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ユーザー情報取得
app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get(
    'SELECT user_id, username, role, email, display_name FROM users WHERE user_id = ?',
    [req.user.userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    }
  );
});

// インシデント管理API
app.get('/api/incidents', authenticateToken, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  
  const countQuery = 'SELECT COUNT(*) as total FROM incidents';
  const dataQuery = 'SELECT * FROM incidents ORDER BY created_date DESC LIMIT ? OFFSET ?';
  
  db.get(countQuery, (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    db.all(dataQuery, [limit, offset], (err, incidents) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({
        data: incidents,
        pagination: {
          page,
          limit,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit)
        }
      });
    });
  });
});

app.post('/api/incidents', authenticateToken, (req, res) => {
  const { title, description, priority, assignee } = req.body;
  
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }
  
  db.run(
    'INSERT INTO incidents (title, description, status, priority, assignee, reported_date) VALUES (?, ?, ?, ?, ?, CURRENT_DATE)',
    [title, description, 'Open', priority || 'Medium', assignee],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create incident' });
      }
      
      // 監査ログ
      db.run(
        'INSERT INTO logs (event_type, event_time, username, action, details) VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?)',
        ['Data Modification', req.user.username, 'Create Incident', `Created incident: ${title}`]
      );
      
      res.status(201).json({ 
        id: this.lastID,
        message: 'Incident created successfully' 
      });
    }
  );
});

// API モジュールのインポート
const assetsAPI = require('./api/assets');
const incidentsAPI = require('./api/incidents');
const authAPI = require('./api/auth');
const serviceRequestsAPI = require('./api/service-requests');
const knowledgeAPI = require('./api/knowledge');
const changesAPI = require('./api/changes-enhanced');
const releasesAPI = require('./api/releases');
const problemsAPI = require('./api/problems');
const slasAPI = require('./api/slas');
const capacityAPI = require('./api/capacity');
const availabilityAPI = require('./api/availability');
const auditLogsAPI = require('./api/audit-logs');
const reportsAPI = require('./api/reports');

// 資産管理API
app.get('/api/assets', authenticateToken, assetsAPI.getAssets);
app.get('/api/assets/stats', authenticateToken, assetsAPI.getAssetStats);
app.get('/api/assets/generate-tag', authenticateToken, assetsAPI.generateAssetTagEndpoint);
app.get('/api/assets/:id', authenticateToken, assetsAPI.getAssetById);
app.post('/api/assets', authenticateToken, assetsAPI.createAsset);
app.put('/api/assets/:id', authenticateToken, assetsAPI.updateAsset);
app.delete('/api/assets/:id', authenticateToken, assetsAPI.deleteAsset);

// インシデント管理API（拡張版に置き換え）
app.get('/api/incidents', authenticateToken, incidentsAPI.getIncidents);
app.get('/api/incidents/stats', authenticateToken, incidentsAPI.getIncidentStats);
app.get('/api/incidents/:id', authenticateToken, incidentsAPI.getIncidentById);
app.post('/api/incidents', authenticateToken, incidentsAPI.createIncident);
app.put('/api/incidents/:id', authenticateToken, incidentsAPI.updateIncident);
app.delete('/api/incidents/:id', authenticateToken, incidentsAPI.deleteIncident);

// サービス要求管理API
app.get('/api/service-requests', authenticateToken, serviceRequestsAPI.getServiceRequests);
app.get('/api/service-requests/stats', authenticateToken, serviceRequestsAPI.getServiceRequestStats);
app.get('/api/service-requests/:id', authenticateToken, serviceRequestsAPI.getServiceRequestById);
app.post('/api/service-requests', authenticateToken, serviceRequestsAPI.createServiceRequest);
app.put('/api/service-requests/:id', authenticateToken, serviceRequestsAPI.updateServiceRequest);
app.put('/api/service-requests/:id/approve', authenticateToken, serviceRequestsAPI.approveServiceRequest);
app.put('/api/service-requests/:id/fulfill', authenticateToken, serviceRequestsAPI.fulfillServiceRequest);
app.put('/api/service-requests/:id/transition', authenticateToken, serviceRequestsAPI.transitionServiceRequest);
app.delete('/api/service-requests/:id', authenticateToken, serviceRequestsAPI.deleteServiceRequest);

// ナレッジ管理API
app.get('/api/knowledge', authenticateToken, knowledgeAPI.getKnowledge);
app.get('/api/knowledge/stats', authenticateToken, knowledgeAPI.getKnowledgeStats);
app.get('/api/knowledge/search', authenticateToken, knowledgeAPI.searchKnowledge);
app.get('/api/knowledge/:id', authenticateToken, knowledgeAPI.getKnowledgeById);
app.post('/api/knowledge', authenticateToken, knowledgeAPI.createKnowledge);
app.put('/api/knowledge/:id', authenticateToken, knowledgeAPI.updateKnowledge);
app.put('/api/knowledge/:id/approve', authenticateToken, knowledgeAPI.approveKnowledge);
app.put('/api/knowledge/:id/rate', authenticateToken, knowledgeAPI.rateKnowledge);
app.delete('/api/knowledge/:id', authenticateToken, knowledgeAPI.deleteKnowledge);

// 変更管理API
app.get('/api/changes', authenticateToken, changesAPI.getChanges);
app.get('/api/changes/stats', authenticateToken, changesAPI.getChangeStats);
app.get('/api/changes/:id', authenticateToken, changesAPI.getChangeById);
app.post('/api/changes', authenticateToken, changesAPI.createChange);
app.put('/api/changes/:id', authenticateToken, changesAPI.updateChange);
app.put('/api/changes/:id/approve', authenticateToken, changesAPI.approveChange);
app.put('/api/changes/:id/start-implementation', authenticateToken, changesAPI.startImplementation);
app.put('/api/changes/:id/complete-implementation', authenticateToken, changesAPI.completeImplementation);
app.delete('/api/changes/:id', authenticateToken, changesAPI.deleteChange);

// リリース管理API
app.get('/api/releases', authenticateToken, releasesAPI.getReleases);
app.get('/api/releases/stats', authenticateToken, releasesAPI.getReleaseStats);
app.get('/api/releases/:id', authenticateToken, releasesAPI.getReleaseById);
app.post('/api/releases', authenticateToken, releasesAPI.createRelease);
app.put('/api/releases/:id', authenticateToken, releasesAPI.updateRelease);
app.delete('/api/releases/:id', authenticateToken, releasesAPI.deleteRelease);

// 問題管理API
app.get('/api/problems', authenticateToken, problemsAPI.getProblems);
app.get('/api/problems/stats', authenticateToken, problemsAPI.getProblemStats);
app.get('/api/problems/:id', authenticateToken, problemsAPI.getProblemById);
app.post('/api/problems', authenticateToken, problemsAPI.createProblem);
app.put('/api/problems/:id', authenticateToken, problemsAPI.updateProblem);
app.put('/api/problems/:id/start-rca', authenticateToken, problemsAPI.startRootCauseAnalysis);
app.put('/api/problems/:id/mark-known-error', authenticateToken, problemsAPI.markAsKnownError);
app.put('/api/problems/:id/resolve', authenticateToken, problemsAPI.resolveProblem);
app.put('/api/problems/:id/link-incident', authenticateToken, problemsAPI.linkIncident);
app.delete('/api/problems/:id', authenticateToken, problemsAPI.deleteProblem);

// SLA管理API
app.get('/api/slas', authenticateToken, slasAPI.getSLAs);
app.get('/api/slas/stats', authenticateToken, slasAPI.getSLAStats);
app.get('/api/slas/alerts', authenticateToken, slasAPI.generateSLAAlerts);
app.get('/api/slas/:id', authenticateToken, slasAPI.getSLAById);
app.post('/api/slas', authenticateToken, slasAPI.createSLA);
app.put('/api/slas/:id', authenticateToken, slasAPI.updateSLA);
app.put('/api/slas/bulk-update', authenticateToken, slasAPI.bulkUpdateSLAs);
app.delete('/api/slas/:id', authenticateToken, slasAPI.deleteSLA);

// キャパシティ管理API
app.get('/api/capacity', authenticateToken, capacityAPI.getCapacities);
app.get('/api/capacity/stats', authenticateToken, capacityAPI.getCapacityStats);
app.get('/api/capacity/alerts', authenticateToken, capacityAPI.generateCapacityAlerts);
app.get('/api/capacity/:id', authenticateToken, capacityAPI.getCapacityById);
app.post('/api/capacity', authenticateToken, capacityAPI.createCapacity);
app.put('/api/capacity/:id', authenticateToken, capacityAPI.updateCapacity);
app.delete('/api/capacity/:id', authenticateToken, capacityAPI.deleteCapacity);

// 可用性管理API
app.get('/api/availability', authenticateToken, availabilityAPI.getAvailabilities);
app.get('/api/availability/stats', authenticateToken, availabilityAPI.getAvailabilityStats);
app.get('/api/availability/alerts', authenticateToken, availabilityAPI.generateAvailabilityAlerts);
app.get('/api/availability/:id', authenticateToken, availabilityAPI.getAvailabilityById);
app.post('/api/availability', authenticateToken, availabilityAPI.createAvailability);
app.put('/api/availability/:id', authenticateToken, availabilityAPI.updateAvailability);
app.delete('/api/availability/:id', authenticateToken, availabilityAPI.deleteAvailability);

// 監査ログ管理API
app.get('/api/audit-logs', authenticateToken, auditLogsAPI.getAuditLogs);
app.get('/api/audit-logs/stats', authenticateToken, auditLogsAPI.getAuditLogStats);
app.get('/api/audit-logs/security', authenticateToken, auditLogsAPI.getSecurityAuditLogs);
app.get('/api/audit-logs/compliance-report', authenticateToken, auditLogsAPI.generateComplianceReport);
app.get('/api/audit-logs/export', authenticateToken, auditLogsAPI.exportAuditLogs);
app.get('/api/audit-logs/:id', authenticateToken, auditLogsAPI.getAuditLogById);
app.delete('/api/audit-logs/archive', authenticateToken, auditLogsAPI.archiveOldLogs);

// レポート機能API
app.get('/api/reports/executive-dashboard', authenticateToken, reportsAPI.getExecutiveDashboard);
app.get('/api/reports/performance', authenticateToken, reportsAPI.getPerformanceReport);
app.get('/api/reports/monthly-operational', authenticateToken, reportsAPI.getMonthlyOperationalReport);
app.post('/api/reports/custom', authenticateToken, reportsAPI.generateCustomReport);

// エラーハンドリング
app.use(errorHandler);

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// サーバー起動
const startServer = async () => {
  try {
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 ITSM API Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: ${DB_PATH}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// グレースフルシャットダウン
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  if (db) {
    db.close();
  }
  process.exit(0);
});

startServer();