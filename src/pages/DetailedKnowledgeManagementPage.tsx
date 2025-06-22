import * as React from 'react';
const { useState, useEffect, useCallback, useMemo } = React;
import { Button, Table, Modal, Input, Textarea, Select, Card } from '../components/CommonUI';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

// 詳細ナレッジ管理ページ - AI検索・自動提案機能付き
const DetailedKnowledgeManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [knowledgeBase, setKnowledgeBase] = useState([
    {
      id: 'KB-2025-001001',
      title: 'WEBサーバーパフォーマンス問題のトラブルシューティング',
      description: 'WEBサーバーの応答時間遅延およびCPU使用率高騰時の診断・解決手順を詳述した包括的なガイド',
      content: `
## 概要
WEBサーバーのパフォーマンス問題は、ユーザーエクスペリエンスに直接影響を与える重要な課題です。本ガイドでは、体系的な診断アプローチと効果的な解決策を提供します。

## 症状の識別
### 1. 応答時間の遅延
- ページ読み込み時間が通常の2倍以上
- APIレスポンス時間が500ms以上
- ユーザーからの苦情増加

### 2. システムリソース使用率
- CPU使用率が80%以上で継続
- メモリ使用率が90%以上
- ディスクI/O待機時間の増加

## 診断手順
### ステップ1: リアルタイム監視
\`\`\`bash
top -p $(pgrep httpd)
iostat -x 1
netstat -i
\`\`\`

### ステップ2: ログ分析
\`\`\`bash
tail -f /var/log/httpd/access_log
grep "ERROR" /var/log/httpd/error_log
\`\`\`

### ステップ3: データベース確認
\`\`\`sql
SHOW PROCESSLIST;
SHOW ENGINE INNODB STATUS;
\`\`\`

## 解決策
### 即時対応
1. Apache/Nginx再起動
2. 不要なプロセス終了
3. 一時的な負荷分散

### 根本解決
1. コード最適化
2. データベースクエリ改善
3. キャッシュ戦略実装
4. インフラスケールアップ

## 予防策
- 定期的なパフォーマンステスト
- 監視アラートの設定
- 定期メンテナンスの実施
      `,
      category: 'Infrastructure',
      subcategory: 'Server Management',
      tags: ['webserver', 'performance', 'troubleshooting', 'apache', 'nginx'],
      status: 'Published',
      author: {
        name: '田中太郎',
        department: 'インフラ運用部',
        email: 'tanaka@company.com'
      },
      createdAt: '2025-06-15T10:00:00Z',
      updatedAt: '2025-06-22T14:30:00Z',
      publishedAt: '2025-06-16T09:00:00Z',
      version: '2.1',
      viewCount: 1247,
      rating: 4.8,
      reviews: 23,
      relatedIncidents: ['INC-2025-001234', 'INC-2025-001156', 'INC-2025-001089'],
      relatedArticles: ['KB-2025-001005', 'KB-2025-001012'],
      attachments: [
        { name: 'performance-monitoring-script.sh', size: '3.2KB', type: 'application/x-sh' },
        { name: 'apache-tuning-config.conf', size: '1.8KB', type: 'text/plain' }
      ]
    },
    {
      id: 'KB-2025-001002',
      title: 'Office365メール配信問題の解決手順',
      description: 'Exchange Online環境でのメール配信遅延・エラーの診断と解決方法',
      content: `
## 問題の特定
### 一般的な症状
- メール送信の遅延
- 配信失敗エラー
- 受信者への未達

### 診断ツール
1. Exchange Online管理センター
2. Message Trace機能
3. Service Health Dashboard

## 解決手順
### ステップ1: Message Traceの実行
1. 管理センターにログイン
2. メールフロー → Message Trace
3. 対象期間と送信者を指定して検索

### ステップ2: 配信状況の確認
- Delivered: 正常配信
- Failed: 配信失敗
- Pending: 配信待機中

### ステップ3: エラーの分析
- SPF/DKIM設定の確認
- 受信者ドメインの確認
- 添付ファイルサイズの確認

## 一般的な解決策
1. DNS設定の見直し
2. 送信者レピュテーションの改善
3. 添付ファイルサイズの削減
4. Microsoftサポートへの連絡
      `,
      category: 'Application',
      subcategory: 'Email System',
      tags: ['office365', 'exchange', 'email', 'delivery', 'troubleshooting'],
      status: 'Published',
      author: {
        name: '佐藤花子',
        department: 'システム管理部',
        email: 'sato@company.com'
      },
      createdAt: '2025-06-18T14:00:00Z',
      updatedAt: '2025-06-21T11:00:00Z',
      publishedAt: '2025-06-19T10:00:00Z',
      version: '1.3',
      viewCount: 892,
      rating: 4.6,
      reviews: 18,
      relatedIncidents: ['INC-2025-001235'],
      relatedArticles: ['KB-2025-001008', 'KB-2025-001015']
    },
    {
      id: 'KB-2025-001003',
      title: 'VPN接続トラブルシューティングガイド',
      description: 'リモートワーク環境でのVPN接続問題の診断・解決方法',
      content: `
## よくある問題
### 接続エラー
- 認証失敗
- タイムアウト
- 証明書エラー

### パフォーマンス問題
- 接続速度の低下
- 頻繁な切断
- 特定サイトへのアクセス不可

## 診断チェックリスト
1. インターネット接続の確認
2. VPNクライアントの最新バージョン確認
3. ファイアウォール設定の確認
4. DNS設定の確認

## 解決手順
### Windows環境
1. VPNクライアント再起動
2. ネットワークアダプター再設定
3. Windowsネットワーク診断の実行

### Mac環境
1. キーチェーンアクセスの確認
2. ネットワーク設定のリセット
3. システム環境設定の再設定

### 高度なトラブルシューティング
- VPNサーバーログの確認
- パケットキャプチャの実行
- 代替VPNプロトコルの試行
      `,
      category: 'Network',
      subcategory: 'VPN',
      tags: ['vpn', 'remote-work', 'connection', 'troubleshooting', 'network'],
      status: 'Published',
      author: {
        name: '高橋美咲',
        department: 'ネットワーク運用部',
        email: 'takahashi@company.com'
      },
      createdAt: '2025-06-20T09:00:00Z',
      updatedAt: '2025-06-22T16:00:00Z',
      publishedAt: '2025-06-21T08:00:00Z',
      version: '1.1',
      viewCount: 564,
      rating: 4.4,
      reviews: 12,
      relatedIncidents: ['INC-2025-001236'],
      relatedArticles: ['KB-2025-001007', 'KB-2025-001011']
    },
    {
      id: 'KB-2025-001004',
      title: 'セキュリティインシデント初期対応マニュアル',
      description: 'セキュリティ侵害やマルウェア感染時の初期対応手順',
      content: `
## 即座に実行すべき対応
### フェーズ1: 封じ込め（5分以内）
1. 影響を受けたシステムのネットワーク切断
2. インシデント対応チームへの連絡
3. 初期証跡の保全

### フェーズ2: 評価（30分以内）
1. 被害範囲の特定
2. 侵害の深刻度評価
3. ステークホルダーへの報告

### フェーズ3: 根絶（2時間以内）
1. マルウェアの特定・除去
2. 侵入経路の特定・遮断
3. 脆弱性の修正

## 連絡体制
### 緊急連絡先
- セキュリティチーム: security@company.com
- IT部長: it-manager@company.com
- 経営陣: exec@company.com

### 外部連絡先
- JPCERT/CC: incident@jpcert.or.jp
- 警察サイバー犯罪対策課: 110
- セキュリティベンダー: vendor-support@security.com

## 証跡保全
1. システムログの取得
2. ネットワーク通信ログの保存
3. メモリダンプの取得
4. ディスクイメージの作成

## 事後対応
1. インシデントレポートの作成
2. 再発防止策の策定
3. 関係者への報告
4. システム復旧作業
      `,
      category: 'Security',
      subcategory: 'Incident Response',
      tags: ['security', 'incident', 'malware', 'response', 'forensics'],
      status: 'Published',
      author: {
        name: '伊藤和子',
        department: 'セキュリティ部',
        email: 'ito@company.com'
      },
      createdAt: '2025-06-10T11:00:00Z',
      updatedAt: '2025-06-20T13:00:00Z',
      publishedAt: '2025-06-11T09:00:00Z',
      version: '1.5',
      viewCount: 2156,
      rating: 4.9,
      reviews: 45,
      relatedIncidents: ['INC-2025-001189', 'INC-2025-001203'],
      relatedArticles: ['KB-2025-001009', 'KB-2025-001013', 'KB-2025-001018']
    }
  ]);

  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // 統計計算
  const stats = useMemo(() => ({
    total: knowledgeBase.length,
    published: knowledgeBase.filter(kb => kb.status === 'Published').length,
    draft: knowledgeBase.filter(kb => kb.status === 'Draft').length,
    review: knowledgeBase.filter(kb => kb.status === 'Review').length,
    totalViews: knowledgeBase.reduce((acc, kb) => acc + kb.viewCount, 0),
    avgRating: knowledgeBase.reduce((acc, kb) => acc + kb.rating, 0) / knowledgeBase.length,
    totalReviews: knowledgeBase.reduce((acc, kb) => acc + kb.reviews, 0),
    popularTags: ['troubleshooting', 'security', 'network', 'email', 'performance']
  }), [knowledgeBase]);

  // AI検索・フィルタリング
  const filteredArticles = useMemo(() => {
    return knowledgeBase.filter(article => {
      if (searchQuery && !article.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !article.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !article.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) {
        return false;
      }
      if (categoryFilter && article.category !== categoryFilter) return false;
      if (tagFilter && !article.tags.includes(tagFilter)) return false;
      if (statusFilter && article.status !== statusFilter) return false;
      return true;
    });
  }, [knowledgeBase, searchQuery, categoryFilter, tagFilter, statusFilter]);

  // チャートデータ
  const categoryData = [
    { name: 'インフラ', value: 15, color: '#4F46E5' },
    { name: 'アプリケーション', value: 12, color: '#06B6D4' },
    { name: 'セキュリティ', value: 8, color: '#EF4444' },
    { name: 'ネットワーク', value: 10, color: '#10B981' },
    { name: 'その他', value: 5, color: '#F59E0B' }
  ];

  const usageData = [
    { month: '1月', views: 2450, articles: 48 },
    { month: '2月', views: 2890, articles: 52 },
    { month: '3月', views: 3240, articles: 55 },
    { month: '4月', views: 3150, articles: 58 },
    { month: '5月', views: 3580, articles: 62 },
    { month: '6月', views: 3920, articles: 65 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Review': return 'bg-yellow-100 text-yellow-800';
      case 'Published': return 'bg-green-100 text-green-800';
      case 'Archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRatingStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    return Array.from({ length: 5 }, (_, index) => {
      if (index < fullStars) return '⭐';
      if (index === fullStars && hasHalfStar) return '⭐';
      return '☆';
    }).join('');
  };

  const handleArticleDetail = (article: any) => {
    setSelectedArticle(article);
    setIsDetailModalOpen(true);
  };

  // AI関連記事提案機能
  const getRelatedArticles = (currentArticle: any) => {
    return knowledgeBase
      .filter(article => article.id !== currentArticle.id)
      .filter(article => 
        article.tags.some(tag => currentArticle.tags.includes(tag)) ||
        article.category === currentArticle.category
      )
      .slice(0, 3);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          📚 ナレッジ管理システム - AI検索・自動提案
        </h1>
        <p className="text-gray-600 mt-2">
          組織の知識資産を効率的に管理・検索・共有するためのインテリジェント・ナレッジベース
        </p>
      </div>

      {/* KPI統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">総記事数</h3>
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-xs opacity-80 mt-1">公開済み: {stats.published}件</p>
            </div>
            <div className="text-4xl opacity-80">📖</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">総閲覧数</h3>
              <p className="text-3xl font-bold">{stats.totalViews.toLocaleString()}</p>
              <p className="text-xs opacity-80 mt-1">今月: +1,247件</p>
            </div>
            <div className="text-4xl opacity-80">👁️</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">平均評価</h3>
              <p className="text-3xl font-bold">{stats.avgRating.toFixed(1)}</p>
              <p className="text-xs opacity-80 mt-1">レビュー: {stats.totalReviews}件</p>
            </div>
            <div className="text-4xl opacity-80">⭐</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">AI提案精度</h3>
              <p className="text-3xl font-bold">94.3%</p>
              <p className="text-xs opacity-80 mt-1">関連性スコア</p>
            </div>
            <div className="text-4xl opacity-80">🤖</div>
          </div>
        </Card>
      </div>

      {/* AI検索バー */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🔍 AI搭載インテリジェント検索
        </h3>
        <div className="relative">
          <Input
            type="text"
            placeholder="質問を自然言語で入力してください（例：WEBサーバーが重い時の対処法）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 text-lg"
          />
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl">🤖</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm text-gray-600">人気の検索:</span>
          {stats.popularTags.map((tag, index) => (
            <button
              key={index}
              onClick={() => setSearchQuery(tag)}
              className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full hover:bg-blue-200 transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      </Card>

      {/* フィルター */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🎯 詳細フィルター
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                { value: 'Security', label: 'セキュリティ' },
                { value: 'Other', label: 'その他' }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: '', label: '全て' },
                { value: 'Published', label: '公開済み' },
                { value: 'Draft', label: '下書き' },
                { value: 'Review', label: 'レビュー中' },
                { value: 'Archived', label: 'アーカイブ' }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              タグ
            </label>
            <Select
              value={tagFilter}
              onChange={setTagFilter}
              options={[
                { value: '', label: '全て' },
                ...stats.popularTags.map(tag => ({ value: tag, label: `#${tag}` }))
              ]}
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
                setTagFilter('');
                setStatusFilter('');
              }}
              variant="secondary"
              className="w-full"
            >
              フィルタークリア
            </Button>
          </div>
        </div>
      </Card>

      {/* チャート行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* カテゴリ分布 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📊 カテゴリ別記事分布
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}件`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 利用状況推移 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📈 閲覧数推移・記事成長
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={2} name="閲覧数" />
                <Line type="monotone" dataKey="articles" stroke="#10B981" strokeWidth={2} name="記事数" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* アクションバー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            variant="primary"
          >
            📝 新規記事作成
          </Button>
          <Button variant="secondary">
            📊 利用統計
          </Button>
          <Button variant="secondary">
            🤖 AI分析
          </Button>
          <Button variant="secondary">
            📁 一括操作
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          {filteredArticles.length} / {stats.total} 件表示中
        </div>
      </div>

      {/* ナレッジ記事一覧 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📋 ナレッジベース・記事一覧
        </h3>
        <div className="space-y-4">
          {filteredArticles.map((article) => (
            <div key={article.id} className="border rounded-lg p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                 onClick={() => handleArticleDetail(article)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{article.title}</h4>
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(article.status)}`}>
                      {article.status}
                    </span>
                    <span className="text-sm text-yellow-600">
                      {getRatingStars(article.rating)} ({article.rating})
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{article.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>👤 {article.author.name}</span>
                    <span>📅 {new Date(article.updatedAt).toLocaleDateString('ja-JP')}</span>
                    <span>👁️ {article.viewCount.toLocaleString()}回閲覧</span>
                    <span>💬 {article.reviews}件のレビュー</span>
                    <span>📝 v{article.version}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-2">{article.category}</div>
                  <div className="text-xs text-gray-500">{article.subcategory}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {article.tags.slice(0, 5).map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      #{tag}
                    </span>
                  ))}
                  {article.tags.length > 5 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                      +{article.tags.length - 5} more
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary">
                    📖 読む
                  </Button>
                  <Button size="sm" variant="secondary">
                    ✏️ 編集
                  </Button>
                  <Button size="sm" variant="secondary">
                    🔗 共有
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 詳細モーダル */}
      {isDetailModalOpen && selectedArticle && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`ナレッジ記事: ${selectedArticle.title}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* 記事メタデータ */}
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 text-xs rounded ${getStatusColor(selectedArticle.status)}`}>
                    {selectedArticle.status}
                  </span>
                  <span className="text-sm text-yellow-600">
                    {getRatingStars(selectedArticle.rating)} ({selectedArticle.rating})
                  </span>
                  <span className="text-sm text-gray-600">v{selectedArticle.version}</span>
                </div>
                <div className="text-sm text-gray-600">
                  作成者: {selectedArticle.author.name} ({selectedArticle.author.department})
                </div>
                <div className="text-xs text-gray-500">
                  作成: {new Date(selectedArticle.createdAt).toLocaleDateString('ja-JP')} | 
                  更新: {new Date(selectedArticle.updatedAt).toLocaleDateString('ja-JP')} |
                  閲覧: {selectedArticle.viewCount.toLocaleString()}回
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{selectedArticle.category}</div>
                <div className="text-xs text-gray-600">{selectedArticle.subcategory}</div>
              </div>
            </div>

            {/* タグ */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">🏷️ タグ</h4>
              <div className="flex flex-wrap gap-2">
                {selectedArticle.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* 記事内容 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">📝 記事内容</h4>
              <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-800">
                  {selectedArticle.content}
                </pre>
              </div>
            </div>

            {/* 関連記事（AI提案） */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">🤖 AI推奨関連記事</h4>
              <div className="space-y-2">
                {getRelatedArticles(selectedArticle).map((related, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <div className="font-medium text-sm">{related.title}</div>
                      <div className="text-xs text-gray-600">{related.description}</div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => handleArticleDetail(related)}>
                      読む
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* 関連インシデント */}
            {selectedArticle.relatedIncidents && selectedArticle.relatedIncidents.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">🔗 関連インシデント</h4>
                <div className="space-y-2">
                  {selectedArticle.relatedIncidents.map((incident, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                      <span className="text-sm">{incident}</span>
                      <Button size="sm" variant="secondary">
                        インシデント表示
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 添付ファイル */}
            {selectedArticle.attachments && selectedArticle.attachments.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">📎 添付ファイル</h4>
                <div className="space-y-2">
                  {selectedArticle.attachments.map((file, index) => (
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

            {/* アクションボタン */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="primary">✏️ 編集</Button>
              <Button variant="secondary">🔗 共有</Button>
              <Button variant="secondary">⭐ 評価</Button>
              <Button variant="secondary">📋 複製</Button>
              <Button variant="secondary">📊 統計</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DetailedKnowledgeManagementPage;