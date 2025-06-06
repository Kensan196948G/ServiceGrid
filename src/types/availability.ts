export enum ServiceImportance {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export enum CurrentServiceStatus {
  OPERATIONAL = 'Operational',
  DEGRADED = 'Degraded',
  PARTIAL_OUTAGE = 'Partial Outage',
  MAJOR_OUTAGE = 'Major Outage',
  MAINTENANCE = 'Maintenance',
  UNKNOWN = 'Unknown'
}

export interface HistoricalUptimeData {
  date: string;
  uptimePercentage: number;
}

export interface AvailabilityRecord {
  id: string;
  serviceId: string;
  serviceName: string;
  importance: ServiceImportance;
  currentStatus: CurrentServiceStatus;
  targetUptimePercentage: number;
  actualUptimePercentage?: number;
  totalDowntimeMinutes?: number;
  plannedDowntimeMinutes?: number;
  unplannedDowntimeMinutes?: number;
  numberOfOutages?: number;
  mtbfHours?: number;
  mttrHours?: number;
  lastIncidentId?: string;
  lastIncidentDate?: string;
  nextMaintenanceDate?: string;
  historicalUptime?: HistoricalUptimeData[];
  relatedSlaId?: string; 
  lastRefreshed: string; 
  notes?: string;
}