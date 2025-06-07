export interface ServiceLevelAgreement {
  id: string;
  serviceName: string;
  metricName: string;
  metricDescription: string;
  targetValue: number;
  targetUnit: string;
  measurementWindow: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';
  status: SLAStatus;
  owner: string;
  currentPerformance?: number;
  performanceStatus?: 'Met' | 'At Risk' | 'Breached';
  lastReviewDate?: string;
  nextReviewDate?: string;
  historicalPerformance: Array<{
    date: string;
    value: number;
  }>;
  notes?: string;
}

export type SLAStatus = 'Active' | 'Draft' | 'Expired';

// バックエンドAPI用の型定義
export interface BackendSLA {
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
}