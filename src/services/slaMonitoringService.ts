/**
 * SLA Monitoring and Compliance Service
 * 
 * SLAの監視、コンプライアンス追跡、レポート生成機能を提供
 */

import { ServiceLevelAgreement } from '../types';
import { getSLAs, getSLAStats, generateSLAAlerts } from './slaApiService';

export interface SLAComplianceReport {
  period: string;
  overallAchievement: number;
  totalSLAs: number;
  metSLAs: number;
  breachedSLAs: number;
  atRiskSLAs: number;
  serviceBreakdown: Array<{
    serviceName: string;
    achievementRate: number;
    status: 'compliant' | 'at-risk' | 'non-compliant';
  }>;
  trends: Array<{
    date: string;
    achievementRate: number;
    breachCount: number;
  }>;
}

export interface SLAAlert {
  id: string;
  type: 'breach' | 'at-risk' | 'measurement-due';
  severity: 'critical' | 'high' | 'medium' | 'low';
  serviceName: string;
  metricName: string;
  message: string;
  currentValue?: number;
  targetValue: number;
  unit: string;
  createdAt: string;
  dueDate?: string;
}

export interface SLATrend {
  serviceName: string;
  metricName: string;
  trend: 'improving' | 'stable' | 'declining';
  trendPercentage: number;
  recommendation: string;
}

/**
 * SLAコンプライアンスレポートを生成
 */
export const generateComplianceReport = async (
  startDate: string, 
  endDate: string
): Promise<SLAComplianceReport> => {
  try {
    const slas = await getSLAs();
    const stats = await getSLAStats();

    // 期間内のSLAフィルタリング（実際の実装では日付フィルタリングが必要）
    const activeSLAs = slas.filter(sla => sla.status === 'Active');
    
    // 達成率計算
    const metSLAs = activeSLAs.filter(sla => sla.performanceStatus === 'Met').length;
    const breachedSLAs = activeSLAs.filter(sla => sla.performanceStatus === 'Breached').length;
    const atRiskSLAs = activeSLAs.filter(sla => sla.performanceStatus === 'At Risk').length;
    
    const overallAchievement = activeSLAs.length > 0 
      ? Math.round((metSLAs / activeSLAs.length) * 100)
      : 0;

    // サービス別内訳生成
    const serviceGroups = groupSLAsByService(activeSLAs);
    const serviceBreakdown = Object.entries(serviceGroups).map(([serviceName, slas]) => {
      const serviceMet = slas.filter(sla => sla.performanceStatus === 'Met').length;
      const achievementRate = Math.round((serviceMet / slas.length) * 100);
      
      let status: 'compliant' | 'at-risk' | 'non-compliant' = 'compliant';
      if (achievementRate < 80) status = 'non-compliant';
      else if (achievementRate < 95) status = 'at-risk';
      
      return {
        serviceName,
        achievementRate,
        status
      };
    });

    // トレンドデータ生成（モックデータ - 実際の実装では履歴データを使用）
    const trends = generateTrendData(startDate, endDate);

    return {
      period: `${startDate} - ${endDate}`,
      overallAchievement,
      totalSLAs: activeSLAs.length,
      metSLAs,
      breachedSLAs,
      atRiskSLAs,
      serviceBreakdown,
      trends
    };
  } catch (error) {
    console.error('Failed to generate compliance report:', error);
    throw new Error('コンプライアンスレポートの生成に失敗しました');
  }
};

/**
 * SLAアラートを取得・分析
 */
export const getSLAAlerts = async (daysAhead = 7): Promise<SLAAlert[]> => {
  try {
    const alertData = await generateSLAAlerts(daysAhead);
    
    return alertData.alerts.map((alert: any) => ({
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: alert.alert_type,
      severity: mapAlertPriority(alert.priority),
      serviceName: alert.service_name,
      metricName: alert.metric_name,
      message: alert.message,
      currentValue: alert.actual_value,
      targetValue: alert.target_value,
      unit: alert.unit || '',
      createdAt: new Date().toISOString(),
      dueDate: alert.next_measurement_due
    }));
  } catch (error) {
    console.error('Failed to get SLA alerts:', error);
    throw new Error('SLAアラートの取得に失敗しました');
  }
};

/**
 * SLAトレンド分析
 */
export const analyzeSLATrends = async (): Promise<SLATrend[]> => {
  try {
    const slas = await getSLAs();
    
    return slas
      .filter(sla => sla.historicalPerformance.length >= 2)
      .map(sla => {
        const trend = calculateTrend(sla.historicalPerformance);
        const recommendation = generateTrendRecommendation(sla, trend);
        
        return {
          serviceName: sla.serviceName,
          metricName: sla.metricName,
          trend: trend.direction,
          trendPercentage: trend.percentage,
          recommendation
        };
      });
  } catch (error) {
    console.error('Failed to analyze SLA trends:', error);
    throw new Error('SLAトレンド分析に失敗しました');
  }
};

/**
 * SLAパフォーマンス予測
 */
export const predictSLAPerformance = async (
  slaId: string, 
  forecastDays = 30
): Promise<{
  predicted_values: Array<{ date: string; value: number; confidence: number }>;
  risk_assessment: 'low' | 'medium' | 'high';
  recommendations: string[];
}> => {
  try {
    const slas = await getSLAs();
    const sla = slas.find(s => s.id === slaId);
    
    if (!sla || sla.historicalPerformance.length < 3) {
      throw new Error('予測に十分な履歴データがありません');
    }

    // 簡単な線形予測（実際の実装では機械学習モデルを使用）
    const predictions = generatePredictions(sla.historicalPerformance, forecastDays);
    const riskAssessment = assessPredictionRisk(predictions, sla.targetValue);
    const recommendations = generatePredictionRecommendations(riskAssessment, sla);

    return {
      predicted_values: predictions,
      risk_assessment: riskAssessment,
      recommendations
    };
  } catch (error) {
    console.error('Failed to predict SLA performance:', error);
    throw new Error('SLAパフォーマンス予測に失敗しました');
  }
};

/**
 * SLAダッシュボードデータ生成
 */
export const getSLADashboardData = async () => {
  try {
    const [slas, stats, alerts] = await Promise.all([
      getSLAs(),
      getSLAStats(),
      getSLAAlerts(7)
    ]);

    const activeSLAs = slas.filter(sla => sla.status === 'Active');
    const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
    
    return {
      summary: {
        totalSLAs: activeSLAs.length,
        achievementRate: stats.performance_metrics.overall_achievement_rate,
        breachedSLAs: stats.performance_metrics.breached_slas,
        atRiskSLAs: stats.performance_metrics.at_risk_slas,
        criticalAlerts: criticalAlerts.length
      },
      recentBreaches: slas
        .filter(sla => sla.performanceStatus === 'Breached')
        .slice(0, 5),
      upcomingMeasurements: alerts
        .filter(alert => alert.type === 'measurement-due')
        .slice(0, 5),
      topPerformers: activeSLAs
        .filter(sla => sla.currentPerformance && sla.performanceStatus === 'Met')
        .sort((a, b) => (b.currentPerformance || 0) - (a.currentPerformance || 0))
        .slice(0, 5)
    };
  } catch (error) {
    console.error('Failed to get SLA dashboard data:', error);
    throw new Error('SLAダッシュボードデータの取得に失敗しました');
  }
};

// ユーティリティ関数

function groupSLAsByService(slas: ServiceLevelAgreement[]) {
  return slas.reduce((groups, sla) => {
    const key = sla.serviceName;
    if (!groups[key]) groups[key] = [];
    groups[key].push(sla);
    return groups;
  }, {} as Record<string, ServiceLevelAgreement[]>);
}

function mapAlertPriority(priority: string): 'critical' | 'high' | 'medium' | 'low' {
  switch (priority.toLowerCase()) {
    case 'critical': return 'critical';
    case 'high': return 'high';
    case 'medium': return 'medium';
    default: return 'low';
  }
}

function calculateTrend(data: Array<{ date: string; value: number }>) {
  if (data.length < 2) return { direction: 'stable' as const, percentage: 0 };
  
  const recent = data.slice(-3); // 最近3件
  const older = data.slice(-6, -3); // その前の3件
  
  if (older.length === 0) return { direction: 'stable' as const, percentage: 0 };
  
  const recentAvg = recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
  const olderAvg = older.reduce((sum, d) => sum + d.value, 0) / older.length;
  
  const change = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  let direction: 'improving' | 'stable' | 'declining' = 'stable';
  if (Math.abs(change) > 2) {
    direction = change > 0 ? 'improving' : 'declining';
  }
  
  return { direction, percentage: Math.abs(change) };
}

function generateTrendRecommendation(sla: ServiceLevelAgreement, trend: any): string {
  if (trend.direction === 'declining') {
    return `${sla.serviceName}の${sla.metricName}が低下傾向にあります。原因調査と改善策の検討が必要です。`;
  } else if (trend.direction === 'improving') {
    return `${sla.serviceName}の${sla.metricName}が改善傾向にあります。現在の取り組みを継続してください。`;
  }
  return `${sla.serviceName}の${sla.metricName}は安定しています。定期的な監視を継続してください。`;
}

function generateTrendData(startDate: string, endDate: string) {
  // モックトレンドデータ生成（実際の実装では実データを使用）
  const trends = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  for (let i = 0; i < Math.min(days, 30); i += Math.ceil(days / 10)) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    
    trends.push({
      date: date.toISOString().split('T')[0],
      achievementRate: Math.round(85 + Math.random() * 15),
      breachCount: Math.floor(Math.random() * 3)
    });
  }
  
  return trends;
}

function generatePredictions(
  historical: Array<{ date: string; value: number }>, 
  days: number
) {
  const predictions = [];
  const lastValue = historical[historical.length - 1].value;
  const trend = calculateTrend(historical);
  
  for (let i = 1; i <= days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    // 簡単な線形予測
    const variation = (Math.random() - 0.5) * 2; // ±1の変動
    const trendFactor = trend.direction === 'improving' ? 0.1 : 
                       trend.direction === 'declining' ? -0.1 : 0;
    
    const predictedValue = lastValue + (trendFactor * i) + variation;
    const confidence = Math.max(0.5, 1 - (i / days) * 0.5); // 時間が経つほど信頼度低下
    
    predictions.push({
      date: date.toISOString().split('T')[0],
      value: Math.max(0, predictedValue),
      confidence: Math.round(confidence * 100) / 100
    });
  }
  
  return predictions;
}

function assessPredictionRisk(
  predictions: Array<{ value: number }>, 
  targetValue: number
): 'low' | 'medium' | 'high' {
  const belowTargetCount = predictions.filter(p => p.value < targetValue).length;
  const riskRatio = belowTargetCount / predictions.length;
  
  if (riskRatio > 0.7) return 'high';
  if (riskRatio > 0.3) return 'medium';
  return 'low';
}

function generatePredictionRecommendations(
  risk: 'low' | 'medium' | 'high',
  sla: ServiceLevelAgreement
): string[] {
  const recommendations = [];
  
  switch (risk) {
    case 'high':
      recommendations.push(`${sla.serviceName}のSLA違反リスクが高いです。緊急の対策が必要です。`);
      recommendations.push('リソースの追加配分を検討してください。');
      recommendations.push('監視アラートの閾値を下げることを推奨します。');
      break;
    case 'medium':
      recommendations.push(`${sla.serviceName}のパフォーマンスに注意が必要です。`);
      recommendations.push('予防的なメンテナンスを計画してください。');
      break;
    case 'low':
      recommendations.push(`${sla.serviceName}のパフォーマンスは良好です。`);
      recommendations.push('現在の運用を継続してください。');
      break;
  }
  
  return recommendations;
}

export const slaMonitoringService = {
  generateComplianceReport,
  getSLAAlerts,
  analyzeSLATrends,
  predictSLAPerformance,
  getSLADashboardData
};