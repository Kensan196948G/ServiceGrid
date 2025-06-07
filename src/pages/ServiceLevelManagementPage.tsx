
import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { ServiceLevelAgreement, UserRole } from '../types';
import { getSLAs, createSLA, updateSLA, deleteSLA } from '../services/slaApiService';
import { addAuditLog } from '../services/mockItsmService';
import { Table, Spinner, Card, Notification, NotificationType, Button, Modal, Input, Select, Textarea } from '../components/CommonUI';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from '../components/ChartPlaceholder';
import { slaStatusToJapanese, slaPerformanceStatusToJapanese } from '../localization';
import { useAuth } from '../contexts/AuthContext';

interface QuickActionFormData {
  selectedSlaId?: string;
  reportPeriodStart?: string;
  reportPeriodEnd?: string;
  reportType?: string;
  alertThresholdWarning?: number;
  alertThresholdCritical?: number;
  notificationRecipients?: string;
  escalationReason?: string;
  escalationTarget?: string;
  reviewReason?: string;
  reviewProposal?: string;
}

const ServiceLevelManagementPage: React.FC = () => {
  const [allSlas, setAllSlas] = useState<ServiceLevelAgreement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const { user } = useAuth();

  const [isSlaDefinitionModalOpen, setIsSlaDefinitionModalOpen] = useState(false);
  const [editingSla, setEditingSla] = useState<Partial<ServiceLevelAgreement> | null>(null);
  
  const [activeSlaFilter, setActiveSlaFilter] = useState('');
  const [activeSlaCurrentPage, setActiveSlaCurrentPage] = useState(1);
  const [activeSlaItemsPerPage, setActiveSlaItemsPerPage] = useState(5);

  const slaTargetUnits: Array<ServiceLevelAgreement['targetUnit']> = ['%', 'hours', 'minutes', 'ms', 'count'];
  const slaStatuses: Array<ServiceLevelAgreement['status']> = ['Active', 'Draft', 'Expired'];
  const slaMeasurementWindows: Array<ServiceLevelAgreement['measurementWindow']> = ['Daily', 'Weekly', 'Monthly', 'Quarterly'];

  // Quick Action Modals State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAlertSettingsModalOpen, setIsAlertSettingsModalOpen] = useState(false);
  const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false);
  const [isReviewRequestModalOpen, setIsReviewRequestModalOpen] = useState(false);
  const [quickActionFormData, setQuickActionFormData] = useState<QuickActionFormData>({});


  const fetchSLAs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSLAs();
      setAllSlas(data.sort((a, b) => a.serviceName.localeCompare(b.serviceName)));
    } catch (error) {
      console.error("SLAの読み込みに失敗:", error);
      setNotification({ message: 'SLAデータの読み込みに失敗しました。', type: NotificationType.ERROR });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSLAs();
  }, [fetchSLAs]);

  const handleOpenSlaDefinitionModal = (sla?: ServiceLevelAgreement) => {
    setEditingSla(sla ? { ...sla } : {
      serviceName: '', metricName: '', metricDescription: '',
      targetValue: 0, targetUnit: '%', measurementWindow: 'Monthly',
      status: 'Draft', owner: user?.username || '', notes: '', historicalPerformance: []
    });
    setIsSlaDefinitionModalOpen(true);
  };

  const handleCloseSlaDefinitionModal = () => {
    setIsSlaDefinitionModalOpen(false);
    setEditingSla(null);
  };

  const handleSlaInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (editingSla) {
      const { name, value } = e.target;
      if (name === 'targetValue' || name === 'currentPerformance') {
        setEditingSla({ ...editingSla, [name]: parseFloat(value) || 0 });
      } else {
        setEditingSla({ ...editingSla, [name]: value });
      }
    }
  };

  const handleSlaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSla || !user) return;
    try {
      const currentUserInfo = { userId: user.id, username: user.username };
      if (editingSla.id) {
        await updateSLA(editingSla.id, editingSla as ServiceLevelAgreement);
        setNotification({ message: 'SLA定義が正常に更新されました。', type: NotificationType.SUCCESS });
      } else {
        await createSLA(editingSla as Omit<ServiceLevelAgreement, 'id'>);
        setNotification({ message: 'SLA定義が正常に作成されました。', type: NotificationType.SUCCESS });
      }
      fetchSLAs();
      handleCloseSlaDefinitionModal();
    } catch (error) {
      console.error("SLA定義の保存に失敗:", error);
      setNotification({ message: 'SLA定義の保存に失敗しました。', type: NotificationType.ERROR });
    }
  };

  const handleDeleteSla = async (id: string) => {
     if (!user) return;
    if (window.confirm('このSLA定義を削除してもよろしいですか？')) {
      try {
        await deleteSLA(id);
        setNotification({ message: 'SLA定義が正常に削除されました。', type: NotificationType.SUCCESS });
        fetchSLAs();
      } catch (error) {
        console.error("SLA定義の削除に失敗:", error);
        setNotification({ message: 'SLA定義の削除に失敗しました。', type: NotificationType.ERROR });
      }
    }
  };

  const overallAchievementRate = useMemo(() => {
    const measuredSlas = allSlas.filter(s => s.performanceStatus && s.status === 'Active');
    if (measuredSlas.length === 0) return 'N/A';
    const metCount = measuredSlas.filter(s => s.performanceStatus === 'Met').length;
    return `${((metCount / measuredSlas.length) * 100).toFixed(1)}%`;
  }, [allSlas]);

  const keyMetricsSummary = useMemo(() => {
    const availabilitySlas = allSlas.filter(s => s.metricName.includes('稼働率') && s.currentPerformance !== undefined && s.status === 'Active');
    const avgAvailability = availabilitySlas.length > 0 
      ? (availabilitySlas.reduce((sum, s) => sum + (s.currentPerformance || 0), 0) / availabilitySlas.length).toFixed(2) + '%' 
      : 'N/A';
    return [
      { name: '平均システム稼働率', value: avgAvailability },
      { name: 'アクティブSLA数', value: allSlas.filter(s => s.status === 'Active').length },
    ];
  }, [allSlas]);

  const alertsAndWarnings = useMemo(() => {
    return allSlas.filter(s => s.status === 'Active' && (s.performanceStatus === 'At Risk' || s.performanceStatus === 'Breached'));
  }, [allSlas]);

  const performanceIndicators = useMemo(() => {
    const indicators: { [key: string]: ServiceLevelAgreement[] } = {
      '可用性指標': allSlas.filter(s => s.metricName.includes('稼働率') && s.status === 'Active'),
      '応答時間指標': allSlas.filter(s => s.metricName.includes('応答時間') && s.status === 'Active'),
      '解決時間指標': allSlas.filter(s => s.metricName.includes('解決時間') && s.status === 'Active'),
      '品質指標': allSlas.filter(s => s.metricName.includes('満足度') || s.metricName.includes('再発率') && s.status === 'Active'),
    };
    return indicators;
  }, [allSlas]);

  const filteredActiveSlas = useMemo(() => {
    return allSlas
      .filter(s => s.status === 'Active')
      .filter(s => activeSlaFilter ? s.serviceName.toLowerCase().includes(activeSlaFilter.toLowerCase()) || s.metricName.toLowerCase().includes(activeSlaFilter.toLowerCase()) : true);
  }, [allSlas, activeSlaFilter]);

  const paginatedActiveSlas = useMemo(() => {
    const startIndex = (activeSlaCurrentPage - 1) * activeSlaItemsPerPage;
    return filteredActiveSlas.slice(startIndex, startIndex + activeSlaItemsPerPage);
  }, [filteredActiveSlas, activeSlaCurrentPage, activeSlaItemsPerPage]);
  const totalActiveSlaPages = Math.ceil(filteredActiveSlas.length / activeSlaItemsPerPage);
  
  const slaBreachHistory = useMemo(() => allSlas.filter(s => s.performanceStatus === 'Breached'), [allSlas]);

  const [selectedSlaForTrend, setSelectedSlaForTrend] = useState<ServiceLevelAgreement | null>(null);
  useEffect(() => {
    if (allSlas.length > 0 && !selectedSlaForTrend) {
      const firstSlaWithHistory = allSlas.find(s => s.historicalPerformance && s.historicalPerformance.length > 0);
      if (firstSlaWithHistory) setSelectedSlaForTrend(firstSlaWithHistory);
      else if(allSlas[0]) setSelectedSlaForTrend(allSlas[0]);
    }
  }, [allSlas, selectedSlaForTrend]);

  const activeSlaColumns: Array<{ Header: string; accessor: keyof ServiceLevelAgreement | ((row: ServiceLevelAgreement) => ReactNode) }> = [
    { Header: 'サービス名', accessor: 'serviceName' }, { Header: 'メトリック名', accessor: 'metricName' },
    { Header: '目標', accessor: (row) => `${row.targetValue}${row.targetUnit}` },
    { Header: '実績', accessor: (row) => row.currentPerformance !== undefined ? `${row.currentPerformance}${row.targetUnit}` : 'N/A' },
    { Header: '状況', accessor: (row) => slaPerformanceStatusToJapanese(row.performanceStatus) },
    { Header: 'アクション', accessor: (row) => (
      <div className="flex items-center space-x-2">
        <Button size="sm" variant="ghost" onClick={() => handleOpenSlaDefinitionModal(row)}>編集</Button>
        {user?.role === UserRole.ADMIN && <Button size="sm" variant="danger" onClick={() => handleDeleteSla(row.id)}>削除</Button>}
      </div>
    )},
  ];

  // Quick Action Handlers
  const handleQuickActionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuickActionFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleQuickActionNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setQuickActionFormData(prev => ({ ...prev, [name]: parseFloat(value) || undefined }));
  };

  const openQuickActionModal = (modalSetFunction: React.Dispatch<React.SetStateAction<boolean>>, slaId?: string) => {
    setQuickActionFormData({ selectedSlaId: slaId || allSlas[0]?.id });
    modalSetFunction(true);
  };

  const handleGenerateReport = async () => {
    if (!user || !quickActionFormData.selectedSlaId) return;
    const sla = allSlas.find(s => s.id === quickActionFormData.selectedSlaId);
    await addAuditLog({ userId: user.id, username: user.username, action: 'レポート生成実行 (SLA)', details: `SLA「${sla?.serviceName} - ${sla?.metricName}」のレポート生成（タイプ: ${quickActionFormData.reportType}, 期間: ${quickActionFormData.reportPeriodStart}～${quickActionFormData.reportPeriodEnd}）をシミュレートしました。` });
    setNotification({ message: 'レポートが正常に生成されました（シミュレーション）。', type: NotificationType.SUCCESS });
    setIsReportModalOpen(false);
    setQuickActionFormData({});
  };

  const handleSaveAlertSettings = async () => {
    if (!user || !quickActionFormData.selectedSlaId) return;
    const sla = allSlas.find(s => s.id === quickActionFormData.selectedSlaId);
    await addAuditLog({ userId: user.id, username: user.username, action: 'SLAアラート設定変更', details: `SLA「${sla?.serviceName} - ${sla?.metricName}」のアラート設定（警告: ${quickActionFormData.alertThresholdWarning}, 重大: ${quickActionFormData.alertThresholdCritical}, 通知先: ${quickActionFormData.notificationRecipients}）をシミュレートしました。` });
    setNotification({ message: 'アラート設定が保存されました（シミュレーション）。', type: NotificationType.SUCCESS });
    setIsAlertSettingsModalOpen(false);
    setQuickActionFormData({});
  };

  const handleExecuteEscalation = async () => {
    if (!user || !quickActionFormData.selectedSlaId) return;
    const sla = allSlas.find(s => s.id === quickActionFormData.selectedSlaId);
    await addAuditLog({ userId: user.id, username: user.username, action: 'SLAエスカレーション実行', details: `SLA「${sla?.serviceName} - ${sla?.metricName}」のエスカレーション（理由: ${quickActionFormData.escalationReason}, 宛先: ${quickActionFormData.escalationTarget}）をシミュレートしました。` });
    setNotification({ message: 'エスカレーションが実行されました（シミュレーション）。', type: NotificationType.SUCCESS });
    setIsEscalationModalOpen(false);
    setQuickActionFormData({});
  };

  const handleRequestSlaReview = async () => {
    if (!user || !quickActionFormData.selectedSlaId) return;
    const sla = allSlas.find(s => s.id === quickActionFormData.selectedSlaId);
    await addAuditLog({ userId: user.id, username: user.username, action: 'SLA見直し申請', details: `SLA「${sla?.serviceName} - ${sla?.metricName}」の見直し申請（理由: ${quickActionFormData.reviewReason}, 提案: ${quickActionFormData.reviewProposal}）をシミュレートしました。` });
    setNotification({ message: 'SLA見直しが申請されました（シミュレーション）。', type: NotificationType.SUCCESS });
    setIsReviewRequestModalOpen(false);
    setQuickActionFormData({});
  };

  const slaOptionsForSelect = allSlas.map(s => ({ value: s.id, label: `${s.serviceName} - ${s.metricName}` }));


  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 pb-10">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-slate-800">サービスレベル管理 (SLA)</h2>
        {user?.role === UserRole.ADMIN && <Button onClick={() => handleOpenSlaDefinitionModal()}>SLA定義追加/編集</Button>}
      </div>

      <Card title="📊 ダッシュボード・概要情報">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg text-center">
            <h4 className="text-sm font-semibold text-blue-700">SLA達成状況 (今月/今四半期)</h4>
            <p className="text-3xl font-bold text-blue-600">{overallAchievementRate}</p>
          </div>
          {keyMetricsSummary.map(metric => (
            <div key={metric.name} className="p-4 bg-green-50 rounded-lg text-center">
              <h4 className="text-sm font-semibold text-green-700">{metric.name}</h4>
              <p className="text-2xl font-bold text-green-600">{metric.value}</p>
            </div>
          ))}
        </div>
        {alertsAndWarnings.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-red-700">アラート・警告 (SLA違反リスク/閾値超過)</h4>
            <ul className="list-disc list-inside text-sm text-red-600">
              {alertsAndWarnings.map(sla => (
                <li key={sla.id}>{sla.serviceName} - {sla.metricName}: {slaPerformanceStatusToJapanese(sla.performanceStatus)} (実績: {sla.currentPerformance}{sla.targetUnit})</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card title="📈 パフォーマンス指標">
        {Object.entries(performanceIndicators).map(([category, slasInCategory]) => (
          slasInCategory.length > 0 && (
            <div key={category} className="mb-4">
              <h4 className="text-lg font-semibold text-slate-700 mb-2">{category}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {slasInCategory.map(sla => (
                  <div key={sla.id} className="p-3 bg-slate-50 rounded shadow-sm">
                    <p className="font-medium">{sla.serviceName}: {sla.metricName}</p>
                    <p className="text-xs">目標: {sla.targetValue}{sla.targetUnit} | 実績: {sla.currentPerformance ?? 'N/A'}{sla.targetUnit}
                      <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                        sla.performanceStatus === 'Met' ? 'bg-green-200 text-green-800' : 
                        sla.performanceStatus === 'At Risk' ? 'bg-yellow-200 text-yellow-800' : 
                        sla.performanceStatus === 'Breached' ? 'bg-red-200 text-red-800' : 'bg-slate-200'
                      }`}>
                        {slaPerformanceStatusToJapanese(sla.performanceStatus)}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </Card>

      <Card title="📋 SLA管理情報">
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-slate-700 mb-2">アクティブなSLA一覧</h4>
          <Input 
            type="search" 
            placeholder="サービス名またはメトリック名で検索..." 
            value={activeSlaFilter} 
            onChange={(e) => {setActiveSlaFilter(e.target.value); setActiveSlaCurrentPage(1);}}
            className="mb-2"
          />
          {paginatedActiveSlas.length > 0 ? (
            <>
            <Table<ServiceLevelAgreement> columns={activeSlaColumns} data={paginatedActiveSlas} />
            <div className="flex justify-between items-center mt-2 text-sm">
              <Button size="sm" onClick={() => setActiveSlaCurrentPage(p => Math.max(1,p-1))} disabled={activeSlaCurrentPage === 1}>前へ</Button>
              <span>ページ {activeSlaCurrentPage} / {totalActiveSlaPages || 1}</span>
              <Button size="sm" onClick={() => setActiveSlaCurrentPage(p => Math.min(totalActiveSlaPages || 1, p+1))} disabled={activeSlaCurrentPage === totalActiveSlaPages || totalActiveSlaPages === 0}>次へ</Button>
            </div>
            </>
          ) : <p className="text-slate-500 italic">アクティブなSLAはありません。</p>}
        </div>
        {slaBreachHistory.length > 0 && 
          <div className="mb-4">
            <h4 className="text-md font-semibold text-red-700 mb-1">SLA違反履歴</h4>
            <ul className="list-disc list-inside text-sm text-red-600">
              {slaBreachHistory.map(sla => <li key={sla.id}>{sla.serviceName} - {sla.metricName} (目標: {sla.targetValue}{sla.targetUnit}, 実績: {sla.currentPerformance}{sla.targetUnit})</li>)}
            </ul>
          </div>
        }
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-md font-semibold text-slate-700 mb-1">ペナルティ/インセンティブ状況 (概要)</h4>
            {allSlas.filter(s => s.notes).map(s => <p key={s.id} className="text-xs text-slate-600"><strong>{s.serviceName} ({s.metricName}):</strong> {s.notes}</p>)}
            {allSlas.filter(s => s.notes).length === 0 && <p className="text-xs text-slate-500 italic">特記事項なし</p>}
          </div>
          <div>
            <h4 className="text-md font-semibold text-slate-700 mb-1">契約更新スケジュール (次回レビュー)</h4>
             {allSlas.filter(s => s.nextReviewDate).map(s => <p key={s.id} className="text-xs text-slate-600"><strong>{s.serviceName}:</strong> {new Date(s.nextReviewDate!).toLocaleDateString()}</p>)}
             {allSlas.filter(s => s.nextReviewDate).length === 0 && <p className="text-xs text-slate-500 italic">レビュー予定なし</p>}
          </div>
        </div>
      </Card>
      
      <Card title="🔄 運用状況">
        <p className="text-sm text-slate-600 italic">
          ここには、SLAに影響を与える可能性のある進行中のインシデント、予定されているメンテナンス作業、関連する変更管理のスケジュール、主要リソースの使用状況などが表示されます。(他モジュールとの連携が必要です)
        </p>
      </Card>

      <Card title="📊 レポート・分析">
        <div className="mb-4">
          <h4 className="text-md font-semibold text-slate-700 mb-2">トレンド分析グラフ</h4>
          <Select
            label="SLAを選択:"
            options={allSlas.map(sla => ({ value: sla.id, label: `${sla.serviceName} - ${sla.metricName}` }))}
            value={selectedSlaForTrend?.id || ''}
            onChange={(e) => setSelectedSlaForTrend(allSlas.find(s => s.id === e.target.value) || null)}
            className="mb-2"
          />
          {selectedSlaForTrend && selectedSlaForTrend.historicalPerformance && selectedSlaForTrend.historicalPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={selectedSlaForTrend.historicalPerformance.map(p => ({date: new Date(p.date).toLocaleDateString(), value: p.value}))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis unit={selectedSlaForTrend.targetUnit}/>
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" name="実績値" stroke="#3B82F6" activeDot={{ r: 8 }} />
                 <Line type="monotone" dataKey="target" name="目標値" stroke="#A855F7" strokeDasharray="5 5" 
                  data={selectedSlaForTrend.historicalPerformance.map(p => ({date: new Date(p.date).toLocaleDateString(), target: selectedSlaForTrend.targetValue}))} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-500 italic">選択されたSLAのトレンドデータがありません。</p>}
        </div>
        <p className="text-sm text-slate-600 italic mt-4">
          比較分析（前月比、前年同期比）、予測分析、改善提案事項などのセクションはここに表示されます。
        </p>
      </Card>

      <Card title="⚙️ クイックアクション">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsReportModalOpen)}>レポート生成</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsAlertSettingsModalOpen)}>アラート設定</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsEscalationModalOpen)}>エスカレーション実行</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsReviewRequestModalOpen)}>SLA見直し申請</Button>
        </div>
      </Card>

      {isSlaDefinitionModalOpen && editingSla && (
        <Modal isOpen={isSlaDefinitionModalOpen} onClose={handleCloseSlaDefinitionModal} title={editingSla.id ? 'SLA定義編集' : '新規SLA定義作成'} size="xl">
          <form onSubmit={handleSlaSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="サービス名" name="serviceName" value={editingSla.serviceName || ''} onChange={handleSlaInputChange} required />
              <Input label="メトリック名" name="metricName" value={editingSla.metricName || ''} onChange={handleSlaInputChange} required placeholder="例: 月間稼働率, 平均応答時間"/>
            </div>
            <Textarea label="メトリック詳細説明" name="metricDescription" value={editingSla.metricDescription || ''} onChange={handleSlaInputChange} required rows={2}/>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="目標値" name="targetValue" type="number" step="any" value={editingSla.targetValue ?? ''} onChange={handleSlaInputChange} required />
              <Select label="目標単位" name="targetUnit" value={editingSla.targetUnit || '%'} onChange={handleSlaInputChange} options={slaTargetUnits.map(u => ({value: u, label: u}))} required />
              <Select label="測定期間" name="measurementWindow" value={editingSla.measurementWindow || 'Monthly'} onChange={handleSlaInputChange} options={slaMeasurementWindows.map(w => ({value: w, label: w}))} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Select label="SLAステータス" name="status" value={editingSla.status || 'Draft'} onChange={handleSlaInputChange} options={slaStatuses.map(s => ({value: s, label: slaStatusToJapanese(s)}))} required />
               <Input label="オーナー (担当チーム/者)" name="owner" value={editingSla.owner || ''} onChange={handleSlaInputChange} required />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="最終レビュー日" name="lastReviewDate" type="date" value={editingSla.lastReviewDate ? new Date(editingSla.lastReviewDate).toISOString().split('T')[0] : ''} onChange={handleSlaInputChange} />
              <Input label="次回レビュー予定日" name="nextReviewDate" type="date" value={editingSla.nextReviewDate ? new Date(editingSla.nextReviewDate).toISOString().split('T')[0] : ''} onChange={handleSlaInputChange} />
            </div>
             <Input label="現状パフォーマンス値 (任意)" name="currentPerformance" type="number" step="any" value={editingSla.currentPerformance ?? ''} onChange={handleSlaInputChange} />
             <Select 
                label="パフォーマンス状況 (任意)" name="performanceStatus" value={editingSla.performanceStatus || ''} 
                onChange={handleSlaInputChange} 
                options={[
                    {value: '', label: '未測定/選択なし'}, {value: 'Met', label: slaPerformanceStatusToJapanese('Met')}, 
                    {value: 'At Risk', label: slaPerformanceStatusToJapanese('At Risk')},{value: 'Breached', label: slaPerformanceStatusToJapanese('Breached')}
                ]}
            />
            <Textarea label="備考 (ペナルティ/インセンティブ等)" name="notes" value={editingSla.notes || ''} onChange={handleSlaInputChange} rows={2}/>
            <div className="flex justify-end space-x-2 pt-2 border-t mt-4">
              <Button type="button" variant="secondary" onClick={handleCloseSlaDefinitionModal}>キャンセル</Button>
              <Button type="submit" variant="primary">{editingSla.id ? 'SLA更新' : 'SLA作成'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Report Generation Modal */}
      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="レポート生成オプション" size="md">
        <form onSubmit={(e) => { e.preventDefault(); handleGenerateReport(); }} className="space-y-4">
          <Select label="対象SLA" name="selectedSlaId" value={quickActionFormData.selectedSlaId || ''} onChange={handleQuickActionFormChange} options={slaOptionsForSelect} required />
          <Input label="レポート期間 (開始)" name="reportPeriodStart" type="date" value={quickActionFormData.reportPeriodStart || ''} onChange={handleQuickActionFormChange} required />
          <Input label="レポート期間 (終了)" name="reportPeriodEnd" type="date" value={quickActionFormData.reportPeriodEnd || ''} onChange={handleQuickActionFormChange} required />
          <Select label="レポートタイプ" name="reportType" value={quickActionFormData.reportType || 'MonthlyPerformance'} onChange={handleQuickActionFormChange} options={[ {value: 'MonthlyPerformance', label: '月次パフォーマンス'}, {value: 'BreachDetail', label: '違反詳細'}, {value: 'TrendAnalysis', label: 'トレンド分析'} ]} required />
          <div className="flex justify-end pt-2"><Button type="submit" variant="primary">生成 (シミュレーション)</Button></div>
        </form>
      </Modal>

      {/* Alert Settings Modal */}
      <Modal isOpen={isAlertSettingsModalOpen} onClose={() => setIsAlertSettingsModalOpen(false)} title="SLAアラート設定" size="md">
        <form onSubmit={(e) => { e.preventDefault(); handleSaveAlertSettings(); }} className="space-y-4">
          <Select label="対象SLA" name="selectedSlaId" value={quickActionFormData.selectedSlaId || ''} onChange={handleQuickActionFormChange} options={slaOptionsForSelect} required />
          <Input label="警告閾値 (例: 目標値のX%下)" name="alertThresholdWarning" type="number" value={quickActionFormData.alertThresholdWarning ?? ''} onChange={handleQuickActionNumberChange} placeholder="例: 99.5" />
          <Input label="重大閾値 (例: 目標値のY%下)" name="alertThresholdCritical" type="number" value={quickActionFormData.alertThresholdCritical ?? ''} onChange={handleQuickActionNumberChange} placeholder="例: 99.0" />
          <Textarea label="通知先 (メールアドレス等、カンマ区切り)" name="notificationRecipients" value={quickActionFormData.notificationRecipients || ''} onChange={handleQuickActionFormChange} rows={2} />
          <div className="flex justify-end pt-2"><Button type="submit" variant="primary">設定保存 (シミュレーション)</Button></div>
        </form>
      </Modal>

      {/* Escalation Modal */}
      <Modal isOpen={isEscalationModalOpen} onClose={() => setIsEscalationModalOpen(false)} title="エスカレーション実行" size="md">
        <form onSubmit={(e) => { e.preventDefault(); handleExecuteEscalation(); }} className="space-y-4">
          <Select label="対象SLA (特にリスク/違反中)" name="selectedSlaId" value={quickActionFormData.selectedSlaId || ''} onChange={handleQuickActionFormChange} options={slaOptionsForSelect.filter(opt => alertsAndWarnings.some(aw => aw.id === opt.value))} required />
          <Textarea label="エスカレーション理由" name="escalationReason" value={quickActionFormData.escalationReason || ''} onChange={handleQuickActionFormChange} required rows={3} />
          <Input label="エスカレーション先 (チーム/担当者)" name="escalationTarget" value={quickActionFormData.escalationTarget || ''} onChange={handleQuickActionFormChange} required placeholder="例: ITマネージャー、インフラチームリーダー"/>
          <div className="flex justify-end pt-2"><Button type="submit" variant="primary">実行 (シミュレーション)</Button></div>
        </form>
      </Modal>

      {/* SLA Review Request Modal */}
      <Modal isOpen={isReviewRequestModalOpen} onClose={() => setIsReviewRequestModalOpen(false)} title="SLA見直し申請" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleRequestSlaReview(); }} className="space-y-4">
          <Select label="対象SLA" name="selectedSlaId" value={quickActionFormData.selectedSlaId || ''} onChange={handleQuickActionFormChange} options={slaOptionsForSelect} required />
          <Textarea label="見直し理由" name="reviewReason" value={quickActionFormData.reviewReason || ''} onChange={handleQuickActionFormChange} required rows={3} />
          <Textarea label="提案内容/変更詳細" name="reviewProposal" value={quickActionFormData.reviewProposal || ''} onChange={handleQuickActionFormChange} required rows={4} />
          <div className="flex justify-end pt-2"><Button type="submit" variant="primary">申請 (シミュレーション)</Button></div>
        </form>
      </Modal>

    </div>
  );
};

export default ServiceLevelManagementPage;

