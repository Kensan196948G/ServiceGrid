
export enum UserRole {
  ADMIN = 'Admin',
  USER = 'User', 
  READ_ONLY = 'ReadOnly'
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  email?: string;
  department?: string; // Added for context
  title?: string;      // Added for context
}

export enum ItemStatus { // General status, might be refined or separated per module
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
  // Vulnerability Specific (can also be generic IT item status)
  IDENTIFIED = 'Identified',
  MITIGATED = 'Mitigated',
  // Compliance Specific
  COMPLIANT = 'Compliant',
  NON_COMPLIANT = 'Non-Compliant',
  IN_REVIEW = 'In Review',
  NOT_APPLICABLE = 'Not Applicable',
}

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Incident {
  id: string;
  title: string;
  description: string;
  reportedBy: string;
  assignedTo?: string;
  status: ItemStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  category: string; 
}

export interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  assignedTo?: string;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
  serviceType: string; 
}

export interface Asset {
  id: string;
  name: string;
  type: 'Hardware' | 'Software' | 'License' | 'Other';
  serialNumber?: string;
  purchaseDate?: string;
  warrantyEndDate?: string;
  assignedTo?: string;
  location?: string;
  status: 'In Use' | 'In Stock' | 'Retired' | 'Maintenance';
  manufacturer?: string;
  model?: string;
  licenseKey?: string; 
  expiryDate?: string; 
}

// --- Knowledge Management Specific Types ---
export enum KnowledgeArticleStatus {
  DRAFT = 'Draft',
  REVIEW_PENDING = 'Review Pending',
  APPROVED = 'Approved', // For internal approval before publishing
  PUBLISHED = 'Published',
  ARCHIVED = 'Archived', // Replaces "廃止"
  NEEDS_UPDATE = 'Needs Update',
}

export enum ConfidentialityLevel {
  PUBLIC = 'Public', // 公開（外部可）
  INTERNAL = 'Internal', // 社内限定
  CONFIDENTIAL = 'Confidential', // 部門限定など機密
  STRICTLY_CONFIDENTIAL = 'Strictly Confidential' // 役員限定など最高機密
}

export interface KnowledgeArticleAttachment {
  id: string;
  name: string;
  url: string; // Could be a data URL for mock, or a path
  type: string; // MIME type
  size: number; // bytes
}

export interface KnowledgeArticleComment {
  id: string;
  userId: string;
  username: string;
  text: string;
  date: string;
}

export interface KnowledgeArticleRating {
  userId: string;
  value: 1 | 2 | 3 | 4 | 5;
}

export interface KnowledgeArticleVersion {
  version: number;
  date: string;
  editorUserId: string;
  editorUsername: string;
  summary: string; // Summary of changes for this version
  reason?: string; // Reason for change
  contentSnapshot?: string; // Optional: Store full content snapshot for this version
}

export interface KnowledgeArticle {
  id: string; // ナレッジID/記事番号
  title: string; // タイトル/件名
  content: string;
  category: string; // カテゴリ分類
  tags: string[]; // キーワード・タグ
  createdAt: string; // 作成日時
  updatedAt: string; // 更新日時
  authorUserId: string; // 作成者ID
  authorUsername: string; // 作成者名
  lastUpdatedByUserId?: string; // 最終更新者ID
  lastUpdatedByUsername?: string; // 最終更新者名

  // ステータス・承認情報
  status: KnowledgeArticleStatus; // 公開状態
  approverUserId?: string; // 承認者ID
  approverUsername?: string; // 承認者名
  approvalDate?: string; // 承認日時
  expiryDate?: string; // 有効期限
  reviewDate?: string; // レビュー予定日

  // 権限・アクセス制御
  viewPermissions?: string[]; // Role IDs or specific user IDs/departments
  editPermissions?: string[]; // Role IDs or specific user IDs/departments
  targetAudience?: string[]; // Intended audience (e.g., "Sales Dept", "All Employees")
  confidentialityLevel?: ConfidentialityLevel; // 機密レベル

  // 関連情報・リンク
  relatedIncidents?: string[]; // IDs
  relatedProblems?: string[]; // IDs
  relatedChanges?: string[]; // IDs
  referenceUrls?: string[];
  attachments?: KnowledgeArticleAttachment[];
  relatedArticles?: string[]; // KnowledgeArticle IDs

  // 利用状況・評価
  viewCount?: number; // 参照回数
  ratings?: KnowledgeArticleRating[];
  averageRating?: number; // Calculated from ratings
  comments?: KnowledgeArticleComment[];

  // 変更履歴
  versionHistory?: KnowledgeArticleVersion[];
  currentVersion: number;
}


export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  details: string;
}

export interface GeminiChatResponse {
  text: string;
  sourceDocs?: { title: string; content: string }[]; 
}

export interface MicrosoftApiCredentials {
  clientId: string;
  tenantId: string;
  clientSecret?: string; 
}

// --- ITSM Module Specific Types ---

// Change Management
export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  requester: string;
  assignedTo?: string;
  status: ItemStatus;
  priority: Priority;
  category: string; // e.g., Server, Network, Application
  impact: 'Low' | 'Medium' | 'High';
  urgency: 'Low' | 'Medium' | 'High';
  risk: 'Low' | 'Medium' | 'High';
  implementationPlan: string;
  backoutPlan: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  createdAt: string;
  updatedAt: string;
  deadline?: string; 
}

// Release Management
export type ReleaseType = 'Major' | 'Minor' | 'Patch' | 'Emergency' | 'Maintenance';
export interface Release {
  id: string;
  version: string;
  title: string;
  description: string;
  status: ItemStatus; 
  releaseType?: ReleaseType;
  plannedDeploymentDate: string;
  actualDeploymentDate?: string;
  servicesAffected: string[];
  rolloutPlan: string;
  rollbackPlan?: string;
  testLead?: string;
  deploymentLead?: string;
  createdAt: string;
  updatedAt: string;
}

// Problem Management
export interface Problem {
  id: string;
  title: string;
  description: string;
  status: ItemStatus; 
  priority: Priority;
  reportedBy: string; 
  assignedTo?: string;
  relatedIncidents: string[]; 
  rootCauseAnalysis?: string;
  workaround?: string;
  solution?: string;
  knownError: boolean; 
  createdAt: string;
  updatedAt: string;
}

// Service Level Management
export interface ServiceLevelAgreement {
  id: string;
  serviceName: string;
  metricName: string;
  metricDescription: string;
  targetValue: number;
  targetUnit: '%' | 'hours' | 'minutes' | 'ms' | 'count'; // Added 'ms' for response time
  measurementWindow: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';
  status: 'Active' | 'Draft' | 'Expired'; 
  owner: string;
  lastReviewDate?: string;
  nextReviewDate?: string;
  currentPerformance?: number; 
  performanceStatus?: 'Met' | 'At Risk' | 'Breached';
  historicalPerformance?: { date: string; value: number }[]; // For trend analysis
  notes?: string; // For penalty/incentive info or other details
}

// Capacity Management
export interface MonitoredResource {
  id: string;
  resourceName: string;
  type: 'Server' | 'Database' | 'Network' | 'Storage' | 'Application Component';
  metric: 'CPU Utilization' | 'Memory Usage' | 'Disk Space' | 'Network I/O' | 'Transaction per Second';
  currentValue: number;
  unit: '%' | 'GB' | 'TB' | 'Mbps' | 'TPS';
  warningThreshold: number;
  criticalThreshold: number;
  lastChecked: string;
  trend?: 'Stable' | 'Increasing' | 'Decreasing'; 
  notes?: string;
  historicalData?: { date: string; value: number }[]; // For trend analysis
}

export interface CapacityQuickActionFormData {
  selectedResourceId?: string;
  requestedCapacity?: string; // e.g., "100GB Disk", "2 vCPU"
  justification?: string;
  newWarningThreshold?: number;
  newCriticalThreshold?: number;
  notificationRecipients?: string;
  reportType?: string; // e.g., 'monthly_usage', 'trend_forecast'
  reportPeriodStart?: string;
  reportPeriodEnd?: string;
  optimizationPlan?: string;
  emergencyJustification?: string;
  emergencyResources?: string;
  emergencyApproval?: string;
}


// --- Availability Management ---
export enum ServiceImportance {
  CRITICAL = 'Critical', // 最重要
  HIGH = 'High',         // 重要
  MEDIUM = 'Medium',       // 中程度
  LOW = 'Low'            // 低
}

export enum CurrentServiceStatus {
  OPERATIONAL = 'Operational',       // 稼働中
  DEGRADED = 'Degraded',           // 一部機能低下
  PARTIAL_OUTAGE = 'Partial Outage', // 一部障害
  MAJOR_OUTAGE = 'Major Outage',     // 重大障害/全面停止
  MAINTENANCE = 'Maintenance',       // メンテナンス中
  UNKNOWN = 'Unknown'              // 不明
}

export interface HistoricalUptimeData {
  date: string; // e.g., 'YYYY-MM' or 'YYYY-MM-DD'
  uptimePercentage: number;
}

export interface AvailabilityRecord {
  id: string; // Unique ID for the record/service being monitored for availability
  serviceId: string; // ID of the service (could link to a service catalog)
  serviceName: string;
  importance: ServiceImportance;
  currentStatus: CurrentServiceStatus; // Real-time status
  
  targetUptimePercentage: number; // e.g., 99.9
  actualUptimePercentage?: number; // Calculated for the current reporting period (e.g., this month)
  
  totalDowntimeMinutes?: number;   // For current reporting period
  plannedDowntimeMinutes?: number; // For current reporting period
  unplannedDowntimeMinutes?: number; // Calculated: total - planned, for current period
  numberOfOutages?: number; // For current reporting period
  
  mtbfHours?: number; // Mean Time Between Failures (calculated over a longer period)
  mttrHours?: number; // Mean Time To Recover/Repair (calculated over a longer period)
  
  lastIncidentId?: string; // ID of the last significant incident affecting this service
  lastIncidentDate?: string;
  nextMaintenanceDate?: string;
  
  historicalUptime?: HistoricalUptimeData[]; // For trend charts e.g., last 12 months
  relatedSlaId?: string; 
  lastRefreshed: string; 
  notes?: string;
}

export interface AvailabilityQuickActionFormData {
  selectedServiceId?: string;
  procedureName?: string; // For emergency procedures
  reportType?: 'MonthlyAvailability' | 'OutageSummary' | 'TrendAnalysis';
  reportPeriodStart?: string;
  reportPeriodEnd?: string;
  incidentTitle?: string; // For new incident report
  incidentDescription?: string;
  maintenanceTitle?: string;
  maintenanceStart?: string;
  maintenanceEnd?: string;
  maintenanceServicesAffected?: string[];
  monitoringTarget?: string;
  monitoringMetric?: string;
  monitoringThreshold?: string;
}


// Security Management
export interface Vulnerability {
    id: string;
    cveId?: string; 
    title: string;
    description: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
    status: ItemStatus; 
    affectedAssets: string[]; 
    discoveredDate: string;
    reportedBy?: string;
    assignedTo?: string;
    remediationPlan?: string;
    dueDate?: string;
    updatedAt: string;
}

export enum SecurityAlertSeverity {
  INFO = 'Info',
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export interface SecurityAlert {
  id: string;
  timestamp: string;
  description: string;
  severity: SecurityAlertSeverity;
  source: string; // e.g., IDS, Firewall, SIEM
  status: 'New' | 'Acknowledged' | 'Investigating' | 'Resolved';
  assignedTo?: string;
  relatedVulnerabilityId?: string;
}

export enum SecurityIncidentStatus {
  NEW = 'New', // 新規
  ANALYZING = 'Analyzing', // 分析中
  CONTAINING = 'Containing', // 封じ込め中
  ERADICATING = 'Eradicating', // 根絶中
  RECOVERING = 'Recovering', // 復旧中
  POST_INCIDENT_REVIEW = 'Post-Incident Review', // 事後レビュー
  CLOSED = 'Closed' // クローズ
}

export interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  status: SecurityIncidentStatus;
  severity: SecurityAlertSeverity; // Can reuse AlertSeverity for incident impact
  reportedBy: string;
  reportedAt: string;
  assignedTo?: string;
  attackVector?: string; // e.g., Phishing, Malware, DDoS
  affectedSystems?: string[];
  actionsTaken?: string;
  updatedAt: string;
}

export interface SecurityQuickActionFormData {
  // For Incident Report
  incidentTitle?: string;
  incidentDescription?: string;
  incidentSeverity?: SecurityAlertSeverity;
  // For Report Generation
  reportType?: 'VulnerabilitySummary' | 'IncidentTrend' | 'ComplianceStatus';
  reportPeriodStart?: string;
  reportPeriodEnd?: string;
  // For Access Suspension
  accessSuspensionUser?: string;
  accessSuspensionReason?: string;
  // For Threat Sharing
  threatDescription?: string;
  threatSeverity?: SecurityAlertSeverity;
  threatRecipients?: string; // e.g., "All Staff", "IT Department"
}


// Compliance Management
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
    standard: 'ISO 27001' | 'PCI DSS' | 'GDPR' | '社内規定 XYZ' | 'その他';
    category: string; 
    responsibleTeam?: string;
    status: ItemStatus; // COMPLIANT, NON_COMPLIANT, IN_REVIEW, PENDING, NOT_APPLICABLE
    lastAuditDate?: string;
    nextAuditDate?: string;
    evidenceLinks?: string[]; 
    notes?: string;
    riskLevel?: ComplianceRiskLevel; // Optional: Associated risk if non-compliant
    capStatus?: ItemStatus; // Optional: Status of Corrective Action Plan
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
  findingsCount?: number; // Total findings
  openFindingsCount?: number; // Unresolved findings
  summaryUrl?: string; // Link to audit summary report
}

export interface ComplianceRiskItem {
  id: string;
  riskDescription: string;
  relatedControlId?: string; // Link to a specific non-compliant control
  relatedStandard?: ComplianceControl['standard'];
  likelihood: ComplianceRiskLevel; // Using RiskLevel for simplicity
  impact: ComplianceRiskLevel;    // Using RiskLevel for simplicity
  overallRisk: ComplianceRiskLevel; // Calculated or assessed
  mitigationPlan?: string;
  responsibleTeam?: string;
  status: ComplianceRiskStatus;
  dueDate?: string; // For mitigation
}

export interface ComplianceQuickActionFormData {
  // For Report Generation
  reportType?: 'OverallCompliance' | 'AuditSummary' | 'RiskAssessment';
  reportPeriodStart?: string;
  reportPeriodEnd?: string;
  // For CAP Creation
  capControlId?: string;
  capDescription?: string;
  capDueDate?: string;
  capAssignee?: string;
  // For Regulatory Impact Assessment
  regulationName?: string;
  regulationChangeSummary?: string;
  potentialImpact?: string;
}


// --- Dashboard Specific Types ---
export enum ServiceHealthStatus {
  NORMAL = 'Normal',
  WARNING = 'Warning',
  CRITICAL = 'Critical',
  UNKNOWN = 'Unknown',
  MAINTENANCE = 'Maintenance'
}

export interface ServiceStatusItem {
  id: string;
  name: string;
  status: ServiceHealthStatus;
  lastChecked: string;
  description?: string;
}

export enum AlertSeverity { // Re-declared for Dashboard use, if different from SecurityAlertSeverity (though they are same here)
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
  INFO = 'Info'
}

export interface AlertItem {
  id: string;
  message: string;
  severity: AlertSeverity;
  timestamp: string;
  source?: string; 
  acknowledged?: boolean;
}

// --- Audit Log Management Specific Types ---
export interface LogSourceStatus {
  id: string;
  systemName: string;
  collectionRate: number; // logs per second or similar
  status: 'Active' | 'Inactive' | 'Error' | 'Delayed';
  lastLogReceived: string;
  missingLogsPercentage?: number; // Optional
}

export interface LogStorageSummary {
  totalCapacityTB: number;
  usedCapacityTB: number;
  remainingRetentionDays: number;
  averageIngestRateMBps: number;
}

export interface AuditLogQuickActionFormData {
  logIds?: string[]; // For emergency preservation or investigation
  reason?: string; // For emergency stop or investigation start
  reportType?: 'AccessSummary' | 'PrivilegedActivity' | 'ComplianceEvidence';
  reportPeriodStart?: string;
  reportPeriodEnd?: string;
  investigationTarget?: string; // e.g., User ID, IP Address, System Name
}
