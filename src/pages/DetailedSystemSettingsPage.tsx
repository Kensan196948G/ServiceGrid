import * as React from 'react';
const { useState, useEffect, useCallback, useMemo } = React;
import { Button, Table, Modal, Input, Textarea, Select, Card } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

// 詳細システム設定ページ - 統合管理機能付き
const DetailedSystemSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('general');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);

  // システム設定データ
  const [systemConfig, setSystemConfig] = useState({
    general: {
      systemName: 'ServiceGrid ITSM Platform',
      version: '2.1.0',
      timezone: 'Asia/Tokyo',
      language: 'ja-JP',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      sessionTimeout: 8, // hours
      maxLoginAttempts: 5,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        expirationDays: 90
      }
    },
    notification: {
      emailEnabled: true,
      smsEnabled: false,
      slackEnabled: true,
      teamsEnabled: true,
      emailSettings: {
        smtpServer: 'smtp.company.com',
        smtpPort: 587,
        encryption: 'TLS',
        username: 'noreply@company.com',
        fromAddress: 'ServiceGrid <noreply@company.com>'
      },
      escalationRules: [
        {
          level: 1,
          timeMinutes: 30,
          recipients: ['manager@company.com'],
          channels: ['email', 'slack']
        },
        {
          level: 2,
          timeMinutes: 60,
          recipients: ['director@company.com'],
          channels: ['email', 'sms', 'teams']
        },
        {
          level: 3,
          timeMinutes: 120,
          recipients: ['cto@company.com'],
          channels: ['email', 'sms', 'phone']
        }
      ]
    },
    security: {
      ssoEnabled: true,
      mfaRequired: true,
      mfaMethods: ['TOTP', 'SMS', 'Email'],
      ipWhitelist: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
      auditLogRetention: 2555, // days (7 years)
      encryptionAlgorithm: 'AES-256-GCM',
      certificateExpiry: '2026-06-22',
      sslConfig: {
        minTlsVersion: '1.2',
        cipherSuites: 'ECDHE-RSA-AES128-GCM-SHA256,ECDHE-RSA-AES256-GCM-SHA384',
        hstsEnabled: true,
        hstsMaxAge: 31536000
      }
    },
    integration: {
      apiEnabled: true,
      webhooksEnabled: true,
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 100,
        requestsPerHour: 1000
      },
      connectedSystems: [
        {
          name: 'Active Directory',
          type: 'LDAP',
          status: 'connected',
          lastSync: '2025-06-22T08:30:00Z'
        },
        {
          name: 'Microsoft Exchange',
          type: 'Email',
          status: 'connected',
          lastSync: '2025-06-22T09:15:00Z'
        },
        {
          name: 'Slack Workspace',
          type: 'Chat',
          status: 'connected',
          lastSync: '2025-06-22T10:00:00Z'
        },
        {
          name: 'Zabbix Monitoring',
          type: 'Monitoring',
          status: 'connected',
          lastSync: '2025-06-22T09:45:00Z'
        }
      ]
    },
    backup: {
      autoBackupEnabled: true,
      backupSchedule: 'daily',
      backupTime: '02:00',
      retentionDays: 30,
      backupLocation: 's3://company-backup/serviceGrid/',
      encryptionEnabled: true,
      compressionEnabled: true,
      recentBackups: [
        {
          date: '2025-06-22T02:00:00Z',
          size: '2.4GB',
          status: 'completed',
          duration: '45 minutes'
        },
        {
          date: '2025-06-21T02:00:00Z',
          size: '2.3GB',
          status: 'completed',
          duration: '42 minutes'
        },
        {
          date: '2025-06-20T02:00:00Z',
          size: '2.3GB',
          status: 'completed',
          duration: '44 minutes'
        }
      ]
    }
  });

  // ユーザー管理データ
  const [users, setUsers] = useState([
    {
      id: '1',
      username: 'admin',
      email: 'admin@company.com',
      fullName: '管理者',
      role: 'Administrator',
      department: 'IT部',
      status: 'Active',
      lastLogin: '2025-06-22T10:30:00Z',
      loginCount: 1247,
      createdAt: '2023-01-15T09:00:00Z',
      permissions: ['all']
    },
    {
      id: '2',
      username: 'tanaka',
      email: 'tanaka@company.com',
      fullName: '田中太郎',
      role: 'IT Manager',
      department: 'IT部',
      status: 'Active',
      lastLogin: '2025-06-22T09:15:00Z',
      loginCount: 892,
      createdAt: '2023-02-01T10:00:00Z',
      permissions: ['incidents', 'assets', 'changes', 'users']
    },
    {
      id: '3',
      username: 'sato',
      email: 'sato@company.com',
      fullName: '佐藤花子',
      role: 'Operator',
      department: 'インフラ運用部',
      status: 'Active',
      lastLogin: '2025-06-22T08:45:00Z',
      loginCount: 634,
      createdAt: '2023-03-10T11:00:00Z',
      permissions: ['incidents', 'assets']
    },
    {
      id: '4',
      username: 'yamada',
      email: 'yamada@company.com',
      fullName: '山田花子',
      role: 'User',
      department: '営業部',
      status: 'Inactive',
      lastLogin: '2025-06-15T14:20:00Z',
      loginCount: 45,
      createdAt: '2024-01-20T13:00:00Z',
      permissions: ['requests']
    }
  ]);

  // ロール・権限管理
  const [roles, setRoles] = useState([
    {
      id: '1',
      name: 'Administrator',
      description: 'システム全体の管理権限を持つスーパーユーザー',
      permissions: ['all'],
      userCount: 2,
      isBuiltIn: true
    },
    {
      id: '2',
      name: 'IT Manager',
      description: 'IT運用管理者。インシデント・変更・資産管理の権限',
      permissions: ['incidents', 'assets', 'changes', 'users'],
      userCount: 5,
      isBuiltIn: true
    },
    {
      id: '3',
      name: 'Operator',
      description: '運用オペレーター。インシデント・資産の操作権限',
      permissions: ['incidents', 'assets'],
      userCount: 12,
      isBuiltIn: true
    },
    {
      id: '4',
      name: 'User',
      description: '一般ユーザー。サービス要求の作成・確認権限',
      permissions: ['requests'],
      userCount: 156,
      isBuiltIn: true
    },
    {
      id: '5',
      name: 'Read Only',
      description: '読み取り専用ユーザー。レポート・ダッシュボード閲覧権限',
      permissions: ['readonly'],
      userCount: 23,
      isBuiltIn: false
    }
  ]);

  // システム統計
  const systemStats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'Active').length,
    totalSessions: 45,
    systemUptime: '99.97%',
    diskUsage: 67.3,
    cpuUsage: 23.8,
    memoryUsage: 45.2,
    networkTraffic: '125.4 GB',
    dailyRequests: 12450,
    errorRate: 0.02
  };

  // チャートデータ
  const usageData = [
    { time: '00:00', users: 5, requests: 23 },
    { time: '04:00', users: 2, requests: 8 },
    { time: '08:00', users: 45, requests: 234 },
    { time: '12:00', users: 78, requests: 456 },
    { time: '16:00', users: 89, requests: 512 },
    { time: '20:00', users: 34, requests: 167 }
  ];

  const roleDistribution = [
    { name: '管理者', value: 2, color: '#EF4444' },
    { name: 'ITマネージャー', value: 5, color: '#F59E0B' },
    { name: 'オペレーター', value: 12, color: '#3B82F6' },
    { name: 'ユーザー', value: 156, color: '#10B981' },
    { name: '読み取り専用', value: 23, color: '#6B7280' }
  ];

  const getUserStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Suspended': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleConfigEdit = (section: string, config: any) => {
    setSelectedConfig({ section, config });
    setIsConfigModalOpen(true);
  };

  const handleUserEdit = (userId: string) => {
    // ユーザー編集機能
    addToast('ユーザー編集機能は開発中です', 'info');
  };

  const tabs = [
    { id: 'general', label: '一般設定', icon: '⚙️' },
    { id: 'users', label: 'ユーザー管理', icon: '👥' },
    { id: 'roles', label: 'ロール・権限', icon: '🔐' },
    { id: 'notifications', label: '通知設定', icon: '📧' },
    { id: 'security', label: 'セキュリティ', icon: '🔒' },
    { id: 'integrations', label: '外部連携', icon: '🔗' },
    { id: 'backup', label: 'バックアップ', icon: '💾' },
    { id: 'monitoring', label: 'システム監視', icon: '📊' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          ⚙️ システム設定・管理コンソール
        </h1>
        <p className="text-gray-600 mt-2">
          ServiceGrid ITSMプラットフォームの統合設定・ユーザー管理・セキュリティ・監視機能
        </p>
      </div>

      {/* システム状態サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">稼働率</h3>
              <p className="text-3xl font-bold">{systemStats.systemUptime}</p>
              <p className="text-xs opacity-80 mt-1">アクティブユーザー: {systemStats.activeUsers}</p>
            </div>
            <div className="text-4xl opacity-80">💚</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">リソース使用率</h3>
              <p className="text-3xl font-bold">{systemStats.cpuUsage}%</p>
              <p className="text-xs opacity-80 mt-1">メモリ: {systemStats.memoryUsage}%</p>
            </div>
            <div className="text-4xl opacity-80">🖥️</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">総ユーザー数</h3>
              <p className="text-3xl font-bold">{systemStats.totalUsers}</p>
              <p className="text-xs opacity-80 mt-1">セッション: {systemStats.totalSessions}</p>
            </div>
            <div className="text-4xl opacity-80">👥</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">日次リクエスト</h3>
              <p className="text-3xl font-bold">{systemStats.dailyRequests.toLocaleString()}</p>
              <p className="text-xs opacity-80 mt-1">エラー率: {systemStats.errorRate}%</p>
            </div>
            <div className="text-4xl opacity-80">📈</div>
          </div>
        </Card>
      </div>

      {/* タブナビゲーション */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* 一般設定タブ */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 基本システム設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">システム名</label>
                <Input value={systemConfig.general.systemName} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">バージョン</label>
                <Input value={systemConfig.general.version} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">タイムゾーン</label>
                <Select
                  value={systemConfig.general.timezone}
                  onChange={() => {}}
                  options={[
                    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
                    { value: 'UTC', label: 'UTC' },
                    { value: 'America/New_York', label: 'America/New_York (EST)' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">言語</label>
                <Select
                  value={systemConfig.general.language}
                  onChange={() => {}}
                  options={[
                    { value: 'ja-JP', label: '日本語' },
                    { value: 'en-US', label: 'English' },
                    { value: 'zh-CN', label: '中文' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">セッションタイムアウト (時間)</label>
                <Input type="number" value={systemConfig.general.sessionTimeout} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">最大ログイン試行回数</label>
                <Input type="number" value={systemConfig.general.maxLoginAttempts} />
              </div>
            </div>
            <div className="mt-6">
              <Button variant="primary">設定を保存</Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔐 パスワードポリシー</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">最小文字数</label>
                <Input type="number" value={systemConfig.general.passwordPolicy.minLength} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">有効期限 (日)</label>
                <Input type="number" value={systemConfig.general.passwordPolicy.expirationDays} />
              </div>
              <div className="md:col-span-2">
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input type="checkbox" checked={systemConfig.general.passwordPolicy.requireUppercase} className="mr-2" />
                    大文字を必須とする
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" checked={systemConfig.general.passwordPolicy.requireLowercase} className="mr-2" />
                    小文字を必須とする
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" checked={systemConfig.general.passwordPolicy.requireNumbers} className="mr-2" />
                    数字を必須とする
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" checked={systemConfig.general.passwordPolicy.requireSpecialChars} className="mr-2" />
                    特殊文字を必須とする
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Button variant="primary">ポリシーを更新</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ユーザー管理タブ */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">👥 ユーザー管理</h3>
            <Button variant="primary">新規ユーザー作成</Button>
          </div>

          <Card className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ユーザー情報
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ロール・部門
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ログイン状況
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{user.fullName}</div>
                          <div className="text-sm text-gray-600">@{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.role}</div>
                          <div className="text-sm text-gray-600">{user.department}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm text-gray-900">
                            最終: {new Date(user.lastLogin).toLocaleString('ja-JP')}
                          </div>
                          <div className="text-sm text-gray-600">
                            ログイン回数: {user.loginCount.toLocaleString()}回
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded ${getUserStatusColor(user.status)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => handleUserEdit(user.id)}>
                            編集
                          </Button>
                          <Button size="sm" variant="secondary">
                            権限
                          </Button>
                          <Button size="sm" variant="danger">
                            無効化
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ロール・権限タブ */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">🔐 ロール・権限管理</h3>
            <Button variant="primary">新規ロール作成</Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ロール分布チャート */}
            <Card className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">📊 ロール別ユーザー分布</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}名`}
                    >
                      {roleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* ロール一覧 */}
            <Card className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">📋 ロール一覧</h4>
              <div className="space-y-3">
                {roles.map((role) => (
                  <div key={role.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{role.name}</h5>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{role.userCount}名</span>
                        {role.isBuiltIn && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            標準
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.map((permission, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            {permission}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary">編集</Button>
                        {!role.isBuiltIn && (
                          <Button size="sm" variant="danger">削除</Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* セキュリティタブ */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔒 セキュリティ設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center mb-4">
                  <input type="checkbox" checked={systemConfig.security.ssoEnabled} className="mr-2" />
                  シングルサインオン (SSO) を有効にする
                </label>
                <label className="flex items-center mb-4">
                  <input type="checkbox" checked={systemConfig.security.mfaRequired} className="mr-2" />
                  多要素認証 (MFA) を必須にする
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">監査ログ保存期間 (日)</label>
                <Input type="number" value={systemConfig.security.auditLogRetention} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">暗号化アルゴリズム</label>
                <Select
                  value={systemConfig.security.encryptionAlgorithm}
                  onChange={() => {}}
                  options={[
                    { value: 'AES-256-GCM', label: 'AES-256-GCM' },
                    { value: 'AES-128-GCM', label: 'AES-128-GCM' },
                    { value: 'ChaCha20-Poly1305', label: 'ChaCha20-Poly1305' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SSL証明書有効期限</label>
                <Input value={systemConfig.security.certificateExpiry} readOnly />
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">🛡️ IPアドレス制限</h4>
              <div className="space-y-2">
                {systemConfig.security.ipWhitelist.map((ip, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span className="font-mono text-sm">{ip}</span>
                    <Button size="sm" variant="danger">削除</Button>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <Button variant="secondary">IPアドレス追加</Button>
              </div>
            </div>

            <div className="mt-6">
              <Button variant="primary">セキュリティ設定を保存</Button>
            </div>
          </Card>
        </div>
      )}

      {/* 外部連携タブ */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔗 外部システム連携</h3>
            <div className="space-y-4">
              {systemConfig.integration.connectedSystems.map((system, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{system.name}</h4>
                    <p className="text-sm text-gray-600">{system.type}</p>
                    <p className="text-xs text-gray-500">
                      最終同期: {new Date(system.lastSync).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs rounded ${
                      system.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {system.status}
                    </span>
                    <Button size="sm" variant="secondary">設定</Button>
                    <Button size="sm" variant="secondary">テスト</Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Button variant="primary">新規連携追加</Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔧 API設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center mb-4">
                  <input type="checkbox" checked={systemConfig.integration.apiEnabled} className="mr-2" />
                  REST API を有効にする
                </label>
                <label className="flex items-center mb-4">
                  <input type="checkbox" checked={systemConfig.integration.webhooksEnabled} className="mr-2" />
                  Webhook を有効にする
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分あたりリクエスト制限</label>
                <Input type="number" value={systemConfig.integration.rateLimiting.requestsPerMinute} />
              </div>
            </div>
            <div className="mt-6">
              <Button variant="primary">API設定を保存</Button>
            </div>
          </Card>
        </div>
      )}

      {/* システム監視タブ */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 リアルタイムシステム監視</h3>
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2} name="アクティブユーザー" />
                  <Line type="monotone" dataKey="requests" stroke="#10B981" strokeWidth={2} name="リクエスト数" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700">CPU使用率</h4>
                <p className="text-2xl font-bold text-blue-600">{systemStats.cpuUsage}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${systemStats.cpuUsage}%` }}></div>
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700">メモリ使用率</h4>
                <p className="text-2xl font-bold text-green-600">{systemStats.memoryUsage}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: `${systemStats.memoryUsage}%` }}></div>
                </div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700">ディスク使用率</h4>
                <p className="text-2xl font-bold text-orange-600">{systemStats.diskUsage}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-orange-600 h-2 rounded-full" style={{ width: `${systemStats.diskUsage}%` }}></div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* バックアップタブ */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💾 バックアップ設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center mb-4">
                  <input type="checkbox" checked={systemConfig.backup.autoBackupEnabled} className="mr-2" />
                  自動バックアップを有効にする
                </label>
                <label className="block text-sm font-medium text-gray-700 mb-2">バックアップ時刻</label>
                <Input type="time" value={systemConfig.backup.backupTime} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">保存期間 (日)</label>
                <Input type="number" value={systemConfig.backup.retentionDays} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">バックアップ先</label>
                <Input value={systemConfig.backup.backupLocation} />
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">📅 最近のバックアップ</h4>
              <div className="space-y-2">
                {systemConfig.backup.recentBackups.map((backup, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{new Date(backup.date).toLocaleString('ja-JP')}</div>
                      <div className="text-sm text-gray-600">サイズ: {backup.size} • 時間: {backup.duration}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      backup.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {backup.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="primary">今すぐバックアップ</Button>
              <Button variant="secondary">設定を保存</Button>
              <Button variant="secondary">復元</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DetailedSystemSettingsPage;