import React from 'react';

export const APP_NAME = "ITSM運用システムプラットフォーム";

// Heroicon SVG paths (example, replace with actual SVG paths or components)
// Using simple text for icons to avoid large SVG strings here.
// In a real app, these would be proper SVG components or imported icons.
const HomeIcon = () => <span className="w-5 h-5 mr-3">🏠</span>;
const ExclamationTriangleIcon = () => <span className="w-5 h-5 mr-3">⚠️</span>;
const DocumentTextIcon = () => <span className="w-5 h-5 mr-3">📄</span>;
const CubeIcon = () => <span className="w-5 h-5 mr-3">📦</span>;
const BookOpenIcon = () => <span className="w-5 h-5 mr-3">📚</span>;
const CogIcon = () => <span className="w-5 h-5 mr-3">⚙️</span>;
const ClipboardDocumentListIcon = () => <span className="w-5 h-5 mr-3">📋</span>;

// New Icons for additional ITSM modules
const ArrowsRightLeftIcon = () => <span className="w-5 h-5 mr-3">🔄</span>; // Change Management
const RocketLaunchIcon = () => <span className="w-5 h-5 mr-3">🚀</span>; // Release Management
const LightBulbIcon = () => <span className="w-5 h-5 mr-3">💡</span>; // Problem Management
const ChartBarIcon = () => <span className="w-5 h-5 mr-3">📊</span>; // Service Level Management
const CloudArrowUpIcon = () => <span className="w-5 h-5 mr-3">📈</span>; // Capacity Management (using trend up)
const ShieldCheckIcon = () => <span className="w-5 h-5 mr-3">🛡️</span>; // Security Management
const ScaleIcon = () => <span className="w-5 h-5 mr-3">⚖️</span>; // Compliance Management
const HeartIcon = () => <span className="w-5 h-5 mr-3">💓</span>; // Availability Management


export interface NavigationItemType {
  name: string;
  description: string;
  path: string;
  icon: React.ReactElement;
}

export const NAVIGATION_ITEMS: NavigationItemType[] = [
  { name: 'ダッシュボード', description: 'システムの概要と統計', path: '/', icon: <HomeIcon /> },
  { name: 'インシデント管理', description: '障害/問い合わせ受付、進捗管理、記録', path: '/incidents', icon: <ExclamationTriangleIcon /> },
  { name: 'サービス要求管理', description: 'ユーザー申請、アカウント／権限変更等', path: '/requests', icon: <DocumentTextIcon /> },
  { name: '変更管理', description: '設定変更・申請の記録、承認フロー', path: '/change-management', icon: <ArrowsRightLeftIcon /> },
  { name: '構成管理', description: '資産台帳管理、ライセンス・機器管理', path: '/assets', icon: <CubeIcon /> },
  { name: 'リリース管理', description: '新規サービス・システム変更時の計画・展開', path: '/release-management', icon: <RocketLaunchIcon /> },
  { name: '問題管理', description: '再発防止、恒久対策・原因分析の記録', path: '/problem-management', icon: <LightBulbIcon /> },
  { name: 'ナレッジ管理', description: '手順書・FAQのDB化・検索', path: '/knowledge', icon: <BookOpenIcon /> },
  { name: 'サービスレベル管理', description: 'SLA・KPI設定、実績記録、達成状況可視化', path: '/service-level-management', icon: <ChartBarIcon /> },
  { name: 'キャパシティ管理', description: 'IT資源利用状況、拡張計画、閾値アラート', path: '/capacity-management', icon: <CloudArrowUpIcon /> },
  { name: '可用性管理', description: 'システム稼働率、障害履歴、復旧対応管理', path: '/availability-management', icon: <HeartIcon /> },
  { name: 'セキュリティ管理', description: 'アクセス権・認証履歴、脆弱性・監査管理', path: '/security-management', icon: <ShieldCheckIcon /> },
  { name: 'コンプライアンス管理', description: 'ISO/社内規定遵守の証跡、点検記録', path: '/compliance-management', icon: <ScaleIcon /> },
  { name: '各種監査証跡ログ管理', description: '操作・変更の全履歴記録', path: '/audit-log', icon: <ClipboardDocumentListIcon /> },
  { name: 'システム設定', description: 'アプリ全体の動作、ユーザー、セキュリティ等の設定', path: '/settings', icon: <CogIcon /> },
];

export const MOCK_MS_CLIENT_ID = "22e5d6e4-805f-4516-af09-ff09c7c224c4"; // From user prompt
export const MOCK_MS_TENANT_ID = "a7232f7a-a9e5-4f71-9372-dc8b1c6645ea"; // From user prompt

// Gemini Model
export const GEMINI_TEXT_MODEL = "gemini-2.5-flash-preview-04-17";

// API Key - IMPORTANT: This should be handled via environment variables securely.
// For this frontend-only example, we'll state it's expected from process.env.API_KEY
// but the actual geminiService will try to use it. If not available, it will error.
// In a real build setup, process.env.API_KEY would be substituted.
export const GEMINI_API_KEY_ENV_VAR = "process.env.API_KEY";