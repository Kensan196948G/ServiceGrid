
import * as React from 'react';
const { useState, useEffect, useCallback, useMemo } = React;
type ReactNode = React.ReactNode;
import { MonitoredResource, UserRole, CapacityQuickActionFormData } from '../types';
import { 
    getMonitoredResources, 
    addMonitoredResource, 
    updateMonitoredResource, 
    deleteMonitoredResource,
    addAuditLog 
} from '../services/mockItsmService';
import { 
    Table, Spinner, Card, Notification, NotificationType, Button, Modal, Input, Select, Textarea 
} from '../components/CommonUI';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell } from '../components/ChartPlaceholder';
import { capacityTrendToJapanese, monitoredResourceTypeToJapanese } from '../localization';
import { useAuth } from '../contexts/AuthContext';

const CapacityManagementPage: React.FC = () => {
  const [allResources, setAllResources] = useState<MonitoredResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const { user } = useAuth();

  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Partial<MonitoredResource> | null>(null);
  const [selectedResourceForTrend, setSelectedResourceForTrend] = useState<MonitoredResource | null>(null);
  
  // Quick Action Modals State
  const [isCapacityRequestModalOpen, setIsCapacityRequestModalOpen] = useState(false);
  const [isAlertSettingsModalOpen, setIsAlertSettingsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isOptimizationModalOpen, setIsOptimizationModalOpen] = useState(false);
  const [isEmergencyExpansionModalOpen, setIsEmergencyExpansionModalOpen] = useState(false);
  const [quickActionFormData, setQuickActionFormData] = useState<CapacityQuickActionFormData>({});


  const resourceTypes: MonitoredResource['type'][] = ['Server', 'Database', 'Network', 'Storage', 'Application Component'];
  const resourceMetrics: MonitoredResource['metric'][] = ['CPU Utilization', 'Memory Usage', 'Disk Space', 'Network I/O', 'Transaction per Second'];
  const resourceUnits: MonitoredResource['unit'][] = ['%', 'GB', 'TB', 'Mbps', 'TPS'];

  const fetchAllResources = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMonitoredResources();
      setAllResources(data.sort((a,b) => a.resourceName.localeCompare(b.resourceName)));
      if (data.length > 0 && !selectedResourceForTrend) {
        const firstWithHistory = data.find(r => r.historicalData && r.historicalData.length > 0);
        setSelectedResourceForTrend(firstWithHistory || data[0]);
      }
    } catch (error) {
      console.error("監視リソースの読み込みに失敗:", error);
      setNotification({ message: '監視リソースデータの読み込みに失敗しました。', type: NotificationType.ERROR });
    } finally {
      setIsLoading(false);
    }
  }, [selectedResourceForTrend]);

  useEffect(() => {
    fetchAllResources();
  }, [fetchAllResources]);

  // Resource Add/Edit Modal Handlers
  const handleOpenResourceModal = (resource?: MonitoredResource) => {
    setEditingResource(resource ? { ...resource } : {
      resourceName: '', type: 'Server', metric: 'CPU Utilization', currentValue: 0, unit: '%',
      warningThreshold: 70, criticalThreshold: 85, trend: 'Stable'
    });
    setIsResourceModalOpen(true);
  };
  const handleCloseResourceModal = () => setIsResourceModalOpen(false);

  const handleResourceInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (editingResource) {
      const { name, value } = e.target;
      const numericFields = ['currentValue', 'warningThreshold', 'criticalThreshold'];
      if (numericFields.includes(name)) {
        setEditingResource({ ...editingResource, [name]: parseFloat(value) || 0 });
      } else {
        setEditingResource({ ...editingResource, [name]: value });
      }
    }
  };

  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource || !user) return;
    try {
      const currentUserInfo = { userId: user.id, username: user.username };
      if (editingResource.id) {
        await updateMonitoredResource(editingResource.id, editingResource as MonitoredResource, currentUserInfo);
        setNotification({ message: '監視リソースが正常に更新されました。', type: NotificationType.SUCCESS });
      } else {
        await addMonitoredResource(editingResource as Omit<MonitoredResource, 'id'>, currentUserInfo);
        setNotification({ message: '監視リソースが正常に追加されました。', type: NotificationType.SUCCESS });
      }
      fetchAllResources();
      handleCloseResourceModal();
    } catch (error) {
      console.error("監視リソースの保存に失敗:", error);
      setNotification({ message: '監視リソースの保存に失敗しました。', type: NotificationType.ERROR });
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!user) return;
    if (window.confirm('この監視リソースを削除してもよろしいですか？')) {
      try {
        await deleteMonitoredResource(id, { userId: user.id, username: user.username });
        setNotification({ message: '監視リソースが正常に削除されました。', type: NotificationType.SUCCESS });
        fetchAllResources();
      } catch (error) {
        console.error("監視リソースの削除に失敗:", error);
        setNotification({ message: '監視リソースの削除に失敗しました。', type: NotificationType.ERROR });
      }
    }
  };
  
  // Quick Action Handlers
  const openQuickActionModal = (modalSetFunction: React.Dispatch<React.SetStateAction<boolean>>, resourceId?: string) => {
    setQuickActionFormData({ selectedResourceId: resourceId || allResources[0]?.id });
    modalSetFunction(true);
  };
  const handleQuickActionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuickActionFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleQuickActionNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setQuickActionFormData(prev => ({ ...prev, [name]: parseFloat(value) || undefined }));
  };

  const handleGenericQuickAction = async (actionName: string, detailsCallback: (data: CapacityQuickActionFormData, resource?: MonitoredResource) => string, modalCloseFn: () => void ) => {
    if (!user || !quickActionFormData.selectedResourceId) return;
    const resource = allResources.find(r => r.id === quickActionFormData.selectedResourceId);
    await addAuditLog({ userId: user.id, username: user.username, action: `キャパシティ管理: ${actionName}`, details: detailsCallback(quickActionFormData, resource) });
    setNotification({ message: `${actionName}が正常に実行されました（シミュレーション）。`, type: NotificationType.SUCCESS });
    modalCloseFn();
    setQuickActionFormData({});
  };


  const columns: Array<{ Header: string; accessor: keyof MonitoredResource | ((row: MonitoredResource) => ReactNode) }> = [
    { Header: 'リソース名', accessor: 'resourceName' },
    { Header: '種類', accessor: (row) => monitoredResourceTypeToJapanese(row.type) },
    { Header: 'メトリック', accessor: 'metric' },
    { Header: '現在値', accessor: (row) => `${row.currentValue}${row.unit}` },
    { Header: '警告閾値', accessor: (row) => `${row.warningThreshold}${row.unit}` },
    { Header: '危険閾値', accessor: (row) => `${row.criticalThreshold}${row.unit}` },
    { Header: '傾向', accessor: (row) => (
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
            row.currentValue >= row.criticalThreshold ? 'bg-red-200 text-red-800' :
            row.currentValue >= row.warningThreshold ? 'bg-yellow-200 text-yellow-800' :
            'bg-green-200 text-green-800'
        }`}>
            {capacityTrendToJapanese(row.trend)}
            {row.currentValue >= row.criticalThreshold && ' (危険!)'}
            {row.currentValue < row.criticalThreshold && row.currentValue >= row.warningThreshold && ' (警告!)'}
        </span>
    )},
    { Header: 'アクション', accessor: (row) => (
        <div className="flex space-x-1">
        <Button size="sm" variant="ghost" onClick={() => handleOpenResourceModal(row)}>編集</Button>
        {user?.role === UserRole.ADMIN && <Button size="sm" variant="danger" onClick={() => handleDeleteResource(row.id)}>削除</Button>}
        </div>
    )},
  ];

  const resourceOptionsForSelect = allResources.map(r => ({ value: r.id, label: `${r.resourceName} (${r.metric})` }));
  
  const realTimeAlerts = useMemo(() => allResources.filter(r => r.currentValue >= r.warningThreshold), [allResources]);

  if (isLoading && !allResources.length) {
    return <div className="flex justify-center items-center h-full"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 pb-10">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-slate-800">キャパシティ管理</h2>
        {user?.role === UserRole.ADMIN && <Button onClick={() => handleOpenResourceModal()}>監視リソース追加</Button>}
      </div>

      <Card title="📊 リアルタイム監視情報">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {allResources.slice(0,3).map(r => ( // Show first 3 as example gauges
            <div key={r.id} className="p-3 bg-slate-50 rounded shadow">
              <h4 className="font-semibold text-sm text-slate-700">{r.resourceName} ({r.metric})</h4>
              <div className="w-full bg-slate-200 rounded-full h-2.5 my-1">
                <div 
                  className={`h-2.5 rounded-full ${r.currentValue >= r.criticalThreshold ? 'bg-red-500' : r.currentValue >= r.warningThreshold ? 'bg-yellow-400' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(100, (r.currentValue / (r.criticalThreshold * 1.1)) * 100)}%` }} // Cap width at 100% or slightly above critical for visuals
                ></div>
              </div>
              <p className="text-xs text-slate-600">現在値: {r.currentValue}{r.unit} (警告: {r.warningThreshold}{r.unit}, 危険: {r.criticalThreshold}{r.unit})</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-600 my-2">パフォーマンス指標（レスポンス時間、スループット）: データ収集中...</p>
        {realTimeAlerts.length > 0 ? (
          <div>
            <h4 className="font-semibold text-orange-600">アラート・警告表示:</h4>
            <ul className="list-disc list-inside text-sm text-orange-500">
              {realTimeAlerts.map(r => <li key={r.id}>{r.resourceName} ({r.metric}) が {r.currentValue >= r.criticalThreshold ? '危険' : '警告'}閾値を超過 (現在: {r.currentValue}{r.unit})</li>)}
            </ul>
          </div>
        ) : <p className="text-sm text-slate-500 italic">現在、容量不足や性能劣化に関するアラートはありません。</p>}
      </Card>

      <Card title="📈 容量分析・予測">
        <Select
            label="トレンド分析対象リソース:"
            options={resourceOptionsForSelect}
            value={selectedResourceForTrend?.id || ''}
            onChange={(e) => setSelectedResourceForTrend(allResources.find(r => r.id === e.target.value) || null)}
            className="mb-3 max-w-md"
        />
        {selectedResourceForTrend && selectedResourceForTrend.historicalData && selectedResourceForTrend.historicalData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={selectedResourceForTrend.historicalData.map(p => ({date: new Date(p.date).toLocaleDateString(), value: p.value}))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis unit={selectedResourceForTrend.unit}/>
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" name={selectedResourceForTrend.metric} stroke="#3B82F6" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="warning" name="警告閾値" stroke="#FACC15" strokeDasharray="5 5" 
                      data={selectedResourceForTrend.historicalData.map(() => ({warning: selectedResourceForTrend.warningThreshold}))} />
                    <Line type="monotone" dataKey="critical" name="危険閾値" stroke="#EF4444" strokeDasharray="5 5" 
                      data={selectedResourceForTrend.historicalData.map(() => ({critical: selectedResourceForTrend.criticalThreshold}))} />
                </LineChart>
            </ResponsiveContainer>
        ) : <p className="text-slate-500 italic">選択されたリソースのトレンドデータがありません。</p>}
        <p className="text-sm text-slate-600 mt-3">成長率分析、容量予測（枯渇予測日、拡張必要時期）、季節性分析は、収集データと高度な分析ツールに基づいてここに表示されます。</p>
      </Card>

      <Card title="🖥️ インフラストラクチャ概要 (監視リソース一覧)">
         {isLoading ? <div className="flex justify-center p-8"><Spinner /></div> : 
         allResources.length > 0 ? <Table<MonitoredResource> columns={columns} data={allResources} />
         : <p className="p-4 text-slate-500 italic">監視対象のリソースはありません。</p>}
         <p className="text-sm text-slate-600 mt-3">ストレージ総容量/残容量、ネットワーク帯域使用状況、ライセンス使用状況などのサマリーはここに集約されます。</p>
      </Card>
      
      {/* Placeholder sections */}
      <Card title="⚡ パフォーマンス管理"><p className="text-sm text-slate-500 italic">ボトルネック識別、ピーク時間分析、ユーザー数・トランザクション量、アプリケーション別リソース消費などの詳細なパフォーマンス分析結果がここに表示されます。</p></Card>
      <Card title="📋 計画・最適化"><p className="text-sm text-slate-500 italic">容量計画スケジュール（拡張・更新予定）、リソース最適化提案、コスト分析（ROI）、SLA影響分析（容量不足時のサービス影響）などがここに表示されます。</p></Card>
      <Card title="🔄 運用管理"><p className="text-sm text-slate-500 italic">今後のシステム拡張・移行計画、メンテナンススケジュール、バックアップ・DR容量状況、クラウドリソース管理（オンプレ/クラウド混在環境の場合）に関する情報がここに表示されます。</p></Card>

      <Card title="⚙️ クイックアクション">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsCapacityRequestModalOpen)}>容量追加申請</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsAlertSettingsModalOpen)}>アラート設定</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsReportModalOpen)}>レポート生成</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsOptimizationModalOpen)}>最適化実行</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsEmergencyExpansionModalOpen)}>緊急拡張手続</Button>
        </div>
      </Card>
      <Card title="📊 レポート・ドキュメント"><p className="text-sm text-slate-500 italic">定期的なキャパシティレポート（月次/四半期）、ベンチマーク比較、業界標準との比較、過去の改善履歴ドキュメントなどがここにリンクまたは表示されます。</p></Card>

      {/* Modals */}
      {isResourceModalOpen && editingResource && (
        <Modal isOpen={isResourceModalOpen} onClose={handleCloseResourceModal} title={editingResource.id ? "監視リソース編集" : "新規監視リソース追加"} size="lg">
          <form onSubmit={handleResourceSubmit} className="space-y-3">
            <Input label="リソース名" name="resourceName" value={editingResource.resourceName || ''} onChange={handleResourceInputChange} required />
            <Select label="種類" name="type" value={editingResource.type || 'Server'} onChange={handleResourceInputChange} options={resourceTypes.map(t => ({value: t, label: monitoredResourceTypeToJapanese(t)}))} required />
            <Select label="メトリック" name="metric" value={editingResource.metric || 'CPU Utilization'} onChange={handleResourceInputChange} options={resourceMetrics.map(m => ({value: m, label: m}))} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="現在値" name="currentValue" type="number" step="any" value={editingResource.currentValue ?? ''} onChange={handleResourceInputChange} required />
              <Select label="単位" name="unit" value={editingResource.unit || '%'} onChange={handleResourceInputChange} options={resourceUnits.map(u => ({value: u, label: u}))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="警告閾値" name="warningThreshold" type="number" step="any" value={editingResource.warningThreshold ?? ''} onChange={handleResourceInputChange} required />
              <Input label="危険閾値" name="criticalThreshold" type="number" step="any" value={editingResource.criticalThreshold ?? ''} onChange={handleResourceInputChange} required />
            </div>
            <Select label="傾向" name="trend" value={editingResource.trend || 'Stable'} onChange={handleResourceInputChange} options={['Stable', 'Increasing', 'Decreasing'].map(t => ({value: t, label: capacityTrendToJapanese(t as 'Stable'|'Increasing'|'Decreasing')}))} />
            <Textarea label="備考" name="notes" value={editingResource.notes || ''} onChange={handleResourceInputChange} rows={2}/>
            <div className="flex justify-end space-x-2 pt-2"><Button type="button" variant="ghost" onClick={handleCloseResourceModal}>キャンセル</Button><Button type="submit" variant="primary">保存</Button></div>
          </form>
        </Modal>
      )}
      
      {/* Capacity Request Modal */}
      <Modal isOpen={isCapacityRequestModalOpen} onClose={() => setIsCapacityRequestModalOpen(false)} title="容量追加申請" size="md">
        <form onSubmit={(e) => { e.preventDefault(); handleGenericQuickAction("容量追加申請", (data, res) => `リソース「${res?.resourceName || data.selectedResourceId}」への容量追加申請: 要求内容「${data.requestedCapacity}」、理由「${data.justification}」。`, () => setIsCapacityRequestModalOpen(false)); }} className="space-y-3">
          <Select label="対象リソース" name="selectedResourceId" value={quickActionFormData.selectedResourceId || ''} onChange={handleQuickActionFormChange} options={resourceOptionsForSelect} required />
          <Input label="要求容量/内容" name="requestedCapacity" value={quickActionFormData.requestedCapacity || ''} onChange={handleQuickActionFormChange} required placeholder="例: CPUコア2追加, ディスク500GB増設"/>
          <Textarea label="申請理由" name="justification" value={quickActionFormData.justification || ''} onChange={handleQuickActionFormChange} required rows={3}/>
          <div className="flex justify-end pt-2"><Button type="submit" variant="primary">申請 (シミュレーション)</Button></div>
        </form>
      </Modal>

      {/* Alert Settings Modal */}
       <Modal isOpen={isAlertSettingsModalOpen} onClose={() => setIsAlertSettingsModalOpen(false)} title="アラート設定変更" size="md">
        <form onSubmit={(e) => { e.preventDefault(); handleGenericQuickAction("アラート設定変更", (data, res) => `リソース「${res?.resourceName || data.selectedResourceId}」のアラート設定変更: 警告閾値「${data.newWarningThreshold}」、危険閾値「${data.newCriticalThreshold}」、通知先「${data.notificationRecipients}」。`, () => setIsAlertSettingsModalOpen(false)); }} className="space-y-3">
          <Select label="対象リソース" name="selectedResourceId" value={quickActionFormData.selectedResourceId || ''} onChange={handleQuickActionFormChange} options={resourceOptionsForSelect} required />
          <Input label="新 警告閾値" name="newWarningThreshold" type="number" step="any" value={quickActionFormData.newWarningThreshold ?? ''} onChange={handleQuickActionNumberChange} />
          <Input label="新 危険閾値" name="newCriticalThreshold" type="number" step="any" value={quickActionFormData.newCriticalThreshold ?? ''} onChange={handleQuickActionNumberChange} />
          <Input label="通知先 (カンマ区切り)" name="notificationRecipients" value={quickActionFormData.notificationRecipients || ''} onChange={handleQuickActionFormChange} />
          <div className="flex justify-end pt-2"><Button type="submit" variant="primary">保存 (シミュレーション)</Button></div>
        </form>
      </Modal>

      {/* Report Generation Modal */}
      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="レポート生成" size="md">
        <form onSubmit={(e) => { e.preventDefault(); handleGenericQuickAction("レポート生成", (data) => `キャパシティレポート生成: タイプ「${data.reportType}」、期間「${data.reportPeriodStart}～${data.reportPeriodEnd}」。`, () => setIsReportModalOpen(false)); }} className="space-y-3">
          <Select label="レポートタイプ" name="reportType" value={quickActionFormData.reportType || ''} onChange={handleQuickActionFormChange} options={[{value:'usage', label:'月次使用状況'}, {value:'trend', label:'トレンド予測'}, {value:'all_resources', label:'全リソース概要'}]} required />
          <Input label="レポート期間 (開始)" name="reportPeriodStart" type="date" value={quickActionFormData.reportPeriodStart || ''} onChange={handleQuickActionFormChange} />
          <Input label="レポート期間 (終了)" name="reportPeriodEnd" type="date" value={quickActionFormData.reportPeriodEnd || ''} onChange={handleQuickActionFormChange} />
          <div className="flex justify-end pt-2"><Button type="submit" variant="primary">生成 (シミュレーション)</Button></div>
        </form>
      </Modal>
      
      {/* Optimization Modal */}
      <Modal isOpen={isOptimizationModalOpen} onClose={() => setIsOptimizationModalOpen(false)} title="最適化実行" size="md">
        <form onSubmit={(e) => { e.preventDefault(); handleGenericQuickAction("最適化実行", (data, res) => `リソース「${res?.resourceName || data.selectedResourceId}」の最適化実行: 計画「${data.optimizationPlan}」。`, () => setIsOptimizationModalOpen(false)); }} className="space-y-3">
          <Select label="対象リソース/エリア" name="selectedResourceId" value={quickActionFormData.selectedResourceId || ''} onChange={handleQuickActionFormChange} options={resourceOptionsForSelect} required />
          <Textarea label="最適化計画の概要" name="optimizationPlan" value={quickActionFormData.optimizationPlan || ''} onChange={handleQuickActionFormChange} required rows={3} placeholder="例: DBインデックス再構築, VMリソース割り当て見直し"/>
          <div className="flex justify-end pt-2"><Button type="submit" variant="primary">実行 (シミュレーション)</Button></div>
        </form>
      </Modal>

      {/* Emergency Expansion Modal */}
       <Modal isOpen={isEmergencyExpansionModalOpen} onClose={() => setIsEmergencyExpansionModalOpen(false)} title="緊急拡張手続き" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleGenericQuickAction("緊急拡張手続き", (data) => `緊急拡張手続き開始: 理由「${data.emergencyJustification}」、要求リソース「${data.emergencyResources}」、承認経路「${data.emergencyApproval}」。`, () => setIsEmergencyExpansionModalOpen(false)); }} className="space-y-3">
          <Textarea label="緊急拡張の理由" name="emergencyJustification" value={quickActionFormData.emergencyJustification || ''} onChange={handleQuickActionFormChange} required rows={3}/>
          <Input label="要求リソース詳細" name="emergencyResources" value={quickActionFormData.emergencyResources || ''} onChange={handleQuickActionFormChange} required placeholder="例: WebServer01 CPU 2コア追加, メモリ8GB追加"/>
          <Input label="緊急承認経路" name="emergencyApproval" value={quickActionFormData.emergencyApproval || ''} onChange={handleQuickActionFormChange} required placeholder="例: 部門長 → IT部長"/>
          <p className="text-xs text-red-600">注意: これはシミュレーションです。実際の緊急手続きは所定のプロセスに従ってください。</p>
          <div className="flex justify-end pt-2"><Button type="submit" variant="danger">手続き開始 (シミュレーション)</Button></div>
        </form>
      </Modal>

    </div>
  );
};

export default CapacityManagementPage;
