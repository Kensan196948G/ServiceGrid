
import * as React from 'react';
const { useState, useEffect, useCallback, useMemo } = React;
import { 
    AvailabilityRecord, UserRole, ServiceImportance, CurrentServiceStatus,
    AvailabilityQuickActionFormData
} from '../types';
import { 
    getAvailabilityRecords, addAvailabilityRecord, updateAvailabilityRecord, deleteAvailabilityRecord,
    addAuditLog
} from '../services/mockItsmService';
import { 
    Table, Spinner, Card, Notification, NotificationType, Button, Modal, Input, Select, Textarea 
} from '../components/CommonUI';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from '../components/ChartPlaceholder';
import { useAuth } from '../contexts/AuthContext';
import { serviceImportanceToJapanese, currentServiceStatusToJapanese } from '../localization';

const AvailabilityManagementPage: React.FC = () => {
  const [allAvailabilityRecords, setAllAvailabilityRecords] = useState<AvailabilityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [isRealTimeMonitoring, setIsRealTimeMonitoring] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const { user } = useAuth();

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Partial<AvailabilityRecord> | null>(null);
  
  const [selectedServiceForTrend, setSelectedServiceForTrend] = useState<AvailabilityRecord | null>(null);

  // Quick Action Modals State
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isOutageReportModalOpen, setIsOutageReportModalOpen] = useState(false);
  const [isAvailabilityReportModalOpen, setIsAvailabilityReportModalOpen] = useState(false);
  const [isMaintenanceRequestModalOpen, setIsMaintenanceRequestModalOpen] = useState(false);
  const [isMonitoringSettingsModalOpen, setIsMonitoringSettingsModalOpen] = useState(false);
  const [quickActionFormData, setQuickActionFormData] = useState<AvailabilityQuickActionFormData>({
    action: 'maintenance'
  });


  const serviceImportanceOptions: ServiceImportance[] = Object.values(ServiceImportance);
  const currentServiceStatusOptions: CurrentServiceStatus[] = Object.values(CurrentServiceStatus);

  // 定義済みサービス一覧（新規追加用）
  const predefinedServices = [
    { name: 'メールサービス (Exchange Online)', category: 'コミュニケーション', defaultImportance: ServiceImportance.CRITICAL, defaultTarget: 99.9 },
    { name: '社内ポータル', category: 'ポータル', defaultImportance: ServiceImportance.HIGH, defaultTarget: 99.5 },
    { name: '基幹システム (SAP)', category: 'ERP', defaultImportance: ServiceImportance.CRITICAL, defaultTarget: 99.8 },
    { name: '顧客ポータルサイト', category: 'Webサイト', defaultImportance: ServiceImportance.CRITICAL, defaultTarget: 99.9 },
    { name: 'データベースサーバー (Oracle)', category: 'データベース', defaultImportance: ServiceImportance.CRITICAL, defaultTarget: 99.95 },
    { name: 'データベースサーバー (MySQL)', category: 'データベース', defaultImportance: ServiceImportance.HIGH, defaultTarget: 99.5 },
    { name: 'データベースサーバー (PostgreSQL)', category: 'データベース', defaultImportance: ServiceImportance.HIGH, defaultTarget: 99.5 },
    { name: 'APIゲートウェイ', category: 'API', defaultImportance: ServiceImportance.HIGH, defaultTarget: 99.5 },
    { name: '認証サーバー（ADサーバー/LDAPサーバー）', category: '認証', defaultImportance: ServiceImportance.CRITICAL, defaultTarget: 99.9 },
    { name: 'ファイルサーバー', category: 'ストレージ', defaultImportance: ServiceImportance.MEDIUM, defaultTarget: 99.0 },
    { name: 'モバイルアプリケーション', category: 'アプリケーション', defaultImportance: ServiceImportance.HIGH, defaultTarget: 99.5 },
    { name: 'チャットシステム (Teams)', category: 'コミュニケーション', defaultImportance: ServiceImportance.MEDIUM, defaultTarget: 99.0 },
    { name: 'チャットシステム (Slack)', category: 'コミュニケーション', defaultImportance: ServiceImportance.MEDIUM, defaultTarget: 99.0 },
    { name: 'バックアップシステム', category: 'バックアップ', defaultImportance: ServiceImportance.HIGH, defaultTarget: 99.5 },
    { name: '監視システム (Zabbix)', category: '監視', defaultImportance: ServiceImportance.HIGH, defaultTarget: 99.5 },
    { name: '監視システム (Nagios)', category: '監視', defaultImportance: ServiceImportance.HIGH, defaultTarget: 99.5 },
    { name: 'DNSサーバー', category: 'ネットワーク', defaultImportance: ServiceImportance.CRITICAL, defaultTarget: 99.9 },
    { name: 'VPNサーバー', category: 'ネットワーク', defaultImportance: ServiceImportance.MEDIUM, defaultTarget: 99.0 },
    { name: '印刷サーバー', category: '印刷', defaultImportance: ServiceImportance.LOW, defaultTarget: 98.0 },
    { name: 'Webサーバー (Apache)', category: 'Webサーバー', defaultImportance: ServiceImportance.HIGH, defaultTarget: 99.5 },
    { name: 'Webサーバー (Nginx)', category: 'Webサーバー', defaultImportance: ServiceImportance.HIGH, defaultTarget: 99.5 },
    { name: 'ロードバランサー', category: 'ネットワーク', defaultImportance: ServiceImportance.CRITICAL, defaultTarget: 99.9 },
    { name: 'CDNサービス', category: 'コンテンツ配信', defaultImportance: ServiceImportance.HIGH, defaultTarget: 99.5 },
    { name: 'クラウドストレージ', category: 'ストレージ', defaultImportance: ServiceImportance.MEDIUM, defaultTarget: 99.0 },
    { name: 'ビデオ会議システム', category: 'コミュニケーション', defaultImportance: ServiceImportance.MEDIUM, defaultTarget: 99.0 },
    { name: 'CRMシステム', category: 'CRM', defaultImportance: ServiceImportance.HIGH, defaultTarget: 99.5 },
    { name: 'ERPシステム', category: 'ERP', defaultImportance: ServiceImportance.CRITICAL, defaultTarget: 99.8 },
    { name: 'BI・分析システム', category: 'BI', defaultImportance: ServiceImportance.MEDIUM, defaultTarget: 99.0 },
    { name: 'その他', category: 'その他', defaultImportance: ServiceImportance.MEDIUM, defaultTarget: 99.0 },
  ];

  // サービスIDを自動生成する関数
  const generateServiceId = (_serviceName: string, serviceCategory: string) => {
    // カテゴリ別のプレフィックス
    const categoryPrefixes: { [key: string]: string } = {
      'コミュニケーション': 'COMM',
      'ポータル': 'PORT',
      'ERP': 'ERP',
      'Webサイト': 'WEB',
      'データベース': 'DB',
      'API': 'API',
      '認証': 'AUTH',
      'ストレージ': 'STG',
      'アプリケーション': 'APP',
      'バックアップ': 'BKP',
      '監視': 'MON',
      'ネットワーク': 'NET',
      '印刷': 'PRT',
      'Webサーバー': 'WEB',
      'コンテンツ配信': 'CDN',
      'CRM': 'CRM',
      'BI': 'BI',
      'その他': 'OTH'
    };

    const prefix = categoryPrefixes[serviceCategory] || 'SRV';
    
    // 既存のサービスIDから同じプレフィックスのものを検索
    const existingIds = allAvailabilityRecords
      .map(r => r.serviceId)
      .filter(id => id.startsWith(prefix))
      .map(id => {
        const numberPart = id.replace(prefix, '');
        return parseInt(numberPart, 10) || 0;
      });

    // 次の連番を生成
    const nextNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  };

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const records = await getAvailabilityRecords();
      setAllAvailabilityRecords(records.sort((a,b) => a.serviceName.localeCompare(b.serviceName)));
      if (records.length > 0 && !selectedServiceForTrend) {
        const firstWithHistory = records.find(r => r.historicalUptime && r.historicalUptime.length > 0);
        setSelectedServiceForTrend(firstWithHistory || records[0]);
      }
      // TODO: Fetch Incidents and SLAs if needed for linking in display
    } catch (error) {
      console.error("可用性データの読み込みに失敗:", error);
      setNotification({ message: '可用性データの読み込みに失敗しました。', type: NotificationType.ERROR });
    } finally {
      setIsLoading(false);
    }
  }, [selectedServiceForTrend]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  
  // Real-time monitoring effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRealTimeMonitoring) {
      interval = setInterval(() => {
        fetchAllData();
        setLastRefreshed(new Date());
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRealTimeMonitoring, fetchAllData]);

  // Record Add/Edit Modal Handlers
  const handleOpenRecordModal = (record?: AvailabilityRecord) => {
    setEditingRecord(record ? { ...record } : {
      serviceId: `SRV${Date.now().toString().slice(-4)}`, serviceName: '', 
      importance: ServiceImportance.MEDIUM, currentStatus: CurrentServiceStatus.OPERATIONAL,
      targetUptimePercentage: 99.9, historicalUptime: []
    });
    setIsRecordModalOpen(true);
  };
  const handleCloseRecordModal = () => { setIsRecordModalOpen(false); setEditingRecord(null);};

  const handleRecordInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (editingRecord) {
      const { name, value } = e.target;
      const numericFields = ['targetUptimePercentage', 'actualUptimePercentage', 'totalDowntimeMinutes', 'plannedDowntimeMinutes', 'numberOfOutages', 'mtbfHours', 'mttrHours'];
      if (numericFields.includes(name)) {
        setEditingRecord({ ...editingRecord, [name]: parseFloat(value) || undefined });
      } else {
        setEditingRecord({ ...editingRecord, [name]: value });
      }
    }
  };

  // サービス選択時の処理（サービス名から自動でIDや設定を生成）
  const handleServiceSelection = (selectedServiceName: string) => {
    if (!editingRecord) return;

    const selectedService = predefinedServices.find(s => s.name === selectedServiceName);
    if (selectedService) {
      // 新規作成時のみIDを自動生成、編集時は既存IDを保持
      const updatedRecord = {
        ...editingRecord,
        serviceName: selectedService.name,
        importance: selectedService.defaultImportance,
        targetUptimePercentage: selectedService.defaultTarget,
        currentStatus: CurrentServiceStatus.OPERATIONAL,
      };

      // 新規作成時のみサービスIDを生成
      if (!editingRecord.id) {
        updatedRecord.serviceId = generateServiceId(selectedService.name, selectedService.category);
      }

      setEditingRecord(updatedRecord);
    } else if (selectedServiceName === 'custom') {
      // カスタム入力モード
      const updatedRecord = {
        ...editingRecord,
        serviceName: editingRecord.id ? editingRecord.serviceName : '', // 編集時は既存名を保持
      };
      
      // 新規作成時のみIDをクリア
      if (!editingRecord.id) {
        updatedRecord.serviceId = '';
      }
      
      setEditingRecord(updatedRecord);
    }
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !user) return;
    try {
      const currentUserInfo = { userId: user.id, username: user.username };
      if (editingRecord.id) {
        await updateAvailabilityRecord(editingRecord.id, editingRecord as AvailabilityRecord, currentUserInfo);
        setNotification({ message: '可用性記録が正常に更新されました。', type: NotificationType.SUCCESS });
      } else {
        await addAvailabilityRecord(editingRecord as Omit<AvailabilityRecord, 'id'|'lastRefreshed'>, currentUserInfo);
        setNotification({ message: '可用性記録が正常に追加されました。', type: NotificationType.SUCCESS });
      }
      fetchAllData();
      handleCloseRecordModal();
    } catch (error) {
      console.error("可用性記録の保存に失敗:", error);
      setNotification({ message: '可用性記録の保存に失敗しました。', type: NotificationType.ERROR });
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!user) return;
    if (window.confirm('この可用性記録を削除してもよろしいですか？')) {
      try {
        await deleteAvailabilityRecord(id, { userId: user.id, username: user.username });
        setNotification({ message: '可用性記録が正常に削除されました。', type: NotificationType.SUCCESS });
        fetchAllData();
      } catch (error) {
        console.error("可用性記録の削除に失敗:", error);
        setNotification({ message: '可用性記録の削除に失敗しました。', type: NotificationType.ERROR });
      }
    }
  };
  
  // Quick Action Handlers
  const openQuickActionModal = (modalSetFunction: React.Dispatch<React.SetStateAction<boolean>>, serviceId?: string) => {
    setQuickActionFormData({ action: 'maintenance', selectedServiceId: serviceId || allAvailabilityRecords[0]?.id });
    modalSetFunction(true);
  };
  const handleQuickActionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuickActionFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleGenericQuickAction = async (actionName: string, detailsCallback: (data: AvailabilityQuickActionFormData, service?: AvailabilityRecord) => string, modalCloseFn: () => void ) => {
    if (!user || !quickActionFormData.selectedServiceId) return;
    const service = allAvailabilityRecords.find(r => r.id === quickActionFormData.selectedServiceId);
    await addAuditLog({ userId: user.id, username: user.username, action: `可用性管理: ${actionName}`, details: detailsCallback(quickActionFormData, service) });
    setNotification({ message: `${actionName}が正常に実行されました（シミュレーション）。`, type: NotificationType.SUCCESS });
    modalCloseFn();
    setQuickActionFormData({ action: 'maintenance' });
  };

  // Data for Dashboard Chart
  const dashboardChartData = allAvailabilityRecords
    .filter(r => r.actualUptimePercentage !== undefined)
    .map(r => ({
      name: r.serviceName.substring(0,15) + (r.serviceName.length > 15 ? '...' : ''), // Shorten name for chart
      実績: r.actualUptimePercentage,
      目標: r.targetUptimePercentage,
      fill: (r.actualUptimePercentage || 0) >= r.targetUptimePercentage ? '#10B981' : 
            (r.actualUptimePercentage || 0) >= r.targetUptimePercentage * 0.99 ? '#FBBF24' : '#EF4444'
  }));
  
  const serviceOptionsForSelect = allAvailabilityRecords.map(r => ({ value: r.id, label: r.serviceName }));

  // 新規作成用のサービス選択オプション（既存サービスを除外）
  const availableServiceOptions = useMemo(() => {
    const existingServiceNames = allAvailabilityRecords.map(r => r.serviceName);
    const availableServices = predefinedServices.filter(service => 
      !existingServiceNames.includes(service.name)
    );
    
    return [
      { value: '', label: 'サービスを選択してください' },
      ...availableServices.map(service => ({ 
        value: service.name, 
        label: `${service.name} (${service.category})` 
      })),
      { value: 'custom', label: '🔧 カスタム入力 (手動設定)' }
    ];
  }, [allAvailabilityRecords]);

  // 編集時用のサービス選択オプション（現在編集中のサービス以外の既存サービスを除外）
  const editServiceOptions = useMemo(() => {
    const currentServiceName = editingRecord?.serviceName;
    const existingServiceNames = allAvailabilityRecords
      .map(r => r.serviceName)
      .filter(name => name !== currentServiceName); // 現在編集中のサービスは除外しない
    
    const availableServices = predefinedServices.filter(service => 
      !existingServiceNames.includes(service.name)
    );
    
    return [
      { value: '', label: 'サービスを選択してください' },
      ...availableServices.map(service => ({ 
        value: service.name, 
        label: `${service.name} (${service.category})` 
      })),
      { value: 'custom', label: '🔧 カスタム入力 (手動設定)' }
    ];
  }, [allAvailabilityRecords, editingRecord]);

  if (isLoading && !allAvailabilityRecords.length) {
    return <div className="flex justify-center items-center h-full"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 pb-10">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-semibold text-slate-800">可用性管理</h2>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">リアルタイム監視:</span>
            <button
              onClick={() => setIsRealTimeMonitoring(!isRealTimeMonitoring)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isRealTimeMonitoring ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isRealTimeMonitoring ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            {isRealTimeMonitoring && (
              <span className="flex items-center text-xs text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                稼働中
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500">
            最終更新: {lastRefreshed.toLocaleTimeString()}
          </div>
          {user?.role === UserRole.ADMIN && (
            <Button onClick={() => handleOpenRecordModal()}>可用性記録 追加/編集</Button>
          )}
        </div>
      </div>

      {/* Alert Banner */}
      {allAvailabilityRecords.some(r => r.currentStatus === CurrentServiceStatus.OUTAGE) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">緊急アラート: サービス障害が発生しています</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {allAvailabilityRecords.filter(r => r.currentStatus === CurrentServiceStatus.OUTAGE).map(r => (
                    <li key={r.id}>{r.serviceName} - サービス停止中</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {allAvailabilityRecords.some(r => r.actualUptimePercentage && r.actualUptimePercentage < r.targetUptimePercentage * 0.99) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">警告: SLA目標未達成のサービスがあります</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  {allAvailabilityRecords.filter(r => r.actualUptimePercentage && r.actualUptimePercentage < r.targetUptimePercentage * 0.99).map(r => (
                    <li key={r.id}>{r.serviceName} - 目標: {r.targetUptimePercentage}%, 実績: {r.actualUptimePercentage?.toFixed(2)}%</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card title="📊 可用性ダッシュボード">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="p-3 bg-blue-50 rounded text-center">
            <h4 className="text-sm font-semibold text-blue-700">現在の稼働状況 (主要サービス)</h4>
            {allAvailabilityRecords.filter(r => r.importance === ServiceImportance.CRITICAL).slice(0,1).map(r => (
                <p key={r.id} className={`text-lg font-bold ${r.currentStatus === CurrentServiceStatus.OPERATIONAL ? 'text-green-600': 'text-red-600'}`}>{r.serviceName}: {currentServiceStatusToJapanese(r.currentStatus)}</p>
            ))}
            {allAvailabilityRecords.filter(r => r.importance === ServiceImportance.CRITICAL).length === 0 && <p className="text-sm text-slate-500">データなし</p>}
          </div>
          <div className="p-3 bg-green-50 rounded text-center">
            <h4 className="text-sm font-semibold text-green-700">可用性目標達成中のサービス</h4>
            <p className="text-2xl font-bold text-green-600">{allAvailabilityRecords.filter(r => r.actualUptimePercentage && r.actualUptimePercentage >= r.targetUptimePercentage).length}件</p>
          </div>
           <div className="p-3 bg-yellow-50 rounded text-center">
            <h4 className="text-sm font-semibold text-yellow-700">稼働時間サマリー (今月)</h4>
            <p className="text-lg font-bold text-yellow-600">累計稼働時間: 集計中...</p>
          </div>
        </div>
        <h4 className="text-md font-semibold text-slate-700 mb-2">システム別稼働率 (目標との比較)</h4>
        {dashboardChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardChartData} layout="vertical" margin={{left: 30}}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" unit="%" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                    <Legend />
                    <Bar dataKey="実績" name="実績稼働率">
                        {dashboardChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Bar>
                    <Bar dataKey="目標" name="目標稼働率" fill="#A78BFA" />
                </BarChart>
            </ResponsiveContainer>
        ): <p className="text-slate-500 italic">グラフ表示用データが不足しています。</p>}
      </Card>
      
      <Card title="🚨 障害・停止情報">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="p-3 bg-red-50 rounded text-center">
            <h4 className="text-sm font-semibold text-red-700">現在の障害</h4>
            <p className="text-2xl font-bold text-red-600">
              {allAvailabilityRecords.filter(r => r.currentStatus === CurrentServiceStatus.OUTAGE).length}件
            </p>
          </div>
          <div className="p-3 bg-yellow-50 rounded text-center">
            <h4 className="text-sm font-semibold text-yellow-700">性能低下</h4>
            <p className="text-2xl font-bold text-yellow-600">
              {allAvailabilityRecords.filter(r => r.currentStatus === CurrentServiceStatus.DEGRADED).length}件
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded text-center">
            <h4 className="text-sm font-semibold text-blue-700">メンテナンス中</h4>
            <p className="text-2xl font-bold text-blue-600">
              {allAvailabilityRecords.filter(r => r.currentStatus === CurrentServiceStatus.MAINTENANCE).length}件
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded text-center">
            <h4 className="text-sm font-semibold text-green-700">正常稼働</h4>
            <p className="text-2xl font-bold text-green-600">
              {allAvailabilityRecords.filter(r => r.currentStatus === CurrentServiceStatus.OPERATIONAL).length}件
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border">
          <h4 className="text-sm font-semibold text-slate-700 p-3 border-b">📋 最近の障害・停止事例</h4>
          <div className="space-y-2 p-3">
            <div className="flex justify-between items-start p-2 bg-red-50 rounded">
              <div>
                <span className="text-xs font-medium text-red-800">2024-06-06 09:15 - 10:30</span>
                <p className="text-sm text-red-700">顧客ポータルサーバー停止 (データベース接続エラー)</p>
                <span className="text-xs text-red-600">影響: 全ユーザー, 復旧時間: 75分</span>
              </div>
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">解決済み</span>
            </div>
            <div className="flex justify-between items-start p-2 bg-yellow-50 rounded">
              <div>
                <span className="text-xs font-medium text-yellow-800">2024-06-05 14:20 - 14:45</span>
                <p className="text-sm text-yellow-700">メールシステム性能低下 (メール送信遅延)</p>
                <span className="text-xs text-yellow-600">影響: 社内ユーザー500名, 復旧時間: 25分</span>
              </div>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">解決済み</span>
            </div>
            <div className="flex justify-between items-start p-2 bg-blue-50 rounded">
              <div>
                <span className="text-xs font-medium text-blue-800">2024-06-04 23:00 - 01:00</span>
                <p className="text-sm text-blue-700">基幹システム定期メンテナンス (OSアップデート)</p>
                <span className="text-xs text-blue-600">影響: なし (計画停止), 所要時間: 2時間</span>
              </div>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">完了</span>
            </div>
            <div className="flex justify-between items-start p-2 bg-orange-50 rounded">
              <div>
                <span className="text-xs font-medium text-orange-800">2024-06-03 11:00 - 11:30</span>
                <p className="text-sm text-orange-700">ネットワーク機器障害 (スイッチ冗長化切替)</p>
                <span className="text-xs text-orange-600">影響: 部分的, 復旧時間: 30分</span>
              </div>
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">解決済み</span>
            </div>
            <div className="flex justify-between items-start p-2 bg-red-50 rounded">
              <div>
                <span className="text-xs font-medium text-red-800">2024-06-02 16:45 - 17:15</span>
                <p className="text-sm text-red-700">APIゲートウェイ障害 (認証サーバー連携エラー)</p>
                <span className="text-xs text-red-600">影響: モバイルアプリユーザー, 復旧時間: 30分</span>
              </div>
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">解決済み</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 border rounded">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">MTBF/MTTR 指標</h4>
            {allAvailabilityRecords.filter(r => r.mtbfHours || r.mttrHours).slice(0, 3).map(record => (
              <div key={record.id} className="text-xs mb-1">
                <span className="font-medium">{record.serviceName}:</span>
                <span className="ml-2">MTBF: {record.mtbfHours || 'N/A'}h</span>
                <span className="ml-2">MTTR: {record.mttrHours || 'N/A'}h</span>
              </div>
            ))}
            {allAvailabilityRecords.filter(r => r.mtbfHours || r.mttrHours).length === 0 && (
              <p className="text-xs text-slate-500">データがありません</p>
            )}
          </div>
          
          <div className="p-3 border rounded">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">ダウンタイムサマリー</h4>
            {allAvailabilityRecords.filter(r => r.totalDowntimeMinutes).slice(0, 3).map(record => (
              <div key={record.id} className="text-xs mb-1">
                <span className="font-medium">{record.serviceName}:</span>
                <span className="ml-2">合計: {record.totalDowntimeMinutes}min</span>
                <span className="ml-2">計画: {record.plannedDowntimeMinutes || 0}min</span>
              </div>
            ))}
            {allAvailabilityRecords.filter(r => r.totalDowntimeMinutes).length === 0 && (
              <p className="text-xs text-slate-500">データがありません</p>
            )}
          </div>
        </div>
      </Card>
      
      <Card title="📊 可用性記録一覧">
        {allAvailabilityRecords.length > 0 ? (
          <Table
            columns={[
              { Header: 'ID', accessor: 'serviceId' },
              { Header: 'サービス名', accessor: 'serviceName' },
              { 
                Header: '重要度', 
                accessor: (row: AvailabilityRecord) => (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    row.importance === ServiceImportance.CRITICAL ? 'bg-red-100 text-red-800' :
                    row.importance === ServiceImportance.HIGH ? 'bg-orange-100 text-orange-800' :
                    row.importance === ServiceImportance.MEDIUM ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {serviceImportanceToJapanese(row.importance)}
                  </span>
                )
              },
              { 
                Header: '現在のステータス', 
                accessor: (row: AvailabilityRecord) => (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    row.currentStatus === CurrentServiceStatus.OPERATIONAL ? 'bg-green-100 text-green-800' :
                    row.currentStatus === CurrentServiceStatus.DEGRADED ? 'bg-yellow-100 text-yellow-800' :
                    row.currentStatus === CurrentServiceStatus.OUTAGE ? 'bg-red-100 text-red-800' :
                    row.currentStatus === CurrentServiceStatus.MAINTENANCE ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {currentServiceStatusToJapanese(row.currentStatus)}
                  </span>
                )
              },
              { 
                Header: '目標稼働率', 
                accessor: (row: AvailabilityRecord) => `${row.targetUptimePercentage}%`
              },
              { 
                Header: '実績稼働率', 
                accessor: (row: AvailabilityRecord) => {
                  if (row.actualUptimePercentage === undefined) return 'データなし';
                  const isGood = row.actualUptimePercentage >= row.targetUptimePercentage;
                  const isWarning = row.actualUptimePercentage >= row.targetUptimePercentage * 0.99;
                  return (
                    <span className={`font-mono ${isGood ? 'text-green-600' : isWarning ? 'text-yellow-600' : 'text-red-600'}`}>
                      {row.actualUptimePercentage.toFixed(2)}%
                    </span>
                  );
                }
              },
              { 
                Header: '最終更新', 
                accessor: (row: AvailabilityRecord) => row.lastRefreshed ? new Date(row.lastRefreshed).toLocaleString() : '未更新'
              },
              { 
                Header: '操作', 
                accessor: (row: AvailabilityRecord) => (
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => handleOpenRecordModal(row)}>編集</Button>
                    {user?.role === UserRole.ADMIN && (
                      <Button size="sm" variant="danger" onClick={() => handleDeleteRecord(row.id)}>削除</Button>
                    )}
                  </div>
                )
              }
            ]}
            data={allAvailabilityRecords}
            onRowClick={(record) => setSelectedServiceForTrend(record)}
          />
        ) : (
          <p className="text-slate-500 italic p-4 text-center">可用性記録がありません。</p>
        )}
      </Card>
      
      <Card title="📈 可用性指標・分析">
         <Select
            label="トレンド分析対象サービス:"
            options={serviceOptionsForSelect}
            value={selectedServiceForTrend?.id || ''}
            onChange={(e) => setSelectedServiceForTrend(allAvailabilityRecords.find(r => r.id === e.target.value) || null)}
            className="mb-3 max-w-md"
        />
        {selectedServiceForTrend && selectedServiceForTrend.historicalUptime && selectedServiceForTrend.historicalUptime.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={selectedServiceForTrend.historicalUptime.map(p => ({date: p.date, '実績稼働率': p.uptimePercentage, '目標稼働率': selectedServiceForTrend.targetUptimePercentage}))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis unit="%"/>
                    <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`}/>
                    <Legend />
                    <Line type="monotone" dataKey="実績稼働率" stroke="#3B82F6" activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="目標稼働率" stroke="#A855F7" strokeDasharray="5 5" />
                </LineChart>
            </ResponsiveContainer>
        ) : <p className="text-slate-500 italic">選択されたサービスのトレンドデータがありません。</p>}
        <p className="text-sm text-slate-600 italic mt-3">月次可用性レポート、ダウンタイム分析（計画内/計画外の内訳）、影響度分析（ビジネスへの影響度評価）などがここに表示されます。</p>
      </Card>

      {/* Placeholder sections */}
      <Card title="🔧 システム構成・冗長性">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 rounded">
              <h4 className="text-sm font-semibold text-green-700 mb-2">🟢 冗長化済みシステム</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Webサーバークラスタ</span><span className="text-green-600">Active-Active</span></div>
                <div className="flex justify-between"><span>データベースサーバー</span><span className="text-green-600">Master-Slave</span></div>
                <div className="flex justify-between"><span>ロードバランサー</span><span className="text-green-600">HA構成</span></div>
                <div className="flex justify-between"><span>ストレージシステム</span><span className="text-green-600">RAID6+スナップ</span></div>
                <div className="flex justify-between"><span>ネットワーク機器</span><span className="text-green-600">冗長化済み</span></div>
              </div>
            </div>
            <div className="p-3 bg-yellow-50 rounded">
              <h4 className="text-sm font-semibold text-yellow-700 mb-2">⚠️ 単一障害点 (SPOF)</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>メインファイアウォール</span><span className="text-yellow-600">改善計画中</span></div>
                <div className="flex justify-between"><span>認証サーバー</span><span className="text-yellow-600">2024Q3対応</span></div>
                <div className="flex justify-between"><span>DNSサーバー</span><span className="text-yellow-600">冗長化検討中</span></div>
              </div>
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded">
            <h4 className="text-sm font-semibold text-blue-700 mb-2">💾 バックアップ・DR状況</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="font-medium">データバックアップ:</span>
                <div className="mt-1 space-y-1">
                  <div>日次フルバックアップ: ✅</div>
                  <div>時間単位増分: ✅</div>
                  <div>遠隔地保存: ✅</div>
                </div>
              </div>
              <div>
                <span className="font-medium">DRサイト:</span>
                <div className="mt-1 space-y-1">
                  <div>セカンダリサイト: 準備中</div>
                  <div>RPO目標: 1時間</div>
                  <div>RTO目標: 4時間</div>
                </div>
              </div>
              <div>
                <span className="font-medium">復旧テスト:</span>
                <div className="mt-1 space-y-1">
                  <div>前回実施: 2024-05-15</div>
                  <div>次回予定: 2024-07-15</div>
                  <div>成功率: 95%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      <Card title="⚡ パフォーマンス関連">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-green-50 rounded text-center">
              <h4 className="text-xs font-semibold text-green-700">平均応答時間</h4>
              <p className="text-lg font-bold text-green-600">245ms</p>
              <span className="text-xs text-green-600">目標: &lt;300ms</span>
            </div>
            <div className="p-3 bg-blue-50 rounded text-center">
              <h4 className="text-xs font-semibold text-blue-700">スループット</h4>
              <p className="text-lg font-bold text-blue-600">1,250 rps</p>
              <span className="text-xs text-blue-600">リクエスト/秒</span>
            </div>
            <div className="p-3 bg-yellow-50 rounded text-center">
              <h4 className="text-xs font-semibold text-yellow-700">エラー率</h4>
              <p className="text-lg font-bold text-yellow-600">0.02%</p>
              <span className="text-xs text-yellow-600">目標: &lt;0.1%</span>
            </div>
            <div className="p-3 bg-purple-50 rounded text-center">
              <h4 className="text-xs font-semibold text-purple-700">CPU使用率</h4>
              <p className="text-lg font-bold text-purple-600">68%</p>
              <span className="text-xs text-purple-600">平均値</span>
            </div>
          </div>
          <div className="bg-white border rounded p-3">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">📊 パフォーマンス監視項目</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span>Webサーバー応答時間</span>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">180ms (良好)</span>
                  <div className="w-16 h-2 bg-gray-200 rounded"><div className="w-3/4 h-2 bg-green-500 rounded"></div></div>
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span>データベース応答時間</span>
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-600">320ms (注意)</span>
                  <div className="w-16 h-2 bg-gray-200 rounded"><div className="w-4/5 h-2 bg-yellow-500 rounded"></div></div>
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span>ネットワーク遅延</span>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">15ms (良好)</span>
                  <div className="w-16 h-2 bg-gray-200 rounded"><div className="w-1/4 h-2 bg-green-500 rounded"></div></div>
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span>ストレージI/O待機</span>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">2.1ms (良好)</span>
                  <div className="w-16 h-2 bg-gray-200 rounded"><div className="w-1/5 h-2 bg-green-500 rounded"></div></div>
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span>メモリ使用率</span>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600">74% (正常)</span>
                  <div className="w-16 h-2 bg-gray-200 rounded"><div className="w-3/4 h-2 bg-blue-500 rounded"></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      <Card title="📋 可用性設計・改善">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">🎯 可用性要件・目標</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span>重要業務システム:</span><span className="font-mono text-blue-700">99.9% (年間8.76時間以下)</span></div>
              <div className="flex justify-between"><span>一般業務システム:</span><span className="font-mono text-blue-700">99.5% (年間43.8時間以下)</span></div>
              <div className="flex justify-between"><span>開発・テスト環境:</span><span className="font-mono text-blue-700">99.0% (年間87.6時間以下)</span></div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-green-800 mb-2">📈 改善計画・進捗</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span>認証サーバー冗長化</span>
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-600">進行中 (65%)</span>
                  <div className="w-20 h-2 bg-gray-200 rounded"><div className="w-3/5 h-2 bg-yellow-500 rounded"></div></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>DRサイト構築</span>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600">計画中 (20%)</span>
                  <div className="w-20 h-2 bg-gray-200 rounded"><div className="w-1/5 h-2 bg-blue-500 rounded"></div></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>監視システム強化</span>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">完了 (100%)</span>
                  <div className="w-20 h-2 bg-gray-200 rounded"><div className="w-full h-2 bg-green-500 rounded"></div></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>自動バックアップ改善</span>
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-600">進行中 (80%)</span>
                  <div className="w-20 h-2 bg-gray-200 rounded"><div className="w-4/5 h-2 bg-yellow-500 rounded"></div></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>ネットワーク冗長化</span>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">完了 (100%)</span>
                  <div className="w-20 h-2 bg-gray-200 rounded"><div className="w-full h-2 bg-green-500 rounded"></div></div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-orange-800 mb-2">⚠️ リスク評価・投資効果</h4>
            <div className="space-y-1 text-xs">
              <div><strong>高リスク:</strong> 認証サーバー単一障害点 (影響度: 高, 対策投資: 500万円, ROI: 18ヶ月)</div>
              <div><strong>中リスク:</strong> DRサイト未整備 (影響度: 中, 対策投資: 2000万円, ROI: 36ヶ月)</div>
              <div><strong>低リスク:</strong> 監視ツール老朽化 (影響度: 低, 対策投資: 200万円, ROI: 12ヶ月)</div>
            </div>
          </div>
        </div>
      </Card>
      <Card title="🔄 運用プロセス"><p className="text-sm text-slate-500 italic">監視設定状況、アラート履歴、エスカレーション管理、変更管理連携などの運用プロセス情報がここに表示されます。</p></Card>
      <Card title="📊 SLA・契約管理">
        <div className="space-y-4">
          <div className="bg-slate-50 border rounded-lg p-3">
            <h4 className="text-sm font-semibold text-slate-800 mb-2">📋 SLA目標値・実績一覧</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-1">サービス</th>
                    <th className="text-left p-1">SLA目標</th>
                    <th className="text-left p-1">今月実績</th>
                    <th className="text-left p-1">ステータス</th>
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  <tr className="border-b">
                    <td className="p-1">顧客ポータル</td>
                    <td className="p-1 font-mono">99.9%</td>
                    <td className="p-1 font-mono text-green-600">99.95%</td>
                    <td className="p-1"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">達成</span></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-1">基幹システム</td>
                    <td className="p-1 font-mono">99.5%</td>
                    <td className="p-1 font-mono text-green-600">99.8%</td>
                    <td className="p-1"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">達成</span></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-1">APIゲートウェイ</td>
                    <td className="p-1 font-mono">99.9%</td>
                    <td className="p-1 font-mono text-yellow-600">99.85%</td>
                    <td className="p-1"><span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">注意</span></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-1">メールシステム</td>
                    <td className="p-1 font-mono">99.0%</td>
                    <td className="p-1 font-mono text-green-600">99.3%</td>
                    <td className="p-1"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">達成</span></td>
                  </tr>
                  <tr>
                    <td className="p-1">データベース</td>
                    <td className="p-1 font-mono">99.9%</td>
                    <td className="p-1 font-mono text-red-600">99.1%</td>
                    <td className="p-1"><span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs">未達成</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-red-800 mb-2">⚠️ ペナルティ状況</h4>
              <div className="space-y-1 text-xs">
                <div>データベースSLA未達成: 2024年5月 (違約金: 50万円)</div>
                <div>APIゲートウェイ警告レベル: 2024年6月 (要改善)</div>
                <div>年間累計ペナルティ: 150万円 (予算内)</div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">📈 顧客満足度</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>システム可用性:</span><span className="text-blue-700">4.2/5.0</span></div>
                <div className="flex justify-between"><span>応答時間:</span><span className="text-blue-700">4.0/5.0</span></div>
                <div className="flex justify-between"><span>障害対応:</span><span className="text-blue-700">4.5/5.0</span></div>
                <div className="flex justify-between"><span>総合評価:</span><span className="text-blue-700 font-semibold">4.2/5.0</span></div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      <Card title="⚙️ クイックアクション">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsEmergencyModalOpen)}>緊急時対応手順</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsOutageReportModalOpen)}>障害報告書作成</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsAvailabilityReportModalOpen)}>可用性レポート生成</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsMaintenanceRequestModalOpen)}>メンテナンス計画申請</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsMonitoringSettingsModalOpen)}>監視設定変更</Button>
        </div>
      </Card>
      <Card title="🔍 根本原因分析">
        <div className="space-y-4">
          <div className="bg-slate-50 border rounded-lg p-3">
            <h4 className="text-sm font-semibold text-slate-800 mb-2">📊 障害原因分析（過去6ヶ月）</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="text-center p-2 bg-red-100 rounded">
                <div className="text-lg font-bold text-red-700">35%</div>
                <div className="text-red-600">ハードウェア障害</div>
              </div>
              <div className="text-center p-2 bg-orange-100 rounded">
                <div className="text-lg font-bold text-orange-700">28%</div>
                <div className="text-orange-600">ソフトウェア不具合</div>
              </div>
              <div className="text-center p-2 bg-yellow-100 rounded">
                <div className="text-lg font-bold text-yellow-700">22%</div>
                <div className="text-yellow-600">ネットワーク問題</div>
              </div>
              <div className="text-center p-2 bg-blue-100 rounded">
                <div className="text-lg font-bold text-blue-700">15%</div>
                <div className="text-blue-600">人的ミス</div>
              </div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-green-800 mb-2">🛡️ 再発防止策・効果測定</h4>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-white rounded border">
                <div className="font-medium">データベース接続プール改善</div>
                <div className="text-gray-600">実施日: 2024-05-15 | 効果: DB関連障害 60%減少</div>
              </div>
              <div className="p-2 bg-white rounded border">
                <div className="font-medium">監視アラート閾値最適化</div>
                <div className="text-gray-600">実施日: 2024-04-20 | 効果: 誤検知 45%減少</div>
              </div>
              <div className="p-2 bg-white rounded border">
                <div className="font-medium">運用手順書の標準化</div>
                <div className="text-gray-600">実施日: 2024-03-10 | 効果: 人的ミス 30%減少</div>
              </div>
              <div className="p-2 bg-white rounded border">
                <div className="font-medium">自動復旧スクリプト導入</div>
                <div className="text-gray-600">実施日: 2024-02-28 | 効果: 復旧時間 50%短縮</div>
              </div>
              <div className="p-2 bg-white rounded border">
                <div className="font-medium">ネットワーク冗長化強化</div>
                <div className="text-gray-600">実施日: 2024-01-15 | 効果: NW障害 80%減少</div>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-purple-800 mb-2">🏢 ベンダー別可用性実績</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center p-1">
                <span>AWS (クラウドインフラ)</span>
                <span className="text-green-600 font-mono">99.98% ✅</span>
              </div>
              <div className="flex justify-between items-center p-1">
                <span>Microsoft 365</span>
                <span className="text-green-600 font-mono">99.95% ✅</span>
              </div>
              <div className="flex justify-between items-center p-1">
                <span>データセンターA社</span>
                <span className="text-yellow-600 font-mono">99.85% ⚠️</span>
              </div>
              <div className="flex justify-between items-center p-1">
                <span>ISPプロバイダーB社</span>
                <span className="text-green-600 font-mono">99.92% ✅</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

       {/* Modals */}
      {isRecordModalOpen && editingRecord && (
        <Modal isOpen={isRecordModalOpen} onClose={handleCloseRecordModal} title={editingRecord.id ? "可用性記録編集" : "新規可用性記録"} size="xl">
          <form onSubmit={handleRecordSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
            
            {/* 基本情報 */}
            <fieldset className="border border-slate-200 rounded-lg p-4">
              <legend className="text-sm font-semibold text-slate-700 px-2">基本情報</legend>
              
              {/* サービス選択 (新規作成・編集両方) */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <Select
                  label={editingRecord.id ? "📋 サービス変更 (任意)" : "📋 対象サービス選択"}
                  value={editingRecord.serviceName || ''}
                  onChange={(e) => handleServiceSelection(e.target.value)}
                  options={editingRecord.id ? editServiceOptions : availableServiceOptions}
                  className="mb-3"
                />
                <p className="text-xs text-blue-700">
                  {editingRecord.id ? (
                    "💡 別のサービスに変更する場合は選択してください。推奨設定が適用されます。カスタム入力で手動設定も可能です。"
                  ) : (
                    "💡 サービスを選択すると、サービスIDが自動生成され、推奨設定が適用されます。カスタム入力を選択すると手動で設定できます。"
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="サービスID" 
                  name="serviceId" 
                  value={editingRecord.serviceId || ''} 
                  onChange={handleRecordInputChange} 
                  required 
                  placeholder="例: WEB001, DB001, COMM001, AUTH001" 
                  disabled={editingRecord.serviceName && editingRecord.serviceName !== 'custom' && editingRecord.serviceName !== ''}
                />
                <Input 
                  label="サービス名" 
                  name="serviceName" 
                  value={editingRecord.serviceName === 'custom' ? '' : (editingRecord.serviceName || '')} 
                  onChange={handleRecordInputChange} 
                  required 
                  placeholder="例: 顧客ポータルサイト, 認証サーバー" 
                  disabled={editingRecord.serviceName && editingRecord.serviceName !== 'custom' && editingRecord.serviceName !== ''}
                />
              </div>
              
              {editingRecord.serviceId && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-xs text-green-700">
                    ✅ サービスID「{editingRecord.serviceId}」が生成されました。
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Select 
                  label="重要度" 
                  name="importance" 
                  value={editingRecord.importance || ServiceImportance.MEDIUM} 
                  onChange={handleRecordInputChange} 
                  options={serviceImportanceOptions.map(opt => ({value: opt, label: serviceImportanceToJapanese(opt)}))} 
                  required 
                />
                <Select 
                  label="現在のステータス" 
                  name="currentStatus" 
                  value={editingRecord.currentStatus || CurrentServiceStatus.UNKNOWN} 
                  onChange={handleRecordInputChange} 
                  options={currentServiceStatusOptions.map(opt => ({value: opt, label: currentServiceStatusToJapanese(opt)}))} 
                  required 
                />
              </div>
              <Textarea 
                label="サービス概要・説明" 
                name="notes" 
                value={editingRecord.notes || ''} 
                onChange={handleRecordInputChange} 
                rows={3}
                placeholder="サービスの目的、利用者、業務への重要性など"
              />
            </fieldset>

            {/* 可用性目標・実績 */}
            <fieldset className="border border-slate-200 rounded-lg p-4">
              <legend className="text-sm font-semibold text-slate-700 px-2">可用性目標・実績</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="目標稼働率 (%)" 
                  name="targetUptimePercentage" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  max="100" 
                  value={editingRecord.targetUptimePercentage ?? ''} 
                  onChange={handleRecordInputChange} 
                  required 
                  placeholder="例: 99.9"
                />
                <Input 
                  label="実績稼働率 (%) ※任意" 
                  name="actualUptimePercentage" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  max="100" 
                  value={editingRecord.actualUptimePercentage ?? ''} 
                  onChange={handleRecordInputChange}
                  placeholder="例: 99.95"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Input 
                  label="総ダウンタイム (分) ※任意" 
                  name="totalDowntimeMinutes" 
                  type="number" 
                  min="0" 
                  value={editingRecord.totalDowntimeMinutes ?? ''} 
                  onChange={handleRecordInputChange}
                  placeholder="例: 43"
                />
                <Input 
                  label="計画停止時間 (分) ※任意" 
                  name="plannedDowntimeMinutes" 
                  type="number" 
                  min="0" 
                  value={editingRecord.plannedDowntimeMinutes ?? ''} 
                  onChange={handleRecordInputChange}
                  placeholder="例: 30"
                />
                <Input 
                  label="障害件数 ※任意" 
                  name="numberOfOutages" 
                  type="number" 
                  min="0" 
                  value={editingRecord.numberOfOutages ?? ''} 
                  onChange={handleRecordInputChange}
                  placeholder="例: 2"
                />
              </div>
            </fieldset>

            {/* 信頼性指標 */}
            <fieldset className="border border-slate-200 rounded-lg p-4">
              <legend className="text-sm font-semibold text-slate-700 px-2">信頼性指標 (MTBF/MTTR)</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="MTBF (平均故障間隔) 時間 ※任意" 
                  name="mtbfHours" 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  value={editingRecord.mtbfHours ?? ''} 
                  onChange={handleRecordInputChange}
                  placeholder="例: 720"
                />
                <Input 
                  label="MTTR (平均復旧時間) 時間 ※任意" 
                  name="mttrHours" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  value={editingRecord.mttrHours ?? ''} 
                  onChange={handleRecordInputChange}
                  placeholder="例: 0.5"
                />
              </div>
              <div className="text-xs text-slate-500 mt-2">
                <p><strong>MTBF (Mean Time Between Failures):</strong> 障害間の平均稼働時間</p>
                <p><strong>MTTR (Mean Time To Repair):</strong> 障害発生から復旧までの平均時間</p>
              </div>
            </fieldset>

            {/* 関連情報 */}
            <fieldset className="border border-slate-200 rounded-lg p-4">
              <legend className="text-sm font-semibold text-slate-700 px-2">関連情報</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="関連SLA ID ※任意" 
                  name="relatedSlaId" 
                  value={editingRecord.relatedSlaId || ''} 
                  onChange={handleRecordInputChange}
                  placeholder="例: SLA001"
                />
                <Input 
                  label="最新インシデントID ※任意" 
                  name="lastIncidentId" 
                  value={editingRecord.lastIncidentId || ''} 
                  onChange={handleRecordInputChange}
                  placeholder="例: INC001"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Input 
                  label="次回メンテナンス予定日 ※任意" 
                  name="nextMaintenanceDate" 
                  type="datetime-local" 
                  value={editingRecord.nextMaintenanceDate ? new Date(editingRecord.nextMaintenanceDate).toISOString().slice(0, 16) : ''} 
                  onChange={handleRecordInputChange}
                />
                <Input 
                  label="最新インシデント発生日 ※任意" 
                  name="lastIncidentDate" 
                  type="datetime-local" 
                  value={editingRecord.lastIncidentDate ? new Date(editingRecord.lastIncidentDate).toISOString().slice(0, 16) : ''} 
                  onChange={handleRecordInputChange}
                />
              </div>
            </fieldset>

            {/* フォーム操作ボタン */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <Button type="button" variant="secondary" onClick={handleCloseRecordModal}>
                キャンセル
              </Button>
              <Button type="submit" variant="primary">
                {editingRecord.id ? '更新' : '新規作成'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Quick Action Modals */}
      <Modal isOpen={isEmergencyModalOpen} onClose={() => setIsEmergencyModalOpen(false)} title="緊急時対応手順表示" size="md">
        <form onSubmit={(e) => { e.preventDefault(); handleGenericQuickAction("緊急時対応手順表示", (data, srv) => `サービス「${srv?.serviceName || data.selectedServiceId}」の緊急時対応手順（手順名: ${data.procedureName}）を表示しました。`, () => setIsEmergencyModalOpen(false)); }} className="space-y-3">
          <Select label="対象サービス" name="selectedServiceId" value={quickActionFormData.selectedServiceId || ''} onChange={handleQuickActionFormChange} options={serviceOptionsForSelect} required />
          <Input label="手順名/キーワード" name="procedureName" value={quickActionFormData.procedureName || ''} onChange={handleQuickActionFormChange} placeholder="例: DBサーバー再起動手順" />
          <p className="text-xs text-slate-500">（シミュレーション: ここに該当する手順書が表示されます）</p>
          <div className="flex justify-end pt-2"><Button type="submit" variant="primary">手順表示 (シミュレーション)</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isOutageReportModalOpen} onClose={() => setIsOutageReportModalOpen(false)} title="障害報告書作成" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleGenericQuickAction("障害報告書作成", (data, srv) => `サービス「${srv?.serviceName || data.selectedServiceId}」の障害報告書作成（タイトル: ${data.incidentTitle}）を開始しました。`, () => setIsOutageReportModalOpen(false)); }} className="space-y-3">
          <Select label="対象サービス" name="selectedServiceId" value={quickActionFormData.selectedServiceId || ''} onChange={handleQuickActionFormChange} options={serviceOptionsForSelect} required />
          <Input label="障害タイトル" name="incidentTitle" value={quickActionFormData.incidentTitle || ''} onChange={handleQuickActionFormChange} required />
          <Textarea label="障害概要" name="incidentDescription" value={quickActionFormData.incidentDescription || ''} onChange={handleQuickActionFormChange} required rows={3}/>
          <p className="text-xs text-slate-500">（シミュレーション: 報告書作成フォームがここに表示されます）</p>
          <div className="flex justify-end pt-2"><Button type="submit" variant="primary">作成開始 (シミュレーション)</Button></div>
        </form>
      </Modal>
      
      <Modal isOpen={isAvailabilityReportModalOpen} onClose={() => setIsAvailabilityReportModalOpen(false)} title="可用性レポート生成" size="md">
        <form onSubmit={(e) => {e.preventDefault(); handleGenericQuickAction("可用性レポート生成", (data, srv) => `サービス「${srv?.serviceName || data.selectedServiceId}」の可用性レポート（タイプ: ${data.reportType}, 期間: ${data.reportPeriodStart}-${data.reportPeriodEnd}）を生成しました。`, () => setIsAvailabilityReportModalOpen(false));}} className="space-y-3">
            <Select label="対象サービス" name="selectedServiceId" value={quickActionFormData.selectedServiceId || ''} onChange={handleQuickActionFormChange} options={serviceOptionsForSelect} />
            <Select label="レポートタイプ" name="reportType" value={quickActionFormData.reportType || 'MonthlyAvailability'} onChange={handleQuickActionFormChange} options={[{value: 'MonthlyAvailability', label:'月次可用性'}, {value:'OutageSummary', label:'障害概要'}, {value:'TrendAnalysis', label:'トレンド分析'}]} required />
            <Input label="期間 (開始)" name="reportPeriodStart" type="date" value={quickActionFormData.reportPeriodStart || ''} onChange={handleQuickActionFormChange} />
            <Input label="期間 (終了)" name="reportPeriodEnd" type="date" value={quickActionFormData.reportPeriodEnd || ''} onChange={handleQuickActionFormChange} />
            <div className="flex justify-end pt-2"><Button type="submit" variant="primary">生成 (シミュレーション)</Button></div>
        </form>
      </Modal>

       <Modal isOpen={isMaintenanceRequestModalOpen} onClose={() => setIsMaintenanceRequestModalOpen(false)} title="メンテナンス計画申請" size="lg">
        <form onSubmit={(e) => {e.preventDefault(); handleGenericQuickAction("メンテナンス計画申請", (data) => `メンテナンス計画申請（タイトル: ${data.maintenanceTitle}, 対象: ${data.maintenanceServicesAffected?.join(',')}, 期間: ${data.maintenanceStart}-${data.maintenanceEnd}）を行いました。`, () => setIsMaintenanceRequestModalOpen(false));}} className="space-y-3">
            <Input label="メンテナンス作業名" name="maintenanceTitle" value={quickActionFormData.maintenanceTitle || ''} onChange={handleQuickActionFormChange} required />
            <Input label="対象サービス/システム (カンマ区切り)" name="maintenanceServicesAffected" value={quickActionFormData.maintenanceServicesAffected?.join(',') || ''} onChange={(e) => setQuickActionFormData(prev => ({...prev, maintenanceServicesAffected: e.target.value.split(',').map(s=>s.trim())}))} />
            <div className="grid grid-cols-2 gap-3">
                <Input label="開始日時" name="maintenanceStart" type="datetime-local" value={quickActionFormData.maintenanceStart || ''} onChange={handleQuickActionFormChange} required/>
                <Input label="終了日時" name="maintenanceEnd" type="datetime-local" value={quickActionFormData.maintenanceEnd || ''} onChange={handleQuickActionFormChange} required/>
            </div>
            <div className="flex justify-end pt-2"><Button type="submit" variant="primary">申請 (シミュレーション)</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isMonitoringSettingsModalOpen} onClose={() => setIsMonitoringSettingsModalOpen(false)} title="監視設定変更" size="md">
        <form onSubmit={(e) => {e.preventDefault(); handleGenericQuickAction("監視設定変更", (data, srv) => `サービス「${srv?.serviceName || data.selectedServiceId}」の監視設定変更（対象: ${data.monitoringTarget}, メトリック: ${data.monitoringMetric}, 閾値: ${data.monitoringThreshold}）を行いました。`,() => setIsMonitoringSettingsModalOpen(false));}} className="space-y-3">
            <Select label="対象サービス" name="selectedServiceId" value={quickActionFormData.selectedServiceId || ''} onChange={handleQuickActionFormChange} options={serviceOptionsForSelect} required />
            <Input label="監視対象項目" name="monitoringTarget" value={quickActionFormData.monitoringTarget || ''} onChange={handleQuickActionFormChange} placeholder="例: CPU使用率, エラーログ" />
            <Input label="監視メトリック" name="monitoringMetric" value={quickActionFormData.monitoringMetric || ''} onChange={handleQuickActionFormChange} />
            <Input label="閾値" name="monitoringThreshold" value={quickActionFormData.monitoringThreshold || ''} onChange={handleQuickActionFormChange} />
            <div className="flex justify-end pt-2"><Button type="submit" variant="primary">変更 (シミュレーション)</Button></div>
        </form>
      </Modal>

    </div>
  );
};

export default AvailabilityManagementPage;
