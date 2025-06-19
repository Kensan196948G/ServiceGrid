/**
 * パフォーマンスメトリクス API
 * Feature-E 非機能要件実装
 */

const { metricsCollector, logger } = require('../middleware/monitoring');
const os = require('os');

/**
 * システムパフォーマンス詳細取得
 */
const getSystemPerformance = (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    const processMetrics = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const performance = {
      timestamp: new Date().toISOString(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        loadAverage: os.loadavg(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        memoryUsagePercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        nodeVersion: process.version,
        memory: {
          rss: processMetrics.rss,
          heapTotal: processMetrics.heapTotal,
          heapUsed: processMetrics.heapUsed,
          external: processMetrics.external,
          arrayBuffers: processMetrics.arrayBuffers
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      },
      application: metrics,
      health: metricsCollector.getHealthStatus()
    };

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    logger.error('Failed to get system performance', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'パフォーマンス情報の取得に失敗しました'
    });
  }
};

/**
 * APIエンドポイント別パフォーマンス取得
 */
const getEndpointPerformance = (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    const endpointStats = [];

    for (const [endpoint, stats] of metrics.requests.byEndpoint) {
      endpointStats.push({
        endpoint,
        totalRequests: stats.count,
        averageResponseTime: (stats.totalTime / stats.count).toFixed(2),
        totalResponseTime: stats.totalTime
      });
    }

    // レスポンス時間順でソート
    endpointStats.sort((a, b) => b.averageResponseTime - a.averageResponseTime);

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        endpoints: endpointStats,
        summary: {
          totalEndpoints: endpointStats.length,
          slowestEndpoint: endpointStats[0] || null,
          fastestEndpoint: endpointStats[endpointStats.length - 1] || null
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get endpoint performance', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'エンドポイントパフォーマンス情報の取得に失敗しました'
    });
  }
};

/**
 * リアルタイムメトリクス取得
 */
const getRealTimeMetrics = (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    
    // 直近の統計情報
    const recentRequests = metrics.performance.responseTimes.slice(-100);
    const recentAverage = recentRequests.length > 0 
      ? recentRequests.reduce((a, b) => a + b, 0) / recentRequests.length 
      : 0;

    const realTimeData = {
      timestamp: new Date().toISOString(),
      current: {
        activeRequests: metrics.requests.total - metrics.requests.success - metrics.requests.error,
        recentAverageResponseTime: recentAverage.toFixed(2),
        requestsPerMinute: calculateRequestsPerMinute(metrics),
        errorRate: calculateErrorRate(metrics),
        memoryUsage: process.memoryUsage(),
        cpuLoad: os.loadavg()[0]
      },
      trends: {
        last24Hours: generateTrendData(24),
        lastHour: generateTrendData(1),
        last10Minutes: generateTrendData(0.167)
      }
    };

    res.json({
      success: true,
      data: realTimeData
    });
  } catch (error) {
    logger.error('Failed to get real-time metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'リアルタイムメトリクスの取得に失敗しました'
    });
  }
};

/**
 * パフォーマンス履歴取得
 */
const getPerformanceHistory = (req, res) => {
  try {
    const { timeRange = '24h', metric = 'responseTime' } = req.query;
    
    const history = generateHistoricalData(timeRange, metric);
    
    res.json({
      success: true,
      data: {
        timeRange,
        metric,
        data: history,
        summary: {
          min: Math.min(...history.map(d => d.value)),
          max: Math.max(...history.map(d => d.value)),
          average: history.reduce((a, b) => a + b.value, 0) / history.length
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get performance history', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'パフォーマンス履歴の取得に失敗しました'
    });
  }
};

/**
 * パフォーマンスレポート生成
 */
const generatePerformanceReport = (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    const { startDate, endDate } = req.query;

    const report = {
      reportId: generateReportId(),
      generatedAt: new Date().toISOString(),
      period: {
        start: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: endDate || new Date().toISOString()
      },
      summary: {
        totalRequests: metrics.requests.total,
        successRate: ((metrics.requests.success / metrics.requests.total) * 100).toFixed(2),
        averageResponseTime: metrics.performance.averageResponseTime.toFixed(2),
        maxResponseTime: metrics.performance.maxResponseTime,
        systemUptime: process.uptime()
      },
      details: {
        requestsBreakdown: Array.from(metrics.requests.byStatus.entries()).map(([status, count]) => ({
          statusCode: status,
          count,
          percentage: ((count / metrics.requests.total) * 100).toFixed(2)
        })),
        topEndpoints: getTopEndpoints(metrics),
        performanceIssues: identifyPerformanceIssues(metrics),
        recommendations: generateRecommendations(metrics)
      }
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Failed to generate performance report', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'パフォーマンスレポートの生成に失敗しました'
    });
  }
};

/**
 * ボトルネック分析
 */
const analyzeBottlenecks = (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    
    const bottlenecks = {
      timestamp: new Date().toISOString(),
      analysis: {
        slowEndpoints: identifySlowEndpoints(metrics),
        memoryBottlenecks: analyzeMemoryUsage(),
        cpuBottlenecks: analyzeCPUUsage(),
        databaseBottlenecks: analyzeDatabasePerformance(),
        networkBottlenecks: analyzeNetworkPerformance()
      },
      recommendations: generateBottleneckRecommendations(),
      severity: calculateBottleneckSeverity()
    };

    res.json({
      success: true,
      data: bottlenecks
    });
  } catch (error) {
    logger.error('Failed to analyze bottlenecks', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'ボトルネック分析に失敗しました'
    });
  }
};

// ヘルパー関数

function calculateRequestsPerMinute(metrics) {
  // 簡易計算 - 実際の実装では時系列データが必要
  const uptime = process.uptime() / 60; // 分
  return uptime > 0 ? (metrics.requests.total / uptime).toFixed(2) : 0;
}

function calculateErrorRate(metrics) {
  return metrics.requests.total > 0 
    ? ((metrics.requests.error / metrics.requests.total) * 100).toFixed(2)
    : 0;
}

function generateTrendData(hours) {
  // モックデータ - 実際の実装では時系列データベースから取得
  const points = [];
  const intervals = Math.floor(hours * 12); // 5分間隔
  
  for (let i = 0; i < intervals; i++) {
    points.push({
      timestamp: new Date(Date.now() - (intervals - i) * 5 * 60 * 1000).toISOString(),
      value: Math.random() * 1000 + 200 // モックレスポンス時間
    });
  }
  
  return points;
}

function generateHistoricalData(timeRange, metric) {
  // モックデータ - 実際の実装では履歴データベースから取得
  const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 1;
  return generateTrendData(hours);
}

function generateReportId() {
  return 'PERF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function getTopEndpoints(metrics) {
  const endpoints = Array.from(metrics.requests.byEndpoint.entries())
    .map(([endpoint, stats]) => ({
      endpoint,
      requests: stats.count,
      averageTime: (stats.totalTime / stats.count).toFixed(2)
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 10);
  
  return endpoints;
}

function identifyPerformanceIssues(metrics) {
  const issues = [];
  
  if (metrics.performance.averageResponseTime > 1000) {
    issues.push({
      type: 'HIGH_RESPONSE_TIME',
      severity: 'warning',
      description: '平均レスポンス時間が1秒を超えています'
    });
  }
  
  if (metrics.requests.total > 0 && (metrics.requests.error / metrics.requests.total) > 0.05) {
    issues.push({
      type: 'HIGH_ERROR_RATE',
      severity: 'critical',
      description: 'エラー率が5%を超えています'
    });
  }
  
  return issues;
}

function generateRecommendations(metrics) {
  const recommendations = [];
  
  if (metrics.performance.averageResponseTime > 500) {
    recommendations.push('レスポンス時間の最適化を検討してください');
  }
  
  if (process.memoryUsage().heapUsed > process.memoryUsage().heapTotal * 0.8) {
    recommendations.push('メモリ使用量の最適化を検討してください');
  }
  
  return recommendations;
}

function identifySlowEndpoints(metrics) {
  return Array.from(metrics.requests.byEndpoint.entries())
    .map(([endpoint, stats]) => ({
      endpoint,
      averageTime: stats.totalTime / stats.count
    }))
    .filter(item => item.averageTime > 1000)
    .sort((a, b) => b.averageTime - a.averageTime);
}

function analyzeMemoryUsage() {
  const usage = process.memoryUsage();
  const total = os.totalmem();
  const free = os.freemem();
  
  return {
    processMemory: usage.heapUsed / usage.heapTotal,
    systemMemory: (total - free) / total,
    recommendations: usage.heapUsed / usage.heapTotal > 0.8 
      ? ['メモリリークの確認', 'ガベージコレクションの最適化']
      : []
  };
}

function analyzeCPUUsage() {
  const loadAvg = os.loadavg();
  
  return {
    loadAverage: loadAvg,
    recommendations: loadAvg[0] > os.cpus().length 
      ? ['CPU集約的な処理の最適化', '非同期処理の活用']
      : []
  };
}

function analyzeDatabasePerformance() {
  // モック実装 - 実際にはデータベースメトリクスを分析
  return {
    slowQueries: [],
    connectionPool: 'normal',
    recommendations: []
  };
}

function analyzeNetworkPerformance() {
  // モック実装 - 実際にはネットワークメトリクスを分析
  return {
    latency: 'normal',
    throughput: 'normal',
    recommendations: []
  };
}

function generateBottleneckRecommendations() {
  return [
    'パフォーマンス監視の継続実施',
    '定期的なボトルネック分析の実行',
    'システムリソースの監視強化'
  ];
}

function calculateBottleneckSeverity() {
  // 簡易実装 - 実際にはより詳細な分析が必要
  return 'low';
}

module.exports = {
  getSystemPerformance,
  getEndpointPerformance,
  getRealTimeMetrics,
  getPerformanceHistory,
  generatePerformanceReport,
  analyzeBottlenecks
};