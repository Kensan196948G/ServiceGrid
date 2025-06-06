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
          'INSERT INTO logs (event_type, event_time, user, detail) VALUES (?, CURRENT_TIMESTAMP, ?, ?)',
          ['LOGIN', user.username, `User ${user.username} logged in successfully`]
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
        'INSERT INTO logs (event_type, event_time, user, detail) VALUES (?, CURRENT_TIMESTAMP, ?, ?)',
        ['INCIDENT_CREATE', req.user.username, `Created incident: ${title}`]
      );
      
      res.status(201).json({ 
        id: this.lastID,
        message: 'Incident created successfully' 
      });
    }
  );
});

// 資産管理API
app.get('/api/assets', authenticateToken, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  
  const countQuery = 'SELECT COUNT(*) as total FROM assets';
  const dataQuery = 'SELECT * FROM assets ORDER BY created_date DESC LIMIT ? OFFSET ?';
  
  db.get(countQuery, (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    db.all(dataQuery, [limit, offset], (err, assets) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({
        data: assets,
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

app.post('/api/assets', authenticateToken, (req, res) => {
  const { asset_no, name, type, user, location, status } = req.body;
  
  if (!asset_no || !name) {
    return res.status(400).json({ error: 'Asset number and name are required' });
  }
  
  db.run(
    'INSERT INTO assets (asset_no, name, type, user, location, status) VALUES (?, ?, ?, ?, ?, ?)',
    [asset_no, name, type, user, location, status || 'Active'],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(409).json({ error: 'Asset number already exists' });
        }
        return res.status(500).json({ error: 'Failed to create asset' });
      }
      
      // 監査ログ
      db.run(
        'INSERT INTO logs (event_type, event_time, user, detail) VALUES (?, CURRENT_TIMESTAMP, ?, ?)',
        ['ASSET_CREATE', req.user.username, `Created asset: ${asset_no} - ${name}`]
      );
      
      res.status(201).json({ 
        id: this.lastID,
        message: 'Asset created successfully' 
      });
    }
  );
});

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