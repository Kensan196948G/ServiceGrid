/**
 * 拡張ログ管理・セキュリティイベント追跡システム
 * Feature-E-NonFunc: 包括的ログ戦略実装
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ログレベル定義
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

// セキュリティイベントタイプ
const SECURITY_EVENTS = {
  AUTHENTICATION_SUCCESS: 'auth_success',
  AUTHENTICATION_FAILURE: 'auth_failure',
  AUTHORIZATION_FAILURE: 'authz_failure',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  SECURITY_VIOLATION: 'security_violation',
  DATA_ACCESS: 'data_access',
  PRIVILEGE_ESCALATION: 'privilege_escalation'
};

class EnhancedLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.securityLogDir = path.join(this.logDir, 'security');
    this.auditLogDir = path.join(this.logDir, 'audit');
    this.performanceLogDir = path.join(this.logDir, 'performance');
    
    this.initializeDirectories();
    this.setupLogRotation();
  }
  
  /**
   * ログディレクトリ初期化
   */
  initializeDirectories() {
    [this.logDir, this.securityLogDir, this.auditLogDir, this.performanceLogDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }
  
  /**
   * ログローテーション設定
   */
  setupLogRotation() {
    // 毎日0時にログローテーション実行
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.rotateLog();
      setInterval(() => this.rotateLog(), 24 * 60 * 60 * 1000); // 24時間ごと
    }, msUntilMidnight);
  }
  
  /**
   * ログローテーション実行
   */
  rotateLog() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);
    
    try {
      // 各ログファイルをアーカイブ
      this.archiveLogFile('application.log', dateStr);
      this.archiveLogFile('security/security.log', dateStr);
      this.archiveLogFile('audit/audit.log', dateStr);
      this.archiveLogFile('performance/performance.log', dateStr);
      
      console.log(`[LOG-ROTATION] Log files rotated for ${dateStr}`);
    } catch (error) {
      console.error('[LOG-ROTATION] Error during log rotation:', error);
    }
  }
  
  /**
   * ログファイルアーカイブ
   */
  archiveLogFile(filename, dateStr) {
    const currentPath = path.join(this.logDir, filename);
    const archivePath = path.join(this.logDir, `${filename}.${dateStr}`);
    
    if (fs.existsSync(currentPath)) {
      fs.renameSync(currentPath, archivePath);
      
      // 30日より古いアーカイブを削除
      const oldArchivePattern = new RegExp(`${filename}\\.\\d{4}-\\d{2}-\\d{2}$`);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      fs.readdirSync(path.dirname(path.join(this.logDir, filename)))
        .filter(file => oldArchivePattern.test(file))
        .forEach(file => {
          const fileDate = new Date(file.split('.').pop());
          if (fileDate < thirtyDaysAgo) {
            fs.unlinkSync(path.join(path.dirname(path.join(this.logDir, filename)), file));
          }
        });
    }
  }
  
  /**
   * 基本ログ記録
   */
  log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: Object.keys(LOG_LEVELS)[level],
      message,
      metadata,
      hostname: require('os').hostname(),
      pid: process.pid,
      requestId: metadata.requestId || this.generateRequestId()
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    
    // コンソール出力
    console.log(`[${logEntry.level}] ${timestamp} - ${message}`, metadata);
    
    // ファイル出力
    const logFile = path.join(this.logDir, 'application.log');
    fs.appendFileSync(logFile, logLine);
  }
  
  /**
   * セキュリティイベントログ
   */
  logSecurityEvent(eventType, details, severity = 'INFO') {
    const timestamp = new Date().toISOString();
    const securityEvent = {
      timestamp,
      eventType,
      severity,
      details,
      hash: this.generateSecurityHash(eventType, details, timestamp),
      source: 'ServiceGrid-ITSM',
      version: '2.1'
    };
    
    const logLine = JSON.stringify(securityEvent) + '\n';
    
    // セキュリティログファイルに記録
    const securityLogFile = path.join(this.securityLogDir, 'security.log');
    fs.appendFileSync(securityLogFile, logLine);
    
    // 重要なセキュリティイベントはアラート
    if (['CRITICAL', 'HIGH'].includes(severity)) {
      this.sendSecurityAlert(securityEvent);
    }
    
    console.log(`[SECURITY-EVENT] ${severity}: ${eventType}`, details);
  }
  
  /**
   * 監査ログ記録
   */
  logAuditEvent(userId, action, resource, result, details = {}) {
    const timestamp = new Date().toISOString();
    const auditEvent = {
      timestamp,
      userId,
      action,
      resource,
      result, // SUCCESS, FAILURE, PARTIAL
      details,
      sessionId: details.sessionId,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      checksum: this.generateAuditChecksum(userId, action, resource, timestamp)
    };
    
    const logLine = JSON.stringify(auditEvent) + '\n';
    
    // 監査ログファイルに記録
    const auditLogFile = path.join(this.auditLogDir, 'audit.log');
    fs.appendFileSync(auditLogFile, logLine);
    
    console.log(`[AUDIT] ${userId} - ${action} on ${resource}: ${result}`);
  }
  
  /**
   * パフォーマンスログ記録
   */
  logPerformanceEvent(operation, duration, metadata = {}) {
    const timestamp = new Date().toISOString();
    const performanceEvent = {
      timestamp,
      operation,
      duration,
      metadata,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
    
    const logLine = JSON.stringify(performanceEvent) + '\n';
    
    // パフォーマンスログファイルに記録
    const performanceLogFile = path.join(this.performanceLogDir, 'performance.log');
    fs.appendFileSync(performanceLogFile, logLine);
    
    // 性能問題の警告
    if (duration > 1000) {
      console.warn(`[PERFORMANCE-WARNING] Slow operation: ${operation} took ${duration}ms`);
    }
  }
  
  /**
   * セキュリティハッシュ生成
   */
  generateSecurityHash(eventType, details, timestamp) {
    const data = `${eventType}:${JSON.stringify(details)}:${timestamp}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  /**
   * 監査チェックサム生成
   */
  generateAuditChecksum(userId, action, resource, timestamp) {
    const data = `${userId}:${action}:${resource}:${timestamp}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }
  
  /**
   * リクエストID生成
   */
  generateRequestId() {
    return crypto.randomBytes(8).toString('hex');
  }
  
  /**
   * セキュリティアラート送信
   */
  sendSecurityAlert(securityEvent) {
    // 実際の実装では、メール、Slack、SIEM等に送信
    console.log(`[SECURITY-ALERT] Critical security event:`, securityEvent);
  }
  
  /**
   * ログ検索機能
   */
  searchLogs(criteria) {
    // 実装: Elasticsearch, Splunk等との統合
    console.log('[LOG-SEARCH] Search criteria:', criteria);
  }
  
  // 便利メソッド
  error(message, metadata) { this.log(LOG_LEVELS.ERROR, message, metadata); }
  warn(message, metadata) { this.log(LOG_LEVELS.WARN, message, metadata); }
  info(message, metadata) { this.log(LOG_LEVELS.INFO, message, metadata); }
  debug(message, metadata) { this.log(LOG_LEVELS.DEBUG, message, metadata); }
  trace(message, metadata) { this.log(LOG_LEVELS.TRACE, message, metadata); }
}

// グローバルロガーインスタンス
const logger = new EnhancedLogger();

/**
 * リクエスト追跡ミドルウェア
 */
const requestTrackingMiddleware = (req, res, next) => {
  const requestId = logger.generateRequestId();
  const startTime = Date.now();
  
  req.requestId = requestId;
  req.startTime = startTime;
  
  // リクエスト開始ログ
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.username || 'anonymous'
  });
  
  // レスポンス完了時の処理
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    // リクエスト完了ログ
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      user: req.user?.username || 'anonymous'
    });
    
    // パフォーマンスログ
    logger.logPerformanceEvent(`${req.method} ${req.path}`, duration, {
      requestId,
      statusCode: res.statusCode,
      user: req.user?.username || 'anonymous'
    });
    
    // 監査ログ（データアクセス）
    if (req.user && ['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
      logger.logAuditEvent(
        req.user.username,
        `${req.method}_${req.path.split('/')[2]}`,
        req.path,
        res.statusCode < 400 ? 'SUCCESS' : 'FAILURE',
        {
          requestId,
          statusCode: res.statusCode,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      );
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * セキュリティイベント追跡ミドルウェア
 */
const securityEventMiddleware = (req, res, next) => {
  // 認証失敗の検出
  const originalStatus = res.status;
  res.status = function(code) {
    if (code === 401 && req.path.includes('/auth/')) {
      logger.logSecurityEvent(
        SECURITY_EVENTS.AUTHENTICATION_FAILURE,
        {
          username: req.body?.username,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        },
        'HIGH'
      );
    } else if (code === 403) {
      logger.logSecurityEvent(
        SECURITY_EVENTS.AUTHORIZATION_FAILURE,
        {
          user: req.user?.username,
          ip: req.ip,
          path: req.path,
          method: req.method
        },
        'MEDIUM'
      );
    } else if (code === 429) {
      logger.logSecurityEvent(
        SECURITY_EVENTS.RATE_LIMIT_EXCEEDED,
        {
          ip: req.ip,
          path: req.path,
          userAgent: req.get('User-Agent')
        },
        'MEDIUM'
      );
    }
    
    return originalStatus.call(this, code);
  };
  
  next();
};

module.exports = {
  logger,
  requestTrackingMiddleware,
  securityEventMiddleware,
  LOG_LEVELS,
  SECURITY_EVENTS
};