/**
 * 包括的監視・ログ管理システム
 * Feature-E 非機能要件実装
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * ログレベル定義
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * メトリクス収集クラス
 */
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        byEndpoint: new Map(),
        byStatus: new Map()
      },
      performance: {
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
        responseTimes: []
      },
      system: {
        memory: {
          usage: 0,
          free: 0,
          total: 0
        },
        cpu: {
          usage: 0
        },
        uptime: 0
      },
      security: {
        authAttempts: 0,
        authFailures: 0,
        rateLimitHits: 0,
        suspiciousActivity: 0
      }
    };
    
    this.startTime = Date.now();
    this.lastSystemCheck = Date.now();
    
    // システムメトリクス定期収集
    setInterval(() => this.collectSystemMetrics(), 30000); // 30秒間隔
  }

  /**
   * リクエストメトリクス記録
   */
  recordRequest(req, res, responseTime) {
    this.metrics.requests.total++;
    
    if (res.statusCode >= 200 && res.statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.error++;
    }
    
    // エンドポイント別統計
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    const endpointStats = this.metrics.requests.byEndpoint.get(endpoint) || { count: 0, totalTime: 0 };
    endpointStats.count++;
    endpointStats.totalTime += responseTime;
    this.metrics.requests.byEndpoint.set(endpoint, endpointStats);
    
    // ステータスコード別統計
    const statusStats = this.metrics.requests.byStatus.get(res.statusCode) || 0;
    this.metrics.requests.byStatus.set(res.statusCode, statusStats + 1);
    
    // レスポンス時間統計
    this.updateResponseTimeMetrics(responseTime);
  }

  /**
   * レスポンス時間メトリクス更新
   */
  updateResponseTimeMetrics(responseTime) {
    const perf = this.metrics.performance;
    perf.responseTimes.push(responseTime);
    
    // 直近1000件のみ保持
    if (perf.responseTimes.length > 1000) {
      perf.responseTimes = perf.responseTimes.slice(-1000);
    }
    
    perf.maxResponseTime = Math.max(perf.maxResponseTime, responseTime);
    perf.minResponseTime = Math.min(perf.minResponseTime, responseTime);
    perf.averageResponseTime = perf.responseTimes.reduce((a, b) => a + b, 0) / perf.responseTimes.length;
  }

  /**
   * システムメトリクス収集
   */
  async collectSystemMetrics() {
    const process = require('process');
    
    // メモリ使用量
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    this.metrics.system.memory = {
      usage: memUsage.rss,
      free: freeMem,
      total: totalMem,
      usagePercent: ((totalMem - freeMem) / totalMem * 100).toFixed(2)
    };
    
    // アップタイム
    this.metrics.system.uptime = process.uptime();
    
    // CPU使用率（簡易計算）
    const cpuUsage = process.cpuUsage();
    this.metrics.system.cpu = {
      user: cpuUsage.user,
      system: cpuUsage.system
    };
  }

  /**
   * セキュリティメトリクス記録
   */
  recordSecurityEvent(eventType) {
    switch (eventType) {
      case 'AUTH_ATTEMPT':
        this.metrics.security.authAttempts++;
        break;
      case 'AUTH_FAILURE':
        this.metrics.security.authFailures++;
        break;
      case 'RATE_LIMIT_HIT':
        this.metrics.security.rateLimitHits++;
        break;
      case 'SUSPICIOUS_ACTIVITY':
        this.metrics.security.suspiciousActivity++;
        break;
    }
  }

  /**
   * メトリクス取得
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * ヘルスチェック実行
   */
  getHealthStatus() {
    const metrics = this.getMetrics();
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {}
    };

    // メモリ使用率チェック
    if (metrics.system.memory.usagePercent > 90) {
      health.status = 'unhealthy';
      health.checks.memory = { status: 'fail', message: 'High memory usage' };
    } else if (metrics.system.memory.usagePercent > 75) {
      health.status = 'degraded';
      health.checks.memory = { status: 'warn', message: 'Moderate memory usage' };
    } else {
      health.checks.memory = { status: 'pass', message: 'Memory usage normal' };
    }

    // エラー率チェック
    const errorRate = metrics.requests.total > 0 ? 
      (metrics.requests.error / metrics.requests.total * 100) : 0;
    
    if (errorRate > 10) {
      health.status = 'unhealthy';
      health.checks.errorRate = { status: 'fail', message: `High error rate: ${errorRate.toFixed(2)}%` };
    } else if (errorRate > 5) {
      health.status = 'degraded';
      health.checks.errorRate = { status: 'warn', message: `Moderate error rate: ${errorRate.toFixed(2)}%` };
    } else {
      health.checks.errorRate = { status: 'pass', message: `Error rate normal: ${errorRate.toFixed(2)}%` };
    }

    // レスポンス時間チェック
    if (metrics.performance.averageResponseTime > 2000) {
      health.status = 'unhealthy';
      health.checks.responseTime = { status: 'fail', message: 'High response time' };
    } else if (metrics.performance.averageResponseTime > 1000) {
      health.status = 'degraded';
      health.checks.responseTime = { status: 'warn', message: 'Moderate response time' };
    } else {
      health.checks.responseTime = { status: 'pass', message: 'Response time normal' };
    }

    return health;
  }
}

/**
 * 構造化ログ管理クラス
 */
class StructuredLogger {
  constructor(logDir = '../logs') {
    this.logDir = path.resolve(__dirname, logDir);
    this.currentLogLevel = LOG_LEVELS.INFO;
    this.initializeLogDirectory();
  }

  async initializeLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  /**
   * 構造化ログエントリ作成
   */
  createLogEntry(level, message, metadata = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: Object.keys(LOG_LEVELS)[level],
      message,
      metadata: {
        ...metadata,
        pid: process.pid,
        hostname: os.hostname(),
        nodeVersion: process.version
      }
    };
  }

  /**
   * ログファイル書き込み
   */
  async writeLog(entry) {
    if (entry.level < this.currentLogLevel) return;

    const logFileName = `app-${new Date().toISOString().split('T')[0]}.log`;
    const logFilePath = path.join(this.logDir, logFileName);
    
    try {
      await fs.appendFile(logFilePath, JSON.stringify(entry) + '\n');
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  /**
   * ログメソッド
   */
  async error(message, metadata = {}) {
    const entry = this.createLogEntry(LOG_LEVELS.ERROR, message, metadata);
    await this.writeLog(entry);
    console.error(`[ERROR] ${message}`, metadata);
  }

  async warn(message, metadata = {}) {
    const entry = this.createLogEntry(LOG_LEVELS.WARN, message, metadata);
    await this.writeLog(entry);
    console.warn(`[WARN] ${message}`, metadata);
  }

  async info(message, metadata = {}) {
    const entry = this.createLogEntry(LOG_LEVELS.INFO, message, metadata);
    await this.writeLog(entry);
    console.info(`[INFO] ${message}`, metadata);
  }

  async debug(message, metadata = {}) {
    const entry = this.createLogEntry(LOG_LEVELS.DEBUG, message, metadata);
    await this.writeLog(entry);
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, metadata);
    }
  }
}

/**
 * グローバルインスタンス
 */
const metricsCollector = new MetricsCollector();
const logger = new StructuredLogger();

/**
 * 監視ミドルウェア
 */
const monitoringMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // リクエスト開始ログ
  logger.info(`Request started: ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.username
  });

  // レスポンス完了時の処理
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    // メトリクス記録
    metricsCollector.recordRequest(req, res, responseTime);
    
    // レスポンスログ
    logger.info(`Request completed: ${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      responseTime,
      ip: req.ip,
      user: req.user?.username
    });
  });

  next();
};

/**
 * アラート条件チェック
 */
const checkAlerts = () => {
  const health = metricsCollector.getHealthStatus();
  
  if (health.status === 'unhealthy') {
    logger.error('System health check failed', { health });
    // TODO: アラート通知実装
  } else if (health.status === 'degraded') {
    logger.warn('System health degraded', { health });
  }
};

// 定期的なヘルスチェック
setInterval(checkAlerts, 60000); // 1分間隔

module.exports = {
  metricsCollector,
  logger,
  monitoringMiddleware,
  MetricsCollector,
  StructuredLogger
};