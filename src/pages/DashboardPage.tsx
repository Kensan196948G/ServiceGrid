
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from '../components/RouterPlaceholder';
import { Card, Spinner, Button, Notification, NotificationType, Modal, Table } from '../components/CommonUI';
import { 
  getIncidents, 
  getServiceRequests, 
  getSLAs, 
  getVulnerabilities,
  getComplianceControls,
  getServiceStatuses,
  refreshServiceStatuses as refreshServiceStatusesAPI,
  getActiveAlerts,
  refreshActiveAlerts as refreshActiveAlertsAPI,
  acknowledgeAlert as acknowledgeAlertAPI
} from '../services/mockItsmService';
import { getAssets } from '../services/assetApiService';
import { 
  Incident, 
  ServiceRequest, 
  ItemStatus, 
  ServiceLevelAgreement,
  Vulnerability,
  ComplianceControl,
  ServiceStatusItem,
  ServiceHealthStatus,
  AlertItem,
  AlertSeverity,
  UserRole,
  Asset
} from '../types';
import { 
  serviceHealthStatusToJapanese, 
  alertSeverityToJapanese,
  itemStatusToJapanese,
  priorityToJapanese
} from '../localization';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from '../components/ChartPlaceholder';


// Icons for cards (simple text/emoji for now)
const ServiceStatusIcon = () => <span className="text-2xl">🖥️</span>;
const SlaIcon = () => <span className="text-2xl">📊</span>;
const SecurityIcon = () => <span className="text-2xl">🛡️</span>;
const AlertIcon = () => <span className="text-2xl">🚨</span>;
const RecentIncidentIcon = () => <span className="text-2xl">📝</span>;
const ComplianceIcon = () => <span className="text-2xl">⚖️</span>;
const QuickActionIcon = () => <span className="text-2xl">⚡</span>;


const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);

  // Data states
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [slas, setSlas] = useState<ServiceLevelAgreement[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [complianceControls, setComplianceControls] = useState<ComplianceControl[]>([]);
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatusItem[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<AlertItem[]>([]);

  // Loading states for refreshable sections
  const [isServiceStatusRefreshing, setIsServiceStatusRefreshing] = useState(false);
  const [isAlertsRefreshing, setIsAlertsRefreshing] = useState(false);

  // Detailed view states
  const [showDetailedAssets, setShowDetailedAssets] = useState(false);
  const [showDetailedIncidents, setShowDetailedIncidents] = useState(false);
  const [showDetailedRequests, setShowDetailedRequests] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        incidentsData,
        requestsData,
        assetsData,
        slasData,
        vulnerabilitiesData,
        complianceControlsData,
        serviceStatusesData,
        activeAlertsData
      ] = await Promise.all([
        getIncidents(),
        getServiceRequests(),
        getAssets(),
        getSLAs(),
        getVulnerabilities(),
        getComplianceControls(),
        getServiceStatuses(),
        getActiveAlerts()
      ]);
      setIncidents(Array.isArray(incidentsData) ? incidentsData : incidentsData?.data || []);
      setServiceRequests(Array.isArray(requestsData) ? requestsData : requestsData?.data || []);
      setAssets(Array.isArray(assetsData) ? assetsData : assetsData?.data || []);
      setSlas(slasData);
      setVulnerabilities(vulnerabilitiesData);
      setComplianceControls(complianceControlsData);
      setServiceStatuses(serviceStatusesData);
      setActiveAlerts(activeAlertsData);
    } catch (error) {
      console.error("ダッシュボードデータの読み込みに失敗:", error);
      setNotification({ message: 'ダッシュボードデータの読み込みに失敗しました。', type: NotificationType.ERROR });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefreshServiceStatus = async () => {
    setIsServiceStatusRefreshing(true);
    try {
      const data = await refreshServiceStatusesAPI();
      setServiceStatuses(data);
      setNotification({ message: 'サービスステータスを更新しました。', type: NotificationType.SUCCESS });
    } catch (error) {
      setNotification({ message: 'サービスステータスの更新に失敗しました。', type: NotificationType.ERROR });
    } finally {
      setIsServiceStatusRefreshing(false);
    }
  };

  const handleRefreshAlerts = async () => {
    setIsAlertsRefreshing(true);
    try {
      const data = await refreshActiveAlertsAPI();
      setActiveAlerts(data);
      setNotification({ message: '重要アラートを更新しました。', type: NotificationType.SUCCESS });
    } catch (error) {
      setNotification({ message: '重要アラートの更新に失敗しました。', type: NotificationType.ERROR });
    } finally {
      setIsAlertsRefreshing(false);
    }
  };
  
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await acknowledgeAlertAPI(alertId);
      setActiveAlerts(prevAlerts => prevAlerts.filter(a => a.id !== alertId)); // Optimistically remove
      setNotification({ message: `アラート ${alertId.substring(0,8)}... を確認済にしました。`, type: NotificationType.INFO });
      // Optionally, re-fetch alerts if the API doesn't return the updated list or for consistency
      // const updatedAlerts = await getActiveAlerts();
      // setActiveAlerts(updatedAlerts);
    } catch (error) {
      setNotification({ message: 'アラートの確認処理に失敗しました。', type: NotificationType.ERROR });
    }
  };

  // Detail modal handlers
  const showItemDetail = (item: any, type: 'asset' | 'incident' | 'request') => {
    setSelectedDetailItem({ ...item, type });
    setDetailModalOpen(true);
  };

  const renderDetailModal = () => {
    if (!selectedDetailItem) return null;

    const { type, ...item } = selectedDetailItem;
    
    let content = null;
    let title = '';

    switch (type) {
      case 'asset':
        title = `資産詳細: ${item.name}`;
        content = (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><strong>資産タグ:</strong> {item.asset_tag}</div>
              <div><strong>ステータス:</strong> {item.status}</div>
              <div><strong>カテゴリ:</strong> {item.category}</div>
              <div><strong>タイプ:</strong> {item.type}</div>
              <div><strong>製造元:</strong> {item.manufacturer}</div>
              <div><strong>モデル:</strong> {item.model}</div>
              <div><strong>所在地:</strong> {item.location}</div>
              <div><strong>部門:</strong> {item.department}</div>
              <div><strong>IPアドレス:</strong> {item.ip_address || 'なし'}</div>
              <div><strong>購入日:</strong> {item.purchase_date}</div>
            </div>
            {item.description && (
              <div><strong>説明:</strong> {item.description}</div>
            )}
            {item.notes && (
              <div><strong>備考:</strong> {item.notes}</div>
            )}
          </div>
        );
        break;
      
      case 'incident':
        title = `インシデント詳細: ${item.title}`;
        content = (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><strong>ステータス:</strong> {itemStatusToJapanese(item.status)}</div>
              <div><strong>優先度:</strong> {priorityToJapanese(item.priority)}</div>
              <div><strong>報告者:</strong> {item.reported_by || item.reportedBy}</div>
              <div><strong>担当者:</strong> {item.assigned_to || item.assignedTo || '未割り当て'}</div>
              <div><strong>カテゴリ:</strong> {item.category}</div>
              <div><strong>作成日:</strong> {new Date(item.created_at || item.createdAt).toLocaleString()}</div>
            </div>
            <div><strong>説明:</strong> {item.description}</div>
          </div>
        );
        break;
        
      case 'request':
        title = `サービス要求詳細: ${item.subject || item.title}`;
        content = (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><strong>ステータス:</strong> {itemStatusToJapanese(item.status)}</div>
              <div><strong>要求者:</strong> {item.applicant || item.requestedBy}</div>
              <div><strong>申請日:</strong> {new Date(item.requested_date || item.createdAt).toLocaleString()}</div>
              <div><strong>承認者:</strong> {item.approved_by || '未承認'}</div>
              <div><strong>承認日:</strong> {item.approved_date ? new Date(item.approved_date).toLocaleString() : '未承認'}</div>
            </div>
            <div><strong>詳細:</strong> {item.detail || item.description}</div>
          </div>
        );
        break;
    }

    return (
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={title}
        size="lg"
      >
        {content}
      </Modal>
    );
  };

  // Derived data for display
  const openIncidentsCount = incidents.filter(inc => 
    inc.status === ItemStatus.OPEN || inc.status === ItemStatus.IN_PROGRESS || inc.status === ItemStatus.NEW ||
    inc.status === 'Open' || inc.status === 'In Progress' || inc.status === 'New'
  ).length;
  const openRequestsCount = serviceRequests.filter(req => 
    req.status === ItemStatus.OPEN || req.status === ItemStatus.IN_PROGRESS || req.status === ItemStatus.NEW ||
    req.status === 'Submitted' || req.status === 'In Progress' || req.status === 'Open'
  ).length;
  
  const slaComplianceRate = () => {
    const relevantSlas = slas.filter(s => s.performanceStatus);
    if (relevantSlas.length === 0) return 'N/A';
    const metSlas = relevantSlas.filter(s => s.performanceStatus === 'Met').length;
    return `${((metSlas / relevantSlas.length) * 100).toFixed(1)}%`;
  };

  const securityStatusSummary = () => {
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'Critical' && (v.status === ItemStatus.IDENTIFIED || v.status === ItemStatus.IN_PROGRESS)).length;
    const highVulns = vulnerabilities.filter(v => v.severity === 'High' && (v.status === ItemStatus.IDENTIFIED || v.status === ItemStatus.IN_PROGRESS)).length;
    if (criticalVulns > 0) return `危険 (${criticalVulns}件のクリティカルな脆弱性)`;
    if (highVulns > 0) return `警告 (${highVulns}件の高い脆弱性)`;
    return vulnerabilities.length > 0 ? '要注意' : '良好';
  };
  
  const isoComplianceSummary = () => {
    if (complianceControls.length === 0) return '評価前';
    const nonCompliant = complianceControls.filter(c => c.status === ItemStatus.NON_COMPLIANT).length;
    const inReview = complianceControls.filter(c => c.status === ItemStatus.IN_REVIEW).length;
    if (nonCompliant > 0) return `非準拠 (${nonCompliant}件の統制)`;
    if (inReview > 0) return `レビュー中 (${inReview}件の統制)`;
    return '概ね準拠';
  };
  
  const recentOpenIncidents = incidents
    .filter(inc => inc.status === ItemStatus.OPEN || inc.status === ItemStatus.IN_PROGRESS || inc.status === ItemStatus.NEW)
    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Spinner size="lg" /></div>;
  }

  const getServiceStatusColor = (status: ServiceHealthStatus) => {
    switch (status) {
      case ServiceHealthStatus.NORMAL: return 'bg-green-500';
      case ServiceHealthStatus.WARNING: return 'bg-yellow-500';
      case ServiceHealthStatus.CRITICAL: return 'bg-red-500';
      case ServiceHealthStatus.MAINTENANCE: return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };
  
  const getAlertSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL: return 'border-red-500 text-red-700';
      case AlertSeverity.HIGH: return 'border-orange-500 text-orange-700';
      case AlertSeverity.MEDIUM: return 'border-yellow-500 text-yellow-700';
      default: return 'border-slate-400 text-slate-600';
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <h2 className="text-3xl font-semibold text-slate-800">ダッシュボード</h2>

      {/* Overview Stats with clickable details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="オープンインシデント" className="text-center cursor-pointer hover:shadow-lg transition-shadow" 
              actions={<Button size="sm" variant="ghost" onClick={() => setShowDetailedIncidents(!showDetailedIncidents)}>
                {showDetailedIncidents ? '隠す' : '詳細'}
              </Button>}>
            <p className="text-4xl font-bold text-red-600">{openIncidentsCount}</p>
        </Card>
        <Card title="オープンサービスリクエスト" className="text-center cursor-pointer hover:shadow-lg transition-shadow"
              actions={<Button size="sm" variant="ghost" onClick={() => setShowDetailedRequests(!showDetailedRequests)}>
                {showDetailedRequests ? '隠す' : '詳細'}
              </Button>}>
            <p className="text-4xl font-bold text-yellow-600">{openRequestsCount}</p>
        </Card>
        <Card title="管理中資産" className="text-center cursor-pointer hover:shadow-lg transition-shadow"
              actions={<Button size="sm" variant="ghost" onClick={() => setShowDetailedAssets(!showDetailedAssets)}>
                {showDetailedAssets ? '隠す' : '詳細'}
              </Button>}>
            <p className="text-4xl font-bold text-blue-600">{assets.length}</p>
        </Card>
         <Card title="セキュリティ状況" className="text-center">
            <p className={`text-2xl font-bold ${securityStatusSummary().includes("危険") ? 'text-red-600' : securityStatusSummary().includes("警告") ? 'text-yellow-600' : 'text-green-600'}`}>{securityStatusSummary()}</p>
        </Card>
      </div>

      {/* Detailed Views */}
      {showDetailedAssets && (
        <Card title="資産一覧（最新10件）" className="lg:col-span-full">
          <div className="max-h-80 overflow-y-auto">
            <Table
              columns={[
                { Header: '資産タグ', accessor: 'asset_tag' },
                { Header: '名前', accessor: 'name' },
                { Header: 'タイプ', accessor: 'type' },
                { Header: 'ステータス', accessor: 'status' },
                { Header: '所在地', accessor: 'location' },
                { Header: '部門', accessor: 'department' }
              ]}
              data={assets.slice(0, 10)}
              onRowClick={(asset) => showItemDetail(asset, 'asset')}
            />
          </div>
          <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => navigate('/assets')}>
            すべての資産を表示
          </Button>
        </Card>
      )}

      {showDetailedIncidents && (
        <Card title="インシデント一覧（オープン中）" className="lg:col-span-full">
          <div className="max-h-80 overflow-y-auto">
            <Table
              columns={[
                { Header: 'タイトル', accessor: 'title' },
                { Header: 'ステータス', accessor: (row) => itemStatusToJapanese(row.status) },
                { Header: '優先度', accessor: (row) => priorityToJapanese(row.priority) },
                { Header: '報告者', accessor: (row) => row.reported_by || row.reportedBy },
                { Header: '担当者', accessor: (row) => row.assigned_to || row.assignedTo || '未割り当て' },
                { Header: '作成日', accessor: (row) => new Date(row.created_at || row.createdAt).toLocaleDateString() }
              ]}
              data={incidents.filter(inc => inc.status === ItemStatus.OPEN || inc.status === ItemStatus.IN_PROGRESS || inc.status === ItemStatus.NEW || inc.status === 'Open' || inc.status === 'In Progress')}
              onRowClick={(incident) => showItemDetail(incident, 'incident')}
            />
          </div>
          <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => navigate('/incidents')}>
            すべてのインシデントを表示
          </Button>
        </Card>
      )}

      {showDetailedRequests && (
        <Card title="サービス要求一覧（オープン中）" className="lg:col-span-full">
          <div className="max-h-80 overflow-y-auto">
            <Table
              columns={[
                { Header: 'タイトル', accessor: (row) => row.subject || row.title },
                { Header: 'ステータス', accessor: (row) => itemStatusToJapanese(row.status) },
                { Header: '要求者', accessor: (row) => row.applicant || row.requestedBy },
                { Header: '申請日', accessor: (row) => new Date(row.requested_date || row.createdAt).toLocaleDateString() },
                { Header: '承認状況', accessor: (row) => row.approved_by ? '承認済み' : '未承認' }
              ]}
              data={serviceRequests.filter(req => req.status === ItemStatus.OPEN || req.status === ItemStatus.IN_PROGRESS || req.status === ItemStatus.NEW || req.status === 'Submitted' || req.status === 'In Progress')}
              onRowClick={(request) => showItemDetail(request, 'request')}
            />
          </div>
          <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => navigate('/service-requests')}>
            すべてのサービス要求を表示
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Status Card */}
        <Card title="サービスステータス" className="lg:col-span-2" actions={
          <Button size="sm" onClick={handleRefreshServiceStatus} isLoading={isServiceStatusRefreshing} disabled={isServiceStatusRefreshing}>
            {isServiceStatusRefreshing ? "更新中..." : "更新"}
          </Button>
        }>
          {isServiceStatusRefreshing && serviceStatuses.length === 0 ? <Spinner /> :
          serviceStatuses.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {serviceStatuses.map(service => (
                <div key={service.id} className="p-3 bg-slate-50 rounded-md shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-slate-700">{service.name}</h4>
                    <span className={`px-3 py-1 text-xs font-bold text-white rounded-full ${getServiceStatusColor(service.status)}`}>
                      {serviceHealthStatusToJapanese(service.status)}
                    </span>
                  </div>
                  {service.description && <p className="text-xs text-slate-500 mt-1">{service.description}</p>}
                  <p className="text-xs text-slate-400 mt-1">最終確認: {new Date(service.lastChecked).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 italic">サービスステータス情報を読み込めませんでした。</p>
          )}
        </Card>

        {/* Quick Actions Card */}
        <Card title="クイックアクション" className="lg:col-span-1">
          <div className="space-y-3">
            <Button variant="primary" className="w-full" onClick={() => navigate('/incidents', { state: { openModal: true }})}>
              <RecentIncidentIcon/> <span className="ml-2">新規インシデント作成</span>
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => navigate('/requests', { state: { openModal: true }})}>
              <ServiceStatusIcon/> <span className="ml-2">新規サービスリクエスト</span>
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate('/knowledge')}>
              <span className="w-5 h-5 mr-2">📚</span>ナレッジベース検索
            </Button>
             {user?.role === UserRole.ADMIN && (
                <Button variant="ghost" className="w-full" onClick={() => navigate('/assets', { state: { openModal: true }})}>
                    <span className="w-5 h-5 mr-2">📦</span>新規資産登録
                </Button>
             )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Important Alerts Card */}
        <Card title="重要アラート" className="lg:col-span-2" actions={
          <Button size="sm" onClick={handleRefreshAlerts} isLoading={isAlertsRefreshing} disabled={isAlertsRefreshing}>
            {isAlertsRefreshing ? "更新中..." : "更新"}
          </Button>
        }>
          {isAlertsRefreshing && activeAlerts.length === 0 ? <Spinner /> :
          activeAlerts.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {activeAlerts.map(alert => (
                <div key={alert.id} className={`p-3 border-l-4 rounded-r-md ${getAlertSeverityColor(alert.severity)} bg-opacity-10 ${
                    alert.severity === AlertSeverity.CRITICAL ? 'bg-red-50' :
                    alert.severity === AlertSeverity.HIGH ? 'bg-orange-50' :
                    alert.severity === AlertSeverity.MEDIUM ? 'bg-yellow-50' : 'bg-slate-50'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                        <p className="font-semibold">{alert.message}</p>
                        <p className="text-xs text-slate-500">
                            {new Date(alert.timestamp).toLocaleString()} ({alertSeverityToJapanese(alert.severity)})
                            {alert.source && ` - ${alert.source}`}
                        </p>
                    </div>
                    {!alert.acknowledged && user?.role === UserRole.ADMIN && (
                        <Button size="sm" variant="ghost" onClick={() => handleAcknowledgeAlert(alert.id)}>確認</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 italic">現在、対応が必要な重要アラートはありません。</p>
          )}
        </Card>
        
        {/* Recent Incidents Card */}
        <Card title="最近のインシデント" className="lg:col-span-1">
          {recentOpenIncidents.length > 0 ? (
            <ul className="space-y-2 text-sm max-h-80 overflow-y-auto pr-2">
              {recentOpenIncidents.map(inc => (
                <li key={inc.id} className="p-2 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer" onClick={() => navigate(`/incidents`, {state: { selectedIncidentId: inc.id}})}>
                  <div className="font-medium text-blue-600">{inc.title}</div>
                  <div className="text-xs text-slate-500">
                    優先度: {priorityToJapanese(inc.priority)} | ステータス: {itemStatusToJapanese(inc.status)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 italic">現在オープンなインシデントはありません。</p>
          )}
          <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => navigate('/incidents')}>
            すべてのインシデントを表示
          </Button>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SLA Compliance Chart */}
        <Card title="SLA遵守状況 (個別)">
          {slas.filter(s => s.currentPerformance !== undefined).length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={slas.filter(s => s.currentPerformance !== undefined).map(s => ({name: s.metricName, 実績: s.currentPerformance, 目標: s.targetValue}))} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" unit="%" domain={[0, 'dataMax + 5 > 100 ? 100 : dataMax + 5']}/>
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(2)}${name === '目標' ? '%' : '%'}`, name]}/>
                <Legend />
                <Bar dataKey="実績" fill="#3B82F6" barSize={20}>
                    {slas.filter(s => s.currentPerformance !== undefined).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.performanceStatus === 'Met' ? '#10B981' : entry.performanceStatus === 'At Risk' ? '#F59E0B' : '#EF4444'} />
                    ))}
                </Bar>
                <Bar dataKey="目標" fill="#A855F7" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 italic">SLAデータがありません。</p>
          )}
        </Card>

        {/* ISO Compliance Status Card */}
        <Card title="ISOコンプライアンスステータス">
          <div className="text-center mb-4">
            <ComplianceIcon />
            <p className={`text-2xl font-bold mt-2 ${isoComplianceSummary().includes("非準拠") ? 'text-red-600' : isoComplianceSummary().includes("レビュー中") ? 'text-yellow-600' : 'text-green-600'}`}>
                {isoComplianceSummary()}
            </p>
          </div>
           <h4 className="font-semibold text-slate-700 mb-2">主要統制項目:</h4>
           {complianceControls.length > 0 ? (
            <ul className="space-y-1 text-xs max-h-48 overflow-y-auto pr-2">
                {complianceControls.slice(0,5).map(control => ( // Show first 5
                    <li key={control.id} className="flex justify-between p-1.5 bg-slate-50 rounded">
                        <span>{control.name} ({control.controlId})</span>
                        <span className={`font-semibold ${
                            control.status === ItemStatus.COMPLIANT ? 'text-green-600' :
                            control.status === ItemStatus.NON_COMPLIANT ? 'text-red-600' :
                            control.status === ItemStatus.IN_REVIEW ? 'text-yellow-700' : 'text-slate-500'
                        }`}>
                            {itemStatusToJapanese(control.status)}
                        </span>
                    </li>
                ))}
            </ul>
           ) : (
             <p className="text-slate-500 italic text-xs">コンプライアンス統制データがありません。</p>
           )}
          <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => navigate('/compliance-management')}>
            すべてのコンプライアンス統制を表示
          </Button>
        </Card>
      </div>

      {/* Detail Modal */}
      {renderDetailModal()}
    </div>
  );
};

export default DashboardPage;
