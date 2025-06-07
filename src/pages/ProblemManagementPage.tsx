
import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { Problem, ProblemStatus, Priority, UserRole } from '../types';
import { getProblems, createProblem, updateProblem, deleteProblem } from '../services/problemApiService';
import { getIncidents } from '../services/mockItsmService'; // Still using mock for incidents until implemented
import { Button, Table, Modal, Input, Textarea, Select, Spinner, Card, Notification, NotificationType } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { itemStatusToJapanese, priorityToJapanese, booleanToJapanese } from '../localization';

const ProblemManagementPage: React.FC = () => {
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [availableIncidents, setAvailableIncidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Partial<Problem> | null>(null);
  const [selectedProblemForDetails, setSelectedProblemForDetails] = useState<Problem | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const { user } = useAuth();

  const problemStatusesOptions: ProblemStatus[] = ['Logged', 'In Progress', 'Known Error', 'Resolved', 'Closed'];
  const prioritiesOptions: Priority[] = ['Low', 'Medium', 'High', 'Critical'];
  
  // ITサービス・ITシステム対象オプション（資産の種類 + ITサービス）
  const systemTargetOptions = [
    // ITサービス
    '顧客ポータル', '社内基幹システム', 'モバイルアプリ', 'APIゲートウェイ', '認証サーバー', 
    '財務システム', '人事システム', 'Webサイト', 'データベースサービス', 'メールシステム',
    // 資産の種類から
    'サーバー', 'デスクトップPC', 'ノートPC', 'タブレット', 'スマートフォン',
    'ネットワーク機器', 'ストレージ', 'プリンター', 'モニター', '周辺機器',
    'ソフトウェア', 'ライセンス', '仮想マシン', 'クラウドサービス',
    'その他'
  ];

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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [problemsResponse, incidentsData] = await Promise.all([
        getProblems(),
        getIncidents()
      ]);
      setAllProblems(problemsResponse.data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setAvailableIncidents(incidentsData);
    } catch (error) {
      console.error("データの読み込みに失敗:", error);
      setNotification({ message: 'データの読み込みに失敗しました。', type: NotificationType.ERROR });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
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
    setEditingProblem(problem ? { 
      ...problem, 
      relatedIncidents: problem.relatedIncidents || [], 
      systemTargets: (problem as any).systemTargets || [],
      jvnNumbers: (problem as any).jvnNumbers || []
    } : { 
      title: '', 
      description: '', 
      status: 'Logged' as ProblemStatus, 
      priority: 'Medium',
      relatedIncidents: [],
      knownError: false,
      systemTargets: [],
      reportedBy: user?.username || '',
      jvnNumbers: []
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
        systemTargets: (editingProblem as any).systemTargets || [],
        jvnNumbers: (editingProblem as any).jvnNumbers || [],
      } as Problem; // Type assertion for submission

      if (editingProblem.id) {
        await updateProblem(editingProblem.id, problemToSave);
        setNotification({ message: '問題が正常に更新されました。', type: NotificationType.SUCCESS });
      } else {
        const newProblemData = {
            ...problemToSave,
            reportedBy: problemToSave.reportedBy || user.username,
            systemTargets: (problemToSave as any).systemTargets || [],
            jvnNumbers: (problemToSave as any).jvnNumbers || []
        } as Omit<Problem, 'id'|'createdAt'|'updatedAt'>;
        await createProblem(newProblemData);
        setNotification({ message: '問題が正常に登録されました。', type: NotificationType.SUCCESS });
      }
      fetchData();
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
            fetchData(); 
        } catch (error: any) {
            console.error("Failed to delete problem:", error);
            setNotification({ message: `問題の削除に失敗しました: ${error.message}`, type: NotificationType.ERROR });
        }
    }
  };

  const columns: Array<{ Header: string; accessor: keyof Problem | ((row: Problem) => ReactNode) }> = [
    { 
      Header: 'No', 
      accessor: (row) => <span className="font-mono text-sm text-gray-600">{(currentPage - 1) * itemsPerPage + (filteredAndPaginatedProblems.indexOf(row) + 1)}#</span> 
    },
    { 
      Header: 'ITサービス・ITシステム対象', 
      accessor: (row) => (
        <div className="max-w-sm min-h-[2rem]">
          <div className="flex flex-wrap gap-1">
            {(row as any).systemTargets?.map((target: string, index: number) => (
              <span key={index} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                {target}
              </span>
            )) || <span className="text-gray-400 text-xs italic">対象未設定</span>}
          </div>
        </div>
      )
    },
    { Header: 'タイトル', accessor: 'title' },
    { Header: 'ステータス', accessor: (row) => itemStatusToJapanese(row.status) },
    { Header: '優先度', accessor: (row) => priorityToJapanese(row.priority) },
    { 
      Header: '関連インシデント・脆弱性', 
      accessor: (row) => (
        <div className="max-w-xs min-h-[3rem] space-y-1">
          <div className="text-xs">
            <span className="font-medium text-gray-700">インシデント:</span>
            <div className="mt-0.5">
              {row.relatedIncidents.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {row.relatedIncidents.map((incId, index) => (
                    <span key={index} className="inline-block bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                      {incId}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 italic">なし</span>
              )}
            </div>
          </div>
          <div className="text-xs">
            <span className="font-medium text-gray-700">JVN:</span>
            <div className="mt-0.5">
              {(row as any).jvnNumbers?.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {(row as any).jvnNumbers.map((jvn: string, index: number) => (
                    <a 
                      key={index}
                      href={`https://jvndb.jvn.jp/ja/contents/2024/JVNDB-${jvn.replace('JVNDB-', '')}.html`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full whitespace-nowrap hover:bg-orange-200 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {jvn}
                    </a>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 italic">なし</span>
              )}
            </div>
          </div>
        </div>
      )
    },
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
            <div><strong>JVN登録番号:</strong> 
              {(problem as any).jvnNumbers?.length > 0 ? (
                <div className="mt-1">
                  {(problem as any).jvnNumbers.map((jvn: string, index: number) => (
                    <div key={index} className="inline-block mr-2 mb-1">
                      <a 
                        href={`https://jvndb.jvn.jp/ja/contents/2024/JVNDB-${jvn.replace('JVNDB-', '')}.html`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {jvn}
                      </a>
                    </div>
                  ))}
                </div>
              ) : 'なし'}
            </div>
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
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">問題となっているITサービス・ITシステム対象 (複数選択可)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border p-2 rounded">
                {systemTargetOptions.map(target => (
                  <label key={target} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      value={target}
                      checked={(editingProblem as any).systemTargets?.includes(target)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const currentTargets = (editingProblem as any).systemTargets || [];
                        if (checked) {
                          setEditingProblem({ ...editingProblem, systemTargets: [...currentTargets, target] } as any);
                        } else {
                          setEditingProblem({ ...editingProblem, systemTargets: currentTargets.filter((s: string) => s !== target) } as any);
                        }
                      }}
                      className="form-checkbox h-4 w-4 text-green-600 border-slate-300 rounded focus:ring-green-500"
                    />
                    <span>{target}</span>
                  </label>
                ))}
              </div>
               <Input 
                  label="ITサービス・ITシステム対象 (手入力、カンマ区切り)" 
                  name="systemTargetsManual" 
                  value={(editingProblem as any).systemTargets?.join(', ') || ''} 
                  onChange={(e) => setEditingProblem({ ...editingProblem, systemTargets: e.target.value.split(',').map(s => s.trim()).filter(s => s) } as any)}
                  placeholder="例: 顧客ポータル, サーバー, ソフトウェア"
                />
            </div>
            
            <Textarea label="説明" name="description" value={editingProblem.description || ''} onChange={handleInputChange} required rows={3}/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="ステータス" name="status" value={editingProblem.status || 'Logged'} onChange={handleInputChange} options={problemStatusesOptions.map(s => ({value: s, label: itemStatusToJapanese(s)}))} required/>
                <Select label="優先度" name="priority" value={editingProblem.priority || 'Medium'} onChange={handleInputChange} options={prioritiesOptions.map(p => ({value: p, label: priorityToJapanese(p)}))} required/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">関連インシデント・脆弱性情報</label>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">関連インシデント (インシデント管理から選択)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto border p-2 rounded mb-2">
                    {availableIncidents.map(incident => (
                      <label key={incident.id} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          value={incident.id}
                          checked={editingProblem.relatedIncidents?.includes(incident.id)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const currentIncidents = editingProblem.relatedIncidents || [];
                            if (checked) {
                              setEditingProblem({ ...editingProblem, relatedIncidents: [...currentIncidents, incident.id] });
                            } else {
                              setEditingProblem({ ...editingProblem, relatedIncidents: currentIncidents.filter(id => id !== incident.id) });
                            }
                          }}
                          className="form-checkbox h-4 w-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                        />
                        <span className="flex-1">
                          <span className="font-mono text-xs bg-red-100 text-red-800 px-1 rounded">{incident.id}</span>
                          <span className="ml-1 text-xs">{incident.title?.substring(0, 25)}{incident.title?.length > 25 ? '...' : ''}</span>
                        </span>
                      </label>
                    ))}
                    {availableIncidents.length === 0 && (
                      <p className="text-gray-400 text-xs italic p-2">インシデントが登録されていません</p>
                    )}
                  </div>
                  <Input 
                    label="関連インシデントID (手入力・カンマ区切り)" 
                    name="relatedIncidentsManual" 
                    value={editingProblem.relatedIncidents?.join(', ') || ''} 
                    onChange={(e) => setEditingProblem({ ...editingProblem, relatedIncidents: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                    placeholder="例: INC001, INC005"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ※ インシデント管理で登録されたIDと連携します
                  </p>
                </div>
                <Input 
                  label="JVN登録番号 (脆弱性対策情報データベース)" 
                  name="jvnNumbers" 
                  value={(editingProblem as any).jvnNumbers?.join(', ') || ''} 
                  onChange={(e) => setEditingProblem({ ...editingProblem, jvnNumbers: e.target.value.split(',').map(s => s.trim()).filter(s => s) } as any)}
                  placeholder="例: JVNDB-2024-000001, JVNDB-2024-000002"
                />
                <div className="text-xs text-gray-500">
                  <p>※ JVN登録番号は <a href="https://jvndb.jvn.jp/index.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">脆弱性対策情報データベース(JVN iPedia)</a> から取得してください</p>
                  <p>※ 形式: JVNDB-YYYY-NNNNNN (例: JVNDB-2024-000001)</p>
                </div>
              </div>
            </div>
            <Textarea label="暫定対処 (ワークアラウンド)" name="workaround" value={editingProblem.workaround || ''} onChange={handleInputChange} rows={3}/>
            <Textarea label="根本原因分析" name="rootCauseAnalysis" value={editingProblem.rootCauseAnalysis || ''} onChange={handleInputChange} rows={3}/>
            <Textarea label="恒久対策 (解決策)" name="solution" value={editingProblem.solution || ''} onChange={handleInputChange} rows={3}/>
             <div className="flex items-center">
                <input type="checkbox" id="knownErrorModal" name="knownError" checked={!!editingProblem.knownError} onChange={handleInputChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>
                <label htmlFor="knownErrorModal" className="ml-2 block text-sm text-gray-900">既知のエラーとしてマーク</label>
            </div>
            <Input label="報告者/発見元 (必須)" name="reportedBy" value={editingProblem.reportedBy || user?.username || ''} onChange={handleInputChange} required disabled={!!editingProblem.id && !!editingProblem.reportedBy}/>
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
