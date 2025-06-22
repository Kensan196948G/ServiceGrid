
import * as React from 'react';
const { useState, useEffect, useCallback, useMemo } = React;
type ReactNode = React.ReactNode;
import { Incident, ItemStatus, UserRole } from '../types';
import { getIncidents as getIncidentsApi, createIncident, updateIncident as updateIncidentApi, deleteIncident as deleteIncidentApi, getErrorMessage } from '../services/incidentApiService';
import { testApiConnection, testIncidentsApi } from '../services/testApiConnection';
import { Button, Table, Modal, Input, Textarea, Select, Spinner, Card, Notification, NotificationType } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { itemStatusToJapanese, priorityToJapanese } from '../localization';
import { validateForm, INCIDENT_VALIDATION_RULES, ValidationError } from '../utils/formValidation';

const IncidentPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([
    {
      id: 'INC-2025-001234',
      title: 'WEBサーバー応答時間異常',
      description: 'WEB-SRV-01のレスポンス時間が通常の5倍に増加。ユーザーからアクセス遅延の報告が複数件発生中。',
      priority: 'Critical',
      status: 'In Progress',
      category: 'Infrastructure',
      reporter: 'IT運用部 田中太郎',
      assignee: 'インフラチーム 佐藤花子',
      createdAt: '2025-06-22T09:15:00Z',
      updatedAt: '2025-06-22T10:30:00Z',
      impact: 'High',
      urgency: 'High',
      slaTargetTime: '2025-06-22T13:15:00Z',
      affectedUsers: 450
    },
    {
      id: 'INC-2025-001235',
      title: 'メール配信システム障害',
      description: 'Exchange Server 2019にて送信メールが配信キューに蓄積され、外部への配信が停止している状況。',
      priority: 'High',
      status: 'Resolved',
      category: 'Application',
      reporter: '総務部 鈴木一郎',
      assignee: 'システム管理部 伊藤和子',
      createdAt: '2025-06-22T08:30:00Z',
      updatedAt: '2025-06-22T10:15:00Z',
      resolvedAt: '2025-06-22T10:15:00Z',
      impact: 'Medium',
      urgency: 'High',
      slaTargetTime: '2025-06-22T12:30:00Z',
      affectedUsers: 280
    },
    {
      id: 'INC-2025-001236',
      title: 'VPN接続不安定',
      description: 'リモートワーク中のユーザーからVPN接続が頻繁に切断されるとの報告。特に午後の時間帯に集中。',
      priority: 'Medium',
      status: 'Open',
      category: 'Network',
      reporter: '営業部 山田次郎',
      assignee: 'ネットワークチーム 高橋美咲',
      createdAt: '2025-06-22T14:20:00Z',
      updatedAt: '2025-06-22T14:25:00Z',
      impact: 'Medium',
      urgency: 'Medium',
      slaTargetTime: '2025-06-22T22:20:00Z',
      affectedUsers: 65
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Partial<Incident> | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const { user } = useAuth();
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [slaAlerts, setSlaAlerts] = useState([
    { incidentId: 'INC-2025-001234', timeRemaining: 175, status: 'warning' },
    { incidentId: 'INC-2025-001236', timeRemaining: 485, status: 'ok' }
  ]);
  
  // Form validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const priorities: Array<Incident['priority']> = ['Low', 'Medium', 'High', 'Critical'];
  const categories = ['Infrastructure', 'Application', 'Network', 'Hardware', 'Software', 'Security', 'Account', 'Other'];
  const categoryLabels = {
    'Infrastructure': 'インフラストラクチャ',
    'Application': 'アプリケーション',
    'Network': 'ネットワーク',
    'Hardware': 'ハードウェア',
    'Software': 'ソフトウェア',
    'Security': 'セキュリティ',
    'Account': 'アカウント',
    'Other': 'その他'
  };

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>(''); // YYYY-MM-DD
  const [searchQuery, setSearchQuery] = useState<string>('');

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
    const allAssignees = incidents.map(inc => inc.assignedTo || inc.assignee).filter(Boolean) as string[];
    const uniqueAssignees = Array.from(new Set(allAssignees));
    return [{ value: '', label: 'すべての担当者' }, ...uniqueAssignees.map(name => ({ value: name, label: name }))];
  }, [incidents]);

  const categoryOptions = useMemo(() => [
    { value: '', label: 'すべてのカテゴリ' },
    ...categories.map(c => ({ value: c, label: categoryLabels[c as keyof typeof categoryLabels] || c }))
  ], [categories]);

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setAssignedToFilter('');
    setDateFilter('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const filteredAndPaginatedIncidents = useMemo(() => {
    let filtered = [...incidents]; // Create a new array for filtering

    // キーワード検索
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inc => 
        inc.title.toLowerCase().includes(query) ||
        inc.description.toLowerCase().includes(query) ||
        inc.id.toLowerCase().includes(query) ||
        (inc.reporter || inc.reportedBy || '').toLowerCase().includes(query) ||
        (inc.assignee || inc.assignedTo || '').toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(inc => inc.status === statusFilter);
    }
    if (priorityFilter) {
      filtered = filtered.filter(inc => inc.priority === priorityFilter);
    }
    if (categoryFilter) {
      filtered = filtered.filter(inc => inc.category === categoryFilter);
    }
    if (assignedToFilter) {
      filtered = filtered.filter(inc => (inc.assignedTo || inc.assignee) === assignedToFilter);
    }
    if (dateFilter) { // Assuming dateFilter is YYYY-MM-DD and createdAt is ISO string
      filtered = filtered.filter(inc => inc.createdAt.startsWith(dateFilter));
    }
    
    // Sort by priority first, then by creation date descending
    filtered.sort((a, b) => {
      const priorityOrder = { 'Critical': 1, 'High': 2, 'Medium': 3, 'Low': 4 };
      const aPriority = priorityOrder[a.priority] || 5;
      const bPriority = priorityOrder[b.priority] || 5;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [incidents, searchQuery, statusFilter, priorityFilter, categoryFilter, assignedToFilter, dateFilter, currentPage, itemsPerPage]);

  const totalFilteredCount = useMemo(() => {
    let filtered = incidents;
    
    // キーワード検索
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inc => 
        inc.title.toLowerCase().includes(query) ||
        inc.description.toLowerCase().includes(query) ||
        inc.id.toLowerCase().includes(query) ||
        (inc.reporter || inc.reportedBy || '').toLowerCase().includes(query) ||
        (inc.assignee || inc.assignedTo || '').toLowerCase().includes(query)
      );
    }
    
    if (statusFilter) filtered = filtered.filter(inc => inc.status === statusFilter);
    if (priorityFilter) filtered = filtered.filter(inc => inc.priority === priorityFilter);
    if (categoryFilter) filtered = filtered.filter(inc => inc.category === categoryFilter);
    if (assignedToFilter) filtered = filtered.filter(inc => (inc.assignedTo || inc.assignee) === assignedToFilter);
    if (dateFilter) filtered = filtered.filter(inc => inc.createdAt.startsWith(dateFilter));
    return filtered.length;
  }, [incidents, searchQuery, statusFilter, priorityFilter, categoryFilter, assignedToFilter, dateFilter]);
  
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

  const handleViewDetails = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedIncident(null);
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

  const handleCompleteIncident = async (id: string) => {
    if (window.confirm('このインシデントを完了状態にしますか？')) {
      try {
        await updateIncidentApi(id, { status: ItemStatus.RESOLVED });
        setNotification({ message: 'インシデントが完了状態に変更されました。', type: NotificationType.SUCCESS });
        fetchIncidents(); // Re-fetch all incidents
      } catch (error) {
        console.error("Failed to complete incident:", error);
        setNotification({ message: `インシデントの完了処理に失敗しました: ${getErrorMessage(error)}`, type: NotificationType.ERROR });
      }
    }
  };

  const columns: Array<{ Header: string; accessor: keyof Incident | ((row: Incident) => ReactNode) }> = [
    { Header: 'ID', accessor: (row: Incident) => <span className="font-mono text-xs">{row.id.slice(0,8)}...</span> },
    { Header: 'タイトル', accessor: (row: Incident) => (
      <div className="max-w-xs">
        <p className="text-sm font-medium text-slate-900 truncate">{row.title}</p>
        {row.description && (
          <p className="text-xs text-slate-500 truncate mt-1">{row.description.slice(0, 60)}...</p>
        )}
      </div>
    )},
    { Header: 'ステータス', accessor: (row: Incident) => (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
        row.status === ItemStatus.OPEN || row.status === ItemStatus.NEW ? 'bg-yellow-100 text-yellow-800' :
        row.status === ItemStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
        row.status === ItemStatus.RESOLVED ? 'bg-green-100 text-green-800' :
        'bg-slate-100 text-slate-800'
      }`}>{itemStatusToJapanese(row.status)}</span>
    )},
    { Header: '優先度', accessor: (row: Incident) => (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${
        row.priority === 'Critical' ? 'bg-red-100 text-red-800' :
        row.priority === 'High' ? 'bg-orange-100 text-orange-800' :
        row.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
        'bg-green-100 text-green-800'
      }`}>{priorityToJapanese(row.priority)}</span>
    )},
    { Header: 'カテゴリ', accessor: (row: Incident) => (
      <span className="text-sm">{categoryLabels[row.category as keyof typeof categoryLabels] || row.category}</span>
    )},
    { Header: '報告者', accessor: (row: Incident) => (
      <div className="text-sm">
        <p className="font-medium text-slate-900">{row.reporter || row.reportedBy}</p>
        {(row.assignee || row.assignedTo) && (
          <p className="text-xs text-slate-500">担当: {row.assignee || row.assignedTo}</p>
        )}
      </div>
    )},
    { Header: '日時', accessor: (row: Incident) => (
      <div className="text-xs text-slate-600">
        <p>作成: {new Date(row.createdAt).toLocaleDateString('ja-JP')}</p>
        <p>更新: {new Date(row.updatedAt).toLocaleDateString('ja-JP')}</p>
        {row.slaTargetTime && (
          <p className={`font-medium ${
            new Date(row.slaTargetTime) < new Date() ? 'text-red-600' : 'text-green-600'
          }`}>
            SLA: {new Date(row.slaTargetTime).toLocaleDateString('ja-JP')}
            {new Date(row.slaTargetTime) < new Date() && ' (期限超過)'}
          </p>
        )}
      </div>
    )},
    { Header: '情報', accessor: (row: Incident) => (
      <div className="text-xs text-slate-600">
        {row.impact && (
          <p>影響: <span className={`font-medium ${
            row.impact === 'High' ? 'text-red-600' : row.impact === 'Medium' ? 'text-yellow-600' : 'text-green-600'
          }`}>{row.impact === 'High' ? '高' : row.impact === 'Medium' ? '中' : '低'}</span></p>
        )}
        {row.urgency && (
          <p>緊急: <span className={`font-medium ${
            row.urgency === 'High' ? 'text-red-600' : row.urgency === 'Medium' ? 'text-yellow-600' : 'text-green-600'
          }`}>{row.urgency === 'High' ? '高' : row.urgency === 'Medium' ? '中' : '低'}</span></p>
        )}
        {row.affectedUsers && (
          <p>影響: {row.affectedUsers.toLocaleString()}人</p>
        )}
      </div>
    )},
    { Header: '操作', accessor: (row: Incident) => (
      <div className="flex items-center space-x-1">
        <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); handleViewDetails(row);}}>詳細</Button>
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenModal(row);}}>編集</Button>
        {(row.status !== ItemStatus.RESOLVED && row.status !== ItemStatus.CLOSED) && (
          <Button size="sm" variant="success" onClick={(e) => { e.stopPropagation(); handleCompleteIncident(row.id);}}>完了</Button>
        )}
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

      {/* 統計ダッシュボード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 総インシデント数 */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">総インシデント数</p>
                <p className="text-2xl font-bold text-slate-900">{incidents.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>

        {/* オープンインシデント */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">オープン</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {incidents.filter(inc => inc.status === ItemStatus.OPEN || inc.status === ItemStatus.NEW || inc.status === ItemStatus.IN_PROGRESS).length}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>

        {/* クリティカルインシデント */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">クリティカル</p>
                <p className="text-2xl font-bold text-red-600">
                  {incidents.filter(inc => inc.priority === 'Critical').length}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>

        {/* 解決済み */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">解決済み</p>
                <p className="text-2xl font-bold text-green-600">
                  {incidents.filter(inc => inc.status === ItemStatus.RESOLVED || inc.status === ItemStatus.CLOSED).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* グラフエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ステータス別分布 */}
        <Card title="ステータス別分布">
          <div className="p-4">
            <div className="space-y-3">
              {Object.values(ItemStatus)
                .filter(status => incidents.some(inc => inc.status === status))
                .map(status => {
                  const count = incidents.filter(inc => inc.status === status).length;
                  const percentage = incidents.length > 0 ? (count / incidents.length) * 100 : 0;
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          status === ItemStatus.OPEN || status === ItemStatus.NEW ? 'bg-yellow-500' :
                          status === ItemStatus.IN_PROGRESS ? 'bg-blue-500' :
                          status === ItemStatus.RESOLVED ? 'bg-green-500' :
                          'bg-slate-500'
                        }`}></div>
                        <span className="text-sm font-medium text-slate-700">{itemStatusToJapanese(status)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-slate-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              status === ItemStatus.OPEN || status === ItemStatus.NEW ? 'bg-yellow-500' :
                              status === ItemStatus.IN_PROGRESS ? 'bg-blue-500' :
                              status === ItemStatus.RESOLVED ? 'bg-green-500' :
                              'bg-slate-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-slate-900 w-8">{count}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </Card>

        {/* 優先度別分布 */}
        <Card title="優先度別分布">
          <div className="p-4">
            <div className="space-y-3">
              {priorities.map(priority => {
                const count = incidents.filter(inc => inc.priority === priority).length;
                const percentage = incidents.length > 0 ? (count / incidents.length) * 100 : 0;
                return (
                  <div key={priority} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        priority === 'Critical' ? 'bg-red-500' :
                        priority === 'High' ? 'bg-orange-500' :
                        priority === 'Medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}></div>
                      <span className="text-sm font-medium text-slate-700">{priorityToJapanese(priority)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            priority === 'Critical' ? 'bg-red-500' :
                            priority === 'High' ? 'bg-orange-500' :
                            priority === 'Medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-slate-900 w-8">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* カテゴリ別分布 */}
        <Card title="カテゴリ別分布">
          <div className="p-4">
            <div className="space-y-3">
              {categories
                .filter(category => incidents.some(inc => inc.category === category))
                .map(category => {
                  const count = incidents.filter(inc => inc.category === category).length;
                  const percentage = incidents.length > 0 ? (count / incidents.length) * 100 : 0;
                  return (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-medium text-slate-700">
                          {categoryLabels[category as keyof typeof categoryLabels] || category}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-slate-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-blue-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-slate-900 w-8">{count}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </Card>

        {/* SLA状態 */}
        <Card title="SLA状態">
          <div className="p-4">
            <div className="space-y-3">
              {slaAlerts.map(alert => {
                const incident = incidents.find(inc => inc.id === alert.incidentId);
                if (!incident) return null;
                
                return (
                  <div key={alert.incidentId} className="flex items-center justify-between p-2 rounded border">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{incident.id}</p>
                      <p className="text-xs text-slate-600 truncate">{incident.title}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        alert.status === 'warning' ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {alert.timeRemaining}分
                      </p>
                      <p className="text-xs text-slate-500">残り時間</p>
                    </div>
                  </div>
                );
              })}
              {slaAlerts.length === 0 && (
                <p className="text-sm text-slate-500 italic text-center py-4">
                  SLAアラートはありません
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card title="インシデントフィルター・検索">
        <div className="space-y-4 p-4">
          {/* 検索バー */}
          <div className="grid grid-cols-1 gap-4">
            <Input 
              label="キーワード検索" 
              placeholder="タイトル、説明、IDで検索..."
              value={searchQuery} 
              onChange={e => {setSearchQuery(e.target.value); setCurrentPage(1);}} 
            />
          </div>
          
          {/* フィルター */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Select label="ステータス" value={statusFilter} onChange={e => {setStatusFilter(e.target.value); setCurrentPage(1);}} options={statusOptions} />
            <Select label="優先度" value={priorityFilter} onChange={e => {setPriorityFilter(e.target.value); setCurrentPage(1);}} options={priorityOptions} />
            <Select label="カテゴリ" value={categoryFilter} onChange={e => {setCategoryFilter(e.target.value); setCurrentPage(1);}} options={categoryOptions} />
            <Select label="担当者" value={assignedToFilter} onChange={e => {setAssignedToFilter(e.target.value); setCurrentPage(1);}} options={assignedToOptions} />
            <Input label="作成日" type="date" value={dateFilter} onChange={e => {setDateFilter(e.target.value); setCurrentPage(1);}} />
            <div className="flex items-end">
              <Button onClick={clearFilters} variant="secondary" className="w-full">フィルタークリア</Button>
            </div>
          </div>
          
          {/* 結果サマリ */}
          <div className="flex items-center justify-between text-sm text-slate-600 pt-2 border-t">
            <div>
              {(statusFilter || priorityFilter || categoryFilter || assignedToFilter || dateFilter || searchQuery) ? (
                <p>フィルター適用中: <span className="font-medium">{totalFilteredCount}件</span> / {incidents.length}件</p>
              ) : (
                <p>全件: <span className="font-medium">{incidents.length}件</span></p>
              )}
            </div>
            <div className="flex space-x-2">
              {searchQuery && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  検索: {searchQuery}
                </span>
              )}
              {statusFilter && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-800">
                  ステータス: {itemStatusToJapanese(statusFilter as ItemStatus)}
                </span>
              )}
              {priorityFilter && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-800">
                  優先度: {priorityToJapanese(priorityFilter as Priority)}
                </span>
              )}
              {categoryFilter && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-800">
                  カテゴリ: {categoryLabels[categoryFilter as keyof typeof categoryLabels] || categoryFilter}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        {isLoading ? (
            <div className="flex justify-center p-8"><Spinner size="lg" /></div>
         ) : (
            <>
                <Table<Incident> columns={columns} data={filteredAndPaginatedIncidents} onRowClick={handleViewDetails}/>
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
                    <div className="p-8 text-center">
                      <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-slate-900">インシデントが見つかりません</h3>
                      <p className="mt-1 text-sm text-slate-500">検索条件を変更するか、新しいインシデントを作成してください。</p>
                      <div className="mt-6">
                        <Button onClick={() => handleOpenModal()} variant="primary">
                          新しいインシデントを作成
                        </Button>
                      </div>
                    </div>
                )}
            </>
         )
        }
      </Card>

      {editingIncident && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingIncident.id ? 'インシデント編集' : '新規インシデント作成'} size="large">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本情報 */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">基本情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input label="タイトル" name="title" value={editingIncident.title || ''} onChange={handleInputChange} required />
                </div>
                <div className="md:col-span-2">
                  <Textarea label="説明" name="description" value={editingIncident.description || ''} onChange={handleInputChange} required rows={4} />
                </div>
                <Select 
                  label="カテゴリ" 
                  name="category" 
                  value={editingIncident.category || 'Other'} 
                  onChange={handleInputChange} 
                  options={categories.map(c => ({ value: c, label: categoryLabels[c as keyof typeof categoryLabels] || c }))} 
                />
                <Select 
                  label="ステータス" 
                  name="status" 
                  value={editingIncident.status || ItemStatus.NEW} 
                  onChange={handleInputChange} 
                  options={Object.values(ItemStatus)
                    .filter(s => ![ItemStatus.PLANNED, ItemStatus.BUILDING, ItemStatus.TESTING, ItemStatus.DEPLOYED, ItemStatus.ROLLED_BACK, ItemStatus.ANALYSIS, ItemStatus.SOLUTION_PROPOSED, ItemStatus.IDENTIFIED, ItemStatus.MITIGATED, ItemStatus.COMPLIANT, ItemStatus.NON_COMPLIANT, ItemStatus.IN_REVIEW, ItemStatus.NOT_APPLICABLE, ItemStatus.PENDING_APPROVAL, ItemStatus.SCHEDULED, ItemStatus.IMPLEMENTED].includes(s))
                    .map(s => ({ value: s, label: itemStatusToJapanese(s) }))}
                />
              </div>
            </div>

            {/* 優先度・影響度 */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">優先度・影響度</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select 
                  label="優先度" 
                  name="priority" 
                  value={editingIncident.priority || 'Medium'} 
                  onChange={handleInputChange} 
                  options={priorities.map(p => ({ value: p, label: priorityToJapanese(p) }))} 
                />
                <Select 
                  label="影響度" 
                  name="impact" 
                  value={editingIncident.impact || ''} 
                  onChange={handleInputChange} 
                  options={[
                    { value: '', label: '選択してください' },
                    { value: 'Low', label: '低' },
                    { value: 'Medium', label: '中' },
                    { value: 'High', label: '高' }
                  ]} 
                />
                <Select 
                  label="緊急度" 
                  name="urgency" 
                  value={editingIncident.urgency || ''} 
                  onChange={handleInputChange} 
                  options={[
                    { value: '', label: '選択してください' },
                    { value: 'Low', label: '低' },
                    { value: 'Medium', label: '中' },
                    { value: 'High', label: '高' }
                  ]} 
                />
              </div>
              <div className="mt-4">
                <Input 
                  label="影響ユーザー数 (任意)" 
                  name="affectedUsers" 
                  type="number" 
                  value={editingIncident.affectedUsers?.toString() || ''} 
                  onChange={handleInputChange} 
                  min="0"
                />
              </div>
            </div>

            {/* 担当情報 */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">担当情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="報告者" 
                  name="reportedBy" 
                  value={editingIncident.reportedBy || editingIncident.reporter || user?.username || ''} 
                  onChange={handleInputChange} 
                  required 
                />
                <Input 
                  label="担当者 (任意)" 
                  name="assignedTo" 
                  value={editingIncident.assignedTo || editingIncident.assignee || ''} 
                  onChange={handleInputChange} 
                />
              </div>
            </div>

            {/* 解決情報 */}
            {(editingIncident.status === ItemStatus.RESOLVED || editingIncident.status === ItemStatus.CLOSED || editingIncident.resolution || editingIncident.workaround) && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">解決情報</h3>
                <div className="space-y-4">
                  <Textarea 
                    label="解決策 (任意)" 
                    name="resolution" 
                    value={editingIncident.resolution || ''} 
                    onChange={handleInputChange} 
                    rows={3}
                  />
                  <Textarea 
                    label="一時的対処法 (任意)" 
                    name="workaround" 
                    value={editingIncident.workaround || ''} 
                    onChange={handleInputChange} 
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* 関連情報 */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">関連情報</h3>
              <div className="space-y-4">
                <Input 
                  label="関連資産 (カンマ区切りで入力)" 
                  name="relatedAssets" 
                  value={Array.isArray(editingIncident.relatedAssets) ? editingIncident.relatedAssets.join(', ') : ''} 
                  onChange={(e) => {
                    if (editingIncident) {
                      setEditingIncident({ 
                        ...editingIncident, 
                        relatedAssets: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                      });
                    }
                  }}
                />
                <Input 
                  label="タグ (カンマ区切りで入力)" 
                  name="tags" 
                  value={Array.isArray(editingIncident.tags) ? editingIncident.tags.join(', ') : ''} 
                  onChange={(e) => {
                    if (editingIncident) {
                      setEditingIncident({ 
                        ...editingIncident, 
                        tags: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                      });
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>キャンセル</Button>
              <Button type="submit" variant="primary">{editingIncident.id ? 'インシデント更新' : 'インシデント作成'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* インシデント詳細モーダル */}
      {selectedIncident && (
        <Modal isOpen={isDetailModalOpen} onClose={handleCloseDetailModal} title={`インシデント詳細 - ${selectedIncident.id}`} size="large">
          <div className="space-y-6">
            {/* 基本情報 */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">基本情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600">タイトル</label>
                  <p className="text-slate-900 font-medium">{selectedIncident.title}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600">ID</label>
                  <p className="text-slate-900 font-mono text-sm">{selectedIncident.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600">ステータス</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedIncident.status === ItemStatus.OPEN || selectedIncident.status === ItemStatus.NEW ? 'bg-yellow-100 text-yellow-800' :
                    selectedIncident.status === ItemStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
                    selectedIncident.status === ItemStatus.RESOLVED ? 'bg-green-100 text-green-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {itemStatusToJapanese(selectedIncident.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600">優先度</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedIncident.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                    selectedIncident.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                    selectedIncident.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {priorityToJapanese(selectedIncident.priority)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600">カテゴリ</label>
                  <p className="text-slate-900">{categoryLabels[selectedIncident.category as keyof typeof categoryLabels] || selectedIncident.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600">報告者</label>
                  <p className="text-slate-900">{selectedIncident.reporter || selectedIncident.reportedBy}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600">担当者</label>
                  <p className="text-slate-900">{selectedIncident.assignee || selectedIncident.assignedTo || '未割り当て'}</p>
                </div>
                {selectedIncident.affectedUsers && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600">影響ユーザー数</label>
                    <p className="text-slate-900">{selectedIncident.affectedUsers.toLocaleString()}人</p>
                  </div>
                )}
              </div>
            </div>

            {/* 詳細情報 */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">詳細情報</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">説明</label>
                  <div className="bg-slate-50 p-3 rounded border text-slate-900 whitespace-pre-wrap">
                    {selectedIncident.description}
                  </div>
                </div>
                
                {selectedIncident.impact && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600">影響度</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                        selectedIncident.impact === 'High' ? 'bg-red-100 text-red-800' :
                        selectedIncident.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {selectedIncident.impact === 'High' ? '高' : selectedIncident.impact === 'Medium' ? '中' : '低'}
                      </span>
                    </div>
                    {selectedIncident.urgency && (
                      <div>
                        <label className="block text-sm font-medium text-slate-600">緊急度</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                          selectedIncident.urgency === 'High' ? 'bg-red-100 text-red-800' :
                          selectedIncident.urgency === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {selectedIncident.urgency === 'High' ? '高' : selectedIncident.urgency === 'Medium' ? '中' : '低'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {selectedIncident.resolution && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">解決策</label>
                    <div className="bg-green-50 p-3 rounded border border-green-200 text-slate-900 whitespace-pre-wrap">
                      {selectedIncident.resolution}
                    </div>
                  </div>
                )}

                {selectedIncident.workaround && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">一時的対処法</label>
                    <div className="bg-blue-50 p-3 rounded border border-blue-200 text-slate-900 whitespace-pre-wrap">
                      {selectedIncident.workaround}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* タイムライン */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">タイムライン</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">作成日時</p>
                    <p className="text-sm text-slate-600">{new Date(selectedIncident.createdAt).toLocaleString('ja-JP')}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">最終更新</p>
                    <p className="text-sm text-slate-600">{new Date(selectedIncident.updatedAt).toLocaleString('ja-JP')}</p>
                  </div>
                </div>
                
                {selectedIncident.resolvedAt && (
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">解決日時</p>
                      <p className="text-sm text-slate-600">{new Date(selectedIncident.resolvedAt).toLocaleString('ja-JP')}</p>
                    </div>
                  </div>
                )}
                
                {selectedIncident.closedAt && (
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">完了日時</p>
                      <p className="text-sm text-slate-600">{new Date(selectedIncident.closedAt).toLocaleString('ja-JP')}</p>
                    </div>
                  </div>
                )}

                {selectedIncident.slaTargetTime && (
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      new Date(selectedIncident.slaTargetTime) > new Date() ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">SLA目標時間</p>
                      <p className={`text-sm ${
                        new Date(selectedIncident.slaTargetTime) > new Date() ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {new Date(selectedIncident.slaTargetTime).toLocaleString('ja-JP')}
                        {new Date(selectedIncident.slaTargetTime) < new Date() && ' (期限超過)'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 関連情報 */}
            {(selectedIncident.relatedAssets?.length || selectedIncident.tags?.length) && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">関連情報</h3>
                <div className="space-y-4">
                  {selectedIncident.relatedAssets && selectedIncident.relatedAssets.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">関連資産</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedIncident.relatedAssets.map((asset, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                            {asset}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedIncident.tags && selectedIncident.tags.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">タグ</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedIncident.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-slate-100 text-slate-800 text-xs rounded font-medium">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* アクションボタン */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="secondary" onClick={handleCloseDetailModal}>閉じる</Button>
              <Button variant="primary" onClick={() => { handleCloseDetailModal(); handleOpenModal(selectedIncident); }}>編集</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default IncidentPage;
