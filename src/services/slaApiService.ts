/**
 * SLA (Service Level Agreement) API Service
 * 
 * バックエンドのSLA管理APIと連携するサービス
 * フロントエンドとバックエンドの型変換を担当
 */

import { ServiceLevelAgreement } from '../types';
import { apiGet, apiPost, apiPut, apiDelete } from './apiUtils';

// バックエンドAPI用の型定義
interface BackendSLA {
  sla_id: number;
  service_name: string;
  metric_name: string;
  metric_type: 'Availability' | 'Performance' | 'Response Time' | 'Resolution Time' | 'Quality';
  target_value: number;
  actual_value?: number;
  unit?: string;
  measurement_period: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually';
  measurement_date: string;
  status: 'Met' | 'Breached' | 'At Risk' | 'Unknown';
  breach_reason?: string;
  corrective_action?: string;
  responsible_team?: string;
  created_date: string;
  updated_date: string;
  created_by_user_id?: number;
  achievement_percentage?: number;
  created_by_username?: string;
  created_by_name?: string;
  historical_data?: Array<{
    measurement_date: string;
    actual_value: number;
    target_value: number;
    status: string;
    achievement_percentage: number;
  }>;
}

interface BackendSLAResponse {
  data: BackendSLA[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters?: any;
}

interface BackendSLAStats {
  total: number;
  by_service: Record<string, number>;
  by_metric_type: Record<string, number>;
  by_status: Record<string, number>;
  by_measurement_period: Record<string, number>;
  daily_trends: Array<{
    date: string;
    count: number;
    avg_achievement: number;
  }>;
  performance_metrics: {
    overall_achievement_rate: number;
    breached_slas: number;
    at_risk_slas: number;
  };
  worst_performing_services: Array<{
    service_name: string;
    metric_type: string;
    avg_achievement: number;
  }>;
}

// バックエンドSLAをフロントエンド型に変換
const convertBackendToFrontend = (backendSla: BackendSLA): ServiceLevelAgreement => {
  // パフォーマンス状況の変換
  const getPerformanceStatus = (): ServiceLevelAgreement['performanceStatus'] => {
    if (!backendSla.actual_value) return undefined;
    
    switch (backendSla.status) {
      case 'Met': return 'Met';
      case 'At Risk': return 'At Risk';
      case 'Breached': return 'Breached';
      default: return undefined;
    }
  };

  // 履歴データの変換
  const historicalPerformance = backendSla.historical_data?.map(h => ({
    date: h.measurement_date,
    value: h.actual_value
  })) || [];

  return {
    id: backendSla.sla_id.toString(),
    serviceName: backendSla.service_name,
    metricName: backendSla.metric_name,
    metricDescription: `${backendSla.metric_type}メトリック - ${backendSla.service_name}の${backendSla.metric_name}`,
    targetValue: backendSla.target_value,
    targetUnit: backendSla.unit || '%',
    measurementWindow: backendSla.measurement_period as ServiceLevelAgreement['measurementWindow'],
    status: mapBackendStatusToFrontend(backendSla.status),
    owner: backendSla.responsible_team || backendSla.created_by_username || 'システム',
    currentPerformance: backendSla.actual_value,
    performanceStatus: getPerformanceStatus(),
    lastReviewDate: undefined, // バックエンドに対応するフィールドがない場合
    nextReviewDate: undefined, // バックエンドに対応するフィールドがない場合
    historicalPerformance,
    notes: backendSla.breach_reason || backendSla.corrective_action || ''
  };
};

// バックエンドのステータスをフロントエンドステータスにマッピング
const mapBackendStatusToFrontend = (backendStatus: string): ServiceLevelAgreement['status'] => {
  // バックエンドは測定状況、フロントエンドはSLA定義状況
  // とりあえず全てActiveとして扱う（実際の運用では異なるロジックが必要）
  return 'Active';
};

// フロントエンドSLAをバックエンド型に変換
const convertFrontendToBackend = (frontendSla: Partial<ServiceLevelAgreement>) => {
  return {
    service_name: frontendSla.serviceName || '',
    metric_name: frontendSla.metricName || '',
    metric_type: inferMetricType(frontendSla.metricName || '') as BackendSLA['metric_type'],
    target_value: frontendSla.targetValue || 0,
    actual_value: frontendSla.currentPerformance,
    unit: frontendSla.targetUnit,
    measurement_period: frontendSla.measurementWindow || 'Monthly',
    measurement_date: new Date().toISOString().split('T')[0], // 今日の日付
    responsible_team: frontendSla.owner,
    corrective_action: frontendSla.notes
  };
};

// メトリック名からメトリック種別を推測
const inferMetricType = (metricName: string): string => {
  if (metricName.includes('稼働率') || metricName.includes('可用性')) return 'Availability';
  if (metricName.includes('応答時間') || metricName.includes('レスポンス')) return 'Response Time';
  if (metricName.includes('解決時間') || metricName.includes('復旧時間')) return 'Resolution Time';
  if (metricName.includes('満足度') || metricName.includes('品質')) return 'Quality';
  return 'Performance';
};

/**
 * SLA一覧を取得
 */
export const getSLAs = async (): Promise<ServiceLevelAgreement[]> => {
  try {
    const response = await apiGet<BackendSLAResponse>('/api/slas?page=1&limit=100');

    return response.data.map(convertBackendToFrontend);
  } catch (error) {
    console.error('Failed to fetch SLAs:', error);
    throw new Error('SLAの取得に失敗しました');
  }
};

/**
 * SLA統計情報を取得
 */
export const getSLAStats = async () => {
  try {
    const stats = await apiGet<BackendSLAStats>('/api/slas/stats');
    return stats;
  } catch (error) {
    console.error('Failed to fetch SLA stats:', error);
    throw new Error('SLA統計情報の取得に失敗しました');
  }
};

/**
 * SLA詳細を取得
 */
export const getSLAById = async (id: string): Promise<ServiceLevelAgreement> => {
  try {
    const backendSla = await apiGet<BackendSLA>(`/api/slas/${id}`);
    return convertBackendToFrontend(backendSla);
  } catch (error) {
    console.error('Failed to fetch SLA by ID:', error);
    throw new Error('SLA詳細の取得に失敗しました');
  }
};

/**
 * 新しいSLAを作成
 */
export const createSLA = async (sla: Omit<ServiceLevelAgreement, 'id'>): Promise<ServiceLevelAgreement> => {
  try {
    const backendData = convertFrontendToBackend(sla);
    const response = await apiPost<{ data: BackendSLA }>('/api/slas', backendData);
    return convertBackendToFrontend(response.data);
  } catch (error) {
    console.error('Failed to create SLA:', error);
    throw new Error('SLAの作成に失敗しました');
  }
};

/**
 * SLAを更新
 */
export const updateSLA = async (id: string, sla: Partial<ServiceLevelAgreement>): Promise<void> => {
  try {
    const backendData = convertFrontendToBackend(sla);
    await apiPut(`/api/slas/${id}`, backendData);
  } catch (error) {
    console.error('Failed to update SLA:', error);
    throw new Error('SLAの更新に失敗しました');
  }
};

/**
 * SLAを削除
 */
export const deleteSLA = async (id: string): Promise<void> => {
  try {
    await apiDelete(`/api/slas/${id}`);
  } catch (error) {
    console.error('Failed to delete SLA:', error);
    throw new Error('SLAの削除に失敗しました');
  }
};

/**
 * SLAアラートを生成
 */
export const generateSLAAlerts = async (daysAhead = 7) => {
  try {
    const alerts = await apiGet(`/api/slas/alerts?days_ahead=${daysAhead}`);
    return alerts;
  } catch (error) {
    console.error('Failed to generate SLA alerts:', error);
    throw new Error('SLAアラートの生成に失敗しました');
  }
};

/**
 * SLAの一括更新
 */
export const bulkUpdateSLAs = async (updates: Array<{
  service_name: string;
  metric_type: string;
  actual_value: number;
  measurement_date: string;
}>) => {
  try {
    const result = await apiPost('/api/slas/bulk-update', { updates });
    return result;
  } catch (error) {
    console.error('Failed to bulk update SLAs:', error);
    throw new Error('SLAの一括更新に失敗しました');
  }
};

// 後方互換性のためのエクスポート
export const slaApiService = {
  getSLAs,
  getSLAStats,
  getSLAById,
  createSLA,
  updateSLA,
  deleteSLA,
  generateSLAAlerts,
  bulkUpdateSLAs
};

export default slaApiService;