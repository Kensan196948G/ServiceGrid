export interface AuditLog {
  log_id: string;
  event_type: string;
  event_time: string;
  user: string;
  detail: string;
  ip_address?: string;
  user_agent?: string;
  status: LogStatus;
}

export type LogStatus = 'Success' | 'Failed' | 'Warning';

export interface LogSourceStatus {
  id: string;
  source: string;
  systemName: string;
  status: 'Online' | 'Offline' | 'Error' | 'Delayed';
  last_update: string;
  lastLogReceived: string;
  event_count: number;
  collectionRate: number;
  missingLogsPercentage: number;
}

export interface LogStorageSummary {
  total_logs: number;
  storage_used: string;
  totalCapacityTB: number;
  usedCapacityTB: number;
  retention_period: number;
  oldest_log: string;
  newest_log: string;
}

export interface AuditLogQuickActionFormData {
  action: 'export' | 'archive' | 'cleanup' | 'alert';
  timeRange?: string;
  eventType?: string;
  format?: 'csv' | 'json' | 'pdf';
}