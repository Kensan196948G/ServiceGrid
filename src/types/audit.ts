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
  source: string;
  status: 'Online' | 'Offline' | 'Error';
  last_update: string;
  event_count: number;
}

export interface LogStorageSummary {
  total_logs: number;
  storage_used: string;
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