
import * as React from 'react';
const { useState, useEffect, useCallback, useMemo } = React;
type ReactNode = React.ReactNode;
import { 
    Vulnerability, ItemStatus, UserRole, 
    SecurityAlert, SecurityIncident, SecurityQuickActionFormData,
    SecurityAlertSeverity, SecurityIncidentStatus,
    Department, OrganizationMember, ITService
} from '../types';
import { 
    getVulnerabilities, addVulnerability, updateVulnerability, deleteVulnerability,
    getSecurityAlerts, 
    getSecurityIncidents, addSecurityIncident,
    addAuditLog,
    getDepartments, getOrganizationMembers, getEmergencyContacts, getITServices, getCriticalSystems
} from '../services/mockItsmService';
import { Button, Table, Modal, Input, Textarea, Select, Spinner, Card, Notification, NotificationType } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { itemStatusToJapanese, vulnerabilitySeverityToJapanese, securityAlertSeverityToJapanese, securityIncidentStatusToJapanese } from '../localization';

const SecurityManagementPage: React.FC = () => {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [securityIncidents, setSecurityIncidents] = useState<SecurityIncident[]>([]);
  
  // 組織・システムデータ
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMember[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<OrganizationMember[]>([]);
  const [itServices, setItServices] = useState<ITService[]>([]);
  const [criticalSystems, setCriticalSystems] = useState<ITService[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isVulnerabilityModalOpen, setIsVulnerabilityModalOpen] = useState(false);
  const [editingVulnerability, setEditingVulnerability] = useState<Partial<Vulnerability> | null>(null);
  
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const { user } = useAuth();

  const vulnerabilitySeverities: Array<Vulnerability['severity']> = ['Informational', 'Low', 'Medium', 'High', 'Critical'];
  const vulnerabilityStatuses = [ItemStatus.IDENTIFIED, ItemStatus.IN_PROGRESS, ItemStatus.PENDING, ItemStatus.MITIGATED, ItemStatus.RESOLVED, ItemStatus.CLOSED];
  const alertSeverities = Object.values(SecurityAlertSeverity);
  const incidentStatuses = Object.values(SecurityIncidentStatus);

  // 社内ITサービス・ITシステム対象オプション
  const systemTargetOptions = [
    'メールサービス (Exchange Online)', '社内ポータル', '基幹システム (SAP)', '顧客ポータルサイト',
    'データベースサーバー (Oracle)', 'データベースサーバー (MySQL)', 'データベースサーバー (PostgreSQL)',
    'APIゲートウェイ', '認証サーバー（ADサーバー/LDAPサーバー）', 'ファイルサーバー',
    'モバイルアプリケーション', 'チャットシステム (Teams)', 'チャットシステム (Slack)',
    'バックアップシステム', '監視システム (Zabbix)', '監視システム (Nagios)',
    'DNSサーバー', 'VPNサーバー', '印刷サーバー', 'Webサーバー (Apache)', 'Webサーバー (Nginx)',
    'ロードバランサー', 'CDNサービス', 'クラウドストレージ', 'ビデオ会議システム',
    'CRMシステム', 'ERPシステム', 'BI・分析システム', 'その他'
  ];

  // Quick Action Modals State
  const [isEmergencyProcedureModalOpen, setIsEmergencyProcedureModalOpen] = useState(false);
  const [isReportIncidentModalOpen, setIsReportIncidentModalOpen] = useState(false);
  const [isSecurityReportModalOpen, setIsSecurityReportModalOpen] = useState(false);
  const [isAccessSuspendModalOpen, setIsAccessSuspendModalOpen] = useState(false);
  const [isThreatShareModalOpen, setIsThreatShareModalOpen] = useState(false);
  const [quickActionFormData, setQuickActionFormData] = useState<SecurityQuickActionFormData>({});

  // レポート表示用
  const [isReportDetailModalOpen, setIsReportDetailModalOpen] = useState(false);
  const [currentReportType, setCurrentReportType] = useState<string>('');
  const [currentReportData, setCurrentReportData] = useState<any>(null);


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [vulnsData, alertsData, secIncidentsData, deptData, orgMembersData, emergencyData, itServicesData, criticalData] = await Promise.all([
        getVulnerabilities(),
        getSecurityAlerts(),
        getSecurityIncidents(),
        getDepartments(),
        getOrganizationMembers(),
        getEmergencyContacts(),
        getITServices(),
        getCriticalSystems()
      ]);
      setVulnerabilities(vulnsData.sort((a,b) => new Date(b.discoveredDate).getTime() - new Date(a.discoveredDate).getTime()));
      setSecurityAlerts(alertsData);
      setSecurityIncidents(secIncidentsData.sort((a,b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()));
      setDepartments(deptData);
      setOrganizationMembers(orgMembersData);
      setEmergencyContacts(emergencyData);
      setItServices(itServicesData);
      setCriticalSystems(criticalData);
    } catch (error) {
      console.error("セキュリティ関連データの読み込みに失敗:", error);
      setNotification({ message: 'セキュリティ関連データの読み込みに失敗しました。', type: NotificationType.ERROR });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Vulnerability Modal Handlers
  const handleOpenVulnerabilityModal = (vulnerability?: Vulnerability) => {
    setEditingVulnerability(vulnerability ? { 
      ...vulnerability, 
      affectedAssets: vulnerability.affectedAssets || [],
      jvnNumbers: (vulnerability as any).jvnNumbers || [],
      reportedBy: vulnerability.reportedBy || user?.username || ''
    } : { 
      title: '', description: '', severity: 'Medium', status: ItemStatus.IDENTIFIED,
      affectedAssets: [], discoveredDate: new Date().toISOString().split('T')[0],
      jvnNumbers: [],
      reportedBy: user?.username || ''
    });
    setIsVulnerabilityModalOpen(true);
  };
  const handleCloseVulnerabilityModal = () => { setIsVulnerabilityModalOpen(false); setEditingVulnerability(null); };

  const handleVulnerabilityInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (editingVulnerability) {
      const { name, value } = e.target;
      if (name === "affectedAssets") {
        setEditingVulnerability({ ...editingVulnerability, [name]: value.split(',').map(s => s.trim()).filter(s => s) });
      } else if (name === "jvnNumbers") {
        setEditingVulnerability({ ...editingVulnerability, [name]: value.split(',').map(s => s.trim()).filter(s => s) } as any);
      } else if (name === "discoveredDate" || name === "dueDate") {
         setEditingVulnerability({ ...editingVulnerability, [name]: value ? new Date(value).toISOString() : undefined });
      } else {
        setEditingVulnerability({ ...editingVulnerability, [name]: value });
      }
    }
  };

  const handleVulnerabilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVulnerability || !user) return;
    try {
      const vulnerabilityToSave = {
        ...editingVulnerability,
        discoveredDate: editingVulnerability.discoveredDate ? new Date(editingVulnerability.discoveredDate).toISOString() : new Date().toISOString(),
        dueDate: editingVulnerability.dueDate ? new Date(editingVulnerability.dueDate).toISOString() : undefined,
        affectedAssets: editingVulnerability.affectedAssets || [],
        jvnNumbers: (editingVulnerability as any).jvnNumbers || [],
        reportedBy: editingVulnerability.reportedBy || user.username,
      } as Vulnerability;

      if (editingVulnerability.id) {
        await updateVulnerability(editingVulnerability.id, vulnerabilityToSave);
        setNotification({ message: '脆弱性情報が正常に更新されました。', type: NotificationType.SUCCESS });
      } else {
         const newVulnerabilityData = { ...vulnerabilityToSave } as Omit<Vulnerability, 'id'|'updatedAt'>;
        await addVulnerability(newVulnerabilityData);
        setNotification({ message: '脆弱性情報が正常に登録されました。', type: NotificationType.SUCCESS });
      }
      fetchData(); // Refetch all security data
      handleCloseVulnerabilityModal();
    } catch (error) {
      console.error("脆弱性情報の保存に失敗:", error);
      setNotification({ message: '脆弱性情報の保存に失敗しました。', type: NotificationType.ERROR });
    }
  };
  
  const handleDeleteVulnerabilityClick = async (id: string) => {
    if (!user) return;
    if (window.confirm('この脆弱性情報を削除してもよろしいですか？')) {
        try {
            await deleteVulnerability(id, {userId: user.id, username: user.username});
            setNotification({ message: '脆弱性情報が正常に削除されました。', type: NotificationType.SUCCESS });
            fetchData(); // Re-fetch all security data
        } catch (error: any) {
            console.error("Failed to delete vulnerability:", error);
            setNotification({ message: `脆弱性情報の削除に失敗: ${error.message}`, type: NotificationType.ERROR });
        }
    }
  };

  // Quick Action Handlers
  const openQuickActionModal = (modalSetFunction: React.Dispatch<React.SetStateAction<boolean>>) => {
    setQuickActionFormData({}); // Reset form data
    modalSetFunction(true);
  };
  const handleQuickActionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuickActionFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleReportIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !quickActionFormData.incidentTitle || !quickActionFormData.incidentDescription) {
        setNotification({message: 'インシデントのタイトルと説明は必須です。', type: NotificationType.WARNING});
        return;
    }
    try {
        const newIncident: Omit<SecurityIncident, 'id'|'reportedAt'|'updatedAt'> = {
            title: quickActionFormData.incidentTitle,
            description: quickActionFormData.incidentDescription,
            severity: quickActionFormData.incidentSeverity || SecurityAlertSeverity.MEDIUM,
            status: SecurityIncidentStatus.NEW,
            reportedBy: user.username,
        };
        await addSecurityIncident(newIncident, { userId: user.id, username: user.username });
        setNotification({message: 'セキュリティインシデントが報告されました。', type: NotificationType.SUCCESS});
        fetchData(); // Refresh security data
        setIsReportIncidentModalOpen(false);
        setQuickActionFormData({});
    } catch (error) {
        setNotification({message: 'インシデント報告に失敗しました。', type: NotificationType.ERROR});
    }
  };
  const handleGenericQuickAction = async (actionName: string, details: string, modalCloseFn: () => void ) => {
    if (!user) return;
    await addAuditLog({ userId: user.id, username: user.username, action: `セキュリティ管理: ${actionName}`, details });
    setNotification({ message: `${actionName}が正常に実行されました（シミュレーション）。`, type: NotificationType.SUCCESS });
    modalCloseFn();
    setQuickActionFormData({});
  };

  // レポート詳細表示機能
  const handleShowReportDetail = (reportType: string) => {
    setCurrentReportType(reportType);
    setCurrentReportData(generateReportData(reportType));
    setIsReportDetailModalOpen(true);
  };

  // レポートデータ生成機能
  const generateReportData = (reportType: string) => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    switch (reportType) {
      case 'vulnerability_trend':
        return {
          title: '脆弱性トレンド分析レポート',
          period: `${lastMonth.getFullYear()}年${lastMonth.getMonth() + 1}月～${now.getFullYear()}年${now.getMonth() + 1}月`,
          summary: {
            totalVulnerabilities: 347,
            criticalFixed: 28,
            highFixed: 89,
            averageFixTime: '8.3日',
            complianceRate: '94.2%'
          },
          trends: [
            { month: '2024-03', critical: 12, high: 45, medium: 78, low: 23 },
            { month: '2024-04', critical: 8, high: 52, medium: 82, low: 19 },
            { month: '2024-05', critical: 15, high: 41, medium: 76, low: 31 },
            { month: '2024-06', critical: 6, high: 38, medium: 69, low: 27 }
          ],
          topVulnerabilities: [
            { cve: 'CVE-2024-12345', severity: 'Critical', status: 'Fixed', system: 'Apache Struts', fixTime: '2日' },
            { cve: 'CVE-2024-23456', severity: 'High', status: 'In Progress', system: 'Windows Server', fixTime: '進行中' },
            { cve: 'CVE-2024-34567', severity: 'Critical', status: 'Fixed', system: 'Oracle Database', fixTime: '1日' }
          ]
        };
        
      case 'risk_assessment':
        return {
          title: 'リスク評価レポート',
          period: `${now.getFullYear()}年${now.getMonth() + 1}月度`,
          overallRisk: 'Medium',
          riskScore: 5.2,
          categories: [
            { name: '技術的リスク', score: 3.1, level: 'Low', items: ['脆弱性管理', 'システム更新', 'アクセス制御'] },
            { name: '人的リスク', score: 6.8, level: 'Medium', items: ['セキュリティ教育', 'アクセス権管理', '内部者脅威'] },
            { name: '物理的リスク', score: 2.9, level: 'Low', items: ['データセンター', '端末管理', '環境制御'] },
            { name: 'コンプライアンスリスク', score: 3.5, level: 'Low', items: ['規制遵守', '監査対応', 'ポリシー管理'] }
          ],
          highRiskItems: [
            { item: 'レガシーシステム脆弱性', risk: 'High', impact: '業務停止', probability: 'Medium', mitigation: 'システム更新計画策定中' },
            { item: '外部ベンダーアクセス', risk: 'Medium', impact: 'データ漏洩', probability: 'Low', mitigation: 'アクセス制御強化済み' },
            { item: '内部者による情報持出し', risk: 'Medium', impact: '機密情報漏洩', probability: 'Low', mitigation: 'DLP導入・監視強化' }
          ]
        };
        
      case 'audit_trail':
        return {
          title: '監査証跡レポート',
          period: `${lastMonth.getFullYear()}年${lastMonth.getMonth() + 1}月`,
          summary: {
            totalEvents: 2847192,
            securityEvents: 15674,
            suspiciousEvents: 23,
            blockedEvents: 1247
          },
          categories: [
            { name: 'ログイン・認証', events: 45678, suspicious: 12, blocked: 89 },
            { name: 'ファイル・データアクセス', events: 234567, suspicious: 5, blocked: 156 },
            { name: 'システム管理操作', events: 12345, suspicious: 3, blocked: 12 },
            { name: 'ネットワーク通信', events: 1567890, suspicious: 3, blocked: 990 }
          ],
          criticalEvents: [
            { timestamp: '2024-06-05 14:23:45', user: 'unknown', event: '複数回ログイン失敗', source: 'External IP', action: 'IP ブロック' },
            { timestamp: '2024-06-04 09:15:22', user: 'contractor.user', event: '大量ファイルダウンロード', source: 'File Server', action: '監視強化' },
            { timestamp: '2024-06-03 23:47:12', user: 'admin.temp', event: '時間外システム管理操作', source: 'Database Server', action: '承認確認' }
          ],
          complianceChecks: [
            { control: 'アクセスログ保管', status: 'Compliant', retention: '7年', coverage: '100%' },
            { control: '特権操作監視', status: 'Compliant', monitoring: '24/7', coverage: '98.7%' },
            { control: 'データ変更追跡', status: 'Partial', tracking: 'Database only', coverage: '85.2%' }
          ]
        };
        
      case 'vendor_assessment':
        return {
          title: 'ベンダーセキュリティ評価レポート',
          period: `${now.getFullYear()}年Q${Math.ceil((now.getMonth() + 1) / 3)}`,
          summary: {
            totalVendors: 47,
            highRiskVendors: 3,
            assessmentsCompleted: 42,
            contractsUpdated: 15
          },
          vendors: [
            { 
              name: 'クラウドストレージ サービス A', 
              category: 'インフラ', 
              riskLevel: 'High', 
              score: 65,
              lastAssessment: '2024-05-15',
              issues: ['データ暗号化設定', 'アクセスログ不備'],
              actions: ['暗号化設定見直し', '契約条項追加']
            },
            { 
              name: 'セキュリティ監視 サービス B', 
              category: 'セキュリティ', 
              riskLevel: 'Low', 
              score: 92,
              lastAssessment: '2024-04-20',
              issues: [],
              actions: ['継続契約更新']
            },
            { 
              name: 'データ分析 プラットフォーム C', 
              category: 'アプリケーション', 
              riskLevel: 'Medium', 
              score: 78,
              lastAssessment: '2024-03-10',
              issues: ['API セキュリティ', 'ログ管理'],
              actions: ['APIセキュリティ強化', 'SLA見直し']
            }
          ],
          certifications: [
            { vendor: 'クラウドストレージ サービス A', iso27001: 'Valid', soc2: 'Valid', pci: 'N/A' },
            { vendor: 'セキュリティ監視 サービス B', iso27001: 'Valid', soc2: 'Valid', pci: 'Valid' },
            { vendor: 'データ分析 プラットフォーム C', iso27001: 'Valid', soc2: 'Expired', pci: 'N/A' }
          ]
        };
        
      default:
        return { title: 'レポートデータが見つかりません', data: {} };
    }
  };


  // Derived data for UI
  const currentThreatLevel = useMemo(() => {
    if (securityAlerts.some(a => a.severity === SecurityAlertSeverity.CRITICAL)) return {text: '高レベル', color: 'text-red-600'};
    if (securityAlerts.some(a => a.severity === SecurityAlertSeverity.HIGH)) return {text: '中レベル', color: 'text-yellow-600'};
    return {text: '低レベル', color: 'text-green-600'};
  }, [securityAlerts]);

  const vulnerabilitySummary = useMemo(() => ({
    critical: vulnerabilities.filter(v => v.severity === 'Critical' && v.status !== ItemStatus.MITIGATED && v.status !== ItemStatus.CLOSED).length,
    high: vulnerabilities.filter(v => v.severity === 'High' && v.status !== ItemStatus.MITIGATED && v.status !== ItemStatus.CLOSED).length,
    medium: vulnerabilities.filter(v => v.severity === 'Medium' && v.status !== ItemStatus.MITIGATED && v.status !== ItemStatus.CLOSED).length,
  }), [vulnerabilities]);

  const patchStatusSummary = useMemo(() => ({
    unpatched: vulnerabilities.filter(v => v.status !== ItemStatus.MITIGATED && v.status !== ItemStatus.CLOSED).length,
    patched: vulnerabilities.filter(v => v.status === ItemStatus.MITIGATED || v.status === ItemStatus.CLOSED).length,
  }), [vulnerabilities]);

  const vulnerabilityTableColumns: Array<{ Header: string; accessor: keyof Vulnerability | ((row: Vulnerability) => ReactNode) }> = [
    { Header: 'タイトル', accessor: 'title' },
    { Header: '深刻度', accessor: (row) => vulnerabilitySeverityToJapanese(row.severity) },
    { Header: 'ステータス', accessor: (row) => itemStatusToJapanese(row.status) },
    { Header: '影響資産', accessor: (row) => row.affectedAssets.join(', ') },
    { Header: '発見日', accessor: (row) => new Date(row.discoveredDate).toLocaleDateString() },
    { Header: 'アクション', accessor: (row) => (
      <div className="flex items-center space-x-2">
        <Button size="sm" variant="ghost" onClick={() => handleOpenVulnerabilityModal(row)}>編集</Button>
        {user?.role === UserRole.ADMIN && <Button size="sm" variant="danger" onClick={() => handleDeleteVulnerabilityClick(row.id)}>削除</Button>}
      </div>
    )},
  ];

  if (isLoading) return <div className="flex justify-center items-center h-full"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 pb-10">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <h2 className="text-3xl font-semibold text-slate-800">セキュリティ管理</h2>

      <Card title="🚨 セキュリティ概況・アラート">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-slate-700">現在のセキュリティ状態 (脅威レベル)</h4>
            <p className={`text-2xl font-bold ${currentThreatLevel.color}`}>{currentThreatLevel.text}</p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-700">アクティブなセキュリティアラート ({securityAlerts.length}件)</h4>
            {securityAlerts.length > 0 ? (
              <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                {securityAlerts.slice(0,3).map(alert => (
                  <li key={alert.id} className={`p-1.5 rounded border-l-4 ${alert.severity === SecurityAlertSeverity.CRITICAL ? 'border-red-500 bg-red-50' : alert.severity === SecurityAlertSeverity.HIGH ? 'border-yellow-500 bg-yellow-50' : 'border-slate-300 bg-slate-50'}`}>
                    {securityAlertSeverityToJapanese(alert.severity)}: {alert.description.substring(0,50)}... ({alert.source})
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500 italic">アクティブなアラートはありません。</p>}
          </div>
        </div>
        <div className="mt-4">
            <h4 className="font-semibold text-slate-700">最新セキュリティインシデント</h4>
             {securityIncidents.length > 0 ? (
              <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                {securityIncidents.slice(0,3).map(inc => (
                  <li key={inc.id} className="p-1.5 rounded bg-slate-50 hover:bg-slate-100">
                    <span className="font-medium">{inc.title}</span> - {securityIncidentStatusToJapanese(inc.status)} (報告日: {new Date(inc.reportedAt).toLocaleDateString()})
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500 italic">最近のセキュリティインシデントはありません。</p>}
        </div>
        <p className="text-xs text-slate-500 mt-2 italic">リアルタイム脅威監視（不審なアクティビティ）: ログ監視システムと連携してここに表示されます。</p>
      </Card>

      <Card title="🛡️ 脅威・脆弱性管理">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-red-50 rounded text-center"><p className="text-xs text-red-700">未対応クリティカル</p><p className="text-2xl font-bold text-red-600">{vulnerabilitySummary.critical}</p></div>
            <div className="p-3 bg-yellow-50 rounded text-center"><p className="text-xs text-yellow-700">未対応 高</p><p className="text-2xl font-bold text-yellow-600">{vulnerabilitySummary.high}</p></div>
            <div className="p-3 bg-green-50 rounded text-center"><p className="text-xs text-green-700">パッチ適用済み</p><p className="text-2xl font-bold text-green-600">{patchStatusSummary.patched} / {patchStatusSummary.unpatched + patchStatusSummary.patched}</p></div>
        </div>
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-slate-700">脆弱性一覧</h3>
            {user?.role === UserRole.ADMIN && <Button onClick={() => handleOpenVulnerabilityModal()} size="sm">新規脆弱性登録</Button>}
        </div>
        {vulnerabilities.length > 0 ?
            <Table<Vulnerability> columns={vulnerabilityTableColumns} data={vulnerabilities} onRowClick={handleOpenVulnerabilityModal}/> :
            <p className="text-slate-500 italic">登録されている脆弱性情報はありません。</p>
        }
         <p className="text-xs text-slate-500 mt-2 italic">脅威インテリジェンス（最新の脅威情報）、ペネトレーションテスト結果はここに表示されます。</p>
      </Card>

      {/* Placeholder Sections */}
      <Card title="🔐 アクセス制御・認証">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">アクセス権限ステータス</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>アクティブユーザー数:</span><span className="text-blue-700">2,847名</span></div>
                <div className="flex justify-between"><span>管理者権限ユーザー:</span><span className="text-orange-600">23名</span></div>
                <div className="flex justify-between"><span>長期未使用アカウント:</span><span className="text-red-600">15名 (要確認)</span></div>
                <div className="flex justify-between"><span>パスワード期限切れ:</span><span className="text-yellow-600">67名 (要更新)</span></div>
                <div className="flex justify-between"><span>多要素認証有効率:</span><span className="text-green-600">94.2%</span></div>
              </div>
            </div>
            <div className="p-3 bg-yellow-50 rounded">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">異常ログイン検知 (過去24時間)</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>失敗ログイン試行:</span><span className="text-yellow-700">142回</span></div>
                <div className="flex justify-between"><span>異常な地理的アクセス:</span><span className="text-red-600">3件 (要調査)</span></div>
                <div className="flex justify-between"><span>時間外アクセス:</span><span className="text-orange-600">28件</span></div>
                <div className="flex justify-between"><span>ブルートフォース攻撃:</span><span className="text-red-600">2件 (ブロック済み)</span></div>
                <div className="flex justify-between"><span>新規デバイスログイン:</span><span className="text-blue-600">12件</span></div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-2 bg-green-50 rounded text-center">
              <div className="text-lg font-bold text-green-700">99.8%</div>
              <div className="text-xs text-green-600">認証システム稼働率</div>
            </div>
            <div className="p-2 bg-blue-50 rounded text-center">
              <div className="text-lg font-bold text-blue-700">156ms</div>
              <div className="text-xs text-blue-600">平均認証応答時間</div>
            </div>
            <div className="p-2 bg-purple-50 rounded text-center">
              <div className="text-lg font-bold text-purple-700">2,847</div>
              <div className="text-xs text-purple-600">アクティブセッション</div>
            </div>
          </div>
        </div>
      </Card>
      <Card title="📊 セキュリティ指標・メトリクス">
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-red-50 rounded text-center">
              <div className="text-xl font-bold text-red-700">24分</div>
              <div className="text-xs text-red-600">平均検知時間 (MTTD)</div>
            </div>
            <div className="p-3 bg-orange-50 rounded text-center">
              <div className="text-xl font-bold text-orange-700">2.3時間</div>
              <div className="text-xs text-orange-600">平均対応時間 (MTTR)</div>
            </div>
            <div className="p-3 bg-green-50 rounded text-center">
              <div className="text-xl font-bold text-green-700">98.2%</div>
              <div className="text-xs text-green-600">セキュリティ統制有効性</div>
            </div>
            <div className="p-3 bg-blue-50 rounded text-center">
              <div className="text-xl font-bold text-blue-700">0.03%</div>
              <div className="text-xs text-blue-600">月次インシデント発生率</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded">
              <h4 className="text-sm font-semibold text-slate-800 mb-2">セキュリティKPI (今月)</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>脆弱性修正期間 (平均):</span><span className="text-slate-700">8.5日</span></div>
                <div className="flex justify-between"><span>セキュリティ訓練完了率:</span><span className="text-green-600">96.7%</span></div>
                <div className="flex justify-between"><span>パッチ適用率 (Critical):</span><span className="text-green-600">98.9%</span></div>
                <div className="flex justify-between"><span>ウイルス検知・隔離成功率:</span><span className="text-green-600">99.8%</span></div>
                <div className="flex justify-between"><span>バックアップ完了率:</span><span className="text-green-600">99.2%</span></div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded">
              <h4 className="text-sm font-semibold text-slate-800 mb-2">リスク評価スコア</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>総合リスクスコア:</span><span className="text-yellow-600">Medium (5.2/10)</span></div>
                <div className="flex justify-between"><span>技術的リスク:</span><span className="text-green-600">Low (3.1/10)</span></div>
                <div className="flex justify-between"><span>人的リスク:</span><span className="text-yellow-600">Medium (6.8/10)</span></div>
                <div className="flex justify-between"><span>物理的リスク:</span><span className="text-green-600">Low (2.9/10)</span></div>
                <div className="flex justify-between"><span>コンプライアンスリスク:</span><span className="text-green-600">Low (3.5/10)</span></div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      <Card title="📋 コンプライアンス・監査">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-green-50 rounded">
              <h4 className="text-sm font-semibold text-green-800 mb-2">認証・規格遵守状況</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>ISO27001:</span><span className="text-green-600">認証取得済み ✓</span></div>
                <div className="flex justify-between"><span>プライバシーマーク:</span><span className="text-green-600">認証取得済み ✓</span></div>
                <div className="flex justify-between"><span>SOC2 Type2:</span><span className="text-yellow-600">準備中</span></div>
                <div className="flex justify-between"><span>GDPR遵守:</span><span className="text-green-600">適合 ✓</span></div>
                <div className="flex justify-between"><span>PCI-DSS:</span><span className="text-orange-600">未対応</span></div>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">内部監査結果</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>前回監査日:</span><span className="text-blue-700">2024-04-15</span></div>
                <div className="flex justify-between"><span>総合評価:</span><span className="text-green-600">B+ (良好)</span></div>
                <div className="flex justify-between"><span>重大な不備:</span><span className="text-green-600">0件</span></div>
                <div className="flex justify-between"><span>軽微な指摘事項:</span><span className="text-yellow-600">3件</span></div>
                <div className="flex justify-between"><span>改善提案:</span><span className="text-blue-600">7件</span></div>
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <h4 className="text-sm font-semibold text-purple-800 mb-2">法規制対応状況</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>個人情報保護法:</span><span className="text-green-600">遵守 ✓</span></div>
                <div className="flex justify-between"><span>サイバーセキュリティ基本法:</span><span className="text-green-600">遵守 ✓</span></div>
                <div className="flex justify-between"><span>不正競争防止法:</span><span className="text-green-600">遵守 ✓</span></div>
                <div className="flex justify-between"><span>電子署名法:</span><span className="text-yellow-600">部分対応</span></div>
                <div className="flex justify-between"><span>金融商品取引法:</span><span className="text-green-600">遵守 ✓</span></div>
              </div>
            </div>
          </div>
          <div className="bg-slate-100 p-3 rounded">
            <h4 className="text-sm font-semibold text-slate-800 mb-2">次回監査予定・改善計画</h4>
            <div className="text-xs space-y-1">
              <div>📅 次回内部監査: 2024年7月15日-19日 (5日間)</div>
              <div>📅 外部認証機関監査: 2024年9月2日-6日 (ISO27001 更新審査)</div>
              <div>🔧 改善事項: セキュリティ教育プログラム見直し、ログ保管期間延長対応</div>
            </div>
          </div>
        </div>
      </Card>
      <Card title="🔍 ログ・監視">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-blue-50 rounded text-center">
              <div className="text-lg font-bold text-blue-700">47,382</div>
              <div className="text-xs text-blue-600">今日のログイベント</div>
            </div>
            <div className="p-3 bg-red-50 rounded text-center">
              <div className="text-lg font-bold text-red-700">23</div>
              <div className="text-xs text-red-600">セキュリティアラート</div>
            </div>
            <div className="p-3 bg-green-50 rounded text-center">
              <div className="text-lg font-bold text-green-700">99.8%</div>
              <div className="text-xs text-green-600">SIEM稼働率</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded text-center">
              <div className="text-lg font-bold text-yellow-700">98.2%</div>
              <div className="text-xs text-yellow-600">ログ収集率</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded">
              <h4 className="text-sm font-semibold text-slate-800 mb-2">ファイアウォール・IDS/IPS状況</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>ブロックした攻撃:</span><span className="text-red-600">1,247件/日</span></div>
                <div className="flex justify-between"><span>不審な通信検知:</span><span className="text-orange-600">89件</span></div>
                <div className="flex justify-between"><span>DDoS攻撃:</span><span className="text-red-600">3件 (防御済み)</span></div>
                <div className="flex justify-between"><span>マルウェア通信:</span><span className="text-red-600">12件 (遮断済み)</span></div>
                <div className="flex justify-between"><span>ポートスキャン:</span><span className="text-yellow-600">156件</span></div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded">
              <h4 className="text-sm font-semibold text-slate-800 mb-2">ネットワークトラフィック分析</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>総通信量:</span><span className="text-slate-700">2.4TB/日</span></div>
                <div className="flex justify-between"><span>異常なデータ転送:</span><span className="text-yellow-600">7件 (調査中)</span></div>
                <div className="flex justify-between"><span>帯域使用率:</span><span className="text-green-600">78% (正常)</span></div>
                <div className="flex justify-between"><span>外部通信:</span><span className="text-blue-600">234GB</span></div>
                <div className="flex justify-between"><span>VPN接続数:</span><span className="text-blue-600">847セッション</span></div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      <Card title="📱 エンドポイント・デバイス管理">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-red-50 rounded">
              <h4 className="text-sm font-semibold text-red-800 mb-2">ウイルス・マルウェア検知状況</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>今月の検知件数:</span><span className="text-red-600">47件</span></div>
                <div className="flex justify-between"><span>隔離・駆除成功:</span><span className="text-green-600">46件 (97.9%)</span></div>
                <div className="flex justify-between"><span>要調査案件:</span><span className="text-yellow-600">1件</span></div>
                <div className="flex justify-between"><span>ランサムウェア検知:</span><span className="text-green-600">0件</span></div>
                <div className="flex justify-between"><span>フィッシング検知:</span><span className="text-orange-600">23件</span></div>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">MDM管理端末状況</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>管理対象端末:</span><span className="text-blue-700">2,847台</span></div>
                <div className="flex justify-between"><span>ポリシー適用済み:</span><span className="text-green-600">2,831台 (99.4%)</span></div>
                <div className="flex justify-between"><span>未更新端末:</span><span className="text-yellow-600">16台</span></div>
                <div className="flex justify-between"><span>紛失・盗難報告:</span><span className="text-red-600">2台 (今月)</span></div>
                <div className="flex justify-between"><span>セキュリティ違反:</span><span className="text-orange-600">5件</span></div>
              </div>
            </div>
          </div>
          <div className="bg-slate-100 p-3 rounded">
            <h4 className="text-sm font-semibold text-slate-800 mb-2">セキュリティソフト更新状況</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="flex justify-between"><span>定義ファイル最新:</span><span className="text-green-600">2,789台 (98.0%)</span></div>
              <div className="flex justify-between"><span>エンジン最新:</span><span className="text-green-600">2,823台 (99.2%)</span></div>
              <div className="flex justify-between"><span>要更新:</span><span className="text-yellow-600">58台</span></div>
            </div>
          </div>
        </div>
      </Card>
      <Card title="🔄 インシデント対応 (CSIRT)">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-green-50 rounded text-center">
              <div className="text-lg font-bold text-green-700">24/7</div>
              <div className="text-xs text-green-600">CSIRT監視体制</div>
            </div>
            <div className="p-3 bg-blue-50 rounded text-center">
              <div className="text-lg font-bold text-blue-700">15分</div>
              <div className="text-xs text-blue-600">平均初動対応時間</div>
            </div>
            <div className="p-3 bg-purple-50 rounded text-center">
              <div className="text-lg font-bold text-purple-700">97.3%</div>
              <div className="text-xs text-purple-600">SLA達成率</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded">
              <h4 className="text-sm font-semibold text-slate-800 mb-2">CSIRT活動状況 (今月)</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>受信したアラート:</span><span className="text-slate-700">1,247件</span></div>
                <div className="flex justify-between"><span>調査完了案件:</span><span className="text-green-600">1,198件</span></div>
                <div className="flex justify-between"><span>エスカレーション:</span><span className="text-orange-600">23件</span></div>
                <div className="flex justify-between"><span>フォレンジック調査:</span><span className="text-blue-600">3件</span></div>
                <div className="flex justify-between"><span>外部機関連携:</span><span className="text-purple-600">5件</span></div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded">
              <h4 className="text-sm font-semibold text-slate-800 mb-2">対応手順・体制</h4>
              <div className="space-y-1 text-xs">
                <div>🔴 <strong>Critical (15分以内):</strong> 経営層即座報告</div>
                <div>🟡 <strong>High (1時間以内):</strong> 部門長報告</div>
                <div>🟢 <strong>Medium (4時間以内):</strong> 担当者対応</div>
                <div>⚪ <strong>Low (24時間以内):</strong> 定期報告</div>
                <div>📞 <strong>緊急連絡先:</strong> 24時間ホットライン</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      <Card title="📈 リスク評価・管理">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-red-50 rounded">
              <h4 className="text-sm font-semibold text-red-800 mb-2">高リスク事項 (要対応)</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>レガシーシステム脆弱性:</span><span className="text-red-600">High</span></div>
                <div className="flex justify-between"><span>外部ベンダーアクセス:</span><span className="text-orange-600">Medium</span></div>
                <div className="flex justify-between"><span>クラウド設定不備:</span><span className="text-yellow-600">Medium</span></div>
                <div className="flex justify-between"><span>内部者脅威:</span><span className="text-orange-600">Medium</span></div>
                <div className="flex justify-between"><span>データ漏洩リスク:</span><span className="text-red-600">High</span></div>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <h4 className="text-sm font-semibold text-green-800 mb-2">リスク軽減策実施状況</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>アクセス制御強化:</span><span className="text-green-600">完了 ✓</span></div>
                <div className="flex justify-between"><span>暗号化実装:</span><span className="text-green-600">95% 完了</span></div>
                <div className="flex justify-between"><span>監視システム強化:</span><span className="text-yellow-600">進行中 (80%)</span></div>
                <div className="flex justify-between"><span>教育プログラム:</span><span className="text-green-600">完了 ✓</span></div>
                <div className="flex justify-between"><span>BCP策定:</span><span className="text-blue-600">計画中</span></div>
              </div>
            </div>
          </div>
          <div className="bg-slate-100 p-3 rounded">
            <h4 className="text-sm font-semibold text-slate-800 mb-2">次四半期リスク評価計画</h4>
            <div className="text-xs space-y-1">
              <div>📋 年次リスクアセスメント: 2024年8月実施予定</div>
              <div>🎯 重点評価領域: クラウドサービス、AI・機械学習システム、IoTデバイス</div>
              <div>👥 外部専門機関連携: ペネトレーションテスト、脆弱性診断</div>
            </div>
          </div>
        </div>
      </Card>
      <Card title="🎓 セキュリティ教育・意識向上">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">セキュリティ研修実施状況</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>基礎研修完了率:</span><span className="text-green-600">96.7% (2,752名)</span></div>
                <div className="flex justify-between"><span>上級研修完了率:</span><span className="text-yellow-600">78.3% (223名)</span></div>
                <div className="flex justify-between"><span>新入社員研修:</span><span className="text-green-600">100% (47名)</span></div>
                <div className="flex justify-between"><span>管理者研修:</span><span className="text-green-600">91.2% (154名)</span></div>
                <div className="flex justify-between"><span>外部講習参加:</span><span className="text-blue-600">12名</span></div>
              </div>
            </div>
            <div className="p-3 bg-orange-50 rounded">
              <h4 className="text-sm font-semibold text-orange-800 mb-2">フィッシング訓練結果</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>最新訓練実施日:</span><span className="text-orange-700">2024-05-20</span></div>
                <div className="flex justify-between"><span>対象者数:</span><span className="text-orange-700">2,847名</span></div>
                <div className="flex justify-between"><span>クリック率:</span><span className="text-red-600">8.2% (234名)</span></div>
                <div className="flex justify-between"><span>情報入力率:</span><span className="text-red-600">2.1% (59名)</span></div>
                <div className="flex justify-between"><span>報告率:</span><span className="text-green-600">67.3% (1,917名)</span></div>
              </div>
            </div>
          </div>
          <div className="bg-slate-100 p-3 rounded">
            <h4 className="text-sm font-semibold text-slate-800 mb-2">教育コンテンツ・意識調査結果</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-medium mb-1">利用可能コンテンツ:</div>
                <div>• eラーニング教材: 45コース</div>
                <div>• セキュリティハンドブック: 最新版</div>
                <div>• インシデント事例集: 32事例</div>
                <div>• 動画コンテンツ: 15本</div>
              </div>
              <div>
                <div className="font-medium mb-1">意識調査結果 (直近):</div>
                <div>• セキュリティ意識スコア: 82.4/100</div>
                <div>• パスワード管理: 良好 (78%)</div>
                <div>• USBメモリ使用: 要改善 (23%)</div>
                <div>• ソーシャルエンジニアリング対策: 良好 (85%)</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      <Card title="🔐 データ保護・暗号化">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 rounded">
              <h4 className="text-sm font-semibold text-green-800 mb-2">暗号化実装状況</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>データベース暗号化:</span><span className="text-green-600">100% ✓</span></div>
                <div className="flex justify-between"><span>ファイルサーバー暗号化:</span><span className="text-green-600">98.7% ✓</span></div>
                <div className="flex justify-between"><span>通信暗号化 (TLS):</span><span className="text-green-600">100% ✓</span></div>
                <div className="flex justify-between"><span>端末ディスク暗号化:</span><span className="text-yellow-600">94.2%</span></div>
                <div className="flex justify-between"><span>バックアップ暗号化:</span><span className="text-green-600">100% ✓</span></div>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">データ分類・保護状況</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>機密データ:</span><span className="text-red-600">247TB (暗号化済み)</span></div>
                <div className="flex justify-between"><span>社外秘データ:</span><span className="text-orange-600">1.2PB (保護済み)</span></div>
                <div className="flex justify-between"><span>社内限定データ:</span><span className="text-yellow-600">3.8PB</span></div>
                <div className="flex justify-between"><span>公開データ:</span><span className="text-green-600">567TB</span></div>
                <div className="flex justify-between"><span>未分類データ:</span><span className="text-red-600">89TB (要対応)</span></div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-purple-50 rounded">
              <h4 className="text-sm font-semibold text-purple-800 mb-2">DLP (Data Loss Prevention)</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>検知ルール数:</span><span className="text-purple-700">1,247件</span></div>
                <div className="flex justify-between"><span>今月の検知件数:</span><span className="text-orange-600">89件</span></div>
                <div className="flex justify-between"><span>ブロック件数:</span><span className="text-red-600">23件</span></div>
                <div className="flex justify-between"><span>警告件数:</span><span className="text-yellow-600">66件</span></div>
                <div className="flex justify-between"><span>誤検知率:</span><span className="text-green-600">2.1%</span></div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded">
              <h4 className="text-sm font-semibold text-slate-800 mb-2">バックアップセキュリティ</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>日次バックアップ:</span><span className="text-green-600">99.8% 成功</span></div>
                <div className="flex justify-between"><span>遠隔地保管:</span><span className="text-green-600">3箇所 ✓</span></div>
                <div className="flex justify-between"><span>復旧テスト:</span><span className="text-green-600">月次実施済み</span></div>
                <div className="flex justify-between"><span>保持期間:</span><span className="text-blue-600">7年間</span></div>
                <div className="flex justify-between"><span>アクセス制御:</span><span className="text-green-600">多重認証済み</span></div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      <Card title="⚙️ クイックアクション">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsEmergencyProcedureModalOpen)}>緊急時対応手順</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsReportIncidentModalOpen)}>インシデント報告</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsSecurityReportModalOpen)}>レポート生成</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsAccessSuspendModalOpen)}>アクセス権限緊急停止</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsThreatShareModalOpen)}>脅威情報共有</Button>
        </div>
      </Card>

      <Card title="📊 レポート・ドキュメント">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border p-3 rounded bg-blue-50">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">📋 定期レポート</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>月次セキュリティサマリー (2024年5月)</span>
                  <Button size="sm" variant="ghost">📄 PDF</Button>
                </div>
                <div className="flex justify-between">
                  <span>脆弱性管理レポート (四半期)</span>
                  <Button size="sm" variant="ghost">📊 Excel</Button>
                </div>
                <div className="flex justify-between">
                  <span>インシデント分析レポート</span>
                  <Button size="sm" variant="ghost">📈 PowerBI</Button>
                </div>
                <div className="flex justify-between">
                  <span>コンプライアンス監査結果</span>
                  <Button size="sm" variant="ghost">📋 PDF</Button>
                </div>
                <div className="flex justify-between">
                  <span>経営層向けダッシュボード</span>
                  <Button size="sm" variant="ghost">📊 View</Button>
                </div>
              </div>
            </div>
            <div className="border p-3 rounded bg-green-50">
              <h4 className="text-sm font-semibold text-green-800 mb-2">📚 ポリシー・手順書</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>セキュリティポリシー v2.1</span>
                  <span className="text-green-600">最新</span>
                </div>
                <div className="flex justify-between">
                  <span>インシデント対応手順書</span>
                  <span className="text-green-600">最新</span>
                </div>
                <div className="flex justify-between">
                  <span>BCP・災害復旧計画</span>
                  <span className="text-yellow-600">要更新</span>
                </div>
                <div className="flex justify-between">
                  <span>アクセス権限管理規程</span>
                  <span className="text-green-600">最新</span>
                </div>
                <div className="flex justify-between">
                  <span>ベンダー管理ガイドライン</span>
                  <span className="text-green-600">最新</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-100 p-3 rounded">
            <h4 className="text-sm font-semibold text-slate-800 mb-2">📈 カスタムレポート生成</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Button size="sm" variant="secondary" onClick={() => handleShowReportDetail('vulnerability_trend')}>脆弱性トレンド</Button>
              <Button size="sm" variant="secondary" onClick={() => handleShowReportDetail('risk_assessment')}>リスク評価</Button>
              <Button size="sm" variant="secondary" onClick={() => handleShowReportDetail('audit_trail')}>監査証跡</Button>
              <Button size="sm" variant="secondary" onClick={() => handleShowReportDetail('vendor_assessment')}>ベンダー評価</Button>
            </div>
          </div>
        </div>
      </Card>
      
      <Card title="🌐 外部連携・情報共有">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border p-3 rounded bg-orange-50">
              <h4 className="text-sm font-semibold text-orange-800 mb-2">🚨 脅威インテリジェンス</h4>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-red-100 rounded">
                  <div className="font-semibold">JPCERT/CC: 緊急注意喚起</div>
                  <div>Apache Struts 2の脆弱性 (CVE-2024-53677)</div>
                  <div className="text-slate-500">2024-06-05 14:30</div>
                </div>
                <div className="p-2 bg-yellow-100 rounded">
                  <div className="font-semibold">IPA: セキュリティ情報</div>
                  <div>ランサムウェア攻撃手法の新たな傾向</div>
                  <div className="text-slate-500">2024-06-03 09:15</div>
                </div>
                <div className="p-2 bg-blue-100 rounded">
                  <div className="font-semibold">NISC: サイバー情報</div>
                  <div>金融業界を狙った標的型攻撃の増加</div>
                  <div className="text-slate-500">2024-06-01 16:45</div>
                </div>
              </div>
            </div>
            <div className="border p-3 rounded bg-purple-50">
              <h4 className="text-sm font-semibold text-purple-800 mb-2">🤝 業界連携</h4>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-purple-100 rounded">
                  <div className="font-semibold">金融ISAC: 情報共有</div>
                  <div>新型フィッシング攻撃のIoC情報</div>
                  <div className="text-slate-500">参加組織: 127社</div>
                </div>
                <div className="p-2 bg-green-100 rounded">
                  <div className="font-semibold">サイバー救急センター</div>
                  <div>24時間インシデント対応サービス</div>
                  <div className="text-slate-500">契約状況: 有効</div>
                </div>
                <div className="p-2 bg-blue-100 rounded">
                  <div className="font-semibold">Microsoft MSRC</div>
                  <div>Windows月例セキュリティ更新</div>
                  <div className="text-slate-500">自動取得: 有効</div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 rounded text-center">
              <div className="text-lg font-bold text-slate-700">47</div>
              <div className="text-xs text-slate-600">今月受信した脅威情報</div>
            </div>
            <div className="p-3 bg-slate-50 rounded text-center">
              <div className="text-lg font-bold text-slate-700">12</div>
              <div className="text-xs text-slate-600">業界団体への情報提供</div>
            </div>
            <div className="p-3 bg-slate-50 rounded text-center">
              <div className="text-lg font-bold text-slate-700">3</div>
              <div className="text-xs text-slate-600">政府機関への報告案件</div>
            </div>
          </div>
          <div className="bg-slate-100 p-3 rounded">
            <h4 className="text-sm font-semibold text-slate-800 mb-2">📡 情報共有設定</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div><span className="text-green-600">●</span> JPCERT/CC連携</div>
              <div><span className="text-green-600">●</span> IPA情報収集</div>
              <div><span className="text-yellow-600">●</span> 業界ISAC</div>
              <div><span className="text-red-600">●</span> 緊急通報窓口</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Vulnerability Add/Edit Modal */}
      {editingVulnerability && (
        <Modal isOpen={isVulnerabilityModalOpen} onClose={handleCloseVulnerabilityModal} title={editingVulnerability.id ? '脆弱性情報編集' : '新規脆弱性情報登録'} size="lg">
          <form onSubmit={handleVulnerabilitySubmit} className="space-y-4">
            <Input label="タイトル" name="title" value={editingVulnerability.title || ''} onChange={handleVulnerabilityInputChange} required />
            <Input label="CVE ID (任意)" name="cveId" value={editingVulnerability.cveId || ''} onChange={handleVulnerabilityInputChange} placeholder="例: CVE-2023-12345" />
            <Input 
              label="JVN登録番号 (脆弱性対策情報データベース)" 
              name="jvnNumbers" 
              value={(editingVulnerability as any).jvnNumbers?.join(', ') || ''} 
              onChange={handleVulnerabilityInputChange}
              placeholder="例: JVNDB-2024-000001, JVNDB-2024-000002"
            />
            <div className="text-xs text-gray-500 mb-2">
              <p>※ JVN登録番号は <a href="https://jvndb.jvn.jp/index.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">脆弱性対策情報データベース(JVN iPedia)</a> から取得してください</p>
              <p>※ 形式: JVNDB-YYYY-NNNNNN (例: JVNDB-2024-000001)</p>
            </div>
            <Textarea label="説明" name="description" value={editingVulnerability.description || ''} onChange={handleVulnerabilityInputChange} required rows={3}/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="深刻度" name="severity" value={editingVulnerability.severity || 'Medium'} onChange={handleVulnerabilityInputChange} options={vulnerabilitySeverities.map(s => ({value: s, label: vulnerabilitySeverityToJapanese(s)}))} required/>
                <Select label="ステータス" name="status" value={editingVulnerability.status || ItemStatus.IDENTIFIED} onChange={handleVulnerabilityInputChange} options={vulnerabilityStatuses.map(s => ({value: s, label: itemStatusToJapanese(s)}))} required/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">影響を受ける社内ITサービス・ITシステム (複数選択可)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border p-2 rounded">
                {systemTargetOptions.map(target => (
                  <label key={target} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      value={target}
                      checked={editingVulnerability.affectedAssets?.includes(target)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const currentAssets = editingVulnerability.affectedAssets || [];
                        if (checked) {
                          setEditingVulnerability({ ...editingVulnerability, affectedAssets: [...currentAssets, target] });
                        } else {
                          setEditingVulnerability({ ...editingVulnerability, affectedAssets: currentAssets.filter(s => s !== target) });
                        }
                      }}
                      className="form-checkbox h-4 w-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                    />
                    <span>{target}</span>
                  </label>
                ))}
              </div>
              <Input 
                label="影響を受ける資産 (手入力、カンマ区切り)" 
                name="affectedAssetsManual" 
                value={editingVulnerability.affectedAssets?.join(', ') || ''} 
                onChange={(e) => setEditingVulnerability({ ...editingVulnerability, affectedAssets: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                placeholder="例: Server01, Workstation15, 顧客ポータル"
                className="mt-2"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Input label="発見日" name="discoveredDate" type="date" value={editingVulnerability.discoveredDate ? new Date(editingVulnerability.discoveredDate).toISOString().split('T')[0] : ''} onChange={handleVulnerabilityInputChange} required />
                 <Input label="対応期日 (任意)" name="dueDate" type="date" value={editingVulnerability.dueDate ? new Date(editingVulnerability.dueDate).toISOString().split('T')[0] : ''} onChange={handleVulnerabilityInputChange} />
            </div>
            <Textarea label="修正計画 (任意)" name="remediationPlan" value={editingVulnerability.remediationPlan || ''} onChange={handleVulnerabilityInputChange} rows={3}/>
            <Input label="報告者/発見元" name="reportedBy" value={editingVulnerability.reportedBy || user?.username || ''} onChange={handleVulnerabilityInputChange} disabled />
            <Input label="担当者 (任意)" name="assignedTo" value={editingVulnerability.assignedTo || ''} onChange={handleVulnerabilityInputChange} />
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="secondary" onClick={handleCloseVulnerabilityModal}>キャンセル</Button>
              <Button type="submit" variant="primary">{editingVulnerability.id ? '更新' : '登録'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Quick Action Modals */}
      <Modal isOpen={isEmergencyProcedureModalOpen} onClose={() => setIsEmergencyProcedureModalOpen(false)} title="🚨 緊急時対応手順参照" size="lg">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-red-800 mb-2">⚡ 即座に実行する初動対応</h4>
            <div className="text-xs space-y-1">
              <div><strong>1. 影響範囲の特定 (5分以内):</strong> 感染・攻撃を受けたシステム・ネットワークセグメントを特定</div>
              <div><strong>2. ネットワークからの隔離:</strong> 該当システムを即座にネットワークから切断</div>
              <div><strong>3. CSIRTチームへの緊急連絡:</strong> セキュリティホットライン (内線: 9999)</div>
              <div><strong>4. 経営層への報告:</strong> Critical事案は15分以内に役員へエスカレーション</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-orange-800 mb-2">🔥 ランサムウェア感染時</h4>
              <div className="text-xs space-y-1">
                <div>• 感染端末の即座な隔離</div>
                <div>• バックアップサーバーの安全性確認</div>
                <div>• 復旧手順書 #SEC-001 参照</div>
                <div>• 法執行機関への届出検討</div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">🌊 DDoS攻撃時</h4>
              <div className="text-xs space-y-1">
                <div>• ISPへの緊急連絡</div>
                <div>• CDN・WAF設定の確認</div>
                <div>• トラフィック分析開始</div>
                <div>• 代替アクセス経路の準備</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-100 p-3 rounded">
            <h4 className="text-sm font-semibold text-slate-800 mb-2">📞 緊急連絡先</h4>
            <div className="text-xs grid grid-cols-1 md:grid-cols-2 gap-2">
              <div><strong>CSIRT:</strong> 内線9999 / 090-1234-5678</div>
              <div><strong>IT部門管理者:</strong> 内線8888</div>
              <div><strong>経営陣:</strong> 内線7777</div>
              <div><strong>外部CSIRT:</strong> 03-1234-5678</div>
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={() => setIsEmergencyProcedureModalOpen(false)} variant="primary">手順を確認しました</Button>
        </div>
      </Modal>

      <Modal isOpen={isReportIncidentModalOpen} onClose={() => setIsReportIncidentModalOpen(false)} title="🚨 セキュリティインシデント報告" size="lg">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <h4 className="text-sm font-semibold text-red-800 mb-1">📝 報告ガイドライン</h4>
          <div className="text-xs text-red-700 space-y-1">
            <div>• <strong>緊急度Critical:</strong> 即座にCSIRTチーム (内線9999) へ電話連絡も併せて実施</div>
            <div>• <strong>事実のみ記載:</strong> 推測や憶測は避け、確認できた事実のみを記録</div>
            <div>• <strong>時系列で記録:</strong> 発見時刻、対応開始時刻、現在の状況を明記</div>
          </div>
        </div>
        <form onSubmit={handleReportIncidentSubmit} className="space-y-4">
          <Input 
            label="インシデントタイトル" 
            name="incidentTitle" 
            value={quickActionFormData.incidentTitle || ''} 
            onChange={handleQuickActionFormChange} 
            required 
            placeholder="例: 顧客データベースへの不正アクセス検知"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select 
              label="深刻度 (推定)" 
              name="incidentSeverity" 
              value={quickActionFormData.incidentSeverity || SecurityAlertSeverity.MEDIUM} 
              onChange={handleQuickActionFormChange} 
              options={alertSeverities.map(s => ({value: s, label: securityAlertSeverityToJapanese(s)}))} 
            />
            <Input 
              label="発見日時" 
              name="incidentDiscoveredAt" 
              type="datetime-local" 
              value={quickActionFormData.incidentDiscoveredAt || ''} 
              onChange={handleQuickActionFormChange} 
            />
          </div>
          <Textarea 
            label="インシデント詳細・状況説明" 
            name="incidentDescription" 
            value={quickActionFormData.incidentDescription || ''} 
            onChange={handleQuickActionFormChange} 
            required 
            rows={5}
            placeholder="発見経緯、現在の状況、影響範囲、実施した初動対応などを時系列で記載してください..."
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">影響を受けたシステム・サービス (複数選択可)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border p-2 rounded bg-slate-50">
              {itServices.map(service => (
                <label key={service.id} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    value={service.name}
                    checked={quickActionFormData.affectedSystems?.split(',').map(s => s.trim()).includes(service.name)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const currentSystems = quickActionFormData.affectedSystems?.split(',').map(s => s.trim()).filter(s => s) || [];
                      if (checked) {
                        setQuickActionFormData(prev => ({ ...prev, affectedSystems: [...currentSystems, service.name].join(', ') }));
                      } else {
                        setQuickActionFormData(prev => ({ ...prev, affectedSystems: currentSystems.filter(s => s !== service.name).join(', ') }));
                      }
                    }}
                    className="form-checkbox h-4 w-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                  />
                  <span className={`${service.criticality === 'Critical' ? 'font-semibold text-red-700' : ''}`}>
                    {service.name}
                  </span>
                </label>
              ))}
            </div>
            <Input 
              label="その他のシステム (手入力)" 
              name="affectedSystemsManual" 
              value={quickActionFormData.affectedSystems || ''} 
              onChange={handleQuickActionFormChange} 
              className="mt-2"
              placeholder="システム名をカンマ区切りで入力"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="発見者・報告者" 
              name="incidentReporter" 
              value={quickActionFormData.incidentReporter || user?.username || ''} 
              onChange={handleQuickActionFormChange} 
              disabled
            />
            <Select 
              label="緊急度による自動通知レベル" 
              name="notificationLevel" 
              value={quickActionFormData.notificationLevel || 'standard'} 
              onChange={handleQuickActionFormChange} 
              options={[
                {value: 'minimal', label: '🟢 最小限 (担当者のみ)'},
                {value: 'standard', label: '🟡 標準 (部門管理者含む)'},
                {value: 'escalated', label: '🟠 エスカレーション (役員含む)'},
                {value: 'critical', label: '🔴 全社緊急 (全緊急連絡先)'}
              ]} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">📱 緊急連絡先選択</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border p-3 rounded bg-blue-50">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">部門別緊急連絡先</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {departments.map(dept => (
                    <label key={dept.id} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        value={dept.name}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const current = quickActionFormData.emergencyNotifyDepartments?.split(',').map(s => s.trim()).filter(s => s) || [];
                          if (checked) {
                            setQuickActionFormData(prev => ({ ...prev, emergencyNotifyDepartments: [...current, dept.name].join(', ') }));
                          } else {
                            setQuickActionFormData(prev => ({ ...prev, emergencyNotifyDepartments: current.filter(d => d !== dept.name).join(', ') }));
                          }
                        }}
                        className="form-checkbox h-4 w-4 text-red-600"
                      />
                      <span className="font-medium">{dept.name}</span>
                      <span className="text-xs text-slate-500">({dept.manager})</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="border p-3 rounded bg-orange-50">
                <h4 className="text-sm font-semibold text-orange-800 mb-2">個別緊急連絡先</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {emergencyContacts.map(contact => (
                    <label key={contact.id} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        value={contact.name}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const current = quickActionFormData.emergencyNotifyIndividuals?.split(',').map(s => s.trim()).filter(s => s) || [];
                          if (checked) {
                            setQuickActionFormData(prev => ({ ...prev, emergencyNotifyIndividuals: [...current, contact.name].join(', ') }));
                          } else {
                            setQuickActionFormData(prev => ({ ...prev, emergencyNotifyIndividuals: current.filter(i => i !== contact.name).join(', ') }));
                          }
                        }}
                        className="form-checkbox h-4 w-4 text-red-600"
                      />
                      <div>
                        <span className="font-medium">{contact.name}</span>
                        <div className="text-xs text-slate-500">{contact.title} - {contact.phone}</div>
                        <div className="text-xs text-blue-600">{contact.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 p-2 bg-slate-100 rounded text-xs">
              <strong>通知手段:</strong> SMS、メール、音声通話（設定により自動選択）
              <br />
              <strong>エスカレーション:</strong> Critical案件は15分以内に経営層へ自動エスカレーション
            </div>
          </div>
          <Textarea 
            label="実施済み応急対応" 
            name="immediateActions" 
            value={quickActionFormData.immediateActions || ''} 
            onChange={handleQuickActionFormChange} 
            rows={3}
            placeholder="ネットワーク隔離、アカウント無効化、ログ保全など実施した対応を記載..."
          />
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="danger">🚨 緊急報告を送信</Button>
          </div>
        </form>
      </Modal>
      
      <Modal isOpen={isSecurityReportModalOpen} onClose={() => setIsSecurityReportModalOpen(false)} title="📊 セキュリティレポート生成" size="lg">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <h4 className="text-sm font-semibold text-blue-800 mb-1">📋 レポート生成オプション</h4>
          <div className="text-xs text-blue-700 space-y-1">
            <div>• <strong>経営層向け:</strong> サマリー中心、数値とグラフでの可視化</div>
            <div>• <strong>技術者向け:</strong> 詳細データ、ログ分析結果、技術的推奨事項</div>
            <div>• <strong>監査向け:</strong> コンプライアンス状況、統制証跡</div>
          </div>
        </div>
        <form onSubmit={(e) => {e.preventDefault(); handleGenericQuickAction("セキュリティレポート生成", `レポートタイプ: ${quickActionFormData.reportType}, 期間: ${quickActionFormData.reportPeriodStart}～${quickActionFormData.reportPeriodEnd}, 対象: ${quickActionFormData.reportTarget}`, () => setIsSecurityReportModalOpen(false));}} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select 
              label="レポートタイプ" 
              name="reportType" 
              value={quickActionFormData.reportType || ''} 
              onChange={handleQuickActionFormChange} 
              options={[
                {value:'vulnerability_summary', label:'🔍 脆弱性管理サマリー'},
                {value:'incident_analysis', label:'🚨 インシデント分析レポート'},
                {value:'security_metrics', label:'📈 セキュリティ指標ダッシュボード'},
                {value:'compliance_status', label:'📋 コンプライアンス状況'},
                {value:'risk_assessment', label:'⚠️ リスクアセスメント'},
                {value:'executive_summary', label:'👔 経営層向けサマリー'}
              ]} 
              required 
            />
            <Select 
              label="対象読者" 
              name="reportTarget" 
              value={quickActionFormData.reportTarget || ''} 
              onChange={handleQuickActionFormChange} 
              options={[
                {value:'executive', label:'経営層'},
                {value:'technical', label:'技術者・運用担当'},
                {value:'audit', label:'監査・コンプライアンス'},
                {value:'external', label:'外部報告用'}
              ]} 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="期間 (開始)" 
              name="reportPeriodStart" 
              type="date" 
              value={quickActionFormData.reportPeriodStart || ''} 
              onChange={handleQuickActionFormChange} 
              required
            />
            <Input 
              label="期間 (終了)" 
              name="reportPeriodEnd" 
              type="date" 
              value={quickActionFormData.reportPeriodEnd || ''} 
              onChange={handleQuickActionFormChange} 
              required
            />
          </div>
          <Textarea 
            label="追加要求事項・備考" 
            name="reportNotes" 
            value={quickActionFormData.reportNotes || ''} 
            onChange={handleQuickActionFormChange} 
            rows={3}
            placeholder="特定のシステム・期間に焦点を当てた分析、特別な要求事項があれば記載..."
          />
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary">📊 レポート生成開始</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAccessSuspendModalOpen} onClose={() => setIsAccessSuspendModalOpen(false)} title="🚫 アクセス権限緊急停止" size="lg">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-red-800 mb-2">⚠️ 緊急停止実行時の注意事項</h4>
          <div className="text-xs text-red-700 space-y-1">
            <div>• <strong>即座に実行:</strong> 対象ユーザーの全システムアクセスが即座に無効化されます</div>
            <div>• <strong>業務影響:</strong> 実行前に業務への影響を必ず確認してください</div>
            <div>• <strong>復旧手順:</strong> 誤操作の場合は即座にCSIRTチーム (内線9999) へ連絡</div>
            <div>• <strong>ログ記録:</strong> 本操作は監査ログに記録され、レビュー対象となります</div>
          </div>
        </div>
        <form onSubmit={(e) => {e.preventDefault(); handleGenericQuickAction("アクセス権限緊急停止", `対象ユーザー: ${quickActionFormData.accessSuspensionUser}, 理由: ${quickActionFormData.accessSuspensionReason}, 範囲: ${quickActionFormData.suspensionScope}, 承認者: ${user?.username}`, () => setIsAccessSuspendModalOpen(false));}} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="対象ユーザー名・ID" 
              name="accessSuspensionUser" 
              value={quickActionFormData.accessSuspensionUser || ''} 
              onChange={handleQuickActionFormChange} 
              required 
              placeholder="例: yamada.taro または EMP12345"
            />
            <Select 
              label="停止範囲レベル" 
              name="suspensionScope" 
              value={quickActionFormData.suspensionScope || ''} 
              onChange={handleQuickActionFormChange} 
              options={[
                {value:'all_systems', label:'🔴 全システム (完全停止)'},
                {value:'external_only', label:'🟡 外部アクセスのみ (VPN・リモート)'},
                {value:'critical_systems', label:'🟠 基幹システムのみ'},
                {value:'entraid_only', label:'🔵 EntraID認証システムのみ'},
                {value:'specific_systems', label:'⚪ 特定システム選択'}
              ]} 
              required
            />
          </div>
          
          {/* 特定システム選択時の詳細設定 */}
          {quickActionFormData.suspensionScope === 'specific_systems' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">停止対象システム選択</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border p-3 rounded bg-red-50">
                  <h4 className="text-sm font-semibold text-red-800 mb-2">🔴 基幹システム</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {criticalSystems.map(system => (
                      <label key={system.id} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          value={system.name}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const current = quickActionFormData.suspensionTargetSystems?.split(',').map(s => s.trim()).filter(s => s) || [];
                            if (checked) {
                              setQuickActionFormData(prev => ({ ...prev, suspensionTargetSystems: [...current, system.name].join(', ') }));
                            } else {
                              setQuickActionFormData(prev => ({ ...prev, suspensionTargetSystems: current.filter(s => s !== system.name).join(', ') }));
                            }
                          }}
                          className="form-checkbox h-4 w-4 text-red-600"
                        />
                        <span className="font-medium text-red-700">{system.name}</span>
                        <span className="text-xs text-slate-500">({system.accessControlMethods.join(', ')})</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="border p-3 rounded bg-blue-50">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">⚡ その他のシステム</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {itServices.filter(s => s.criticality !== 'Critical').map(system => (
                      <label key={system.id} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          value={system.name}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const current = quickActionFormData.suspensionTargetSystems?.split(',').map(s => s.trim()).filter(s => s) || [];
                            if (checked) {
                              setQuickActionFormData(prev => ({ ...prev, suspensionTargetSystems: [...current, system.name].join(', ') }));
                            } else {
                              setQuickActionFormData(prev => ({ ...prev, suspensionTargetSystems: current.filter(s => s !== system.name).join(', ') }));
                            }
                          }}
                          className="form-checkbox h-4 w-4 text-blue-600"
                        />
                        <span>{system.name}</span>
                        <span className="text-xs text-slate-500">({system.accessControlMethods.join(', ')})</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 p-2 bg-slate-100 rounded text-xs">
                <strong>自動実行対象:</strong> EntraID、LDAP、VPN、ファイルサーバーアクセス
                <br />
                <strong>手動確認必要:</strong> ローカル認証、API キー、物理的アクセス
              </div>
            </div>
          )}
          
          {/* EntraID専用設定表示 */}
          {quickActionFormData.suspensionScope === 'entraid_only' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">🔐 EntraID アクセス停止範囲</h4>
              <div className="text-xs space-y-1">
                <div>✅ <strong>自動停止対象:</strong> Office365 (Outlook, Teams, SharePoint), 社内ポータル, SSO対応システム</div>
                <div>⚠️ <strong>影響サービス:</strong> {itServices.filter(s => s.accessControlMethods.includes('EntraID')).map(s => s.name).join(', ')}</div>
                <div>📞 <strong>連携停止:</strong> Azure AD同期、グループポリシー適用</div>
              </div>
            </div>
          )}

          <Textarea 
            label="停止理由・根拠" 
            name="accessSuspensionReason" 
            value={quickActionFormData.accessSuspensionReason || ''} 
            onChange={handleQuickActionFormChange} 
            required 
            rows={4}
            placeholder="不正アクセスの疑い、セキュリティ違反、アカウント乗っ取りの疑いなど、具体的な理由を記載..."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="実行者・承認者" 
              name="suspensionApprover" 
              value={user?.username || ''} 
              disabled
            />
            <Input 
              label="停止期限 (任意)" 
              name="suspensionUntil" 
              type="datetime-local" 
              value={quickActionFormData.suspensionUntil || ''} 
              onChange={handleQuickActionFormChange} 
            />
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="confirmSuspension" 
                required 
                className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="confirmSuspension" className="text-sm font-medium text-yellow-800">
                上記内容を確認し、アクセス権限緊急停止を実行することを承認します
              </label>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="danger">🚫 緊急停止を実行</Button>
          </div>
        </form>
      </Modal>
      
      <Modal isOpen={isThreatShareModalOpen} onClose={() => setIsThreatShareModalOpen(false)} title="🌐 脅威情報共有" size="lg">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-orange-800 mb-2">🔗 脅威情報共有プロトコル</h4>
          <div className="text-xs text-orange-700 space-y-1">
            <div>• <strong>情報源の明記:</strong> 信頼できる情報源（JPCERT/CC、IPA等）からの情報か確認</div>
            <div>• <strong>機密性の考慮:</strong> 社外秘情報が含まれていないか確認してから共有</div>
            <div>• <strong>タイムリーな共有:</strong> Critical情報は即座に、その他は24時間以内に共有</div>
            <div>• <strong>フォローアップ:</strong> 共有後の対応状況を追跡・確認</div>
          </div>
        </div>
        <form onSubmit={(e) => {e.preventDefault(); handleGenericQuickAction("脅威情報共有", `脅威情報: ${quickActionFormData.threatDescription}, 深刻度: ${quickActionFormData.threatSeverity}, 共有先: ${quickActionFormData.threatRecipients}, 情報源: ${quickActionFormData.threatSource}`, () => setIsThreatShareModalOpen(false));}} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select 
              label="脅威の種類" 
              name="threatType" 
              value={quickActionFormData.threatType || ''} 
              onChange={handleQuickActionFormChange} 
              options={[
                {value:'malware', label:'🦠 マルウェア・ランサムウェア'},
                {value:'vulnerability', label:'🔓 新規脆弱性情報'},
                {value:'phishing', label:'🎣 フィッシング攻撃'},
                {value:'apt', label:'🎯 標的型攻撃'},
                {value:'ddos', label:'🌊 DDoS攻撃'},
                {value:'data_breach', label:'💾 データ漏洩事例'},
                {value:'social_engineering', label:'👥 ソーシャルエンジニアリング'},
                {value:'other', label:'🔍 その他'}
              ]} 
              required
            />
            <Select 
              label="脅威の深刻度" 
              name="threatSeverity" 
              value={quickActionFormData.threatSeverity || SecurityAlertSeverity.MEDIUM} 
              onChange={handleQuickActionFormChange} 
              options={alertSeverities.map(s => ({value: s, label: securityAlertSeverityToJapanese(s)}))} 
              required
            />
          </div>
          <Textarea 
            label="脅威情報の詳細" 
            name="threatDescription" 
            value={quickActionFormData.threatDescription || ''} 
            onChange={handleQuickActionFormChange} 
            required 
            rows={5}
            placeholder="脅威の概要、攻撃手法、影響範囲、推奨される対策などを詳細に記載..."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="情報源" 
              name="threatSource" 
              value={quickActionFormData.threatSource || ''} 
              onChange={handleQuickActionFormChange} 
              placeholder="例: JPCERT/CC, IPA, セキュリティベンダー"
              required
            />
            <Input 
              label="参考URL (任意)" 
              name="threatReferenceUrl" 
              value={quickActionFormData.threatReferenceUrl || ''} 
              onChange={handleQuickActionFormChange} 
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">共有先選択</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border p-3 rounded">
              {['全社', 'IT部門', 'CSIRT', '経営層', 'システム管理者', '一般ユーザー', '外部パートナー'].map(target => (
                <label key={target} className="flex items-center space-x-2 text-sm">
                  <input 
                    type="checkbox" 
                    value={target}
                    onChange={(e) => {
                      const current = quickActionFormData.threatRecipients?.split(',').map(s => s.trim()).filter(s => s) || [];
                      if (e.target.checked) {
                        setQuickActionFormData(prev => ({ ...prev, threatRecipients: [...current, target].join(', ') }));
                      } else {
                        setQuickActionFormData(prev => ({ ...prev, threatRecipients: current.filter(r => r !== target).join(', ') }));
                      }
                    }}
                    className="form-checkbox h-4 w-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500"
                  />
                  <span>{target}</span>
                </label>
              ))}
            </div>
            <Input 
              label="追加共有先 (手入力)" 
              name="threatRecipientsManual" 
              value={quickActionFormData.threatRecipients || ''} 
              onChange={handleQuickActionFormChange} 
              className="mt-2"
              placeholder="部署名、メールアドレスなど"
            />
          </div>
          <Textarea 
            label="推奨される対策・アクション" 
            name="recommendedActions" 
            value={quickActionFormData.recommendedActions || ''} 
            onChange={handleQuickActionFormChange} 
            rows={3}
            placeholder="各部門で実施すべき対策、確認事項、緊急度などを記載..."
          />
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary">🌐 脅威情報を共有</Button>
          </div>
        </form>
      </Modal>

      {/* レポート詳細表示モーダル */}
      <Modal isOpen={isReportDetailModalOpen} onClose={() => setIsReportDetailModalOpen(false)} title={currentReportData?.title || 'レポート詳細'} size="xl">
        {currentReportData && (
          <div className="space-y-6">
            {/* ヘッダー情報 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-blue-800">対象期間</h4>
                  <p className="text-sm text-blue-700">{currentReportData.period}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-800">生成日時</h4>
                  <p className="text-sm text-blue-700">{new Date().toLocaleString('ja-JP')}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-800">形式</h4>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="ghost">📄 PDF</Button>
                    <Button size="sm" variant="ghost">📊 Excel</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 脆弱性トレンドレポート */}
            {currentReportType === 'vulnerability_trend' && (
              <div className="space-y-4">
                {/* サマリー */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3 bg-slate-50 rounded text-center">
                    <div className="text-lg font-bold text-slate-700">{currentReportData.summary.totalVulnerabilities}</div>
                    <div className="text-xs text-slate-600">総脆弱性件数</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded text-center">
                    <div className="text-lg font-bold text-red-700">{currentReportData.summary.criticalFixed}</div>
                    <div className="text-xs text-red-600">Critical修正済み</div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded text-center">
                    <div className="text-lg font-bold text-yellow-700">{currentReportData.summary.highFixed}</div>
                    <div className="text-xs text-yellow-600">High修正済み</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded text-center">
                    <div className="text-lg font-bold text-green-700">{currentReportData.summary.averageFixTime}</div>
                    <div className="text-xs text-green-600">平均修正時間</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded text-center">
                    <div className="text-lg font-bold text-blue-700">{currentReportData.summary.complianceRate}</div>
                    <div className="text-xs text-blue-600">対応率</div>
                  </div>
                </div>

                {/* トレンドデータ */}
                <div className="bg-white border rounded p-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">📈 月別脆弱性推移</h4>
                  <div className="space-y-2">
                    {currentReportData.trends.map((trend: any, index: number) => (
                      <div key={index} className="grid grid-cols-5 gap-2 text-sm py-2 border-b">
                        <div className="font-medium">{trend.month}</div>
                        <div className="text-red-600">Critical: {trend.critical}</div>
                        <div className="text-yellow-600">High: {trend.high}</div>
                        <div className="text-blue-600">Medium: {trend.medium}</div>
                        <div className="text-green-600">Low: {trend.low}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 主要脆弱性 */}
                <div className="bg-white border rounded p-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">🔍 主要脆弱性</h4>
                  <div className="space-y-2">
                    {currentReportData.topVulnerabilities.map((vuln: any, index: number) => (
                      <div key={index} className="grid grid-cols-5 gap-2 text-sm py-2 border-b">
                        <div className="font-mono text-blue-600">{vuln.cve}</div>
                        <div className={`font-semibold ${vuln.severity === 'Critical' ? 'text-red-600' : 'text-yellow-600'}`}>
                          {vuln.severity}
                        </div>
                        <div className={vuln.status === 'Fixed' ? 'text-green-600' : 'text-orange-600'}>
                          {vuln.status}
                        </div>
                        <div>{vuln.system}</div>
                        <div>{vuln.fixTime}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* リスク評価レポート */}
            {currentReportType === 'risk_assessment' && (
              <div className="space-y-4">
                {/* 総合リスクスコア */}
                <div className="bg-white border rounded p-4 text-center">
                  <h4 className="text-sm font-semibold text-slate-800 mb-2">🎯 総合リスクスコア</h4>
                  <div className="text-3xl font-bold text-yellow-600 mb-2">{currentReportData.riskScore}/10</div>
                  <div className="text-lg font-semibold text-yellow-600">{currentReportData.overallRisk} Risk</div>
                </div>

                {/* カテゴリ別リスク */}
                <div className="bg-white border rounded p-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">📊 カテゴリ別リスク評価</h4>
                  <div className="space-y-3">
                    {currentReportData.categories.map((category: any, index: number) => (
                      <div key={index} className="border rounded p-3">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-semibold text-slate-700">{category.name}</h5>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold">{category.score}/10</span>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              category.level === 'Low' ? 'bg-green-100 text-green-800' :
                              category.level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {category.level}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-slate-600">
                          評価項目: {category.items.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 高リスク項目 */}
                <div className="bg-white border rounded p-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">⚠️ 高リスク項目・対策状況</h4>
                  <div className="space-y-3">
                    {currentReportData.highRiskItems.map((item: any, index: number) => (
                      <div key={index} className="border-l-4 border-red-500 bg-red-50 p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <h5 className="font-semibold text-red-800">{item.item}</h5>
                            <div className="text-sm text-red-700 mt-1">
                              リスクレベル: {item.risk} | 影響: {item.impact} | 発生可能性: {item.probability}
                            </div>
                          </div>
                          <div>
                            <h6 className="font-semibold text-slate-700 text-sm">対策状況</h6>
                            <div className="text-sm text-slate-600">{item.mitigation}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 監査証跡レポート */}
            {currentReportType === 'audit_trail' && (
              <div className="space-y-4">
                {/* サマリー */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-blue-50 rounded text-center">
                    <div className="text-lg font-bold text-blue-700">{currentReportData.summary.totalEvents.toLocaleString()}</div>
                    <div className="text-xs text-blue-600">総ログイベント</div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded text-center">
                    <div className="text-lg font-bold text-yellow-700">{currentReportData.summary.securityEvents.toLocaleString()}</div>
                    <div className="text-xs text-yellow-600">セキュリティ関連</div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded text-center">
                    <div className="text-lg font-bold text-orange-700">{currentReportData.summary.suspiciousEvents}</div>
                    <div className="text-xs text-orange-600">要調査イベント</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded text-center">
                    <div className="text-lg font-bold text-red-700">{currentReportData.summary.blockedEvents}</div>
                    <div className="text-xs text-red-600">ブロック実行</div>
                  </div>
                </div>

                {/* カテゴリ別統計 */}
                <div className="bg-white border rounded p-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">📋 カテゴリ別ログ統計</h4>
                  <div className="space-y-2">
                    {currentReportData.categories.map((category: any, index: number) => (
                      <div key={index} className="grid grid-cols-4 gap-2 text-sm py-2 border-b">
                        <div className="font-medium">{category.name}</div>
                        <div className="text-blue-600">{category.events.toLocaleString()} 件</div>
                        <div className="text-orange-600">疑わしい: {category.suspicious}</div>
                        <div className="text-red-600">ブロック: {category.blocked}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 重要イベント */}
                <div className="bg-white border rounded p-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">🚨 重要セキュリティイベント</h4>
                  <div className="space-y-2">
                    {currentReportData.criticalEvents.map((event: any, index: number) => (
                      <div key={index} className="border-l-4 border-red-500 bg-red-50 p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="font-semibold text-red-800">{event.event}</div>
                            <div className="text-slate-600">ユーザー: {event.user}</div>
                            <div className="text-slate-600">ソース: {event.source}</div>
                          </div>
                          <div>
                            <div className="text-slate-600">時刻: {event.timestamp}</div>
                            <div className="font-semibold text-green-700">対応: {event.action}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* コンプライアンスチェック */}
                <div className="bg-white border rounded p-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">✅ コンプライアンス監査</h4>
                  <div className="space-y-2">
                    {currentReportData.complianceChecks.map((check: any, index: number) => (
                      <div key={index} className="grid grid-cols-4 gap-2 text-sm py-2 border-b">
                        <div className="font-medium">{check.control}</div>
                        <div className={check.status === 'Compliant' ? 'text-green-600 font-semibold' : 'text-yellow-600 font-semibold'}>
                          {check.status}
                        </div>
                        <div className="text-slate-600">{check.retention || check.monitoring || check.tracking}</div>
                        <div className="text-blue-600">{check.coverage}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ベンダー評価レポート */}
            {currentReportType === 'vendor_assessment' && (
              <div className="space-y-4">
                {/* サマリー */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-blue-50 rounded text-center">
                    <div className="text-lg font-bold text-blue-700">{currentReportData.summary.totalVendors}</div>
                    <div className="text-xs text-blue-600">総ベンダー数</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded text-center">
                    <div className="text-lg font-bold text-red-700">{currentReportData.summary.highRiskVendors}</div>
                    <div className="text-xs text-red-600">高リスクベンダー</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded text-center">
                    <div className="text-lg font-bold text-green-700">{currentReportData.summary.assessmentsCompleted}</div>
                    <div className="text-xs text-green-600">評価完了</div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded text-center">
                    <div className="text-lg font-bold text-yellow-700">{currentReportData.summary.contractsUpdated}</div>
                    <div className="text-xs text-yellow-600">契約更新</div>
                  </div>
                </div>

                {/* ベンダー詳細 */}
                <div className="bg-white border rounded p-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">🏢 ベンダーセキュリティ評価</h4>
                  <div className="space-y-3">
                    {currentReportData.vendors.map((vendor: any, index: number) => (
                      <div key={index} className="border rounded p-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <h5 className="font-semibold text-slate-700">{vendor.name}</h5>
                            <div className="text-sm text-slate-600">カテゴリ: {vendor.category}</div>
                            <div className="text-sm text-slate-600">最終評価: {vendor.lastAssessment}</div>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-lg font-bold">{vendor.score}/100</span>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                vendor.riskLevel === 'Low' ? 'bg-green-100 text-green-800' :
                                vendor.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {vendor.riskLevel} Risk
                              </span>
                            </div>
                            {vendor.issues.length > 0 && (
                              <div className="text-xs text-orange-600">
                                課題: {vendor.issues.join(', ')}
                              </div>
                            )}
                          </div>
                          <div>
                            <h6 className="font-semibold text-slate-700 text-sm mb-1">アクション</h6>
                            <div className="text-xs text-slate-600">
                              {vendor.actions.join(', ')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 認証状況 */}
                <div className="bg-white border rounded p-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">🏆 ベンダー認証取得状況</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">ベンダー名</th>
                          <th className="text-center py-2">ISO27001</th>
                          <th className="text-center py-2">SOC2</th>
                          <th className="text-center py-2">PCI-DSS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentReportData.certifications.map((cert: any, index: number) => (
                          <tr key={index} className="border-b">
                            <td className="py-2">{cert.vendor}</td>
                            <td className="text-center py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                cert.iso27001 === 'Valid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {cert.iso27001}
                              </span>
                            </td>
                            <td className="text-center py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                cert.soc2 === 'Valid' ? 'bg-green-100 text-green-800' : 
                                cert.soc2 === 'Expired' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {cert.soc2}
                              </span>
                            </td>
                            <td className="text-center py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                cert.pci === 'Valid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {cert.pci}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* フッター */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsReportDetailModalOpen(false)}>閉じる</Button>
              <Button variant="primary">📄 PDF出力</Button>
              <Button variant="primary">📊 Excel出力</Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default SecurityManagementPage;