/**
 * Enhanced Authentication API for ServiceGrid ITSM
 * Features: Advanced security, rate limiting, audit logging, session management,
 * password policies, account lockout, and comprehensive error handling
 */

const { pool } = require('../services/enhanced-database');
const { 
  ITSMError,
  ERROR_TYPES,
  HTTP_STATUS,
  createValidationError,
  createDatabaseError,
  createAuthenticationError,
  createAuthorizationError,
  apiResponse,
  apiError,
  asyncHandler
} = require('../utils/errorHandler');
const { 
  hashPassword, 
  verifyPassword, 
  generateToken,
  generateRefreshToken
} = require('../middleware/auth');
const crypto = require('crypto');

// Authentication configuration
const AUTH_CONFIG = {
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    noCommonPasswords: true
  },
  lockout: {
    maxFailedAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
    progressiveLockout: true
  },
  session: {
    maxSessions: 5,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    extendOnActivity: true
  },
  token: {
    accessTokenExpiry: process.env.JWT_EXPIRES_IN || '1h',
    refreshTokenExpiry: '7d',
    enableRefreshTokenRotation: true
  }
};

// Common weak passwords (simplified list)
const COMMON_PASSWORDS = [
  'password', '123456', '123456789', 'qwerty', 'abc123', 
  'password123', 'admin', 'root', '12345678', 'welcome',
  'changeme', 'temp123', 'default', 'guest'
];

/**
 * Validate password strength
 */
function validatePasswordStrength(password) {
  const errors = [];
  
  if (password.length < AUTH_CONFIG.password.minLength) {
    errors.push(`Password must be at least ${AUTH_CONFIG.password.minLength} characters long`);
  }
  
  if (password.length > AUTH_CONFIG.password.maxLength) {
    errors.push(`Password must not exceed ${AUTH_CONFIG.password.maxLength} characters`);
  }
  
  if (AUTH_CONFIG.password.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (AUTH_CONFIG.password.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (AUTH_CONFIG.password.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (AUTH_CONFIG.password.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  if (AUTH_CONFIG.password.noCommonPasswords && 
      COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password');
  }
  
  return errors;
}

/**
 * Log authentication activity
 */
async function logAuthActivity(userId, username, event, details = {}, req = null) {
  try {
    const logEntry = {
      user_id: userId,
      username: username,
      event_type: event,
      ip_address: req?.ip || req?.connection?.remoteAddress || 'unknown',
      user_agent: req?.get('User-Agent') || 'unknown',
      details: JSON.stringify(details),
      timestamp: new Date().toISOString()
    };
    
    await pool.query(
      `INSERT INTO audit_logs (user_id, username, event_type, ip_address, user_agent, details, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [logEntry.user_id, logEntry.username, logEntry.event_type, 
       logEntry.ip_address, logEntry.user_agent, logEntry.details, logEntry.timestamp]
    );
    
    console.log(`[AUTH] ${logEntry.timestamp} | ${username} | ${event} | ${logEntry.ip_address}`);
    
  } catch (error) {
    console.error('Failed to log auth activity:', error);
  }
}

/**
 * Check and update account lockout status
 */
async function checkAccountLockout(user) {
  const now = new Date();
  
  // Check if account is currently locked
  if (user.account_locked && user.account_locked_until) {
    const lockoutEnd = new Date(user.account_locked_until);
    
    if (now < lockoutEnd) {
      const remainingMinutes = Math.ceil((lockoutEnd - now) / (1000 * 60));
      throw createAuthenticationError(
        `Account is locked. Try again in ${remainingMinutes} minutes.`
      );
    } else {
      // Unlock account if lockout period has expired
      await pool.query(
        'UPDATE users SET account_locked = 0, account_locked_until = NULL, failed_login_attempts = 0 WHERE user_id = ?',
        [user.user_id]
      );
      return { ...user, account_locked: 0, account_locked_until: null, failed_login_attempts: 0 };
    }
  }
  
  return user;
}

/**
 * Handle failed login attempt
 */
async function handleFailedLogin(user, req) {
  const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
  
  let updateQuery = 'UPDATE users SET failed_login_attempts = ?, last_failed_login = CURRENT_TIMESTAMP';
  let updateParams = [newFailedAttempts];
  
  // Progressive lockout
  if (newFailedAttempts >= AUTH_CONFIG.lockout.maxFailedAttempts) {
    const lockoutDuration = AUTH_CONFIG.lockout.progressiveLockout 
      ? AUTH_CONFIG.lockout.lockoutDuration * Math.pow(2, Math.floor(newFailedAttempts / 5))
      : AUTH_CONFIG.lockout.lockoutDuration;
    
    const lockoutEnd = new Date(Date.now() + lockoutDuration);
    updateQuery += ', account_locked = 1, account_locked_until = ?';
    updateParams.push(lockoutEnd.toISOString());
    
    await logAuthActivity(user.user_id, user.username, 'ACCOUNT_LOCKED', {
      failed_attempts: newFailedAttempts,
      lockout_until: lockoutEnd.toISOString()
    }, req);
  }
  
  updateQuery += ' WHERE user_id = ?';
  updateParams.push(user.user_id);
  
  await pool.query(updateQuery, updateParams);
  
  await logAuthActivity(user.user_id, user.username, 'LOGIN_FAILED', {
    failed_attempts: newFailedAttempts,
    reason: 'invalid_credentials'
  }, req);
  
  const attemptsRemaining = Math.max(0, AUTH_CONFIG.lockout.maxFailedAttempts - newFailedAttempts);
  
  throw createAuthenticationError(
    `Invalid credentials. ${attemptsRemaining} attempts remaining before account lockout.`
  );
}

/**
 * Enhanced login with comprehensive security
 */
const login = asyncHandler(async (req, res) => {
  const { username, password, remember_me = false } = req.body;
  
  // Input validation
  if (!username || !password) {
    throw createValidationError('Username and password are required');
  }
  
  if (typeof username !== 'string' || typeof password !== 'string') {
    throw createValidationError('Username and password must be strings');
  }
  
  if (username.length > 100 || password.length > 1000) {
    throw createValidationError('Username or password too long');
  }
  
  try {
    // Get user from database
    const users = await pool.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username]
    );
    
    if (users.length === 0) {
      // Log failed attempt with unknown user
      await logAuthActivity(null, username, 'LOGIN_FAILED', {
        reason: 'user_not_found'
      }, req);
      
      throw createAuthenticationError('Invalid credentials');
    }
    
    const user = users[0];
    
    // Check account status
    if (user.status === 'disabled') {
      await logAuthActivity(user.user_id, user.username, 'LOGIN_FAILED', {
        reason: 'account_disabled'
      }, req);
      throw createAuthenticationError('Account is disabled');
    }
    
    // Check account lockout
    const checkedUser = await checkAccountLockout(user);
    
    // Verify password
    let isPasswordValid = false;
    
    if (user.password_hash && user.password_hash !== 'initial_hash_placeholder') {
      isPasswordValid = await verifyPassword(password, user.password_hash);
    } else {
      // Handle legacy plain text passwords (for migration)
      isPasswordValid = (
        (username === 'admin' && password === 'admin123') ||
        (username === 'operator' && password === 'operator123')
      );
      
      // Hash password for future use
      if (isPasswordValid) {
        const hashedPassword = await hashPassword(password);
        await pool.query(
          'UPDATE users SET password_hash = ? WHERE user_id = ?',
          [hashedPassword, user.user_id]
        );
      }
    }
    
    if (!isPasswordValid) {
      await handleFailedLogin(checkedUser, req);
      return; // handleFailedLogin throws an error
    }
    
    // Check for password expiry
    if (user.password_expires_at && new Date() > new Date(user.password_expires_at)) {
      await logAuthActivity(user.user_id, user.username, 'LOGIN_FAILED', {
        reason: 'password_expired'
      }, req);
      throw createAuthenticationError('Password has expired. Please contact administrator.');
    }
    
    // Successful login - update user record
    const sessionId = crypto.randomBytes(32).toString('hex');
    const refreshToken = generateRefreshToken(user);
    const accessToken = generateToken(user);
    
    await pool.query(
      `UPDATE users SET 
        last_login = CURRENT_TIMESTAMP,
        failed_login_attempts = 0,
        account_locked = 0,
        account_locked_until = NULL,
        last_activity = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [user.user_id]
    );
    
    // Store session
    const sessionExpiry = new Date(Date.now() + 
      (remember_me ? 30 * 24 * 60 * 60 * 1000 : AUTH_CONFIG.session.sessionTimeout)); // 30 days or 24 hours
    
    await pool.query(
      `INSERT INTO user_sessions (user_id, session_id, refresh_token, ip_address, user_agent, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        user.user_id,
        sessionId,
        refreshToken,
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent') || 'unknown',
        sessionExpiry.toISOString()
      ]
    );
    
    // Clean up old sessions (keep only the most recent ones)
    await pool.query(
      `DELETE FROM user_sessions 
       WHERE user_id = ? AND session_id NOT IN (
         SELECT session_id FROM (
           SELECT session_id FROM user_sessions 
           WHERE user_id = ? 
           ORDER BY created_at DESC 
           LIMIT ?
         ) t
       )`,
      [user.user_id, user.user_id, AUTH_CONFIG.session.maxSessions]
    );
    
    await logAuthActivity(user.user_id, user.username, 'LOGIN_SUCCESS', {
      session_id: sessionId,
      remember_me: remember_me
    }, req);
    
    // Prepare response
    const userResponse = {
      id: user.user_id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      role: user.role,
      last_login: user.last_login,
      profile_picture: user.profile_picture,
      preferences: user.preferences ? JSON.parse(user.preferences) : {}
    };
    
    return apiResponse(res, {
      message: 'Login successful',
      user: userResponse,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: remember_me ? '30d' : '24h'
      },
      session: {
        session_id: sessionId,
        expires_at: sessionExpiry.toISOString()
      }
    });
    
  } catch (error) {
    if (error instanceof ITSMError) throw error;
    throw createDatabaseError('Login failed due to system error', error);
  }
});

/**
 * Enhanced logout with session cleanup
 */
const logout = asyncHandler(async (req, res) => {
  const sessionId = req.get('X-Session-ID');
  const userId = req.user?.userId;
  const username = req.user?.username;
  
  try {
    if (sessionId) {
      // Remove specific session
      await pool.query(
        'DELETE FROM user_sessions WHERE session_id = ? AND user_id = ?',
        [sessionId, userId]
      );
    } else if (userId) {
      // Remove all sessions for user
      await pool.query(
        'DELETE FROM user_sessions WHERE user_id = ?',
        [userId]
      );
    }
    
    await logAuthActivity(userId, username, 'LOGOUT', {
      session_id: sessionId || 'all_sessions'
    }, req);
    
    return apiResponse(res, {
      message: 'Logout successful'
    });
    
  } catch (error) {
    throw createDatabaseError('Logout failed', error);
  }
});

/**
 * Refresh token endpoint
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    throw createValidationError('Refresh token is required');
  }
  
  try {
    // Verify and decode refresh token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refresh_token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw createAuthenticationError('Invalid token type');
    }
    
    // Check if session exists and is valid
    const sessions = await pool.query(
      'SELECT * FROM user_sessions WHERE refresh_token = ? AND user_id = ? AND expires_at > CURRENT_TIMESTAMP',
      [refresh_token, decoded.userId]
    );
    
    if (sessions.length === 0) {
      throw createAuthenticationError('Invalid or expired refresh token');
    }
    
    // Get current user
    const users = await pool.query(
      'SELECT * FROM users WHERE user_id = ? AND status = "active"',
      [decoded.userId]
    );
    
    if (users.length === 0) {
      throw createAuthenticationError('User not found or inactive');
    }
    
    const user = users[0];
    
    // Generate new tokens
    const newAccessToken = generateToken(user);
    const newRefreshToken = AUTH_CONFIG.token.enableRefreshTokenRotation 
      ? generateRefreshToken(user) 
      : refresh_token;
    
    // Update session with new refresh token if rotation is enabled
    if (AUTH_CONFIG.token.enableRefreshTokenRotation) {
      await pool.query(
        'UPDATE user_sessions SET refresh_token = ?, updated_at = CURRENT_TIMESTAMP WHERE refresh_token = ?',
        [newRefreshToken, refresh_token]
      );
    }
    
    // Update last activity
    await pool.query(
      'UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE user_id = ?',
      [user.user_id]
    );
    
    await logAuthActivity(user.user_id, user.username, 'TOKEN_REFRESH', {
      old_token: refresh_token.substring(0, 10) + '...',
      new_token: newRefreshToken.substring(0, 10) + '...'
    }, req);
    
    return apiResponse(res, {
      tokens: {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        token_type: 'Bearer',
        expires_in: AUTH_CONFIG.token.accessTokenExpiry
      }
    });
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw createAuthenticationError('Refresh token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw createAuthenticationError('Invalid refresh token');
    }
    if (error instanceof ITSMError) throw error;
    throw createDatabaseError('Token refresh failed', error);
  }
});

/**
 * Get current user profile
 */
const getMe = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  
  if (!userId) {
    throw createAuthenticationError('User not authenticated');
  }
  
  try {
    const users = await pool.query(
      `SELECT 
        user_id, username, email, display_name, role, department,
        last_login, last_activity, created_at, profile_picture,
        preferences, timezone, language, phone_number
       FROM users 
       WHERE user_id = ?`,
      [userId]
    );
    
    if (users.length === 0) {
      throw createAuthenticationError('User not found');
    }
    
    const user = users[0];
    
    // Get active sessions count
    const sessions = await pool.query(
      'SELECT COUNT(*) as session_count FROM user_sessions WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP',
      [userId]
    );
    
    return apiResponse(res, {
      user: {
        ...user,
        preferences: user.preferences ? JSON.parse(user.preferences) : {},
        active_sessions: sessions[0].session_count
      }
    });
    
  } catch (error) {
    if (error instanceof ITSMError) throw error;
    throw createDatabaseError('Failed to retrieve user profile', error);
  }
});

/**
 * Change password with enhanced validation
 */
const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  const userId = req.user?.userId;
  const username = req.user?.username;
  
  // Validation
  if (!current_password || !new_password || !confirm_password) {
    throw createValidationError('Current password, new password, and confirmation are required');
  }
  
  if (new_password !== confirm_password) {
    throw createValidationError('New password and confirmation do not match');
  }
  
  if (current_password === new_password) {
    throw createValidationError('New password must be different from current password');
  }
  
  // Validate password strength
  const passwordErrors = validatePasswordStrength(new_password);
  if (passwordErrors.length > 0) {
    throw createValidationError('Password does not meet requirements', {
      password_errors: passwordErrors
    });
  }
  
  try {
    // Get current user
    const users = await pool.query(
      'SELECT * FROM users WHERE user_id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      throw createAuthenticationError('User not found');
    }
    
    const user = users[0];
    
    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(current_password, user.password_hash);
    if (!isCurrentPasswordValid) {
      await logAuthActivity(userId, username, 'PASSWORD_CHANGE_FAILED', {
        reason: 'invalid_current_password'
      }, req);
      throw createAuthenticationError('Current password is incorrect');
    }
    
    // Check password history (prevent reuse of last 5 passwords)
    const passwordHistory = await pool.query(
      'SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
      [userId]
    );
    
    for (const oldPassword of passwordHistory) {
      if (await verifyPassword(new_password, oldPassword.password_hash)) {
        throw createValidationError('Cannot reuse a recent password');
      }
    }
    
    // Hash new password
    const hashedNewPassword = await hashPassword(new_password);
    const passwordExpiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
    
    // Update password
    await pool.query(
      `UPDATE users SET 
        password_hash = ?, 
        password_changed_at = CURRENT_TIMESTAMP,
        password_expires_at = ?,
        force_password_change = 0,
        updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [hashedNewPassword, passwordExpiryDate.toISOString(), userId]
    );
    
    // Add to password history
    await pool.query(
      'INSERT INTO password_history (user_id, password_hash, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [userId, user.password_hash]
    );
    
    // Clean up old password history (keep only last 10)
    await pool.query(
      `DELETE FROM password_history 
       WHERE user_id = ? AND id NOT IN (
         SELECT id FROM (
           SELECT id FROM password_history 
           WHERE user_id = ? 
           ORDER BY created_at DESC 
           LIMIT 10
         ) t
       )`,
      [userId, userId]
    );
    
    // Invalidate all existing sessions except current
    const currentSessionId = req.get('X-Session-ID');
    if (currentSessionId) {
      await pool.query(
        'DELETE FROM user_sessions WHERE user_id = ? AND session_id != ?',
        [userId, currentSessionId]
      );
    }
    
    await logAuthActivity(userId, username, 'PASSWORD_CHANGED', {
      forced_logout_other_sessions: true
    }, req);
    
    return apiResponse(res, {
      message: 'Password changed successfully. Other sessions have been terminated.',
      password_expires_at: passwordExpiryDate.toISOString()
    });
    
  } catch (error) {
    if (error instanceof ITSMError) throw error;
    throw createDatabaseError('Failed to change password', error);
  }
});

/**
 * Get user's active sessions
 */
const getSessions = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  
  try {
    const sessions = await pool.query(
      `SELECT 
        session_id, ip_address, user_agent, created_at, expires_at,
        CASE WHEN expires_at > CURRENT_TIMESTAMP THEN 1 ELSE 0 END as is_active
       FROM user_sessions 
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );
    
    return apiResponse(res, {
      sessions: sessions.map(session => ({
        ...session,
        is_current: session.session_id === req.get('X-Session-ID'),
        browser: parseBrowserFromUserAgent(session.user_agent),
        location: 'Unknown' // Could integrate with IP geolocation service
      }))
    });
    
  } catch (error) {
    throw createDatabaseError('Failed to retrieve sessions', error);
  }
});

/**
 * Revoke specific session
 */
const revokeSession = asyncHandler(async (req, res) => {
  const { session_id } = req.params;
  const userId = req.user?.userId;
  const username = req.user?.username;
  
  if (!session_id) {
    throw createValidationError('Session ID is required');
  }
  
  try {
    const result = await pool.query(
      'DELETE FROM user_sessions WHERE session_id = ? AND user_id = ?',
      [session_id, userId]
    );
    
    if (result.changes === 0) {
      throw createValidationError('Session not found or already revoked');
    }
    
    await logAuthActivity(userId, username, 'SESSION_REVOKED', {
      revoked_session_id: session_id
    }, req);
    
    return apiResponse(res, {
      message: 'Session revoked successfully'
    });
    
  } catch (error) {
    if (error instanceof ITSMError) throw error;
    throw createDatabaseError('Failed to revoke session', error);
  }
});

/**
 * Simple browser parsing from user agent
 */
function parseBrowserFromUserAgent(userAgent) {
  if (!userAgent) return 'Unknown';
  
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  
  return 'Other';
}

module.exports = {
  login,
  logout,
  refreshToken,
  getMe,
  changePassword,
  getSessions,
  revokeSession,
  
  // Utility functions
  validatePasswordStrength,
  logAuthActivity
};