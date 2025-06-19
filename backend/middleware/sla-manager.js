/**
 * SLA管理システム
 * Feature-E 非機能要件実装
 */

const { logger } = require('./monitoring');

/**
 * SLA管理クラス
 */
class SLAManager {
  constructor(db) {
    this.db = db;
    this.slaDefinitions = new Map();
    this.activeMonitors = new Map();
    this.alertThresholds = {
      critical: 0.9, // SLA期限の90%
      warning: 0.7   // SLA期限の70%
    };
    
    this.initializeSLADefinitions();
    this.startSLAMonitoring();
  }

  /**
   * SLA定義初期化
   */
  initializeSLADefinitions() {
    const defaultSLAs = [
      {
        type: 'user_creation',
        targetHours: 4,
        priority: 'high',
        escalationLevels: [2, 3, 4] // 50%, 75%, 90%の時点でエスカレーション
      },
      {
        type: 'password_reset',
        targetHours: 2,
        priority: 'critical',
        escalationLevels: [1, 1.5] // 50%, 75%の時点でエスカレーション
      },
      {
        type: 'group_access',
        targetHours: 8,
        priority: 'medium',
        escalationLevels: [4, 6]
      },
      {
        type: 'software_install',
        targetHours: 24,
        priority: 'low',
        escalationLevels: [12, 18]
      },
      {
        type: 'general',
        targetHours: 24,
        priority: 'medium',
        escalationLevels: [12, 18]
      }
    ];

    defaultSLAs.forEach(sla => {
      this.slaDefinitions.set(sla.type, sla);
    });
  }

  /**
   * SLA監視開始
   */
  startSLAMonitoring() {
    // 5分間隔でSLA監視実行
    setInterval(() => {
      this.checkSLACompliance();
    }, 5 * 60 * 1000);

    // 1時間間隔でSLA統計更新
    setInterval(() => {
      this.updateSLAStatistics();
    }, 60 * 60 * 1000);

    logger.info('SLA monitoring started');
  }

  /**
   * サービス要求にSLA設定
   */
  async applySLA(requestId, requestType, createdAt) {
    const slaDefinition = this.slaDefinitions.get(requestType) || 
                         this.slaDefinitions.get('general');
    
    const targetDate = new Date(createdAt);
    targetDate.setHours(targetDate.getHours() + slaDefinition.targetHours);

    const slaRecord = {
      requestId,
      requestType,
      targetHours: slaDefinition.targetHours,
      targetDate: targetDate.toISOString(),
      priority: slaDefinition.priority,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    // SLA記録をデータベースに保存
    await this.saveSLARecord(slaRecord);
    
    // 監視リストに追加
    this.activeMonitors.set(requestId, {
      ...slaRecord,
      escalationLevels: slaDefinition.escalationLevels,
      escalationTriggered: []
    });

    logger.info(`SLA applied to request ${requestId}`, slaRecord);
    return slaRecord;
  }

  /**
   * SLA記録保存
   */
  async saveSLARecord(slaRecord) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO service_request_slas 
        (request_id, request_type, target_hours, target_date, priority, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(query, [
        slaRecord.requestId,
        slaRecord.requestType,
        slaRecord.targetHours,
        slaRecord.targetDate,
        slaRecord.priority,
        slaRecord.status,
        slaRecord.createdAt
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  /**
   * SLA遵守チェック
   */
  async checkSLACompliance() {
    const now = new Date();
    const alerts = [];

    for (const [requestId, monitor] of this.activeMonitors) {
      const targetDate = new Date(monitor.targetDate);
      const elapsedTime = now - new Date(monitor.createdAt);
      const totalTime = targetDate - new Date(monitor.createdAt);
      const progressRatio = elapsedTime / totalTime;

      // SLA違反チェック
      if (now > targetDate) {
        await this.handleSLAViolation(requestId, monitor);
        continue;
      }

      // エスカレーションチェック
      for (const escalationLevel of monitor.escalationLevels) {
        const escalationRatio = escalationLevel / monitor.targetHours;
        
        if (progressRatio >= escalationRatio && 
            !monitor.escalationTriggered.includes(escalationLevel)) {
          
          await this.triggerEscalation(requestId, monitor, escalationLevel);
          monitor.escalationTriggered.push(escalationLevel);
        }
      }

      // アラートレベルチェック
      if (progressRatio >= this.alertThresholds.critical) {
        alerts.push({
          type: 'SLA_CRITICAL',
          requestId,
          progressRatio,
          timeRemaining: targetDate - now,
          priority: monitor.priority
        });
      } else if (progressRatio >= this.alertThresholds.warning) {
        alerts.push({
          type: 'SLA_WARNING',
          requestId,
          progressRatio,
          timeRemaining: targetDate - now,
          priority: monitor.priority
        });
      }
    }

    // アラート送信
    if (alerts.length > 0) {
      await this.sendSLAAlerts(alerts);
    }
  }

  /**
   * SLA違反処理
   */
  async handleSLAViolation(requestId, monitor) {
    logger.error(`SLA violation detected`, {
      requestId,
      requestType: monitor.requestType,
      targetDate: monitor.targetDate,
      priority: monitor.priority
    });

    // SLA状態更新
    monitor.status = 'violated';
    await this.updateSLAStatus(requestId, 'violated');

    // アラート送信
    await this.sendSLAViolationAlert(requestId, monitor);

    // 監視リストから削除
    this.activeMonitors.delete(requestId);
  }

  /**
   * エスカレーション実行
   */
  async triggerEscalation(requestId, monitor, escalationLevel) {
    logger.warn(`SLA escalation triggered`, {
      requestId,
      escalationLevel,
      progressRatio: (escalationLevel / monitor.targetHours)
    });

    // エスカレーション記録保存
    await this.saveEscalationRecord(requestId, escalationLevel);

    // 管理者通知
    await this.notifyEscalation(requestId, monitor, escalationLevel);
  }

  /**
   * SLA完了処理
   */
  async completeSLA(requestId, completedAt) {
    const monitor = this.activeMonitors.get(requestId);
    if (!monitor) return;

    const targetDate = new Date(monitor.targetDate);
    const completionDate = new Date(completedAt);
    const isOnTime = completionDate <= targetDate;

    // SLA状態更新
    const status = isOnTime ? 'met' : 'violated';
    await this.updateSLAStatus(requestId, status);

    // 完了時間記録
    await this.recordSLACompletion(requestId, completedAt, isOnTime);

    logger.info(`SLA completed`, {
      requestId,
      status,
      completedAt,
      isOnTime,
      targetDate: monitor.targetDate
    });

    // 監視リストから削除
    this.activeMonitors.delete(requestId);
  }

  /**
   * SLA統計更新
   */
  async updateSLAStatistics() {
    try {
      const stats = await this.calculateSLAStatistics();
      logger.info('SLA statistics updated', stats);
      
      // 統計データを保存（レポート用）
      await this.saveSLAStatistics(stats);
    } catch (error) {
      logger.error('Failed to update SLA statistics', { error: error.message });
    }
  }

  /**
   * SLA統計計算
   */
  async calculateSLAStatistics() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          request_type,
          COUNT(*) as total_requests,
          SUM(CASE WHEN status = 'met' THEN 1 ELSE 0 END) as met_count,
          SUM(CASE WHEN status = 'violated' THEN 1 ELSE 0 END) as violated_count,
          AVG(target_hours) as avg_target_hours
        FROM service_request_slas 
        WHERE created_at >= datetime('now', '-30 days')
        GROUP BY request_type
      `;

      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const stats = rows.map(row => ({
            requestType: row.request_type,
            totalRequests: row.total_requests,
            metCount: row.met_count,
            violatedCount: row.violated_count,
            complianceRate: ((row.met_count / row.total_requests) * 100).toFixed(2),
            avgTargetHours: row.avg_target_hours
          }));
          resolve(stats);
        }
      });
    });
  }

  /**
   * SLA状態更新
   */
  async updateSLAStatus(requestId, status) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE service_request_slas 
        SET status = ?, updated_at = datetime('now')
        WHERE request_id = ?
      `;
      
      this.db.run(query, [status, requestId], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  /**
   * SLAアラート送信
   */
  async sendSLAAlerts(alerts) {
    for (const alert of alerts) {
      logger.warn(`SLA alert: ${alert.type}`, alert);
      
      // TODO: 実際のアラート送信実装
      // - メール通知
      // - Slack通知
      // - Webhook通知
    }
  }

  /**
   * SLA違反アラート送信
   */
  async sendSLAViolationAlert(requestId, monitor) {
    logger.error('SLA violation alert', {
      requestId,
      requestType: monitor.requestType,
      priority: monitor.priority
    });

    // TODO: 緊急アラート送信実装
  }

  /**
   * エスカレーション通知
   */
  async notifyEscalation(requestId, monitor, escalationLevel) {
    logger.warn('SLA escalation notification', {
      requestId,
      escalationLevel,
      requestType: monitor.requestType
    });

    // TODO: エスカレーション通知実装
  }

  /**
   * SLA情報取得
   */
  getSLAInfo(requestId) {
    return this.activeMonitors.get(requestId) || null;
  }

  /**
   * アクティブなSLA監視一覧取得
   */
  getActiveSLAs() {
    return Array.from(this.activeMonitors.entries()).map(([requestId, monitor]) => ({
      requestId,
      ...monitor
    }));
  }
}

/**
 * SLAテーブル作成
 */
const createSLATables = (db) => {
  const createSLATable = `
    CREATE TABLE IF NOT EXISTS service_request_slas (
      sla_id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      request_type VARCHAR(50) NOT NULL,
      target_hours INTEGER NOT NULL,
      target_date DATETIME NOT NULL,
      priority VARCHAR(20) NOT NULL DEFAULT 'medium',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES service_requests(request_id)
    )
  `;

  const createEscalationTable = `
    CREATE TABLE IF NOT EXISTS sla_escalations (
      escalation_id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      escalation_level INTEGER NOT NULL,
      triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES service_requests(request_id)
    )
  `;

  const createStatsTable = `
    CREATE TABLE IF NOT EXISTS sla_statistics (
      stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_type VARCHAR(50) NOT NULL,
      total_requests INTEGER NOT NULL,
      met_count INTEGER NOT NULL,
      violated_count INTEGER NOT NULL,
      compliance_rate REAL NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.exec(createSLATable);
  db.exec(createEscalationTable);
  db.exec(createStatsTable);

  // インデックス作成
  db.exec('CREATE INDEX IF NOT EXISTS idx_sla_request_id ON service_request_slas(request_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_sla_status ON service_request_slas(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_sla_target_date ON service_request_slas(target_date)');
};

module.exports = {
  SLAManager,
  createSLATables
};