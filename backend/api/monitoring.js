// リアルタイム監視・パフォーマンス最適化API
const { 
  apiResponse, 
  apiError, 
  asyncHandler 
} = require('../utils/errorHandler');
const { logActivity } = require('../middleware/auth');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

/**
 * システムメトリクス収集
 */
const getSystemMetrics = asyncHandler(async (req, res) => {
  logActivity(req, 'SYSTEM_METRICS_REQUEST', 'System metrics collection started');
  
  const metrics = {
    timestamp: new Date().toISOString(),
    server: {
      hostname: os.hostname(),
      platform: os.platform(),
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      usedMemory: os.totalmem() - os.freemem(),
      memoryUsagePercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2),
      cpuCount: os.cpus().length
    },
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      version: process.version,
      nodeEnv: process.env.NODE_ENV || 'development'
    },
    network: {
      interfaces: Object.entries(os.networkInterfaces())
        .filter(([name, interfaces]) => interfaces && interfaces.length > 0)
        .reduce((acc, [name, interfaces]) => {
          acc[name] = interfaces.filter(iface => !iface.internal);
          return acc;
        }, {})
    }
  };

  // ディスク使用量情報（可能な場合）
  try {
    const stats = await fs.stat(__dirname);
    metrics.disk = {
      path: __dirname,
      accessible: true
    };
  } catch (error) {
    metrics.disk = {
      path: __dirname,
      accessible: false,
      error: error.message
    };
  }

  res.json(apiResponse('システムメトリクスを正常に取得しました', metrics));
});

/**
 * API パフォーマンス統計
 */
const apiStats = new Map();
const recordApiCall = (endpoint, duration, success = true) => {
  const key = endpoint;
  if (!apiStats.has(key)) {
    apiStats.set(key, {
      calls: 0,
      totalDuration: 0,
      errors: 0,
      lastCall: null,
      averageResponseTime: 0
    });
  }
  
  const stats = apiStats.get(key);
  stats.calls++;
  stats.totalDuration += duration;
  stats.averageResponseTime = stats.totalDuration / stats.calls;
  stats.lastCall = new Date().toISOString();
  
  if (!success) {
    stats.errors++;
  }
};

const getApiStats = asyncHandler(async (req, res) => {
  logActivity(req, 'API_STATS_REQUEST', 'API performance statistics requested');
  
  const statsArray = Array.from(apiStats.entries()).map(([endpoint, stats]) => ({
    endpoint,
    ...stats,
    errorRate: stats.calls > 0 ? (stats.errors / stats.calls * 100).toFixed(2) : 0,
    successRate: stats.calls > 0 ? ((stats.calls - stats.errors) / stats.calls * 100).toFixed(2) : 0
  }));

  const summary = {
    totalEndpoints: statsArray.length,
    totalCalls: statsArray.reduce((sum, stat) => sum + stat.calls, 0),
    totalErrors: statsArray.reduce((sum, stat) => sum + stat.errors, 0),
    averageResponseTime: statsArray.length > 0 
      ? (statsArray.reduce((sum, stat) => sum + stat.averageResponseTime, 0) / statsArray.length).toFixed(2)
      : 0,
    topEndpoints: statsArray
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 5),
    slowestEndpoints: statsArray
      .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, 5)
  };

  res.json(apiResponse('API統計情報を正常に取得しました', {
    summary,
    endpoints: statsArray.sort((a, b) => b.calls - a.calls)
  }));
});

/**
 * ヘルスチェック（強化版）
 */
const healthCheck = asyncHandler(async (req, res) => {
  const checks = {};
  let overallStatus = 'healthy';

  // データベース接続チェック
  try {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, '..', 'db', 'itsm.sqlite');
    const db = new sqlite3.Database(dbPath);
    
    await new Promise((resolve, reject) => {
      db.get('SELECT 1 as test', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
      db.close();
    });
    
    checks.database = { status: 'healthy', message: 'データベース接続正常' };
  } catch (error) {
    checks.database = { status: 'unhealthy', message: 'データベース接続エラー', error: error.message };
    overallStatus = 'unhealthy';
  }

  // メモリ使用量チェック
  const memoryUsage = process.memoryUsage();
  const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal * 100);
  
  if (memoryUsagePercent > 90) {
    checks.memory = { status: 'critical', message: 'メモリ使用量が非常に高い', usage: `${memoryUsagePercent.toFixed(2)}%` };
    overallStatus = 'critical';
  } else if (memoryUsagePercent > 75) {
    checks.memory = { status: 'warning', message: 'メモリ使用量が高い', usage: `${memoryUsagePercent.toFixed(2)}%` };
    if (overallStatus === 'healthy') overallStatus = 'warning';
  } else {
    checks.memory = { status: 'healthy', message: 'メモリ使用量正常', usage: `${memoryUsagePercent.toFixed(2)}%` };
  }

  // CPU負荷チェック
  const loadAverage = os.loadavg()[0];
  const cpuCount = os.cpus().length;
  const loadPercent = (loadAverage / cpuCount * 100);

  if (loadPercent > 90) {
    checks.cpu = { status: 'critical', message: 'CPU負荷が非常に高い', load: `${loadPercent.toFixed(2)}%` };
    overallStatus = 'critical';
  } else if (loadPercent > 70) {
    checks.cpu = { status: 'warning', message: 'CPU負荷が高い', load: `${loadPercent.toFixed(2)}%` };
    if (overallStatus === 'healthy') overallStatus = 'warning';
  } else {
    checks.cpu = { status: 'healthy', message: 'CPU負荷正常', load: `${loadPercent.toFixed(2)}%` };
  }

  // 環境変数チェック
  const requiredEnvVars = ['JWT_SECRET', 'DB_PATH'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingEnvVars.length > 0) {
    checks.environment = { 
      status: 'critical', 
      message: '必要な環境変数が設定されていません', 
      missing: missingEnvVars 
    };
    overallStatus = 'critical';
  } else {
    checks.environment = { status: 'healthy', message: '環境変数設定正常' };
  }

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'warning' ? 200 : 503;

  res.status(statusCode).json(apiResponse('ヘルスチェック完了', {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks
  }));
});

/**
 * ログファイル取得（最新100行）
 */
const getLogs = asyncHandler(async (req, res) => {
  logActivity(req, 'LOGS_REQUEST', 'Application logs requested');
  
  const { lines = 100, level = 'all' } = req.query;
  
  try {
    // 実際のログファイルパスを設定
    const logPath = path.join(__dirname, '..', '..', 'logs', 'app.log');
    
    try {
      const logContent = await fs.readFile(logPath, 'utf8');
      const logLines = logContent.split('\n')
        .filter(line => line.trim() !== '')
        .slice(-parseInt(lines));
      
      const filteredLogs = level === 'all' 
        ? logLines
        : logLines.filter(line => line.toLowerCase().includes(level.toLowerCase()));

      res.json(apiResponse('ログを正常に取得しました', {
        totalLines: logLines.length,
        filteredLines: filteredLogs.length,
        logs: filteredLogs,
        lastUpdate: new Date().toISOString()
      }));
    } catch (fileError) {
      // ログファイルが存在しない場合は空のログを返す
      res.json(apiResponse('ログファイルが見つかりません', {
        totalLines: 0,
        filteredLines: 0,
        logs: [],
        message: 'ログファイルが作成されていないか、パスが正しくありません',
        lastUpdate: new Date().toISOString()
      }));
    }
  } catch (error) {
    throw new Error(`ログ取得エラー: ${error.message}`);
  }
});

/**
 * キャッシュクリア
 */
const clearCache = asyncHandler(async (req, res) => {
  logActivity(req, 'CACHE_CLEAR', 'Cache clearing requested');
  
  // API統計をクリア
  apiStats.clear();
  
  // Node.js内部キャッシュクリア（require cache）
  const cacheSize = Object.keys(require.cache).length;
  
  // 一部のキャッシュをクリア（慎重に）
  for (const key in require.cache) {
    if (key.includes('node_modules') === false && key.includes('.js')) {
      delete require.cache[key];
    }
  }

  res.json(apiResponse('キャッシュを正常にクリアしました', {
    apiStatsCleared: true,
    requireCacheSize: cacheSize,
    timestamp: new Date().toISOString()
  }));
});

module.exports = {
  getSystemMetrics,
  getApiStats,
  healthCheck,
  getLogs,
  clearCache,
  recordApiCall
};