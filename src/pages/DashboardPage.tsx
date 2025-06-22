import * as React from 'react';
const { useEffect, useState, useCallback, useMemo } = React;
import { Link } from '../components/RouterPlaceholder';
import { Card, Spinner, Button } from '../components/CommonUI';
import { FadeIn, SlideInLeft, StaggeredList, AnimatedCard, CountUp } from '../components/AnimatedComponents';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { itemStatusToJapanese } from '../localization';

// Mock API services
import { getAssets } from '../services/assetApiService';
import { getServiceRequests } from '../services/serviceRequestApiService';
import { getIncidents } from '../services/incidentApiService';

// Types
interface DashboardStats {
  systemUptime: number;
  totalAssets: number;
  activeIncidents: number;
  pendingRequests: number;
  resolvedThisMonth: number;
  criticalAlerts: number;
}

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

interface ActivityItem {
  id: string;
  type: 'incident' | 'request' | 'asset' | 'change';
  title: string;
  status: string;
  timestamp: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  // State management
  const [stats, setStats] = useState<DashboardStats>({
    systemUptime: 99.5,
    totalAssets: 0,
    activeIncidents: 0,
    pendingRequests: 0,
    resolvedThisMonth: 0,
    criticalAlerts: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([
    {
      id: '1',
      type: 'incident',
      title: 'サーバー応答速度低下',
      status: 'In Progress',
      timestamp: '2025-06-22T10:30:00Z',
      priority: 'High'
    },
    {
      id: '2',
      type: 'request',
      title: 'Adobe Creative Suite ライセンス申請',
      status: 'Pending',
      timestamp: '2025-06-22T09:15:00Z'
    },
    {
      id: '3',
      type: 'asset',
      title: '新規ノートPC資産登録',
      status: 'Active',
      timestamp: '2025-06-22T08:45:00Z'
    },
    {
      id: '4',
      type: 'change',
      title: 'ファイアウォール設定変更',
      status: 'Approved',
      timestamp: '2025-06-21T16:20:00Z',
      priority: 'Medium'
    }
  ]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);

  // 詳細なチャートデータ
  const incidentTrendData = [
    { name: '6月17日', incidents: 12, resolved: 10 },
    { name: '6月18日', incidents: 8, resolved: 15 },
    { name: '6月19日', incidents: 15, resolved: 12 },
    { name: '6月20日', incidents: 6, resolved: 8 },
    { name: '6月21日', incidents: 9, resolved: 14 },
    { name: '6月22日', incidents: 11, resolved: 6 }
  ];

  const assetDistributionData = [
    { name: 'サーバー', value: 45, color: '#4F46E5' },
    { name: 'デスクトップ', value: 120, color: '#06B6D4' },
    { name: 'ノートPC', value: 85, color: '#10B981' },
    { name: 'ネットワーク機器', value: 32, color: '#F59E0B' },
    { name: 'その他', value: 28, color: '#EF4444' }
  ];

  const systemPerformanceData = [
    { name: '00:00', cpu: 45, memory: 60, disk: 30 },
    { name: '04:00', cpu: 35, memory: 55, disk: 32 },
    { name: '08:00', cpu: 75, memory: 70, disk: 45 },
    { name: '12:00', cpu: 85, memory: 80, disk: 50 },
    { name: '16:00', cpu: 90, memory: 85, disk: 55 },
    { name: '20:00', cpu: 65, memory: 75, disk: 40 }
  ];

  // Color schemes for charts
  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  
  const statusColors = {
    'Active': '#10b981',
    'Pending': '#f59e0b', 
    'Resolved': '#6b7280',
    'Critical': '#ef4444',
    'High': '#f97316',
    'Medium': '#eab308',
    'Low': '#22c55e'
  };

  // Data fetching
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Parallel API calls for better performance
      const [assetsResponse, requestsResponse, incidentsResponse] = await Promise.allSettled([
        getAssets({ limit: 1000 }),
        getServiceRequests({ limit: 100 }),
        getIncidents({ limit: 100 })
      ]);

      // Process assets data
      let totalAssets = 0;
      if (assetsResponse.status === 'fulfilled') {
        totalAssets = assetsResponse.value.data?.length || 0;
      }

      // Process incidents data
      let activeIncidents = 0;
      let resolvedThisMonth = 0;
      let criticalAlerts = 0;
      let incidentChartData: ChartData[] = [];
      
      if (incidentsResponse.status === 'fulfilled') {
        const incidents = incidentsResponse.value.data || [];
        activeIncidents = incidents.filter(i => i.status === 'Open' || i.status === 'In Progress').length;
        
        const thisMonth = new Date();
        thisMonth.setDate(1);
        resolvedThisMonth = incidents.filter(i => 
          i.status === 'Resolved' && 
          new Date(i.resolvedAt || i.updatedAt) >= thisMonth
        ).length;
        
        criticalAlerts = incidents.filter(i => i.priority === 'Critical').length;
        
        // Incident status distribution
        const statusCounts = incidents.reduce((acc, incident) => {
          acc[incident.status] = (acc[incident.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        incidentChartData = Object.entries(statusCounts).map(([status, count]) => ({
          name: itemStatusToJapanese(status),
          value: count,
          color: statusColors[status] || '#6b7280'
        }));
      }

      // Process service requests data
      let pendingRequests = 0;
      let requestChartData: ChartData[] = [];
      
      if (requestsResponse.status === 'fulfilled') {
        const requests = requestsResponse.value.data || [];
        pendingRequests = requests.filter(r => 
          r.status === 'Submitted' || r.status === 'Pending Approval'
        ).length;
        
        // Request status distribution
        const statusCounts = requests.reduce((acc, request) => {
          acc[request.status] = (acc[request.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        requestChartData = Object.entries(statusCounts).map(([status, count]) => ({
          name: status,
          value: count,
          color: statusColors[status] || '#6b7280'
        }));
      }

      // Update stats
      setStats({
        systemUptime: 99.5 + Math.random() * 0.4, // Simulate real uptime
        totalAssets,
        activeIncidents,
        pendingRequests,
        resolvedThisMonth,
        criticalAlerts
      });

      // Combine chart data
      setChartData([...incidentChartData, ...requestChartData]);

      // Generate recent activity (mock data)
      const activities: ActivityItem[] = [
        {
          id: '1',
          type: 'incident',
          title: 'サーバー応答時間の遅延',
          status: 'In Progress',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          priority: 'High'
        },
        {
          id: '2', 
          type: 'request',
          title: '新規ユーザーアカウント作成',
          status: 'Approved',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          priority: 'Medium'
        },
        {
          id: '3',
          type: 'asset',
          title: 'ノートPC (LAP-045) 更新',
          status: 'Active',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString()
        },
        {
          id: '4',
          type: 'change',
          title: 'ネットワーク機器のファームウェア更新',
          status: 'Scheduled',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          priority: 'Low'
        }
      ];
      
      setRecentActivity(activities);

      // Generate performance data for trend chart
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
          incidents: Math.floor(Math.random() * 10) + 2,
          requests: Math.floor(Math.random() * 20) + 5,
          uptime: 99 + Math.random() * 1
        };
      });
      
      setPerformanceData(last7Days);

    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      addToast('ダッシュボードデータの取得に失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Memoized components for performance
  const StatCard = React.memo(({ 
    title, 
    value, 
    change, 
    icon, 
    color = 'blue',
    link 
  }: {
    title: string;
    value: string | number;
    change?: string;
    icon: React.ReactNode;
    color?: string;
    link?: string;
  }) => (
    <Card className={`p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-${color}-500`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold text-${color}-600 mt-2`}>
            {typeof value === 'number' && value > 0
              ? <CountUp end={typeof value === 'number' ? value : parseInt(value.toString())} />
              : value
            }
          </p>
          {change && (
            <p className="text-sm text-gray-500 mt-1">{change}</p>
          )}
        </div>
        <div className={`p-3 bg-${color}-100 rounded-full`}>
          {icon}
        </div>
      </div>
      {link && (
        <div className="mt-4">
          <Link to={link} className={`text-${color}-600 hover:text-${color}-800 text-sm font-medium`}>
            詳細を見る →
          </Link>
        </div>
      )}
    </Card>
  ));

  const ActivityIcon = ({ type }: { type: string }) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case 'incident':
        return <span className={`${iconClass} text-red-500`}>⚠️</span>;
      case 'request':
        return <span className={`${iconClass} text-blue-500`}>📋</span>;
      case 'asset':
        return <span className={`${iconClass} text-green-500`}>💻</span>;
      case 'change':
        return <span className={`${iconClass} text-purple-500`}>🔄</span>;
      default:
        return <span className={`${iconClass} text-gray-500`}>📄</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
        <span className="ml-3 text-lg">ダッシュボードを読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto" role="main" aria-label="ITSM ダッシュボード">
      {/* Header */}
      <FadeIn>
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" id="dashboard-title">ダッシュボード</h1>
            <p className="text-gray-600 mt-1" aria-label="ユーザー歓迎メッセージ">
              ようこそ、{user?.displayName || user?.username}さん
            </p>
          </div>
        <div className="flex space-x-3">
          <Button 
            onClick={fetchDashboardData}
            variant="secondary"
            size="sm"
          >
            🔄 更新
          </Button>
          <Button 
            onClick={() => addToast('ダッシュボードが更新されました', 'success')}
            variant="primary"
            size="sm"
          >
            📊 レポート
          </Button>
        </div>
        </header>
      </FadeIn>

      {/* Key Metrics */}
      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="sr-only">主要メトリクス</h2>
        <StaggeredList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={150}>
        <StatCard
          title="システム稼働率"
          value={`${stats.systemUptime.toFixed(1)}%`}
          change="過去24時間"
          icon={<span className="text-2xl">⚡</span>}
          color="green"
        />
        
        <StatCard
          title="管理資産数"
          value={stats.totalAssets}
          change="アクティブ資産"
          icon={<span className="text-2xl">💻</span>}
          color="blue"
          link="/assets"
        />
        
        <StatCard
          title="アクティブインシデント"
          value={stats.activeIncidents}
          change={`今月解決: ${stats.resolvedThisMonth}件`}
          icon={<span className="text-2xl">⚠️</span>}
          color="red"
          link="/incidents"
        />
        
        <StatCard
          title="承認待ち要求"
          value={stats.pendingRequests}
          change="サービス要求"
          icon={<span className="text-2xl">📋</span>}
          color="yellow"
          link="/service-requests"
        />
        </StaggeredList>
      </section>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">ステータス分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Performance Trend */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">週間トレンド</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="incidents" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="インシデント"
              />
              <Line 
                type="monotone" 
                dataKey="requests" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="サービス要求"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">最近のアクティビティ</h3>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <ActivityIcon type={activity.type} />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.title}</p>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      activity.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      activity.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      activity.status === 'Active' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {activity.status}
                    </span>
                    {activity.priority && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        activity.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                        activity.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                        activity.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {activity.priority}
                      </span>
                    )}
                    <span>{new Date(activity.timestamp).toLocaleString('ja-JP')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link to="/audit-logs" className="text-blue-600 hover:text-blue-800 font-medium">
              すべてのアクティビティを表示 →
            </Link>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">クイックアクション</h3>
          <div className="space-y-3">
            <Link to="/incidents/new">
              <Button variant="outline" className="w-full justify-start">
                <span className="mr-2">🚨</span>
                インシデント報告
              </Button>
            </Link>
            
            <Link to="/service-requests/new">
              <Button variant="outline" className="w-full justify-start">
                <span className="mr-2">📝</span>
                サービス要求
              </Button>
            </Link>
            
            <Link to="/assets/new">
              <Button variant="outline" className="w-full justify-start">
                <span className="mr-2">💻</span>
                資産登録
              </Button>
            </Link>
            
            <Link to="/changes/new">
              <Button variant="outline" className="w-full justify-start">
                <span className="mr-2">🔄</span>
                変更申請
              </Button>
            </Link>
            
            <Link to="/knowledge">
              <Button variant="outline" className="w-full justify-start">
                <span className="mr-2">📚</span>
                ナレッジベース
              </Button>
            </Link>
            
            <Link to="/settings">
              <Button variant="outline" className="w-full justify-start">
                <span className="mr-2">⚙️</span>
                システム設定
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* System Health Indicators */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">システムヘルス</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">正常</div>
            <div className="text-sm text-green-700">Webサーバー</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">正常</div>
            <div className="text-sm text-green-700">データベース</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">注意</div>
            <div className="text-sm text-yellow-700">ストレージ</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;