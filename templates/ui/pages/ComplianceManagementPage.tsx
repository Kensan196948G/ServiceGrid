
import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { 
    ComplianceControl, ItemStatus, UserRole, 
    ComplianceAudit, ComplianceRiskItem, ComplianceQuickActionFormData,
    ComplianceAuditStatus, ComplianceAuditType, ComplianceRiskLevel, ComplianceRiskStatus
} from '../types';
import { 
    getComplianceControls, addComplianceControl, updateComplianceControl, deleteComplianceControl,
    getComplianceAudits, getComplianceRiskItems, addAuditLog
} from '../services/mockItsmService';
import { Button, Table, Modal, Input, Textarea, Select, Spinner, Card, Notification, NotificationType } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { 
    itemStatusToJapanese, complianceAuditStatusToJapanese, complianceAuditTypeToJapanese,
    complianceRiskLevelToJapanese, complianceRiskStatusToJapanese
} from '../localization'; 

const ComplianceManagementPage: React.FC = () => {
  const [controls, setControls] = useState<ComplianceControl[]>([]);
  const [audits, setAudits] = useState<ComplianceAudit[]>([]);
  const [riskItems, setRiskItems] = useState<ComplianceRiskItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);
  const [editingControl, setEditingControl] = useState<Partial<ComplianceControl> | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const { user } = useAuth();

  const controlStandards: Array<ComplianceControl['standard']> = ['ISO 27001', 'PCI DSS', 'GDPR', '社内規定 XYZ', 'その他'];
  const controlStatuses = [ItemStatus.COMPLIANT, ItemStatus.NON_COMPLIANT, ItemStatus.IN_REVIEW, ItemStatus.NOT_APPLICABLE, ItemStatus.PENDING];
  const controlCategories = ['アクセス制御', 'データ保護', '物理セキュリティ', 'インシデント対応', '事業継続', 'その他'];
  const riskLevelsForSelect = Object.values(ComplianceRiskLevel);
  const capStatusesForSelect = [ItemStatus.OPEN, ItemStatus.IN_PROGRESS, ItemStatus.RESOLVED, ItemStatus.CLOSED]; // For CAP status in control modal

  // Quick Action Modals State
  const [isEmergencyProcedureModalOpen, setIsEmergencyProcedureModalOpen] = useState(false);
  const [isAuditChecklistModalOpen, setIsAuditChecklistModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCapModalOpen, setIsCapModalOpen] = useState(false);
  const [isRegulationImpactModalOpen, setIsRegulationImpactModalOpen] = useState(false);
  const [quickActionFormData, setQuickActionFormData] = useState<ComplianceQuickActionFormData>({});

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [controlsData, auditsData, risksData] = await Promise.all([
        getComplianceControls(),
        getComplianceAudits(),
        getComplianceRiskItems(),
      ]);
      setControls(controlsData.sort((a,b) => a.controlId.localeCompare(b.controlId)));
      setAudits(auditsData); // Already sorted by date in service
      setRiskItems(risksData); // Already sorted by risk in service
    } catch (error) {
      console.error("コンプライアンス関連データの読み込みに失敗:", error);
      setNotification({ message: 'コンプライアンス関連データの読み込みに失敗しました。', type: NotificationType.ERROR });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenControlModal = (control?: ComplianceControl) => {
    setEditingControl(control ? { ...control, evidenceLinks: control.evidenceLinks || [] } : { 
      controlId: `NEW_CTRL_${Date.now().toString().slice(-4)}`,
      name: '', description: '', standard: 'ISO 27001', 
      category: 'その他', status: ItemStatus.IN_REVIEW, evidenceLinks: [],
      riskLevel: ComplianceRiskLevel.LOW, capStatus: ItemStatus.NOT_APPLICABLE
    });
    setIsControlModalOpen(true);
  };

  const handleCloseControlModal = () => { setIsControlModalOpen(false); setEditingControl(null); };

  const handleControlInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (editingControl) {
      const { name, value } = e.target;
       if (name === "evidenceLinks") {
        setEditingControl({ ...editingControl, [name]: value.split(',').map(s => s.trim()).filter(s => s) });
      } else if (name === "lastAuditDate" || name === "nextAuditDate") {
         setEditingControl({ ...editingControl, [name]: value ? new Date(value).toISOString().split('T')[0] : undefined });
      } else {
        setEditingControl({ ...editingControl, [name]: value });
      }
    }
  };

  const handleControlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingControl || !user) return;
    try {
      const controlToSave = {
        ...editingControl,
        evidenceLinks: editingControl.evidenceLinks || [],
        lastAuditDate: editingControl.lastAuditDate ? new Date(editingControl.lastAuditDate).toISOString() : undefined,
        nextAuditDate: editingControl.nextAuditDate ? new Date(editingControl.nextAuditDate).toISOString() : undefined,
      } as ComplianceControl;

      if (editingControl.id) {
        await updateComplianceControl(editingControl.id, controlToSave);
        setNotification({ message: 'コンプライアンス統制が正常に更新されました。', type: NotificationType.SUCCESS });
      } else {
        await addComplianceControl(controlToSave as Omit<ComplianceControl, 'id'>);
        setNotification({ message: 'コンプライアンス統制が正常に登録されました。', type: NotificationType.SUCCESS });
      }
      fetchData();
      handleCloseControlModal();
    } catch (error) {
      console.error("コンプライアンス統制の保存に失敗:", error);
      setNotification({ message: 'コンプライアンス統制の保存に失敗しました。', type: NotificationType.ERROR });
    }
  };
  
  const handleDeleteControlClick = async (id: string) => {
    if (window.confirm('このコンプライアンス統制を削除してもよろしいですか？')) {
        try {
            await deleteComplianceControl(id);
            setNotification({ message: 'コンプライアンス統制が正常に削除されました。', type: NotificationType.SUCCESS });
            fetchData(); 
        } catch (error: any) {
            console.error("コンプライアンス統制の削除に失敗:", error);
            setNotification({ message: `統制の削除に失敗: ${error.message}`, type: NotificationType.ERROR });
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
  const handleGenericQuickAction = async (actionName: string, details: string, modalCloseFn: () => void ) => {
    if (!user) return;
    await addAuditLog({ userId: user.id, username: user.username, action: `コンプライアンス管理: ${actionName}`, details });
    setNotification({ message: `${actionName}が正常に実行されました（シミュレーション）。`, type: NotificationType.SUCCESS });
    modalCloseFn();
    setQuickActionFormData({});
  };
  
  // Derived data for Overview
  const overallComplianceSummary = useMemo(() => {
    if (controls.length === 0) return { rate: 'N/A', nonCompliantCount: 0 };
    const compliantCount = controls.filter(c => c.status === ItemStatus.COMPLIANT).length;
    const nonCompliantCount = controls.filter(c => c.status === ItemStatus.NON_COMPLIANT).length;
    const rate = ((compliantCount / controls.length) * 100).toFixed(1) + '%';
    return { rate, nonCompliantCount };
  }, [controls]);

  const upcomingDeadlines = useMemo(() => {
    const today = new Date();
    const next30Days = new Date(today);
    next30Days.setDate(today.getDate() + 30);
    return audits
      .filter(a => a.scheduledStartDate && new Date(a.scheduledStartDate) <= next30Days && a.status === ComplianceAuditStatus.PLANNED)
      .map(a => `監査「${a.auditName}」(${complianceAuditTypeToJapanese(a.type)}) - ${new Date(a.scheduledStartDate).toLocaleDateString()}開始予定`);
  }, [audits]);

  const controlColumns: Array<{ Header: string; accessor: keyof ComplianceControl | ((row: ComplianceControl) => ReactNode) }> = [
    { Header: '統制ID', accessor: 'controlId' }, { Header: '名称', accessor: 'name' },
    { Header: '基準', accessor: 'standard' }, { Header: 'カテゴリ', accessor: 'category' },
    { Header: 'ステータス', accessor: (row) => itemStatusToJapanese(row.status) },
    { Header: 'リスク', accessor: (row) => row.riskLevel ? complianceRiskLevelToJapanese(row.riskLevel) : 'N/A'},
    { Header: '是正状況', accessor: (row) => row.capStatus ? itemStatusToJapanese(row.capStatus) : 'N/A'},
    { Header: '最終監査', accessor: (row) => row.lastAuditDate ? new Date(row.lastAuditDate).toLocaleDateString() : 'N/A' },
    { Header: '操作', accessor: (row) => (
      <div className="flex items-center space-x-1">
        <Button size="sm" variant="ghost" onClick={() => handleOpenControlModal(row)}>編集</Button>
        {user?.role === UserRole.ADMIN && <Button size="sm" variant="danger" onClick={() => handleDeleteControlClick(row.id)}>削除</Button>}
      </div>
    )},
  ];
  const auditColumns: Array<{ Header: string; accessor: keyof ComplianceAudit | ((row: ComplianceAudit) => ReactNode) }> = [
    { Header: '監査名', accessor: 'auditName'}, { Header: '基準', accessor: 'standard'},
    { Header: '種別', accessor: (row) => complianceAuditTypeToJapanese(row.type)},
    { Header: '予定開始日', accessor: (row) => new Date(row.scheduledStartDate).toLocaleDateString()},
    { Header: 'ステータス', accessor: (row) => complianceAuditStatusToJapanese(row.status)},
    { Header: '発見事項数', accessor: (row) => row.findingsCount ?? 'N/A'},
  ];
  const riskColumns: Array<{ Header: string; accessor: keyof ComplianceRiskItem | ((row: ComplianceRiskItem) => ReactNode) }> = [
    { Header: 'リスク内容', accessor: 'riskDescription'}, { Header: '関連統制ID', accessor: (row) => row.relatedControlId || 'N/A'},
    { Header: '全体リスク', accessor: (row) => complianceRiskLevelToJapanese(row.overallRisk)},
    { Header: 'ステータス', accessor: (row) => complianceRiskStatusToJapanese(row.status)},
    { Header: '対応期日', accessor: (row) => row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'N/A'},
  ];

  if (isLoading) return <div className="flex justify-center items-center h-full"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 pb-10">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <h2 className="text-3xl font-semibold text-slate-800">コンプライアンス管理</h2>

      <Card title="📋 コンプライアンス概況">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-blue-50 rounded text-center"><h4 className="text-sm text-blue-700">全体遵守状況</h4><p className="text-2xl font-bold text-blue-600">{overallComplianceSummary.rate}</p></div>
          <div className="p-3 bg-red-50 rounded text-center"><h4 className="text-sm text-red-700">未達事項数</h4><p className="text-2xl font-bold text-red-600">{overallComplianceSummary.nonCompliantCount}</p></div>
          <div className="p-3 bg-yellow-50 rounded text-center"><h4 className="text-sm text-yellow-700">コンプライアンススコア</h4><p className="text-2xl font-bold text-yellow-600">算出中...</p></div>
        </div>
        {upcomingDeadlines.length > 0 && 
          <div className="mt-4"><h4 className="font-semibold text-orange-600">重要な期限・締切アラート (今後30日以内)</h4>
            <ul className="text-sm list-disc list-inside text-orange-500">
              {upcomingDeadlines.slice(0,3).map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>}
        <p className="text-xs text-slate-500 mt-2 italic">最新の規制変更通知（法令・基準の改正情報）: 外部フィードと連携してここに表示されます。</p>
      </Card>

      <Card title="📊 規制・基準別遵守状況 (コンプライアンス統制一覧)">
        <div className="flex justify-end mb-2">
            {user?.role === UserRole.ADMIN && <Button onClick={() => handleOpenControlModal()} size="sm">新規統制登録</Button>}
        </div>
        {controls.length > 0 ? 
            <Table<ComplianceControl> columns={controlColumns} data={controls} onRowClick={handleOpenControlModal}/> : 
            <p className="text-slate-500 italic">登録されているコンプライアンス統制はありません。</p>
        }
      </Card>
      
      <Card title="🔍 監査・評価管理">
        <h4 className="text-md font-semibold text-slate-700 mb-1">監査スケジュール</h4>
        {audits.length > 0 ? 
            <Table<ComplianceAudit> columns={auditColumns} data={audits} /> :
            <p className="text-slate-500 italic text-sm">監査スケジュールはありません。</p>}
        <p className="text-xs text-slate-500 mt-2 italic">監査指摘事項、是正措置進捗(CAP)は各監査詳細に紐づけて管理されます。</p>
      </Card>

      <Card title="📈 リスク・ギャップ分析">
        <h4 className="text-md font-semibold text-slate-700 mb-1">コンプライアンスリスク評価</h4>
        {riskItems.length > 0 ? 
            <Table<ComplianceRiskItem> columns={riskColumns} data={riskItems} /> :
            <p className="text-slate-500 italic text-sm">登録されているコンプライアンスリスクはありません。</p>}
        <p className="text-xs text-slate-500 mt-2 italic">ギャップ分析結果、非遵守リスク、優先対応事項は詳細なアセスメントに基づいてここに表示されます。</p>
      </Card>
      
      {/* Placeholder Sections */}
      <Card title="📑 文書・証跡管理"><p className="text-sm text-slate-500 italic">ポリシー・手順書一覧、証跡・エビデンス管理、文書更新履歴、記録保管期間管理などの情報がここに表示されます。</p></Card>
      <Card title="🎯 教育・研修管理"><p className="text-sm text-slate-500 italic">コンプライアンス研修実施状況、資格・認定管理、意識調査結果、教育効果測定などの情報がここに表示されます。</p></Card>
      
      <Card title="⚙️ クイックアクション">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsEmergencyProcedureModalOpen)}>緊急対応手順</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsAuditChecklistModalOpen)}>監査準備リスト</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsReportModalOpen)}>レポート生成</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsCapModalOpen)}>是正措置計画作成</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsRegulationImpactModalOpen)}>規制変更影響評価</Button>
        </div>
      </Card>

       {/* Other Placeholder Sections ... */}
      <Card title="🔄 プロセス・統制管理"><p className="text-sm text-slate-500 italic">内部統制評価、業務プロセス適合性、承認・決裁プロセス、変更管理統制に関する情報。</p></Card>
      <Card title="📊 報告・レポーティング"><p className="text-sm text-slate-500 italic">規制当局向け報告、経営層向けレポート、ステークホルダー報告、公開情報管理。</p></Card>
      <Card title="⚖️ 法務・契約管理"><p className="text-sm text-slate-500 italic">契約コンプライアンス、知的財産権管理、労働法令遵守、データ保護規制。</p></Card>
      <Card title="🚨 インシデント・違反管理"><p className="text-sm text-slate-500 italic">コンプライアンス違反事例、インシデント対応状況、制裁・ペナルティ管理、再発防止策。</p></Card>
      <Card title="🔐 データガバナンス"><p className="text-sm text-slate-500 italic">データ分類・保護レベル、データ品質管理、データアクセス制御、データライフサイクル管理。</p></Card>
      <Card title="🌐 サプライチェーン・第三者管理"><p className="text-sm text-slate-500 italic">ベンダーコンプライアンス評価、サプライチェーンリスク、第三者認証確認、契約先モニタリング。</p></Card>
      <Card title="📋 改善・最適化"><p className="text-sm text-slate-500 italic">継続的改善計画（PDCA）、ベストプラクティス共有、ベンチマーク比較、自動化・効率化提案。</p></Card>
      <Card title="📅 スケジュール・タスク管理"><p className="text-sm text-slate-500 italic">コンプライアンスカレンダー、締切タスク一覧、定期レビュースケジュール、更新・見直し予定。</p></Card>


      {/* Control Add/Edit Modal */}
      {editingControl && (
        <Modal isOpen={isControlModalOpen} onClose={handleCloseControlModal} title={editingControl.id ? '統制編集' : '新規統制登録'} size="xl">
          <form onSubmit={handleControlSubmit} className="space-y-3 max-h-[80vh] overflow-y-auto p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="統制ID" name="controlId" value={editingControl.controlId || ''} onChange={handleControlInputChange} required />
                <Input label="統制名" name="name" value={editingControl.name || ''} onChange={handleControlInputChange} required />
            </div>
            <Textarea label="説明" name="description" value={editingControl.description || ''} onChange={handleControlInputChange} required rows={2}/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select label="基準/フレームワーク" name="standard" value={editingControl.standard || 'ISO 27001'} onChange={handleControlInputChange} options={controlStandards.map(s => ({value: s, label: s}))} required/>
                <Select label="カテゴリ" name="category" value={editingControl.category || 'その他'} onChange={handleControlInputChange} options={controlCategories.map(c => ({value: c, label: c}))} required/>
            </div>
            <Select label="ステータス" name="status" value={editingControl.status || ItemStatus.IN_REVIEW} onChange={handleControlInputChange} options={controlStatuses.map(s => ({value: s, label: itemStatusToJapanese(s)}))} required/>
            <Input label="担当チーム" name="responsibleTeam" value={editingControl.responsibleTeam || ''} onChange={handleControlInputChange} />
            <Input label="証跡リンク (カンマ区切り)" name="evidenceLinks" value={editingControl.evidenceLinks?.join(', ') || ''} onChange={handleControlInputChange} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="最終監査日" name="lastAuditDate" type="date" value={editingControl.lastAuditDate || ''} onChange={handleControlInputChange} />
                <Input label="次回監査予定日" name="nextAuditDate" type="date" value={editingControl.nextAuditDate || ''} onChange={handleControlInputChange} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select label="リスクレベル (非準拠時)" name="riskLevel" value={editingControl.riskLevel || ''} onChange={handleControlInputChange} options={[{value:'', label:'N/A'}, ...riskLevelsForSelect.map(r => ({value: r, label: complianceRiskLevelToJapanese(r)}))]} />
                <Select label="是正措置計画(CAP)ステータス" name="capStatus" value={editingControl.capStatus || ''} onChange={handleControlInputChange} options={[{value:'', label:'N/A'}, ...capStatusesForSelect.map(s => ({value: s, label: itemStatusToJapanese(s)}))]} />
            </div>
            <Textarea label="備考" name="notes" value={editingControl.notes || ''} onChange={handleControlInputChange} rows={2}/>
            <div className="flex justify-end space-x-2 pt-2"><Button type="button" variant="ghost" onClick={handleCloseControlModal}>キャンセル</Button><Button type="submit" variant="primary">{editingControl.id ? '更新' : '登録'}</Button></div>
          </form>
        </Modal>
      )}

      {/* Quick Action Modals */}
      <Modal isOpen={isEmergencyProcedureModalOpen} onClose={() => setIsEmergencyProcedureModalOpen(false)} title="緊急時対応手順参照" size="md">
        <p className="text-sm text-slate-700 mb-2">コンプライアンス違反発覚時の初動対応手順や関連文書へのリンクを表示します。</p>
        <Textarea value="例: 1. 状況把握と影響範囲の特定。2.法務部門への報告。3.関連部署への連絡。4.証拠保全..." readOnly rows={5} />
        <div className="flex justify-end pt-3"><Button onClick={() => setIsEmergencyProcedureModalOpen(false)}>閉じる</Button></div>
      </Modal>

      <Modal isOpen={isAuditChecklistModalOpen} onClose={() => setIsAuditChecklistModalOpen(false)} title="監査準備チェックリスト参照" size="md">
        <p className="text-sm text-slate-700 mb-2">監査前に確認すべき項目や準備資料のリストを表示します。</p>
        <ul className="list-disc list-inside text-sm"><li>ポリシー文書の最新版確認</li><li>アクセスログの収集</li><li>従業員への周知</li></ul>
        <div className="flex justify-end pt-3"><Button onClick={() => setIsAuditChecklistModalOpen(false)}>閉じる</Button></div>
      </Modal>
      
      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="コンプライアンスレポート生成" size="md">
        <form onSubmit={(e) => {e.preventDefault(); handleGenericQuickAction("レポート生成", `レポートタイプ: ${quickActionFormData.reportType}, 期間: ${quickActionFormData.reportPeriodStart}～${quickActionFormData.reportPeriodEnd}`, () => setIsReportModalOpen(false));}} className="space-y-3">
            <Select label="レポートタイプ" name="reportType" value={quickActionFormData.reportType || ''} onChange={handleQuickActionFormChange} options={[{value:'overall', label:'全体遵守状況'}, {value:'audit_summary', label:'監査結果サマリー'}]} required />
            <Input label="期間 (開始)" name="reportPeriodStart" type="date" value={quickActionFormData.reportPeriodStart || ''} onChange={handleQuickActionFormChange} />
            <Input label="期間 (終了)" name="reportPeriodEnd" type="date" value={quickActionFormData.reportPeriodEnd || ''} onChange={handleQuickActionFormChange} />
            <div className="flex justify-end pt-2"><Button type="submit" variant="primary">生成 (シミュレーション)</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isCapModalOpen} onClose={() => setIsCapModalOpen(false)} title="是正措置計画(CAP)作成" size="lg">
        <form onSubmit={(e) => {e.preventDefault(); handleGenericQuickAction("是正措置計画作成", `対象統制ID: ${quickActionFormData.capControlId}, 内容: ${quickActionFormData.capDescription}, 期限: ${quickActionFormData.capDueDate}, 担当: ${quickActionFormData.capAssignee}`, () => setIsCapModalOpen(false));}} className="space-y-3">
            <Input label="対象統制ID" name="capControlId" value={quickActionFormData.capControlId || ''} onChange={handleQuickActionFormChange} required placeholder="例: CMP003" />
            <Textarea label="是正措置内容" name="capDescription" value={quickActionFormData.capDescription || ''} onChange={handleQuickActionFormChange} required rows={3}/>
            <Input label="対応期限" name="capDueDate" type="date" value={quickActionFormData.capDueDate || ''} onChange={handleQuickActionFormChange} required />
            <Input label="担当者/チーム" name="capAssignee" value={quickActionFormData.capAssignee || ''} onChange={handleQuickActionFormChange} required />
            <div className="flex justify-end pt-2"><Button type="submit" variant="primary">計画作成 (シミュレーション)</Button></div>
        </form>
      </Modal>
      
      <Modal isOpen={isRegulationImpactModalOpen} onClose={() => setIsRegulationImpactModalOpen(false)} title="規制変更影響評価" size="lg">
        <form onSubmit={(e) => {e.preventDefault(); handleGenericQuickAction("規制変更影響評価", `規制名: ${quickActionFormData.regulationName}, 変更概要: ${quickActionFormData.regulationChangeSummary}, 影響: ${quickActionFormData.potentialImpact}`, () => setIsRegulationImpactModalOpen(false));}} className="space-y-3">
            <Input label="規制/基準名" name="regulationName" value={quickActionFormData.regulationName || ''} onChange={handleQuickActionFormChange} required />
            <Textarea label="変更概要" name="regulationChangeSummary" value={quickActionFormData.regulationChangeSummary || ''} onChange={handleQuickActionFormChange} required rows={3}/>
            <Textarea label="自社への潜在的影響" name="potentialImpact" value={quickActionFormData.potentialImpact || ''} onChange={handleQuickActionFormChange} required rows={3}/>
            <div className="flex justify-end pt-2"><Button type="submit" variant="primary">評価開始 (シミュレーション)</Button></div>
        </form>
      </Modal>

    </div>
  );
};

export default ComplianceManagementPage;
