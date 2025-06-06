export interface Problem {
  problem_id: string;
  title: string;
  root_cause?: string;
  status: ProblemStatus;
  registered_date: string;
  closed_date?: string;
  created_at: string;
  updated_at: string;
  priority: Priority;
  affected_services?: string[];
}

export type ProblemStatus = 'Open' | 'Investigating' | 'Resolved' | 'Closed';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';