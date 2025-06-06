export enum ItemStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved',
  CLOSED = 'Closed',
  PENDING = 'Pending', 
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  NEW = 'New',
  // Change Management Specific
  PENDING_APPROVAL = 'Pending Approval',
  SCHEDULED = 'Scheduled',
  IMPLEMENTED = 'Implemented',
  // Release Management Specific
  PLANNED = 'Planned',
  BUILDING = 'Building',
  TESTING = 'Testing',
  DEPLOYED = 'Deployed',
  ROLLED_BACK = 'Rolled Back',
  // Problem Management Specific
  ANALYSIS = 'Analysis',
  SOLUTION_PROPOSED = 'Solution Proposed',
  // Vulnerability Specific
  IDENTIFIED = 'Identified',
  MITIGATED = 'Mitigated',
  // Compliance Specific
  COMPLIANT = 'Compliant',
  NON_COMPLIANT = 'Non-Compliant',
  IN_REVIEW = 'In Review',
  NOT_APPLICABLE = 'Not Applicable',
}

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  details: string;
}