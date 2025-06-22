import * as React from 'react';
const { useState, useEffect, useCallback, useMemo } = React;
import { Button, Table, Modal, Input, Textarea, Select, Card } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

// 詳細変更管理ページ - CAB承認・リスク分析機能付き
const DetailedChangeManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [changes, setChanges] = useState([
    {
      id: 'CHG-2025-001001',
      title: 'WEBサーバーOS定期アップデート',
      description: 'WEB-SRV-01〜05のUbuntu Server 22.04から24.04へのメジャーアップデート。セキュリティパッチ適用およびパフォーマンス向上を含む。',
      category: 'Major',
      subcategory: 'Infrastructure',
      priority: 'High',
      status: 'CAB Review',
      riskLevel: 'Medium',
      requester: {
        name: '田中太郎',
        department: 'インフラ運用部',
        email: 'tanaka@company.com'
      },
      implementer: {
        name: '佐藤花子',
        department: 'システム管理部',
        email: 'sato@company.com'
      },
      createdAt: '2025-06-20T10:00:00Z',
      updatedAt: '2025-06-22T14:30:00Z',
      plannedStartDate: '2025-06-29T02:00:00Z',
      plannedEndDate: '2025-06-29T06:00:00Z',
      actualStartDate: null,
      actualEndDate: null,
      businessJustification: 'セキュリティ脆弱性対応およびシステム安定性向上のため',
      impactAnalysis: {
        businessImpact: 'High',
        technicalImpact: 'Medium',
        userImpact: 'Low',
        riskScore: 7.2,
        affectedSystems: ['WEB-SRV-01', 'WEB-SRV-02', 'WEB-SRV-03', 'WEB-SRV-04', 'WEB-SRV-05'],
        affectedUsers: 1200,
        downtime: 240 // 分
      },
      timeline: {
        preparation: '2025-06-25T00:00:00Z',
        testing: '2025-06-27T00:00:00Z',
        implementation: '2025-06-29T02:00:00Z',
        rollback: '2025-06-29T08:00:00Z'
      },
      approvals: {
        cab: {
          status: 'pending',
          scheduledDate: '2025-06-23T14:00:00Z',
          members: ['山田次郎', '鈴木一郎', '高橋美咲', '伊藤和子']
        },
        business: {
          status: 'approved',
          approver: '営業部長 山田次郎',
          approvedAt: '2025-06-21T16:00:00Z'
        },
        technical: {
          status: 'approved',
          approver: 'IT部長 鈴木一郎',
          approvedAt: '2025-06-22T09:00:00Z'
        }
      },
      testResults: [
        {
          environment: 'Development',
          status: 'passed',
          date: '2025-06-18T10:00:00Z',
          details: '全機能テスト正常完了'
        },
        {
          environment: 'Staging',
          status: 'passed',
          date: '2025-06-19T14:00:00Z',
          details: '負荷テスト・統合テスト正常完了'
        },
        {
          environment: 'Production',
          status: 'scheduled',
          date: '2025-06-24T10:00:00Z',
          details: '本番環境テスト予定'
        }
      ],
      rollbackPlan: {
        triggerConditions: ['システム起動失敗', 'アプリケーション動作不良', 'データベース接続エラー'],
        steps: [
          'サービス停止',
          'OS前バージョンへの復旧',
          '設定ファイル復元',
          'データベース整合性チェック',
          'サービス再開'
        ],
        estimatedTime: 120, // 分
        responsible: 'システム管理部 佐藤花子'
      },
      communicationPlan: {
        stakeholders: ['営業部', 'カスタマーサポート', 'システム管理部'],
        notifications: [
          {
            type: 'advance_notice',
            date: '2025-06-26T17:00:00Z',
            channels: ['email', 'slack', 'portal']
          },
          {
            type: 'start_notice',
            date: '2025-06-29T01:45:00Z',
            channels: ['email', 'slack']
          },
          {
            type: 'completion_notice',
            date: '2025-06-29T06:15:00Z',
            channels: ['email', 'slack', 'portal']
          }
        ]
      }
    },
    {
      id: 'CHG-2025-001002',
      title: 'ERPシステム機能拡張',
      description: '在庫管理モジュールの新機能追加。リアルタイム在庫追跡、自動発注機能、レポート機能強化を含む。',
      category: 'Major',
      subcategory: 'Application',
      priority: 'Medium',
      status: 'Approved',
      riskLevel: 'Low',
      requester: {
        name: '山田花子',
        department: '業務部',
        email: 'yamada@company.com'
      },
      implementer: {
        name: '鈴木一郎',
        department: '開発部',
        email: 'suzuki@company.com'
      },
      createdAt: '2025-06-15T09:00:00Z',
      updatedAt: '2025-06-22T11:15:00Z',
      plannedStartDate: '2025-06-25T19:00:00Z',
      plannedEndDate: '2025-06-25T23:00:00Z',
      actualStartDate: null,
      actualEndDate: null,
      businessJustification: '業務効率化および在庫コスト削減のため',
      impactAnalysis: {
        businessImpact: 'Medium',
        technicalImpact: 'Low',
        userImpact: 'Medium',
        riskScore: 4.1,
        affectedSystems: ['ERP-MAIN', 'ERP-DB', 'REPORT-SRV'],
        affectedUsers: 450,
        downtime: 30 // 分
      },
      timeline: {
        preparation: '2025-06-23T00:00:00Z',
        testing: '2025-06-24T00:00:00Z',
        implementation: '2025-06-25T19:00:00Z',
        rollback: '2025-06-26T01:00:00Z'
      },
      approvals: {
        cab: {
          status: 'approved',
          scheduledDate: '2025-06-20T14:00:00Z',
          members: ['山田次郎', '鈴木一郎', '高橋美咲', '伊藤和子'],
          approvedAt: '2025-06-20T15:30:00Z'
        },
        business: {
          status: 'approved',
          approver: '業務部長 田中三郎',
          approvedAt: '2025-06-16T14:00:00Z'
        },
        technical: {
          status: 'approved',
          approver: '開発部長 高橋美咲',
          approvedAt: '2025-06-17T10:00:00Z'
        }
      },
      testResults: [
        {
          environment: 'Development',
          status: 'passed',
          date: '2025-06-12T16:00:00Z',
          details: 'ユニットテスト・統合テスト正常完了'
        },
        {
          environment: 'Staging',
          status: 'passed',
          date: '2025-06-14T11:00:00Z',
          details: 'ユーザー受入テスト正常完了'
        }
      ],
      rollbackPlan: {
        triggerConditions: ['機能動作不良', 'データ不整合', 'パフォーマンス劣化'],
        steps: [
          '新機能無効化',
          'データベース前バージョン復旧',
          '設定ロールバック',
          '動作確認'
        ],
        estimatedTime: 60, // 分
        responsible: '開発部 鈴木一郎'
      }
    },
    {
      id: 'CHG-2025-001003',
      title: 'ネットワーク機器ファームウェア更新',
      description: 'コアスイッチCORE-SW-01〜03のファームウェア更新。セキュリティ修正およびパフォーマンス向上を含む。',
      category: 'Normal',
      subcategory: 'Network',
      priority: 'Medium',
      status: 'Implementation',
      riskLevel: 'High',
      requester: {
        name: '高橋美咲',
        department: 'ネットワーク運用部',
        email: 'takahashi@company.com'
      },
      implementer: {
        name: '伊藤和子',
        department: 'ネットワーク運用部',
        email: 'ito@company.com'
      },
      createdAt: '2025-06-18T13:00:00Z',
      updatedAt: '2025-06-22T09:45:00Z',
      plannedStartDate: '2025-06-22T01:00:00Z',
      plannedEndDate: '2025-06-22T05:00:00Z',
      actualStartDate: '2025-06-22T01:00:00Z',
      actualEndDate: null,
      businessJustification: 'ネットワークセキュリティ強化および安定性向上のため',
      impactAnalysis: {
        businessImpact: 'High',
        technicalImpact: 'High',
        userImpact: 'High',
        riskScore: 8.5,
        affectedSystems: ['CORE-SW-01', 'CORE-SW-02', 'CORE-SW-03'],
        affectedUsers: 2500,
        downtime: 180 // 分
      },
      timeline: {
        preparation: '2025-06-20T00:00:00Z',
        testing: '2025-06-21T00:00:00Z',
        implementation: '2025-06-22T01:00:00Z',
        rollback: '2025-06-22T06:00:00Z'
      },
      approvals: {
        cab: {
          status: 'approved',
          scheduledDate: '2025-06-19T14:00:00Z',
          members: ['山田次郎', '鈴木一郎', '高橋美咲', '伊藤和子'],
          approvedAt: '2025-06-19T15:00:00Z'
        },
        business: {
          status: 'approved',
          approver: 'COO 田中社長',
          approvedAt: '2025-06-19T17:00:00Z'
        },
        technical: {
          status: 'approved',
          approver: 'CTO 佐藤取締役',
          approvedAt: '2025-06-19T18:00:00Z'
        }
      }
    }
  ]);

  const [selectedChange, setSelectedChange] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [implementerFilter, setImplementerFilter] = useState('');

  // 統計計算
  const stats = useMemo(() => ({
    total: changes.length,
    pending: changes.filter(c => c.status === 'Pending').length,
    cabReview: changes.filter(c => c.status === 'CAB Review').length,
    approved: changes.filter(c => c.status === 'Approved').length,
    implementation: changes.filter(c => c.status === 'Implementation').length,
    completed: changes.filter(c => c.status === 'Completed').length,
    failed: changes.filter(c => c.status === 'Failed').length,
    highRisk: changes.filter(c => c.riskLevel === 'High').length,
    successRate: 94.7,
    avgImplementationTime: 3.2 // 時間
  }), [changes]);

  // フィルタリング
  const filteredChanges = useMemo(() => {
    return changes.filter(change => {
      if (statusFilter && change.status !== statusFilter) return false;
      if (categoryFilter && change.category !== categoryFilter) return false;
      if (riskFilter && change.riskLevel !== riskFilter) return false;
      if (implementerFilter && !change.implementer.name.toLowerCase().includes(implementerFilter.toLowerCase())) return false;
      return true;
    });
  }, [changes, statusFilter, categoryFilter, riskFilter, implementerFilter]);

  // チャートデータ
  const statusData = [
    { name: 'CAB審査', value: stats.cabReview, color: '#F59E0B' },
    { name: '承認済み', value: stats.approved, color: '#10B981' },
    { name: '実装中', value: stats.implementation, color: '#3B82F6' },
    { name: '完了', value: stats.completed, color: '#6B7280' }
  ];

  const riskDistribution = [
    { name: '低リスク', value: 8, color: '#10B981' },
    { name: '中リスク', value: 12, color: '#F59E0B' },
    { name: '高リスク', value: 4, color: '#EF4444' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-gray-100 text-gray-800';
      case 'CAB Review': return 'bg-yellow-100 text-yellow-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Implementation': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'bg-green-500 text-white';
      case 'Medium': return 'bg-yellow-500 text-white';
      case 'High': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;
  };

  const calculateTimeRemaining = (plannedStartDate: string) => {
    const start = new Date(plannedStartDate);
    const now = new Date();
    const diff = start.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleChangeDetail = (change: any) => {
    setSelectedChange(change);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          🔄 変更管理システム - CAB承認・リスク分析
        </h1>
        <p className="text-gray-600 mt-2">
          ITIL準拠の変更管理・CAB承認プロセス・リスク評価・ロールバック計画統合プラットフォーム
        </p>
      </div>

      {/* KPI統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">総変更要求</h3>
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-xs opacity-80 mt-1">CAB審査中: {stats.cabReview}件</p>
            </div>
            <div className="text-4xl opacity-80">📋</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">成功率</h3>
              <p className="text-3xl font-bold">{stats.successRate}%</p>
              <p className="text-xs opacity-80 mt-1">完了: {stats.completed}件</p>
            </div>
            <div className="text-4xl opacity-80">✅</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">高リスク変更</h3>
              <p className="text-3xl font-bold">{stats.highRisk}</p>
              <p className="text-xs opacity-80 mt-1">要注意監視</p>
            </div>
            <div className="text-4xl opacity-80">⚠️</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">平均実装時間</h3>
              <p className="text-3xl font-bold">{stats.avgImplementationTime}h</p>
              <p className="text-xs opacity-80 mt-1">目標: 4時間以内</p>
            </div>
            <div className="text-4xl opacity-80">⏱️</div>
          </div>
        </Card>
      </div>

      {/* チャート行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* ステータス分布 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📊 変更ステータス分布
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

        {/* リスク分布 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ⚠️ リスクレベル分布
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistribution}>
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
                { value: 'Pending', label: '申請中' },
                { value: 'CAB Review', label: 'CAB審査' },
                { value: 'Approved', label: '承認済み' },
                { value: 'Implementation', label: '実装中' },
                { value: 'Completed', label: '完了' },
                { value: 'Failed', label: '失敗' }
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
                { value: 'Emergency', label: '緊急変更' },
                { value: 'Major', label: '重要変更' },
                { value: 'Normal', label: '通常変更' },
                { value: 'Minor', label: '軽微変更' }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              リスクレベル
            </label>
            <Select
              value={riskFilter}
              onChange={setRiskFilter}
              options={[
                { value: '', label: '全て' },
                { value: 'Low', label: '低リスク' },
                { value: 'Medium', label: '中リスク' },
                { value: 'High', label: '高リスク' }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              実装者検索
            </label>
            <Input
              type="text"
              placeholder="実装者名で検索"
              value={implementerFilter}
              onChange={(e) => setImplementerFilter(e.target.value)}
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
            📝 新規変更要求
          </Button>
          <Button variant="secondary">
            📊 CABレポート
          </Button>
          <Button variant="secondary">
            📁 リスク評価
          </Button>
          <Button variant="secondary">
            🔄 一括承認
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          {filteredChanges.length} / {stats.total} 件表示中
        </div>
      </div>

      {/* 変更要求一覧テーブル */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📋 変更要求一覧・CAB承認状況
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  変更情報
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  要求者・実装者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  リスク・影響分析
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  スケジュール・承認
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredChanges.map((change) => {
                const daysToStart = calculateTimeRemaining(change.plannedStartDate);
                
                return (
                  <tr key={change.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">{change.id}</span>
                          <span className={`px-2 py-1 text-xs rounded ${getRiskColor(change.riskLevel)}`}>
                            {change.riskLevel}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${getStatusColor(change.status)}`}>
                            {change.status}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {change.title}
                        </div>
                        <div className="text-xs text-gray-600">
                          {change.category} / {change.subcategory}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          作成: {new Date(change.createdAt).toLocaleString('ja-JP')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          📝 {change.requester.name}
                        </div>
                        <div className="text-gray-600 text-xs">
                          {change.requester.department}
                        </div>
                        <div className="text-gray-600 text-xs mt-1">
                          実装: {change.implementer.name}
                        </div>
                        <div className="text-gray-600 text-xs">
                          {change.implementer.department}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-xs text-gray-600 mb-1">
                          リスクスコア: {change.impactAnalysis?.riskScore || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-600">
                          影響ユーザー: {change.impactAnalysis?.affectedUsers?.toLocaleString()}名
                        </div>
                        <div className="text-xs text-gray-600">
                          ダウンタイム: {formatDuration(change.impactAnalysis?.downtime || 0)}
                        </div>
                        <div className="text-xs text-gray-600">
                          影響システム: {change.impactAnalysis?.affectedSystems?.length}個
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className={`text-xs mb-1 ${
                          daysToStart < 0 ? 'text-red-600 font-medium' :
                          daysToStart < 3 ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          開始まで: {Math.abs(daysToStart)}日
                          {daysToStart < 0 && ' (実装中)'}
                        </div>
                        <div className="text-xs text-gray-600">
                          CAB: {change.approvals?.cab?.status || 'pending'}
                        </div>
                        <div className="text-xs text-gray-600">
                          技術: {change.approvals?.technical?.status || 'pending'}
                        </div>
                        <div className="text-xs text-gray-600">
                          業務: {change.approvals?.business?.status || 'pending'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col gap-1">
                        <Button 
                          size="sm" 
                          variant="primary"
                          onClick={() => handleChangeDetail(change)}
                        >
                          詳細表示
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary"
                        >
                          CAB審査
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
      {isDetailModalOpen && selectedChange && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`変更要求詳細: ${selectedChange.id}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* 基本情報 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">📋 基本情報</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">変更ID:</span>
                  <span className="ml-2 font-medium">{selectedChange.id}</span>
                </div>
                <div>
                  <span className="text-gray-600">タイトル:</span>
                  <span className="ml-2 font-medium">{selectedChange.title}</span>
                </div>
                <div>
                  <span className="text-gray-600">カテゴリ:</span>
                  <span className="ml-2">{selectedChange.category}</span>
                </div>
                <div>
                  <span className="text-gray-600">リスクレベル:</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded ${getRiskColor(selectedChange.riskLevel)}`}>
                    {selectedChange.riskLevel}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">ステータス:</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded ${getStatusColor(selectedChange.status)}`}>
                    {selectedChange.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">優先度:</span>
                  <span className="ml-2">{selectedChange.priority}</span>
                </div>
              </div>
            </div>

            {/* 詳細説明 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">📝 詳細説明</h4>
              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                {selectedChange.description}
              </div>
            </div>

            {/* 影響分析 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">⚠️ 影響分析</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">ビジネス影響:</span>
                  <span className="ml-2 font-medium">{selectedChange.impactAnalysis?.businessImpact}</span>
                </div>
                <div>
                  <span className="text-gray-600">技術的影響:</span>
                  <span className="ml-2">{selectedChange.impactAnalysis?.technicalImpact}</span>
                </div>
                <div>
                  <span className="text-gray-600">ユーザー影響:</span>
                  <span className="ml-2">{selectedChange.impactAnalysis?.userImpact}</span>
                </div>
                <div>
                  <span className="text-gray-600">リスクスコア:</span>
                  <span className="ml-2 font-medium text-red-600">{selectedChange.impactAnalysis?.riskScore}</span>
                </div>
                <div>
                  <span className="text-gray-600">影響ユーザー:</span>
                  <span className="ml-2">{selectedChange.impactAnalysis?.affectedUsers?.toLocaleString()}名</span>
                </div>
                <div>
                  <span className="text-gray-600">予想ダウンタイム:</span>
                  <span className="ml-2">{formatDuration(selectedChange.impactAnalysis?.downtime || 0)}</span>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-gray-600">影響システム:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedChange.impactAnalysis?.affectedSystems?.map((system, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {system}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* CAB承認状況 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">✅ CAB承認状況</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <span className="font-medium">CAB承認</span>
                    <div className="text-sm text-gray-600">
                      予定: {new Date(selectedChange.approvals?.cab?.scheduledDate || '').toLocaleString('ja-JP')}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    selectedChange.approvals?.cab?.status === 'approved' ? 'bg-green-100 text-green-800' :
                    selectedChange.approvals?.cab?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedChange.approvals?.cab?.status}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <span className="font-medium">技術承認</span>
                    <div className="text-sm text-gray-600">
                      承認者: {selectedChange.approvals?.technical?.approver}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    selectedChange.approvals?.technical?.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedChange.approvals?.technical?.status}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <span className="font-medium">業務承認</span>
                    <div className="text-sm text-gray-600">
                      承認者: {selectedChange.approvals?.business?.approver}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    selectedChange.approvals?.business?.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedChange.approvals?.business?.status}
                  </span>
                </div>
              </div>
            </div>

            {/* ロールバック計画 */}
            {selectedChange.rollbackPlan && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">🔄 ロールバック計画</h4>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-gray-700">発動条件:</span>
                    <ul className="mt-1 list-disc list-inside text-sm text-gray-600">
                      {selectedChange.rollbackPlan.triggerConditions.map((condition, index) => (
                        <li key={index}>{condition}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">ロールバック手順:</span>
                    <ol className="mt-1 list-decimal list-inside text-sm text-gray-600">
                      {selectedChange.rollbackPlan.steps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">推定時間:</span>
                      <span className="ml-2 font-medium">{formatDuration(selectedChange.rollbackPlan.estimatedTime)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">責任者:</span>
                      <span className="ml-2">{selectedChange.rollbackPlan.responsible}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* テスト結果 */}
            {selectedChange.testResults && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">🧪 テスト結果</h4>
                <div className="space-y-2">
                  {selectedChange.testResults.map((test, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium">{test.environment}</span>
                        <div className="text-sm text-gray-600">{test.details}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(test.date).toLocaleString('ja-JP')}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        test.status === 'passed' ? 'bg-green-100 text-green-800' :
                        test.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {test.status}
                      </span>
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

export default DetailedChangeManagementPage;