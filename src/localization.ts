
// 型を直接定義して問題を回避
type UserRole = 'Admin' | 'User' | 'ReadOnly';
type ItemStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed' | 'Pending' | 'Approved' | 'Rejected' | 'New' | 'Pending Approval' | 'Scheduled' | 'Implemented' | 'Planned' | 'Building' | 'Testing' | 'Deployed' | 'Rolled Back' | 'Analysis' | 'Solution Proposed' | 'Identified' | 'Mitigated' | 'Compliant' | 'Non Compliant' | 'In Review' | 'Not Applicable';
type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export const userRoleToJapanese = (role: UserRole): string => {
  switch (role) {
    case 'Admin': return '管理者';
    case 'User': return 'ユーザー';
    case 'ReadOnly': return '閲覧専用';
    default: return role;
  }
};

export const itemStatusToJapanese = (status: ItemStatus | string): string => {
  // Handle Problem-specific statuses first
  if (typeof status === 'string') {
    switch (status) {
      case 'Logged': return '登録済み';
      case 'In Progress': return '進行中';
      case 'Known Error': return '既知のエラー';
      case 'Resolved': return '解決済み';
      case 'Closed': return 'クローズ';
      default: break; // Fall through to ItemStatus handling
    }
  }
  
  switch (status) {
    case 'Open': return 'オープン';
    case 'In Progress': return '対応中';
    case 'Resolved': return '解決済み';
    case 'Closed': return 'クローズ';
    case 'Pending': return '保留中';
    case 'Approved': return '承認済み';
    case 'Rejected': return '却下済み';
    case 'New': return '新規';
    case 'Pending Approval': return '承認待ち';
    case 'Scheduled': return '計画済み';
    case 'Implemented': return '実施済み';
    case 'Planned': return '計画中';
    case 'Building': return '構築中';
    case 'Testing': return 'テスト中';
    case 'Deployed': return '展開済み';
    case 'Rolled Back': return 'ロールバック済み';
    case 'Analysis': return '分析中';
    case 'Solution Proposed': return '解決策提案済み';
    case 'Identified': return '特定済み';
    case 'Mitigated': return '軽減済み';
    case 'Compliant': return '準拠';
    case 'Non Compliant': return '非準拠';
    case 'In Review': return 'レビュー中';
    case 'Not Applicable': return '非該当';
    default: return typeof status === 'string' ? status : status;
  }
};

export const assetTypeToJapanese = (type: string): string => {
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

export const assetStatusToJapanese = (status: string): string => {
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

// Common UI messages and error messages
export const UI_MESSAGES = {
  // Common buttons
  save: '保存',
  cancel: 'キャンセル',
  edit: '編集',
  delete: '削除',
  create: '作成',
  search: '検索',
  filter: 'フィルター',
  export: 'エクスポート',
  import: 'インポート',
  approve: '承認',
  reject: '却下',
  close: '閉じる',
  submit: '送信',
  reset: 'リセット',
  
  // Loading and status messages
  loading: '読み込み中...',
  saving: '保存中...',
  processing: '処理中...',
  noData: 'データがありません',
  noResults: '検索結果がありません',
  
  // Success messages
  saveSuccess: '正常に保存されました',
  deleteSuccess: '正常に削除されました',
  createSuccess: '正常に作成されました',
  updateSuccess: '正常に更新されました',
  importSuccess: '正常にインポートされました',
  exportSuccess: '正常にエクスポートされました',
  approveSuccess: '正常に承認されました',
  rejectSuccess: '正常に却下されました',
  
  // Error messages
  saveError: '保存に失敗しました',
  deleteError: '削除に失敗しました',
  createError: '作成に失敗しました',
  updateError: '更新に失敗しました',
  loadError: '読み込みに失敗しました',
  importError: 'インポートに失敗しました',
  exportError: 'エクスポートに失敗しました',
  validationError: '入力内容にエラーがあります',
  networkError: 'ネットワークエラーが発生しました',
  serverError: 'サーバーエラーが発生しました',
  permissionError: 'アクセス権限がありません',
  authenticationError: '認証が必要です',
  notFoundError: 'データが見つかりません',
  
  // Confirmation messages
  deleteConfirm: 'この項目を削除してもよろしいですか？この操作は元に戻せません。',
  unsavedChangesConfirm: '保存されていない変更があります。破棄してもよろしいですか？',
  logoutConfirm: 'ログアウトしてもよろしいですか？',
  
  // Form validation messages
  required: 'この項目は必須です',
  invalidEmail: '正しいメールアドレスを入力してください',
  invalidUrl: '正しいURLを入力してください',
  invalidDate: '正しい日付を入力してください',
  invalidNumber: '数値を入力してください',
  minLength: (min: number) => `${min}文字以上で入力してください`,
  maxLength: (max: number) => `${max}文字以内で入力してください`,
  invalidFormat: '正しい形式で入力してください',
  
  // File upload messages
  selectFile: 'ファイルを選択してください',
  uploadSuccess: 'ファイルのアップロードが完了しました',
  uploadError: 'ファイルのアップロードに失敗しました',
  invalidFileType: 'サポートされていないファイル形式です',
  fileTooLarge: 'ファイルサイズが大きすぎます',
  
  // Pagination
  page: 'ページ',
  of: '/',
  itemsPerPage: '表示件数',
  showing: '表示中',
  to: '〜',
  items: '件',
  
  // Table headers and sorting
  sortAscending: '昇順でソート',
  sortDescending: '降順でソート',
  noSorting: 'ソートなし',
  
  // Filters
  allItems: 'すべて',
  clearFilters: 'フィルタークリア',
  applyFilters: 'フィルター適用',
  
  // Date and time
  today: '今日',
  yesterday: '昨日',
  lastWeek: '先週',
  lastMonth: '先月',
  thisYear: '今年',
  
  // Asset specific
  assetTag: '資産タグ',
  assetName: '資産名',
  assetType: '資産種類',
  assetStatus: '資産ステータス',
  generateTag: 'タグ自動生成',
  
  // Service Request specific
  serviceRequest: 'サービスリクエスト',
  requestor: '申請者',
  approver: '承認者',
  workflowStatus: 'ワークフロー状況',
  approvalComments: '承認コメント',
  rejectionReason: '却下理由',
  startWork: '作業開始',
  completeWork: '作業完了',
  
  // Incident specific
  incident: 'インシデント',
  priority: '優先度',
  severity: '重要度',
  category: 'カテゴリ',
  assignee: '担当者',
  reporter: '報告者',
  resolution: '解決策',
  
  // Dashboard specific
  dashboard: 'ダッシュボード',
  overview: '概要',
  statistics: '統計',
  recentActivity: '最近の活動',
  alerts: 'アラート',
  healthStatus: 'ヘルス状況',
  
  // Navigation
  home: 'ホーム',
  settings: '設定',
  profile: 'プロフィール',
  logout: 'ログアウト',
  administration: '管理',
  
  // System messages
  systemMaintenance: 'システムメンテナンス中です',
  systemError: 'システムエラーが発生しました',
  sessionExpired: 'セッションが期限切れです。再度ログインしてください',
  connectionLost: '接続が失われました。ネットワークを確認してください'
};

// Error code to message mapping
export const ERROR_CODES = {
  E001: 'データベース接続エラー',
  E002: '認証エラー',
  E003: 'アクセス権限エラー',
  E004: 'データ検証エラー',
  E005: 'ファイル処理エラー',
  E006: 'ネットワークエラー',
  E007: 'システム内部エラー',
  E008: 'タイムアウトエラー',
  E009: 'データ重複エラー',
  E010: 'リソース不足エラー'
};

// Helper function to format error messages
export const formatErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.code && ERROR_CODES[error.code as keyof typeof ERROR_CODES]) {
    return ERROR_CODES[error.code as keyof typeof ERROR_CODES];
  }
  
  return UI_MESSAGES.systemError;
};

// Date formatting functions
export const formatDateTime = (date: string | Date): string => {
  try {
    const d = new Date(date);
    return d.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '不明';
  }
};

export const formatDate = (date: string | Date): string => {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('ja-JP');
  } catch {
    return '不明';
  }
};

export const formatTime = (date: string | Date): string => {
  try {
    const d = new Date(date);
    return d.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '不明';
  }
};
