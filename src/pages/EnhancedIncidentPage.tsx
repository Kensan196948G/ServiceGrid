import * as React from 'react';
const { useState, useEffect, useCallback, useMemo } = React;
import { Incident, Priority } from '../types';
import { Button, Table, Modal, Input, Textarea, Select, Card } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

// 拡張インシデント管理ページ - 詳細分析・SLA監視機能付き
const EnhancedIncidentPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // インシデント統計
  const incidentStats = {
    totalIncidents: 1847,
    activeIncidents: 23,
    resolvedToday: 15,
    criticalIncidents: 5,
    averageResolutionTime: 2.4, // 時間
    slaCompliance: 94.2, // %
    escalatedIncidents: 8
  };

  // 詳細インシデントデータ
  const detailedIncidents = [
    {
      id: 'INC-2025-001234',
      title: 'WEBサーバー応答時間異常',
      description: 'WEB-SRV-01のレスポンス時間が通常の5倍に増加。ユーザーからアクセス遅延の報告が複数件。',
      priority: 'Critical',
      status: 'In Progress', 
      category: 'Infrastructure',
      subcategory: 'Server Performance',
      impact: 'High',
      urgency: 'High',
      reporter: {
        name: '田中太郎',
        department: 'IT運用部',
        contact: 'tanaka@company.com'
      },
      assignee: {
        name: '佐藤花子',
        department: 'インフラチーム',
        contact: 'sato@company.com'
      },
      timeline: {
        reported: '2025-06-22T09:15:00Z',
        acknowledged: '2025-06-22T09:18:00Z',
        inProgress: '2025-06-22T09:25:00Z',
        targetResolution: '2025-06-22T13:15:00Z'
      },
      sla: {
        responseTime: 4, // 分
        resolutionTime: 240, // 分
        escalationTime: 60, // 分
        breached: false
      },
      affectedSystems: [
        'WEB-SRV-01',
        'LB-01',
        'DB-CLUSTER-01'
      ],
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
      ],
      resolution: {
        rootCause: 'Webアプリケーションのメモリリーク',
        solution: 'アプリケーション再起動及びメモリ使用量監視の強化',
        preventiveMeasures: [
          'メモリ使用量アラートの追加',
          'アプリケーションログの詳細監視',
          '定期的な再起動スケジュールの検討'
        ]
      },
      metrics: {
        timeToAcknowledge: 3, // 分
        timeToResolve: 45, // 分（進行中の場合は現在までの時間）
        customerImpact: 'Medium',
        businessImpact: 'High'
      }
    },
    {
      id: 'INC-2025-001235',
      title: 'メール配信システム障害',
      description: 'Exchange Server 2019にて送信メールが配信キューに蓄積され、外部への配信が停止。',
      priority: 'High',
      status: 'Resolved',
      category: 'Application',
      subcategory: 'Email System',
      impact: 'Medium',
      urgency: 'High',
      reporter: {
        name: '鈴木一郎',
        department: '総務部',
        contact: 'suzuki@company.com'
      },
      assignee: {
        name: '伊藤和子',
        department: 'システム管理部',
        contact: 'ito@company.com'
      },
      timeline: {
        reported: '2025-06-22T08:30:00Z',
        acknowledged: '2025-06-22T08:33:00Z',
        inProgress: '2025-06-22T08:40:00Z',
        resolved: '2025-06-22T10:15:00Z',
        targetResolution: '2025-06-22T12:30:00Z'
      },
      sla: {
        responseTime: 3,
        resolutionTime: 105,
        escalationTime: 60,
        breached: false
      },
      affectedSystems: [
        'MAIL-SRV-01',
        'MAIL-SRV-02'
      ],
      worklog: [
        {
          timestamp: '2025-06-22T08:40:00Z',
          author: '伊藤和子',
          action: 'キュー状況確認',
          details: '送信キューに254通のメールが蓄積。SMTP接続エラーを確認。'
        },
        {
          timestamp: '2025-06-22T09:15:00Z',
          author: '伊藤和子',
          action: 'サービス再起動',
          details: 'Microsoft Exchange Transport Serviceを再起動。'
        },
        {
          timestamp: '2025-06-22T10:15:00Z',
          author: '伊藤和子',
          action: '解決確認',
          details: 'キューが正常に処理され、テストメール送信も成功。障害解決を確認。'
        }
      ],
      resolution: {
        rootCause: 'Exchange Transport Serviceの一時的な停止',
        solution: 'サービス再起動によりキューが正常に処理開始',
        preventiveMeasures: [
          'Exchange健全性監視の強化',
          'キュー蓄積アラートの設定',
          'サービス監視の頻度向上'
        ]
      },
      metrics: {
        timeToAcknowledge: 3,
        timeToResolve: 105,
        customerImpact: 'Medium',
        businessImpact: 'Medium'
      }
    }
  ];

  // 優先度別分布
  const priorityDistribution = [
    { name: 'Critical', value: 5, color: '#DC2626', slaTarget: 1 },
    { name: 'High', value: 18, color: '#EA580C', slaTarget: 4 },
    { name: 'Medium', value: 45, color: '#CA8A04', slaTarget: 8 },
    { name: 'Low', value: 67, color: '#16A34A', slaTarget: 24 }
  ];

  // カテゴリ別分布
  const categoryDistribution = [
    { name: 'Infrastructure', value: 45, percentage: 33.3 },
    { name: 'Application', value: 38, percentage: 28.1 },
    { name: 'Network', value: 25, percentage: 18.5 },
    { name: 'Security', value: 15, percentage: 11.1 },
    { name: 'Hardware', value: 12, percentage: 8.9 }
  ];

  // 時間別発生傾向
  const hourlyTrend = [
    { hour: '00:00', incidents: 2, resolved: 1 },
    { hour: '03:00', incidents: 1, resolved: 2 },
    { hour: '06:00', incidents: 3, resolved: 1 },
    { hour: '09:00', incidents: 8, resolved: 6 },
    { hour: '12:00', incidents: 12, resolved: 9 },
    { hour: '15:00', incidents: 15, resolved: 12 },
    { hour: '18:00', incidents: 9, resolved: 14 },
    { hour: '21:00', incidents: 4, resolved: 8 }
  ];

  // SLA遵守状況
  const slaCompliance = [
    { metric: '応答時間', target: '15分以内', actual: '12分', compliance: 96.8, status: 'good' },
    { metric: '解決時間', target: '4時間以内', actual: '2.4時間', compliance: 94.2, status: 'good' },
    { metric: 'エスカレーション', target: '1時間以内', actual: '45分', compliance: 98.1, status: 'excellent' },
    { metric: '顧客満足度', target: '4.0以上', actual: '4.3', compliance: 92.5, status: 'good' }
  ];

  const handleIncidentDetail = (incident: any) => {
    setSelectedIncident(incident);
    setIsDetailModalOpen(true);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;
  };

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          🚨 インシデント管理システム - 統合分析ダッシュボード
        </h1>
        <p className="text-gray-600 mt-2">
          ITIL準拠のインシデント管理・SLA監視・根本原因分析を統合したプラットフォーム
        </p>
      </div>

      {/* KPI統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">アクティブインシデント</h3>
              <p className="text-3xl font-bold">{incidentStats.activeIncidents}</p>
              <p className="text-xs opacity-80 mt-1">緊急: {incidentStats.criticalIncidents}件</p>
            </div>
            <div className="text-4xl opacity-80">🚨</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">本日解決済み</h3>
              <p className="text-3xl font-bold">{incidentStats.resolvedToday}</p>
              <p className="text-xs opacity-80 mt-1">解決率: 86.2%</p>
            </div>
            <div className="text-4xl opacity-80">✅</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">平均解決時間</h3>
              <p className="text-3xl font-bold">{incidentStats.averageResolutionTime}h</p>
              <p className="text-xs opacity-80 mt-1">目標: 4時間以内</p>
            </div>
            <div className="text-4xl opacity-80">⏱️</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">SLA遵守率</h3>
              <p className="text-3xl font-bold">{incidentStats.slaCompliance}%</p>
              <p className="text-xs opacity-80 mt-1">目標: 95%以上</p>
            </div>
            <div className="text-4xl opacity-80">📊</div>
          </div>
        </Card>
      </div>

      {/* チャート行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 優先度別分布 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🔴 優先度別インシデント分布・SLA目標
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value, percent }) => 
                    `${name}: ${value}件 (${(percent * 100).toFixed(1)}%)`
                  }
                >
                  {priorityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any, props: any) => [
                    `${value}件`,
                    `SLA目標: ${props.payload.slaTarget}時間以内`
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {priorityDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span>{item.name}</span>
                </div>
                <span className="text-gray-600">SLA: {item.slaTarget}時間</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 時間別発生傾向 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibent text-gray-900 mb-4">
            📈 24時間インシデント発生・解決傾向
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="incidents" fill="#EF4444" name="新規発生" />
                <Bar dataKey="resolved" fill="#10B981" name="解決済み" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>📊 <strong>分析:</strong> 業務時間帯（9:00-18:00）にインシデント発生が集中。15:00にピークを迎える傾向。</p>
          </div>
        </Card>
      </div>

      {/* SLA遵守状況 */}
      <Card className="p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📋 SLA遵守状況・パフォーマンス指標
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {slaCompliance.map((sla, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{sla.metric}</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  sla.status === 'excellent' ? 'bg-green-100 text-green-800' :
                  sla.status === 'good' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {sla.compliance}%
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">目標:</span>
                  <span className="font-medium">{sla.target}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">実績:</span>
                  <span className="font-medium text-blue-600">{sla.actual}</span>
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      sla.status === 'excellent' ? 'bg-green-500' :
                      sla.status === 'good' ? 'bg-blue-500' :
                      'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.min(sla.compliance, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 詳細インシデント一覧 */}
      <Card className="p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🔍 アクティブインシデント詳細・作業履歴
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  インシデント情報
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  担当・影響範囲
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SLA・進捗
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {detailedIncidents.map((incident) => (
                <tr key={incident.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{incident.id}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(incident.priority)}`}>
                          {incident.priority}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(incident.status)}`}>
                          {incident.status}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 mb-1">{incident.title}</div>
                      <div className="text-xs text-gray-600">{incident.category} / {incident.subcategory}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        報告: {new Date(incident.timeline.reported).toLocaleString('ja-JP')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">👤 {incident.assignee.name}</div>
                      <div className="text-gray-600">{incident.assignee.department}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        影響システム: {incident.affectedSystems.length}個
                      </div>
                      <div className="text-xs text-gray-500">
                        影響度: {incident.impact} / 緊急度: {incident.urgency}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-600">目標解決:</span>
                        <span className="font-medium">
                          {formatDuration(incident.sla.resolutionTime)}
                        </span>
                        {!incident.sla.breached && (
                          <span className="text-green-600 text-xs">✓</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        経過時間: {formatDuration(incident.metrics.timeToResolve)}
                      </div>
                      <div className="text-xs text-gray-600">
                        ビジネス影響: {incident.metrics.businessImpact}
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className={`h-1 rounded-full ${
                              incident.metrics.timeToResolve / incident.sla.resolutionTime < 0.7 ? 'bg-green-500' :
                              incident.metrics.timeToResolve / incident.sla.resolutionTime < 0.9 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ 
                              width: `${Math.min((incident.metrics.timeToResolve / incident.sla.resolutionTime) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      size="sm" 
                      variant="primary"
                      onClick={() => handleIncidentDetail(incident)}
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

      {/* カテゴリ別分析 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🏗️ カテゴリ別インシデント分析・トレンド
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {categoryDistribution.map((category, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <h4 className="font-medium text-gray-900 mb-2">{category.name}</h4>
              <div className="text-2xl font-bold text-blue-600">{category.value}</div>
              <div className="text-sm text-gray-600">{category.percentage}%</div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${category.percentage * 2}%` }}
                ></div>
              </div>
            </div>
          ))}
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

            {/* 説明・詳細 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">📝 詳細説明</h4>
              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                {selectedIncident.description}
              </div>
            </div>

            {/* 担当者情報 */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">👤 報告者</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>氏名:</strong> {selectedIncident.reporter.name}</div>
                  <div><strong>部署:</strong> {selectedIncident.reporter.department}</div>
                  <div><strong>連絡先:</strong> {selectedIncident.reporter.contact}</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">🔧 担当者</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>氏名:</strong> {selectedIncident.assignee.name}</div>
                  <div><strong>部署:</strong> {selectedIncident.assignee.department}</div>
                  <div><strong>連絡先:</strong> {selectedIncident.assignee.contact}</div>
                </div>
              </div>
            </div>

            {/* タイムライン */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">⏰ タイムライン・SLA</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">報告時刻:</span>
                  <span>{new Date(selectedIncident.timeline.reported).toLocaleString('ja-JP')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">確認時刻:</span>
                  <span>{new Date(selectedIncident.timeline.acknowledged).toLocaleString('ja-JP')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">対応開始:</span>
                  <span>{new Date(selectedIncident.timeline.inProgress).toLocaleString('ja-JP')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">解決目標:</span>
                  <span className="font-medium text-blue-600">
                    {new Date(selectedIncident.timeline.targetResolution).toLocaleString('ja-JP')}
                  </span>
                </div>
                {selectedIncident.timeline.resolved && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">解決時刻:</span>
                    <span className="text-green-600">
                      {new Date(selectedIncident.timeline.resolved).toLocaleString('ja-JP')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 影響システム */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">🖥️ 影響システム</h4>
              <div className="flex flex-wrap gap-2">
                {selectedIncident.affectedSystems.map((system: string, index: number) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {system}
                  </span>
                ))}
              </div>
            </div>

            {/* 作業ログ */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">📋 作業ログ</h4>
              <div className="space-y-3">
                {selectedIncident.worklog.map((log: any, index: number) => (
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

            {/* 解決情報（解決済みの場合） */}
            {selectedIncident.status === 'Resolved' && selectedIncident.resolution && (
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
                      {selectedIncident.resolution.preventiveMeasures.map((measure: string, index: number) => (
                        <li key={index}>{measure}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* メトリクス */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">📊 パフォーマンスメトリクス</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="font-medium text-blue-900">確認までの時間</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedIncident.metrics.timeToAcknowledge}分
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="font-medium text-green-900">解決時間</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatDuration(selectedIncident.metrics.timeToResolve)}
                  </div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="font-medium text-yellow-900">顧客影響</div>
                  <div className="text-lg font-bold text-yellow-600">
                    {selectedIncident.metrics.customerImpact}
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="font-medium text-purple-900">ビジネス影響</div>
                  <div className="text-lg font-bold text-purple-600">
                    {selectedIncident.metrics.businessImpact}
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

export default EnhancedIncidentPage;