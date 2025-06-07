export interface ServiceRequest {
  id?: number;
  request_id?: number;
  request_number?: string;
  subject: string;
  detail: string;
  category?: string;
  subcategory?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Submitted' | 'Pending Approval' | 'Approved' | 'Rejected' | 'In Progress' | 'Fulfilled' | 'Cancelled';
  requested_item?: string;
  business_justification?: string;
  estimated_cost?: number;
  requested_delivery_date?: string;
  requester_user_id: number;
  requester_username?: string;
  requester_name?: string;
  approver_user_id?: number;
  approver_username?: string;
  approver_name?: string;
  fulfiller_user_id?: number;
  fulfiller_username?: string;
  fulfiller_name?: string;
  requested_date?: string;
  approved_date?: string;
  rejected_date?: string;
  completed_date?: string;
  rejection_reason?: string;
  fulfillment_notes?: string;
  created_by_user_id?: number;
  updated_by_user_id?: number;
  created_date: string;
  updated_date: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceRequestStats {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  daily_requests: Array<{ date: string; count: number }>;
  performance_metrics: {
    avg_approval_days: number;
    avg_fulfillment_days: number;
    avg_cost: number;
    total_cost: number;
  };
}

export interface ServiceRequestFilter {
  status?: string;
  category?: string;
  priority?: string;
  requester?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface ServiceRequestResponse {
  data: ServiceRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: ServiceRequestFilter;
}

export type ServiceRequestAction = 'approve' | 'reject';

export interface ServiceRequestApproval {
  action: ServiceRequestAction;
  rejection_reason?: string;
}

export interface ServiceRequestFulfillment {
  fulfillment_notes?: string;
}

export interface ServiceRequestTransition {
  new_status: ServiceRequest['status'];
  notes?: string;
}