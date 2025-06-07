import { ItemStatus, Priority } from './common';

// Enhanced ChangeRequest interface that bridges frontend and backend
export interface ChangeRequest {
  // Core identity fields
  id: string;                    // Frontend expects 'id', backend uses 'change_id'
  change_id?: string;            // Backend field mapping
  
  // Basic information
  title: string;                 // Frontend expects 'title', backend uses 'subject'
  subject?: string;              // Backend field mapping
  description: string;           // Frontend expects 'description', backend uses 'detail'
  detail?: string;               // Backend field mapping
  
  // Status and priority
  status: ItemStatus;
  priority: Priority;
  
  // Request information
  requester: string;             // Frontend expects 'requester', backend uses 'requested_by'
  requested_by?: string;         // Backend field mapping
  requested_by_user_id?: number; // Backend database field
  assignedTo?: string;
  
  // Approval information
  approver?: string;             // Frontend field
  approved_by?: string;          // Backend field mapping
  approved_by_user_id?: number;  // Backend database field
  
  // Category and impact
  category: string;
  impact: 'Low' | 'Medium' | 'High';
  urgency: 'Medium' | 'Low' | 'High';
  risk: 'Low' | 'Medium' | 'High';
  
  // Type and level (backend fields)
  type?: 'Emergency' | 'Normal' | 'Standard';
  risk_level?: 'Low' | 'Medium' | 'High';
  impact_level?: 'Low' | 'Medium' | 'High';
  
  // Implementation details
  implementationPlan: string;    // Frontend field
  implementation_plan?: string;  // Backend field mapping
  backoutPlan: string;          // Frontend field
  backout_plan?: string;        // Backend field mapping
  testPlan?: string;            // Frontend field
  test_plan?: string;           // Backend field mapping
  businessImpact?: string;      // Frontend field
  business_impact?: string;     // Backend field mapping
  changeReason?: string;        // Frontend field
  change_reason?: string;       // Backend field mapping
  
  // Dates
  plannedStartDate: string;     // Frontend field
  scheduled_start_date?: string; // Backend field mapping
  plannedEndDate: string;       // Frontend field
  scheduled_end_date?: string;  // Backend field mapping
  actualStartDate?: string;     // Frontend field
  actual_start_date?: string;   // Backend field mapping
  actualEndDate?: string;       // Frontend field
  actual_end_date?: string;     // Backend field mapping
  deadline?: string;
  
  // Timestamps
  createdAt: string;            // Frontend expects 'createdAt'
  created_at?: string;          // Backend field mapping
  created_date?: string;        // Backend database field
  updatedAt: string;            // Frontend expects 'updatedAt'
  updated_at?: string;          // Backend field mapping
  updated_date?: string;        // Backend database field
  requestDate?: string;         // Frontend field
  request_date?: string;        // Backend field mapping
  approveDate?: string;         // Frontend field
  approve_date?: string;        // Backend field mapping
  
  // Implementation status
  implementationStatus?: string; // Backend field
  implementation_status?: string; // Backend field mapping
  
  // Review information
  postImplementationReview?: string; // Backend field
  post_implementation_review?: string; // Backend field mapping
  
  // User tracking (backend fields)
  created_by_user_id?: number;
  updated_by_user_id?: number;
  implemented_by_user_id?: number;
  
  // Additional backend fields from the enhanced API
  change_number?: string;
  requested_by_username?: string;
  requested_by_name?: string;
  approved_by_username?: string;
  approved_by_name?: string;
  implemented_by_username?: string;
  implemented_by_name?: string;
}

// Backend ChangeStatus - more comprehensive than frontend ItemStatus
export type ChangeStatus = 
  | 'Requested' 
  | 'Pending CAB'
  | 'Approved' 
  | 'Scheduled'
  | 'In Progress' 
  | 'Implemented'
  | 'Failed'
  | 'Rejected' 
  | 'Cancelled'
  | 'Closed';

// Change type for backend API
export type ChangeType = 'Emergency' | 'Normal' | 'Standard';

// Risk and impact levels
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type ImpactLevel = 'Low' | 'Medium' | 'High';