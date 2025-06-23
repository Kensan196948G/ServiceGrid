import * as React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MainLayout } from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// 基本的なページコンポーネントを作成（型エラーを回避）
const LoginPage: React.FC = () => {
  const [credentials, setCredentials] = React.useState({ username: '', password: '' });
  const { login, error, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(credentials.username, credentials.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ServiceGrid ITSM</h1>
          <p className="text-gray-600">IT運用システムプラットフォーム</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ユーザー名
            </label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin または operator"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              パスワード
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="パスワードを入力"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p><strong>テスト用ログイン情報:</strong></p>
          <p>管理者: admin / admin123</p>
          <p>オペレーター: operator / operator123</p>
        </div>
      </div>
    </div>
  );
};

const DashboardPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              📊 ダッシュボード
            </h2>
            <p className="text-gray-600 mb-6">
              ServiceGrid ITSM プラットフォームへようこそ
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">📝 サービス要求</h3>
                <p className="text-2xl font-bold text-blue-600">12</p>
                <p className="text-sm text-blue-600">件 処理中</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-800 mb-2">💻 IT資産</h3>
                <p className="text-2xl font-bold text-green-600">342</p>
                <p className="text-sm text-green-600">台 管理中</p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">🔄 変更管理</h3>
                <p className="text-2xl font-bold text-yellow-600">8</p>
                <p className="text-sm text-yellow-600">件 承認待ち</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-800 mb-2">📚 ナレッジ</h3>
                <p className="text-2xl font-bold text-purple-600">156</p>
                <p className="text-sm text-purple-600">記事 公開中</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ServiceRequestPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              📝 サービス要求管理
            </h2>
            <p className="text-gray-600">
              サービス要求の管理機能が実装予定です。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AssetPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              💻 IT資産管理 (CMDB)
            </h2>
            <p className="text-gray-600">
              IT資産の管理機能が実装予定です。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              ⚙️ システム設定
            </h2>
            <p className="text-gray-600">
              システム設定・ユーザー管理機能が実装予定です。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// PlaceholderPage for other routes
const PlaceholderPage: React.FC<{ title: string; icon: string }> = ({ title, icon }) => {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {icon} {title}
            </h2>
            <p className="text-gray-600">
              この機能は実装予定です。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ProtectedRoute コンポーネント
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// メインアプリケーションコンポーネント
const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  React.useEffect(() => {
    document.title = 'ServiceGrid ITSM - IT運用システムプラットフォーム';
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-xl text-slate-700">ITSM運用システム読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" replace /> : <LoginPage />} 
          />
          
          <Route 
            path="/*"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/requests" element={<ServiceRequestPage />} />
                      <Route path="/assets" element={<AssetPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      
                      {/* プレースホルダーページ */}
                      <Route path="/change-management" element={<PlaceholderPage title="変更管理" icon="🔄" />} />
                      <Route path="/release-management" element={<PlaceholderPage title="リリース管理" icon="🚀" />} />
                      <Route path="/problem-management" element={<PlaceholderPage title="問題管理" icon="🔍" />} />
                      <Route path="/service-level-management" element={<PlaceholderPage title="サービスレベル管理" icon="📈" />} />
                      <Route path="/capacity-management" element={<PlaceholderPage title="キャパシティ管理" icon="⚡" />} />
                      <Route path="/availability-management" element={<PlaceholderPage title="可用性管理" icon="🟢" />} />
                      <Route path="/security-management" element={<PlaceholderPage title="セキュリティ管理" icon="🔒" />} />
                      <Route path="/compliance-management" element={<PlaceholderPage title="コンプライアンス管理" icon="📋" />} />
                      <Route path="/knowledge" element={<PlaceholderPage title="ナレッジ管理" icon="📚" />} />
                      <Route path="/audit-log" element={<PlaceholderPage title="監査ログ" icon="📜" />} />
                      
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
};

// ルートアプリケーション
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;