export enum ServiceHealthStatus {
  NORMAL = 'Normal',
  WARNING = 'Warning',
  CRITICAL = 'Critical',
  UNKNOWN = 'Unknown',
  MAINTENANCE = 'Maintenance'
}

export interface ServiceStatusItem {
  id: string;
  name: string;
  status: ServiceHealthStatus;
  lastChecked: string;
  description?: string;
}

export enum AlertSeverity {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
  INFO = 'Info'
}

export interface AlertItem {
  id: string;
  message: string;
  severity: AlertSeverity;
  timestamp: string;
  source?: string; 
  acknowledged?: boolean;
}