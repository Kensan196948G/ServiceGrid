const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DB_PATH = path.join(__dirname, 'db', 'itsm.sqlite');

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

// データベース接続
let db;
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    // データベースディレクトリが存在しない場合は作成
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Database connection failed:', err);
        reject(err);
      } else {
        console.log('Connected to SQLite database');
        
        // テーブルが存在しない場合は作成
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            display_name TEXT,
            email TEXT,
            last_login DATETIME,
            failed_login_attempts INTEGER DEFAULT 0,
            account_locked BOOLEAN DEFAULT FALSE,
            created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Error creating users table:', err);
          } else {
            // デフォルトユーザーを作成
            createDefaultUsers();
          }
        });
        
        resolve();
      }
    });
  });
};

// デフォルトユーザー作成
const createDefaultUsers = async () => {
  try {
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    const operatorPasswordHash = await bcrypt.hash('operator123', 12);

    db.run(`
      INSERT OR IGNORE INTO users (username, password_hash, password_salt, role, display_name, email) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['admin', adminPasswordHash, 'bcrypt_managed', 'administrator', '管理者', 'admin@company.com']);

    db.run(`
      INSERT OR IGNORE INTO users (username, password_hash, password_salt, role, display_name, email) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['operator', operatorPasswordHash, 'bcrypt_managed', 'operator', 'オペレータ', 'operator@company.com']);

    console.log('Default users created/verified');
  } catch (error) {
    console.error('Error creating default users:', error);
  }
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

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: db ? 'Connected' : 'Disconnected'
  });
});

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    message: 'ITSM API Server is running',
    endpoints: [
      'GET /api/health - Health check',
      'POST /api/auth/login - Login',
      'GET /api/auth/me - Get user info',
      'GET /api/test - Test endpoint'
    ]
  });
});

// テストエンドポイント
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    server: 'Node.js Express',
    environment: process.env.NODE_ENV || 'development'
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
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        try {
          const validPassword = await bcrypt.compare(password, user.password_hash);
          
          if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
          }

          // ログイン成功
          const token = jwt.sign(
            { 
              userId: user.user_id, 
              username: user.username, 
              role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '1h' }
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
        } catch (bcryptError) {
          console.error('Bcrypt error:', bcryptError);
          return res.status(500).json({ error: 'Authentication failed' });
        }
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
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    }
  );
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// サーバー起動
const startServer = async () => {
  try {
    await initDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 ITSM API Server running on http://0.0.0.0:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: ${DB_PATH}`);
      console.log(`💻 Access from Windows: http://localhost:${PORT}`);
      console.log(`🔧 Test endpoint: http://localhost:${PORT}/api/test`);
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