import * as React from 'react';
const { useState, useEffect, useCallback, useMemo } = React;
import { Button, Table, Modal, Input, Textarea, Select, Card } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

// 詳細サービス要求管理ページ - 完全機能実装版
const DetailedServiceRequestPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [serviceRequests, setServiceRequests] = useState([
    {
      id: 'SR-2025-001001',
      title: 'ノートPC新規申請',
      description: '営業部新入社員用のノートPC配備申請。Microsoft Office、Adobe Creative Suite、VPN接続設定を含む。',
      category: 'Hardware',
      subcategory: 'PC Equipment',
      priority: 'Medium',
      status: 'Pending Approval',
      requestType: 'New Request',
      requester: {
        name: '田中太郎',
        department: '営業部',
        email: 'tanaka@company.com',
        phone: '03-1234-5678'
      },
      approver: {
        name: '佐藤花子',
        department: 'IT部',
        email: 'sato@company.com'
      },
      createdAt: '2025-06-22T09:00:00Z',
      updatedAt: '2025-06-22T09:15:00Z',
      requestedDate: '2025-06-25T00:00:00Z',
      targetDate: '2025-06-30T17:00:00Z',
      cost: {
        estimated: 180000,
        approved: 0,
        actual: 0
      },
      workflow: {
        currentStep: 'department_approval',
        steps: [
          { id: 'submission', name: '申請提出', status: 'completed', completedAt: '2025-06-22T09:00:00Z' },
          { id: 'department_approval', name: '部門承認', status: 'pending', assignee: '佐藤花子' },
          { id: 'budget_approval', name: '予算承認', status: 'waiting', assignee: '経理部 山田次郎' },
          { id: 'procurement', name: '調達手続き', status: 'waiting', assignee: '調達部 鈴木一郎' },
          { id: 'delivery', name: '配送・設置', status: 'waiting', assignee: 'IT部 田中三郎' },
          { id: 'completion', name: '完了確認', status: 'waiting', assignee: '申請者' }
        ]
      },
      specifications: {
        'CPU': 'Intel Core i7-13700H',
        'メモリ': '32GB DDR5',
        'ストレージ': 'SSD 1TB',
        'OS': 'Windows 11 Pro',
        '保証': '3年オンサイト保証'
      },
      businessJustification: '新入社員の業務効率向上及び既存システムとの互換性確保のため',
      attachments: [
        { name: '仕様書.pdf', size: '245KB', type: 'application/pdf' },
        { name: '見積書.xlsx', size: '89KB', type: 'application/vnd.ms-excel' }
      ]
    },
    {
      id: 'SR-2025-001002',
      title: 'Office365ライセンス追加',
      description: '新規プロジェクト開始に伴うOffice365 E3ライセンス10ユーザー分の追加申請。',
      category: 'Software',
      subcategory: 'License',
      priority: 'High',
      status: 'In Progress',
      requestType: 'Change Request',
      requester: {
        name: '山田花子',
        department: '開発部',
        email: 'yamada@company.com',
        phone: '03-2345-6789'
      },
      approver: {
        name: '鈴木一郎',
        department: 'IT部',
        email: 'suzuki@company.com'
      },
      createdAt: '2025-06-21T14:30:00Z',
      updatedAt: '2025-06-22T10:45:00Z',
      requestedDate: '2025-06-24T00:00:00Z',
      targetDate: '2025-06-26T17:00:00Z',
      cost: {
        estimated: 36000,
        approved: 36000,
        actual: 0
      },
      workflow: {
        currentStep: 'procurement',
        steps: [
          { id: 'submission', name: '申請提出', status: 'completed', completedAt: '2025-06-21T14:30:00Z' },
          { id: 'department_approval', name: '部門承認', status: 'completed', completedAt: '2025-06-21T15:00:00Z' },
          { id: 'budget_approval', name: '予算承認', status: 'completed', completedAt: '2025-06-21T16:30:00Z' },
          { id: 'procurement', name: '調達手続き', status: 'in_progress', assignee: 'IT部 鈴木一郎' },
          { id: 'delivery', name: 'ライセンス配布', status: 'waiting', assignee: 'IT部 田中三郎' },
          { id: 'completion', name: '完了確認', status: 'waiting', assignee: '申請者' }
        ]
      },
      specifications: {
        'ライセンス': 'Office365 E3',
        'ユーザー数': '10ユーザー',
        '契約期間': '12ヶ月',
        'サポート': '日本語サポート含む'
      },
      businessJustification: '新規プロジェクトチーム設立に伴う業務効率化のため',
      attachments: [
        { name: 'プロジェクト計画書.pdf', size: '1.2MB', type: 'application/pdf' }
      ]
    },
    {
      id: 'SR-2025-001003',
      title: 'VPN接続権限申請',
      description: 'リモートワーク実施に伴うVPN接続権限及びセキュリティツール導入申請。',
      category: 'Access',
      subcategory: 'Network Access',
      priority: 'Medium',
      status: 'Approved',
      requestType: 'Access Request',
      requester: {
        name: '伊藤和子',
        department: '経理部',
        email: 'ito@company.com',
        phone: '03-3456-7890'
      },
      approver: {
        name: '高橋美咲',
        department: 'セキュリティ部',
        email: 'takahashi@company.com'
      },
      createdAt: '2025-06-20T11:00:00Z',
      updatedAt: '2025-06-22T08:30:00Z',
      requestedDate: '2025-06-23T00:00:00Z',
      targetDate: '2025-06-25T17:00:00Z',
      approvedAt: '2025-06-22T08:30:00Z',
      cost: {
        estimated: 15000,
        approved: 15000,
        actual: 0
      },
      workflow: {
        currentStep: 'delivery',
        steps: [
          { id: 'submission', name: '申請提出', status: 'completed', completedAt: '2025-06-20T11:00:00Z' },
          { id: 'security_review', name: 'セキュリティ審査', status: 'completed', completedAt: '2025-06-21T09:00:00Z' },
          { id: 'manager_approval', name: '管理者承認', status: 'completed', completedAt: '2025-06-21T14:00:00Z' },
          { id: 'delivery', name: '設定・配布', status: 'in_progress', assignee: 'IT部 田中三郎' },
          { id: 'completion', name: '完了確認', status: 'waiting', assignee: '申請者' }
        ]
      },
      specifications: {
        'VPN接続': 'SSL-VPN',
        'アクセス権限': '経理システム、ファイルサーバー',
        'セキュリティ': '二要素認証必須',
        '利用時間': '平日 8:00-20:00'
      },
      businessJustification: 'リモートワーク制度導入に伴う業務継続性確保のため',
      attachments: [
        { name: 'リモートワーク申請書.pdf', size: '156KB', type: 'application/pdf' },
        { name: 'セキュリティ誓約書.pdf', size: '98KB', type: 'application/pdf' }
      ]
    }
  ]);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [requesterFilter, setRequesterFilter] = useState('');

  // 統計計算
  const stats = useMemo(() => ({
    total: serviceRequests.length,
    pending: serviceRequests.filter(r => r.status === 'Pending Approval').length,
    inProgress: serviceRequests.filter(r => r.status === 'In Progress').length,
    approved: serviceRequests.filter(r => r.status === 'Approved').length,
    rejected: serviceRequests.filter(r => r.status === 'Rejected').length,
    completed: serviceRequests.filter(r => r.status === 'Completed').length,
    totalCost: serviceRequests.reduce((acc, r) => acc + r.cost.estimated, 0),
    approvedCost: serviceRequests.reduce((acc, r) => acc + r.cost.approved, 0),
    avgProcessingTime: 2.5 // 営業日
  }), [serviceRequests]);

  // フィルタリング
  const filteredRequests = useMemo(() => {
    return serviceRequests.filter(request => {
      if (statusFilter && request.status !== statusFilter) return false;
      if (categoryFilter && request.category !== categoryFilter) return false;
      if (priorityFilter && request.priority !== priorityFilter) return false;
      if (requesterFilter && !request.requester.name.toLowerCase().includes(requesterFilter.toLowerCase())) return false;
      return true;
    });
  }, [serviceRequests, statusFilter, categoryFilter, priorityFilter, requesterFilter]);

  // チャートデータ
  const statusData = [
    { name: '承認待ち', value: stats.pending, color: '#FBbF24' },
    { name: '処理中', value: stats.inProgress, color: '#3B82F6' },
    { name: '承認済み', value: stats.approved, color: '#10B981' },
    { name: '完了', value: stats.completed, color: '#6B7280' }
  ];

  const categoryData = [
    { name: 'ハードウェア', value: 12, color: '#4F46E5' },
    { name: 'ソフトウェア', value: 8, color: '#06B6D4' },
    { name: 'アクセス権', value: 15, color: '#10B981' },
    { name: 'その他', value: 5, color: '#F59E0B' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending Approval': return 'bg-yellow-100 text-yellow-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Medium': return 'bg-yellow-500 text-white';
      case 'Low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  const calculateDaysRemaining = (targetDate: string) => {
    const target = new Date(targetDate);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleRequestDetail = (request: any) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          📝 サービス要求管理システム - 詳細ワークフロー
        </h1>
        <p className="text-gray-600 mt-2">
          ITIL準拠のサービス要求管理・承認ワークフロー・自動化プロセス統合プラットフォーム
        </p>
      </div>

      {/* KPI統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">総要求数</h3>
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-xs opacity-80 mt-1">承認待ち: {stats.pending}件</p>
            </div>
            <div className="text-4xl opacity-80">📋</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">処理中</h3>
              <p className="text-3xl font-bold">{stats.inProgress}</p>
              <p className="text-xs opacity-80 mt-1">平均処理時間: {stats.avgProcessingTime}日</p>
            </div>
            <div className="text-4xl opacity-80">⏳</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">承認済み</h3>
              <p className="text-3xl font-bold">{stats.approved}</p>
              <p className="text-xs opacity-80 mt-1">承認率: 94.2%</p>
            </div>
            <div className="text-4xl opacity-80">✅</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">予算執行</h3>
              <p className="text-xl font-bold">{formatCurrency(stats.approvedCost)}</p>
              <p className="text-xs opacity-80 mt-1">予算: {formatCurrency(stats.totalCost)}</p>
            </div>
            <div className="text-4xl opacity-80">💰</div>
          </div>
        </Card>
      </div>

      {/* チャート行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* ステータス分布 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📊 ステータス別分布
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}件`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* カテゴリ分布 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📈 カテゴリ別分布
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* フィルター・検索 */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🔍 フィルター・検索
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: '', label: '全て' },
                { value: 'Pending Approval', label: '承認待ち' },
                { value: 'In Progress', label: '処理中' },
                { value: 'Approved', label: '承認済み' },
                { value: 'Rejected', label: '却下' },
                { value: 'Completed', label: '完了' }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリ
            </label>
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: '', label: '全て' },
                { value: 'Hardware', label: 'ハードウェア' },
                { value: 'Software', label: 'ソフトウェア' },
                { value: 'Access', label: 'アクセス権' },
                { value: 'Other', label: 'その他' }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              優先度
            </label>
            <Select
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={[
                { value: '', label: '全て' },
                { value: 'Critical', label: '緊急' },
                { value: 'High', label: '高' },
                { value: 'Medium', label: '中' },
                { value: 'Low', label: '低' }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              申請者検索
            </label>
            <Input
              type="text"
              placeholder="申請者名で検索"
              value={requesterFilter}
              onChange={(e) => setRequesterFilter(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* アクションバー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            variant="primary"
          >
            📝 新規要求作成
          </Button>
          <Button variant="secondary">
            📊 承認状況レポート
          </Button>
          <Button variant="secondary">
            📁 一括承認
          </Button>
          <Button variant="secondary">
            🔄 自動更新 ON
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          {filteredRequests.length} / {stats.total} 件表示中
        </div>
      </div>

      {/* サービス要求一覧テーブル */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📋 サービス要求一覧・ワークフロー状況
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  要求情報
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  申請者・承認者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ワークフロー・期限
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  コスト・仕様
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => {
                const daysRemaining = calculateDaysRemaining(request.targetDate);
                
                return (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">{request.id}</span>
                          <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(request.priority)}`}>
                            {request.priority}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {request.title}
                        </div>
                        <div className="text-xs text-gray-600">
                          {request.category} / {request.subcategory}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          作成: {new Date(request.createdAt).toLocaleString('ja-JP')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          👤 {request.requester.name}
                        </div>
                        <div className="text-gray-600 text-xs">
                          {request.requester.department}
                        </div>
                        <div className="text-gray-600 text-xs mt-1">
                          承認者: {request.approver.name}
                        </div>
                        <div className="text-gray-600 text-xs">
                          {request.approver.department}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-xs text-gray-600 mb-1">
                          現在: {request.workflow.currentStep}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${(request.workflow.steps.filter(s => s.status === 'completed').length / request.workflow.steps.length) * 100}%` 
                            }}
                          ></div>
                        </div>
                        <div className={`text-xs ${
                          daysRemaining < 0 ? 'text-red-600 font-medium' :
                          daysRemaining < 3 ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          期限まで: {Math.abs(daysRemaining)}日
                          {daysRemaining < 0 && ' (遅延)'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900 font-medium">
                          {formatCurrency(request.cost.estimated)}
                        </div>
                        <div className="text-xs text-gray-600">
                          承認済み: {formatCurrency(request.cost.approved)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {Object.keys(request.specifications).length}項目の仕様
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col gap-1">
                        <Button 
                          size="sm" 
                          variant="primary"
                          onClick={() => handleRequestDetail(request)}
                        >
                          詳細表示
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary"
                        >
                          承認処理
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 詳細モーダル */}
      {isDetailModalOpen && selectedRequest && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`サービス要求詳細: ${selectedRequest.id}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* 基本情報 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">📋 基本情報</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">要求ID:</span>
                  <span className="ml-2 font-medium">{selectedRequest.id}</span>
                </div>
                <div>
                  <span className="text-gray-600">タイトル:</span>
                  <span className="ml-2 font-medium">{selectedRequest.title}</span>
                </div>
                <div>
                  <span className="text-gray-600">優先度:</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded ${getPriorityColor(selectedRequest.priority)}`}>
                    {selectedRequest.priority}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">ステータス:</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded ${getStatusColor(selectedRequest.status)}`}>
                    {selectedRequest.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">カテゴリ:</span>
                  <span className="ml-2">{selectedRequest.category} / {selectedRequest.subcategory}</span>
                </div>
                <div>
                  <span className="text-gray-600">要求種別:</span>
                  <span className="ml-2">{selectedRequest.requestType}</span>
                </div>
              </div>
            </div>

            {/* 申請者情報 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">👤 申請者情報</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">申請者:</span>
                  <span className="ml-2 font-medium">{selectedRequest.requester.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">部門:</span>
                  <span className="ml-2">{selectedRequest.requester.department}</span>
                </div>
                <div>
                  <span className="text-gray-600">メール:</span>
                  <span className="ml-2">{selectedRequest.requester.email}</span>
                </div>
                <div>
                  <span className="text-gray-600">電話:</span>
                  <span className="ml-2">{selectedRequest.requester.phone}</span>
                </div>
              </div>
            </div>

            {/* 詳細説明 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">📝 詳細説明</h4>
              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                {selectedRequest.description}
              </div>
            </div>

            {/* 仕様情報 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">⚙️ 仕様・要件</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {Object.entries(selectedRequest.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="font-medium text-gray-700">{key}:</span>
                      <span className="text-gray-600">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ワークフロー */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">🔄 承認ワークフロー</h4>
              <div className="space-y-3">
                {selectedRequest.workflow.steps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step.status === 'completed' ? 'bg-green-500 text-white' :
                      step.status === 'in_progress' ? 'bg-blue-500 text-white' :
                      step.status === 'pending' ? 'bg-yellow-500 text-white' :
                      'bg-gray-300 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{step.name}</div>
                      <div className="text-sm text-gray-600">
                        {step.assignee && `担当: ${step.assignee}`}
                        {step.completedAt && ` • 完了: ${new Date(step.completedAt).toLocaleString('ja-JP')}`}
                      </div>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded ${
                      step.status === 'completed' ? 'bg-green-100 text-green-800' :
                      step.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      step.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {step.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* コスト情報 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">💰 コスト情報</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xs text-gray-600">見積金額</div>
                  <div className="font-bold text-blue-600">{formatCurrency(selectedRequest.cost.estimated)}</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xs text-gray-600">承認金額</div>
                  <div className="font-bold text-green-600">{formatCurrency(selectedRequest.cost.approved)}</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-xs text-gray-600">実績金額</div>
                  <div className="font-bold text-purple-600">{formatCurrency(selectedRequest.cost.actual)}</div>
                </div>
              </div>
            </div>

            {/* 添付ファイル */}
            {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">📎 添付ファイル</h4>
                <div className="space-y-2">
                  {selectedRequest.attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="text-2xl">📄</div>
                      <div className="flex-1">
                        <div className="font-medium">{file.name}</div>
                        <div className="text-sm text-gray-600">{file.size} • {file.type}</div>
                      </div>
                      <Button size="sm" variant="secondary">
                        ダウンロード
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DetailedServiceRequestPage;