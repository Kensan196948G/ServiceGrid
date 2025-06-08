
import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { Problem, ItemStatus, Priority, UserRole } from '../types';
import { getProblems, addProblem, updateProblem, deleteProblem } from '../services/mockItsmService';
import { Button, Table, Modal, Input, Textarea, Select, Spinner, Card, Notification, NotificationType } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { itemStatusToJapanese, priorityToJapanese, booleanToJapanese } from '../localization';

const ProblemManagementPage: React.FC = () => {
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Partial<Problem> | null>(null);
  const [selectedProblemForDetails, setSelectedProblemForDetails] = useState<Problem | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const { user } = useAuth();

  const problemStatusesOptions = [ItemStatus.NEW, ItemStatus.ANALYSIS, ItemStatus.SOLUTION_PROPOSED, ItemStatus.PENDING, ItemStatus.RESOLVED, ItemStatus.CLOSED];
  const prioritiesOptions: Priority[] = ['Low', 'Medium', 'High', 'Critical'];

  // Filters State
  const [idFilter, setIdFilter] = useState<string>('');
  const [titleFilter, setTitleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [relatedIncidentsFilter, setRelatedIncidentsFilter] = useState<string>('');
  const [knownErrorFilter, setKnownErrorFilter] = useState<string>(''); // 'all', 'true', 'false'

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const itemsPerPageOptions = [
    { value: 10, label: '10件' },
    { value: 25, label: '25件' },
    { value: 50, label: '50件' },
    { value: 100, label: '100件' },
  ];

  const fetchProblems = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getProblems();
      setAllProblems(data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error("問題の読み込みに失敗:", error);
      setNotification({ message: '問題の読み込みに失敗しました。', type: NotificationType.ERROR });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);
  
  // Filter options memoized
  const filterStatusOptions = useMemo(() => [
    { value: '', label: 'すべてのステータス' },
    ...problemStatusesOptions.map(s => ({ value: s, label: itemStatusToJapanese(s) }))
  ], [problemStatusesOptions]);

  const filterPriorityOptions = useMemo(() => [
    { value: '', label: 'すべての優先度' },
    ...prioritiesOptions.map(p => ({ value: p, label: priorityToJapanese(p) }))
  ], [prioritiesOptions]);
  
  const filterKnownErrorOptions = useMemo(() => [
    { value: '', label: 'すべて'},
    { value: 'true', label: 'はい'},
    { value: 'false', label: 'いいえ'},
  ], []);

  const clearFilters = () => {
    setIdFilter('');
    setTitleFilter('');
    setStatusFilter('');
    setPriorityFilter('');
    setRelatedIncidentsFilter('');
    setKnownErrorFilter('');
    setCurrentPage(1);
  };

  const filteredAndPaginatedProblems = useMemo(() => {
    let filtered = [...allProblems];

    if (idFilter) filtered = filtered.filter(p => p.id.toLowerCase().includes(idFilter.toLowerCase()));
    if (titleFilter) filtered = filtered.filter(p => p.title.toLowerCase().includes(titleFilter.toLowerCase()));
    if (statusFilter) filtered = filtered.filter(p => p.status === statusFilter);
    if (priorityFilter) filtered = filtered.filter(p => p.priority === priorityFilter);
    if (relatedIncidentsFilter) filtered = filtered.filter(p => p.relatedIncidents.some(incId => incId.toLowerCase().includes(relatedIncidentsFilter.toLowerCase())));
    if (knownErrorFilter) {
      const isKnown = knownErrorFilter === 'true';
      filtered = filtered.filter(p => p.knownError === isKnown);
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [allProblems, idFilter, titleFilter, statusFilter, priorityFilter, relatedIncidentsFilter, knownErrorFilter, currentPage, itemsPerPage]);
  
  const totalFilteredCount = useMemo(() => {
     let filtered = [...allProblems];
    if (idFilter) filtered = filtered.filter(p => p.id.toLowerCase().includes(idFilter.toLowerCase()));
    if (titleFilter) filtered = filtered.filter(p => p.title.toLowerCase().includes(titleFilter.toLowerCase()));
    if (statusFilter) filtered = filtered.filter(p => p.status === statusFilter);
    if (priorityFilter) filtered = filtered.filter(p => p.priority === priorityFilter);
    if (relatedIncidentsFilter) filtered = filtered.filter(p => p.relatedIncidents.some(incId => incId.toLowerCase().includes(relatedIncidentsFilter.toLowerCase())));
    if (knownErrorFilter) {
      const isKnown = knownErrorFilter === 'true';
      filtered = filtered.filter(p => p.knownError === isKnown);
    }
    return filtered.length;
  }, [allProblems, idFilter, titleFilter, statusFilter, priorityFilter, relatedIncidentsFilter, knownErrorFilter]);

  const totalPages = Math.ceil(totalFilteredCount / itemsPerPage);

  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); 
  };


  const handleOpenModal = (problem?: Problem) => {
    setEditingProblem(problem ? { ...problem, relatedIncidents: problem.relatedIncidents || [] } : { 
      title: '', 
      description: '', 
      status: ItemStatus.NEW, 
      priority: 'Medium',
      relatedIncidents: [],
      knownError: false,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProblem(null);
  };

  const handleOpenDetailsModal = (problem: Problem) => {
    setSelectedProblemForDetails(problem);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedProblemForDetails(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (editingProblem) {
      const { name, value, type } = e.target;
      if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setEditingProblem({ ...editingProblem, [name]: checked });
      } else if (name === "relatedIncidents") {
         setEditingProblem({ ...editingProblem, [name]: value.split(',').map(s => s.trim()).filter(s => s) });
      }
      else {
        setEditingProblem({ ...editingProblem, [name]: value });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProblem || !user) return;

    try {
       const problemToSave = {
        ...editingProblem,
        reportedBy: editingProblem.reportedBy || user.username,
        relatedIncidents: editingProblem.relatedIncidents || [],
      } as Problem; // Type assertion for submission

      if (editingProblem.id) {
        await updateProblem(editingProblem.id, problemToSave);
        setNotification({ message: '問題が正常に更新されました。', type: NotificationType.SUCCESS });
      } else {
        const newProblemData = {
            ...problemToSave,
            reportedBy: problemToSave.reportedBy || user.username
        } as Omit<Problem, 'id'|'createdAt'|'updatedAt'>;
        await addProblem(newProblemData);
        setNotification({ message: '問題が正常に登録されました。', type: NotificationType.SUCCESS });
      }
      fetchProblems();
      handleCloseModal();
    } catch (error) {
      console.error("問題の保存に失敗:", error);
      setNotification({ message: '問題の保存に失敗しました。', type: NotificationType.ERROR });
    }
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm('この問題を削除してもよろしいですか？')) {
        try {
            await deleteProblem(id);
            setNotification({ message: '問題が正常に削除されました。', type: NotificationType.SUCCESS });
            fetchProblems(); 
        } catch (error: any) {
            console.error("Failed to delete problem:", error);
            setNotification({ message: `問題の削除に失敗しました: ${error.message}`, type: NotificationType.ERROR });
        }
    }
  };

  const columns: Array<{ Header: string; accessor: keyof Problem | ((row: Problem) => ReactNode) }> = [
    { Header: 'ID', accessor: (row) => <span className="font-mono text-xs">{row.id.slice(0,8)}...</span> },
    { Header: 'タイトル', accessor: 'title' },
    { Header: 'ステータス', accessor: (row) => itemStatusToJapanese(row.status) },
    { Header: '優先度', accessor: (row) => priorityToJapanese(row.priority) },
    { Header: '関連インシデント', accessor: (row) => row.relatedIncidents.join(', ').substring(0,30) + (row.relatedIncidents.join(', ').length > 30 ? '...' : '') },
    { Header: '既知のエラー', accessor: (row) => booleanToJapanese(row.knownError) },
    { Header: '操作', accessor: (row) => (
      <div className="flex items-center space-x-2">
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenDetailsModal(row);}}>問題詳細</Button>
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenModal(row);}}>編集</Button>
        {user?.role === UserRole.ADMIN && <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(row.id);}}>削除</Button>}
      </div>
    )},
  ];

  const renderProblemDetail = (problem: Problem | null) => {
    if (!problem) return null;
    return (
        <div className="space-y-3 text-sm">
            <p><strong>ID:</strong> {problem.id}</p>
            <p><strong>タイトル:</strong> {problem.title}</p>
            <p><strong>説明:</strong> {problem.description}</p>
            <p><strong>ステータス:</strong> {itemStatusToJapanese(problem.status)}</p>
            <p><strong>優先度:</strong> {priorityToJapanese(problem.priority)}</p>
            <p><strong>報告者/発見元:</strong> {problem.reportedBy}</p>
            <p><strong>担当者:</strong> {problem.assignedTo || '未割り当て'}</p>
            <p><strong>関連インシデント:</strong> {problem.relatedIncidents.join(', ') || 'なし'}</p>
            <p><strong>根本原因分析:</strong> {problem.rootCauseAnalysis || '未実施'}</p>
            <p><strong>暫定対処:</strong> {problem.workaround || 'なし'}</p>
            <p><strong>恒久対策:</strong> {problem.solution || '未提案'}</p>
            <p><strong>既知のエラー:</strong> {booleanToJapanese(problem.knownError)}</p>
            <p><strong>作成日時:</strong> {new Date(problem.createdAt).toLocaleString()}</p>
            <p><strong>最終更新日時:</strong> {new Date(problem.updatedAt).toLocaleString()}</p>
        </div>
    );
  };


  return (
    <div className="space-y-6">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-slate-800">問題管理</h2>
        <Button onClick={() => handleOpenModal()}>新規問題登録</Button>
      </div>

      <Card title="問題フィルター">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
          <Input label="ID検索" value={idFilter} onChange={e => {setIdFilter(e.target.value); setCurrentPage(1);}} placeholder="IDで検索..."/>
          <Input label="タイトル検索" value={titleFilter} onChange={e => {setTitleFilter(e.target.value); setCurrentPage(1);}} placeholder="タイトルで検索..."/>
          <Select label="ステータス" value={statusFilter} onChange={e => {setStatusFilter(e.target.value); setCurrentPage(1);}} options={filterStatusOptions} />
          <Select label="優先度" value={priorityFilter} onChange={e => {setPriorityFilter(e.target.value); setCurrentPage(1);}} options={filterPriorityOptions} />
          <Input label="関連インシデントID" value={relatedIncidentsFilter} onChange={e => {setRelatedIncidentsFilter(e.target.value); setCurrentPage(1);}} placeholder="インシデントID..."/>
          <Select label="既知のエラー" value={knownErrorFilter} onChange={e => {setKnownErrorFilter(e.target.value); setCurrentPage(1);}} options={filterKnownErrorOptions} />
          <div className="flex items-end col-span-full md:col-span-1 lg:col-span-2">
            <Button onClick={clearFilters} variant="secondary" className="w-full md:w-auto">フィルタークリア</Button>
          </div>
        </div>
      </Card>

      <Card title="問題一覧">
        {isLoading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> : 
        filteredAndPaginatedProblems.length > 0 ? (
          <>
            <Table<Problem> columns={columns} data={filteredAndPaginatedProblems} onRowClick={(problem) => handleOpenDetailsModal(problem)}/>
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
                    {totalFilteredCount}件中 {Math.min((currentPage - 1) * itemsPerPage + 1, totalFilteredCount)}-{Math.min(currentPage * itemsPerPage, totalFilteredCount)}件表示
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
            <p className="p-4 text-slate-500 italic">条件に一致する問題はありません。</p>
        )}
      </Card>

      {/* Add/Edit Modal */}
      {editingProblem && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingProblem.id ? '問題編集' : '新規問題登録'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="タイトル" name="title" value={editingProblem.title || ''} onChange={handleInputChange} required />
            <Textarea label="説明" name="description" value={editingProblem.description || ''} onChange={handleInputChange} required rows={3}/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="ステータス" name="status" value={editingProblem.status || ItemStatus.NEW} onChange={handleInputChange} options={problemStatusesOptions.map(s => ({value: s, label: itemStatusToJapanese(s)}))} required/>
                <Select label="優先度" name="priority" value={editingProblem.priority || 'Medium'} onChange={handleInputChange} options={prioritiesOptions.map(p => ({value: p, label: priorityToJapanese(p)}))} required/>
            </div>
            <Input label="関連インシデントID (カンマ区切り)" name="relatedIncidents" value={editingProblem.relatedIncidents?.join(', ') || ''} onChange={handleInputChange} placeholder="例: INC001, INC005"/>
            <Textarea label="暫定対処 (ワークアラウンド)" name="workaround" value={editingProblem.workaround || ''} onChange={handleInputChange} rows={3}/>
            <Textarea label="根本原因分析" name="rootCauseAnalysis" value={editingProblem.rootCauseAnalysis || ''} onChange={handleInputChange} rows={3}/>
            <Textarea label="恒久対策 (解決策)" name="solution" value={editingProblem.solution || ''} onChange={handleInputChange} rows={3}/>
             <div className="flex items-center">
                <input type="checkbox" id="knownErrorModal" name="knownError" checked={!!editingProblem.knownError} onChange={handleInputChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>
                <label htmlFor="knownErrorModal" className="ml-2 block text-sm text-gray-900">既知のエラーとしてマーク</label>
            </div>
            <Input label="報告者/発見元 (任意)" name="reportedBy" value={editingProblem.reportedBy || user?.username || ''} onChange={handleInputChange} disabled={!!editingProblem.id && !!editingProblem.reportedBy}/>
            <Input label="担当者 (任意)" name="assignedTo" value={editingProblem.assignedTo || ''} onChange={handleInputChange} />

            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>キャンセル</Button>
              <Button type="submit" variant="primary">{editingProblem.id ? '更新' : '登録'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Details Modal */}
      {selectedProblemForDetails && (
        <Modal isOpen={isDetailsModalOpen} onClose={handleCloseDetailsModal} title={`問題詳細: ${selectedProblemForDetails.title.substring(0,30)}...`} size="lg">
            {renderProblemDetail(selectedProblemForDetails)}
             <div className="mt-6 flex justify-end">
                <Button variant="primary" onClick={() => {handleCloseDetailsModal(); handleOpenModal(selectedProblemForDetails);}}>編集</Button>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default ProblemManagementPage;
