import * as React from 'react';
const { useState, useEffect, useCallback, useMemo } = React;
import { Card, Button, Spinner } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

// 拡張ダッシュボードページ - 詳細情報表示
const EnhancedDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  // 詳細統計データ
  const systemStats = {
    totalUsers: 1247,
    activeIncidents: 23,
    pendingRequests: 45,
    totalAssets: 3892,
    criticalAlerts: 5,
    systemUptime: 99.97,
    averageResolutionTime: '2.4時間',
    customerSatisfaction: 4.3
  };

  // リアルタイムアクティビティ
  const recentActivities = [
    {
      id: '1',
      type: 'incident',
      icon: '🚨',
      title: 'サーバーCPU使用率高騰',
      description: 'WEB-SRV-01のCPU使用率が95%に達しました',
      timestamp: '2分前',
      priority: 'Critical',
      status: '対応中',
      assignee: '田中太郎'
    },
    {
      id: '2', 
      type: 'request',
      icon: '📝',
      title: 'Office365ライセンス申請',
      description: '営業部から5名分のライセンス追加申請',
      timestamp: '15分前',
      priority: 'Medium',
      status: '承認待ち',
      assignee: '佐藤花子'
    },
    {
      id: '3',
      type: 'asset',
      icon: '💻', 
      title: '新規ノートPC配備',
      description: 'ThinkPad X1 Carbon (5台) を経理部に配備完了',
      timestamp: '1時間前',
      priority: 'Low',
      status: '完了',
      assignee: '山田次郎'
    },
    {
      id: '4',
      type: 'change',
      icon: '🔄',
      title: 'ファイアウォール設定変更',
      description: 'DMZゾーンのポート443アクセス許可設定',
      timestamp: '3時間前', 
      priority: 'High',
      status: '実装完了',
      assignee: '鈴木一郎'
    }
  ];

  // インシデント傾向データ
  const incidentTrendData = [
    { 
      name: '6月17日', 
      incidents: 12, 
      resolved: 10, 
      critical: 2,
      description: '週初めのトラフィック増加により軽微な問題が発生' 
    },
    { 
      name: '6月18日', 
      incidents: 8, 
      resolved: 15, 
      critical: 1,
      description: '前日分の解決が進み、新規発生は減少傾向' 
    },
    { 
      name: '6月19日', 
      incidents: 15, 
      resolved: 12, 
      critical: 3,
      description: 'メンテナンス作業の影響で一時的に増加' 
    },
    { 
      name: '6月20日', 
      incidents: 6, 
      resolved: 8, 
      critical: 0,
      description: '木曜日は例年通り安定稼働' 
    },
    { 
      name: '6月21日', 
      incidents: 9, 
      resolved: 14, 
      critical: 1,
      description: '週末前の最終確認作業で軽微な問題を発見・解決' 
    },
    { 
      name: '6月22日', 
      incidents: 11, 
      resolved: 6, 
      critical: 2,
      description: '週末メンテナンス準備の影響で新規課題が発生中'
    }
  ];

  // 資産分布データ
  const assetDistributionData = [
    { 
      name: 'サーバー', 
      value: 45, 
      color: '#4F46E5',
      details: '物理サーバー: 23台, 仮想サーバー: 22台',
      utilization: '87%'
    },
    { 
      name: 'デスクトップ', 
      value: 120, 
      color: '#06B6D4',
      details: 'Windows: 95台, Mac: 25台',
      utilization: '92%'
    },
    { 
      name: 'ノートPC', 
      value: 85, 
      color: '#10B981',
      details: 'ThinkPad: 45台, MacBook: 25台, その他: 15台',
      utilization: '78%'
    },
    { 
      name: 'ネットワーク機器', 
      value: 32, 
      color: '#F59E0B',
      details: 'ルーター: 8台, スイッチ: 18台, AP: 6台',
      utilization: '95%'
    },
    { 
      name: 'その他', 
      value: 28, 
      color: '#EF4444',
      details: 'プリンター: 15台, 周辺機器: 13台',
      utilization: '65%'
    }
  ];

  // システムパフォーマンス
  const systemPerformanceData = [
    { 
      name: '00:00', 
      cpu: 45, 
      memory: 60, 
      disk: 30,
      network: 25,
      description: '深夜時間帯 - バックアップ処理実行中'
    },
    { 
      name: '04:00', 
      cpu: 35, 
      memory: 55, 
      disk: 32,
      network: 20,
      description: '早朝時間帯 - システム最適化処理'
    },
    { 
      name: '08:00', 
      cpu: 75, 
      memory: 70, 
      disk: 45,
      network: 60,
      description: '業務開始時間 - ユーザーログイン集中'
    },
    { 
      name: '12:00', 
      cpu: 85, 
      memory: 80, 
      disk: 50,
      network: 75,
      description: '昼休み前 - 業務アプリケーション使用ピーク'
    },
    { 
      name: '16:00', 
      cpu: 90, 
      memory: 85, 
      disk: 55,
      network: 80,
      description: '午後のピーク時間 - 会議・プレゼン資料作成'
    },
    { 
      name: '20:00', 
      cpu: 65, 
      memory: 75, 
      disk: 40,
      network: 45,
      description: '夕方時間帯 - 業務終了に向けて徐々に減少'
    }
  ];

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value}
              {entry.dataKey === 'cpu' && '%'}
              {entry.dataKey === 'memory' && '%'}
              {entry.dataKey === 'disk' && '%'}
              {entry.dataKey === 'network' && '%'}
            </p>
          ))}
          {payload[0]?.payload?.description && (
            <p className="text-xs text-gray-600 mt-1 max-w-xs">
              {payload[0].payload.description}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          📊 統合ダッシュボード - ITSM運用状況
        </h1>
        <p className="text-gray-600 mt-2">
          リアルタイムシステム監視・インシデント管理・資産状況の総合ビュー
        </p>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">システム稼働中</span>
          </div>
          <div className="text-sm text-gray-600">
            最終更新: {new Date().toLocaleString('ja-JP')}
          </div>
        </div>
      </div>

      {/* KPI統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">総ユーザー数</h3>
              <p className="text-3xl font-bold">{systemStats.totalUsers.toLocaleString()}</p>
              <p className="text-xs opacity-80 mt-1">アクティブユーザー: 1,203名</p>
            </div>
            <div className="text-4xl opacity-80">👥</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">アクティブインシデント</h3>
              <p className="text-3xl font-bold">{systemStats.activeIncidents}</p>
              <p className="text-xs opacity-80 mt-1">
                高優先度: {systemStats.criticalAlerts}件
              </p>
            </div>
            <div className="text-4xl opacity-80">🚨</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">保留中リクエスト</h3>
              <p className="text-3xl font-bold">{systemStats.pendingRequests}</p>
              <p className="text-xs opacity-80 mt-1">承認待ち: 23件</p>
            </div>
            <div className="text-4xl opacity-80">📝</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">システム稼働率</h3>
              <p className="text-3xl font-bold">{systemStats.systemUptime}%</p>
              <p className="text-xs opacity-80 mt-1">目標: 99.9%</p>
            </div>
            <div className="text-4xl opacity-80">⚡</div>
          </div>
        </Card>
      </div>

      {/* チャート行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* インシデント傾向 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📈 インシデント傾向分析 (過去1週間)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={incidentTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="incidents" 
                  stackId="1"
                  stroke="#EF4444" 
                  fill="#FEE2E2" 
                  name="新規インシデント"
                />
                <Area 
                  type="monotone" 
                  dataKey="resolved" 
                  stackId="2"
                  stroke="#10B981" 
                  fill="#D1FAE5" 
                  name="解決済み"
                />
                <Area 
                  type="monotone" 
                  dataKey="critical" 
                  stackId="3"
                  stroke="#DC2626" 
                  fill="#FCA5A5" 
                  name="緊急対応"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>📊 <strong>分析結果:</strong> 今週は平均的なインシデント発生率を維持。緊急対応案件は週末メンテナンス準備の影響で若干増加。</p>
          </div>
        </Card>

        {/* 資産分布 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🖥️ IT資産分布状況
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
                    `${props.payload.details} (稼働率: ${props.payload.utilization})`
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {assetDistributionData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-gray-600">
                  {item.name}: 稼働率{item.utilization}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* システムパフォーマンス */}
      <Card className="p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          ⚡ システムパフォーマンス監視 (24時間)
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={systemPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cpu" 
                stroke="#EF4444" 
                strokeWidth={2}
                name="CPU使用率(%)"
              />
              <Line 
                type="monotone" 
                dataKey="memory" 
                stroke="#F59E0B" 
                strokeWidth={2}
                name="メモリ使用率(%)"
              />
              <Line 
                type="monotone" 
                dataKey="disk" 
                stroke="#10B981" 
                strokeWidth={2}
                name="ディスク使用率(%)"
              />
              <Line 
                type="monotone" 
                dataKey="network" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="ネットワーク使用率(%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-red-50 p-3 rounded">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="font-medium">CPU使用率</span>
            </div>
            <p className="text-gray-600 text-xs mt-1">現在: 73% (正常範囲)</p>
          </div>
          <div className="bg-yellow-50 p-3 rounded">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="font-medium">メモリ使用率</span>
            </div>
            <p className="text-gray-600 text-xs mt-1">現在: 68% (正常範囲)</p>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium">ディスク使用率</span>
            </div>
            <p className="text-gray-600 text-xs mt-1">現在: 42% (余裕あり)</p>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="font-medium">ネットワーク使用率</span>
            </div>
            <p className="text-gray-600 text-xs mt-1">現在: 52% (正常範囲)</p>
          </div>
        </div>
      </Card>

      {/* リアルタイムアクティビティ */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🔔 リアルタイムアクティビティ
        </h3>
        <div className="space-y-4">
          {recentActivities.map((activity) => (
            <div 
              key={activity.id} 
              className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-2xl">{activity.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">{activity.title}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activity.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                    activity.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                    activity.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {activity.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>👤 担当: {activity.assignee}</span>
                  <span>📅 {activity.timestamp}</span>
                  <span className={`px-2 py-1 rounded ${
                    activity.status === '完了' ? 'bg-green-100 text-green-700' :
                    activity.status === '対応中' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              </div>
              <Button size="sm" variant="secondary">
                詳細
              </Button>
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-center">
          <Button variant="primary">
            📋 全アクティビティを表示
          </Button>
        </div>
      </Card>

      {/* フッター統計 */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4 text-center">
          <h4 className="font-medium text-gray-900 mb-2">平均解決時間</h4>
          <p className="text-2xl font-bold text-blue-600">{systemStats.averageResolutionTime}</p>
          <p className="text-sm text-gray-600">目標: 4時間以内</p>
        </Card>
        
        <Card className="p-4 text-center">
          <h4 className="font-medium text-gray-900 mb-2">顧客満足度</h4>
          <p className="text-2xl font-bold text-green-600">{systemStats.customerSatisfaction}/5.0</p>
          <p className="text-sm text-gray-600">今月の平均評価</p>
        </Card>
        
        <Card className="p-4 text-center">
          <h4 className="font-medium text-gray-900 mb-2">総管理資産</h4>
          <p className="text-2xl font-bold text-purple-600">{systemStats.totalAssets.toLocaleString()}</p>
          <p className="text-sm text-gray-600">アクティブ資産</p>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedDashboardPage;