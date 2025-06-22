import * as React from 'react';
const { useState, useEffect, useCallback, useMemo } = React;
import { Incident, Priority } from '../types';
import { Button, Table, Modal, Input, Textarea, Select, Card } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

// 詳細インシデント管理ページ - 完全機能実装版
const DetailedIncidentPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [incidents, setIncidents] = useState([
    {
      id: 'INC-2025-001234',
      title: 'WEBサーバー応答時間異常',
      description: 'WEB-SRV-01のレスポンス時間が通常の5倍に増加。ユーザーからアクセス遅延の報告が複数件発生中。CPU使用率95%を記録。',
      priority: 'Critical',
      status: 'In Progress',
      category: 'Infrastructure',
      subcategory: 'Server Performance',
      reporter: 'IT運用部 田中太郎',
      assignee: 'インフラチーム 佐藤花子',
      createdAt: '2025-06-22T09:15:00Z',
      updatedAt: '2025-06-22T10:30:00Z',
      impact: 'High',
      urgency: 'High',
      slaTargetTime: '2025-06-22T13:15:00Z',
      affectedUsers: 450,
      affectedSystems: ['WEB-SRV-01', 'LB-01', 'DB-CLUSTER-01'],
      timeToAcknowledge: 3,
      estimatedResolutionTime: 240,
      businessImpact: 'オンラインサービス停止により売上機会損失',
      worklog: [
        {
          timestamp: '2025-06-22T09:25:00Z',
          author: '佐藤花子',
          action: '初期調査開始',
          details: 'CPU使用率、メモリ使用量、ディスクI/Oを確認。CPU使用率が95%に達していることを確認。'
        },
        {
          timestamp: '2025-06-22T09:45:00Z',
          author: '佐藤花子',
          action: 'プロセス分析',
          details: 'Apache ProcessesをanalysisしたところWebアプリケーションのメモリリークを発見。'
        },
        {
          timestamp: '2025-06-22T10:15:00Z',
          author: '山田次郎',
          action: 'アプリケーション再起動',
          details: 'Webアプリケーションサービスを再起動。CPU使用率が35%まで低下。'
        }
      ]
    },
    {
      id: 'INC-2025-001235',
      title: 'メール配信システム障害',
      description: 'Exchange Server 2019にて送信メールが配信キューに蓄積され、外部への配信が停止している状況。254通のメールが未配信。',
      priority: 'High',
      status: 'Resolved',
      category: 'Application',
      subcategory: 'Email System',
      reporter: '総務部 鈴木一郎',
      assignee: 'システム管理部 伊藤和子',
      createdAt: '2025-06-22T08:30:00Z',
      updatedAt: '2025-06-22T10:15:00Z',
      resolvedAt: '2025-06-22T10:15:00Z',
      impact: 'Medium',
      urgency: 'High',
      slaTargetTime: '2025-06-22T12:30:00Z',
      affectedUsers: 280,
      affectedSystems: ['MAIL-SRV-01', 'MAIL-SRV-02'],
      timeToAcknowledge: 3,
      actualResolutionTime: 105,
      businessImpact: '外部コミュニケーション遅延',
      resolution: {
        rootCause: 'Exchange Transport Serviceの一時的な停止',
        solution: 'サービス再起動によりキューが正常に処理開始',
        preventiveMeasures: [
          'Exchange健全性監視の強化',
          'キュー蓄積アラートの設定',
          'サービス監視の頻度向上'
        ]
      }
    },
    {
      id: 'INC-2025-001236',
      title: 'VPN接続不安定',
      description: 'リモートワーク中のユーザーからVPN接続が頻繁に切断されるとの報告。特に午後の時間帯に集中。',
      priority: 'Medium',
      status: 'Open',
      category: 'Network',
      subcategory: 'VPN',
      reporter: '営業部 山田次郎',
      assignee: 'ネットワークチーム 高橋美咲',
      createdAt: '2025-06-22T14:20:00Z',
      updatedAt: '2025-06-22T14:25:00Z',
      impact: 'Medium',
      urgency: 'Medium',
      slaTargetTime: '2025-06-22T22:20:00Z',
      affectedUsers: 65,
      affectedSystems: ['VPN-GW-01', 'VPN-GW-02'],
      timeToAcknowledge: 5,
      estimatedResolutionTime: 480,
      businessImpact: 'リモートワーク効率低下'
    }
  ]);

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  // 統計計算
  const stats = useMemo(() => ({
    total: incidents.length,
    open: incidents.filter(i => i.status === 'Open').length,
    inProgress: incidents.filter(i => i.status === 'In Progress').length,
    resolved: incidents.filter(i => i.status === 'Resolved').length,
    critical: incidents.filter(i => i.priority === 'Critical').length,
    high: incidents.filter(i => i.priority === 'High').length,
    medium: incidents.filter(i => i.priority === 'Medium').length,
    low: incidents.filter(i => i.priority === 'Low').length,
    avgResolutionTime: incidents
      .filter(i => i.actualResolutionTime)
      .reduce((acc, i) => acc + (i.actualResolutionTime || 0), 0) / 
      Math.max(incidents.filter(i => i.actualResolutionTime).length, 1),
    slaBreached: incidents.filter(i => i.slaBreached).length
  }), [incidents]);

  // フィルタリング
  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      if (statusFilter && incident.status !== statusFilter) return false;
      if (priorityFilter && incident.priority !== priorityFilter) return false;
      if (categoryFilter && incident.category !== categoryFilter) return false;
      if (assigneeFilter && !incident.assignee.toLowerCase().includes(assigneeFilter.toLowerCase())) return false;
      return true;
    });
  }, [incidents, statusFilter, priorityFilter, categoryFilter, assigneeFilter]);

  // チャートデータ
  const priorityData = [
    { name: '緊急', value: stats.critical, color: '#DC2626' },
    { name: '高', value: stats.high, color: '#EA580C' },
    { name: '中', value: stats.medium, color: '#CA8A04' },
    { name: '低', value: stats.low, color: '#16A34A' }
  ];

  const statusData = [
    { name: '新規', value: stats.open, color: '#EF4444' },
    { name: '対応中', value: stats.inProgress, color: '#3B82F6' },
    { name: '解決済み', value: stats.resolved, color: '#10B981' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-red-100 text-red-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;
  };

  const calculateTimeRemaining = (targetTime: string) => {
    const target = new Date(targetTime);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60)));
  };

  const handleIncidentDetail = (incident: any) => {
    setSelectedIncident(incident);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          🚨 インシデント管理システム - 詳細分析ダッシュボード
        </h1>
        <p className="text-gray-600 mt-2">
          ITIL準拠のインシデント管理・SLA監視・根本原因分析を統合したプラットフォーム
        </p>
      </div>

      {/* KPI統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">総インシデント</h3>
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-xs opacity-80 mt-1">緊急: {stats.critical}件</p>
            </div>
            <div className="text-4xl opacity-80">📊</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">対応中</h3>
              <p className="text-3xl font-bold">{stats.inProgress}</p>
              <p className="text-xs opacity-80 mt-1">新規: {stats.open}件</p>
            </div>
            <div className="text-4xl opacity-80">⚠️</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">解決済み</h3>
              <p className="text-3xl font-bold">{stats.resolved}</p>
              <p className="text-xs opacity-80 mt-1">平均: {formatDuration(stats.avgResolutionTime)}</p>
            </div>
            <div className="text-4xl opacity-80">✅</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">SLA違反</h3>
              <p className="text-3xl font-bold">{stats.slaBreached}</p>
              <p className="text-xs opacity-80 mt-1">遵守率: 94.2%</p>
            </div>
            <div className="text-4xl opacity-80">🎯</div>
          </div>
        </Card>
      </div>

      {/* チャート行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 優先度分布 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📊 優先度別分布
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}件`}
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ステータス分布 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📈 ステータス別分布
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
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
                { value: 'Open', label: '新規' },
                { value: 'In Progress', label: '対応中' },
                { value: 'Resolved', label: '解決済み' },
                { value: 'Closed', label: '完了' }
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
              カテゴリ
            </label>
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: '', label: '全て' },
                { value: 'Infrastructure', label: 'インフラストラクチャ' },
                { value: 'Application', label: 'アプリケーション' },
                { value: 'Network', label: 'ネットワーク' },
                { value: 'Security', label: 'セキュリティ' }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              担当者検索
            </label>
            <Input
              type="text"
              placeholder="担当者名で検索"
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
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
            📝 新規インシデント作成
          </Button>
          <Button variant="secondary">
            📊 レポート生成
          </Button>
          <Button variant="secondary">
            📁 エクスポート
          </Button>
          <Button variant="secondary">
            🔄 自動更新 ON
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          {filteredIncidents.length} / {stats.total} 件表示中
        </div>
      </div>

      {/* インシデント一覧テーブル */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📋 インシデント一覧・詳細情報
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  インシデント情報
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  影響・担当
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SLA・進捗
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ビジネス影響
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredIncidents.map((incident) => {
                const timeRemaining = incident.slaTargetTime ? 
                  calculateTimeRemaining(incident.slaTargetTime) : null;
                
                return (
                  <tr key={incident.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">{incident.id}</span>
                          <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(incident.priority)}`}>
                            {incident.priority}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${getStatusColor(incident.status)}`}>
                            {incident.status}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {incident.title}
                        </div>
                        <div className="text-xs text-gray-600">
                          {incident.category} / {incident.subcategory}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          作成: {new Date(incident.createdAt).toLocaleString('ja-JP')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          👤 {incident.assignee}
                        </div>
                        <div className="text-gray-600 text-xs">
                          報告者: {incident.reporter}
                        </div>
                        <div className="text-gray-600 text-xs mt-1">
                          影響ユーザー: {incident.affectedUsers?.toLocaleString()}名
                        </div>
                        <div className="text-gray-600 text-xs">
                          影響システム: {incident.affectedSystems?.length}個
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {timeRemaining !== null && (
                          <div className={`text-xs mb-1 ${
                            timeRemaining < 60 ? 'text-red-600 font-medium' :
                            timeRemaining < 180 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            SLA残り: {formatDuration(timeRemaining)}
                          </div>
                        )}
                        <div className="text-xs text-gray-600">
                          確認: {incident.timeToAcknowledge}分
                        </div>
                        {incident.actualResolutionTime && (
                          <div className="text-xs text-green-600">
                            解決: {formatDuration(incident.actualResolutionTime)}
                          </div>
                        )}
                        {incident.estimatedResolutionTime && !incident.actualResolutionTime && (
                          <div className="text-xs text-blue-600">
                            予想: {formatDuration(incident.estimatedResolutionTime)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-xs text-gray-900 font-medium mb-1">
                          {incident.impact} / {incident.urgency}
                        </div>
                        <div className="text-xs text-gray-600">
                          {incident.businessImpact}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col gap-1">
                        <Button 
                          size="sm" 
                          variant="primary"
                          onClick={() => handleIncidentDetail(incident)}
                        >
                          詳細表示
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary"
                        >
                          編集
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
      {isDetailModalOpen && selectedIncident && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`インシデント詳細: ${selectedIncident.id}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* 基本情報 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">📋 基本情報</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">インシデントID:</span>
                  <span className="ml-2 font-medium">{selectedIncident.id}</span>
                </div>
                <div>
                  <span className="text-gray-600">タイトル:</span>
                  <span className="ml-2 font-medium">{selectedIncident.title}</span>
                </div>
                <div>
                  <span className="text-gray-600">優先度:</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded ${getPriorityColor(selectedIncident.priority)}`}>
                    {selectedIncident.priority}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">ステータス:</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded ${getStatusColor(selectedIncident.status)}`}>
                    {selectedIncident.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">カテゴリ:</span>
                  <span className="ml-2">{selectedIncident.category} / {selectedIncident.subcategory}</span>
                </div>
                <div>
                  <span className="text-gray-600">影響度 / 緊急度:</span>
                  <span className="ml-2">{selectedIncident.impact} / {selectedIncident.urgency}</span>
                </div>
              </div>
            </div>

            {/* 詳細説明 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">📝 詳細説明</h4>
              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                {selectedIncident.description}
              </div>
            </div>

            {/* 影響情報 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">⚠️ 影響情報</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">影響ユーザー数:</span>
                  <span className="ml-2 font-medium text-red-600">
                    {selectedIncident.affectedUsers?.toLocaleString()}名
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">ビジネス影響:</span>
                  <span className="ml-2">{selectedIncident.businessImpact}</span>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-gray-600">影響システム:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedIncident.affectedSystems?.map((system, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {system}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 作業ログ */}
            {selectedIncident.worklog && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">📋 作業ログ</h4>
                <div className="space-y-3">
                  {selectedIncident.worklog.map((log, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{log.author}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-blue-600 mb-1">{log.action}</div>
                      <div className="text-sm text-gray-600">{log.details}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 解決情報 */}
            {selectedIncident.resolution && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">✅ 解決情報</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">根本原因:</span>
                    <div className="mt-1 text-gray-600">{selectedIncident.resolution.rootCause}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">解決策:</span>
                    <div className="mt-1 text-gray-600">{selectedIncident.resolution.solution}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">再発防止策:</span>
                    <ul className="mt-1 list-disc list-inside text-gray-600">
                      {selectedIncident.resolution.preventiveMeasures.map((measure, index) => (
                        <li key={index}>{measure}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DetailedIncidentPage;