
import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { 
    Vulnerability, ItemStatus, UserRole, 
    SecurityAlert, SecurityIncident, SecurityQuickActionFormData,
    SecurityAlertSeverity, SecurityIncidentStatus
} from '../types';
import { 
    getVulnerabilities, addVulnerability, updateVulnerability, deleteVulnerability,
    getSecurityAlerts, 
    getSecurityIncidents, addSecurityIncident,
    addAuditLog 
} from '../services/mockItsmService';
import { Button, Table, Modal, Input, Textarea, Select, Spinner, Card, Notification, NotificationType } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { itemStatusToJapanese, vulnerabilitySeverityToJapanese, securityAlertSeverityToJapanese, securityIncidentStatusToJapanese } from '../localization';

const SecurityManagementPage: React.FC = () => {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [securityIncidents, setSecurityIncidents] = useState<SecurityIncident[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isVulnerabilityModalOpen, setIsVulnerabilityModalOpen] = useState(false);
  const [editingVulnerability, setEditingVulnerability] = useState<Partial<Vulnerability> | null>(null);
  
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const { user } = useAuth();

  const vulnerabilitySeverities: Array<Vulnerability['severity']> = ['Informational', 'Low', 'Medium', 'High', 'Critical'];
  const vulnerabilityStatuses = [ItemStatus.IDENTIFIED, ItemStatus.IN_PROGRESS, ItemStatus.PENDING, ItemStatus.MITIGATED, ItemStatus.RESOLVED, ItemStatus.CLOSED];
  const alertSeverities = Object.values(SecurityAlertSeverity);
  const incidentStatuses = Object.values(SecurityIncidentStatus);

  // Quick Action Modals State
  const [isEmergencyProcedureModalOpen, setIsEmergencyProcedureModalOpen] = useState(false);
  const [isReportIncidentModalOpen, setIsReportIncidentModalOpen] = useState(false);
  const [isSecurityReportModalOpen, setIsSecurityReportModalOpen] = useState(false);
  const [isAccessSuspendModalOpen, setIsAccessSuspendModalOpen] = useState(false);
  const [isThreatShareModalOpen, setIsThreatShareModalOpen] = useState(false);
  const [quickActionFormData, setQuickActionFormData] = useState<SecurityQuickActionFormData>({});


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [vulnsData, alertsData, secIncidentsData] = await Promise.all([
        getVulnerabilities(),
        getSecurityAlerts(),
        getSecurityIncidents()
      ]);
      setVulnerabilities(vulnsData.sort((a,b) => new Date(b.discoveredDate).getTime() - new Date(a.discoveredDate).getTime()));
      setSecurityAlerts(alertsData);
      setSecurityIncidents(secIncidentsData.sort((a,b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()));
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
    setEditingVulnerability(vulnerability ? { ...vulnerability, affectedAssets: vulnerability.affectedAssets || [] } : { 
      title: '', description: '', severity: 'Medium', status: ItemStatus.IDENTIFIED,
      affectedAssets: [], discoveredDate: new Date().toISOString().split('T')[0],
    });
    setIsVulnerabilityModalOpen(true);
  };
  const handleCloseVulnerabilityModal = () => { setIsVulnerabilityModalOpen(false); setEditingVulnerability(null); };

  const handleVulnerabilityInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (editingVulnerability) {
      const { name, value } = e.target;
      if (name === "affectedAssets") {
        setEditingVulnerability({ ...editingVulnerability, [name]: value.split(',').map(s => s.trim()).filter(s => s) });
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
        reportedBy: editingVulnerability.reportedBy || user.username, // Or System Scan
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
      <Card title="🔐 アクセス制御・認証"><p className="text-sm text-slate-500 italic">アクセス権限ステータス、異常ログイン検知、特権アカウント管理、多要素認証状況などがここに表示されます。</p></Card>
      <Card title="📊 セキュリティ指標・メトリクス"><p className="text-sm text-slate-500 italic">セキュリティKPI、インシデント発生率、平均検知時間（MTTD）、平均対応時間（MTTR）などがここに表示されます。</p></Card>
      <Card title="📋 コンプライアンス・監査"><p className="text-sm text-slate-500 italic">規制要件遵守状況（ISO27001等）、内部・外部監査結果、認証ステータスなどがここに表示されます。</p></Card>
      <Card title="🔍 ログ・監視"><p className="text-sm text-slate-500 italic">セキュリティログ分析、SIEM連携状況、ファイアウォール・IDS/IPS状況、ネットワークトラフィック分析結果などがここに表示されます。</p></Card>
      <Card title="📱 エンドポイント・デバイス管理"><p className="text-sm text-slate-500 italic">ウイルス・マルウェア検知状況、MDM対象端末管理状況、セキュリティソフト更新状況、紛失・盗難報告などがここに表示されます。</p></Card>
      <Card title="🔄 インシデント対応 (CSIRT)"><p className="text-sm text-slate-500 italic">CSIRT活動状況、エスカレーション手順、フォレンジック調査結果などの詳細がここに表示されます。</p></Card>
      <Card title="📈 リスク評価・管理"><p className="text-sm text-slate-500 italic">セキュリティリスクマップ、リスクアセスメント結果、残存リスク状況、リスク軽減策実施状況などがここに表示されます。</p></Card>
      <Card title="🎓 セキュリティ教育・意識向上"><p className="text-sm text-slate-500 italic">セキュリティ研修実施状況、フィッシング訓練結果、セキュリティ意識調査結果、教育コンテンツなどがここに表示されます。</p></Card>
      <Card title="🔐 データ保護・暗号化"><p className="text-sm text-slate-500 italic">データ分類・保護状況、暗号化実装状況、DLP状況、バックアップセキュリティなどがここに表示されます。</p></Card>
      
      <Card title="⚙️ クイックアクション">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsEmergencyProcedureModalOpen)}>緊急時対応手順</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsReportIncidentModalOpen)}>インシデント報告</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsSecurityReportModalOpen)}>レポート生成</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsAccessSuspendModalOpen)}>アクセス権限緊急停止</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsThreatShareModalOpen)}>脅威情報共有</Button>
        </div>
      </Card>

      <Card title="📊 レポート・ドキュメント"><p className="text-sm text-slate-500 italic">月次セキュリティレポート、経営層向けダッシュボード、セキュリティポリシー更新履歴、ベンダーセキュリティ評価などがここに表示されます。</p></Card>
      <Card title="🌐 外部連携・情報共有"><p className="text-sm text-slate-500 italic">CERT/CSIRT連携情報、業界セキュリティ情報、政府機関からの注意喚起、セキュリティベンダー情報などがここに表示されます。</p></Card>

      {/* Vulnerability Add/Edit Modal */}
      {editingVulnerability && (
        <Modal isOpen={isVulnerabilityModalOpen} onClose={handleCloseVulnerabilityModal} title={editingVulnerability.id ? '脆弱性情報編集' : '新規脆弱性情報登録'} size="lg">
          <form onSubmit={handleVulnerabilitySubmit} className="space-y-4">
            <Input label="タイトル" name="title" value={editingVulnerability.title || ''} onChange={handleVulnerabilityInputChange} required />
            <Input label="CVE ID (任意)" name="cveId" value={editingVulnerability.cveId || ''} onChange={handleVulnerabilityInputChange} placeholder="例: CVE-2023-12345" />
            <Textarea label="説明" name="description" value={editingVulnerability.description || ''} onChange={handleVulnerabilityInputChange} required rows={3}/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="深刻度" name="severity" value={editingVulnerability.severity || 'Medium'} onChange={handleVulnerabilityInputChange} options={vulnerabilitySeverities.map(s => ({value: s, label: vulnerabilitySeverityToJapanese(s)}))} required/>
                <Select label="ステータス" name="status" value={editingVulnerability.status || ItemStatus.IDENTIFIED} onChange={handleVulnerabilityInputChange} options={vulnerabilityStatuses.map(s => ({value: s, label: itemStatusToJapanese(s)}))} required/>
            </div>
            <Input label="影響を受ける資産 (カンマ区切り)" name="affectedAssets" value={editingVulnerability.affectedAssets?.join(', ') || ''} onChange={handleVulnerabilityInputChange} placeholder="例: Server01, Workstation15"/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Input label="発見日" name="discoveredDate" type="date" value={editingVulnerability.discoveredDate ? new Date(editingVulnerability.discoveredDate).toISOString().split('T')[0] : ''} onChange={handleVulnerabilityInputChange} required />
                 <Input label="対応期日 (任意)" name="dueDate" type="date" value={editingVulnerability.dueDate ? new Date(editingVulnerability.dueDate).toISOString().split('T')[0] : ''} onChange={handleVulnerabilityInputChange} />
            </div>
            <Textarea label="修正計画 (任意)" name="remediationPlan" value={editingVulnerability.remediationPlan || ''} onChange={handleVulnerabilityInputChange} rows={3}/>
            <Input label="報告者/発見元 (任意)" name="reportedBy" value={editingVulnerability.reportedBy || ''} onChange={handleVulnerabilityInputChange} />
            <Input label="担当者 (任意)" name="assignedTo" value={editingVulnerability.assignedTo || ''} onChange={handleVulnerabilityInputChange} />
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="secondary" onClick={handleCloseVulnerabilityModal}>キャンセル</Button>
              <Button type="submit" variant="primary">{editingVulnerability.id ? '更新' : '登録'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Quick Action Modals */}
      <Modal isOpen={isEmergencyProcedureModalOpen} onClose={() => setIsEmergencyProcedureModalOpen(false)} title="緊急時対応手順参照" size="md">
        <p className="text-sm text-slate-700 mb-2">特定の緊急事態（例: ランサムウェア感染、DDoS攻撃）に対応するための手順書や連絡先情報を表示します。</p>
        <Textarea value="例: 1. 影響範囲の特定。2.ネットワークからの隔離。3.CSIRTへ報告。4.経営層へのエスカレーション..." readOnly rows={5} />
        <div className="flex justify-end pt-3"><Button onClick={() => setIsEmergencyProcedureModalOpen(false)}>閉じる</Button></div>
      </Modal>

      <Modal isOpen={isReportIncidentModalOpen} onClose={() => setIsReportIncidentModalOpen(false)} title="セキュリティインシデント報告" size="lg">
        <form onSubmit={handleReportIncidentSubmit} className="space-y-3">
          <Input label="インシデントタイトル" name="incidentTitle" value={quickActionFormData.incidentTitle || ''} onChange={handleQuickActionFormChange} required />
          <Textarea label="インシデント詳細" name="incidentDescription" value={quickActionFormData.incidentDescription || ''} onChange={handleQuickActionFormChange} required rows={4} />
          <Select label="深刻度 (推定)" name="incidentSeverity" value={quickActionFormData.incidentSeverity || SecurityAlertSeverity.MEDIUM} onChange={handleQuickActionFormChange} options={alertSeverities.map(s => ({value: s, label: securityAlertSeverityToJapanese(s)}))} />
          <div className="flex justify-end pt-2"><Button type="submit" variant="primary">報告</Button></div>
        </form>
      </Modal>
      
      <Modal isOpen={isSecurityReportModalOpen} onClose={() => setIsSecurityReportModalOpen(false)} title="セキュリティレポート生成" size="md">
        <form onSubmit={(e) => {e.preventDefault(); handleGenericQuickAction("セキュリティレポート生成", `レポートタイプ: ${quickActionFormData.reportType}, 期間: ${quickActionFormData.reportPeriodStart}～${quickActionFormData.reportPeriodEnd}`, () => setIsSecurityReportModalOpen(false));}} className="space-y-3">
            <Select label="レポートタイプ" name="reportType" value={quickActionFormData.reportType || ''} onChange={handleQuickActionFormChange} options={[{value:'vuln_summary', label:'脆弱性サマリー'}, {value:'incident_trend', label:'インシデント傾向'}]} required />
            <Input label="期間 (開始)" name="reportPeriodStart" type="date" value={quickActionFormData.reportPeriodStart || ''} onChange={handleQuickActionFormChange} />
            <Input label="期間 (終了)" name="reportPeriodEnd" type="date" value={quickActionFormData.reportPeriodEnd || ''} onChange={handleQuickActionFormChange} />
            <div className="flex justify-end pt-2"><Button type="submit" variant="primary">生成 (シミュレーション)</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isAccessSuspendModalOpen} onClose={() => setIsAccessSuspendModalOpen(false)} title="アクセス権限緊急停止" size="md">
        <form onSubmit={(e) => {e.preventDefault(); handleGenericQuickAction("アクセス権限緊急停止", `対象ユーザー: ${quickActionFormData.accessSuspensionUser}, 理由: ${quickActionFormData.accessSuspensionReason}`, () => setIsAccessSuspendModalOpen(false));}} className="space-y-3">
            <Input label="対象ユーザー名" name="accessSuspensionUser" value={quickActionFormData.accessSuspensionUser || ''} onChange={handleQuickActionFormChange} required />
            <Textarea label="停止理由" name="accessSuspensionReason" value={quickActionFormData.accessSuspensionReason || ''} onChange={handleQuickActionFormChange} required rows={3}/>
            <div className="flex justify-end pt-2"><Button type="submit" variant="danger">実行 (シミュレーション)</Button></div>
        </form>
      </Modal>
      
      <Modal isOpen={isThreatShareModalOpen} onClose={() => setIsThreatShareModalOpen(false)} title="脅威情報共有" size="lg">
        <form onSubmit={(e) => {e.preventDefault(); handleGenericQuickAction("脅威情報共有", `脅威情報: ${quickActionFormData.threatDescription}, 深刻度: ${quickActionFormData.threatSeverity}, 共有先: ${quickActionFormData.threatRecipients}`, () => setIsThreatShareModalOpen(false));}} className="space-y-3">
            <Textarea label="共有する脅威情報" name="threatDescription" value={quickActionFormData.threatDescription || ''} onChange={handleQuickActionFormChange} required rows={4}/>
            <Select label="脅威の深刻度" name="threatSeverity" value={quickActionFormData.threatSeverity || SecurityAlertSeverity.MEDIUM} onChange={handleQuickActionFormChange} options={alertSeverities.map(s => ({value: s, label: securityAlertSeverityToJapanese(s)}))} />
            <Input label="共有先 (部署名、ロール名、メールアドレスなど)" name="threatRecipients" value={quickActionFormData.threatRecipients || ''} onChange={handleQuickActionFormChange} required />
            <div className="flex justify-end pt-2"><Button type="submit" variant="primary">共有 (シミュレーション)</Button></div>
        </form>
      </Modal>

    </div>
  );
};

export default SecurityManagementPage;