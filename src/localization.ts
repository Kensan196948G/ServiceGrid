
import { 
  ItemStatus, UserRole, Asset, Priority, ServiceHealthStatus, AlertSeverity as DashboardAlertSeverity, ReleaseType, 
  KnowledgeArticleStatus, ConfidentialityLevel, ServiceImportance, CurrentServiceStatus,
  SecurityAlertSeverity, SecurityIncidentStatus,
  ComplianceAuditStatus, ComplianceAuditType, ComplianceRiskLevel, ComplianceRiskStatus // Added new types
} from './types';

export const userRoleToJapanese = (role: UserRole): string => {
  switch (role) {
    case UserRole.ADMIN: return '管理者';
    case UserRole.USER: return 'ユーザー';
    case UserRole.READ_ONLY: return '閲覧専用';
    default: return role;
  }
};

export const itemStatusToJapanese = (status: ItemStatus): string => {
  switch (status) {
    case ItemStatus.OPEN: return 'オープン';
    case ItemStatus.IN_PROGRESS: return '対応中';
    case ItemStatus.RESOLVED: return '解決済み';
    case ItemStatus.CLOSED: return 'クローズ';
    case ItemStatus.PENDING: return '保留中';
    case ItemStatus.APPROVED: return '承認済み';
    case ItemStatus.REJECTED: return '却下済み';
    case ItemStatus.NEW: return '新規';
    case ItemStatus.PENDING_APPROVAL: return '承認待ち';
    case ItemStatus.SCHEDULED: return '計画済み'; // Can be used for Releases too
    case ItemStatus.IMPLEMENTED: return '実施済み'; // Can be used for Changes
    case ItemStatus.PLANNED: return '計画中'; // Specifically for Releases
    case ItemStatus.BUILDING: return '構築中';
    case ItemStatus.TESTING: return 'テスト中';
    case ItemStatus.DEPLOYED: return '展開済み';
    case ItemStatus.ROLLED_BACK: return 'ロールバック済み';
    case ItemStatus.ANALYSIS: return '分析中';
    case ItemStatus.SOLUTION_PROPOSED: return '解決策提案済み';
    case ItemStatus.IDENTIFIED: return '特定済み';
    case ItemStatus.MITIGATED: return '軽減済み';
    case ItemStatus.COMPLIANT: return '準拠';
    case ItemStatus.NON_COMPLIANT: return '非準拠';
    case ItemStatus.IN_REVIEW: return 'レビュー中';
    case ItemStatus.NOT_APPLICABLE: return '非該当';
    default: return status;
  }
};

export const assetTypeToJapanese = (type: Asset['type']): string => {
  switch (type) {
    case 'Server': return 'サーバー';
    case 'Desktop': return 'デスクトップPC';
    case 'Laptop': return 'ノートPC';
    case 'Tablet': return 'タブレット';
    case 'Phone': return 'スマートフォン';
    case 'Network Equipment': return 'ネットワーク機器';
    case 'Storage': return 'ストレージ';
    case 'Printer': return 'プリンター';
    case 'Monitor': return 'モニター';
    case 'Peripheral': return '周辺機器';
    case 'Software': return 'ソフトウェア';
    case 'License': return 'ライセンス';
    case 'Virtual Machine': return '仮想マシン';
    case 'Cloud Service': return 'クラウドサービス';
    case 'Other': return 'その他';
    default: return type;
  }
};

export const assetStatusToJapanese = (status: Asset['status']): string => {
  switch (status) {
    case 'Active': return 'アクティブ';
    case 'Inactive': return '非アクティブ';
    case 'Maintenance': return 'メンテナンス中';
    case 'Retired': return '廃棄済み';
    default: return status;
  }
};

export const priorityToJapanese = (priority: Priority): string => {
  switch (priority) {
    case 'Low': return '低';
    case 'Medium': return '中';
    case 'High': return '高';
    case 'Critical': return 'クリティカル';
    default: return priority;
  }
};

// Specific for Change Request Impact/Urgency/Risk
export const impactUrgencyRiskToJapanese = (level: 'Low' | 'Medium' | 'High'): string => {
  switch (level) {
    case 'Low': return '低';
    case 'Medium': return '中';
    case 'High': return '高';
    default: return level;
  }
};

// Specific for Vulnerability Severity
export const vulnerabilitySeverityToJapanese = (severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational'): string => {
  switch (severity) {
    case 'Critical': return 'クリティカル';
    case 'High': return '高';
    case 'Medium': return '中';
    case 'Low': return '低';
    case 'Informational': return '情報';
    default: return severity;
  }
};

export const slaStatusToJapanese = (status: 'Active' | 'Draft' | 'Expired'): string => {
    switch (status) {
        case 'Active': return '有効';
        case 'Draft': return 'ドラフト';
        case 'Expired': return '期限切れ';
        default: return status;
    }
};

export const slaPerformanceStatusToJapanese = (status?: 'Met' | 'At Risk' | 'Breached'): string => {
    if (!status) return '未測定';
    switch (status) {
        case 'Met': return '達成';
        case 'At Risk': return 'リスクあり';
        case 'Breached': return '未達成';
        default: return status;
    }
};

export const capacityTrendToJapanese = (trend?: 'Stable' | 'Increasing' | 'Decreasing'): string => {
    if (!trend) return '不明';
    switch (trend) {
        case 'Stable': return '安定';
        case 'Increasing': return '増加傾向';
        case 'Decreasing': return '減少傾向';
        default: return trend;
    }
};

export const monitoredResourceTypeToJapanese = (type: 'Server' | 'Database' | 'Network' | 'Storage' | 'Application Component'): string => {
    switch (type) {
        case 'Server': return 'サーバー';
        case 'Database': return 'データベース';
        case 'Network': return 'ネットワーク';
        case 'Storage': return 'ストレージ';
        case 'Application Component': return 'アプリケーションコンポーネント';
        default: return type;
    }
};

export const serviceHealthStatusToJapanese = (status: ServiceHealthStatus): string => {
  switch (status) {
    case ServiceHealthStatus.NORMAL: return '正常';
    case ServiceHealthStatus.WARNING: return '警告';
    case ServiceHealthStatus.CRITICAL: return '重大';
    case ServiceHealthStatus.MAINTENANCE: return 'メンテナンス中';
    case ServiceHealthStatus.UNKNOWN: return '不明';
    default: return status;
  }
};

export const alertSeverityToJapanese = (severity: DashboardAlertSeverity): string => {
  switch (severity) {
    case DashboardAlertSeverity.CRITICAL: return 'クリティカル';
    case DashboardAlertSeverity.HIGH: return '高';
    case DashboardAlertSeverity.MEDIUM: return '中';
    case DashboardAlertSeverity.LOW: return '低';
    case DashboardAlertSeverity.INFO: return '情報';
    default: return severity;
  }
};

export const releaseTypeToJapanese = (type?: ReleaseType): string => {
  if (!type) return '未分類';
  switch (type) {
    case 'Major': return 'メジャー';
    case 'Minor': return 'マイナー';
    case 'Patch': return 'パッチ';
    case 'Emergency': return '緊急';
    case 'Maintenance': return 'メンテナンス';
    default: return type;
  }
};

export const releaseTypeToIcon = (type?: ReleaseType): string => {
  if (!type) return '📦'; // Default box icon
  switch (type) {
    case 'Major': return '🚀'; // Rocket for major
    case 'Minor': return '✨'; // Sparkles for minor features
    case 'Patch': return '🩹'; // Band-aid for patch
    case 'Emergency': return '🚨'; // Police car light for emergency
    case 'Maintenance': return '🛠️'; // Hammer and wrench for maintenance
    default: return '📦';
  }
};

export const booleanToJapanese = (value: boolean): string => {
  return value ? 'はい' : 'いいえ';
};

export const knowledgeArticleStatusToJapanese = (status: KnowledgeArticleStatus): string => {
  switch (status) {
    case KnowledgeArticleStatus.DRAFT: return '下書き';
    case KnowledgeArticleStatus.REVIEW_PENDING: return 'レビュー中';
    case KnowledgeArticleStatus.APPROVED: return '承認済み';
    case KnowledgeArticleStatus.PUBLISHED: return '公開中';
    case KnowledgeArticleStatus.ARCHIVED: return 'アーカイブ済み';
    case KnowledgeArticleStatus.NEEDS_UPDATE: return '要更新';
    default: return status;
  }
};

export const confidentialityLevelToJapanese = (level: ConfidentialityLevel): string => {
  switch (level) {
    case ConfidentialityLevel.PUBLIC: return '公開';
    case ConfidentialityLevel.INTERNAL: return '社内限定';
    case ConfidentialityLevel.CONFIDENTIAL: return '機密';
    case ConfidentialityLevel.STRICTLY_CONFIDENTIAL: return '最高機密';
    default: return level;
  }
};

export const serviceImportanceToJapanese = (importance: ServiceImportance): string => {
  switch (importance) {
    case ServiceImportance.CRITICAL: return '最重要';
    case ServiceImportance.HIGH: return '重要';
    case ServiceImportance.MEDIUM: return '中';
    case ServiceImportance.LOW: return '低';
    default: return importance;
  }
};

export const currentServiceStatusToJapanese = (status: CurrentServiceStatus): string => {
  switch (status) {
    case CurrentServiceStatus.OPERATIONAL: return '稼働中';
    case CurrentServiceStatus.DEGRADED: return '一部機能低下';
    case CurrentServiceStatus.PARTIAL_OUTAGE: return '一部障害';
    case CurrentServiceStatus.MAJOR_OUTAGE: return '重大障害/停止';
    case CurrentServiceStatus.MAINTENANCE: return 'メンテナンス中';
    case CurrentServiceStatus.UNKNOWN: return '不明';
    default: return status;
  }
};

export const securityAlertSeverityToJapanese = (severity: SecurityAlertSeverity): string => {
  switch (severity) {
    case SecurityAlertSeverity.CRITICAL: return 'クリティカル';
    case SecurityAlertSeverity.HIGH: return '高';
    case SecurityAlertSeverity.MEDIUM: return '中';
    case SecurityAlertSeverity.LOW: return '低';
    case SecurityAlertSeverity.INFO: return '情報';
    default: return severity;
  }
};

export const securityIncidentStatusToJapanese = (status: SecurityIncidentStatus): string => {
  switch (status) {
    case SecurityIncidentStatus.NEW: return '新規';
    case SecurityIncidentStatus.ANALYZING: return '分析中';
    case SecurityIncidentStatus.CONTAINING: return '封じ込め中';
    case SecurityIncidentStatus.ERADICATING: return '根絶中';
    case SecurityIncidentStatus.RECOVERING: return '復旧中';
    case SecurityIncidentStatus.POST_INCIDENT_REVIEW: return '事後レビュー';
    case SecurityIncidentStatus.CLOSED: return 'クローズ';
    default: return status;
  }
};

export const complianceAuditStatusToJapanese = (status: ComplianceAuditStatus): string => {
  switch (status) {
    case ComplianceAuditStatus.PLANNED: return '計画中';
    case ComplianceAuditStatus.IN_PROGRESS: return '進行中';
    case ComplianceAuditStatus.COMPLETED: return '完了';
    case ComplianceAuditStatus.ON_HOLD: return '保留中';
    case ComplianceAuditStatus.CANCELLED: return 'キャンセル';
    default: return status;
  }
};

export const complianceAuditTypeToJapanese = (type: ComplianceAuditType): string => {
  switch (type) {
    case ComplianceAuditType.INTERNAL: return '内部監査';
    case ComplianceAuditType.EXTERNAL: return '外部監査';
    case ComplianceAuditType.CERTIFICATION: return '認証監査';
    default: return type;
  }
};

export const complianceRiskLevelToJapanese = (level: ComplianceRiskLevel): string => {
  switch (level) {
    case ComplianceRiskLevel.LOW: return '低';
    case ComplianceRiskLevel.MEDIUM: return '中';
    case ComplianceRiskLevel.HIGH: return '高';
    case ComplianceRiskLevel.CRITICAL: return 'クリティカル';
    default: return level;
  }
};

export const complianceRiskStatusToJapanese = (status: ComplianceRiskStatus): string => {
  switch (status) {
    case ComplianceRiskStatus.OPEN: return 'オープン';
    case ComplianceRiskStatus.MITIGATING: return '対応中';
    case ComplianceRiskStatus.CLOSED: return 'クローズ';
    case ComplianceRiskStatus.ACCEPTED: return '受容済み';
    default: return status;
  }
};
