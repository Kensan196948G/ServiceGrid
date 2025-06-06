
import { 
  Incident, ServiceRequest, Asset, KnowledgeArticle, AuditLog, ItemStatus, Priority,
  ChangeRequest, Release, ReleaseType, Problem, ServiceLevelAgreement, MonitoredResource, 
  AvailabilityRecord, ServiceImportance, CurrentServiceStatus, HistoricalUptimeData, // Added Availability types
  Vulnerability, ComplianceControl, ServiceStatusItem, ServiceHealthStatus, AlertItem, AlertSeverity as DashboardAlertSeverity,
  KnowledgeArticleStatus, ConfidentialityLevel, KnowledgeArticleVersion, KnowledgeArticleAttachment, KnowledgeArticleComment, KnowledgeArticleRating,
  SecurityAlert, SecurityAlertSeverity, SecurityIncident, SecurityIncidentStatus, // Added Security types
  ComplianceAudit, ComplianceRiskItem, ComplianceAuditStatus, ComplianceAuditType, ComplianceRiskLevel, ComplianceRiskStatus, // Added Compliance types
  LogSourceStatus, LogStorageSummary, // Added Audit Log Management types
  Department, OrganizationMember, ITService, EmergencyNotificationSettings, SecurityReport, AccessSuspensionRequest, ThreatIntelligenceSharing // Added Security Management types
} from '../types';

// Simulate a delay for API calls
const simulateDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to generate unique IDs
const generateId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).substring(2, 7)}`;

// In-memory store for mock data
let mockIncidents: Incident[] = [
  { id: 'INC001', title: 'メールサーバーダウン', description: 'ユーザーがメールを送受信できません。', reportedBy: 'jane.doe', assignedTo: 'john.smith', status: ItemStatus.OPEN, priority: 'Critical', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), updatedAt: new Date().toISOString(), category: 'ネットワーク' },
  { id: 'INC002', title: 'プリンター故障', description: '2階オフィスプリンター紙詰まり。', reportedBy: 'bob.ray', status: ItemStatus.IN_PROGRESS, priority: 'Medium', createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString(), category: 'ハードウェア' },
  { id: 'INC003', title: 'SAPにログインできません', description: 'パスワード期限切れ、リセット不可。', reportedBy: 'alice.w', status: ItemStatus.RESOLVED, priority: 'High', createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString(), category: 'ソフトウェア' },
];

let mockServiceRequests: ServiceRequest[] = [
  { id: 'REQ001', title: '契約社員用新規アカウント', description: 'Mark Stoneのアカウント要。来週開始。', requestedBy: 'sara.lee', status: ItemStatus.OPEN, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), serviceType: 'アカウント作成' },
  { id: 'REQ002', title: 'Adobe Photoshopインストール', description: 'ライセンス承認済。マーケティングPCへのインストール要。', requestedBy: 'mike.chen', status: ItemStatus.CLOSED, createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(), serviceType: 'ソフトウェアインストール' },
];

let mockAssets: Asset[] = [
  { id: 'AST001', name: 'Dell XPS 15 ノートPC', type: 'Hardware', serialNumber: 'SN123XYZ', status: 'In Use', assignedTo: 'jane.doe', location: 'デスク 101', manufacturer: 'Dell', model: 'XPS 15 9500', purchaseDate: new Date('2022-01-15').toISOString() },
  { id: 'AST002', name: 'Microsoft Office 365 E3 ライセンス', type: 'License', status: 'In Use', assignedTo: '全社', licenseKey: 'LICENSE-KEY-XYZ', expiryDate: new Date('2025-12-31').toISOString() },
  { id: 'AST003', name: 'HP LaserJet Pro M404dn プリンター', type: 'Hardware', serialNumber: 'SNABC789', status: 'In Stock', location: 'IT保管庫', manufacturer: 'HP', model: 'LaserJet Pro M404dn' },
];

let mockKnowledgeArticles: KnowledgeArticle[] = [
  { 
    id: 'KNW001', 
    title: 'パスワードリセット方法（全ユーザー向け）', 
    content: '## パスワードリセット手順\n\n1. **ポータルサイトへアクセス**: [https://portal.example.com/reset](https://portal.example.com/reset) を開きます。\n2. **ユーザー名入力**: ご自身の社員番号またはメールアドレスを入力してください。\n3. **確認コード送信**: 登録済みの携帯電話番号宛にSMSで確認コードが送信されます。\n4. **コード入力と新パスワード設定**: 受信した確認コードと、新しいパスワード（8文字以上、英大小文字・数字・記号をそれぞれ1文字以上含む）を入力し、「リセット実行」ボタンをクリックします。\n\n### 注意事項\n- パスワードは過去3回使用したものと同じものは設定できません。\n- 不明な点があれば、ITヘルプデスクまでお問い合わせください（内線: 1234）。', 
    category: 'アカウント管理', 
    tags: ['パスワード', 'リセット', 'アカウント', 'ログイン'], 
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), 
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(), 
    authorUserId: 'it.admin.user',
    authorUsername: 'it.admin',
    lastUpdatedByUserId: 'it.support.user',
    lastUpdatedByUsername: 'support.team',
    status: KnowledgeArticleStatus.PUBLISHED,
    approverUserId: 'it.manager.user',
    approverUsername: 'it.manager',
    approvalDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    expiryDate: new Date(Date.now() + 86400000 * 365).toISOString(), // 1 year from now
    reviewDate: new Date(Date.now() + 86400000 * 180).toISOString(), // 6 months from now
    viewPermissions: ['All Employees'], // Example: Role or group name
    editPermissions: ['IT Department', 'Knowledge Managers'],
    targetAudience: ['全従業員'],
    confidentialityLevel: ConfidentialityLevel.INTERNAL,
    relatedIncidents: ['INC003'],
    referenceUrls: ['https://internal.example.com/docs/password-policy'],
    attachments: [
      { id: 'ATT001', name: 'パスワードポリシー詳細.pdf', url: '#', type: 'application/pdf', size: 102400 }
    ],
    viewCount: 1250,
    ratings: [{userId: 'user1', value: 5}, {userId: 'user2', value: 4}],
    averageRating: 4.5,
    comments: [
      { id: 'CMT001', userId: 'jane.doe', username: 'jane.doe', text: '非常に分かりやすかったです！', date: new Date(Date.now() - 86400000 * 1).toISOString()}
    ],
    currentVersion: 2,
    versionHistory: [
      { version: 1, date: new Date(Date.now() - 86400000 * 10).toISOString(), editorUserId: 'it.admin.user', editorUsername: 'it.admin', summary: '初版作成' },
      { version: 2, date: new Date(Date.now() - 86400000 * 2).toISOString(), editorUserId: 'support.team.user', editorUsername: 'support.team', summary: '注意事項を追記、書式調整', reason: 'ユーザーからのフィードバック反映' }
    ]
  },
  { 
    id: 'KNW002', 
    title: '社内VPNアクセス設定ガイド (Windows)', 
    content: '## VPN設定手順 (Windows版)\n\n1. **VPNクライアントのダウンロード**: 社内ポータルの「ITツール」セクションから最新版のVPNクライアントをダウンロードします。\n2. **インストール**: ダウンロードしたインストーラーを実行し、画面の指示に従います。\n3. **設定ファイルのインポート**: IT部門から提供された設定ファイル (`yourname.ovpn`など) をクライアントにインポートします。\n4. **接続**: ユーザー名とパスワードを入力して接続します。\n\n不明な場合はヘルプデスクにご連絡ください。', 
    category: 'ネットワーク', 
    tags: ['VPN', 'リモートアクセス', 'Windows', 'セキュリティ'], 
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), 
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(), 
    authorUserId: 'network.specialist.user',
    authorUsername: 'network.specialist',
    lastUpdatedByUserId: 'network.specialist.user',
    lastUpdatedByUsername: 'network.specialist',
    status: KnowledgeArticleStatus.PUBLISHED,
    confidentialityLevel: ConfidentialityLevel.INTERNAL,
    viewCount: 870,
    currentVersion: 1,
     versionHistory: [
      { version: 1, date: new Date(Date.now() - 86400000 * 30).toISOString(), editorUserId: 'network.specialist.user', editorUsername: 'network.specialist', summary: '初版作成' }
    ]
  },
  { 
    id: 'KNW003', 
    title: 'Microsoft Teams 会議のベストプラクティス', 
    content: '効果的なTeams会議を行うためのヒント集。背景設定、マイクミュート、画面共有など。', 
    category: 'Microsoft 365', 
    tags: ['Teams', '会議', 'Office365'], 
    createdAt: new Date().toISOString(), 
    updatedAt: new Date().toISOString(), 
    authorUserId: 'training.dept.user',
    authorUsername: 'training.dept',
    status: KnowledgeArticleStatus.DRAFT,
    confidentialityLevel: ConfidentialityLevel.INTERNAL,
    viewCount: 15,
    currentVersion: 1,
     versionHistory: [
      { version: 1, date: new Date().toISOString(), editorUserId: 'training.dept.user', editorUsername: 'training.dept', summary: '初版作成（下書き）' }
    ]
  },
];


let mockAuditLogs: AuditLog[] = [
   { id: 'LOG001', timestamp: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), userId: 'SYSTEM', username: 'SYSTEM', action: 'システム起動', details: 'ITSMプラットフォームが初期化されました。'},
   { id: 'LOG002', timestamp: new Date(Date.now() - 3600000 * 20).toISOString(), userId: 'admin.user', username: 'admin.user', action: 'ユーザーログイン', details: 'ユーザー admin.user がログインしました。'},
   { id: 'LOG003', timestamp: new Date(Date.now() - 3600000 * 15).toISOString(), userId: 'security.scan', username: 'SYSTEM_SCAN', action: '脆弱性スキャン開始', details: '定期脆弱性スキャンが開始されました。範囲: 全社サーバー。'},
   { id: 'LOG004', timestamp: new Date(Date.now() - 3600000 * 10).toISOString(), userId: 'jane.doe', username: 'jane.doe', action: 'インシデント作成', details: '新規インシデント作成: メールサーバーダウン (ID: INC001)'},
   { id: 'LOG005', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), userId: 'it.manager', username: 'it.manager', action: '変更リクエスト承認', details: '変更リクエスト「メールサーバOSアップグレード」(ID: CHG001)が承認されました。'},
   { id: 'LOG006', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), userId: 'api.service', username: 'API_SERVICE', action: '外部APIアクセス', details: 'Microsoft Graph APIへのアクセス (ユーザー情報同期)'},
   { id: 'LOG007', timestamp: new Date(Date.now() - 60000 * 30).toISOString(), userId: 'backup.daemon', username: 'SYSTEM_BACKUP', action: 'DBバックアップ完了', details: 'データベースのフルバックアップが正常に完了しました。'},
   { id: 'LOG008', timestamp: new Date().toISOString(), userId: 'john.smith', username: 'john.smith', action: 'ナレッジ記事参照', details: '記事「パスワードリセット方法（全ユーザー向け）」(ID: KNW001) を参照しました。'}
];

let mockServiceStatuses: ServiceStatusItem[] = [
  { id: 'SRVSTAT001', name: 'メールサービス (Exchange Online)', status: ServiceHealthStatus.NORMAL, lastChecked: new Date().toISOString(), description: '全てのメール機能は正常に稼働中です。' },
  { id: 'SRVSTAT002', name: 'ファイル共有 (OneDrive/SharePoint)', status: ServiceHealthStatus.NORMAL, lastChecked: new Date().toISOString(), description: 'ファイルアクセス、同期は正常です。' },
  { id: 'SRVSTAT003', name: '社内基幹システム (SAP)', status: ServiceHealthStatus.WARNING, lastChecked: new Date(Date.now() - 60000 * 5).toISOString(), description: '一部のバッチ処理に遅延が発生しています。通常業務への影響は軽微です。' },
  { id: 'SRVSTAT004', name: 'Teamsコミュニケーション', status: ServiceHealthStatus.NORMAL, lastChecked: new Date().toISOString() },
  { id: 'SRVSTAT005', name: 'Active Directory認証', status: ServiceHealthStatus.NORMAL, lastChecked: new Date().toISOString() },
  { id: 'SRVSTAT006', name: '外部ファイルサーバ', status: ServiceHealthStatus.MAINTENANCE, lastChecked: new Date(Date.now() - 60000 * 30).toISOString(), description: '定期メンテナンスのため、AM2:00-AM4:00までサービス停止予定。'},
];

let mockDashboardAlerts: AlertItem[] = [ // Renamed from mockActiveAlerts to avoid confusion with SecurityAlerts
  { id: 'DBALERT001', message: '重要: DBサーバーのディスク空き容量が10%未満です。', severity: DashboardAlertSeverity.CRITICAL, timestamp: new Date(Date.now() - 60000 * 15).toISOString(), source: '監視システム Zabbix', acknowledged: false },
  { id: 'DBALERT002', message: '人事システムへの不正アクセス試行を検知しました。', severity: DashboardAlertSeverity.HIGH, timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), source: 'SkySea Client View', acknowledged: false },
  { id: 'DBALERT003', message: 'Exchange Online - スパムメール急増の可能性。レート上昇。', severity: DashboardAlertSeverity.MEDIUM, timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), source: 'Microsoft 365 Defender', acknowledged: true },
];


// Audit Log (centralized)
export const addAuditLog = async (logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> => {
  const newLog: AuditLog = {
    ...logData,
    id: generateId('LOG'),
    timestamp: new Date().toISOString(),
  };
  mockAuditLogs.push(newLog);
  // console.log('Audit Log Added:', newLog); // For debugging
  return newLog;
};
export const getAuditLogs = async (): Promise<AuditLog[]> => {
  await simulateDelay(200);
  return [...mockAuditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};


// Incident Management
export const getIncidents = async (): Promise<Incident[]> => {
  await simulateDelay(500);
  return [...mockIncidents];
};
export const addIncident = async (incidentData: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>): Promise<Incident> => {
  await simulateDelay(300);
  const newIncident: Incident = {
    ...incidentData,
    id: generateId('INC'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockIncidents.push(newIncident);
  addAuditLog({userId: incidentData.reportedBy, username: incidentData.reportedBy, action: 'インシデント作成', details: `新規インシデント作成: ${newIncident.title} (ID: ${newIncident.id})`});
  return newIncident;
};
export const updateIncident = async (id: string, updates: Partial<Incident>): Promise<Incident> => {
  await simulateDelay(300);
  mockIncidents = mockIncidents.map(inc => 
    inc.id === id ? { ...inc, ...updates, updatedAt: new Date().toISOString() } : inc
  );
  const updatedIncident = mockIncidents.find(inc => inc.id === id);
  if (!updatedIncident) throw new Error('インシデントが見つかりません');
  addAuditLog({userId: updates.reportedBy || 'SYSTEM', username: updates.reportedBy || 'SYSTEM', action: 'インシデント更新', details: `インシデント「${updatedIncident.title}」(ID: ${updatedIncident.id})が更新されました。`});
  return updatedIncident;
};
export const deleteIncident = async (id: string): Promise<void> => {
  await simulateDelay(300);
  const incidentToDelete = mockIncidents.find(inc => inc.id === id);
  mockIncidents = mockIncidents.filter(inc => inc.id !== id);
  if(incidentToDelete) {
    addAuditLog({userId: 'SYSTEM_ADMIN', username: 'SYSTEM_ADMIN', action: 'インシデント削除', details: `インシデント「${incidentToDelete.title}」(ID: ${id})が削除されました。`});
  }
};

// Service Request Management
export const getServiceRequests = async (): Promise<ServiceRequest[]> => {
  await simulateDelay(500);
  return [...mockServiceRequests];
};
export const addServiceRequest = async (requestData: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceRequest> => {
  await simulateDelay(300);
  const newRequest: ServiceRequest = {
    ...requestData,
    id: generateId('REQ'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockServiceRequests.push(newRequest);
  addAuditLog({userId: requestData.requestedBy, username: requestData.requestedBy, action: 'サービスリクエスト作成', details: `新規サービスリクエスト: ${newRequest.title} (ID: ${newRequest.id})`});
  return newRequest;
};
export const updateServiceRequest = async (id: string, updates: Partial<ServiceRequest>): Promise<ServiceRequest> => {
  await simulateDelay(300);
  mockServiceRequests = mockServiceRequests.map(req =>
    req.id === id ? { ...req, ...updates, updatedAt: new Date().toISOString() } : req
  );
  const updatedRequest = mockServiceRequests.find(req => req.id === id);
  if (!updatedRequest) throw new Error('サービスリクエストが見つかりません');
  addAuditLog({userId: updates.requestedBy || 'SYSTEM', username: updates.requestedBy || 'SYSTEM', action: 'サービスリクエスト更新', details: `サービスリクエスト「${updatedRequest.title}」(ID: ${updatedRequest.id})が更新されました。`});
  return updatedRequest;
};
export const deleteServiceRequest = async (id: string): Promise<void> => {
  await simulateDelay(300);
  const requestToDelete = mockServiceRequests.find(req => req.id === id);
  mockServiceRequests = mockServiceRequests.filter(req => req.id !== id);
  if(requestToDelete) {
     addAuditLog({userId: 'SYSTEM_ADMIN', username: 'SYSTEM_ADMIN', action: 'サービスリクエスト削除', details: `サービスリクエスト「${requestToDelete.title}」(ID: ${id})が削除されました。`});
  }
};

// Asset Management
export const getAssets = async (): Promise<Asset[]> => {
  await simulateDelay(500);
  return [...mockAssets];
};
export const addAsset = async (assetData: Omit<Asset, 'id'>): Promise<Asset> => {
  await simulateDelay(300);
  const newAsset: Asset = {
    ...assetData,
    id: generateId('AST'),
  };
  mockAssets.push(newAsset);
  addAuditLog({userId: 'SYSTEM_ADMIN', username: 'SYSTEM_ADMIN', action: '資産作成', details: `新規資産作成: ${newAsset.name} (ID: ${newAsset.id})`});
  return newAsset;
};
export const updateAsset = async (id: string, updates: Partial<Asset>): Promise<Asset> => {
  await simulateDelay(300);
  mockAssets = mockAssets.map(asset =>
    asset.id === id ? { ...asset, ...updates } : asset
  );
  const updatedAsset = mockAssets.find(asset => asset.id === id);
  if (!updatedAsset) throw new Error('資産が見つかりません');
   addAuditLog({userId: 'SYSTEM_ADMIN', username: 'SYSTEM_ADMIN', action: '資産更新', details: `資産「${updatedAsset.name}」(ID: ${updatedAsset.id})が更新されました。`});
  return updatedAsset;
};
export const deleteAsset = async (id: string): Promise<void> => {
  await simulateDelay(300);
  const assetToDelete = mockAssets.find(asset => asset.id === id);
  mockAssets = mockAssets.filter(asset => asset.id !== id);
  if(assetToDelete) {
    addAuditLog({userId: 'SYSTEM_ADMIN', username: 'SYSTEM_ADMIN', action: '資産削除', details: `資産「${assetToDelete.name}」(ID: ${id})が削除されました。`});
  }
};

// Knowledge Base
export const getKnowledgeArticles = async (): Promise<KnowledgeArticle[]> => {
  await simulateDelay(500);
  return [...mockKnowledgeArticles];
};

export const addKnowledgeArticle = async (
  articleData: Omit<KnowledgeArticle, 'id' | 'createdAt' | 'updatedAt' | 'currentVersion' | 'versionHistory' | 'authorUserId' | 'authorUsername'>,
  currentUser: { userId: string, username: string}
): Promise<KnowledgeArticle> => {
  await simulateDelay(300);
  const now = new Date().toISOString();
  const newArticle: KnowledgeArticle = {
    ...articleData,
    id: generateId('KNW'),
    createdAt: now,
    updatedAt: now,
    authorUserId: currentUser.userId,
    authorUsername: currentUser.username,
    lastUpdatedByUserId: currentUser.userId,
    lastUpdatedByUsername: currentUser.username,
    currentVersion: 1,
    versionHistory: [{
      version: 1,
      date: now,
      editorUserId: currentUser.userId,
      editorUsername: currentUser.username,
      summary: '初版作成',
      reason: articleData.status === KnowledgeArticleStatus.DRAFT ? '下書きとして作成' : '新規記事として公開/承認依頼'
    }],
    viewCount: articleData.viewCount || 0,
    status: articleData.status || KnowledgeArticleStatus.DRAFT,
    confidentialityLevel: articleData.confidentialityLevel || ConfidentialityLevel.INTERNAL,
    // Ensure all optional array fields are initialized if not provided
    tags: articleData.tags || [],
    viewPermissions: articleData.viewPermissions || [],
    editPermissions: articleData.editPermissions || [],
    targetAudience: articleData.targetAudience || [],
    relatedIncidents: articleData.relatedIncidents || [],
    relatedProblems: articleData.relatedProblems || [],
    relatedChanges: articleData.relatedChanges || [],
    referenceUrls: articleData.referenceUrls || [],
    attachments: articleData.attachments || [],
    relatedArticles: articleData.relatedArticles || [],
    ratings: articleData.ratings || [],
    comments: articleData.comments || [],
  };
  mockKnowledgeArticles.push(newArticle);
  addAuditLog({ userId: currentUser.userId, username: currentUser.username, action: 'ナレッジ記事作成', details: `新規記事「${newArticle.title}」(ID: ${newArticle.id})が作成されました。` });
  return newArticle;
};

export const updateKnowledgeArticle = async (
  id: string, 
  updates: Partial<Omit<KnowledgeArticle, 'id' | 'createdAt' | 'authorUserId' | 'authorUsername'>>, // author fields shouldn't be updatable directly here
  currentUser: { userId: string, username: string },
  changeSummary: string = '内容更新',
  changeReason?: string
): Promise<KnowledgeArticle> => {
  await simulateDelay(300);
  let updatedArticle: KnowledgeArticle | undefined;
  const now = new Date().toISOString();

  mockKnowledgeArticles = mockKnowledgeArticles.map(article => {
    if (article.id === id) {
      const newVersionNumber = (article.currentVersion || 0) + 1;
      const newVersionEntry: KnowledgeArticleVersion = {
        version: newVersionNumber,
        date: now,
        editorUserId: currentUser.userId,
        editorUsername: currentUser.username,
        summary: changeSummary,
        reason: changeReason,
        // contentSnapshot: updates.content || article.content // Snapshot current content being saved
      };
      
      updatedArticle = { 
        ...article, 
        ...updates, 
        updatedAt: now,
        lastUpdatedByUserId: currentUser.userId,
        lastUpdatedByUsername: currentUser.username,
        currentVersion: newVersionNumber,
        versionHistory: [...(article.versionHistory || []), newVersionEntry]
      };
      return updatedArticle;
    }
    return article;
  });

  if (!updatedArticle) throw new Error('ナレッジ記事が見つかりません');
  addAuditLog({ userId: currentUser.userId, username: currentUser.username, action: 'ナレッジ記事更新', details: `記事「${updatedArticle.title}」(ID: ${updatedArticle.id})が更新されました。バージョン: ${updatedArticle.currentVersion}` });
  return updatedArticle;
};

export const deleteKnowledgeArticle = async (id: string, currentUser: {userId: string, username: string}): Promise<void> => {
  await simulateDelay(300);
  const articleToDelete = mockKnowledgeArticles.find(article => article.id === id);
  mockKnowledgeArticles = mockKnowledgeArticles.filter(article => article.id !== id);
  if(articleToDelete) {
      addAuditLog({userId: currentUser.userId, username: currentUser.username, action: 'ナレッジ記事削除', details: `記事「${articleToDelete.title}」(ID: ${id})が削除されました。`});
  }
};


// --- New ITSM Module Mock Services ---

// Change Management
let mockChangeRequests: ChangeRequest[] = [
    { id: 'CHG001', title: 'メールサーバOSアップグレード', description: 'セキュリティパッチ適用のためOSを最新版にアップグレード', requester: 'john.smith', status: ItemStatus.PENDING_APPROVAL, priority: 'High', category: 'サーバー', impact: 'High', urgency: 'Medium', risk: 'High', implementationPlan: '週末メンテナンス時間帯に実施...', backoutPlan: '旧バージョンにロールバック...', plannedStartDate: new Date(Date.now() + 86400000 * 7).toISOString(), plannedEndDate: new Date(Date.now() + 86400000 * 7 + 3600000 * 4).toISOString(), createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), updatedAt: new Date().toISOString(), deadline: new Date(Date.now() + 86400000 * 3).toISOString() },
    { id: 'CHG002', title: '人事システム新機能追加', description: '年末調整機能の追加', requester: 'sara.lee', status: ItemStatus.SCHEDULED, priority: 'Medium', category: 'アプリケーション', impact: 'Medium', urgency: 'Low', risk: 'Medium', implementationPlan: '開発完了、テストフェーズ後展開', backoutPlan: '機能フラグで制御', plannedStartDate: new Date(Date.now() + 86400000 * 14).toISOString(), plannedEndDate: new Date(Date.now() + 86400000 * 14 + 3600000 * 8).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'CHG003', title: 'ネットワークスイッチ交換', description: '老朽化したコアスイッチの交換', requester: 'mike.chen', status: ItemStatus.IMPLEMENTED, priority: 'Critical', category: 'ネットワーク', impact: 'High', urgency: 'High', risk: 'High', implementationPlan: '先日夜間作業にて完了', backoutPlan: '旧スイッチ再接続', plannedStartDate: new Date(Date.now() - 86400000 * 3).toISOString(), plannedEndDate: new Date(Date.now() - 86400000 * 3 + 3600000 * 2).toISOString(), actualStartDate: new Date(Date.now() - 86400000 * 3).toISOString(), actualEndDate: new Date(Date.now() - 86400000 * 3 + 3600000 * 2).toISOString(), createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'CHG004', title: 'ファイルサーバーディスク増設', description: '容量逼迫のためディスク増設', requester: 'admin.user', status: ItemStatus.PENDING_APPROVAL, priority: 'Medium', category: 'サーバー', impact: 'Medium', urgency: 'Medium', risk: 'Low', implementationPlan: '週末に実施予定。サービス影響なし。', backoutPlan: 'なし', plannedStartDate: new Date(Date.now() + 86400000 * 4).toISOString(), plannedEndDate: new Date(Date.now() + 86400000 * 4 + 3600000 * 3).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deadline: new Date(Date.now() + 86400000 * 2).toISOString() },
    { id: 'CHG005', title: 'ファイアウォールルール変更', description: '新規Webサーバー公開のためのルール追加', requester: 'security.team', status: ItemStatus.CLOSED, priority: 'High', category: 'セキュリティ', impact: 'Low', urgency: 'High', risk: 'Medium', implementationPlan: '適用テスト後、本番適用済み', backoutPlan: 'ルール削除', plannedStartDate: new Date(Date.now() - 86400000 * 5).toISOString(), plannedEndDate: new Date(Date.now() - 86400000 * 5).toISOString(), actualStartDate: new Date(Date.now() - 86400000 * 5).toISOString(), actualEndDate: new Date(Date.now() - 86400000 * 5).toISOString(), createdAt: new Date(Date.now() - 86400000 * 6).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
];
export const getChangeRequests = async (): Promise<ChangeRequest[]> => { await simulateDelay(400); return [...mockChangeRequests]; };
export const addChangeRequest = async (data: Omit<ChangeRequest, 'id'|'createdAt'|'updatedAt'>): Promise<ChangeRequest> => {
    await simulateDelay(300);
    const newItem: ChangeRequest = { ...data, id: generateId('CHG'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    mockChangeRequests.push(newItem);
    addAuditLog({ userId: data.requester, username: data.requester, action: '変更リクエスト作成', details: `変更リクエスト「${newItem.title}」(ID: ${newItem.id})が作成されました。` });
    return newItem;
};
export const updateChangeRequest = async (id: string, updates: Partial<ChangeRequest>): Promise<ChangeRequest> => {
    await simulateDelay(300);
    mockChangeRequests = mockChangeRequests.map(item => item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item);
    const updatedItem = mockChangeRequests.find(item => item.id === id);
    if (!updatedItem) throw new Error('変更リクエストが見つかりません');
    addAuditLog({ userId: updates.requester || 'SYSTEM_ADMIN', username: updates.requester || 'SYSTEM_ADMIN', action: '変更リクエスト更新', details: `変更リクエスト「${updatedItem.title}」(ID: ${updatedItem.id})が更新されました。` });
    return updatedItem;
};
export const deleteChangeRequest = async (id: string): Promise<void> => {
    await simulateDelay(300);
    const itemToDelete = mockChangeRequests.find(item => item.id === id);
    mockChangeRequests = mockChangeRequests.filter(item => item.id !== id);
    if(itemToDelete) {
      addAuditLog({userId: 'SYSTEM_ADMIN', username: 'SYSTEM_ADMIN', action: '変更リクエスト削除', details: `変更リクエスト「${itemToDelete.title}」(ID: ${id})が削除されました。`});
    }
};
export const approveChangeRequest = async (id: string, approverUsername: string): Promise<ChangeRequest> => {
  await simulateDelay(200);
  const changeRequest = mockChangeRequests.find(cr => cr.id === id);
  if (!changeRequest) throw new Error('変更リクエストが見つかりません');
  if (changeRequest.status !== ItemStatus.PENDING_APPROVAL) throw new Error('この変更リクエストは承認待ちではありません。');
  
  changeRequest.status = ItemStatus.APPROVED; // Or ItemStatus.SCHEDULED if auto-scheduling
  changeRequest.updatedAt = new Date().toISOString();
  addAuditLog({ userId: approverUsername, username: approverUsername, action: '変更リクエスト承認', details: `変更リクエスト「${changeRequest.title}」(ID: ${id})が承認されました。` });
  return changeRequest;
};
export const rejectChangeRequest = async (id: string, rejectorUsername: string, rejectionReason: string = "理由未記入"): Promise<ChangeRequest> => {
  await simulateDelay(200);
  const changeRequest = mockChangeRequests.find(cr => cr.id === id);
  if (!changeRequest) throw new Error('変更リクエストが見つかりません');
  if (changeRequest.status !== ItemStatus.PENDING_APPROVAL) throw new Error('この変更リクエストは承認待ちではありません。');

  changeRequest.status = ItemStatus.REJECTED;
  changeRequest.updatedAt = new Date().toISOString();
  // You might want to store the rejectionReason in the change request itself if the model supports it
  addAuditLog({ userId: rejectorUsername, username: rejectorUsername, action: '変更リクエスト却下', details: `変更リクエスト「${changeRequest.title}」(ID: ${id})が却下されました。理由: ${rejectionReason}` });
  return changeRequest;
};


// Release Management
const today = new Date();
const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
const nextMonth = new Date(today); nextMonth.setMonth(today.getMonth() + 1);
const prevMonth = new Date(today); prevMonth.setMonth(today.getMonth() - 1);


let mockReleases: Release[] = [
    { 
      id: 'REL001', version: 'v2.1.0', title: '顧客ポータル機能改善', 
      description: 'ダッシュボード表示速度改善と新レポート機能', 
      status: ItemStatus.PLANNED, releaseType: 'Major',
      plannedDeploymentDate: nextWeek.toISOString(), 
      servicesAffected: ['顧客ポータル', 'レポートAPI'], 
      rolloutPlan: '段階的ロールアウト...', deploymentLead: 'alice.w',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), updatedAt: new Date().toISOString() 
    },
    { 
      id: 'REL002', version: 'v1.5.2', title: '認証サーバーセキュリティパッチ', 
      description: 'CVE-2024-XXXXX 対応', 
      status: ItemStatus.SCHEDULED, releaseType: 'Patch',
      plannedDeploymentDate: tomorrow.toISOString(), 
      servicesAffected: ['認証サーバー'], 
      rolloutPlan: '全サーバー一斉適用', deploymentLead: 'john.smith',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), updatedAt: new Date().toISOString() 
    },
    { 
      id: 'REL003', version: 'v3.0.0-beta', title: '新モバイルアプリ (ベータ版)', 
      description: 'iOSおよびAndroid向け新モバイルアプリの社内ベータテスト開始', 
      status: ItemStatus.BUILDING, releaseType: 'Major',
      plannedDeploymentDate: nextMonth.toISOString(), 
      servicesAffected: ['モバイルアプリ', 'APIゲートウェイ'], 
      rolloutPlan: '招待制ベータプログラム', testLead: 'bob.ray', deploymentLead: 'sara.lee',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() 
    },
     { 
      id: 'REL004', version: 'v2.0.1', title: '会計システム マイナーアップデート', 
      description: '軽微なバグ修正とUI調整', 
      status: ItemStatus.DEPLOYED, releaseType: 'Minor',
      plannedDeploymentDate: prevMonth.toISOString(),
      actualDeploymentDate: prevMonth.toISOString(),
      servicesAffected: ['社内基幹システム'], 
      rolloutPlan: '通常メンテナンス時間帯に展開済み', deploymentLead: 'mike.chen',
      createdAt: new Date(Date.now() - 86400000 * 40).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 30).toISOString() 
    },
     { 
      id: 'REL005', version: 'v1.0.5-hotfix', title: '緊急: Webサーバー脆弱性対応', 
      description: 'クリティカルな脆弱性(CVE-XXXX)への緊急パッチ適用', 
      status: ItemStatus.DEPLOYED, releaseType: 'Emergency',
      plannedDeploymentDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      actualDeploymentDate: new Date(Date.now() - 86400000).toISOString(),
      servicesAffected: ['顧客ポータル', '公開Webサイト'], 
      rolloutPlan: '即時適用', deploymentLead: 'security.team',
      createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() 
    },
];
export const getReleases = async (): Promise<Release[]> => { 
  await simulateDelay(400); 
  return [...mockReleases].sort((a,b) => new Date(b.plannedDeploymentDate).getTime() - new Date(a.plannedDeploymentDate).getTime()); 
};
export const addRelease = async (data: Omit<Release, 'id'|'createdAt'|'updatedAt'>): Promise<Release> => {
    await simulateDelay(300);
    const newItem: Release = { ...data, id: generateId('REL'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    mockReleases.push(newItem);
    addAuditLog({ userId: data.deploymentLead || 'SYSTEM_ADMIN', username: data.deploymentLead || 'SYSTEM_ADMIN', action: 'リリース計画作成', details: `リリース計画「${newItem.title}」(バージョン ${newItem.version}, ID: ${newItem.id})が作成されました。` });
    return newItem;
};
export const updateRelease = async (id: string, updates: Partial<Release>): Promise<Release> => {
    await simulateDelay(300);
    mockReleases = mockReleases.map(item => item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item);
    const updatedItem = mockReleases.find(item => item.id === id);
    if (!updatedItem) throw new Error('リリース計画が見つかりません');
    addAuditLog({ userId: updates.deploymentLead || 'SYSTEM_ADMIN', username: updates.deploymentLead || 'SYSTEM_ADMIN', action: 'リリース計画更新', details: `リリース計画「${updatedItem.title}」(ID: ${updatedItem.id})が更新されました。` });
    return updatedItem;
};
export const deleteRelease = async (id: string): Promise<void> => {
    await simulateDelay(300);
    const itemToDelete = mockReleases.find(item => item.id === id);
    mockReleases = mockReleases.filter(item => item.id !== id);
    if(itemToDelete) {
      addAuditLog({userId: 'SYSTEM_ADMIN', username: 'SYSTEM_ADMIN', action: 'リリース計画削除', details: `リリース計画「${itemToDelete.title}」(ID: ${id})が削除されました。`});
    }
};

// Problem Management
let mockProblems: Problem[] = [
  { 
    id: 'PRB001', 
    title: '月末バッチ処理遅延多発', 
    description: '過去3ヶ月間、月末バッチが予定時刻を超過。原因不明。影響大。', 
    status: ItemStatus.ANALYSIS, 
    priority: 'High', 
    reportedBy: 'system.monitoring', 
    assignedTo: 'db.team', 
    relatedIncidents: ['INC001', 'INC005', 'INC012'], 
    rootCauseAnalysis: 'DBのインデックス最適化不足と、夜間処理の集中によるリソース競合の可能性。',
    workaround: 'バッチ処理開始前に手動で関連テーブルの統計情報を更新。処理時間帯を一部ずらす。',
    solution: 'インデックス再設計と、バッチスケジュールの分散化。DBサーバーのスペックアップも検討。',
    knownError: true, 
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days ago
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()  // 2 days ago
  },
  { 
    id: 'PRB002', 
    title: '特定部署でのプリンター頻繁なオフライン', 
    description: '営業部のプリンターが日に数回オフラインになり、再起動が必要。ネットワーク設定は問題なさそう。', 
    status: ItemStatus.NEW, 
    priority: 'Medium', 
    reportedBy: 'INC020, INC025', 
    assignedTo: 'hw.support', 
    relatedIncidents: ['INC020', 'INC025'],
    knownError: false, 
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()  // 1 day ago
  },
   { 
    id: 'PRB003', 
    title: 'VPN接続後の社内リソースアクセス不可（一部ユーザー）', 
    description: '特定の条件下（自宅Wi-Fi、特定のクライアントバージョン）でVPN接続後、ファイルサーバーや社内ポータルにアクセスできないと複数報告。', 
    status: ItemStatus.SOLUTION_PROPOSED, 
    priority: 'High', 
    reportedBy: 'INC033, INC035, INC040', 
    assignedTo: 'network.team', 
    relatedIncidents: ['INC033', 'INC035', 'INC040'],
    rootCauseAnalysis: 'VPNクライアントの最新版と特定のルーターファームウェアとの相性問題によるDNS解決の不具合。',
    workaround: 'VPNクライアントのダウングレード、またはDNS設定を手動変更。',
    solution: 'VPNクライアントメーカーに修正依頼中。修正版リリース後に全社展開。それまでは暫定対処を案内。',
    knownError: true, 
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date().toISOString() 
  },
];
export const getProblems = async (): Promise<Problem[]> => { await simulateDelay(400); return [...mockProblems]; };
export const addProblem = async (data: Omit<Problem, 'id'|'createdAt'|'updatedAt'>): Promise<Problem> => {
    await simulateDelay(300);
    const newItem: Problem = { ...data, id: generateId('PRB'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    mockProblems.push(newItem);
    addAuditLog({ userId: data.reportedBy, username: data.reportedBy, action: '問題登録', details: `問題「${newItem.title}」(ID: ${newItem.id})が登録されました。` });
    return newItem;
};
export const updateProblem = async (id: string, updates: Partial<Problem>): Promise<Problem> => {
    await simulateDelay(300);
    mockProblems = mockProblems.map(item => item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item);
    const updatedItem = mockProblems.find(item => item.id === id);
    if (!updatedItem) throw new Error('問題が見つかりません');
    addAuditLog({ userId: 'SYSTEM_ADMIN', username: 'SYSTEM_ADMIN', action: '問題更新', details: `問題「${updatedItem.title}」(ID: ${updatedItem.id})が更新されました。` });
    return updatedItem;
};
export const deleteProblem = async (id: string): Promise<void> => {
    await simulateDelay(300);
    const itemToDelete = mockProblems.find(item => item.id === id);
    if (!itemToDelete) throw new Error('削除対象の問題が見つかりません');
    
    mockProblems = mockProblems.filter(item => item.id !== id);
    addAuditLog({userId: 'SYSTEM_ADMIN', username: 'SYSTEM_ADMIN', action: '問題削除', details: `問題「${itemToDelete.title}」(ID: ${id})が削除されました。`});
};


// Service Level Management
let mockSLAs: ServiceLevelAgreement[] = [
  { 
    id: 'SLA001', serviceName: 'メールサービス', metricName: '月間稼働率', 
    metricDescription: 'メール送受信機能が利用可能な時間の割合', 
    targetValue: 99.9, targetUnit: '%', measurementWindow: 'Monthly', 
    status: 'Active', owner: 'it.infra.team', 
    currentPerformance: 99.95, performanceStatus: 'Met', 
    lastReviewDate: new Date(Date.now() - 86400000 * 90).toISOString(),
    nextReviewDate: new Date(Date.now() + 86400000 * 90).toISOString(),
    historicalPerformance: [
        { date: new Date(Date.now() - 86400000 * 90).toISOString(), value: 99.85 },
        { date: new Date(Date.now() - 86400000 * 60).toISOString(), value: 99.92 },
        { date: new Date(Date.now() - 86400000 * 30).toISOString(), value: 99.98 },
        { date: new Date().toISOString(), value: 99.95 },
    ],
    notes: '過去3ヶ月連続で目標達成。ペナルティなし。'
  },
  { 
    id: 'SLA002', serviceName: 'インシデント対応 (High Priority)', metricName: '解決時間', 
    metricDescription: '高優先度インシデントの報告から解決までの平均時間', 
    targetValue: 4, targetUnit: 'hours', measurementWindow: 'Monthly', 
    status: 'Active', owner: 'it.support.team', 
    currentPerformance: 3.8, performanceStatus: 'Met',
    historicalPerformance: [
        { date: new Date(Date.now() - 86400000 * 30).toISOString(), value: 4.2 },
        { date: new Date().toISOString(), value: 3.8 },
    ],
    notes: '今月目標達成。'
  },
  { 
    id: 'SLA003', serviceName: '社内ポータルアクセス', metricName: '応答時間 (主要ページ)', 
    metricDescription: '主要ページ表示までの平均時間 (95パーセンタイル)', 
    targetValue: 2000, targetUnit: 'ms', measurementWindow: 'Daily', 
    status: 'Active', owner: 'web.team', 
    currentPerformance: 2300, performanceStatus: 'At Risk',
    lastReviewDate: new Date(Date.now() - 86400000 * 30).toISOString(),
    nextReviewDate: new Date(Date.now() + 86400000 * 60).toISOString(),
    notes: '応答時間が目標値に近づいています。月末にインフラ増強予定。'
  },
  { 
    id: 'SLA004', serviceName: '基幹システム (SAP)', metricName: '月間稼働率', 
    metricDescription: 'SAPのコアモジュールが利用可能な時間の割合', 
    targetValue: 99.5, targetUnit: '%', measurementWindow: 'Monthly', 
    status: 'Active', owner: 'erp.team', 
    currentPerformance: 99.2, performanceStatus: 'Breached',
    historicalPerformance: [
        { date: new Date(Date.now() - 86400000 * 60).toISOString(), value: 99.6 },
        { date: new Date(Date.now() - 86400000 * 30).toISOString(), value: 99.4 },
        { date: new Date().toISOString(), value: 99.2 },
    ],
    notes: '先月の計画外停止により目標未達。改善策実施中。契約に基づきサービスクレジット適用検討。'
  },
];

export const getSLAs = async (): Promise<ServiceLevelAgreement[]> => { await simulateDelay(300); return [...mockSLAs]; };

export const addSla = async (slaData: Omit<ServiceLevelAgreement, 'id'>, currentUser: { userId: string, username: string }): Promise<ServiceLevelAgreement> => {
  await simulateDelay(300);
  const newSla: ServiceLevelAgreement = {
    ...slaData,
    id: generateId('SLA'),
  };
  mockSLAs.push(newSla);
  addAuditLog({userId: currentUser.userId, username: currentUser.username, action: 'SLA定義作成', details: `新規SLA定義: ${newSla.serviceName} - ${newSla.metricName} (ID: ${newSla.id})`});
  return newSla;
};

export const updateSla = async (id: string, updates: Partial<ServiceLevelAgreement>, currentUser: { userId: string, username: string }): Promise<ServiceLevelAgreement> => {
  await simulateDelay(300);
  mockSLAs = mockSLAs.map(sla => 
    sla.id === id ? { ...sla, ...updates } : sla
  );
  const updatedSla = mockSLAs.find(sla => sla.id === id);
  if (!updatedSla) throw new Error('SLA定義が見つかりません');
  addAuditLog({userId: currentUser.userId, username: currentUser.username, action: 'SLA定義更新', details: `SLA定義「${updatedSla.serviceName} - ${updatedSla.metricName}」(ID: ${updatedSla.id})が更新されました。`});
  return updatedSla;
};

export const deleteSla = async (id: string, currentUser: { userId: string, username: string }): Promise<void> => {
  await simulateDelay(300);
  const slaToDelete = mockSLAs.find(sla => sla.id === id);
  mockSLAs = mockSLAs.filter(sla => sla.id !== id);
  if(slaToDelete) {
    addAuditLog({userId: currentUser.userId, username: currentUser.username, action: 'SLA定義削除', details: `SLA定義「${slaToDelete.serviceName} - ${slaToDelete.metricName}」(ID: ${id})が削除されました。`});
  }
};


// Capacity Management
let mockMonitoredResources: MonitoredResource[] = [
  { 
    id: 'CAP001', resourceName: 'AppServer01', type: 'Server', metric: 'CPU Utilization', 
    currentValue: 65, unit: '%', warningThreshold: 70, criticalThreshold: 85, 
    lastChecked: new Date(Date.now() - 300000).toISOString(), trend: 'Stable',
    historicalData: [
      { date: new Date(Date.now() - 86400000 * 7).toISOString(), value: 60 },
      { date: new Date(Date.now() - 86400000 * 3).toISOString(), value: 62 },
      { date: new Date().toISOString(), value: 65 },
    ]
  },
  { 
    id: 'CAP002', resourceName: 'MainDB', type: 'Database', metric: 'Disk Space', 
    currentValue: 88, unit: '%', warningThreshold: 85, criticalThreshold: 90, 
    lastChecked: new Date(Date.now() - 600000).toISOString(), trend: 'Increasing', 
    notes: 'Weekly data growth 2%, nearing critical threshold.',
    historicalData: [
      { date: new Date(Date.now() - 86400000 * 30).toISOString(), value: 75 },
      { date: new Date(Date.now() - 86400000 * 15).toISOString(), value: 82 },
      { date: new Date().toISOString(), value: 88 },
    ]
  },
  { 
    id: 'CAP003', resourceName: 'NetworkSwitch01', type: 'Network', metric: 'Network I/O', 
    currentValue: 350, unit: 'Mbps', warningThreshold: 700, criticalThreshold: 900, 
    lastChecked: new Date(Date.now() - 120000).toISOString(), trend: 'Stable',
  },
  { 
    id: 'CAP004', resourceName: 'CRM Application', type: 'Application Component', metric: 'Transaction per Second', 
    currentValue: 120, unit: 'TPS', warningThreshold: 180, criticalThreshold: 220, 
    lastChecked: new Date(Date.now() - 180000).toISOString(), trend: 'Stable',
    historicalData: [
      { date: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), value: 110 },
      { date: new Date(Date.now() - 3600000 * 24).toISOString(), value: 115 },
      { date: new Date().toISOString(), value: 120 },
    ]
  },
   { 
    id: 'CAP005', resourceName: 'FileServer ShareX', type: 'Storage', metric: 'Disk Space', 
    currentValue: 92, unit: '%', warningThreshold: 80, criticalThreshold: 90, 
    lastChecked: new Date().toISOString(), trend: 'Increasing', 
    notes: 'CRITICAL: Disk space almost full. Immediate action required.',
    historicalData: [
      { date: new Date(Date.now() - 86400000 * 10).toISOString(), value: 85 },
      { date: new Date(Date.now() - 86400000 * 5).toISOString(), value: 89 },
      { date: new Date().toISOString(), value: 92 },
    ]
  },
];
export const getMonitoredResources = async (): Promise<MonitoredResource[]> => { 
  await simulateDelay(300); 
  return [...mockMonitoredResources]; 
};

export const addMonitoredResource = async (resourceData: Omit<MonitoredResource, 'id'>, currentUser: { userId: string, username: string }): Promise<MonitoredResource> => {
  await simulateDelay(300);
  const newResource: MonitoredResource = {
    ...resourceData,
    id: generateId('CAPMR'),
    lastChecked: new Date().toISOString(), // Set lastChecked on creation
  };
  mockMonitoredResources.push(newResource);
  addAuditLog({ userId: currentUser.userId, username: currentUser.username, action: '監視リソース追加', details: `新規監視リソース: ${newResource.resourceName} (タイプ: ${newResource.type}, メトリック: ${newResource.metric})` });
  return newResource;
};

export const updateMonitoredResource = async (id: string, updates: Partial<MonitoredResource>, currentUser: { userId: string, username: string }): Promise<MonitoredResource> => {
  await simulateDelay(300);
  mockMonitoredResources = mockMonitoredResources.map(resource =>
    resource.id === id ? { ...resource, ...updates, lastChecked: new Date().toISOString() } : resource
  );
  const updatedResource = mockMonitoredResources.find(resource => resource.id === id);
  if (!updatedResource) throw new Error('監視リソースが見つかりません');
  addAuditLog({ userId: currentUser.userId, username: currentUser.username, action: '監視リソース更新', details: `監視リソース「${updatedResource.resourceName}」(ID: ${updatedResource.id})が更新されました。` });
  return updatedResource;
};

export const deleteMonitoredResource = async (id: string, currentUser: { userId: string, username: string }): Promise<void> => {
  await simulateDelay(300);
  const resourceToDelete = mockMonitoredResources.find(resource => resource.id === id);
  mockMonitoredResources = mockMonitoredResources.filter(resource => resource.id !== id);
  if (resourceToDelete) {
    addAuditLog({ userId: currentUser.userId, username: currentUser.username, action: '監視リソース削除', details: `監視リソース「${resourceToDelete.resourceName}」(ID: ${id})が削除されました。` });
  }
};


// --- Availability Management ---
let mockAvailabilityRecords: AvailabilityRecord[] = [
  { 
    id: 'AVL001', 
    serviceId: 'SRV_EMAIL',
    serviceName: 'メールサービス (Exchange Online)', 
    importance: ServiceImportance.CRITICAL,
    currentStatus: CurrentServiceStatus.OPERATIONAL,
    targetUptimePercentage: 99.9,
    actualUptimePercentage: 99.95,
    totalDowntimeMinutes: 22,
    plannedDowntimeMinutes: 0,
    unplannedDowntimeMinutes: 22,
    numberOfOutages: 1,
    mtbfHours: 720,
    mttrHours: 0.36,
    lastIncidentId: 'INC001',
    lastIncidentDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    nextMaintenanceDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    historicalUptime: [
      { date: '2024-01', uptimePercentage: 99.98 },
      { date: '2024-02', uptimePercentage: 99.9 },
      { date: '2024-03', uptimePercentage: 100 },
      { date: '2024-04', uptimePercentage: 99.85 },
      { date: '2024-05', uptimePercentage: 99.95 },
      { date: '2024-06', uptimePercentage: 99.95 },
    ],
    relatedSlaId: 'SLA001',
    lastRefreshed: new Date().toISOString(),
    notes: '月初の小規模障害から回復。現在は安定稼働中。'
  },
  { 
    id: 'AVL002', 
    serviceId: 'SRV_PORTAL',
    serviceName: '社内ポータル', 
    importance: ServiceImportance.HIGH,
    currentStatus: CurrentServiceStatus.DEGRADED,
    targetUptimePercentage: 99.5,
    actualUptimePercentage: 99.3,
    totalDowntimeMinutes: 302,
    plannedDowntimeMinutes: 60,
    unplannedDowntimeMinutes: 242,
    numberOfOutages: 3,
    mtbfHours: 200,
    mttrHours: 1.34,
    lastIncidentId: 'INC008_PORTAL',
    lastIncidentDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    nextMaintenanceDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    historicalUptime: [
      { date: '2024-01', uptimePercentage: 99.8 },
      { date: '2024-02', uptimePercentage: 99.5 },
      { date: '2024-03', uptimePercentage: 99.6 },
      { date: '2024-04', uptimePercentage: 99.3 },
      { date: '2024-05', uptimePercentage: 99.2 },
      { date: '2024-06', uptimePercentage: 99.3 },
    ],
    relatedSlaId: 'SLA003',
    lastRefreshed: new Date().toISOString(),
    notes: '応答速度低下が確認されています。調査中。'
  },
  { 
    id: 'AVL003', 
    serviceId: 'SRV_SAP',
    serviceName: '基幹システム (SAP)', 
    importance: ServiceImportance.CRITICAL,
    currentStatus: CurrentServiceStatus.MAINTENANCE,
    targetUptimePercentage: 99.8,
    actualUptimePercentage: 99.85,
    totalDowntimeMinutes: 240,
    plannedDowntimeMinutes: 240,
    unplannedDowntimeMinutes: 0,
    numberOfOutages: 0,
    mtbfHours: 1440,
    mttrHours: 0,
    nextMaintenanceDate: new Date(Date.now() + 3600000 * 2).toISOString(),
    historicalUptime: [
      { date: '2024-01', uptimePercentage: 99.9 },
      { date: '2024-02', uptimePercentage: 99.85 },
      { date: '2024-03', uptimePercentage: 99.92 },
      { date: '2024-04', uptimePercentage: 99.88 },
      { date: '2024-05', uptimePercentage: 99.8 },
      { date: '2024-06', uptimePercentage: 99.85 },
    ],
    relatedSlaId: 'SLA002',
    lastRefreshed: new Date().toISOString(),
    notes: '定期システムアップデートのためメンテナンス実施中。'
  },
  {
    id: 'AVL004',
    serviceId: 'SRV_WEB01',
    serviceName: '顧客ポータルサイト',
    importance: ServiceImportance.CRITICAL,
    currentStatus: CurrentServiceStatus.OPERATIONAL,
    targetUptimePercentage: 99.9,
    actualUptimePercentage: 99.92,
    totalDowntimeMinutes: 35,
    plannedDowntimeMinutes: 20,
    unplannedDowntimeMinutes: 15,
    numberOfOutages: 1,
    mtbfHours: 600,
    mttrHours: 0.25,
    lastIncidentDate: new Date(Date.now() - 86400000 * 8).toISOString(),
    nextMaintenanceDate: new Date(Date.now() + 86400000 * 14).toISOString(),
    historicalUptime: [
      { date: '2024-01', uptimePercentage: 99.95 },
      { date: '2024-02', uptimePercentage: 99.88 },
      { date: '2024-03', uptimePercentage: 99.98 },
      { date: '2024-04', uptimePercentage: 99.9 },
      { date: '2024-05', uptimePercentage: 99.94 },
      { date: '2024-06', uptimePercentage: 99.92 },
    ],
    relatedSlaId: 'SLA004',
    lastRefreshed: new Date().toISOString(),
    notes: '顧客向けサービス。高可用性を維持中。'
  },
  {
    id: 'AVL005',
    serviceId: 'SRV_DB01',
    serviceName: 'データベースサーバー (Oracle)',
    importance: ServiceImportance.CRITICAL,
    currentStatus: CurrentServiceStatus.OPERATIONAL,
    targetUptimePercentage: 99.95,
    actualUptimePercentage: 99.97,
    totalDowntimeMinutes: 13,
    plannedDowntimeMinutes: 10,
    unplannedDowntimeMinutes: 3,
    numberOfOutages: 0,
    mtbfHours: 2160,
    mttrHours: 0.05,
    nextMaintenanceDate: new Date(Date.now() + 86400000 * 28).toISOString(),
    historicalUptime: [
      { date: '2024-01', uptimePercentage: 99.99 },
      { date: '2024-02', uptimePercentage: 99.96 },
      { date: '2024-03', uptimePercentage: 99.98 },
      { date: '2024-04', uptimePercentage: 99.95 },
      { date: '2024-05', uptimePercentage: 99.99 },
      { date: '2024-06', uptimePercentage: 99.97 },
    ],
    relatedSlaId: 'SLA005',
    lastRefreshed: new Date().toISOString(),
    notes: 'ミッションクリティカルなデータベース。優秀な稼働率。'
  },
  {
    id: 'AVL006',
    serviceId: 'SRV_API01',
    serviceName: 'APIゲートウェイ',
    importance: ServiceImportance.HIGH,
    currentStatus: CurrentServiceStatus.OPERATIONAL,
    targetUptimePercentage: 99.5,
    actualUptimePercentage: 99.78,
    totalDowntimeMinutes: 95,
    plannedDowntimeMinutes: 60,
    unplannedDowntimeMinutes: 35,
    numberOfOutages: 2,
    mtbfHours: 360,
    mttrHours: 0.29,
    lastIncidentDate: new Date(Date.now() - 86400000 * 12).toISOString(),
    nextMaintenanceDate: new Date(Date.now() + 86400000 * 21).toISOString(),
    historicalUptime: [
      { date: '2024-01', uptimePercentage: 99.8 },
      { date: '2024-02', uptimePercentage: 99.7 },
      { date: '2024-03', uptimePercentage: 99.85 },
      { date: '2024-04', uptimePercentage: 99.6 },
      { date: '2024-05', uptimePercentage: 99.75 },
      { date: '2024-06', uptimePercentage: 99.78 },
    ],
    relatedSlaId: 'SLA006',
    lastRefreshed: new Date().toISOString(),
    notes: '外部連携API。負荷分散により安定性向上。'
  },
  {
    id: 'AVL007',
    serviceId: 'SRV_AUTH',
    serviceName: '認証サーバー (Active Directory)',
    importance: ServiceImportance.CRITICAL,
    currentStatus: CurrentServiceStatus.OPERATIONAL,
    targetUptimePercentage: 99.9,
    actualUptimePercentage: 99.88,
    totalDowntimeMinutes: 52,
    plannedDowntimeMinutes: 30,
    unplannedDowntimeMinutes: 22,
    numberOfOutages: 1,
    mtbfHours: 720,
    mttrHours: 0.37,
    lastIncidentDate: new Date(Date.now() - 86400000 * 6).toISOString(),
    nextMaintenanceDate: new Date(Date.now() + 86400000 * 35).toISOString(),
    historicalUptime: [
      { date: '2024-01', uptimePercentage: 99.95 },
      { date: '2024-02', uptimePercentage: 99.9 },
      { date: '2024-03', uptimePercentage: 99.93 },
      { date: '2024-04', uptimePercentage: 99.85 },
      { date: '2024-05', uptimePercentage: 99.9 },
      { date: '2024-06', uptimePercentage: 99.88 },
    ],
    relatedSlaId: 'SLA007',
    lastRefreshed: new Date().toISOString(),
    notes: '全社認証基盤。冗長化対応済み。'
  },
  {
    id: 'AVL008',
    serviceId: 'SRV_FILE',
    serviceName: 'ファイルサーバー',
    importance: ServiceImportance.MEDIUM,
    currentStatus: CurrentServiceStatus.OPERATIONAL,
    targetUptimePercentage: 99.0,
    actualUptimePercentage: 99.45,
    totalDowntimeMinutes: 238,
    plannedDowntimeMinutes: 180,
    unplannedDowntimeMinutes: 58,
    numberOfOutages: 2,
    mtbfHours: 360,
    mttrHours: 0.48,
    lastIncidentDate: new Date(Date.now() - 86400000 * 4).toISOString(),
    nextMaintenanceDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    historicalUptime: [
      { date: '2024-01', uptimePercentage: 99.2 },
      { date: '2024-02', uptimePercentage: 99.1 },
      { date: '2024-03', uptimePercentage: 99.6 },
      { date: '2024-04', uptimePercentage: 99.3 },
      { date: '2024-05', uptimePercentage: 99.5 },
      { date: '2024-06', uptimePercentage: 99.45 },
    ],
    relatedSlaId: 'SLA008',
    lastRefreshed: new Date().toISOString(),
    notes: '社内ファイル共有。容量拡張予定。'
  },
  {
    id: 'AVL009',
    serviceId: 'SRV_MOBILE',
    serviceName: 'モバイルアプリケーション',
    importance: ServiceImportance.HIGH,
    currentStatus: CurrentServiceStatus.OPERATIONAL,
    targetUptimePercentage: 99.5,
    actualUptimePercentage: 99.68,
    totalDowntimeMinutes: 138,
    plannedDowntimeMinutes: 120,
    unplannedDowntimeMinutes: 18,
    numberOfOutages: 1,
    mtbfHours: 720,
    mttrHours: 0.3,
    lastIncidentDate: new Date(Date.now() - 86400000 * 15).toISOString(),
    nextMaintenanceDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    historicalUptime: [
      { date: '2024-01', uptimePercentage: 99.5 },
      { date: '2024-02', uptimePercentage: 99.8 },
      { date: '2024-03', uptimePercentage: 99.7 },
      { date: '2024-04', uptimePercentage: 99.6 },
      { date: '2024-05', uptimePercentage: 99.75 },
      { date: '2024-06', uptimePercentage: 99.68 },
    ],
    relatedSlaId: 'SLA009',
    lastRefreshed: new Date().toISOString(),
    notes: '営業・フィールド業務用。新機能追加中。'
  },
  {
    id: 'AVL010',
    serviceId: 'SRV_CHAT',
    serviceName: 'チャットシステム (Teams)',
    importance: ServiceImportance.MEDIUM,
    currentStatus: CurrentServiceStatus.OPERATIONAL,
    targetUptimePercentage: 99.0,
    actualUptimePercentage: 99.8,
    totalDowntimeMinutes: 86,
    plannedDowntimeMinutes: 60,
    unplannedDowntimeMinutes: 26,
    numberOfOutages: 1,
    mtbfHours: 720,
    mttrHours: 0.43,
    lastIncidentDate: new Date(Date.now() - 86400000 * 20).toISOString(),
    nextMaintenanceDate: new Date(Date.now() + 86400000 * 25).toISOString(),
    historicalUptime: [
      { date: '2024-01', uptimePercentage: 99.9 },
      { date: '2024-02', uptimePercentage: 99.7 },
      { date: '2024-03', uptimePercentage: 99.85 },
      { date: '2024-04', uptimePercentage: 99.6 },
      { date: '2024-05', uptimePercentage: 99.9 },
      { date: '2024-06', uptimePercentage: 99.8 },
    ],
    relatedSlaId: 'SLA010',
    lastRefreshed: new Date().toISOString(),
    notes: '社内コミュニケーション。Microsoft 365統合。'
  },
  {
    id: 'AVL011',
    serviceId: 'SRV_BACKUP',
    serviceName: 'バックアップシステム',
    importance: ServiceImportance.HIGH,
    currentStatus: CurrentServiceStatus.OPERATIONAL,
    targetUptimePercentage: 99.5,
    actualUptimePercentage: 99.92,
    totalDowntimeMinutes: 35,
    plannedDowntimeMinutes: 30,
    unplannedDowntimeMinutes: 5,
    numberOfOutages: 0,
    mtbfHours: 1440,
    mttrHours: 0.08,
    nextMaintenanceDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    historicalUptime: [
      { date: '2024-01', uptimePercentage: 99.95 },
      { date: '2024-02', uptimePercentage: 99.9 },
      { date: '2024-03', uptimePercentage: 99.98 },
      { date: '2024-04', uptimePercentage: 99.85 },
      { date: '2024-05', uptimePercentage: 99.95 },
      { date: '2024-06', uptimePercentage: 99.92 },
    ],
    relatedSlaId: 'SLA011',
    lastRefreshed: new Date().toISOString(),
    notes: '災害対策・データ保護。自動バックアップ稼働中。'
  },
  {
    id: 'AVL012',
    serviceId: 'SRV_MONITOR',
    serviceName: '監視システム (Zabbix)',
    importance: ServiceImportance.HIGH,
    currentStatus: CurrentServiceStatus.OPERATIONAL,
    targetUptimePercentage: 99.5,
    actualUptimePercentage: 99.95,
    totalDowntimeMinutes: 22,
    plannedDowntimeMinutes: 20,
    unplannedDowntimeMinutes: 2,
    numberOfOutages: 0,
    mtbfHours: 2160,
    mttrHours: 0.03,
    nextMaintenanceDate: new Date(Date.now() + 86400000 * 14).toISOString(),
    historicalUptime: [
      { date: '2024-01', uptimePercentage: 99.98 },
      { date: '2024-02', uptimePercentage: 99.92 },
      { date: '2024-03', uptimePercentage: 99.96 },
      { date: '2024-04', uptimePercentage: 99.9 },
      { date: '2024-05', uptimePercentage: 99.98 },
      { date: '2024-06', uptimePercentage: 99.95 },
    ],
    relatedSlaId: 'SLA012',
    lastRefreshed: new Date().toISOString(),
    notes: 'インフラ監視基盤。24時間365日監視体制。'
  },
  {
    id: 'AVL013',
    serviceId: 'SRV_DNS',
    serviceName: 'DNSサーバー',
    importance: ServiceImportance.CRITICAL,
    currentStatus: CurrentServiceStatus.OPERATIONAL,
    targetUptimePercentage: 99.9,
    actualUptimePercentage: 99.99,
    totalDowntimeMinutes: 4,
    plannedDowntimeMinutes: 0,
    unplannedDowntimeMinutes: 4,
    numberOfOutages: 1,
    mtbfHours: 720,
    mttrHours: 0.07,
    lastIncidentDate: new Date(Date.now() - 86400000 * 25).toISOString(),
    nextMaintenanceDate: new Date(Date.now() + 86400000 * 60).toISOString(),
    historicalUptime: [
      { date: '2024-01', uptimePercentage: 100 },
      { date: '2024-02', uptimePercentage: 99.98 },
      { date: '2024-03', uptimePercentage: 100 },
      { date: '2024-04', uptimePercentage: 99.95 },
      { date: '2024-05', uptimePercentage: 100 },
      { date: '2024-06', uptimePercentage: 99.99 },
    ],
    relatedSlaId: 'SLA013',
    lastRefreshed: new Date().toISOString(),
    notes: 'ネットワーク基盤。冗長化構成で高可用性実現。'
  },
  {
    id: 'AVL014',
    serviceId: 'SRV_VPN',
    serviceName: 'VPNサーバー',
    importance: ServiceImportance.MEDIUM,
    currentStatus: CurrentServiceStatus.OPERATIONAL,
    targetUptimePercentage: 99.0,
    actualUptimePercentage: 99.65,
    totalDowntimeMinutes: 151,
    plannedDowntimeMinutes: 120,
    unplannedDowntimeMinutes: 31,
    numberOfOutages: 2,
    mtbfHours: 360,
    mttrHours: 0.26,
    lastIncidentDate: new Date(Date.now() - 86400000 * 10).toISOString(),
    nextMaintenanceDate: new Date(Date.now() + 86400000 * 18).toISOString(),
    historicalUptime: [
      { date: '2024-01', uptimePercentage: 99.8 },
      { date: '2024-02', uptimePercentage: 99.5 },
      { date: '2024-03', uptimePercentage: 99.7 },
      { date: '2024-04', uptimePercentage: 99.4 },
      { date: '2024-05', uptimePercentage: 99.6 },
      { date: '2024-06', uptimePercentage: 99.65 },
    ],
    relatedSlaId: 'SLA014',
    lastRefreshed: new Date().toISOString(),
    notes: 'リモートワーク用接続。負荷分散対応済み。'
  },
  {
    id: 'AVL015',
    serviceId: 'SRV_PRINT',
    serviceName: '印刷サーバー',
    importance: ServiceImportance.LOW,
    currentStatus: CurrentServiceStatus.OPERATIONAL,
    targetUptimePercentage: 98.0,
    actualUptimePercentage: 98.9,
    totalDowntimeMinutes: 475,
    plannedDowntimeMinutes: 300,
    unplannedDowntimeMinutes: 175,
    numberOfOutages: 4,
    mtbfHours: 180,
    mttrHours: 0.73,
    lastIncidentDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    nextMaintenanceDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    historicalUptime: [
      { date: '2024-01', uptimePercentage: 98.5 },
      { date: '2024-02', uptimePercentage: 98.2 },
      { date: '2024-03', uptimePercentage: 99.1 },
      { date: '2024-04', uptimePercentage: 98.8 },
      { date: '2024-05', uptimePercentage: 98.6 },
      { date: '2024-06', uptimePercentage: 98.9 },
    ],
    relatedSlaId: 'SLA015',
    lastRefreshed: new Date().toISOString(),
    notes: '複合機・プリンター管理。ハードウェア更新予定。'
  },
];

export const getAvailabilityRecords = async (): Promise<AvailabilityRecord[]> => { 
  await simulateDelay(300); 
  return [...mockAvailabilityRecords].map(r => ({
    ...r, // simulate dynamic calculation if not stored
    unplannedDowntimeMinutes: (r.totalDowntimeMinutes || 0) - (r.plannedDowntimeMinutes || 0)
  }));
};

export const addAvailabilityRecord = async (recordData: Omit<AvailabilityRecord, 'id'|'lastRefreshed'>, currentUser: { userId: string, username: string }): Promise<AvailabilityRecord> => {
  await simulateDelay(300);
  const newRecord: AvailabilityRecord = {
    ...recordData,
    id: generateId('AVL'),
    lastRefreshed: new Date().toISOString(),
  };
  mockAvailabilityRecords.push(newRecord);
  addAuditLog({ userId: currentUser.userId, username: currentUser.username, action: '可用性記録作成', details: `新規可用性記録: ${newRecord.serviceName} (ID: ${newRecord.id})` });
  return newRecord;
};

export const updateAvailabilityRecord = async (id: string, updates: Partial<AvailabilityRecord>, currentUser: { userId: string, username: string }): Promise<AvailabilityRecord> => {
  await simulateDelay(300);
  mockAvailabilityRecords = mockAvailabilityRecords.map(record =>
    record.id === id ? { ...record, ...updates, lastRefreshed: new Date().toISOString() } : record
  );
  const updatedRecord = mockAvailabilityRecords.find(record => record.id === id);
  if (!updatedRecord) throw new Error('可用性記録が見つかりません');
  addAuditLog({ userId: currentUser.userId, username: currentUser.username, action: '可用性記録更新', details: `可用性記録「${updatedRecord.serviceName}」(ID: ${updatedRecord.id})が更新されました。` });
  return updatedRecord;
};

export const deleteAvailabilityRecord = async (id: string, currentUser: { userId: string, username: string }): Promise<void> => {
  await simulateDelay(300);
  const recordToDelete = mockAvailabilityRecords.find(record => record.id === id);
  mockAvailabilityRecords = mockAvailabilityRecords.filter(record => record.id !== id);
  if (recordToDelete) {
    addAuditLog({ userId: currentUser.userId, username: currentUser.username, action: '可用性記録削除', details: `可用性記録「${recordToDelete.serviceName}」(ID: ${id})が削除されました。` });
  }
};


// Security Management - Vulnerabilities
let mockVulnerabilities: Vulnerability[] = [
    { id: 'VUL001', cveId: 'CVE-2023-12345', title: 'Apache Strutsリモートコード実行脆弱性', description: '特定の入力処理における脆弱性により、リモートでコードが実行される可能性。', severity: 'Critical', status: ItemStatus.IDENTIFIED, affectedAssets: ['WebServer01', 'WebServer02'], discoveredDate: new Date(Date.now() - 86400000 * 5).toISOString(), assignedTo: 'security.team', updatedAt: new Date().toISOString(), remediationPlan: 'パッチバージョン2.x.xへ更新' },
    { id: 'VUL002', title: '期限切れSSL証明書', description: 'portal.example.comのSSL証明書が期限切れ。', severity: 'High', status: ItemStatus.IN_PROGRESS, affectedAssets: ['portal.example.com'], discoveredDate: new Date(Date.now() - 86400000 * 1).toISOString(), assignedTo: 'infra.team', updatedAt: new Date().toISOString(), remediationPlan: '新しい証明書を申請・適用。' },
    { id: 'VUL003', cveId: 'CVE-2024-007', title: 'OpenSSLメモリリークの可能性', description: '特定の条件下でメモリリークが発生する恐れ。サービス停止には至らないが対応推奨。', severity: 'Medium', status: ItemStatus.IDENTIFIED, affectedAssets: ['AppServer01', 'AppServer02', 'DBServer01'], discoveredDate: new Date(Date.now() - 86400000 * 10).toISOString(), assignedTo: 'security.team', updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()},
    { id: 'VUL004', title: '推測可能な管理者パスワード', description: '開発環境のDBサーバーにデフォルトに近いパスワードが設定されている。', severity: 'High', status: ItemStatus.MITIGATED, affectedAssets: ['DevDB01'], discoveredDate: new Date(Date.now() - 86400000 * 30).toISOString(), assignedTo: 'dev.team', updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(), remediationPlan: '複雑なパスワードに変更済み。'},
    { id: 'VUL005', title: 'SQLインジェクションの可能性', description: 'レガシーCRMアプリケーションの一部機能にSQLiの懸念。', severity: 'Critical', status: ItemStatus.RESOLVED, affectedAssets: ['LegacyCRMApp'], discoveredDate: new Date(Date.now() - 86400000 * 60).toISOString(), assignedTo: 'app.dev.team', updatedAt: new Date(Date.now() - 86400000 * 15).toISOString(), remediationPlan: '入力バリデーション強化、プリペアドステートメント使用に改修。'},
];
export const getVulnerabilities = async (): Promise<Vulnerability[]> => { await simulateDelay(400); return [...mockVulnerabilities]; };
export const addVulnerability = async (data: Omit<Vulnerability, 'id'|'updatedAt'>): Promise<Vulnerability> => {
    await simulateDelay(300);
    const newItem: Vulnerability = { ...data, id: generateId('VUL'), updatedAt: new Date().toISOString() };
    mockVulnerabilities.push(newItem);
    addAuditLog({ userId: data.reportedBy || 'SYSTEM_SCAN', username: data.reportedBy || 'SYSTEM_SCAN', action: '脆弱性登録', details: `脆弱性「${newItem.title}」(ID: ${newItem.id})が登録されました。` });
    return newItem;
};
export const updateVulnerability = async (id: string, updates: Partial<Vulnerability>): Promise<Vulnerability> => {
    await simulateDelay(300);
    mockVulnerabilities = mockVulnerabilities.map(item => item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item);
    const updatedItem = mockVulnerabilities.find(item => item.id === id);
    if (!updatedItem) throw new Error('脆弱性が見つかりません');
    addAuditLog({ userId: 'SYSTEM_ADMIN', username: 'SYSTEM_ADMIN', action: '脆弱性更新', details: `脆弱性「${updatedItem.title}」(ID: ${updatedItem.id})が更新されました。` });
    return updatedItem;
};
export const deleteVulnerability = async (id: string, currentUser: { userId: string, username: string }): Promise<void> => {
    await simulateDelay(300);
    const itemToDelete = mockVulnerabilities.find(item => item.id === id);
    mockVulnerabilities = mockVulnerabilities.filter(item => item.id !== id);
    if(itemToDelete) {
      addAuditLog({userId: currentUser.userId, username: currentUser.username, action: '脆弱性削除', details: `脆弱性「${itemToDelete.title}」(ID: ${id})が削除されました。`});
    }
};

// Security Management - Alerts
let mockSecurityAlerts: SecurityAlert[] = [
  { id: 'SECALERT001', timestamp: new Date(Date.now() - 3600000).toISOString(), description: 'ファイアウォール: 外部からのポートスキャン試行を検知 (IP: 123.45.67.89)', severity: SecurityAlertSeverity.MEDIUM, source: 'Firewall-Main', status: 'New', assignedTo: 'security.ops' },
  { id: 'SECALERT002', timestamp: new Date(Date.now() - 7200000 * 2).toISOString(), description: 'IDS: 既知のマルウェアシグネチャと一致する通信をブロック (端末: PC0123)', severity: SecurityAlertSeverity.HIGH, source: 'IDS-Core', status: 'Investigating', assignedTo: 'security.ops' },
  { id: 'SECALERT003', timestamp: new Date(Date.now() - 60000 * 30).toISOString(), description: 'SIEM: 通常業務時間外に特権アカウントによるログイン試行 (ユーザー: root@server01)', severity: SecurityAlertSeverity.CRITICAL, source: 'SIEM-Syslog', status: 'New' },
];
export const getSecurityAlerts = async (): Promise<SecurityAlert[]> => {
  await simulateDelay(250);
  return [...mockSecurityAlerts].filter(a => a.status === 'New' || a.status === 'Investigating').sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

// Security Management - Incidents
let mockSecurityIncidents: SecurityIncident[] = [
  { id: 'SECINC001', title: 'フィッシングメールによる情報漏洩の疑い', description: '経理部員Aがフィッシングメールのリンクをクリックし、認証情報を入力した可能性。', status: SecurityIncidentStatus.ANALYZING, severity: SecurityAlertSeverity.HIGH, reportedBy: 'self.report', reportedAt: new Date(Date.now() - 86400000 * 1).toISOString(), assignedTo: 'csirt.team', attackVector: 'Phishing', affectedSystems: ['Outlook', 'AD Account - UserA'], updatedAt: new Date().toISOString() },
  { id: 'SECINC002', title: '開発サーバーへの不正アクセス試行', description: '海外IPアドレスからのSSHブルートフォース攻撃を複数回検知。アクセスは未成功。', status: SecurityIncidentStatus.CLOSED, severity: SecurityAlertSeverity.MEDIUM, reportedBy: 'IDS-DevEnv', reportedAt: new Date(Date.now() - 86400000 * 3).toISOString(), assignedTo: 'csirt.team', attackVector: 'Brute-force', actionsTaken: '対象IPをファイアウォールでブロック。パスワードポリシー強化を推奨。', updatedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
];
export const getSecurityIncidents = async (): Promise<SecurityIncident[]> => {
  await simulateDelay(300);
  return [...mockSecurityIncidents].sort((a,b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
};
export const addSecurityIncident = async (data: Omit<SecurityIncident, 'id'|'reportedAt'|'updatedAt'>, currentUser: { userId: string, username: string }): Promise<SecurityIncident> => {
  await simulateDelay(300);
  const now = new Date().toISOString();
  const newItem: SecurityIncident = {
    ...data,
    id: generateId('SECINC'),
    reportedAt: now,
    updatedAt: now,
    reportedBy: data.reportedBy || currentUser.username,
    status: data.status || SecurityIncidentStatus.NEW,
    severity: data.severity || SecurityAlertSeverity.MEDIUM,
  };
  mockSecurityIncidents.push(newItem);
  addAuditLog({ userId: currentUser.userId, username: currentUser.username, action: 'セキュリティインシデント報告', details: `セキュリティインシデント「${newItem.title}」(ID: ${newItem.id})が報告されました。` });
  return newItem;
};


// Compliance Management
let mockComplianceControls: ComplianceControl[] = [
    { 
      id: 'CMP001', controlId: 'ISO-A.9.4.1', name: '情報アクセス制限', 
      description: '業務上必要な情報へのアクセスのみを許可する。', 
      standard: 'ISO 27001', category: 'アクセス制御', 
      status: ItemStatus.COMPLIANT, 
      lastAuditDate: new Date(Date.now() - 86400000 * 180).toISOString(), 
      nextAuditDate: new Date(Date.now() + 86400000 * 180).toISOString(),
      riskLevel: ComplianceRiskLevel.LOW,
      capStatus: ItemStatus.CLOSED 
    },
    { 
      id: 'CMP002', controlId: 'PCI-REQ-8.2', name: '多要素認証(MFA)', 
      description: '管理者アクセスおよびリモートアクセスにはMFAを必須とする。', 
      standard: 'PCI DSS', category: 'アクセス制御', 
      status: ItemStatus.IN_REVIEW, 
      nextAuditDate: new Date(Date.now() + 86400000 * 90).toISOString(),
      riskLevel: ComplianceRiskLevel.MEDIUM,
    },
    { 
      id: 'CMP003', controlId: 'GDPR-Art.32', name: 'データ処理のセキュリティ', 
      description: '個人データの処理における適切な技術的および組織的措置を講じる。', 
      standard: 'GDPR', category: 'データ保護', 
      status: ItemStatus.NON_COMPLIANT, 
      lastAuditDate: new Date(Date.now() - 86400000 * 30).toISOString(), 
      nextAuditDate: new Date(Date.now() + 86400000 * 150).toISOString(),
      riskLevel: ComplianceRiskLevel.HIGH,
      capStatus: ItemStatus.IN_PROGRESS,
      notes: '一部システムで暗号化が不十分。是正措置計画進行中。'
    },
];

let mockComplianceAudits: ComplianceAudit[] = [
  { id: 'AUD001', auditName: 'ISO 27001 内部監査 2024上半期', standard: 'ISO 27001', type: ComplianceAuditType.INTERNAL, scheduledStartDate: new Date(Date.now() - 86400000 * 45).toISOString(), actualStartDate: new Date(Date.now() - 86400000 * 40).toISOString(), actualEndDate: new Date(Date.now() - 86400000 * 30).toISOString(), status: ComplianceAuditStatus.COMPLETED, leadAuditor: 'compliance.lead', findingsCount: 3, openFindingsCount: 1 },
  { id: 'AUD002', auditName: 'PCI DSS 外部審査準備', standard: 'PCI DSS', type: ComplianceAuditType.EXTERNAL, scheduledStartDate: new Date(Date.now() + 86400000 * 30).toISOString(), status: ComplianceAuditStatus.PLANNED, leadAuditor: 'external.auditor.co' },
  { id: 'AUD003', auditName: '社内規定遵守状況 年次確認', standard: '社内規定 XYZ', type: ComplianceAuditType.INTERNAL, scheduledStartDate: new Date(Date.now() + 86400000 * 60).toISOString(), status: ComplianceAuditStatus.PLANNED, leadAuditor: 'internal.audit.team' },
];

let mockComplianceRiskItems: ComplianceRiskItem[] = [
  { id: 'CRISK001', riskDescription: 'GDPR要件未対応による制裁金リスク', relatedControlId: 'CMP003', relatedStandard: 'GDPR', likelihood: ComplianceRiskLevel.MEDIUM, impact: ComplianceRiskLevel.HIGH, overallRisk: ComplianceRiskLevel.HIGH, mitigationPlan: 'データ暗号化プロジェクトの推進、DPOによるレビュー体制強化。', responsibleTeam: 'data.privacy.team', status: ComplianceRiskStatus.MITIGATING, dueDate: new Date(Date.now() + 86400000 * 90).toISOString() },
  { id: 'CRISK002', riskDescription: 'MFA未導入の特権アカウント存在による不正アクセスリスク', relatedControlId: 'CMP002', relatedStandard: 'PCI DSS', likelihood: ComplianceRiskLevel.HIGH, impact: ComplianceRiskLevel.CRITICAL, overallRisk: ComplianceRiskLevel.CRITICAL, mitigationPlan: '全特権アカウントへのMFA適用完了を目指す。', responsibleTeam: 'security.team', status: ComplianceRiskStatus.OPEN, dueDate: new Date(Date.now() + 86400000 * 30).toISOString() },
];


export const getComplianceControls = async (): Promise<ComplianceControl[]> => { await simulateDelay(400); return [...mockComplianceControls]; };
export const addComplianceControl = async (data: Omit<ComplianceControl, 'id'>): Promise<ComplianceControl> => {
    await simulateDelay(300);
    const newItem: ComplianceControl = { ...data, id: generateId('CMP') };
    mockComplianceControls.push(newItem);
    addAuditLog({ userId: 'COMPLIANCE_OFFICER', username: 'COMPLIANCE_OFFICER', action: 'コンプライアンス統制登録', details: `統制「${newItem.name}」(ID: ${newItem.id})が登録されました。` });
    return newItem;
};
export const updateComplianceControl = async (id: string, updates: Partial<ComplianceControl>): Promise<ComplianceControl> => {
    await simulateDelay(300);
    mockComplianceControls = mockComplianceControls.map(item => item.id === id ? { ...item, ...updates } : item);
    const updatedItem = mockComplianceControls.find(item => item.id === id);
    if (!updatedItem) throw new Error('コンプライアンス統制が見つかりません');
    addAuditLog({ userId: 'COMPLIANCE_OFFICER', username: 'COMPLIANCE_OFFICER', action: 'コンプライアンス統制更新', details: `統制「${updatedItem.name}」(ID: ${updatedItem.id})が更新されました。` });
    return updatedItem;
};
export const deleteComplianceControl = async (id: string): Promise<void> => {
    await simulateDelay(300);
    const itemToDelete = mockComplianceControls.find(item => item.id === id);
    mockComplianceControls = mockComplianceControls.filter(item => item.id !== id);
    if(itemToDelete) {
      addAuditLog({userId: 'SYSTEM_ADMIN', username: 'SYSTEM_ADMIN', action: 'コンプライアンス統制削除', details: `統制「${itemToDelete.name}」(ID: ${id})が削除されました。`});
    }
};

export const getComplianceAudits = async (): Promise<ComplianceAudit[]> => {
  await simulateDelay(300);
  return [...mockComplianceAudits].sort((a,b) => new Date(b.scheduledStartDate).getTime() - new Date(a.scheduledStartDate).getTime());
};

export const getComplianceRiskItems = async (): Promise<ComplianceRiskItem[]> => {
  await simulateDelay(300);
  return [...mockComplianceRiskItems].sort((a,b) => {
    const riskOrder: Record<ComplianceRiskLevel, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    return riskOrder[b.overallRisk] - riskOrder[a.overallRisk];
  });
};


// --- Dashboard Specific Services ---
export const getServiceStatuses = async (): Promise<ServiceStatusItem[]> => {
  await simulateDelay(300);
  // Simulate some random status changes for demo
  mockServiceStatuses = mockServiceStatuses.map(s => ({
    ...s,
    status: Math.random() < 0.1 ? ServiceHealthStatus.WARNING : s.status === ServiceHealthStatus.MAINTENANCE ? s.status : ServiceHealthStatus.NORMAL,
    lastChecked: new Date().toISOString()
  }));
  return [...mockServiceStatuses];
};

export const refreshServiceStatuses = async (): Promise<ServiceStatusItem[]> => {
  addAuditLog({userId: 'SYSTEM', username: 'SYSTEM', action: 'サービスステータス更新', details: 'ダッシュボードのサービスステータスが手動で更新されました。'});
  return getServiceStatuses(); // Just re-fetch with potential random changes
};

export const getActiveAlerts = async (): Promise<AlertItem[]> => { // For Dashboard Alerts
  await simulateDelay(350);
  return [...mockDashboardAlerts.filter(a => !a.acknowledged)];
};

export const refreshActiveAlerts = async (): Promise<AlertItem[]> => { // For Dashboard Alerts
  addAuditLog({userId: 'SYSTEM', username: 'SYSTEM', action: '重要アラート更新', details: 'ダッシュボードの重要アラートが手動で更新されました。'});
  // Simulate some new alerts or acknowledgements
  if (Math.random() < 0.2 && mockDashboardAlerts.some(a => a.id === 'DBALERT001')) {
     const alert = mockDashboardAlerts.find(a => a.id === 'DBALERT001');
     if(alert) alert.acknowledged = true;
  }
  if (Math.random() < 0.1) {
    mockDashboardAlerts.push({
        id: generateId('DBALERT'),
        message: '新しいクリティカルアラート: VPNゲートウェイ接続エラー',
        severity: DashboardAlertSeverity.CRITICAL,
        timestamp: new Date().toISOString(),
        source: 'ネットワーク監視',
        acknowledged: false
    });
  }
  return getActiveAlerts();
};

export const acknowledgeAlert = async (alertId: string): Promise<void> => { // For Dashboard Alerts
    await simulateDelay(100);
    const alert = mockDashboardAlerts.find(a => a.id === alertId);
    if (alert) {
        alert.acknowledged = true;
        addAuditLog({userId: 'DASHBOARD_USER', username: 'DASHBOARD_USER', action: 'アラート確認', details: `ダッシュボードアラート「${alert.message.substring(0,30)}...」(ID: ${alertId}) を確認済みにしました。`});
    }
};

// --- Audit Log Management Page Specific Services ---
let mockLogSourceStatuses: LogSourceStatus[] = [
  { id: 'LSS001', systemName: 'Windows Event Log (DC01)', collectionRate: 150, status: 'Active', lastLogReceived: new Date(Date.now() - 5000).toISOString(), missingLogsPercentage: 0.1 },
  { id: 'LSS002', systemName: 'Firewall (Palo Alto)', collectionRate: 1200, status: 'Active', lastLogReceived: new Date(Date.now() - 2000).toISOString() },
  { id: 'LSS003', systemName: 'Web Server (Apache)', collectionRate: 80, status: 'Delayed', lastLogReceived: new Date(Date.now() - 60000 * 5).toISOString(), missingLogsPercentage: 1.5 },
  { id: 'LSS004', systemName: 'Database Audit (Oracle)', collectionRate: 30, status: 'Error', lastLogReceived: new Date(Date.now() - 3600000).toISOString() },
  { id: 'LSS005', systemName: 'AWS CloudTrail', collectionRate: 500, status: 'Active', lastLogReceived: new Date(Date.now() - 10000).toISOString() },
];

export const getLogSourceStatuses = async (): Promise<LogSourceStatus[]> => {
  await simulateDelay(200);
  // Simulate some small changes for realism
  mockLogSourceStatuses = mockLogSourceStatuses.map(s => ({
    ...s,
    collectionRate: s.status === 'Active' ? s.collectionRate + Math.floor(Math.random() * 10) - 5 : s.collectionRate,
    lastLogReceived: s.status === 'Active' ? new Date(Date.now() - (Math.random() * 10000 + 2000)).toISOString() : s.lastLogReceived,
  }));
  return [...mockLogSourceStatuses];
};

let mockLogStorageSummary: LogStorageSummary = {
  totalCapacityTB: 50,
  usedCapacityTB: 35.2,
  remainingRetentionDays: 180,
  averageIngestRateMBps: 5.5,
};

export const getLogStorageSummary = async (): Promise<LogStorageSummary> => {
  await simulateDelay(150);
  // Simulate slight increase in used capacity
  mockLogStorageSummary.usedCapacityTB = parseFloat((mockLogStorageSummary.usedCapacityTB + Math.random() * 0.1).toFixed(2));
  if (mockLogStorageSummary.usedCapacityTB > mockLogStorageSummary.totalCapacityTB) {
    mockLogStorageSummary.usedCapacityTB = mockLogStorageSummary.totalCapacityTB;
  }
  return { ...mockLogStorageSummary };
};

// --- セキュリティ管理 組織・ITサービスデータ ---

// 組織・部門データ
let mockDepartments: Department[] = [
  {
    id: 'DEPT001',
    name: '情報システム部',
    code: 'IT-001',
    manager: '田中 太郎',
    members: [],
    emergencyContact: {
      phone: '090-1234-5678',
      email: 'it-emergency@company.com',
      escalationPhone: '090-9999-0001'
    }
  },
  {
    id: 'DEPT002', 
    name: 'CSIRT',
    code: 'SEC-001',
    parentId: 'DEPT001',
    manager: '佐藤 花子',
    members: [],
    emergencyContact: {
      phone: '090-2345-6789',
      email: 'csirt@company.com',
      escalationPhone: '090-9999-0002'
    }
  },
  {
    id: 'DEPT003',
    name: '経営企画部',
    code: 'EXEC-001', 
    manager: '山田 一郎',
    members: [],
    emergencyContact: {
      phone: '090-3456-7890',
      email: 'executive@company.com'
    }
  },
  {
    id: 'DEPT004',
    name: '人事部',
    code: 'HR-001',
    manager: '鈴木 美香',
    members: [],
    emergencyContact: {
      phone: '090-4567-8901',
      email: 'hr@company.com'
    }
  },
  {
    id: 'DEPT005',
    name: '総務部',
    code: 'GA-001',
    manager: '高橋 次郎',
    members: [],
    emergencyContact: {
      phone: '090-5678-9012',
      email: 'general-affairs@company.com'
    }
  }
];

// 組織メンバーデータ
let mockOrganizationMembers: OrganizationMember[] = [
  {
    id: 'MEM001',
    name: '田中 太郎',
    email: 'tanaka.taro@company.com',
    phone: '090-1234-5678',
    title: 'IT部長',
    departmentId: 'DEPT001',
    isEmergencyContact: true,
    role: 'IT_ADMIN',
    notificationPreferences: { sms: true, email: true, voiceCall: true }
  },
  {
    id: 'MEM002',
    name: '佐藤 花子',
    email: 'sato.hanako@company.com',
    phone: '090-2345-6789',
    title: 'CSIRT責任者',
    departmentId: 'DEPT002',
    isEmergencyContact: true,
    role: 'CSIRT',
    notificationPreferences: { sms: true, email: true, voiceCall: true }
  },
  {
    id: 'MEM003',
    name: '山田 一郎',
    email: 'yamada.ichiro@company.com',
    phone: '090-3456-7890',
    title: '取締役CIO',
    departmentId: 'DEPT003',
    isEmergencyContact: true,
    role: 'EXECUTIVE',
    notificationPreferences: { sms: true, email: true, voiceCall: false }
  },
  {
    id: 'MEM004',
    name: '鈴木 美香',
    email: 'suzuki.mika@company.com',
    phone: '090-4567-8901',
    title: '人事部長',
    departmentId: 'DEPT004',
    isEmergencyContact: false,
    role: 'MANAGER',
    notificationPreferences: { sms: false, email: true, voiceCall: false }
  },
  {
    id: 'MEM005',
    name: '伊藤 健一',
    email: 'ito.kenichi@company.com',
    phone: '090-6789-0123',
    title: 'セキュリティアナリスト',
    departmentId: 'DEPT002',
    isEmergencyContact: true,
    role: 'SECURITY_OFFICER',
    notificationPreferences: { sms: true, email: true, voiceCall: true }
  },
  {
    id: 'MEM006',
    name: '渡辺 真由美',
    email: 'watanabe.mayumi@company.com',
    phone: '090-7890-1234',
    title: 'システム管理者',
    departmentId: 'DEPT001',
    isEmergencyContact: true,
    role: 'IT_ADMIN',
    notificationPreferences: { sms: true, email: true, voiceCall: false }
  }
];

// ITサービス・システムデータ
let mockITServices: ITService[] = [
  {
    id: 'ITS001',
    name: 'Exchange Online (メールサービス)',
    category: 'Core_Business',
    type: 'Application',
    criticality: 'Critical',
    owner: '田中 太郎',
    technicalContact: '渡辺 真由美',
    businessContact: '人事部',
    description: '全社員向けメールサービス。Office365 Exchange Online。',
    dependencies: ['ITS015', 'ITS020'], // EntraID, インターネット接続
    accessControlMethods: ['EntraID', 'SSO'],
    monitoringEndpoints: ['https://outlook.office365.com/owa/healthcheck.aspx'],
    maintenanceWindow: '土曜 02:00-06:00'
  },
  {
    id: 'ITS002',
    name: '社内ポータルサイト',
    category: 'Core_Business',
    type: 'Application',
    criticality: 'High',
    owner: '田中 太郎',
    technicalContact: '伊藤 健一',
    businessContact: '総務部',
    description: '社内情報共有・申請承認ポータル',
    dependencies: ['ITS010', 'ITS015'], // Webサーバー, EntraID
    accessControlMethods: ['EntraID', 'SSO'],
    monitoringEndpoints: ['https://portal.company.com/health'],
    maintenanceWindow: '日曜 01:00-04:00'
  },
  {
    id: 'ITS003',
    name: '基幹システム (SAP)',
    category: 'Core_Business',
    type: 'Application',
    criticality: 'Critical',
    owner: '山田 一郎',
    technicalContact: '田中 太郎',
    businessContact: '経理部',
    description: 'ERP基幹システム。会計・人事・生産管理',
    dependencies: ['ITS011', 'ITS013'], // DBサーバー, バックアップシステム
    accessControlMethods: ['LDAP', 'Local_Auth'],
    maintenanceWindow: '土曜 22:00-02:00'
  },
  {
    id: 'ITS004',
    name: '顧客ポータルサイト',
    category: 'Core_Business',
    type: 'Application',
    criticality: 'High',
    owner: '営業部',
    technicalContact: '渡辺 真由美',
    businessContact: '営業部',
    description: '顧客向けサービスポータル。注文・問い合わせ',
    dependencies: ['ITS010', 'ITS012'], // Webサーバー, CDN
    accessControlMethods: ['Local_Auth', 'SSO'],
    monitoringEndpoints: ['https://customer.company.com/api/health']
  },
  {
    id: 'ITS005',
    name: 'データベースサーバー (Oracle)',
    category: 'Infrastructure', 
    type: 'Database',
    criticality: 'Critical',
    owner: '田中 太郎',
    technicalContact: '渡辺 真由美',
    businessContact: 'IT部',
    description: 'オンプレミス Oracle Database 19c',
    dependencies: ['ITS013'], // バックアップシステム
    accessControlMethods: ['Local_Auth', 'LDAP'],
    maintenanceWindow: '日曜 02:00-06:00'
  },
  {
    id: 'ITS006',
    name: 'データベースサーバー (MySQL)',
    category: 'Infrastructure',
    type: 'Database', 
    criticality: 'High',
    owner: '田中 太郎',
    technicalContact: '伊藤 健一',
    businessContact: 'IT部',
    description: 'MySQL 8.0 クラスタ構成',
    dependencies: ['ITS013'],
    accessControlMethods: ['Local_Auth'],
    maintenanceWindow: '日曜 02:00-06:00'
  },
  {
    id: 'ITS007',
    name: 'APIゲートウェイ',
    category: 'Infrastructure',
    type: 'Network',
    criticality: 'High',
    owner: '田中 太郎',
    technicalContact: '渡辺 真由美',
    businessContact: 'IT部',
    description: 'Kong API Gateway。外部API管理',
    dependencies: ['ITS020'],
    accessControlMethods: ['API_Key', 'EntraID'],
    monitoringEndpoints: ['https://api.company.com/health']
  },
  {
    id: 'ITS008',
    name: '認証サーバー (Active Directory)',
    category: 'Infrastructure',
    type: 'Security',
    criticality: 'Critical',
    owner: '田中 太郎',
    technicalContact: '渡辺 真由美',
    businessContact: 'IT部',
    description: 'Windows Server 2019 AD。オンプレミス認証',
    dependencies: [],
    accessControlMethods: ['Local_Auth'],
    maintenanceWindow: '土曜 02:00-04:00'
  },
  {
    id: 'ITS009',
    name: 'ファイルサーバー',
    category: 'Infrastructure',
    type: 'Application',
    criticality: 'High',
    owner: '田中 太郎',
    technicalContact: '渡辺 真由美',
    businessContact: '全社',
    description: 'Windows File Server。共有ドライブ',
    dependencies: ['ITS008', 'ITS013'], // AD, バックアップ
    accessControlMethods: ['LDAP'],
    maintenanceWindow: '日曜 01:00-03:00'
  },
  {
    id: 'ITS010',
    name: 'Webサーバー (Nginx)',
    category: 'Infrastructure',
    type: 'Network',
    criticality: 'High',
    owner: '田中 太郎',
    technicalContact: '伊藤 健一',
    businessContact: 'IT部',
    description: 'Nginx リバースプロキシ・ロードバランサー',
    dependencies: ['ITS020'],
    accessControlMethods: ['Local_Auth'],
    monitoringEndpoints: ['https://lb.company.com/status']
  },
  {
    id: 'ITS011',
    name: 'データベースサーバー (PostgreSQL)',
    category: 'Infrastructure',
    type: 'Database',
    criticality: 'Medium',
    owner: '田中 太郎',
    technicalContact: '伊藤 健一',
    businessContact: 'IT部',
    description: 'PostgreSQL 13。開発・テスト環境',
    dependencies: ['ITS013'],
    accessControlMethods: ['Local_Auth'],
    maintenanceWindow: '土曜 03:00-05:00'
  },
  {
    id: 'ITS012',
    name: 'CDNサービス (CloudFlare)',
    category: 'External',
    type: 'Network',
    criticality: 'Medium',
    owner: '田中 太郎',
    technicalContact: '渡辺 真由美',
    businessContact: 'IT部',
    description: 'CloudFlare CDN。Webサイト高速化',
    dependencies: ['ITS020'],
    accessControlMethods: ['API_Key'],
    monitoringEndpoints: ['https://api.cloudflare.com/health']
  },
  {
    id: 'ITS013',
    name: 'バックアップシステム',
    category: 'Infrastructure',
    type: 'Supporting',
    criticality: 'Critical',
    owner: '田中 太郎',
    technicalContact: '渡辺 真由美',
    businessContact: 'IT部',
    description: 'Veeam Backup & Replication。全システムバックアップ',
    dependencies: [],
    accessControlMethods: ['Local_Auth'],
    maintenanceWindow: '毎日 01:00-05:00'
  },
  {
    id: 'ITS014',
    name: '監視システム (Zabbix)',
    category: 'Infrastructure',
    type: 'Monitoring',
    criticality: 'High',
    owner: '田中 太郎',
    technicalContact: '伊藤 健一',
    businessContact: 'IT部',
    description: 'Zabbix統合監視。インフラ・アプリ監視',
    dependencies: ['ITS005'], // Oracle DB
    accessControlMethods: ['Local_Auth', 'LDAP'],
    monitoringEndpoints: ['https://zabbix.company.com/health']
  },
  {
    id: 'ITS015',
    name: 'EntraID (Azure Active Directory)',
    category: 'External',
    type: 'Security',
    criticality: 'Critical',
    owner: '田中 太郎',
    technicalContact: '佐藤 花子',
    businessContact: 'IT部',
    description: 'Microsoft EntraID。クラウド統合認証',
    dependencies: ['ITS020'],
    accessControlMethods: ['EntraID', 'SSO'],
    monitoringEndpoints: ['https://graph.microsoft.com/health']
  },
  {
    id: 'ITS016',
    name: 'VPNサーバー',
    category: 'Infrastructure',
    type: 'Network',
    criticality: 'High',
    owner: '田中 太郎',
    technicalContact: '渡辺 真由美',
    businessContact: 'IT部',
    description: 'FortiGate SSL-VPN。リモートアクセス',
    dependencies: ['ITS008'], // AD認証
    accessControlMethods: ['LDAP', 'Local_Auth'],
    maintenanceWindow: '日曜 02:00-04:00'
  },
  {
    id: 'ITS017',
    name: 'Microsoft Teams',
    category: 'Core_Business',
    type: 'Application',
    criticality: 'High',
    owner: '田中 太郎',
    technicalContact: '渡辺 真由美',
    businessContact: '全社',
    description: 'Microsoft Teams。チャット・会議',
    dependencies: ['ITS015'], // EntraID
    accessControlMethods: ['EntraID', 'SSO'],
    monitoringEndpoints: ['https://admin.teams.microsoft.com/health']
  },
  {
    id: 'ITS018',
    name: 'ビデオ会議システム (Zoom)',
    category: 'Supporting',
    type: 'Application',
    criticality: 'Medium',
    owner: '総務部',
    technicalContact: '田中 太郎',
    businessContact: '全社',
    description: 'Zoom Pro。外部向け会議',
    dependencies: ['ITS020'],
    accessControlMethods: ['SSO', 'Local_Auth'],
    monitoringEndpoints: ['https://status.zoom.us/api/health']
  },
  {
    id: 'ITS019',
    name: 'ファイアウォール',
    category: 'Infrastructure',
    type: 'Security',
    criticality: 'Critical',
    owner: '田中 太郎',
    technicalContact: '佐藤 花子',
    businessContact: 'IT部',
    description: 'FortiGate次世代ファイアウォール',
    dependencies: [],
    accessControlMethods: ['Local_Auth'],
    maintenanceWindow: '土曜 01:00-02:00'
  },
  {
    id: 'ITS020',
    name: 'インターネット回線',
    category: 'Infrastructure',
    type: 'Network',
    criticality: 'Critical',
    owner: '田中 太郎',
    technicalContact: '渡辺 真由美',
    businessContact: 'IT部',
    description: '光回線 1Gbps×2回線。冗長構成',
    dependencies: [],
    accessControlMethods: [],
    maintenanceWindow: 'ISPメンテナンス時'
  }
];

// 組織メンバーを各部門に割り当て
mockDepartments[0].members = mockOrganizationMembers.filter(m => m.departmentId === 'DEPT001');
mockDepartments[1].members = mockOrganizationMembers.filter(m => m.departmentId === 'DEPT002'); 
mockDepartments[2].members = mockOrganizationMembers.filter(m => m.departmentId === 'DEPT003');
mockDepartments[3].members = mockOrganizationMembers.filter(m => m.departmentId === 'DEPT004');
mockDepartments[4].members = mockOrganizationMembers.filter(m => m.departmentId === 'DEPT005');

// API関数群
export const getDepartments = async (): Promise<Department[]> => {
  await simulateDelay(200);
  return [...mockDepartments];
};

export const getOrganizationMembers = async (): Promise<OrganizationMember[]> => {
  await simulateDelay(150);
  return [...mockOrganizationMembers];
};

export const getEmergencyContacts = async (): Promise<OrganizationMember[]> => {
  await simulateDelay(100);
  return mockOrganizationMembers.filter(m => m.isEmergencyContact);
};

export const getITServices = async (): Promise<ITService[]> => {
  await simulateDelay(200);
  return [...mockITServices];
};

export const getCriticalSystems = async (): Promise<ITService[]> => {
  await simulateDelay(100);
  return mockITServices.filter(s => s.criticality === 'Critical');
};

export const getSystemsByAccessMethod = async (method: string): Promise<ITService[]> => {
  await simulateDelay(100);
  return mockITServices.filter(s => s.accessControlMethods.includes(method as any));
};
