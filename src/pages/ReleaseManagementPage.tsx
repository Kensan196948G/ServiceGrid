
import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { Release, ItemStatus, UserRole, ReleaseType } from '../types';
import { getReleases, createRelease, updateRelease, deleteRelease as deleteReleaseAPI } from '../services/releaseApiService';
import { Button, Table, Modal, Input, Textarea, Select, Spinner, Card, Notification, NotificationType } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { itemStatusToJapanese, releaseTypeToJapanese, releaseTypeToIcon, assetTypeToJapanese } from '../localization'; 

const ReleaseManagementPage: React.FC = () => {
  const [allReleases, setAllReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Partial<Release> | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const { user } = useAuth();

  const releaseStatusesOptions = [ItemStatus.PLANNED, ItemStatus.BUILDING, ItemStatus.TESTING, ItemStatus.PENDING_APPROVAL, ItemStatus.SCHEDULED, ItemStatus.DEPLOYED, ItemStatus.ROLLED_BACK, ItemStatus.CLOSED];
  const releaseTypes: ReleaseType[] = ['Major', 'Minor', 'Patch', 'Emergency', 'Maintenance'];
  
  // リリース対象資産オプション（資産の種類 + ITサービス）
  const releaseTargetOptions = [
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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>(''); // YYYY-MM-DD for plannedDeploymentDate
  const [leadFilter, setLeadFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('');


  // Pagination State for List
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const itemsPerPageOptions = [
    { value: 10, label: '10件' },
    { value: 25, label: '25件' },
    { value: 50, label: '50件' },
    { value: 100, label: '100件' },
  ];

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());


  const fetchReleases = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getReleases();
      setAllReleases(data); // Already sorted by plannedDeploymentDate desc in service
    } catch (error) {
      console.error("リリース計画の読み込みに失敗:", error);
      setNotification({ message: 'リリース計画の読み込みに失敗しました。', type: NotificationType.ERROR });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  // Filter Options
  const uniqueDeploymentLeads = useMemo(() => {
    const leads = new Set(allReleases.map(r => r.deploymentLead).filter(Boolean) as string[]);
    return [{ value: '', label: 'すべての担当者'}, ...Array.from(leads).map(l => ({ value: l, label: l}))];
  }, [allReleases]);

  const statusOptionsForFilter = useMemo(() => [
    { value: '', label: 'すべてのステータス' },
    ...releaseStatusesOptions.map(s => ({ value: s, label: itemStatusToJapanese(s) }))
  ], []);


  // Filtered and Paginated List Data
  const filteredReleases = useMemo(() => {
    return allReleases.filter(r => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ? 
        r.id.toLowerCase().includes(searchLower) ||
        r.version.toLowerCase().includes(searchLower) ||
        r.title.toLowerCase().includes(searchLower) : true;
      const matchesStatus = statusFilter ? r.status === statusFilter : true;
      const matchesDate = dateFilter ? r.plannedDeploymentDate.startsWith(dateFilter) : true;
      const matchesLead = leadFilter ? r.deploymentLead === leadFilter : true;
      const matchesService = serviceFilter ? r.servicesAffected.join(', ').toLowerCase().includes(serviceFilter.toLowerCase()) : true;
      
      return matchesSearch && matchesStatus && matchesDate && matchesLead && matchesService;
    });
  }, [allReleases, searchTerm, statusFilter, dateFilter, leadFilter, serviceFilter]);

  const paginatedReleases = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReleases.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReleases, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(filteredReleases.length / itemsPerPage);

  // Calendar Data and Functions
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay(); // 0 = Sunday

  const releasesByDayForCalendar = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const releasesMap: { [key: string]: Release[] } = {};
    allReleases.forEach(release => {
      const releaseDate = new Date(release.plannedDeploymentDate);
      if (releaseDate.getFullYear() === year && releaseDate.getMonth() === month) {
        const dayKey = releaseDate.toISOString().split('T')[0];
        if (!releasesMap[dayKey]) releasesMap[dayKey] = [];
        releasesMap[dayKey].push(release);
      }
    });
    return releasesMap;
  }, [allReleases, calendarDate]);
  
  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month); // 0 for Sunday, 1 for Monday, etc.
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    
    const blanks = Array(firstDay).fill(null);
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const totalSlots = [...blanks, ...daysArray];
    const today = new Date();
    today.setHours(0,0,0,0);

    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <Button size="sm" onClick={() => setCalendarDate(new Date(year, month - 1, 1))}>&lt; 前月</Button>
          <h3 className="text-xl font-semibold">{year}年 {month + 1}月</h3>
          <Button size="sm" onClick={() => setCalendarDate(new Date(year, month + 1, 1))}>次月 &gt;</Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {dayNames.map(day => <div key={day} className="font-semibold p-1">{day}</div>)}
          {totalSlots.map((day, index) => {
            if (!day) return <div key={`blank-${index}`} className="border rounded-md p-1 min-h-[80px]"></div>;
            const dateKey = new Date(year, month, day).toISOString().split('T')[0];
            const dayReleases = releasesByDayForCalendar[dateKey] || [];
            const isCurrentDay = new Date(year, month, day).getTime() === today.getTime();
            
            return (
              <div key={day} className={`border rounded-md p-1 min-h-[80px] ${isCurrentDay ? 'bg-blue-100 border-blue-300' : 'bg-slate-50'}`}>
                <div className={`font-medium ${isCurrentDay ? 'text-blue-700' : ''}`}>{day}</div>
                <div className="mt-1 space-y-0.5 text-xs overflow-y-auto max-h-[60px]">
                  {dayReleases.map(r => (
                    <div key={r.id} title={`${releaseTypeToJapanese(r.releaseType)}: ${r.title} (v${r.version})`} className="truncate cursor-pointer hover:bg-slate-200 p-0.5 rounded" onClick={() => handleOpenModal(r)}>
                      {releaseTypeToIcon(r.releaseType)} <span className="hidden sm:inline">{r.title.substring(0,10)}{r.title.length > 10 ? '...' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Upcoming Releases (next 30 days)
  const upcomingReleaseList = useMemo(() => {
    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);
    return allReleases
      .filter(r => {
        const plannedDate = new Date(r.plannedDeploymentDate);
        return plannedDate >= today && plannedDate <= thirtyDaysLater && r.status !== ItemStatus.DEPLOYED && r.status !== ItemStatus.ROLLED_BACK && r.status !== ItemStatus.CLOSED;
      })
      .sort((a,b) => new Date(a.plannedDeploymentDate).getTime() - new Date(b.plannedDeploymentDate).getTime())
      .slice(0, 5); // Show top 5
  }, [allReleases]);


  const handleOpenModal = (release?: Release) => {
    setEditingRelease(release ? { ...release, servicesAffected: release.servicesAffected || [] } : { 
      version: '', 
      title: '', 
      description: '', 
      status: ItemStatus.PLANNED, 
      releaseType: 'Minor',
      plannedDeploymentDate: new Date().toISOString().split('T')[0],
      servicesAffected: [],
      rolloutPlan: '',
      deploymentLead: user?.username || ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRelease(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (editingRelease) {
      const { name, value } = e.target;
      if (name === "plannedDeploymentDate" || name === "actualDeploymentDate") {
         setEditingRelease({ ...editingRelease, [name]: value ? new Date(value).toISOString() : undefined });
      }
      else {
        setEditingRelease({ ...editingRelease, [name]: value });
      }
    }
  };

   const handleServicesAffectedChange = (selectedOptions: string[]) => {
    if (editingRelease) {
      setEditingRelease({ ...editingRelease, servicesAffected: selectedOptions });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRelease || !user) return;

    try {
      const releaseToSave = {
        ...editingRelease,
        plannedDeploymentDate: editingRelease.plannedDeploymentDate ? new Date(editingRelease.plannedDeploymentDate).toISOString() : new Date().toISOString(),
        actualDeploymentDate: editingRelease.actualDeploymentDate ? new Date(editingRelease.actualDeploymentDate).toISOString() : undefined,
        servicesAffected: editingRelease.servicesAffected || [],
        deploymentLead: editingRelease.deploymentLead || user.username,
      } as Release;

      if (editingRelease.id) {
        await updateRelease(editingRelease.id, releaseToSave);
        setNotification({ message: 'リリース計画が正常に更新されました。', type: NotificationType.SUCCESS });
      } else {
        await createRelease(releaseToSave as Omit<Release, 'id'|'createdAt'|'updatedAt'>);
        setNotification({ message: 'リリース計画が正常に作成されました。', type: NotificationType.SUCCESS });
      }
      fetchReleases();
      handleCloseModal();
    } catch (error) {
      console.error("リリース計画の保存に失敗:", error);
      setNotification({ message: 'リリース計画の保存に失敗しました。', type: NotificationType.ERROR });
    }
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm('このリリース計画を削除してもよろしいですか？')) {
        try {
            await deleteReleaseAPI(id);
            setNotification({ message: 'リリース計画が正常に削除されました。', type: NotificationType.SUCCESS });
            fetchReleases();
        } catch (error) {
            console.error("Failed to delete release:", error);
            setNotification({ message: 'リリース計画の削除に失敗しました。', type: NotificationType.ERROR });
        }
    }
  };

  const listColumns: Array<{ Header: string; accessor: keyof Release | ((row: Release) => ReactNode) }> = [
    { 
      Header: 'No', 
      accessor: (row, index) => <span className="font-mono text-sm text-gray-600">{(currentPage - 1) * itemsPerPage + (paginatedReleases.indexOf(row) + 1)}#</span> 
    },
    { 
      Header: 'リリース対象', 
      accessor: (row) => (
        <div className="max-w-sm min-h-[3rem]">
          <div className="flex flex-wrap gap-1">
            {row.servicesAffected.map((target, index) => (
              <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                {target}
              </span>
            ))}
            {row.servicesAffected.length === 0 && (
              <span className="text-gray-400 text-xs italic">対象未設定</span>
            )}
          </div>
        </div>
      )
    },
    { Header: 'バージョン', accessor: (row) => <span className="font-mono text-sm font-semibold text-indigo-600">{row.version}</span> },
    { Header: 'タイトル', accessor: 'title' },
    { Header: 'ステータス', accessor: (row) => itemStatusToJapanese(row.status) },
    { Header: 'リリース日', accessor: (row) => new Date(row.plannedDeploymentDate).toLocaleDateString() },
    { Header: '担当者', accessor: (row) => row.deploymentLead || 'N/A' },
    { Header: 'アクション', accessor: (row) => (
      <div className="flex items-center space-x-2">
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenModal(row);}}>編集</Button>
        {user?.role === UserRole.ADMIN && <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(row.id);}}>削除</Button>}
      </div>
    )},
  ];

  return (
    <div className="space-y-6 pb-10">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-slate-800">リリース管理</h2>
        {user?.role === UserRole.ADMIN && <Button onClick={() => handleOpenModal()}>新規リリース計画登録</Button>}
      </div>

      {/* Release Calendar */}
      <Card title="リリースカレンダー">
        {isLoading ? <Spinner /> : renderCalendar()}
      </Card>

      {/* Upcoming Releases */}
      <Card title="今後のリリース予定 (30日以内)">
        {isLoading ? <Spinner /> : upcomingReleaseList.length > 0 ? (
          <ul className="space-y-2">
            {upcomingReleaseList.map(r => (
              <li key={r.id} className="p-2 bg-slate-50 rounded-md shadow-sm hover:bg-slate-100 cursor-pointer" onClick={() => handleOpenModal(r)}>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-blue-700">{releaseTypeToIcon(r.releaseType)} {r.title} (v{r.version})</span>
                  <span className="text-xs text-slate-500">{new Date(r.plannedDeploymentDate).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-slate-600">担当: {r.deploymentLead || '未定'} | ステータス: {itemStatusToJapanese(r.status)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 italic">今後30日以内に計画されている主要なリリースはありません。</p>
        )}
      </Card>

      {/* Filters for List */}
       <Card title="リリース計画フィルター">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 p-4 items-end">
          <Input label="検索" placeholder="ID, バージョン, タイトル..." value={searchTerm} onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}} />
          <Select label="ステータス" value={statusFilter} onChange={e => {setStatusFilter(e.target.value); setCurrentPage(1);}} options={statusOptionsForFilter} />
          <Input label="リリース日" type="date" value={dateFilter} onChange={e => {setDateFilter(e.target.value); setCurrentPage(1);}} />
          <Input label="リリース対象" placeholder="対象名..." value={serviceFilter} onChange={e => {setServiceFilter(e.target.value); setCurrentPage(1);}} />
          <Select label="担当者" value={leadFilter} onChange={e => {setLeadFilter(e.target.value); setCurrentPage(1);}} options={uniqueDeploymentLeads} />
          <Button onClick={() => { setSearchTerm(''); setStatusFilter(''); setDateFilter(''); setLeadFilter(''); setServiceFilter(''); setCurrentPage(1);}} variant="secondary" className="w-full">フィルタークリア</Button>
        </div>
      </Card>

      {/* Release List Table */}
      <Card title="リリース計画一覧">
        {isLoading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> : 
        paginatedReleases.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table<Release> columns={listColumns} data={paginatedReleases} onRowClick={handleOpenModal}/>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center p-4 border-t border-slate-200">
                <div className="mb-2 md:mb-0">
                <Select
                    label="表示件数:"
                    value={itemsPerPage}
                    onChange={e => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}}
                    options={itemsPerPageOptions}
                    className="inline-block w-auto"
                />
                <span className="ml-2 text-sm text-slate-600">
                    {filteredReleases.length}件中 {Math.min((currentPage - 1) * itemsPerPage + 1, filteredReleases.length)}-{Math.min(currentPage * itemsPerPage, filteredReleases.length)}件表示
                </span>
                </div>
                <div className="flex items-center space-x-2">
                <Button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} size="sm">前へ</Button>
                <span className="text-sm text-slate-700">ページ {currentPage} / {totalPages || 1}</span>
                <Button onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p+1))} disabled={currentPage === totalPages || totalPages === 0} size="sm">次へ</Button>
                </div>
            </div>
          </>
        ) : (
          <p className="p-4 text-slate-500 italic">条件に一致するリリース計画はありません。</p>
        )}
      </Card>

      {editingRelease && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingRelease.id ? 'リリース計画編集' : '新規リリース計画登録'} size="xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="バージョン" name="version" value={editingRelease.version || ''} onChange={handleInputChange} required placeholder="例: v1.2.3"/>
                <Input label="タイトル" name="title" value={editingRelease.title || ''} onChange={handleInputChange} required />
            </div>
            <Textarea label="説明" name="description" value={editingRelease.description || ''} onChange={handleInputChange} required rows={3}/>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="計画展開日" name="plannedDeploymentDate" type="date" value={editingRelease.plannedDeploymentDate ? new Date(editingRelease.plannedDeploymentDate).toISOString().split('T')[0] : ''} onChange={handleInputChange} required />
                <Select label="ステータス" name="status" value={editingRelease.status || ItemStatus.PLANNED} onChange={handleInputChange} options={releaseStatusesOptions.map(s => ({value: s, label: itemStatusToJapanese(s)}))} required/>
                <Select label="リリースタイプ" name="releaseType" value={editingRelease.releaseType || 'Minor'} onChange={handleInputChange} options={releaseTypes.map(rt => ({ value: rt, label: releaseTypeToJapanese(rt) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">リリース対象（ITサービス・システム・資産）(複数選択可)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border p-2 rounded">
                {releaseTargetOptions.map(target => (
                  <label key={target} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      value={target}
                      checked={editingRelease.servicesAffected?.includes(target)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const currentTargets = editingRelease.servicesAffected || [];
                        if (checked) {
                          handleServicesAffectedChange([...currentTargets, target]);
                        } else {
                          handleServicesAffectedChange(currentTargets.filter(s => s !== target));
                        }
                      }}
                      className="form-checkbox h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span>{target}</span>
                  </label>
                ))}
              </div>
               <Input 
                  label="リリース対象 (手入力、カンマ区切り)" 
                  name="servicesAffectedManual" 
                  value={editingRelease.servicesAffected?.join(', ') || ''} 
                  onChange={(e) => handleServicesAffectedChange(e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                  placeholder="例: 顧客ポータル, サーバー, ソフトウェア"
                />
            </div>

            <Textarea label="ロールアウト計画" name="rolloutPlan" value={editingRelease.rolloutPlan || ''} onChange={handleInputChange} required rows={3}/>
            <Textarea label="ロールバック計画 (任意)" name="rollbackPlan" value={editingRelease.rollbackPlan || ''} onChange={handleInputChange} rows={3}/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input 
                    label="テストリード責任者 (任意)" 
                    name="testLead" 
                    value={editingRelease.testLead || ''} 
                    onChange={handleInputChange} 
                    placeholder="テスト統括責任者"
                  />
                  <p className="text-xs text-gray-500 mt-1">※テスト計画策定・実行管理・UAT調整を行う責任者</p>
                </div>
                <div>
                  <Input 
                    label="本番展開リード責任者" 
                    name="deploymentLead" 
                    value={editingRelease.deploymentLead || ''} 
                    onChange={handleInputChange} 
                    placeholder="展開実行責任者"
                  />
                  <p className="text-xs text-gray-500 mt-1">※本番展開・監視・ロールバック判断を行う責任者</p>
                </div>
            </div>
             {editingRelease.id && <Input label="実績展開日 (任意)" name="actualDeploymentDate" type="date" value={editingRelease.actualDeploymentDate ? new Date(editingRelease.actualDeploymentDate).toISOString().split('T')[0] : ''} onChange={handleInputChange} />}


            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>キャンセル</Button>
              <Button type="submit" variant="primary">{editingRelease.id ? '更新' : '登録'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ReleaseManagementPage;
