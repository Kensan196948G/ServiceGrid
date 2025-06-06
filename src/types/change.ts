export interface ChangeRequest {
  change_id: string;
  subject: string;
  detail: string;
  status: ChangeStatus;
  requested_by: string;
  approved_by?: string;
  request_date: string;
  approve_date?: string;
  created_at: string;
  updated_at: string;
}

export type ChangeStatus = 'Requested' | 'Approved' | 'In Progress' | 'Completed' | 'Rejected' | 'Cancelled';