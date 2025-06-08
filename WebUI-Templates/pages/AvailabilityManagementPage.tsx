
import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { 
    AvailabilityRecord, UserRole, ServiceImportance, CurrentServiceStatus, HistoricalUptimeData,
    AvailabilityQuickActionFormData
} from '../types';
import { 
    getAvailabilityRecords, addAvailabilityRecord, updateAvailabilityRecord, deleteAvailabilityRecord,
    getIncidents, // For linking to incidents
    getSLAs, // For linking/displaying SLA targets
    addAuditLog
} from '../services/mockItsmService';
import { 
    Table, Spinner, Card, Notification, NotificationType, Button, Modal, Input, Select, Textarea 
} from '../components/CommonUI';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { serviceImportanceToJapanese, currentServiceStatusToJapanese } from '../localization';

const AvailabilityManagementPage: React.FC = () => {
  const [allAvailabilityRecords, setAllAvailabilityRecords] = useState<AvailabilityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
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
  const [quickActionFormData, setQuickActionFormData] = useState<AvailabilityQuickActionFormData>({});


  const serviceImportanceOptions: ServiceImportance[] = Object.values(ServiceImportance);
  const currentServiceStatusOptions: CurrentServiceStatus[] = Object.values(CurrentServiceStatus);

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
    setQuickActionFormData({ selectedServiceId: serviceId || allAvailabilityRecords[0]?.id });
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
    setQuickActionFormData({});
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

  if (isLoading && !allAvailabilityRecords.length) {
    return <div className="flex justify-center items-center h-full"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 pb-10">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-slate-800">可用性管理</h2>
        {user?.role === UserRole.ADMIN && <Button onClick={() => handleOpenRecordModal()}>可用性記録 追加/編集</Button>}
      </div>

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
        {/* Placeholder content, needs integration with Incident and Change Management */}
        <p className="text-sm text-slate-600 italic">
            現在発生中の障害（影響度・緊急度別）、計画停止スケジュール（メンテナンス予定）、過去の停止履歴（期間別、原因別集計）、MTBF/MTTR指標（平均故障間隔・平均復旧時間）などがここに表示されます。
        </p>
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
      <Card title="🔧 システム構成・冗長性"><p className="text-sm text-slate-500 italic">冗長化構成状況、単一障害点(SPOF)、バックアップシステム状況、DR（災害復旧）環境ステータスなどの情報がここに表示されます。</p></Card>
      <Card title="⚡ パフォーマンス関連"><p className="text-sm text-slate-500 italic">応答時間監視、エラー率監視、リソース使用状況、ネットワーク可用性などのパフォーマンス関連情報がここに表示されます。</p></Card>
      <Card title="📋 可用性設計・改善"><p className="text-sm text-slate-500 italic">可用性要件定義、改善計画、リスク評価、投資効果分析などの情報がここに表示されます。</p></Card>
      <Card title="🔄 運用プロセス"><p className="text-sm text-slate-500 italic">監視設定状況、アラート履歴、エスカレーション管理、変更管理連携などの運用プロセス情報がここに表示されます。</p></Card>
      <Card title="📊 SLA・契約管理"><p className="text-sm text-slate-500 italic">SLA目標値一覧、SLA達成実績、ペナルティ状況、顧客満足度（可用性に関する評価）などの情報がここに表示されます。</p></Card>
      
      <Card title="⚙️ クイックアクション">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsEmergencyModalOpen)}>緊急時対応手順</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsOutageReportModalOpen)}>障害報告書作成</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsAvailabilityReportModalOpen)}>可用性レポート生成</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsMaintenanceRequestModalOpen)}>メンテナンス計画申請</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsMonitoringSettingsModalOpen)}>監視設定変更</Button>
        </div>
      </Card>
      <Card title="🔍 根本原因分析"><p className="text-sm text-slate-500 italic">障害原因分析（カテゴリ別統計）、再発防止策（実施状況・効果測定）、ベンダー別可用性（外部委託先の実績）、改善提案事項などがここに表示されます。</p></Card>

       {/* Modals */}
      {isRecordModalOpen && editingRecord && (
        <Modal isOpen={isRecordModalOpen} onClose={handleCloseRecordModal} title={editingRecord.id ? "可用性記録編集" : "新規可用性記録"} size="lg">
          <form onSubmit={handleRecordSubmit} className="space-y-3 max-h-[80vh] overflow-y-auto p-1">
            <Input label="サービスID" name="serviceId" value={editingRecord.serviceId || ''} onChange={handleRecordInputChange} required />
            <Input label="サービス名" name="serviceName" value={editingRecord.serviceName || ''} onChange={handleRecordInputChange} required />
            <Select label="重要度" name="importance" value={editingRecord.importance || ServiceImportance.MEDIUM} onChange={handleRecordInputChange} options={serviceImportanceOptions.map(opt => ({value: opt, label: serviceImportanceToJapanese(opt)}))} required />
            <Select label="現在のステータス" name="currentStatus" value={editingRecord.currentStatus || CurrentServiceStatus.UNKNOWN} onChange={handleRecordInputChange} options={currentServiceStatusOptions.map(opt => ({value: opt, label: currentServiceStatusToJapanese(opt)}))} required />
            <Input label="目標稼働率 (%)" name="targetUptimePercentage" type="number" step="0.01" min="0" max="100" value={editingRecord.targetUptimePercentage ?? ''} onChange={handleRecordInputChange} required />
            {/* Other fields would go here if editable through this modal, like notes, relatedSlaId */}
            <Textarea label="備考" name="notes" value={editingRecord.notes || ''} onChange={handleRecordInputChange} rows={2}/>
            <div className="flex justify-end space-x-2 pt-2"><Button type="button" variant="ghost" onClick={handleCloseRecordModal}>キャンセル</Button><Button type="submit" variant="primary">保存</Button></div>
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
