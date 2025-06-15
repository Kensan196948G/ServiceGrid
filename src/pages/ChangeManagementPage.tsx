
import * as React from 'react';
const { useState, useEffect, useCallback, useMemo } = React;
type ReactNode = React.ReactNode;
import { ChangeRequest, ItemStatus, Priority, UserRole } from '../types';
import * as changeApi from '../services/changeApiService';
import { Button, Table, Modal, Input, Textarea, Select, Spinner, Card, Notification, NotificationType } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { itemStatusToJapanese, priorityToJapanese, impactUrgencyRiskToJapanese } from '../localization';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from '../components/ChartPlaceholder';

const ChangeManagementPage: React.FC = () => {
  const [allChangeRequests, setAllChangeRequests] = useState<ChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Partial<ChangeRequest> | null>(null);
  const { user } = useAuth();
  const { addToast } = useToast();

  const priorities: Priority[] = ['Low', 'Medium', 'High', 'Critical'];
  const impacts: Array<ChangeRequest['impact']> = ['Low', 'Medium', 'High'];
  const categories = ['サーバー', 'ネットワーク', 'アプリケーション', 'データベース', 'セキュリティ', 'その他'];
  
  // Statuses for the main list and modal (more comprehensive)
  const allStatuses = Object.values(ItemStatus).filter(s => 
    // Filter out statuses that might not be directly set or are too specific for a general dropdown
    ![ItemStatus.PLANNED, ItemStatus.BUILDING, ItemStatus.TESTING, ItemStatus.DEPLOYED, ItemStatus.ROLLED_BACK, 
      ItemStatus.ANALYSIS, ItemStatus.SOLUTION_PROPOSED, ItemStatus.IDENTIFIED, ItemStatus.MITIGATED,
      ItemStatus.COMPLIANT, ItemStatus.NON_COMPLIANT, ItemStatus.IN_REVIEW, ItemStatus.NOT_APPLICABLE].includes(s)
  );


  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>(''); // YYYY-MM-DD

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const itemsPerPageOptions = [
    { value: 10, label: '10件' },
    { value: 25, label: '25件' },
    { value: 50, label: '50件' },
    { value: 100, label: '100件' },
  ];


  const fetchChangeRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await changeApi.getChanges();
      setAllChangeRequests(data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error("変更リクエストの読み込みに失敗:", error);
      addToast('変更リクエストの読み込みに失敗しました。', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchChangeRequests();
  }, [fetchChangeRequests]);
  
  const statusOptionsForFilter = useMemo(() => [
    { value: '', label: 'すべてのステータス' },
    ...allStatuses.map(s => ({ value: s, label: itemStatusToJapanese(s) }))
  ], [allStatuses]);

  const categoryOptionsForFilter = useMemo(() => [
    { value: '', label: 'すべてのカテゴリ' },
    ...categories.map(c => ({ value: c, label: c }))
  ], [categories]);


  const clearFilters = () => {
    setStatusFilter('');
    setCategoryFilter('');
    setDateFilter('');
    setCurrentPage(1);
  };

  const filteredChangeRequests = useMemo(() => {
    let filtered = [...allChangeRequests];
    if (statusFilter) filtered = filtered.filter(req => req.status === statusFilter);
    if (categoryFilter) filtered = filtered.filter(req => req.category === categoryFilter);
    if (dateFilter) filtered = filtered.filter(req => req.createdAt.startsWith(dateFilter));
    return filtered;
  }, [allChangeRequests, statusFilter, categoryFilter, dateFilter]);

  const paginatedChangeRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredChangeRequests.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredChangeRequests, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(filteredChangeRequests.length / itemsPerPage);

  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); 
  };

  // Summary Stats
  const pendingApprovalCount = useMemo(() => allChangeRequests.filter(cr => cr.status === ItemStatus.PENDING_APPROVAL).length, [allChangeRequests]);
  const scheduledCount = useMemo(() => allChangeRequests.filter(cr => cr.status === ItemStatus.SCHEDULED || cr.status === ItemStatus.APPROVED).length, [allChangeRequests]); // Approved might also be considered scheduled
  const completedCount = useMemo(() => allChangeRequests.filter(cr => cr.status === ItemStatus.IMPLEMENTED || cr.status === ItemStatus.CLOSED).length, [allChangeRequests]);
  const highRiskCount = useMemo(() => allChangeRequests.filter(cr => cr.risk === 'High' && cr.status !== ItemStatus.CLOSED && cr.status !== ItemStatus.REJECTED).length, [allChangeRequests]);

  // Change Calendar Data (Upcoming 7 days)
  const upcomingChanges = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);

    return allChangeRequests
      .filter(cr => {
        const startDate = new Date(cr.plannedStartDate);
        return startDate >= today && startDate <= sevenDaysLater && (cr.status === ItemStatus.SCHEDULED || cr.status === ItemStatus.APPROVED);
      })
      .sort((a,b) => new Date(a.plannedStartDate).getTime() - new Date(b.plannedStartDate).getTime());
  }, [allChangeRequests]);

  // Approval Workflow Data
  const approvalWorkflowItems = useMemo(() => {
    return allChangeRequests.filter(cr => cr.status === ItemStatus.PENDING_APPROVAL);
  }, [allChangeRequests]);

  // Risk Distribution Data
  const riskDistributionData = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0 };
    allChangeRequests.forEach(cr => {
      if(cr.status !== ItemStatus.CLOSED && cr.status !== ItemStatus.REJECTED) { // Exclude closed/rejected
        counts[cr.risk] = (counts[cr.risk] || 0) + 1;
      }
    });
    return [
      { name: '低リスク', value: counts.Low, fill: '#34D399' }, // Green
      { name: '中リスク', value: counts.Medium, fill: '#FBBF24' }, // Yellow
      { name: '高リスク', value: counts.High, fill: '#F87171' },   // Red
    ].filter(d => d.value > 0);
  }, [allChangeRequests]);


  const handleOpenModal = (request?: ChangeRequest) => {
    setEditingRequest(request ? { ...request } : { 
      title: '', 
      description: '', 
      priority: 'Medium', 
      status: ItemStatus.NEW, 
      category: 'その他',
      impact: 'Medium',
      urgency: 'Medium',
      risk: 'Medium',
      implementationPlan: '',
      backoutPlan: '',
      plannedStartDate: new Date().toISOString().split('T')[0],
      plannedEndDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      deadline: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], // Default deadline 5 days from now
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRequest(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (editingRequest) {
      const { name, value } = e.target;
       if (name === "plannedStartDate" || name === "plannedEndDate" || name === "deadline") {
        setEditingRequest({ ...editingRequest, [name]: value ? new Date(value).toISOString() : undefined });
      } else {
        setEditingRequest({ ...editingRequest, [name]: value });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest || !user) return;

    try {
      const requestToSave = {
        ...editingRequest,
        requester: editingRequest.requester || user.username,
        plannedStartDate: editingRequest.plannedStartDate ? new Date(editingRequest.plannedStartDate).toISOString() : new Date().toISOString(),
        plannedEndDate: editingRequest.plannedEndDate ? new Date(editingRequest.plannedEndDate).toISOString() : new Date().toISOString(),
        deadline: editingRequest.deadline ? new Date(editingRequest.deadline).toISOString() : undefined,
      } as ChangeRequest;


      if (editingRequest.id) {
        await changeApi.updateChange(editingRequest.id, requestToSave);
        addToast('変更リクエストが正常に更新されました。', 'success');
      } else {
        const newRequestData = {
            ...requestToSave,
            requester: requestToSave.requester || user.username 
        } as Omit<ChangeRequest, 'id'|'createdAt'|'updatedAt'>;
        await changeApi.createChange(newRequestData);
        addToast('変更リクエストが正常に作成されました。', 'success');
      }
      fetchChangeRequests();
      handleCloseModal();
    } catch (error) {
      console.error("変更リクエストの保存に失敗:", error);
      addToast('変更リクエストの保存に失敗しました。', 'error');
    }
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm('この変更リクエストを削除してもよろしいですか？')) {
      try {
        await changeApi.deleteChange(id);
        addToast('変更リクエストが正常に削除されました。', 'success');
        fetchChangeRequests();
      } catch (error) {
        console.error("Failed to delete change request:", error);
        addToast('変更リクエストの削除に失敗しました。', 'error');
      }
    }
  };

  const handleApprove = async (id: string) => {
    if (!user) return;
    try {
      await changeApi.approveChange(id, user.username);
      addToast('変更リクエストが承認されました。', 'success');
      fetchChangeRequests();
    } catch (error: any) {
      addToast(`承認処理に失敗: ${error.message}`, 'error');
    }
  };

  const handleReject = async (id: string) => {
    if (!user) return;
    const reason = prompt("却下理由を入力してください（任意）:");
    // User might cancel the prompt, in which case reason is null
    if (reason === null) { // Check for null explicitly for cancel
      return; // User cancelled
    }
    try {
      await changeApi.rejectChange(id, user.username, reason || "理由未記入");
      addToast('変更リクエストが却下されました。', 'success');
      fetchChangeRequests();
    } catch (error: any) {
      addToast(`却下処理に失敗: ${error.message}`, 'error');
    }
  };


  const mainListColumns: Array<{ Header: string; accessor: keyof ChangeRequest | ((row: ChangeRequest) => ReactNode) }> = [
    { Header: 'ID', accessor: (row) => <span className="font-mono text-xs">{row.id.slice(0,8)}...</span> },
    { Header: 'タイトル', accessor: 'title' },
    { Header: 'ステータス', accessor: (row) => itemStatusToJapanese(row.status) },
    { Header: 'リスク', accessor: (row) => <span className={`${row.risk === 'High' ? 'text-red-600 font-semibold' : row.risk === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>{impactUrgencyRiskToJapanese(row.risk)}</span> },
    { Header: 'カテゴリ', accessor: 'category' },
    { Header: '要求者', accessor: 'requester' },
    { Header: '計画開始日', accessor: (row) => new Date(row.plannedStartDate).toLocaleDateString() },
    { Header: '操作', accessor: (row) => (
      <div className="flex items-center space-x-2">
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenModal(row);}}>詳細/編集</Button>
        {user?.role === UserRole.ADMIN && <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(row.id);}}>削除</Button>}
      </div>
    )},
  ];
  
  const approvalWorkflowColumns: Array<{ Header: string; accessor: keyof ChangeRequest | ((row: ChangeRequest) => ReactNode) }> = [
    { Header: 'ID', accessor: (row) => <span className="font-mono text-xs" title={row.id}>{row.id.slice(0,8)}...</span> },
    { Header: 'タイトル', accessor: 'title' },
    { Header: '申請者', accessor: 'requester' },
    { Header: '申請日', accessor: (row) => new Date(row.createdAt).toLocaleDateString() },
    { Header: '承認期限', accessor: (row) => row.deadline ? new Date(row.deadline).toLocaleDateString() : 'N/A' },
    { Header: 'ステータス', accessor: (row) => itemStatusToJapanese(row.status) },
    { Header: 'アクション', accessor: (row) => (
        user?.role === UserRole.ADMIN && row.status === ItemStatus.PENDING_APPROVAL ? (
            <div className="flex items-center space-x-1">
                <Button size="sm" variant="primary" onClick={() => handleApprove(row.id)}>承認</Button>
                <Button size="sm" variant="danger" onClick={() => handleReject(row.id)}>却下</Button>
            </div>
        ) : '-'
    )},
  ];


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-slate-800">変更管理</h2>
        <Button onClick={() => handleOpenModal()}>新規リクエスト作成</Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="承認待ち" className="text-center"><p className="text-3xl font-bold text-blue-600">{pendingApprovalCount}件</p></Card>
        <Card title="実装予定" className="text-center"><p className="text-3xl font-bold text-purple-600">{scheduledCount}件</p></Card>
        <Card title="完了" className="text-center"><p className="text-3xl font-bold text-green-600">{completedCount}件</p></Card>
        <Card title="高リスク変更 (未完了)" className="text-center"><p className="text-3xl font-bold text-red-600">{highRiskCount}件</p></Card>
      </div>

      {/* Filters */}
      <Card title="変更リクエストフィルター">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
          <Select label="ステータス" value={statusFilter} onChange={e => {setStatusFilter(e.target.value); setCurrentPage(1);}} options={statusOptionsForFilter} />
          <Select label="カテゴリ" value={categoryFilter} onChange={e => {setCategoryFilter(e.target.value); setCurrentPage(1);}} options={categoryOptionsForFilter} />
          <Input label="作成日" type="date" value={dateFilter} onChange={e => {setDateFilter(e.target.value); setCurrentPage(1);}} />
          <div className="flex items-end">
            <Button onClick={clearFilters} variant="secondary" className="w-full">フィルタークリア</Button>
          </div>
        </div>
      </Card>

      {/* Main Change Request List */}
      <Card title="変更リクエスト一覧">
        {isLoading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> : 
        paginatedChangeRequests.length > 0 ? (
          <>
            <Table<ChangeRequest> columns={mainListColumns} data={paginatedChangeRequests} onRowClick={handleOpenModal}/>
            <div className="flex flex-col md:flex-row justify-between items-center p-4 border-t border-slate-200">
                <div className="mb-2 md:mb-0">
                <Select
                    label="表示件数:"
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    options={itemsPerPageOptions}
                    className="inline-block w-auto"
                />
                <span className="ml-2 text-sm text-slate-600">
                    {filteredChangeRequests.length}件中 {Math.min((currentPage - 1) * itemsPerPage + 1, filteredChangeRequests.length)}-{Math.min(currentPage * itemsPerPage, filteredChangeRequests.length)}件表示
                </span>
                </div>
                <div className="flex items-center space-x-2">
                <Button onClick={handlePrevPage} disabled={currentPage === 1} size="sm">前へ</Button>
                <span className="text-sm text-slate-700">ページ {currentPage} / {totalPages || 1}</span>
                <Button onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0} size="sm">次へ</Button>
                </div>
            </div>
          </>
        ) : (
          <p className="p-4 text-slate-500 italic">条件に一致する変更リクエストはありません。</p>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change Calendar */}
        <Card title="変更カレンダー (今後7日間)">
          {isLoading ? <Spinner /> : upcomingChanges.length > 0 ? (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {upcomingChanges.map(cr => (
                <li key={cr.id} className="p-2 bg-slate-50 rounded-md shadow-sm hover:bg-slate-100 cursor-pointer" onClick={() => handleOpenModal(cr)}>
                  <p className="font-semibold text-sm text-blue-700">{cr.title}</p>
                  <p className="text-xs text-slate-600">
                    計画日: {new Date(cr.plannedStartDate).toLocaleDateString()} | リスク: {impactUrgencyRiskToJapanese(cr.risk)} | ID: {cr.id.slice(0,8)}...
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 italic">今後7日間に計画されている変更はありません。</p>
          )}
        </Card>

        {/* Change Risk Assessment */}
        <Card title="変更リスク評価">
            <h4 className="text-md font-semibold text-slate-700 mb-2">リスク分布 (未完了の変更)</h4>
            {isLoading ? <Spinner /> : riskDistributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                        <Pie data={riskDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {riskDistributionData.map((entry) => <Cell key={`cell-${entry.name}`} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <p className="text-slate-500 italic text-sm">リスクデータがありません。</p>
            )}
            <h4 className="text-md font-semibold text-slate-700 mt-4 mb-2">リスク軽減策 (概要)</h4>
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
                高リスク変更に対しては、詳細な影響分析、段階的ロールアウト、専用監視体制、迅速なロールバック手順の確立などが推奨されます。
                個々の変更リクエスト内で具体的な軽減策を文書化してください。
            </p>
        </Card>
      </div>

      {/* Approval Workflow */}
      {user?.role === UserRole.ADMIN && (
        <Card title="承認ワークフロー (承認待ちの変更)">
          {isLoading ? <Spinner /> : approvalWorkflowItems.length > 0 ? (
            <Table<ChangeRequest> columns={approvalWorkflowColumns} data={approvalWorkflowItems} onRowClick={handleOpenModal} />
          ) : (
            <p className="text-slate-500 italic">現在、承認待ちの変更リクエストはありません。</p>
          )}
        </Card>
      )}
      

      {editingRequest && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingRequest.id ? '変更リクエスト編集' : '新規変更リクエスト作成'} size="xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="タイトル" name="title" value={editingRequest.title || ''} onChange={handleInputChange} required />
                <Select label="カテゴリ" name="category" value={editingRequest.category || 'その他'} onChange={handleInputChange} options={categories.map(c => ({value: c, label: c}))} required />
            </div>
            <Textarea label="説明" name="description" value={editingRequest.description || ''} onChange={handleInputChange} required rows={3}/>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select label="優先度" name="priority" value={editingRequest.priority || 'Medium'} onChange={handleInputChange} options={priorities.map(p => ({value: p, label: priorityToJapanese(p)}))} required/>
                <Select label="影響度" name="impact" value={editingRequest.impact || 'Medium'} onChange={handleInputChange} options={impacts.map(i => ({value: i, label: impactUrgencyRiskToJapanese(i)}))} required/>
                <Select label="緊急度" name="urgency" value={editingRequest.urgency || 'Medium'} onChange={handleInputChange} options={impacts.map(i => ({value: i, label: impactUrgencyRiskToJapanese(i)}))} required/>
            </div>
             <Select label="リスク" name="risk" value={editingRequest.risk || 'Medium'} onChange={handleInputChange} options={impacts.map(i => ({value: i, label: impactUrgencyRiskToJapanese(i)}))} required/>
            
            <Textarea label="実施計画" name="implementationPlan" value={editingRequest.implementationPlan || ''} onChange={handleInputChange} required rows={3}/>
            <Textarea label="バックアウト計画" name="backoutPlan" value={editingRequest.backoutPlan || ''} onChange={handleInputChange} required rows={3}/>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="計画開始日時" name="plannedStartDate" type="date" value={editingRequest.plannedStartDate ? new Date(editingRequest.plannedStartDate).toISOString().split('T')[0] : ''} onChange={handleInputChange} required />
                <Input label="計画終了日時" name="plannedEndDate" type="date" value={editingRequest.plannedEndDate ? new Date(editingRequest.plannedEndDate).toISOString().split('T')[0] : ''} onChange={handleInputChange} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="ステータス" name="status" value={editingRequest.status || ItemStatus.NEW} onChange={handleInputChange} options={allStatuses.map(s => ({value: s, label: itemStatusToJapanese(s)}))} required/>
              <Input label="承認期限 (任意)" name="deadline" type="date" value={editingRequest.deadline ? new Date(editingRequest.deadline).toISOString().split('T')[0] : ''} onChange={handleInputChange} />
            </div>
             <Input label="要求者" name="requester" value={editingRequest.requester || user?.username || ''} onChange={handleInputChange} disabled={!!editingRequest.id && !!editingRequest.requester} required />
             <Input label="担当者 (任意)" name="assignedTo" value={editingRequest.assignedTo || ''} onChange={handleInputChange} />


            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>キャンセル</Button>
              <Button type="submit" variant="primary">{editingRequest.id ? '更新' : '作成'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ChangeManagementPage;
