
import React, { useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import { Asset, UserRole } from '../types';
import { getAssets as getAssetsApi, createAsset as addAsset, updateAsset, deleteAsset, getErrorMessage, generateAssetTag } from '../services/assetApiService';
import { Button, Table, Modal, Input, Select, Spinner, Card, Notification, NotificationType } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { assetTypeToJapanese, assetStatusToJapanese } from '../localization';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from '../components/ChartPlaceholder';
import { exportToCsv, importFromCsv, ASSET_CSV_HEADERS, CsvValidationError } from '../utils/csvUtils';
import { validateForm, ASSET_VALIDATION_RULES, ValidationError } from '../utils/formValidation';

const AssetPage: React.FC = () => {
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Partial<Asset> | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const { user } = useAuth();
  
  // CSV Import/Export state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importErrors, setImportErrors] = useState<CsvValidationError[]>([]);
  const [importData, setImportData] = useState<Partial<Asset>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const assetTypes: Array<Asset['type']> = [
    'Server', 'Desktop', 'Laptop', 'Tablet', 'Phone',
    'Network Equipment', 'Storage', 'Printer', 'Monitor', 'Peripheral',
    'Software', 'License', 'Virtual Machine', 'Cloud Service', 'Other'
  ];
  const assetStatuses: Array<Asset['status']> = ['Active', 'Inactive', 'Maintenance', 'Retired'];

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
      const response = await getAssetsApi(currentPage, itemsPerPage);
      setAllAssets(response.assets.sort((a,b) => parseInt(a.id) - parseInt(b.id))); // Sort by ID
    } catch (error) {
      console.error("Failed to fetch assets:", error);
      setNotification({ message: `資産の読み込みに失敗しました: ${getErrorMessage(error)}`, type: NotificationType.ERROR });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage]);

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
    
    const colorMap: { [key: string]: string } = {
      'Server': '#3B82F6',           // Blue
      'Desktop': '#8B5CF6',          // Purple
      'Laptop': '#06B6D4',           // Cyan
      'Tablet': '#84CC16',           // Lime
      'Phone': '#EAB308',            // Yellow
      'Network Equipment': '#F97316', // Orange
      'Storage': '#EF4444',          // Red
      'Printer': '#EC4899',          // Pink
      'Monitor': '#6366F1',          // Indigo
      'Peripheral': '#14B8A6',       // Teal
      'Software': '#10B981',         // Emerald
      'License': '#F59E0B',          // Amber
      'Virtual Machine': '#8B5CF6',  // Violet
      'Cloud Service': '#06B6D4',    // Sky
      'Other': '#6B7280'             // Gray
    };
    
    return Object.entries(counts).map(([name, value]) => ({
      name: assetTypeToJapanese(name as Asset['type']),
      value,
      fill: colorMap[name] || '#6B7280'
    }));
  }, [allAssets]);


  const handleOpenModal = (asset?: Asset) => {
    setEditingAsset(asset ? { ...asset } : { 
      assetTag: '', 
      name: '', 
      type: 'Server', 
      status: 'Active',
      category: 'Hardware'
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAsset(null);
    setValidationErrors({});
    setTouchedFields({});
  };

  const validateField = (fieldName: string, value: any) => {
    const rules = ASSET_VALIDATION_RULES[fieldName as keyof typeof ASSET_VALIDATION_RULES];
    if (!rules) return null;
    
    if (rules.required && (!value || String(value).trim() === '')) {
      return `${getFieldDisplayName(fieldName)}は必須です。`;
    }
    
    if (value && String(value).trim() !== '') {
      if (rules.maxLength && String(value).length > rules.maxLength) {
        return `${getFieldDisplayName(fieldName)}は${rules.maxLength}文字以内で入力してください。`;
      }
      if (rules.minLength && String(value).length < rules.minLength) {
        return `${getFieldDisplayName(fieldName)}は${rules.minLength}文字以上で入力してください。`;
      }
    }
    
    return null;
  };

  const getFieldDisplayName = (fieldName: string): string => {
    const names: Record<string, string> = {
      name: '資産名',
      assetTag: '資産タグ',
      type: '資産種類',
      status: 'ステータス',
      assignedTo: '割り当て先',
      location: '場所',
      description: '説明'
    };
    return names[fieldName] || fieldName;
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (editingAsset) {
      const fieldName = e.target.name;
      const value = e.target.value;
      const updatedAsset = { ...editingAsset, [fieldName]: value };
      
      // 資産の種類が変更された場合、自動的に資産タグを生成
      if (fieldName === 'type' && !editingAsset.id && (!editingAsset.assetTag || editingAsset.assetTag === '')) {
        try {
          const generatedTag = await generateAssetTag(value);
          updatedAsset.assetTag = generatedTag;
        } catch (error) {
          console.error('Failed to generate asset tag:', error);
        }
      }
      
      setEditingAsset(updatedAsset);
      
      // Real-time validation for touched fields
      if (touchedFields[fieldName]) {
        const error = validateField(fieldName, value);
        setValidationErrors(prev => ({
          ...prev,
          [fieldName]: error || ''
        }));
      }
    }
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    
    if (editingAsset) {
      const error = validateField(fieldName, editingAsset[fieldName as keyof Asset]);
      setValidationErrors(prev => ({
        ...prev,
        [fieldName]: error || ''
      }));
    }
  };

  const handleGenerateTag = async () => {
    if (editingAsset && editingAsset.type) {
      try {
        const generatedTag = await generateAssetTag(editingAsset.type);
        setEditingAsset({ ...editingAsset, assetTag: generatedTag });
      } catch (error) {
        console.error('Failed to generate asset tag:', error);
        setNotification({ message: '資産タグの生成に失敗しました。', type: NotificationType.ERROR });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;

    // Comprehensive form validation
    const validationResult = validateForm(editingAsset, ASSET_VALIDATION_RULES);
    
    if (!validationResult.isValid) {
      const errorMap: Record<string, string> = {};
      validationResult.errors.forEach(error => {
        errorMap[error.field] = error.message;
      });
      setValidationErrors(errorMap);
      
      // Mark all fields as touched to show errors
      const touchedFields: Record<string, boolean> = {};
      Object.keys(ASSET_VALIDATION_RULES).forEach(field => {
        touchedFields[field] = true;
      });
      setTouchedFields(touchedFields);
      
      setNotification({ 
        message: `入力エラーがあります。${validationResult.errors.length}件のエラーを修正してください。`, 
        type: NotificationType.ERROR 
      });
      return;
    }

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
      // Clear validation state
      setValidationErrors({});
      setTouchedFields({});
    } catch (error) {
      console.error("Failed to save asset:", error);
      setNotification({ message: `資産の保存に失敗しました: ${getErrorMessage(error)}`, type: NotificationType.ERROR });
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

  // CSV Export Handler
  const handleExport = () => {
    if (filteredAssets.length === 0) {
      setNotification({ message: 'エクスポートするデータがありません。', type: NotificationType.WARNING });
      return;
    }
    
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const filename = `assets_export_${timestamp}.csv`;
    
    exportToCsv(filteredAssets, filename, ASSET_CSV_HEADERS);
    setNotification({ message: `${filteredAssets.length}件の資産データをエクスポートしました。`, type: NotificationType.SUCCESS });
  };

  // CSV Import Handler
  const handleImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setNotification({ message: 'CSVファイルを選択してください。', type: NotificationType.ERROR });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = importFromCsv(content);
      
      setImportErrors(result.errors);
      setImportData(result.data);
      
      if (result.success) {
        setIsImportModalOpen(true);
      } else {
        setNotification({ 
          message: `CSVファイルの解析でエラーが発生しました。${result.errors.length}件のエラーがあります。`, 
          type: NotificationType.ERROR 
        });
      }
    };
    reader.readAsText(file, 'UTF-8');
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    try {
      setIsLoading(true);
      let successCount = 0;
      let errorCount = 0;
      
      for (const assetData of importData) {
        try {
          await addAsset(assetData);
          successCount++;
        } catch (error) {
          console.error('Failed to import asset:', assetData.name, error);
          errorCount++;
        }
      }
      
      setIsImportModalOpen(false);
      setImportData([]);
      setImportErrors([]);
      
      if (errorCount === 0) {
        setNotification({ 
          message: `${successCount}件の資産が正常にインポートされました。`, 
          type: NotificationType.SUCCESS 
        });
      } else {
        setNotification({ 
          message: `${successCount}件成功、${errorCount}件失敗しました。`, 
          type: NotificationType.WARNING 
        });
      }
      
      fetchAssets();
    } catch (error) {
      console.error('Import failed:', error);
      setNotification({ message: 'インポート処理中にエラーが発生しました。', type: NotificationType.ERROR });
    } finally {
      setIsLoading(false);
    }
  };

  const columns: Array<{ Header: string; accessor: keyof Asset | ((row: Asset) => ReactNode) }> = [
    { Header: 'ID', accessor: (row: Asset) => <span className="font-mono text-xs text-gray-500">#{row.id}</span> },
    { Header: '資産タグ', accessor: (row: Asset) => <span className="font-mono text-sm font-semibold text-blue-600">{row.assetTag}</span> },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 space-y-6">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-xl shadow-sm p-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">資産管理 (CMDB)</h2>
          <p className="text-slate-600">IT資産の一元管理とライフサイクル追跡</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExport} variant="secondary" className="flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow">
            <span className="text-lg">📤</span>
            CSVエクスポート
          </Button>
          {user?.role === UserRole.ADMIN && (
            <>
              <Button onClick={handleImport} variant="secondary" className="flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-lg">📥</span>
                CSVインポート
              </Button>
              <Button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all">
                <span className="text-lg">➕</span>
                新規資産追加
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Enhanced Asset Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card title="総資産数" className="text-center bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
          {isLoading ? <Spinner /> : (
            <>
              <div className="text-6xl mb-3 animate-pulse" aria-hidden="true">🗄️</div>
              <p className="text-5xl font-bold text-blue-600 mb-2">{totalAssetsCount}</p>
              <p className="text-sm text-blue-700 font-medium">件の資産を管理中</p>
            </>
          )}
        </Card>
        <Card title="資産タイプ別分布" className="lg:col-span-3 bg-white border-slate-200 hover:shadow-lg transition-shadow">
          {isLoading ? <Spinner /> : assetTypeDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie 
                  data={assetTypeDistribution} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="45%" 
                  outerRadius={65}
                  labelLine={false}
                  label={false}
                >
                    {assetTypeDistribution.map((entry) => <Cell key={`cell-${entry.name}`} fill={entry.fill} />)}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [`${value}件`, name]}
                  labelStyle={{color: '#374151'}}
                  contentStyle={{backgroundColor: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '0.375rem'}}
                />
                <Legend 
                  wrapperStyle={{fontSize: '0.875rem', paddingTop: '10px'}}
                  formatter={(value, entry) => `${value} (${entry.payload?.value || 0}件)`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 italic p-4 text-center">資産タイプデータがありません。</p>
          )}
        </Card>
      </div>

      {/* Enhanced Asset Filters */}
      <Card title="🔍 資産フィルター" className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div className="space-y-2">
              <Select 
                label="種類" 
                value={typeFilter} 
                onChange={e => {setTypeFilter(e.target.value); setCurrentPage(1);}} 
                options={typeOptions} 
                className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="space-y-2">
              <Select 
                label="ステータス" 
                value={statusFilter} 
                onChange={e => {setStatusFilter(e.target.value); setCurrentPage(1);}} 
                options={statusOptions} 
                className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="space-y-2">
              <Select 
                label="所有者" 
                value={ownerFilter} 
                onChange={e => {setOwnerFilter(e.target.value); setCurrentPage(1);}} 
                options={ownerOptions} 
                className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="space-y-2">
              <Select 
                label="場所" 
                value={locationFilter} 
                onChange={e => {setLocationFilter(e.target.value); setCurrentPage(1);}} 
                options={locationOptions} 
                className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={clearFilters} variant="secondary" className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 transition-colors">
                <span className="mr-2">🗑️</span>
                フィルタークリア
              </Button>
            </div>
          </div>
          
          {/* Filter Summary */}
          {(typeFilter || statusFilter || ownerFilter || locationFilter) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-blue-800">適用中のフィルター:</span>
                {typeFilter && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    種類: {assetTypeToJapanese(typeFilter)}
                  </span>
                )}
                {statusFilter && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    ステータス: {assetStatusToJapanese(statusFilter)}
                  </span>
                )}
                {ownerFilter && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                    所有者: {ownerFilter}
                  </span>
                )}
                {locationFilter && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                    場所: {locationFilter}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card title="📋 IT資産一覧" className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        {isLoading ? (
            <div className="flex justify-center p-8"><Spinner size="lg" /></div>
         ) : (
            <>
                <div className="overflow-x-auto bg-white rounded-lg">
                  <Table<Asset> 
                    columns={columns} 
                    data={paginatedAssets} 
                    onRowClick={handleOpenModal}
                    className="w-full border-collapse"
                  />
                </div>
                {filteredAssets.length > 0 && (
                    <div className="bg-slate-50 border-t border-slate-200 px-6 py-4">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">表示件数:</span>
                            <Select
                                value={itemsPerPage}
                                onChange={handleItemsPerPageChange}
                                options={itemsPerPageOptions}
                                className="w-20 text-sm bg-white border-slate-300"
                            />
                          </div>
                          <div className="text-sm text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200">
                              📊 {filteredAssets.length}件中 {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAssets.length)}-{Math.min(currentPage * itemsPerPage, filteredAssets.length)}件表示
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button 
                            onClick={handlePrevPage} 
                            disabled={currentPage === 1} 
                            size="sm" 
                            variant="secondary"
                            className="bg-white border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ← 前へ
                          </Button>
                          <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-300 rounded-md">
                            <span className="text-sm font-medium text-slate-700">ページ</span>
                            <span className="text-sm font-bold text-blue-600">{currentPage}</span>
                            <span className="text-sm text-slate-500">/</span>
                            <span className="text-sm text-slate-700">{totalPages || 1}</span>
                          </div>
                          <Button 
                            onClick={handleNextPage} 
                            disabled={currentPage === totalPages || totalPages === 0} 
                            size="sm" 
                            variant="secondary"
                            className="bg-white border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            次へ →
                          </Button>
                        </div>
                      </div>
                    </div>
                )}
                {filteredAssets.length === 0 && !isLoading && (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4 opacity-50">📦</div>
                      <p className="text-lg text-slate-500 mb-2">条件に一致する資産はありません</p>
                      <p className="text-sm text-slate-400">フィルター条件を変更するか、新しい資産を追加してください</p>
                      {user?.role === UserRole.ADMIN && (
                        <Button 
                          onClick={() => handleOpenModal()} 
                          className="mt-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                        >
                          <span className="mr-2">➕</span>
                          最初の資産を追加
                        </Button>
                      )}
                    </div>
                )}
            </>
         )
        }
      </Card>

      {editingAsset && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingAsset.id ? '資産編集' : '新規資産作成'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                資産タグ <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Input 
                    name="assetTag" 
                    value={editingAsset.assetTag || ''} 
                    onChange={handleInputChange} 
                    onBlur={() => handleFieldBlur('assetTag')}
                    required 
                    placeholder="例: SRV-001"
                    className="flex-1"
                  />
                  {validationErrors.assetTag && touchedFields.assetTag && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.assetTag}</p>
                  )}
                </div>
                {!editingAsset.id && (
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleGenerateTag}
                    className="whitespace-nowrap"
                  >
                    自動生成
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Input 
                label="資産名" 
                name="name" 
                value={editingAsset.name || ''} 
                onChange={handleInputChange} 
                onBlur={() => handleFieldBlur('name')}
                required 
              />
              {validationErrors.name && touchedFields.name && (
                <p className="text-sm text-red-600">{validationErrors.name}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Select 
                label="資産の種類" 
                name="type" 
                value={editingAsset.type || 'Server'} 
                onChange={handleInputChange} 
                options={assetTypes.map(t => ({ value: t, label: assetTypeToJapanese(t) }))} 
              />
              {validationErrors.type && touchedFields.type && (
                <p className="text-sm text-red-600">{validationErrors.type}</p>
              )}
            </div>
            
            <Input label="シリアル番号 (任意)" name="serialNumber" value={editingAsset.serialNumber || ''} onChange={handleInputChange} />
            
            <div className="space-y-2">
              <Select 
                label="ステータス" 
                name="status" 
                value={editingAsset.status || 'Active'} 
                onChange={handleInputChange} 
                options={assetStatuses.map(s => ({ value: s, label: assetStatusToJapanese(s) }))} 
              />
              {validationErrors.status && touchedFields.status && (
                <p className="text-sm text-red-600">{validationErrors.status}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Input 
                label="割り当て先 (任意)" 
                name="assignedTo" 
                value={editingAsset.assignedTo || ''} 
                onChange={handleInputChange} 
                onBlur={() => handleFieldBlur('assignedTo')}
              />
              {validationErrors.assignedTo && touchedFields.assignedTo && (
                <p className="text-sm text-red-600">{validationErrors.assignedTo}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Input 
                label="場所 (任意)" 
                name="location" 
                value={editingAsset.location || ''} 
                onChange={handleInputChange} 
                onBlur={() => handleFieldBlur('location')}
              />
              {validationErrors.location && touchedFields.location && (
                <p className="text-sm text-red-600">{validationErrors.location}</p>
              )}
            </div>
            
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

      {/* Hidden file input for CSV import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        style={{ display: 'none' }}
      />

      {/* CSV Import Confirmation Modal */}
      {isImportModalOpen && (
        <Modal title="CSVインポートの確認" onClose={() => setIsImportModalOpen(false)}>
          <div className="space-y-4">
            <p>以下の{importData.length}件の資産をインポートしようとしています：</p>
            
            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">資産タグ</th>
                    <th className="px-3 py-2 text-left">名前</th>
                    <th className="px-3 py-2 text-left">種類</th>
                    <th className="px-3 py-2 text-left">ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.map((asset, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{asset.assetTag}</td>
                      <td className="px-3 py-2">{asset.name}</td>
                      <td className="px-3 py-2">{asset.type && assetTypeToJapanese(asset.type)}</td>
                      <td className="px-3 py-2">{asset.status && assetStatusToJapanese(asset.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importErrors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-red-600 mb-2">エラー:</h4>
                <div className="max-h-32 overflow-y-auto bg-red-50 border border-red-200 rounded p-3">
                  {importErrors.map((error, index) => (
                    <p key={index} className="text-sm text-red-700">
                      行{error.row}: {error.field} - {error.message}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsImportModalOpen(false)}>
                キャンセル
              </Button>
              <Button type="button" variant="primary" onClick={handleConfirmImport}>
                インポート実行
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AssetPage;
