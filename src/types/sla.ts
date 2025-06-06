export interface ServiceLevelAgreement {
  sla_id: string;
  service_name: string;
  target_uptime: number;
  actual_uptime?: number;
  response_time_target: number;
  actual_response_time?: number;
  status: SLAStatus;
  created_at: string;
  updated_at: string;
}

export type SLAStatus = 'Active' | 'Inactive' | 'Breach' | 'Review';