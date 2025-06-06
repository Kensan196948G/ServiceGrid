
import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { Incident, ItemStatus, UserRole } from '../types';
import { getIncidents as getIncidentsApi, createIncident, updateIncident as updateIncidentApi, deleteIncident as deleteIncidentApi, getErrorMessage } from '../services/incidentApiService';
import { testApiConnection, testIncidentsApi } from '../services/testApiConnection';
import { Button, Table, Modal, Input, Textarea, Select, Spinner, Card, Notification, NotificationType } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { itemStatusToJapanese, priorityToJapanese } from '../localization';

const IncidentPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Partial<Incident> | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const { user } = useAuth();

  const priorities: Array<Incident['priority']> = ['Low', 'Medium', 'High', 'Critical'];
  const categories = ['ハードウェア', 'ソフトウェア', 'ネットワーク', 'アカウント', 'その他'];

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('');
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

  const fetchIncidents = useCallback(async () => {
    setIsLoading(true);
    try {
      // API接続テスト
      console.log('Testing API connection...');
      const isConnected = await testApiConnection();
      console.log('API Connection result:', isConnected);
      
      if (!isConnected) {
        throw new Error('API server is not accessible');
      }
      
      // インシデントAPIテスト
      console.log('Testing incidents API...');
      const testResult = await testIncidentsApi();
      console.log('Incidents API test result:', testResult);
      
      if (!testResult.success) {
        throw new Error(`Incidents API failed: ${testResult.error || 'Unknown error'}`);
      }
      
      const response = await getIncidentsApi(currentPage, itemsPerPage);
      setIncidents(response.incidents);
    } catch (error) {
      console.error("Failed to fetch incidents:", error);
      setNotification({ message: `インシデントの読み込みに失敗しました: ${getErrorMessage(error)}`, type: NotificationType.ERROR });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const statusOptions = useMemo(() => [
    { value: '', label: 'すべてのステータス' },
    ...Object.values(ItemStatus)
        .filter(s => // Filter out statuses not relevant to incidents or too granular for main filter
            ![ItemStatus.PLANNED, ItemStatus.BUILDING, ItemStatus.TESTING, ItemStatus.DEPLOYED, ItemStatus.ROLLED_BACK, ItemStatus.ANALYSIS, ItemStatus.SOLUTION_PROPOSED, ItemStatus.IDENTIFIED, ItemStatus.MITIGATED, ItemStatus.COMPLIANT, ItemStatus.NON_COMPLIANT, ItemStatus.IN_REVIEW, ItemStatus.NOT_APPLICABLE, ItemStatus.PENDING_APPROVAL, ItemStatus.SCHEDULED, ItemStatus.IMPLEMENTED].includes(s)
        )
        .map(s => ({ value: s, label: itemStatusToJapanese(s) }))
  ], []);

  const priorityOptions = useMemo(() => [
    { value: '', label: 'すべての優先度' },
    ...priorities.map(p => ({ value: p, label: priorityToJapanese(p) }))
  ], [priorities]);

  const assignedToOptions = useMemo(() => {
    const allAssignees = incidents.map(inc => inc.assignedTo).filter(Boolean) as string[];
    const uniqueAssignees = Array.from(new Set(allAssignees));
    return [{ value: '', label: 'すべての担当者' }, ...uniqueAssignees.map(name => ({ value: name, label: name }))];
  }, [incidents]);

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setAssignedToFilter('');
    setDateFilter('');
    setCurrentPage(1);
  };

  const filteredAndPaginatedIncidents = useMemo(() => {
    let filtered = [...incidents]; // Create a new array for filtering

    if (statusFilter) {
      filtered = filtered.filter(inc => inc.status === statusFilter);
    }
    if (priorityFilter) {
      filtered = filtered.filter(inc => inc.priority === priorityFilter);
    }
    if (assignedToFilter) {
      filtered = filtered.filter(inc => inc.assignedTo === assignedToFilter);
    }
    if (dateFilter) { // Assuming dateFilter is YYYY-MM-DD and createdAt is ISO string
      filtered = filtered.filter(inc => inc.createdAt.startsWith(dateFilter));
    }
    
    // Sort by creation date descending by default after filtering
    filtered.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [incidents, statusFilter, priorityFilter, assignedToFilter, dateFilter, currentPage, itemsPerPage]);

  const totalFilteredCount = useMemo(() => {
    let filtered = incidents;
    if (statusFilter) filtered = filtered.filter(inc => inc.status === statusFilter);
    if (priorityFilter) filtered = filtered.filter(inc => inc.priority === priorityFilter);
    if (assignedToFilter) filtered = filtered.filter(inc => inc.assignedTo === assignedToFilter);
    if (dateFilter) filtered = filtered.filter(inc => inc.createdAt.startsWith(dateFilter));
    return filtered.length;
  }, [incidents, statusFilter, priorityFilter, assignedToFilter, dateFilter]);
  
  const totalPages = Math.ceil(totalFilteredCount / itemsPerPage);

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); 
  };

  const handleOpenModal = (incident?: Incident) => {
    setEditingIncident(incident ? { ...incident } : { title: '', description: '', priority: 'Medium', status: ItemStatus.NEW, category: 'その他' });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingIncident(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (editingIncident) {
      setEditingIncident({ ...editingIncident, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncident || !user) return;

    try {
      if (editingIncident.id) {
        await updateIncidentApi(editingIncident.id, { ...editingIncident, reportedBy: editingIncident.reportedBy || user.username } as Incident);
        setNotification({ message: 'インシデントが正常に更新されました。', type: NotificationType.SUCCESS });
      } else {
        await createIncident({ ...editingIncident, reportedBy: user.username } as Partial<Incident>);
        setNotification({ message: 'インシデントが正常に作成されました。', type: NotificationType.SUCCESS });
      }
      fetchIncidents(); // Re-fetch all incidents to update filters and list
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save incident:", error);
      setNotification({ message: `インシデントの保存に失敗しました: ${getErrorMessage(error)}`, type: NotificationType.ERROR });
    }
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm('このインシデントを削除してもよろしいですか？')) {
      try {
        await deleteIncidentApi(id);
        setNotification({ message: 'インシデントが正常に削除されました。', type: NotificationType.SUCCESS });
        fetchIncidents(); // Re-fetch all incidents
      } catch (error) {
        console.error("Failed to delete incident:", error);
        setNotification({ message: `インシデントの削除に失敗しました: ${getErrorMessage(error)}`, type: NotificationType.ERROR });
      }
    }
  };

  const columns: Array<{ Header: string; accessor: keyof Incident | ((row: Incident) => ReactNode) }> = [
    { Header: 'ID', accessor: (row: Incident) => <span className="font-mono text-xs">{row.id.slice(0,8)}...</span> },
    { Header: 'タイトル', accessor: 'title' },
    { Header: 'ステータス', accessor: (row: Incident) => (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
        row.status === ItemStatus.OPEN || row.status === ItemStatus.NEW ? 'bg-yellow-100 text-yellow-800' :
        row.status === ItemStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
        row.status === ItemStatus.RESOLVED ? 'bg-green-100 text-green-800' :
        'bg-slate-100 text-slate-800'
      }`}>{itemStatusToJapanese(row.status)}</span>
    )},
    { Header: '優先度', accessor: (row: Incident) => priorityToJapanese(row.priority) },
    { Header: 'カテゴリ', accessor: 'category' },
    { Header: '報告者', accessor: 'reportedBy' },
    { Header: '作成日時', accessor: (row: Incident) => new Date(row.createdAt).toLocaleDateString() },
    { Header: '操作', accessor: (row: Incident) => (
      <div className="flex items-center space-x-2">
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenModal(row);}}>編集</Button>
        {user?.role === UserRole.ADMIN && <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(row.id);}}>削除</Button>}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-slate-800">インシデント管理</h2>
        <Button onClick={() => handleOpenModal()}>インシデント作成</Button>
      </div>

      <Card title="インシデントフィルター">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4">
          <Select label="ステータス" value={statusFilter} onChange={e => {setStatusFilter(e.target.value); setCurrentPage(1);}} options={statusOptions} />
          <Select label="優先度" value={priorityFilter} onChange={e => {setPriorityFilter(e.target.value); setCurrentPage(1);}} options={priorityOptions} />
          <Select label="担当者" value={assignedToFilter} onChange={e => {setAssignedToFilter(e.target.value); setCurrentPage(1);}} options={assignedToOptions} />
          <Input label="作成日" type="date" value={dateFilter} onChange={e => {setDateFilter(e.target.value); setCurrentPage(1);}} />
          <div className="flex items-end">
            <Button onClick={clearFilters} variant="secondary" className="w-full">フィルタークリア</Button>
          </div>
        </div>
      </Card>

      <Card>
        {isLoading ? (
            <div className="flex justify-center p-8"><Spinner size="lg" /></div>
         ) : (
            <>
                <Table<Incident> columns={columns} data={filteredAndPaginatedIncidents} onRowClick={handleOpenModal}/>
                { totalFilteredCount > 0 && (
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
                        <span className="text-sm text-slate-700">ページ {currentPage} / {totalPages}</span>
                        <Button onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0} size="sm">次へ</Button>
                        </div>
                    </div>
                )}
                {totalFilteredCount === 0 && !isLoading && (
                    <p className="p-4 text-slate-500 italic">条件に一致するインシデントはありません。</p>
                )}
            </>
         )
        }
      </Card>

      {editingIncident && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingIncident.id ? 'インシデント編集' : '新規インシデント作成'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="タイトル" name="title" value={editingIncident.title || ''} onChange={handleInputChange} required />
            <Textarea label="説明" name="description" value={editingIncident.description || ''} onChange={handleInputChange} required />
            <Select 
              label="優先度" 
              name="priority" 
              value={editingIncident.priority || 'Medium'} 
              onChange={handleInputChange} 
              options={priorities.map(p => ({ value: p, label: priorityToJapanese(p) }))} 
            />
            <Select 
              label="ステータス" 
              name="status" 
              value={editingIncident.status || ItemStatus.NEW} 
              onChange={handleInputChange} 
              options={Object.values(ItemStatus).map(s => ({ value: s, label: itemStatusToJapanese(s) }))} 
            />
            <Select label="カテゴリ" name="category" value={editingIncident.category || 'その他'} onChange={handleInputChange} options={categories.map(c => ({ value: c, label: c }))} />
            <Input label="担当者 (任意)" name="assignedTo" value={editingIncident.assignedTo || ''} onChange={handleInputChange} />
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>キャンセル</Button>
              <Button type="submit" variant="primary">インシデント保存</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default IncidentPage;
