import { ItemStatus } from './common';

export enum ComplianceAuditStatus {
  PLANNED = 'Planned',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  ON_HOLD = 'On Hold',
  CANCELLED = 'Cancelled'
}

export enum ComplianceAuditType {
  INTERNAL = 'Internal',
  EXTERNAL = 'External',
  CERTIFICATION = 'Certification'
}

export enum ComplianceRiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export enum ComplianceRiskStatus {
  OPEN = 'Open',
  MITIGATING = 'Mitigating',
  CLOSED = 'Closed',
  ACCEPTED = 'Accepted'
}

export interface ComplianceControl {
  id: string;
  controlId: string; 
  name: string;
  description: string;
  standard: 'ISO27001/27002' | '社内規定XYZ' | 'その他';
  category: string; 
  responsibleTeam?: string;
  status: ItemStatus;
  lastAuditDate?: string;
  nextAuditDate?: string;
  evidenceLinks?: string[]; 
  notes?: string;
  riskLevel?: ComplianceRiskLevel;
  capStatus?: ItemStatus;
}

export interface ComplianceAudit {
  id: string;
  auditName: string;
  standard: ComplianceControl['standard'];
  type: ComplianceAuditType;
  scheduledStartDate: string;
  scheduledEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: ComplianceAuditStatus;
  leadAuditor?: string;
  findingsCount?: number;
  openFindingsCount?: number;
  summaryUrl?: string;
}

export interface ComplianceRiskItem {
  id: string;
  riskDescription: string;
  relatedControlId?: string;
  relatedStandard?: ComplianceControl['standard'];
  likelihood: ComplianceRiskLevel;
  impact: ComplianceRiskLevel;
  overallRisk: ComplianceRiskLevel;
  mitigationPlan?: string;
  responsibleTeam?: string;
  status: ComplianceRiskStatus;
  dueDate?: string;
}