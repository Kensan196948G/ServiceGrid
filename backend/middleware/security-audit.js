/**
 * セキュリティ監査・自動化ミドルウェア
 * Feature-E 非機能要件強化
 */

const crypto = require('crypto');
const { logger } = require('./monitoring');

class SecurityAuditor {
  constructor() {
    this.securityEvents = [];
    this.threatDetection = {
      suspiciousIPs: new Map(),
      failedLogins: new Map(),
      rateLimitViolations: new Map(),
      sqlInjectionAttempts: new Map(),
      xssAttempts: new Map()
    };
    
    this.securityRules = {
      maxFailedLogins: 5,
      maxRequestsPerMinute: 100,
      suspiciousPatterns: [
        /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDROP\b)/i,
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ]
    };

    // 定期的なセキュリティ分析
    setInterval(() => this.runSecurityAnalysis(), 300000); // 5分間隔
    
    // 脅威インテリジェンス更新
    setInterval(() => this.updateThreatIntelligence(), 3600000); // 1時間間隔
  }

  auditRequest(req) {
    const auditData = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      path: req.path,
      headers: this.sanitizeHeaders(req.headers),
      body: this.sanitizeBody(req.body),
      query: req.query,
      sessionId: req.sessionID,
      user: req.user?.username || 'anonymous'
    };

    // 脅威検出
    const threats = this.detectThreats(auditData);
    if (threats.length > 0) {
      auditData.threats = threats;
      this.handleSecurityThreat(auditData);
    }

    // 監査ログ保存
    this.securityEvents.push(auditData);
    
    // 最新1000件のみ保持
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    return auditData;
  }

  detectThreats(auditData) {
    const threats = [];

    // SQLインジェクション検出
    if (this.detectSQLInjection(auditData)) {
      threats.push({
        type: 'SQL_INJECTION',
        severity: 'high',
        description: 'SQLインジェクション攻撃の可能性'
      });
    }

    // XSS検出
    if (this.detectXSS(auditData)) {
      threats.push({
        type: 'XSS_ATTEMPT',
        severity: 'medium',
        description: 'クロスサイトスクリプティング攻撃の可能性'
      });
    }

    // ブルートフォース攻撃検出
    if (this.detectBruteForce(auditData)) {
      threats.push({
        type: 'BRUTE_FORCE',
        severity: 'high',
        description: 'ブルートフォース攻撃の可能性'
      });
    }

    // 異常なトラフィック検出
    if (this.detectAbnormalTraffic(auditData)) {
      threats.push({
        type: 'ABNORMAL_TRAFFIC',
        severity: 'medium',
        description: '異常なトラフィックパターン'
      });
    }

    return threats;
  }

  detectSQLInjection(auditData) {
    const textToCheck = [
      JSON.stringify(auditData.body || {}),
      JSON.stringify(auditData.query || {}),
      auditData.path
    ].join(' ');

    return this.securityRules.suspiciousPatterns.some(pattern => 
      pattern.test(textToCheck)
    );
  }

  detectXSS(auditData) {
    const textToCheck = [
      JSON.stringify(auditData.body || {}),
      JSON.stringify(auditData.query || {})
    ].join(' ');

    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi
    ];

    return xssPatterns.some(pattern => pattern.test(textToCheck));
  }

  detectBruteForce(auditData) {
    const ip = auditData.ip;
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;

    // ログイン失敗の追跡
    if (auditData.path.includes('/login')) {
      if (!this.threatDetection.failedLogins.has(ip)) {
        this.threatDetection.failedLogins.set(ip, []);
      }
      
      const attempts = this.threatDetection.failedLogins.get(ip);
      attempts.push(now);
      
      // 5分以内の試行のみ保持
      const recentAttempts = attempts.filter(time => time > fiveMinutesAgo);
      this.threatDetection.failedLogins.set(ip, recentAttempts);
      
      return recentAttempts.length >= this.securityRules.maxFailedLogins;
    }

    return false;
  }

  detectAbnormalTraffic(auditData) {
    const ip = auditData.ip;
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    if (!this.threatDetection.rateLimitViolations.has(ip)) {
      this.threatDetection.rateLimitViolations.set(ip, []);
    }

    const requests = this.threatDetection.rateLimitViolations.get(ip);
    requests.push(now);

    // 1分以内のリクエストのみ保持
    const recentRequests = requests.filter(time => time > oneMinuteAgo);
    this.threatDetection.rateLimitViolations.set(ip, recentRequests);

    return recentRequests.length > this.securityRules.maxRequestsPerMinute;
  }

  handleSecurityThreat(auditData) {
    const ip = auditData.ip;
    const threats = auditData.threats;

    // 重大な脅威の場合はIP一時ブロック
    const criticalThreats = threats.filter(t => t.severity === 'high');
    if (criticalThreats.length > 0) {
      this.blockSuspiciousIP(ip, 3600000); // 1時間ブロック
    }

    // アラート送信
    logger.error('Security threat detected', {
      ip,
      threats,
      auditData: this.sanitizeAuditData(auditData)
    });

    // セキュリティイベント記録
    this.recordSecurityEvent({
      type: 'THREAT_DETECTED',
      severity: Math.max(...threats.map(t => t.severity === 'high' ? 3 : t.severity === 'medium' ? 2 : 1)),
      ip,
      threats,
      timestamp: new Date().toISOString()
    });
  }

  blockSuspiciousIP(ip, duration) {
    const blockUntil = Date.now() + duration;
    this.threatDetection.suspiciousIPs.set(ip, blockUntil);
    
    logger.warn('IP blocked due to suspicious activity', { ip, blockUntil });
  }

  isIPBlocked(ip) {
    const blockUntil = this.threatDetection.suspiciousIPs.get(ip);
    if (blockUntil && Date.now() < blockUntil) {
      return true;
    }
    
    // 期限切れのブロックを削除
    if (blockUntil) {
      this.threatDetection.suspiciousIPs.delete(ip);
    }
    
    return false;
  }

  runSecurityAnalysis() {
    const analysis = {
      timestamp: new Date().toISOString(),
      summary: {
        totalEvents: this.securityEvents.length,
        threatsDetected: this.securityEvents.filter(e => e.threats?.length > 0).length,
        blockedIPs: this.threatDetection.suspiciousIPs.size,
        topThreatTypes: this.getTopThreatTypes(),
        riskLevel: this.calculateRiskLevel()
      },
      recommendations: this.generateSecurityRecommendations()
    };

    logger.info('Security analysis completed', analysis);
    return analysis;
  }

  getTopThreatTypes() {
    const threatCounts = {};
    
    this.securityEvents.forEach(event => {
      if (event.threats) {
        event.threats.forEach(threat => {
          threatCounts[threat.type] = (threatCounts[threat.type] || 0) + 1;
        });
      }
    });

    return Object.entries(threatCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  }

  calculateRiskLevel() {
    const recentThreats = this.securityEvents.filter(event => 
      event.threats?.length > 0 && 
      Date.now() - new Date(event.timestamp).getTime() < 3600000
    ).length;

    if (recentThreats > 10) return 'HIGH';
    if (recentThreats > 5) return 'MEDIUM';
    return 'LOW';
  }

  generateSecurityRecommendations() {
    const recommendations = [];
    const riskLevel = this.calculateRiskLevel();

    if (riskLevel === 'HIGH') {
      recommendations.push('セキュリティ体制の緊急見直しが必要');
      recommendations.push('WAF導入の検討');
    }

    if (this.threatDetection.suspiciousIPs.size > 5) {
      recommendations.push('IP ホワイトリストの導入検討');
    }

    const sqlInjectionAttempts = this.securityEvents.filter(e => 
      e.threats?.some(t => t.type === 'SQL_INJECTION')
    ).length;

    if (sqlInjectionAttempts > 0) {
      recommendations.push('データベースアクセス権限の見直し');
      recommendations.push('パラメータ化クエリの徹底');
    }

    return recommendations;
  }

  sanitizeHeaders(headers) {
    const sensitive = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };
    
    sensitive.forEach(key => {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  sanitizeBody(body) {
    if (!body) return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  sanitizeAuditData(auditData) {
    return {
      ...auditData,
      headers: this.sanitizeHeaders(auditData.headers),
      body: this.sanitizeBody(auditData.body)
    };
  }

  recordSecurityEvent(event) {
    logger.warn('Security event recorded', event);
  }

  updateThreatIntelligence() {
    // 脅威インテリジェンスの更新（外部ソースとの連携など）
    logger.info('Threat intelligence updated');
  }

  getSecurityReport() {
    return {
      summary: this.runSecurityAnalysis(),
      events: this.securityEvents.slice(-100), // 最新100件
      blockedIPs: Array.from(this.threatDetection.suspiciousIPs.entries()),
      timestamp: new Date().toISOString()
    };
  }
}

// グローバルインスタンス
const securityAuditor = new SecurityAuditor();

// ミドルウェア
const securityAuditMiddleware = (req, res, next) => {
  // IP ブロックチェック
  if (securityAuditor.isIPBlocked(req.ip)) {
    return res.status(403).json({
      error: 'Access denied due to suspicious activity',
      code: 'IP_BLOCKED'
    });
  }

  // セキュリティ監査実行
  const auditData = securityAuditor.auditRequest(req);
  req.securityAudit = auditData;

  next();
};

module.exports = {
  SecurityAuditor,
  securityAuditor,
  securityAuditMiddleware
};