
import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { 
  ServiceRequest, 
  ServiceRequestFilter, 
  ServiceRequestResponse,
  ServiceRequestStats,
  UserRole 
} from '../types';
import * as serviceRequestApi from '../services/serviceRequestApiService';
import { Button, Table, Modal, Input, Textarea, Select, Spinner, Card, Notification, NotificationType } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { itemStatusToJapanese } from '../localization';

const ServiceRequestPage: React.FC = () => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Partial<ServiceRequest> | null>(null);
  const { user } = useAuth();
  const { addToast } = useToast();
  
  // Approval workflow state
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState<ServiceRequest | null>(null);
  const [approvalComments, setApprovalComments] = useState('');

  const serviceTypes = ['アカウント作成', 'ソフトウェアインストール', 'ハードウェアリクエスト', 'アクセスリクエスト', '一般問い合わせ'];

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('');
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


  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: ServiceRequestFilter = {
        status: statusFilter || undefined,
        category: serviceTypeFilter || undefined,
        page: currentPage,
        limit: itemsPerPage,
        date_from: dateFilter || undefined
      };
      const response = await serviceRequestApi.getServiceRequests(filters);
      setRequests(response.data);
    } catch (error) {
      console.error("Failed to fetch service requests:", error);
      addToast('サービスリクエストの読み込みに失敗しました。', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const statusOptions = useMemo(() => [
    { value: '', label: 'すべてのステータス' },
    ...Object.values(ItemStatus)
        .filter(s => // Filter out statuses not relevant to service requests or too granular
            ![ItemStatus.PLANNED, ItemStatus.BUILDING, ItemStatus.TESTING, ItemStatus.DEPLOYED, ItemStatus.ROLLED_BACK, ItemStatus.ANALYSIS, ItemStatus.SOLUTION_PROPOSED, ItemStatus.IDENTIFIED, ItemStatus.MITIGATED, ItemStatus.COMPLIANT, ItemStatus.NON_COMPLIANT, ItemStatus.IN_REVIEW, ItemStatus.NOT_APPLICABLE, ItemStatus.PENDING_APPROVAL, ItemStatus.SCHEDULED, ItemStatus.IMPLEMENTED].includes(s)
        )
        .map(s => ({ value: s, label: itemStatusToJapanese(s) }))
  ], []);

  const serviceTypeOptions = useMemo(() => [
    { value: '', label: 'すべてのサービス種別' },
    ...serviceTypes.map(st => ({ value: st, label: st }))
  ], [serviceTypes]);

  const clearFilters = () => {
    setStatusFilter('');
    setServiceTypeFilter('');
    setDateFilter('');
    setCurrentPage(1);
  };

  const filteredAndPaginatedRequests = useMemo(() => {
    let filtered = [...requests];

    if (statusFilter) {
      filtered = filtered.filter(req => req.status === statusFilter);
    }
    if (serviceTypeFilter) {
      filtered = filtered.filter(req => req.serviceType === serviceTypeFilter);
    }
    if (dateFilter) { 
      filtered = filtered.filter(req => req.createdAt.startsWith(dateFilter));
    }
    
    filtered.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [requests, statusFilter, serviceTypeFilter, dateFilter, currentPage, itemsPerPage]);

  const totalFilteredCount = useMemo(() => {
    let filtered = requests;
    if (statusFilter) filtered = filtered.filter(req => req.status === statusFilter);
    if (serviceTypeFilter) filtered = filtered.filter(req => req.serviceType === serviceTypeFilter);
    if (dateFilter) filtered = filtered.filter(req => req.createdAt.startsWith(dateFilter));
    return filtered.length;
  }, [requests, statusFilter, serviceTypeFilter, dateFilter]);
  
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


  const handleOpenModal = (request?: ServiceRequest) => {
    setEditingRequest(request ? { ...request } : { title: '', description: '', status: ItemStatus.NEW, serviceType: '一般問い合わせ' });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRequest(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (editingRequest) {
      setEditingRequest({ ...editingRequest, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest || !user) return;

    try {
      if (editingRequest.id) {
        await serviceRequestApi.updateServiceRequest(editingRequest.id, { ...editingRequest, requestedBy: editingRequest.requestedBy || user.username } as ServiceRequest);
        addToast('サービスリクエストが正常に更新されました。', 'success');
      } else {
        await serviceRequestApi.createServiceRequest({ ...editingRequest, requestedBy: user.username } as Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt'>);
        addToast('サービスリクエストが正常に作成されました。', 'success');
      }
      fetchRequests();
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save service request:", error);
      addToast('サービスリクエストの保存に失敗しました。', 'error');
    }
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm('このサービスリクエストを削除してもよろしいですか？')) {
      try {
        await serviceRequestApi.deleteServiceRequest(id);
        addToast('サービスリクエストが正常に削除されました。', 'success');
        fetchRequests();
      } catch (error) {
        console.error("Failed to delete service request:", error);
        addToast('サービスリクエストの削除に失敗しました。', 'error');
      }
    }
  };

  // Approval workflow handlers
  const handleOpenApprovalModal = (request: ServiceRequest) => {
    setApprovingRequest(request);
    setApprovalComments('');
    setIsApprovalModalOpen(true);
  };

  const handleCloseApprovalModal = () => {
    setIsApprovalModalOpen(false);
    setApprovingRequest(null);
    setApprovalComments('');
  };

  const handleApprove = async () => {
    if (!approvingRequest || !user) return;

    try {
      const updatedRequest = {
        ...approvingRequest,
        status: ItemStatus.APPROVED,
        approvedBy: user.username,
        approvedAt: new Date().toISOString(),
        approvalComments: approvalComments.trim() || '承認されました'
      };

      await serviceRequestApi.updateServiceRequest(approvingRequest.id, updatedRequest);
      addToast(`サービスリクエスト「${approvingRequest.title}」を承認しました。`, 'success');
      fetchRequests();
      handleCloseApprovalModal();
    } catch (error) {
      console.error("Failed to approve service request:", error);
      addToast('承認処理に失敗しました。', 'error');
    }
  };

  const handleReject = async () => {
    if (!approvingRequest || !user) return;

    if (!approvalComments.trim()) {
      addToast('却下理由を入力してください。', 'error');
      return;
    }

    try {
      const updatedRequest = {
        ...approvingRequest,
        status: ItemStatus.REJECTED,
        rejectedBy: user.username,
        rejectedAt: new Date().toISOString(),
        rejectionReason: approvalComments.trim()
      };

      await serviceRequestApi.updateServiceRequest(approvingRequest.id, updatedRequest);
      addToast(`サービスリクエスト「${approvingRequest.title}」を却下しました。`, 'success');
      fetchRequests();
      handleCloseApprovalModal();
    } catch (error) {
      console.error("Failed to reject service request:", error);
      addToast('却下処理に失敗しました。', 'error');
    }
  };

  const handleStartWork = async (request: ServiceRequest) => {
    if (!user) return;

    try {
      const updatedRequest = {
        ...request,
        status: ItemStatus.IN_PROGRESS,
        assignedTo: user.username,
        startedAt: new Date().toISOString()
      };

      await serviceRequestApi.updateServiceRequest(request.id, updatedRequest);
      addToast(`サービスリクエスト「${request.title}」の作業を開始しました。`, 'success');
      fetchRequests();
    } catch (error) {
      console.error("Failed to start work on service request:", error);
      addToast('作業開始処理に失敗しました。', 'error');
    }
  };

  const handleComplete = async (request: ServiceRequest) => {
    if (!user) return;

    const resolution = prompt('完了コメントを入力してください（任意）:');
    if (resolution === null) return; // Cancelled

    try {
      const updatedRequest = {
        ...request,
        status: ItemStatus.RESOLVED,
        resolvedBy: user.username,
        resolvedAt: new Date().toISOString(),
        resolution: resolution.trim() || '完了しました'
      };

      await serviceRequestApi.updateServiceRequest(request.id, updatedRequest);
      addToast(`サービスリクエスト「${request.title}」を完了しました。`, 'success');
      fetchRequests();
    } catch (error) {
      console.error("Failed to complete service request:", error);
      addToast('完了処理に失敗しました。', 'error');
    }
  };

  const columns: Array<{ Header: string; accessor: keyof ServiceRequest | ((row: ServiceRequest) => ReactNode) }> = [
    { Header: 'ID', accessor: (row: ServiceRequest) => <span className="font-mono text-xs">{row.id.slice(0,8)}...</span> },
    { Header: 'タイトル', accessor: 'title' },
    { Header: 'ステータス', accessor: (row: ServiceRequest) => (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
        row.status === ItemStatus.OPEN || row.status === ItemStatus.NEW ? 'bg-yellow-100 text-yellow-800' :
        row.status === ItemStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
        row.status === ItemStatus.RESOLVED || row.status === ItemStatus.CLOSED ? 'bg-green-100 text-green-800' :
        'bg-slate-100 text-slate-800'
      }`}>{itemStatusToJapanese(row.status)}</span>
    )},
    { Header: 'サービス種別', accessor: 'serviceType' },
    { Header: '要求者', accessor: 'requestedBy' },
    { Header: '作成日時', accessor: (row: ServiceRequest) => new Date(row.createdAt).toLocaleDateString() },
    { Header: '操作', accessor: (row: ServiceRequest) => (
      <div className="flex items-center space-x-1 flex-wrap">
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenModal(row);}}>編集</Button>
        
        {/* Approval workflow buttons */}
        {(user?.role === UserRole.ADMIN || user?.role === UserRole.OPERATOR) && (
          <>
            {(row.status === ItemStatus.NEW || row.status === ItemStatus.OPEN) && (
              <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); handleOpenApprovalModal(row);}}>
                承認/却下
              </Button>
            )}
            
            {row.status === ItemStatus.APPROVED && (
              <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleStartWork(row);}}>
                作業開始
              </Button>
            )}
            
            {row.status === ItemStatus.IN_PROGRESS && row.assignedTo === user?.username && (
              <Button size="sm" variant="success" onClick={(e) => { e.stopPropagation(); handleComplete(row);}}>
                完了
              </Button>
            )}
          </>
        )}
        
        {user?.role === UserRole.ADMIN && (
          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(row.id);}}>削除</Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-slate-800">サービスリクエスト管理</h2>
        <Button onClick={() => handleOpenModal()}>サービスリクエスト作成</Button>
      </div>

      <Card title="サービスリクエストフィルター">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
          <Select label="ステータス" value={statusFilter} onChange={e => {setStatusFilter(e.target.value); setCurrentPage(1);}} options={statusOptions} />
          <Select label="サービス種別" value={serviceTypeFilter} onChange={e => {setServiceTypeFilter(e.target.value); setCurrentPage(1);}} options={serviceTypeOptions} />
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
            <Table<ServiceRequest> columns={columns} data={filteredAndPaginatedRequests} onRowClick={handleOpenModal}/>
            {totalFilteredCount > 0 && (
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
                <p className="p-4 text-slate-500 italic">条件に一致するサービスリクエストはありません。</p>
            )}
          </>
        )}
      </Card>

      {editingRequest && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingRequest.id ? 'サービスリクエスト編集' : '新規サービスリクエスト作成'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="タイトル" name="title" value={editingRequest.title || ''} onChange={handleInputChange} required />
            <Textarea label="説明" name="description" value={editingRequest.description || ''} onChange={handleInputChange} required />
            <Select label="サービス種別" name="serviceType" value={editingRequest.serviceType || '一般問い合わせ'} onChange={handleInputChange} options={serviceTypes.map(st => ({ value: st, label: st }))} />
            <Select 
              label="ステータス" 
              name="status" 
              value={editingRequest.status || ItemStatus.NEW} 
              onChange={handleInputChange} 
              options={Object.values(ItemStatus)
                 .filter(s => ![ItemStatus.PLANNED, ItemStatus.BUILDING, ItemStatus.TESTING, ItemStatus.DEPLOYED, ItemStatus.ROLLED_BACK, ItemStatus.ANALYSIS, ItemStatus.SOLUTION_PROPOSED, ItemStatus.IDENTIFIED, ItemStatus.MITIGATED, ItemStatus.COMPLIANT, ItemStatus.NON_COMPLIANT, ItemStatus.IN_REVIEW, ItemStatus.NOT_APPLICABLE, ItemStatus.PENDING_APPROVAL, ItemStatus.SCHEDULED, ItemStatus.IMPLEMENTED].includes(s)) // Filter again for modal
                 .map(s => ({ value: s, label: itemStatusToJapanese(s) }))
              } 
            />
            <Input label="担当者 (任意)" name="assignedTo" value={editingRequest.assignedTo || ''} onChange={handleInputChange} />
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>キャンセル</Button>
              <Button type="submit" variant="primary">リクエスト保存</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Approval/Rejection Modal */}
      {isApprovalModalOpen && approvingRequest && (
        <Modal 
          isOpen={isApprovalModalOpen} 
          onClose={handleCloseApprovalModal} 
          title={`承認/却下 - ${approvingRequest.title}`}
          size="md"
        >
          <div className="space-y-4">
            {/* Request Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">リクエスト詳細</h4>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">タイトル:</span> {approvingRequest.title}</div>
                <div><span className="font-medium">説明:</span> {approvingRequest.description}</div>
                <div><span className="font-medium">サービス種別:</span> {approvingRequest.serviceType}</div>
                <div><span className="font-medium">要求者:</span> {approvingRequest.requestedBy}</div>
                <div><span className="font-medium">作成日:</span> {new Date(approvingRequest.createdAt).toLocaleString('ja-JP')}</div>
                <div>
                  <span className="font-medium">現在のステータス:</span> 
                  <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                    approvingRequest.status === ItemStatus.NEW || approvingRequest.status === ItemStatus.OPEN 
                      ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {itemStatusToJapanese(approvingRequest.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Approval Comments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                コメント
              </label>
              <Textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder="承認/却下の理由やコメントを入力してください..."
                rows={4}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                ※却下の場合はコメントが必須です
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between space-x-3 pt-4">
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="success"
                  onClick={handleApprove}
                  className="flex items-center space-x-1"
                >
                  <span>✓</span>
                  <span>承認</span>
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleReject}
                  className="flex items-center space-x-1"
                >
                  <span>✗</span>
                  <span>却下</span>
                </Button>
              </div>
              <Button type="button" variant="secondary" onClick={handleCloseApprovalModal}>
                キャンセル
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ServiceRequestPage;
