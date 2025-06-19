/**
 * 高性能パフォーマンス監視ミドルウェア
 * Feature-E 非機能要件強化
 */

const { logger } = require('./monitoring');

class AdvancedPerformanceMonitor {
  constructor() {
    this.metrics = {
      responseTimeP95: 0,
      responseTimeP99: 0,
      throughputPerSecond: 0,
      activeConnections: 0,
      memoryLeakDetection: false,
      cpuUtilization: 0,
      errorRateLastHour: 0
    };
    
    this.responseTimes = [];
    this.requestCounts = [];
    this.alerts = new Map();
    
    // 1分間隔での高頻度監視
    setInterval(() => this.collectHighFrequencyMetrics(), 60000);
    
    // 5分間隔での分析
    setInterval(() => this.runPerformanceAnalysis(), 300000);
  }

  async collectHighFrequencyMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // P95, P99 レスポンス時間計算
    if (this.responseTimes.length > 0) {
      const sorted = this.responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p99Index = Math.floor(sorted.length * 0.99);
      
      this.metrics.responseTimeP95 = sorted[p95Index] || 0;
      this.metrics.responseTimeP99 = sorted[p99Index] || 0;
    }

    // スループット計算
    const requestsLastMinute = this.requestCounts.filter(
      timestamp => Date.now() - timestamp < 60000
    ).length;
    this.metrics.throughputPerSecond = requestsLastMinute / 60;

    // メモリリーク検出
    this.metrics.memoryLeakDetection = this.detectMemoryLeak(memUsage);

    // CPU使用率
    this.metrics.cpuUtilization = this.calculateCpuUtilization(cpuUsage);

    // アラート生成
    this.generatePerformanceAlerts();
  }

  detectMemoryLeak(memUsage) {
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    
    // ヒープ使用率が90%を超える場合
    if (heapUsedMB / heapTotalMB > 0.9) {
      logger.warn('Memory leak suspected', {
        heapUsedMB,
        heapTotalMB,
        utilizationPercent: (heapUsedMB / heapTotalMB * 100).toFixed(2)
      });
      return true;
    }
    return false;
  }

  calculateCpuUtilization(cpuUsage) {
    // 簡易CPU使用率計算
    const totalCpu = cpuUsage.user + cpuUsage.system;
    return (totalCpu / 1000000).toFixed(2); // マイクロ秒から秒に変換
  }

  generatePerformanceAlerts() {
    const alerts = [];

    // P99レスポンス時間アラート
    if (this.metrics.responseTimeP99 > 3000) {
      alerts.push({
        type: 'HIGH_P99_RESPONSE_TIME',
        severity: 'critical',
        value: this.metrics.responseTimeP99,
        threshold: 3000,
        message: 'P99レスポンス時間が3秒を超えています'
      });
    }

    // スループットアラート
    if (this.metrics.throughputPerSecond < 0.1) {
      alerts.push({
        type: 'LOW_THROUGHPUT',
        severity: 'warning',
        value: this.metrics.throughputPerSecond,
        threshold: 0.1,
        message: 'スループットが低下しています'
      });
    }

    // メモリリークアラート
    if (this.metrics.memoryLeakDetection) {
      alerts.push({
        type: 'MEMORY_LEAK_DETECTED',
        severity: 'critical',
        message: 'メモリリークの可能性があります'
      });
    }

    // アラート送信
    alerts.forEach(alert => {
      const alertKey = `${alert.type}_${Date.now()}`;
      if (!this.alerts.has(alertKey)) {
        this.alerts.set(alertKey, alert);
        logger.error('Performance alert', alert);
        
        // アラート履歴をクリーンアップ（最新100件のみ保持）
        if (this.alerts.size > 100) {
          const oldestKey = this.alerts.keys().next().value;
          this.alerts.delete(oldestKey);
        }
      }
    });
  }

  async runPerformanceAnalysis() {
    const analysis = {
      timestamp: new Date().toISOString(),
      summary: {
        averageResponseTime: this.calculateAverageResponseTime(),
        p95ResponseTime: this.metrics.responseTimeP95,
        p99ResponseTime: this.metrics.responseTimeP99,
        throughput: this.metrics.throughputPerSecond,
        memoryUsage: process.memoryUsage(),
        activeAlerts: this.alerts.size
      },
      recommendations: this.generateOptimizationRecommendations()
    };

    logger.info('Performance analysis completed', analysis);
    return analysis;
  }

  calculateAverageResponseTime() {
    if (this.responseTimes.length === 0) return 0;
    return this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }

  generateOptimizationRecommendations() {
    const recommendations = [];

    if (this.metrics.responseTimeP99 > 1000) {
      recommendations.push('API endpoints optimization required');
      recommendations.push('Consider implementing response caching');
    }

    if (this.metrics.memoryLeakDetection) {
      recommendations.push('Investigate memory usage patterns');
      recommendations.push('Check for unclosed database connections');
    }

    if (this.metrics.throughputPerSecond < 1) {
      recommendations.push('Consider horizontal scaling');
      recommendations.push('Optimize database queries');
    }

    return recommendations;
  }

  recordRequest(responseTime) {
    this.responseTimes.push(responseTime);
    this.requestCounts.push(Date.now());

    // 過去1時間のデータのみ保持
    const oneHourAgo = Date.now() - 3600000;
    this.responseTimes = this.responseTimes.filter((_, index) => 
      this.requestCounts[index] > oneHourAgo
    );
    this.requestCounts = this.requestCounts.filter(timestamp => 
      timestamp > oneHourAgo
    );
  }

  getMetrics() {
    return {
      ...this.metrics,
      totalRequests: this.requestCounts.length,
      averageResponseTime: this.calculateAverageResponseTime(),
      activeAlerts: Array.from(this.alerts.values()),
      timestamp: new Date().toISOString()
    };
  }
}

// グローバルインスタンス
const performanceMonitor = new AdvancedPerformanceMonitor();

// ミドルウェア
const performanceMiddleware = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    performanceMonitor.recordRequest(responseTime);
  });

  next();
};

module.exports = {
  AdvancedPerformanceMonitor,
  performanceMonitor,
  performanceMiddleware
};