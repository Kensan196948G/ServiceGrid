/**
 * SLA監視・メトリクス管理ミドルウェア
 * Feature-E-NonFunc: 非機能要件専門実装
 */

const fs = require('fs');
const path = require('path');

// SLAメトリクス管理クラス
class SLAMonitor {
  constructor() {
    this.metrics = {
      availability: {
        uptime: 0,
        downtime: 0,
        incidents: 0,
        target: 99.9 // 99.9% availability target
      },
      performance: {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        target: 200 // 200ms target
      },
      reliability: {
        errorRate: 0,
        successfulRequests: 0,
        failedRequests: 0,
        target: 99.5 // 99.5% success rate
      },
      security: {
        securityIncidents: 0,
        blockedAttacks: 0,
        vulnerabilities: 0,
        target: 0 // Zero tolerance for security incidents
      }
    };
    
    this.requests = [];
    this.startTime = Date.now();
    this.lastReportTime = Date.now();
    
    // 定期的なメトリクス更新
    setInterval(() => this.updateMetrics(), 60000); // 1分ごと
    setInterval(() => this.generateSLAReport(), 300000); // 5分ごと
  }
  
  /**
   * リクエスト記録
   */
  recordRequest(req, res, responseTime) {
    const requestData = {
      timestamp: Date.now(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: responseTime,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      success: res.statusCode < 400
    };
    
    this.requests.push(requestData);
    
    // 古いデータを削除（24時間保持）
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.requests = this.requests.filter(r => r.timestamp > cutoff);
    
    this.updateRealTimeMetrics(requestData);
  }
  
  /**
   * リアルタイムメトリクス更新
   */
  updateRealTimeMetrics(requestData) {
    const recentRequests = this.requests.filter(r => 
      r.timestamp > Date.now() - 60000 // 過去1分間
    );
    
    if (recentRequests.length > 0) {
      // パフォーマンスメトリクス
      const responseTimes = recentRequests.map(r => r.responseTime);
      this.metrics.performance.avgResponseTime = 
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p99Index = Math.floor(responseTimes.length * 0.99);
      
      this.metrics.performance.p95ResponseTime = responseTimes[p95Index] || 0;
      this.metrics.performance.p99ResponseTime = responseTimes[p99Index] || 0;
      
      // 信頼性メトリクス
      const successful = recentRequests.filter(r => r.success).length;
      const failed = recentRequests.length - successful;
      
      this.metrics.reliability.successfulRequests = successful;
      this.metrics.reliability.failedRequests = failed;
      this.metrics.reliability.errorRate = 
        recentRequests.length > 0 ? (failed / recentRequests.length) * 100 : 0;
    }
  }
  
  /**
   * 稼働率メトリクス更新
   */
  updateMetrics() {
    const now = Date.now();
    const totalTime = now - this.startTime;
    
    // 稼働率計算（簡易版 - 実際の実装ではヘルスチェック結果を使用）
    this.metrics.availability.uptime = totalTime;
    this.metrics.availability.downtime = 0; // 現在は常に稼働中として計算
    
    const availabilityPercentage = 
      (this.metrics.availability.uptime / (this.metrics.availability.uptime + this.metrics.availability.downtime)) * 100;
    
    this.metrics.availability.percentage = availabilityPercentage;
  }
  
  /**
   * SLAレポート生成
   */
  generateSLAReport() {
    const report = {
      timestamp: new Date().toISOString(),
      period: {
        start: new Date(this.lastReportTime).toISOString(),
        end: new Date().toISOString()
      },
      sla_status: this.evaluateSLACompliance(),
      metrics: this.metrics,
      recommendations: this.generateRecommendations()
    };
    
    // レポートをファイルに保存
    const reportPath = path.join(__dirname, '../logs/sla-reports');
    if (!fs.existsSync(reportPath)) {
      fs.mkdirSync(reportPath, { recursive: true });
    }
    
    const filename = `sla-report-${new Date().toISOString().slice(0, 10)}.json`;
    fs.writeFileSync(
      path.join(reportPath, filename),
      JSON.stringify(report, null, 2)
    );
    
    this.lastReportTime = Date.now();
    
    console.log(`[SLA-MONITOR] Report generated: ${filename}`);
    return report;
  }
  
  /**
   * SLA準拠評価
   */
  evaluateSLACompliance() {
    const compliance = {
      availability: {
        current: this.metrics.availability.percentage || 100,
        target: this.metrics.availability.target,
        compliant: (this.metrics.availability.percentage || 100) >= this.metrics.availability.target,
        status: 'GREEN'
      },
      performance: {
        current: this.metrics.performance.avgResponseTime,
        target: this.metrics.performance.target,
        compliant: this.metrics.performance.avgResponseTime <= this.metrics.performance.target,
        status: this.metrics.performance.avgResponseTime <= this.metrics.performance.target ? 'GREEN' : 'YELLOW'
      },
      reliability: {
        current: 100 - this.metrics.reliability.errorRate,
        target: this.metrics.reliability.target,
        compliant: (100 - this.metrics.reliability.errorRate) >= this.metrics.reliability.target,
        status: (100 - this.metrics.reliability.errorRate) >= this.metrics.reliability.target ? 'GREEN' : 'RED'
      },
      security: {
        current: this.metrics.security.securityIncidents,
        target: this.metrics.security.target,
        compliant: this.metrics.security.securityIncidents <= this.metrics.security.target,
        status: this.metrics.security.securityIncidents <= this.metrics.security.target ? 'GREEN' : 'RED'
      }
    };
    
    // 全体的なSLAステータス
    const allGreen = Object.values(compliance).every(c => c.status === 'GREEN');
    const anyRed = Object.values(compliance).some(c => c.status === 'RED');
    
    compliance.overall = {
      status: anyRed ? 'RED' : allGreen ? 'GREEN' : 'YELLOW',
      compliant: allGreen
    };
    
    return compliance;
  }
  
  /**
   * 改善提案生成
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.metrics.performance.avgResponseTime > this.metrics.performance.target) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        message: 'API応答時間がターゲットを超過しています。データベースクエリの最適化を検討してください。',
        action: 'optimize_database_queries'
      });
    }
    
    if (this.metrics.reliability.errorRate > (100 - this.metrics.reliability.target)) {
      recommendations.push({
        category: 'reliability',
        priority: 'critical',
        message: 'エラー率が許容値を超過しています。緊急対応が必要です。',
        action: 'investigate_errors'
      });
    }
    
    if (this.metrics.security.securityIncidents > 0) {
      recommendations.push({
        category: 'security',
        priority: 'critical',
        message: 'セキュリティインシデントが発生しています。即座に対応してください。',
        action: 'security_incident_response'
      });
    }
    
    return recommendations;
  }
  
  /**
   * メトリクス取得
   */
  getMetrics() {
    return {
      ...this.metrics,
      sla_compliance: this.evaluateSLACompliance(),
      last_updated: new Date().toISOString()
    };
  }
  
  /**
   * セキュリティインシデント記録
   */
  recordSecurityIncident(type, severity, details) {
    this.metrics.security.securityIncidents++;
    
    const incident = {
      timestamp: new Date().toISOString(),
      type,
      severity,
      details
    };
    
    console.log(`[SECURITY-INCIDENT] ${severity.toUpperCase()}: ${type}`, details);
    
    // 重要なセキュリティインシデントはアラート送信
    if (severity === 'critical' || severity === 'high') {
      this.sendSecurityAlert(incident);
    }
  }
  
  /**
   * セキュリティアラート送信
   */
  sendSecurityAlert(incident) {
    // 実際の実装では、メール、Slack、PagerDutyなどに送信
    console.log(`[SECURITY-ALERT] Critical security incident detected:`, incident);
  }
}

// グローバルSLAモニターインスタンス
const slaMonitor = new SLAMonitor();

/**
 * SLA監視ミドルウェア
 */
const slaMonitoringMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // レスポンス完了時の処理
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    slaMonitor.recordRequest(req, res, responseTime);
    
    // パフォーマンス警告
    if (responseTime > 1000) {
      console.log(`[SLA-WARNING] Slow response: ${req.method} ${req.path} - ${responseTime}ms`);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * SLAメトリクスAPI
 */
const getSLAMetrics = (req, res) => {
  try {
    const metrics = slaMonitor.getMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting SLA metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve SLA metrics'
    });
  }
};

/**
 * SLAレポートAPI
 */
const getSLAReport = (req, res) => {
  try {
    const report = slaMonitor.generateSLAReport();
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating SLA report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate SLA report'
    });
  }
};

module.exports = {
  slaMonitoringMiddleware,
  getSLAMetrics,
  getSLAReport,
  slaMonitor
};