import { ItemStatus } from './common';

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
  NEW = 'New',
  ANALYZING = 'Analyzing',
  CONTAINING = 'Containing',
  ERADICATING = 'Eradicating',
  RECOVERING = 'Recovering',
  POST_INCIDENT_REVIEW = 'Post-Incident Review',
  CLOSED = 'Closed'
}

export interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  status: SecurityIncidentStatus;
  severity: SecurityAlertSeverity;
  reportedBy: string;
  reportedAt: string;
  assignedTo?: string;
  attackVector?: string;
  affectedSystems?: string[];
  actionsTaken?: string;
  updatedAt: string;
}

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

// 組織・部門管理
export interface Department {
  id: string;
  name: string;
  code: string; // 部門コード（例: IT-001）
  parentId?: string; // 上位部門
  manager: string; // 部門責任者
  members: OrganizationMember[];
  emergencyContact: {
    phone: string;
    email: string;
    escalationPhone?: string; // エスカレーション用電話
  };
}

export interface OrganizationMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string; // 役職
  departmentId: string;
  isEmergencyContact: boolean; // 緊急連絡対象かどうか
  role: 'CSIRT' | 'IT_ADMIN' | 'SECURITY_OFFICER' | 'EXECUTIVE' | 'MANAGER' | 'STAFF';
  notificationPreferences: {
    sms: boolean;
    email: boolean;
    voiceCall: boolean;
  };
}

// ITサービス・システム管理
export interface ITService {
  id: string;
  name: string;
  category: 'Core_Business' | 'Infrastructure' | 'Supporting' | 'External';
  type: 'Application' | 'Database' | 'Network' | 'Security' | 'Monitoring';
  criticality: 'Critical' | 'High' | 'Medium' | 'Low';
  owner: string; // システム責任者
  technicalContact: string; // 技術担当者
  businessContact: string; // 業務担当者
  description: string;
  dependencies: string[]; // 依存システム
  accessControlMethods: ('EntraID' | 'LDAP' | 'Local_Auth' | 'SSO' | 'API_Key')[];
  monitoringEndpoints?: string[];
  maintenanceWindow?: string; // メンテナンス時間帯
}

// 緊急対応通知設定
export interface EmergencyNotificationSettings {
  id: string;
  incidentSeverity: SecurityAlertSeverity;
  notificationMethods: ('EMAIL' | 'SMS' | 'VOICE_CALL' | 'TEAMS' | 'SLACK')[];
  recipients: {
    departments: string[]; // 部門ID
    roles: string[]; // 役割
    individuals: string[]; // 個人ID
  };
  escalationRules: {
    timeToEscalate: number; // 分
    escalateTo: string[]; // エスカレーション先（役職・部門）
  };
  message: {
    template: string;
    customFields: Record<string, string>;
  };
}

// セキュリティレポート生成設定
export interface SecurityReport {
  id: string;
  title: string;
  type: 'vulnerability_summary' | 'incident_analysis' | 'security_metrics' | 'compliance_status' | 'risk_assessment' | 'executive_summary';
  generatedAt: string;
  generatedBy: string;
  period: {
    start: string;
    end: string;
  };
  audience: 'executive' | 'technical' | 'audit' | 'external';
  format: 'PDF' | 'Excel' | 'PowerPoint' | 'HTML';
  sections: {
    executiveSummary: boolean;
    vulnerabilityAnalysis: boolean;
    incidentSummary: boolean;
    complianceStatus: boolean;
    recommendations: boolean;
    appendices: boolean;
  };
  data: {
    vulnerabilities: Vulnerability[];
    incidents: SecurityIncident[];
    metrics: SecurityMetrics;
    compliance: ComplianceData;
  };
}

export interface SecurityMetrics {
  totalVulnerabilities: number;
  criticalVulnerabilities: number;
  averageRemediationTime: number; // 日数
  securityIncidents: number;
  meanTimeToDetection: number; // 分
  meanTimeToResponse: number; // 分
  complianceScore: number; // パーセンテージ
}

export interface ComplianceData {
  frameworks: {
    iso27001: { status: 'compliant' | 'partial' | 'non_compliant'; lastAudit: string; };
    sox: { status: 'compliant' | 'partial' | 'non_compliant'; lastAudit: string; };
    gdpr: { status: 'compliant' | 'partial' | 'non_compliant'; lastAudit: string; };
    pci_dss: { status: 'compliant' | 'partial' | 'non_compliant'; lastAudit: string; };
  };
  policies: {
    total: number;
    upToDate: number;
    needsReview: number;
  };
}

// アクセス権限停止要求
export interface AccessSuspensionRequest {
  id: string;
  targetUserId: string;
  targetUsername: string;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  severity: SecurityAlertSeverity;
  scope: {
    systems: string[]; // ITサービスID
    duration?: string; // 停止期間
    accessTypes: ('VPN' | 'Email' | 'File_Share' | 'Applications' | 'Admin_Rights')[];
  };
  approvals: {
    approvedBy: string;
    approvedAt: string;
    comments?: string;
  }[];
  status: 'Pending' | 'Approved' | 'Executed' | 'Rejected' | 'Expired';
  executedAt?: string;
  automationResult?: {
    success: boolean;
    failedSystems: string[];
    errorMessages: string[];
  };
}

// 脅威情報共有
export interface ThreatIntelligenceSharing {
  id: string;
  title: string;
  threatType: 'malware' | 'vulnerability' | 'phishing' | 'apt' | 'ddos' | 'data_breach' | 'social_engineering' | 'other';
  severity: SecurityAlertSeverity;
  description: string;
  source: string;
  referenceUrls: string[];
  indicators: {
    ips: string[];
    domains: string[];
    hashes: string[];
    emailAddresses: string[];
  };
  affectedSystems: string[];
  recommendedActions: string;
  sharedBy: string;
  sharedAt: string;
  recipients: {
    internal: {
      departments: string[];
      roles: string[];
      individuals: string[];
    };
    external: {
      partners: string[];
      authorities: string[];
      industryGroups: string[];
    };
  };
  distributionChannels: ('EMAIL' | 'PORTAL' | 'API' | 'THREAT_FEED')[];
  followUp: {
    required: boolean;
    deadline?: string;
    assignedTo?: string;
  };
}