import * as React from 'react';
const { useState, memo } = React;
import { NavLink } from 'react-router-dom';

// 拡張ナビゲーションメニュー - 詳細説明・アイコン・ツールチップ付き
const ENHANCED_NAVIGATION_ITEMS = [
  { 
    path: '/dashboard', 
    label: 'ダッシュボード', 
    icon: '📊',
    description: 'システム全体の監視・統計・リアルタイム状況',
    category: 'overview',
    features: ['KPI監視', 'アクティビティログ', 'パフォーマンス分析']
  },
  { 
    path: '/requests', 
    label: 'サービス要求', 
    icon: '📝',
    description: '承認ワークフロー・自動化・要求管理',
    category: 'operations',
    features: ['承認フロー', 'カタログ管理', '自動プロビジョニング']
  },
  { 
    path: '/assets', 
    label: 'IT資産管理', 
    icon: '💻',
    description: 'CMDB・資産ライフサイクル・コスト最適化',
    category: 'management',
    features: ['自動発見', 'ライフサイクル管理', 'コスト分析']
  },
  { 
    path: '/change-management', 
    label: '変更管理', 
    icon: '🔄',
    description: 'CAB承認・影響分析・変更スケジューリング',
    category: 'operations',
    features: ['CAB承認', '影響分析', 'ロールバック計画']
  },
  { 
    path: '/knowledge', 
    label: 'ナレッジ管理', 
    icon: '📚',
    description: 'FAQ・解決策・ベストプラクティスの知識ベース',
    category: 'management',
    features: ['AI検索', '自動提案', 'バージョン管理']
  },
  { 
    path: '/problem-management', 
    label: '問題管理', 
    icon: '🔍',
    description: '根本原因分析・既知エラー・問題解決',
    category: 'operations',
    features: ['根本原因分析', 'トレンド分析', '既知エラーDB']
  },
  { 
    path: '/release-management', 
    label: 'リリース管理', 
    icon: '🚀',
    description: 'デプロイメント・ロールアウト・バージョン管理',
    category: 'operations',
    features: ['自動デプロイ', 'ロールバック', 'A/Bテスト']
  },
  { 
    path: '/sla-management', 
    label: 'SLA管理', 
    icon: '📋',
    description: 'サービスレベル協定・パフォーマンス監視',
    category: 'management',
    features: ['SLA追跡', 'レポート自動生成', 'アラート設定']
  },
  { 
    path: '/capacity-management', 
    label: 'キャパシティ管理', 
    icon: '📈',
    description: '容量計画・パフォーマンス予測・リソース最適化',
    category: 'management',
    features: ['容量予測', 'トレンド分析', 'アラート']
  },
  { 
    path: '/availability-management', 
    label: '可用性管理', 
    icon: '⚡',
    description: 'システム可用性・冗長化・災害復旧',
    category: 'management',
    features: ['可用性監視', 'DR計画', 'MTTRメトリクス']
  },
  { 
    path: '/security-management', 
    label: 'セキュリティ管理', 
    icon: '🔒',
    description: 'セキュリティ監視・脅威検知・コンプライアンス',
    category: 'security',
    features: ['脅威検知', 'ログ分析', 'コンプライアンス']
  },
  { 
    path: '/compliance', 
    label: 'コンプライアンス', 
    icon: '✅',
    description: '規制遵守・監査対応・ポリシー管理',
    category: 'security',
    features: ['監査レポート', 'ポリシー管理', '自動チェック']
  },
  { 
    path: '/audit-logs', 
    label: '監査ログ', 
    icon: '📜',
    description: 'アクセスログ・変更履歴・セキュリティ監査',
    category: 'security',
    features: ['リアルタイム監視', 'イベント分析', 'レポート']
  },
  { 
    path: '/settings', 
    label: 'システム設定', 
    icon: '⚙️',
    description: 'システム設定・ユーザー管理・権限設定',
    category: 'admin',
    features: ['ユーザー管理', '権限設定', 'システム設定']
  }
];

const categoryColors = {
  overview: 'bg-blue-500',
  operations: 'bg-green-500', 
  management: 'bg-purple-500',
  security: 'bg-red-500',
  admin: 'bg-gray-500'
};

const categoryLabels = {
  overview: '概要',
  operations: '運用',
  management: '管理',
  security: 'セキュリティ',
  admin: '管理者'
};

interface EnhancedNavigationProps {
  isCollapsed?: boolean;
  onNavigate?: (path: string) => void;
}

const EnhancedNavigation: React.FC<EnhancedNavigationProps> = ({ 
  isCollapsed = false, 
  onNavigate 
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    overview: true,
    operations: true,
    management: false,
    security: false,
    admin: false
  });
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const groupedItems = ENHANCED_NAVIGATION_ITEMS.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof ENHANCED_NAVIGATION_ITEMS>);

  return (
    <nav className={`${isCollapsed ? 'w-16' : 'w-80'} bg-white shadow-lg transition-all duration-300 overflow-y-auto`}>
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            SG
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-gray-900">ServiceGrid</h1>
              <p className="text-xs text-gray-600">ITSM統合プラットフォーム</p>
            </div>
          )}
        </div>
      </div>

      {/* ナビゲーション */}
      <div className="p-2">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="mb-4">
            {/* カテゴリヘッダー */}
            <button
              onClick={() => toggleCategory(category)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isCollapsed ? 'justify-center' : 'justify-between'
              } hover:bg-gray-50`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${categoryColors[category as keyof typeof categoryColors]}`}></div>
                {!isCollapsed && (
                  <span className="font-medium text-gray-700 text-sm">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <svg 
                  className={`w-4 h-4 transition-transform ${
                    expandedCategories[category] ? 'rotate-90' : ''
                  }`}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* カテゴリアイテム */}
            {(expandedCategories[category] || isCollapsed) && (
              <div className={`${isCollapsed ? 'space-y-1' : 'ml-6 space-y-1'} mt-2`}>
                {items.map((item) => (
                  <div key={item.path} className="relative">
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group ${
                          isActive 
                            ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' 
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        } ${isCollapsed ? 'justify-center' : ''}`
                      }
                      onClick={() => onNavigate?.(item.path)}
                      onMouseEnter={() => setHoveredItem(item.path)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <span className="text-xl">{item.icon}</span>
                      {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{item.label}</div>
                          <div className="text-xs text-gray-500 truncate">{item.description}</div>
                        </div>
                      )}
                    </NavLink>

                    {/* ツールチップ（collapsed時） */}
                    {isCollapsed && hoveredItem === item.path && (
                      <div className="absolute left-full top-0 ml-2 z-50 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">{item.icon}</span>
                          <h3 className="font-bold text-gray-900">{item.label}</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                        <div className="space-y-1">
                          <h4 className="text-xs font-medium text-gray-700">主要機能:</h4>
                          {item.features.map((feature, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
                              <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 詳細情報（expanded時） */}
                    {!isCollapsed && hoveredItem === item.path && (
                      <div className="mt-2 ml-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="text-xs font-medium text-gray-700 mb-2">主要機能:</h4>
                        <div className="grid grid-cols-1 gap-1">
                          {item.features.map((feature, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
                              <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* フッター情報 */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span>システム状況</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-600">正常稼働</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>稼働率:</span>
                <span className="font-medium">99.97%</span>
              </div>
              <div className="flex justify-between">
                <span>応答時間:</span>
                <span className="font-medium">12ms</span>
              </div>
              <div className="flex justify-between">
                <span>アクティブユーザー:</span>
                <span className="font-medium">1,203名</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default memo(EnhancedNavigation);