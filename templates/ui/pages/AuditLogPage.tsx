
import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { AuditLog, LogSourceStatus, LogStorageSummary, AuditLogQuickActionFormData } from '../types';
import { getAuditLogs, getLogSourceStatuses, getLogStorageSummary, addAuditLog } from '../services/mockItsmService';
import { Table, Spinner, Card, Input, Button, Modal, Notification, NotificationType, Select, Textarea } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';

const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logSourceStatuses, setLogSourceStatuses] = useState<LogSourceStatus[]>([]);
  const [logStorageSummary, setLogStorageSummary] = useState<LogStorageSummary | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const { user } = useAuth();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateStartFilter, setDateStartFilter] = useState('');
  const [dateEndFilter, setDateEndFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const itemsPerPageOptions = [
    { value: 10, label: '10件' }, { value: 25, label: '25件' },
    { value: 50, label: '50件' }, { value: 100, label: '100件' }
  ];
  
  // Quick Action Modals State
  const [isEmergencyPreserveModalOpen, setIsEmergencyPreserveModalOpen] = useState(false);
  const [isAuditReportModalOpen, setIsAuditReportModalOpen] = useState(false);
  const [isInvestigateLogModalOpen, setIsInvestigateLogModalOpen] = useState(false);
  const [isStopCollectionModalOpen, setIsStopCollectionModalOpen] = useState(false);
  const [isForensicModalOpen, setIsForensicModalOpen] = useState(false);
  const [quickActionFormData, setQuickActionFormData] = useState<AuditLogQuickActionFormData>({});


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [logsData, sourcesData, summaryData] = await Promise.all([
        getAuditLogs(),
        getLogSourceStatuses(),
        getLogStorageSummary()
      ]);
      setLogs(logsData); // Already sorted in service
      setLogSourceStatuses(sourcesData);
      setLogStorageSummary(summaryData);
    } catch (error) {
      console.error("監査ログ関連データの読み込みに失敗:", error);
      setNotification({ message: '監査ログ関連データの読み込みに失敗しました。', type: NotificationType.ERROR });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const uniqueUsers = useMemo(() => {
    const users = Array.from(new Set(logs.map(log => log.username))).sort();
    return [{ value: '', label: 'すべてのユーザー' }, ...users.map(u => ({ value: u, label: u }))];
  }, [logs]);

  const uniqueActions = useMemo(() => {
    const actions = Array.from(new Set(logs.map(log => log.action))).sort();
    return [{ value: '', label: 'すべてのアクション' }, ...actions.map(a => ({ value: a, label: a }))];
  }, [logs]);

  const clearFilters = () => {
    setSearchTerm(''); setUserFilter(''); setActionFilter('');
    setDateStartFilter(''); setDateEndFilter(''); setCurrentPage(1);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const logTimestamp = new Date(log.timestamp);
      const matchesSearch = searchTerm ? 
        log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userId.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      const matchesUser = userFilter ? log.username === userFilter : true;
      const matchesAction = actionFilter ? log.action === actionFilter : true;
      const matchesDateStart = dateStartFilter ? logTimestamp >= new Date(dateStartFilter) : true;
      const matchesDateEnd = dateEndFilter ? logTimestamp <= new Date(new Date(dateEndFilter).setHours(23,59,59,999)) : true; // Include full end day
      return matchesSearch && matchesUser && matchesAction && matchesDateStart && matchesDateEnd;
    });
  }, [logs, searchTerm, userFilter, actionFilter, dateStartFilter, dateEndFilter]);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  
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
    await addAuditLog({ userId: user.id, username: user.username, action: `監査ログ管理: ${actionName}`, details });
    setNotification({ message: `${actionName}が正常に実行されました（シミュレーション）。`, type: NotificationType.SUCCESS });
    modalCloseFn();
    setQuickActionFormData({});
  };

  const logTableColumns: Array<{ Header: string; accessor: keyof AuditLog | ((row: AuditLog) => ReactNode) }> = [
    { Header: '日時', accessor: (row: AuditLog) => new Date(row.timestamp).toLocaleString() },
    { Header: 'ユーザーID', accessor: 'userId' },
    { Header: 'ユーザー名', accessor: 'username' },
    { Header: 'アクション', accessor: 'action' },
    { Header: '詳細', accessor: (row: AuditLog) => <span title={row.details}>{row.details.substring(0, 100)}{row.details.length > 100 ? '...' : ''}</span> },
  ];

  const logSourceStatusColumns: Array<{ Header: string; accessor: keyof LogSourceStatus | ((row: LogSourceStatus) => ReactNode) }> = [
    { Header: 'システム名', accessor: 'systemName' },
    { Header: '収集レート(log/s)', accessor: 'collectionRate' },
    { Header: 'ステータス', accessor: (row) => <span className={`${row.status==='Error' ? 'text-red-500 font-bold': row.status==='Delayed' ? 'text-yellow-500' : 'text-green-500'}`}>{row.status}</span>},
    { Header: '最終ログ受信', accessor: (row) => new Date(row.lastLogReceived).toLocaleTimeString() },
    { Header: '欠損率(%)', accessor: (row) => row.missingLogsPercentage?.toFixed(1) ?? 'N/A'},
  ];

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 pb-10">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <h2 className="text-3xl font-semibold text-slate-800">各種監査証跡ログ管理</h2>
      
      <Card title="📊 ログ収集・管理概況">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h4 className="text-md font-semibold text-slate-700 mb-2">ログ収集状況サマリー</h4>
                {logSourceStatuses.length > 0 ? 
                    <Table<LogSourceStatus> columns={logSourceStatusColumns} data={logSourceStatuses.slice(0,3)} /> : // Show first 3
                    <p className="text-sm text-slate-500 italic">ログ収集状況データなし</p>}
            </div>
            <div>
                <h4 className="text-md font-semibold text-slate-700 mb-2">ログ容量使用状況</h4>
                {logStorageSummary ? (
                    <div className="space-y-1 text-sm p-3 bg-slate-50 rounded">
                        <p>総容量: {logStorageSummary.totalCapacityTB} TB</p>
                        <p>使用容量: {logStorageSummary.usedCapacityTB} TB ({((logStorageSummary.usedCapacityTB / logStorageSummary.totalCapacityTB) * 100).toFixed(1)}%)</p>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 my-1">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${(logStorageSummary.usedCapacityTB / logStorageSummary.totalCapacityTB) * 100}%`}}></div>
                        </div>
                        <p>残り保管期間: {logStorageSummary.remainingRetentionDays} 日</p>
                        <p>平均取込レート: {logStorageSummary.averageIngestRateMBps} MB/s</p>
                    </div>
                ) : <p className="text-sm text-slate-500 italic">ログ容量データなし</p>}
            </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 italic">リアルタイム収集ステータス（接続状況・遅延監視）、重要アラート（ログ収集停止・異常検知）は専用ダッシュボードで詳細確認。</p>
      </Card>

      <Card title="🔍 ログ検索・分析 (監査ログ一覧)">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border-b">
          <Input type="search" placeholder="キーワード検索 (ユーザーID, アクション, 詳細)..." value={searchTerm} onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}} label="キーワード"/>
          <Select label="ユーザー" value={userFilter} onChange={e => {setUserFilter(e.target.value); setCurrentPage(1);}} options={uniqueUsers} />
          <Select label="アクションタイプ" value={actionFilter} onChange={e => {setActionFilter(e.target.value); setCurrentPage(1);}} options={uniqueActions} />
          <Input label="日付範囲 (開始)" type="date" value={dateStartFilter} onChange={e => {setDateStartFilter(e.target.value); setCurrentPage(1);}} />
          <Input label="日付範囲 (終了)" type="date" value={dateEndFilter} onChange={e => {setDateEndFilter(e.target.value); setCurrentPage(1);}} />
          <div className="flex items-end"><Button onClick={clearFilters} variant="secondary" className="w-full">フィルタークリア</Button></div>
        </div>
        {paginatedLogs.length > 0 ? (
          <>
            <Table<AuditLog> columns={logTableColumns} data={paginatedLogs} />
            <div className="flex flex-col md:flex-row justify-between items-center p-4 border-t">
              <div className="mb-2 md:mb-0">
                <Select label="表示件数:" value={itemsPerPage} onChange={e => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}} options={itemsPerPageOptions} className="inline-block w-auto" />
                <span className="ml-2 text-sm text-slate-600">{filteredLogs.length}件中 {Math.min((currentPage - 1) * itemsPerPage + 1, filteredLogs.length)}-{Math.min(currentPage * itemsPerPage, filteredLogs.length)}件表示</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={currentPage === 1} size="sm">前へ</Button>
                <span className="text-sm">ページ {currentPage} / {totalPages || 1}</span>
                <Button onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p+1))} disabled={currentPage === totalPages || totalPages === 0} size="sm">次へ</Button>
              </div>
            </div>
          </>
        ) : <p className="p-4 text-slate-500 italic">条件に一致する監査ログはありません。</p>}
        <p className="text-xs text-slate-500 mt-3 p-4 italic">ログ分析ダッシュボード（トレンド・パターン分析）、異常検知結果（機械学習・AIによる）、相関分析結果（複数ログソース間）は高度分析ツールと連携して提供されます。</p>
      </Card>

      {/* Placeholder Sections */}
      <Card title="⚖️ 監査・コンプライアンス対応"><p className="text-sm text-slate-500 italic">監査証跡完全性（改竄検知・ハッシュ値検証）、法的要件対応状況、監査人アクセス管理、証跡レポート生成機能などがここに表示されます。</p></Card>
      <Card title="📋 ログカテゴリ別管理"><p className="text-sm text-slate-500 italic">システムログ、セキュリティログ、アプリケーションログなど、カテゴリ別の詳細ビューや管理機能が提供されます。（現在は上記の統合検索フィルターをご利用ください）</p></Card>
      
      <Card title="⚙️ クイックアクション">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsEmergencyPreserveModalOpen)}>緊急ログ保全</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsAuditReportModalOpen)}>監査レポート生成</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsInvestigateLogModalOpen)}>異常ログ詳細調査</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsStopCollectionModalOpen)}>ログ収集緊急停止</Button>
          <Button variant="secondary" onClick={() => openQuickActionModal(setIsForensicModalOpen)}>フォレンジック調査</Button>
        </div>
      </Card>
      
      {/* More Placeholder Sections */}
      <Card title="🔐 アクセス制御・権限管理"><p className="text-sm text-slate-500 italic">ログアクセス権限設定、管理者操作ログ、ログ閲覧履歴、データマスキング状況。</p></Card>
      <Card title="📈 保管・アーカイブ管理"><p className="text-sm text-slate-500 italic">ログ保管期間管理、アーカイブ状況、ストレージ階層管理、バックアップ・リストア。</p></Card>
      <Card title="🔄 ログライフサイクル管理"><p className="text-sm text-slate-500 italic">収集→保管→分析→廃棄の管理、自動廃棄スケジュール、データ分類・タグ付け。</p></Card>
      <Card title="🚨 インシデント・フォレンジック対応"><p className="text-sm text-slate-500 italic">セキュリティインシデント調査、フォレンジック用データ抽出、チェーン・オブ・カストディ。</p></Card>
      <Card title="📊 パフォーマンス・品質管理"><p className="text-sm text-slate-500 italic">ログ収集パフォーマンス、データ品質評価、重複データ検知、ログ正規化状況。</p></Card>
      <Card title="🔧 システム統合・連携"><p className="text-sm text-slate-500 italic">SIEM連携、IT監視ツール連携、BI・分析ツール連携、API連携管理。</p></Card>
      <Card title="📋 レポーティング・ダッシュボード (詳細)"><p className="text-sm text-slate-500 italic">定期監査レポート、リアルタイム監視ダッシュボード、コンプライアンスレポート、統計・トレンド分析。</p></Card>
      <Card title="⚙️ 自動化・効率化"><p className="text-sm text-slate-500 italic">ログ収集自動化、アラート自動通知、レポート自動生成、ワークフロー連携。</p></Card>
      <Card title="🔍 検索・クエリ管理"><p className="text-sm text-slate-500 italic">保存済みクエリ、検索履歴、クエリ性能最適化、検索権限制御。</p></Card>
      <Card title="🛠️ 設定・メンテナンス"><p className="text-sm text-slate-500 italic">ログ収集設定管理、パーサー・フィルター設定、アラート閾値設定、システムヘルスチェック。</p></Card>

      {/* Quick Action Modals */}
      <Modal isOpen={isEmergencyPreserveModalOpen} onClose={() => setIsEmergencyPreserveModalOpen(false)} title="緊急ログ保全" size="md">
        <form onSubmit={(e) => {e.preventDefault(); handleGenericQuickAction("緊急ログ保全", `対象ログID/範囲: ${quickActionFormData.logIds?.join(',') || '全システム'}, 理由: ${quickActionFormData.reason}`, () => setIsEmergencyPreserveModalOpen(false));}} className="space-y-3">
            <Input label="保全対象ログ (IDまたは範囲、任意)" name="logIds" value={quickActionFormData.logIds?.join(',') || ''} onChange={(e) => setQuickActionFormData(prev => ({...prev, logIds: e.target.value.split(',').map(s=>s.trim())}))} />
            <Textarea label="保全理由" name="reason" value={quickActionFormData.reason || ''} onChange={handleQuickActionFormChange} required rows={3}/>
            <div className="flex justify-end pt-2"><Button type="submit" variant="danger">実行 (シミュレーション)</Button></div>
        </form>
      </Modal>
      <Modal isOpen={isAuditReportModalOpen} onClose={() => setIsAuditReportModalOpen(false)} title="監査レポート即時生成" size="md">
        <form onSubmit={(e) => {e.preventDefault(); handleGenericQuickAction("監査レポート生成", `レポートタイプ: ${quickActionFormData.reportType}, 期間: ${quickActionFormData.reportPeriodStart}～${quickActionFormData.reportPeriodEnd}`, () => setIsAuditReportModalOpen(false));}} className="space-y-3">
            <Select label="レポートタイプ" name="reportType" value={quickActionFormData.reportType || ''} onChange={handleQuickActionFormChange} options={[{value:'access_summary', label:'アクセス概要'}, {value:'privileged_ops', label:'特権操作履歴'}]} required />
            <Input label="期間 (開始)" name="reportPeriodStart" type="date" value={quickActionFormData.reportPeriodStart || ''} onChange={handleQuickActionFormChange} />
            <Input label="期間 (終了)" name="reportPeriodEnd" type="date" value={quickActionFormData.reportPeriodEnd || ''} onChange={handleQuickActionFormChange} />
            <div className="flex justify-end pt-2"><Button type="submit" variant="primary">生成 (シミュレーション)</Button></div>
        </form>
      </Modal>
      <Modal isOpen={isInvestigateLogModalOpen} onClose={() => setIsInvestigateLogModalOpen(false)} title="異常ログ詳細調査" size="lg">
        <form onSubmit={(e) => {e.preventDefault(); handleGenericQuickAction("異常ログ詳細調査", `調査対象: ${quickActionFormData.investigationTarget}, 理由: ${quickActionFormData.reason}`, () => setIsInvestigateLogModalOpen(false));}} className="space-y-3">
            <Input label="調査対象 (ログID, ユーザーID, IP等)" name="investigationTarget" value={quickActionFormData.investigationTarget || ''} onChange={handleQuickActionFormChange} required />
            <Textarea label="調査理由/目的" name="reason" value={quickActionFormData.reason || ''} onChange={handleQuickActionFormChange} required rows={3}/>
            <p className="text-xs text-slate-500">（シミュレーション: 関連ログを抽出し、分析ツールへのエクスポートまたは詳細表示画面へ遷移します）</p>
            <div className="flex justify-end pt-2"><Button type="submit" variant="primary">調査開始 (シミュレーション)</Button></div>
        </form>
      </Modal>
      <Modal isOpen={isStopCollectionModalOpen} onClose={() => setIsStopCollectionModalOpen(false)} title="ログ収集緊急停止" size="md">
         <form onSubmit={(e) => {e.preventDefault(); handleGenericQuickAction("ログ収集緊急停止", `対象システム/ソース: ${quickActionFormData.investigationTarget}, 理由: ${quickActionFormData.reason}`, () => setIsStopCollectionModalOpen(false));}} className="space-y-3">
            <Input label="停止対象システム/ソース" name="investigationTarget" value={quickActionFormData.investigationTarget || ''} onChange={handleQuickActionFormChange} required placeholder="例: WebServer01, 全ファイアウォールログ"/>
            <Textarea label="停止理由" name="reason" value={quickActionFormData.reason || ''} onChange={handleQuickActionFormChange} required rows={3}/>
            <p className="text-xs text-red-600">警告: ログ収集を停止すると、監査証跡の欠損やインシデント調査に影響が出る可能性があります。</p>
            <div className="flex justify-end pt-2"><Button type="submit" variant="danger">停止実行 (シミュレーション)</Button></div>
        </form>
      </Modal>
      <Modal isOpen={isForensicModalOpen} onClose={() => setIsForensicModalOpen(false)} title="フォレンジック調査開始" size="lg">
        <form onSubmit={(e) => {e.preventDefault(); handleGenericQuickAction("フォレンジック調査開始", `調査対象: ${quickActionFormData.investigationTarget}, 概要: ${quickActionFormData.reason}`, () => setIsForensicModalOpen(false));}} className="space-y-3">
            <Input label="調査対象 (システム名, ユーザーID, データ範囲等)" name="investigationTarget" value={quickActionFormData.investigationTarget || ''} onChange={handleQuickActionFormChange} required />
            <Textarea label="調査概要/目的" name="reason" value={quickActionFormData.reason || ''} onChange={handleQuickActionFormChange} required rows={4}/>
            <p className="text-xs text-slate-500">（シミュレーション: 関連データの保全、専門チームへの通知、調査ツールの準備などを行います）</p>
            <div className="flex justify-end pt-2"><Button type="submit" variant="primary">調査開始 (シミュレーション)</Button></div>
        </form>
      </Modal>

    </div>
  );
};

export default AuditLogPage;
