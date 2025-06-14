
import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { Asset, UserRole } from '../types';
import { getAssets, addAsset, updateAsset, deleteAsset } from '../services/mockItsmService';
import { Button, Table, Modal, Input, Select, Spinner, Card, Notification, NotificationType } from '../components/CommonUI';
import { useAuth }from '../contexts/AuthContext';
import { assetTypeToJapanese, assetStatusToJapanese } from '../localization';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AssetPage: React.FC = () => {
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Partial<Asset> | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const { user } = useAuth();

  const assetTypes: Array<Asset['type']> = ['Hardware', 'Software', 'License', 'Other'];
  const assetStatuses: Array<Asset['status']> = ['In Use', 'In Stock', 'Retired', 'Maintenance'];

  // Filters State
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [ownerFilter, setOwnerFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const itemsPerPageOptions = [
    { value: 10, label: '10件' },
    { value: 25, label: '25件' },
    { value: 50, label: '50件' },
    { value: 100, label: '100件' },
  ];

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAssets();
      setAllAssets(data.sort((a,b) => (a.name > b.name) ? 1 : -1)); // Sort by name initially
    } catch (error) {
      console.error("Failed to fetch assets:", error);
      setNotification({ message: '資産の読み込みに失敗しました。', type: NotificationType.ERROR });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Filter options
  const typeOptions = useMemo(() => [
    { value: '', label: 'すべての種類' },
    ...assetTypes.map(t => ({ value: t, label: assetTypeToJapanese(t) }))
  ], [assetTypes]);

  const statusOptions = useMemo(() => [
    { value: '', label: 'すべてのステータス' },
    ...assetStatuses.map(s => ({ value: s, label: assetStatusToJapanese(s) }))
  ], [assetStatuses]);

  const ownerOptions = useMemo(() => {
    const allOwners = allAssets.map(asset => asset.assignedTo).filter(Boolean) as string[];
    const uniqueOwners = Array.from(new Set(allOwners));
    return [{ value: '', label: 'すべての所有者' }, ...uniqueOwners.map(name => ({ value: name, label: name }))];
  }, [allAssets]);

  const locationOptions = useMemo(() => {
    const allLocations = allAssets.map(asset => asset.location).filter(Boolean) as string[];
    const uniqueLocations = Array.from(new Set(allLocations));
    return [{ value: '', label: 'すべての場所' }, ...uniqueLocations.map(name => ({ value: name, label: name }))];
  }, [allAssets]);

  const clearFilters = () => {
    setTypeFilter('');
    setStatusFilter('');
    setOwnerFilter('');
    setLocationFilter('');
    setCurrentPage(1);
  };
  
  const filteredAssets = useMemo(() => {
    let filtered = [...allAssets];
    if (typeFilter) filtered = filtered.filter(asset => asset.type === typeFilter);
    if (statusFilter) filtered = filtered.filter(asset => asset.status === statusFilter);
    if (ownerFilter) filtered = filtered.filter(asset => asset.assignedTo === ownerFilter);
    if (locationFilter) filtered = filtered.filter(asset => asset.location === locationFilter);
    return filtered;
  }, [allAssets, typeFilter, statusFilter, ownerFilter, locationFilter]);

  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAssets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAssets, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);

  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); 
  };


  // Dashboard Data
  const totalAssetsCount = allAssets.length;
  const assetTypeDistribution = useMemo(() => {
    const counts: { [key: string]: number } = {};
    allAssets.forEach(asset => {
      counts[asset.type] = (counts[asset.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: assetTypeToJapanese(name as Asset['type']), // Japanese name for display
      value,
      fill: name === 'Hardware' ? '#3B82F6' : name === 'Software' ? '#10B981' : name === 'License' ? '#F59E0B' : '#6B7280'
    }));
  }, [allAssets]);


  const handleOpenModal = (asset?: Asset) => {
    setEditingAsset(asset ? { ...asset } : { name: '', type: 'Hardware', status: 'In Stock' });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAsset(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (editingAsset) {
      setEditingAsset({ ...editingAsset, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;

    try {
      if (editingAsset.id) {
        await updateAsset(editingAsset.id, editingAsset as Asset);
        setNotification({ message: '資産が正常に更新されました。', type: NotificationType.SUCCESS });
      } else {
        await addAsset(editingAsset as Omit<Asset, 'id'>);
        setNotification({ message: '資産が正常に作成されました。', type: NotificationType.SUCCESS });
      }
      fetchAssets();
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save asset:", error);
      setNotification({ message: '資産の保存に失敗しました。', type: NotificationType.ERROR });
    }
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm('この資産を削除してもよろしいですか？この操作は元に戻せません。')) {
      try {
        await deleteAsset(id);
        setNotification({ message: '資産が正常に削除されました。', type: NotificationType.SUCCESS });
        fetchAssets();
      } catch (error) {
        console.error("Failed to delete asset:", error);
        setNotification({ message: '資産の削除に失敗しました。', type: NotificationType.ERROR });
      }
    }
  };

  const columns: Array<{ Header: string; accessor: keyof Asset | ((row: Asset) => ReactNode) }> = [
    { Header: 'ID', accessor: (row: Asset) => <span className="font-mono text-xs">{row.id.slice(0,8)}...</span> },
    { Header: '資産名', accessor: 'name' },
    { Header: '種類', accessor: (row: Asset) => assetTypeToJapanese(row.type) },
    { Header: 'ステータス', accessor: (row: Asset) => assetStatusToJapanese(row.status) },
    { Header: '割り当て先', accessor: 'assignedTo' },
    { Header: '場所', accessor: 'location' },
    { Header: '操作', accessor: (row: Asset) => (
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
        <h2 className="text-3xl font-semibold text-slate-800">資産管理 (CMDB)</h2>
        {user?.role === UserRole.ADMIN && <Button onClick={() => handleOpenModal()}>新規資産追加</Button>}
      </div>

      {/* Asset Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="総資産数" className="md:col-span-1 text-center">
          {isLoading ? <Spinner /> : (
            <>
              <div className="text-5xl mb-1 text-slate-500" aria-hidden="true">🗄️</div>
              <p className="text-4xl font-bold text-blue-600">{totalAssetsCount}</p>
            </>
          )}
        </Card>
        <Card title="資産タイプ別分布" className="md:col-span-2">
          {isLoading ? <Spinner /> : assetTypeDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie 
                  data={assetTypeDistribution} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={70} // Reduced slightly to give more space for labels if needed
                  labelLine={true} // Changed to true to draw lines to labels
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                    {assetTypeDistribution.map((entry) => <Cell key={`cell-${entry.name}`} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{fontSize: '0.8rem'}}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 italic p-4 text-center">資産タイプデータがありません。</p>
          )}
        </Card>
      </div>

      {/* Asset Filters */}
      <Card title="資産フィルター">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4">
          <Select label="種類" value={typeFilter} onChange={e => {setTypeFilter(e.target.value); setCurrentPage(1);}} options={typeOptions} />
          <Select label="ステータス" value={statusFilter} onChange={e => {setStatusFilter(e.target.value); setCurrentPage(1);}} options={statusOptions} />
          <Select label="所有者" value={ownerFilter} onChange={e => {setOwnerFilter(e.target.value); setCurrentPage(1);}} options={ownerOptions} />
          <Select label="場所" value={locationFilter} onChange={e => {setLocationFilter(e.target.value); setCurrentPage(1);}} options={locationOptions} />
          <div className="flex items-end">
            <Button onClick={clearFilters} variant="secondary" className="w-full">フィルタークリア</Button>
          </div>
        </div>
      </Card>

      <Card title="IT資産一覧">
        {isLoading ? (
            <div className="flex justify-center p-8"><Spinner size="lg" /></div>
         ) : (
            <>
                <Table<Asset> columns={columns} data={paginatedAssets} onRowClick={handleOpenModal}/>
                {filteredAssets.length > 0 && (
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
                            {filteredAssets.length}件中 {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAssets.length)}-{Math.min(currentPage * itemsPerPage, filteredAssets.length)}件表示
                        </span>
                        </div>
                        <div className="flex items-center space-x-2">
                        <Button onClick={handlePrevPage} disabled={currentPage === 1} size="sm">前へ</Button>
                        <span className="text-sm text-slate-700">ページ {currentPage} / {totalPages || 1}</span>
                        <Button onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0} size="sm">次へ</Button>
                        </div>
                    </div>
                )}
                {filteredAssets.length === 0 && !isLoading && (
                    <p className="p-4 text-slate-500 italic">条件に一致する資産はありません。</p>
                )}
            </>
         )
        }
      </Card>

      {editingAsset && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingAsset.id ? '資産編集' : '新規資産作成'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="資産名" name="name" value={editingAsset.name || ''} onChange={handleInputChange} required />
            <Select 
              label="資産の種類" 
              name="type" 
              value={editingAsset.type || 'Hardware'} 
              onChange={handleInputChange} 
              options={assetTypes.map(t => ({ value: t, label: assetTypeToJapanese(t) }))} 
            />
            <Input label="シリアル番号 (任意)" name="serialNumber" value={editingAsset.serialNumber || ''} onChange={handleInputChange} />
            <Select 
              label="ステータス" 
              name="status" 
              value={editingAsset.status || 'In Stock'} 
              onChange={handleInputChange} 
              options={assetStatuses.map(s => ({ value: s, label: assetStatusToJapanese(s) }))} 
            />
            <Input label="割り当て先 (任意)" name="assignedTo" value={editingAsset.assignedTo || ''} onChange={handleInputChange} />
            <Input label="場所 (任意)" name="location" value={editingAsset.location || ''} onChange={handleInputChange} />
            <Input label="メーカー (任意)" name="manufacturer" value={editingAsset.manufacturer || ''} onChange={handleInputChange} />
            <Input label="モデル (任意)" name="model" value={editingAsset.model || ''} onChange={handleInputChange} />
            <Input label="購入日 (任意)" type="date" name="purchaseDate" value={editingAsset.purchaseDate ? new Date(editingAsset.purchaseDate).toISOString().split('T')[0] : ''} onChange={handleInputChange} />
            
            {editingAsset.type === 'Software' || editingAsset.type === 'License' ? (
              <>
                <Input label="ライセンスキー (任意)" name="licenseKey" value={editingAsset.licenseKey || ''} onChange={handleInputChange} />
                <Input label="有効期限 (任意)" type="date" name="expiryDate" value={editingAsset.expiryDate ? new Date(editingAsset.expiryDate).toISOString().split('T')[0] : ''} onChange={handleInputChange} />
              </>
            ) : null}

            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>キャンセル</Button>
              <Button type="submit" variant="primary">資産保存</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AssetPage;
