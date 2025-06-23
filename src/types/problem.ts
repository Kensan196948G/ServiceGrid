export interface Problem {
  id: string; // For frontend compatibility (maps to problem_id)
  problem_id?: number;
  problem_number?: string;
  title: string;
  description?: string;
  status: ProblemStatus;
  priority: Priority;
  category?: string;
  affected_service?: string;
  workaround?: string;
  root_cause?: string;
  root_cause_analysis?: string;
  permanent_solution?: string;
  solution?: string; // Alias for permanent_solution
  
  // User relationships
  reporter_user_id?: number;
  assignee_user_id?: number;
  resolver_user_id?: number;
  
  // Reporter/Assignee info (populated from joins)
  reportedBy?: string;
  assignedTo?: string;
  reporter_username?: string;
  reporter_name?: string;
  assignee_username?: string;
  assignee_name?: string;
  resolver_username?: string;
  resolver_name?: string;
  
  // Dates
  registered_date?: string;
  acknowledged_date?: string;
  resolved_date?: string;
  closed_date?: string;
  review_date?: string;
  createdAt: string; // Frontend format
  updatedAt: string; // Frontend format
  created_date?: string; // Backend format
  updated_date?: string; // Backend format
  
  // Frontend specific fields for compatibility
  relatedIncidents: string[];
  knownError: boolean;
  systemTargets?: string[];
  jvnNumbers?: string[];
  
  // Related incidents (populated from relationships)
  related_incidents?: Array<{
    incident_id: number;
    incident_number: string;
    title: string;
    status: string;
    priority: string;
    relationship_type: string;
  }>;
}

export type ProblemStatus = 'Logged' | 'In Progress' | 'Known Error' | 'Resolved' | 'Closed';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export type ProblemCategory = 'Hardware' | 'Software' | 'Network' | 'Database' | 'Security' | 'Performance' | 'Configuration' | 'Other';

export interface ProblemStats {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_category: Record<string, number>;
  daily_problems: Array<{ date: string; count: number }>;
  performance_metrics: {
    avg_acknowledgment_days: number;
    avg_resolution_days: number;
    avg_closure_days: number;
    known_errors: number;
    overdue_problems: number;
  };
}

export interface ProblemFilters {
  status?: string;
  priority?: string;
  category?: string;
  assignee?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface ProblemResponse {
  data: Problem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: ProblemFilters;
}