import * as React from 'react';
const { useState, useEffect, useCallback, useMemo } = React;
import { Asset, UserRole } from '../types';
import { Button, Table, Modal, Input, Select, Card, Spinner } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// 拡張資産管理ページ - 詳細分析機能付き
const EnhancedAssetPage: React.FC = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 資産統計データ
  const assetStats = {
    totalAssets: 3892,
    activeAssets: 3654,
    maintenanceAssets: 156,
    retiredAssets: 82,
    utilizationRate: 93.8,
    totalValue: 245750000, // 円
    avgAge: 2.3 // 年
  };

  // 詳細資産データ（実際のアプリケーションではAPIから取得）
  const detailedAssets = [
    {
      id: '1',
      tag: 'SRV-001',
      name: 'WEB-SERVER-01',
      type: 'Server',
      status: 'Active',
      location: 'データセンター1F-ラックA-01',
      department: 'IT部',
      owner: '田中太郎',
      acquisitionDate: '2023-04-15',
      warrantyExpiry: '2026-04-14',
      specifications: {
        cpu: 'Intel Xeon Gold 6248R (24コア)',
        memory: '128GB DDR4',
        storage: 'SSD 2TB x 4 (RAID10)',
        network: '10Gbps NIC x 2',
        os: 'Ubuntu Server 22.04 LTS'
      },
      utilization: {
        cpu: 67,
        memory: 78,
        disk: 45,
        network: 32
      },
      maintenanceHistory: [
        { date: '2025-06-15', type: '定期メンテナンス', description: 'OSアップデート・セキュリティパッチ適用' },
        { date: '2025-05-20', type: '部品交換', description: 'HDD → SSD交換作業' },
        { date: '2025-04-10', type: '点検', description: '四半期点検・清掃作業' }
      ],
      cost: {
        acquisition: 1250000,
        maintenance: 150000,
        annual: 350000
      }
    },
    {
      id: '2',
      tag: 'DSK-045',
      name: 'DESKTOP-SALES-045',
      type: 'Desktop',
      status: 'Active',
      location: '本社3F-営業部-45番席',
      department: '営業部',
      owner: '佐藤花子',
      acquisitionDate: '2024-02-10',
      warrantyExpiry: '2027-02-09',
      specifications: {
        cpu: 'Intel Core i7-13700',
        memory: '32GB DDR4',
        storage: 'SSD 1TB',
        network: 'Gigabit Ethernet',
        os: 'Windows 11 Pro'
      },
      utilization: {
        cpu: 45,
        memory: 62,
        disk: 67,
        network: 15
      },
      maintenanceHistory: [
        { date: '2025-06-01', type: 'ソフトウェア更新', description: 'Office365・Adobe CC更新' },
        { date: '2025-03-15', type: '点検', description: '四半期点検・ウイルススキャン' }
      ],
      cost: {
        acquisition: 180000,
        maintenance: 25000,
        annual: 85000
      }
    }
  ];

  // 資産分布データ
  const assetDistributionData = [
    { name: 'サーバー', value: 45, color: '#4F46E5', cost: 56250000 },
    { name: 'デスクトップ', value: 850, color: '#06B6D4', cost: 153000000 },
    { name: 'ノートPC', value: 1200, color: '#10B981', cost: 180000000 },
    { name: 'ネットワーク機器', value: 156, color: '#F59E0B', cost: 78000000 },
    { name: 'ストレージ', value: 89, color: '#EF4444', cost: 89000000 },
    { name: 'その他', value: 312, color: '#8B5CF6', cost: 31200000 }
  ];

  // 部門別資産分布
  const departmentAssets = [
    { department: 'IT部', count: 1245, percentage: 32 },
    { department: '営業部', count: 892, percentage: 23 },
    { department: '経理部', count: 456, percentage: 12 },
    { department: '人事部', count: 234, percentage: 6 },
    { department: '開発部', count: 678, percentage: 17 },
    { department: 'その他', count: 387, percentage: 10 }
  ];

  // 年式別分布
  const ageDistribution = [
    { year: '2025年', count: 234, condition: '新品' },
    { year: '2024年', count: 1456, condition: '良好' },
    { year: '2023年', count: 1289, condition: '良好' },
    { year: '2022年', count: 567, condition: '注意' },
    { year: '2021年', count: 289, condition: '要交換検討' },
    { year: '2020年以前', count: 57, condition: '交換推奨' }
  ];

  // 保守期限切れ予定
  const warrantyExpiring = [
    { month: '7月', count: 23, critical: 5 },
    { month: '8月', count: 45, critical: 12 },
    { month: '9月', count: 67, critical: 18 },
    { month: '10月', count: 34, critical: 8 },
    { month: '11月', count: 56, critical: 15 },
    { month: '12月', count: 78, critical: 22 }
  ];

  const handleAssetDetail = (asset: any) => {
    setSelectedAsset(asset);
    setIsDetailModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          💻 IT資産管理システム - 詳細分析ダッシュボード
        </h1>
        <p className="text-gray-600 mt-2">
          組織全体のIT資産を効率的に管理・監視・分析するための統合プラットフォーム
        </p>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">総資産数</h3>
              <p className="text-3xl font-bold">{assetStats.totalAssets.toLocaleString()}</p>
              <p className="text-xs opacity-80 mt-1">アクティブ: {assetStats.activeAssets.toLocaleString()}台</p>
            </div>
            <div className="text-4xl opacity-80">🖥️</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">稼働率</h3>
              <p className="text-3xl font-bold">{assetStats.utilizationRate}%</p>
              <p className="text-xs opacity-80 mt-1">目標: 95%以上</p>
            </div>
            <div className="text-4xl opacity-80">⚡</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">総資産価値</h3>
              <p className="text-2xl font-bold">{formatCurrency(assetStats.totalValue)}</p>
              <p className="text-xs opacity-80 mt-1">減価償却込み</p>
            </div>
            <div className="text-4xl opacity-80">💰</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">平均年数</h3>
              <p className="text-3xl font-bold">{assetStats.avgAge}年</p>
              <p className="text-xs opacity-80 mt-1">交換推奨: 4年</p>
            </div>
            <div className="text-4xl opacity-80">📅</div>
          </div>
        </Card>
      </div>

      {/* チャート行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 資産種別分布 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📊 資産種別分布・投資額
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetDistributionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value, percent }) => 
                    `${name}: ${value}台 (${(percent * 100).toFixed(1)}%)`
                  }
                >
                  {assetDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any, props: any) => [
                    `${value}台`,
                    `投資額: ${formatCurrency(props.payload.cost)}`
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {assetDistributionData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span>{item.name}</span>
                </div>
                <span className="text-gray-600">{formatCurrency(item.cost)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 部門別分布 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🏢 部門別資産配備状況
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentAssets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="department" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => [`${value}台`, '資産数']}
                />
                <Bar dataKey="count" fill="#4F46E5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {departmentAssets.map((dept, index) => (
              <div key={index} className="flex justify-between">
                <span className="text-gray-700">{dept.department}:</span>
                <span className="font-medium">{dept.count}台 ({dept.percentage}%)</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 詳細資産情報テーブル */}
      <Card className="p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🔍 詳細資産情報・パフォーマンス監視
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  資産情報
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  配備場所・担当者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  スペック・パフォーマンス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  保守・コスト
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {detailedAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{asset.tag}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          asset.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {asset.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">{asset.name}</div>
                      <div className="text-xs text-gray-500">{asset.type}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">📍 {asset.location}</div>
                      <div className="text-gray-600">🏢 {asset.department}</div>
                      <div className="text-gray-600">👤 {asset.owner}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm space-y-1">
                      <div className="text-gray-900">💾 {asset.specifications.cpu}</div>
                      <div className="text-gray-600">🧠 RAM: {asset.specifications.memory}</div>
                      <div className="text-gray-600">💿 {asset.specifications.storage}</div>
                      <div className="flex gap-2 mt-2">
                        <div className="text-xs">
                          <span className="text-gray-500">CPU:</span>
                          <span className={`ml-1 ${asset.utilization.cpu > 80 ? 'text-red-600' : 'text-green-600'}`}>
                            {asset.utilization.cpu}%
                          </span>
                        </div>
                        <div className="text-xs">
                          <span className="text-gray-500">MEM:</span>
                          <span className={`ml-1 ${asset.utilization.memory > 85 ? 'text-red-600' : 'text-green-600'}`}>
                            {asset.utilization.memory}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="text-gray-900">💰 {formatCurrency(asset.cost.acquisition)}</div>
                      <div className="text-gray-600">保守: {formatCurrency(asset.cost.maintenance)}/年</div>
                      <div className="text-xs text-gray-500">保証期限: {asset.warrantyExpiry}</div>
                      <div className="text-xs text-green-600">
                        メンテナンス: {asset.maintenanceHistory.length}回
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button 
                      size="sm" 
                      variant="primary"
                      onClick={() => handleAssetDetail(asset)}
                    >
                      詳細表示
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 保守・更新予定 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📅 年式別分布・更新計画
          </h3>
          <div className="space-y-3">
            {ageDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <span className="font-medium">{item.year}</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded ${
                    item.condition === '新品' ? 'bg-green-100 text-green-800' :
                    item.condition === '良好' ? 'bg-blue-100 text-blue-800' :
                    item.condition === '注意' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {item.condition}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{item.count}台</div>
                  <div className="text-xs text-gray-600">
                    {((item.count / assetStats.totalAssets) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ⚠️ 保証期限切れ予定 (今後6ヶ月)
          </h3>
          <div className="space-y-3">
            {warrantyExpiring.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <span className="font-medium">{item.month}</span>
                  {item.critical > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs rounded bg-red-100 text-red-800">
                      緊急: {item.critical}台
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-medium">{item.count}台</div>
                  <div className="text-xs text-gray-600">保証期限切れ予定</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              📋 <strong>アクションプラン:</strong> 
              緊急対応が必要な資産80台について、来月までに更新・保守契約の延長を検討してください。
            </p>
          </div>
        </Card>
      </div>

      {/* 詳細モーダル */}
      {isDetailModalOpen && selectedAsset && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`資産詳細: ${selectedAsset.tag} - ${selectedAsset.name}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* 基本情報 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">📋 基本情報</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">資産タグ:</span>
                  <span className="ml-2 font-medium">{selectedAsset.tag}</span>
                </div>
                <div>
                  <span className="text-gray-600">資産名:</span>
                  <span className="ml-2 font-medium">{selectedAsset.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">種類:</span>
                  <span className="ml-2">{selectedAsset.type}</span>
                </div>
                <div>
                  <span className="text-gray-600">ステータス:</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded ${
                    selectedAsset.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedAsset.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">配備場所:</span>
                  <span className="ml-2">{selectedAsset.location}</span>
                </div>
                <div>
                  <span className="text-gray-600">担当部門:</span>
                  <span className="ml-2">{selectedAsset.department}</span>
                </div>
                <div>
                  <span className="text-gray-600">担当者:</span>
                  <span className="ml-2">{selectedAsset.owner}</span>
                </div>
                <div>
                  <span className="text-gray-600">取得日:</span>
                  <span className="ml-2">{selectedAsset.acquisitionDate}</span>
                </div>
              </div>
            </div>

            {/* スペック情報 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">⚙️ スペック情報</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div><strong>CPU:</strong> {selectedAsset.specifications.cpu}</div>
                  <div><strong>メモリ:</strong> {selectedAsset.specifications.memory}</div>
                  <div><strong>ストレージ:</strong> {selectedAsset.specifications.storage}</div>
                  <div><strong>ネットワーク:</strong> {selectedAsset.specifications.network}</div>
                  <div><strong>OS:</strong> {selectedAsset.specifications.os}</div>
                </div>
              </div>
            </div>

            {/* パフォーマンス */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">📊 現在のパフォーマンス</h4>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(selectedAsset.utilization).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="text-xs text-gray-600 uppercase">{key}</div>
                    <div className={`text-2xl font-bold ${
                      value > 80 ? 'text-red-600' : value > 60 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {value}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* メンテナンス履歴 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">🔧 メンテナンス履歴</h4>
              <div className="space-y-2">
                {selectedAsset.maintenanceHistory.map((maintenance, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="text-sm">
                      <div className="font-medium">{maintenance.date}</div>
                      <div className="text-blue-600">{maintenance.type}</div>
                      <div className="text-gray-600 mt-1">{maintenance.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* コスト情報 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">💰 コスト情報</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xs text-gray-600">取得価格</div>
                  <div className="font-bold text-blue-600">
                    {formatCurrency(selectedAsset.cost.acquisition)}
                  </div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xs text-gray-600">年間保守費</div>
                  <div className="font-bold text-green-600">
                    {formatCurrency(selectedAsset.cost.maintenance)}
                  </div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-xs text-gray-600">総運用コスト</div>
                  <div className="font-bold text-purple-600">
                    {formatCurrency(selectedAsset.cost.annual)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EnhancedAssetPage;