const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { hashPassword, verifyPassword, generateToken } = require('../middleware/auth');
require('dotenv').config();

// データベース接続
const dbPath = path.join(__dirname, '..', process.env.DB_PATH || 'db/itsm.sqlite');
const db = new sqlite3.Database(dbPath);

/**
 * ログイン処理
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔍 Login attempt:', { username, hasPassword: !!password });

    // 入力検証
    if (!username || !password) {
      return res.status(400).json({
        error: 'ユーザー名とパスワードが必要です',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // ユーザー検索
    console.log('🔍 Searching for user in database...');
    db.get(
      'SELECT * FROM users WHERE username = ?',
      [username],
      async (err, user) => {
        if (err) {
          console.error('❌ Database error:', err);
          return res.status(500).json({
            error: 'データベースエラーが発生しました',
            code: 'DATABASE_ERROR'
          });
        }

        if (!user) {
          console.log('❌ User not found:', username);
          return res.status(401).json({
            error: '認証に失敗しました',
            code: 'INVALID_CREDENTIALS'
          });
        }

        console.log('✅ User found:', { username: user.username, role: user.role });

        // アカウントロック確認
        if (user.account_locked && new Date() < new Date(user.account_locked_until)) {
          return res.status(423).json({
            error: 'アカウントがロックされています',
            code: 'ACCOUNT_LOCKED',
            locked_until: user.account_locked_until
          });
        }

        // パスワード検証
        let isPasswordValid = false;
        
        // 既存ユーザーの場合（ハッシュ化済み）
        if (user.password_hash && user.password_hash !== 'initial_hash_placeholder') {
          isPasswordValid = await verifyPassword(password, user.password_hash);
        } else {
          // 初期設定ユーザーの場合（プレーンテキスト比較）
          isPasswordValid = (
            (username === 'admin' && password === 'admin123') ||
            (username === 'operator' && password === 'operator123')
          );

          // 初回ログイン時にパスワードをハッシュ化
          if (isPasswordValid) {
            const hashedPassword = await hashPassword(password);
            db.run(
              'UPDATE users SET password_hash = ?, password_salt = ? WHERE username = ?',
              [hashedPassword, 'bcrypt_managed', username],
              (updateErr) => {
                if (updateErr) {
                  console.error('Password hash update error:', updateErr);
                }
              }
            );
          }
        }

        if (!isPasswordValid) {
          // ログイン失敗回数を増加
          const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
          let updateQuery = 'UPDATE users SET failed_login_attempts = ?';
          let updateParams = [newFailedAttempts];

          // 5回失敗でアカウントロック
          if (newFailedAttempts >= 5) {
            const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30分
            updateQuery += ', account_locked = 1, account_locked_until = ?';
            updateParams.push(lockUntil.toISOString());
          }

          updateQuery += ' WHERE username = ?';
          updateParams.push(username);

          db.run(updateQuery, updateParams);

          return res.status(401).json({
            error: '認証に失敗しました',
            code: 'INVALID_CREDENTIALS',
            attempts_remaining: Math.max(0, 5 - newFailedAttempts)
          });
        }

        // ログイン成功処理
        const now = new Date().toISOString();
        db.run(
          'UPDATE users SET last_login = ?, failed_login_attempts = 0, account_locked = 0, account_locked_until = NULL WHERE username = ?',
          [now, username]
        );

        // JWTトークン生成
        const token = generateToken(user);

        // 監査ログ
        db.run(
          'INSERT INTO logs (event_type, event_time, user, detail) VALUES (?, ?, ?, ?)',
          ['LOGIN_SUCCESS', now, username, `Successful login from IP: ${req.ip}`]
        );

        // レスポンス
        res.json({
          success: true,
          token,
          user: {
            id: user.user_id,
            username: user.username,
            role: user.role,
            display_name: user.display_name,
            email: user.email
          },
          message: 'ログインが成功しました'
        });
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'サーバーエラーが発生しました',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * ユーザー情報取得
 */
const getMe = (req, res) => {
  db.get(
    'SELECT user_id, username, role, display_name, email, last_login FROM users WHERE user_id = ?',
    [req.user.userId],
    (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          error: 'データベースエラーが発生しました',
          code: 'DATABASE_ERROR'
        });
      }

      if (!user) {
        return res.status(404).json({
          error: 'ユーザーが見つかりません',
          code: 'USER_NOT_FOUND'
        });
      }

      res.json({
        user: {
          id: user.user_id,
          username: user.username,
          role: user.role,
          display_name: user.display_name,
          email: user.email,
          last_login: user.last_login
        }
      });
    }
  );
};

/**
 * ログアウト（将来的にトークンブラックリスト実装）
 */
const logout = (req, res) => {
  const now = new Date().toISOString();
  
  // 監査ログ
  db.run(
    'INSERT INTO logs (event_type, event_time, user, detail) VALUES (?, ?, ?, ?)',
    ['LOGOUT', now, req.user.username, `Logout from IP: ${req.ip}`]
  );

  res.json({
    success: true,
    message: 'ログアウトしました'
  });
};

/**
 * パスワード変更
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: '現在のパスワードと新しいパスワードが必要です',
        code: 'MISSING_PASSWORDS'
      });
    }

    // パスワード強度チェック
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'パスワードは8文字以上である必要があります',
        code: 'WEAK_PASSWORD'
      });
    }

    // 現在のユーザー情報を取得
    db.get(
      'SELECT * FROM users WHERE user_id = ?',
      [req.user.userId],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            error: 'データベースエラーが発生しました',
            code: 'DATABASE_ERROR'
          });
        }

        // 現在のパスワード検証
        const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password_hash);
        if (!isCurrentPasswordValid) {
          return res.status(401).json({
            error: '現在のパスワードが正しくありません',
            code: 'INVALID_CURRENT_PASSWORD'
          });
        }

        // 新しいパスワードをハッシュ化
        const hashedNewPassword = await hashPassword(newPassword);
        const now = new Date().toISOString();

        // パスワード更新
        db.run(
          'UPDATE users SET password_hash = ?, updated_date = ? WHERE user_id = ?',
          [hashedNewPassword, now, req.user.userId],
          (updateErr) => {
            if (updateErr) {
              console.error('Password update error:', updateErr);
              return res.status(500).json({
                error: 'パスワード更新に失敗しました',
                code: 'UPDATE_FAILED'
              });
            }

            // 監査ログ
            db.run(
              'INSERT INTO logs (event_type, event_time, user, detail) VALUES (?, ?, ?, ?)',
              ['PASSWORD_CHANGE', now, req.user.username, `Password changed from IP: ${req.ip}`]
            );

            res.json({
              success: true,
              message: 'パスワードが正常に変更されました'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'サーバーエラーが発生しました',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  login,
  getMe,
  logout,
  changePassword
};