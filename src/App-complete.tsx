import * as React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

// ================================================================================
// 型定義（完全自己完結）
// ================================================================================

enum UserRole {
  ADMIN = 'Admin',
  USER = 'User', 
  READ_ONLY = 'ReadOnly'
}

interface User {
  id: string;
  username: string;
  role: UserRole;
  email?: string;
  department?: string;
  title?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

// ================================================================================
// Auth Context（完全自己完結）
// ================================================================================

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem('servicegrid_auth');
      if (stored) {
        const authData = JSON.parse(stored);
        if (Date.now() - authData.timestamp < 30 * 60 * 1000) {
          setUser(authData.user);
        } else {
          sessionStorage.removeItem('servicegrid_auth');
        }
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
      sessionStorage.removeItem('servicegrid_auth');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    
    try {
      if (username === 'admin' && password === 'admin123') {
        const userData: User = {
          id: '1',
          username: 'admin',
          role: UserRole.ADMIN,
          email: 'admin@servicegrid.com'
        };
        
        const sessionData = {
          user: userData,
          timestamp: Date.now()
        };
        
        setUser(userData);
        sessionStorage.setItem('servicegrid_auth', JSON.stringify(sessionData));
        return true;
      } else if (username === 'operator' && password === 'operator123') {
        const userData: User = {
          id: '2',
          username: 'operator',
          role: UserRole.USER,
          email: 'operator@servicegrid.com'
        };
        
        const sessionData = {
          user: userData,
          timestamp: Date.now()
        };
        
        setUser(userData);
        sessionStorage.setItem('servicegrid_auth', JSON.stringify(sessionData));
        return true;
      } else {
        setError('ユーザー名またはパスワードが正しくありません');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('ログイン処理中にエラーが発生しました');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('servicegrid_auth');
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ================================================================================
// エラーバウンダリ（完全自己完結）
// ================================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-600 mb-2">
              アプリケーションエラー
            </h2>
            <p className="text-gray-600 mb-4">
              予期しないエラーが発生しました。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ================================================================================
// ナビゲーションメニュー（完全自己完結）
// ================================================================================

const NAVIGATION_ITEMS = [
  { path: '/dashboard', label: 'ダッシュボード', icon: '📊' },
  { path: '/requests', label: 'サービス要求', icon: '📝' },
  { path: '/assets', label: '資産管理', icon: '💻' },
  { path: '/change-management', label: '変更管理', icon: '🔄' },
  { path: '/release-management', label: 'リリース管理', icon: '🚀' },
  { path: '/problem-management', label: '問題管理', icon: '🔍' },
  { path: '/knowledge', label: 'ナレッジ管理', icon: '📚' },
  { path: '/service-level-management', label: 'サービスレベル管理', icon: '📈' },
  { path: '/capacity-management', label: 'キャパシティ管理', icon: '⚡' },
  { path: '/availability-management', label: '可用性管理', icon: '🟢' },
  { path: '/security-management', label: 'セキュリティ管理', icon: '🔒' },
  { path: '/compliance-management', label: 'コンプライアンス管理', icon: '📋' },
  { path: '/audit-log', label: '監査ログ', icon: '📜' },
  { path: '/settings', label: 'システム設定', icon: '⚙️' },
];

const userRoleToJapanese = (role: UserRole): string => {
  switch (role) {
    case UserRole.ADMIN: return '管理者';
    case UserRole.USER: return 'ユーザー';
    case UserRole.READ_ONLY: return '閲覧専用';
    default: return role;
  }
};

// ================================================================================
// レイアウトコンポーネント（完全自己完結）
// ================================================================================

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const handleNavClick = React.useCallback(() => {
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
  }, [toggleSidebar]);

  const handleOverlayClick = React.useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      toggleSidebar();
    }
  }, [toggleSidebar]);

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black opacity-50 lg:hidden" 
          onClick={handleOverlayClick}
        />
      )}
      
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-30 w-72 bg-slate-800 text-slate-100 p-4 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}
      >
        <div className="text-2xl font-bold mb-6 text-center text-white">
          ServiceGrid ITSM
        </div>
        
        <nav className="flex-grow overflow-y-auto">
          <ul>
            {NAVIGATION_ITEMS.map((item) => (
              <li key={item.label} className="mb-1.5">
                <a
                  href={`#${item.path}`}
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.hash = item.path;
                    handleNavClick();
                  }}
                  className="flex items-start p-3 rounded-md hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
                >
                  <span className="flex-shrink-0 mr-3">{item.icon}</span>
                  <span className="block text-sm leading-tight truncate">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        
        <footer className="mt-auto pt-4">
          <p className="text-xs text-slate-400 text-center">
            &copy; {new Date().getFullYear()} ITSM プラットフォーム
          </p>
        </footer>
      </aside>
    </>
  );
};

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const handleLogout = React.useCallback(() => {
    logout();
  }, [logout]);

  const toggleDropdown = React.useCallback(() => {
    setDropdownOpen(prev => !prev);
  }, []);

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
      <div className="flex items-center">
        <button 
          onClick={toggleSidebar} 
          className="text-slate-600 lg:hidden mr-4 p-1 rounded-md hover:bg-slate-100"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-slate-800 hidden md:block">
          ServiceGrid ITSM
        </h1>
      </div>
      
      <div className="relative">
        <button 
          onClick={toggleDropdown} 
          className="flex items-center text-slate-600 hover:text-blue-600"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
          </svg>
          {user && (
            <span className="ml-2 hidden md:inline">
              {user.username} ({userRoleToJapanese(user.role)})
            </span>
          )}
        </button>
        
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-slate-200">
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  
  const toggleSidebar = React.useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

// ================================================================================
// ページコンポーネント（完全自己完結）
// ================================================================================

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
    <div className="max-w-7xl mx-auto">
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
          
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-800 mb-3">📈 最近のアクティビティ</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• 新規サービス要求が3件作成されました</p>
                <p>• 資産管理でサーバー情報が更新されました</p>
                <p>• 変更管理で承認待ちが2件あります</p>
                <p>• ナレッジベースに新しい記事が追加されました</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-800 mb-3">🎯 システム状況</h3>
              <div className="space-y-2 text-sm">
                <p className="text-green-600">✅ フロントエンド: 正常稼働</p>
                <p className="text-green-600">✅ バックエンド: 正常稼働</p>
                <p className="text-green-600">✅ データベース: 接続中</p>
                <p className="text-green-600">✅ 認証システム: 正常稼働</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlaceholderPage: React.FC<{ title: string; icon: string }> = ({ title, icon }) => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {icon} {title}
          </h2>
          <p className="text-gray-600 mb-6">
            この機能は実装予定です。
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>実装予定機能:</strong>
            </p>
            <ul className="mt-2 text-blue-700 text-sm list-disc list-inside">
              <li>データの表示・検索・フィルタリング</li>
              <li>新規作成・編集・削除機能</li>
              <li>ワークフロー管理</li>
              <li>レポート・統計機能</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// ================================================================================
// ルーティング（完全自己完結）
// ================================================================================

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
                      <Route path="/requests" element={<PlaceholderPage title="サービス要求" icon="📝" />} />
                      <Route path="/assets" element={<PlaceholderPage title="資産管理" icon="💻" />} />
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
                      <Route path="/settings" element={<PlaceholderPage title="システム設定" icon="⚙️" />} />
                      
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

// ================================================================================
// メインアプリケーション
// ================================================================================

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;