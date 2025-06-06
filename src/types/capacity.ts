export interface MonitoredResource {
  resource_id: string;
  name: string;
  type: ResourceType;
  current_usage: number;
  max_capacity: number;
  threshold_warning: number;
  threshold_critical: number;
  status: ResourceStatus;
  last_updated: string;
}

export type ResourceType = 'CPU' | 'Memory' | 'Storage' | 'Network' | 'Database';

export type ResourceStatus = 'Normal' | 'Warning' | 'Critical' | 'Unknown';

export interface CapacityQuickActionFormData {
  resourceType: ResourceType;
  action: 'scale_up' | 'scale_down' | 'alert' | 'report';
  value?: number;
  notes?: string;
}