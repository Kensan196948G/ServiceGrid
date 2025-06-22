import * as React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MainLayout } from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IncidentPage from './pages/IncidentPage';
import IncidentReportPage from './pages/IncidentReportPage';
import ServiceRequestPage from './pages/ServiceRequestPage';
import AssetPage from './pages/AssetPage';
import KnowledgePage from './pages/KnowledgePage';
import SettingsPage from './pages/SettingsPage';
import AuditLogPage from './pages/AuditLogPage';
import { APP_NAME } from './constants';

// ITSM プロセス管理ページ
import ChangeManagementPage from './pages/ChangeManagementPage';
import ReleaseManagementPage from './pages/ReleaseManagementPage';
import ProblemManagementPage from './pages/ProblemManagementPage';
import ServiceLevelManagementPage from './pages/ServiceLevelManagementPage';
import CapacityManagementPage from './pages/CapacityManagementPage';
import AvailabilityManagementPage from './pages/AvailabilityManagementPage';
import SecurityManagementPage from './pages/SecurityManagementPage';
import ComplianceManagementPage from './pages/ComplianceManagementPage';

// ProtectedRoute コンポーネント - ルート保護
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
    document.title = APP_NAME;
  }, []);

  // 認証チェック中のローディング画面
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
          {/* 公開ルート - ログイン */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" replace /> : <LoginPage />} 
          />
          
          {/* 保護ルート - 認証必須 */}
          <Route 
            path="/*"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ErrorBoundary>
                    <Routes>
                      {/* デフォルトルート */}
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      
                      {/* ITSMコアページ */}
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/incidents" element={<IncidentPage />} />
                      <Route path="/incident-report" element={<IncidentReportPage />} />
                      <Route path="/requests" element={<ServiceRequestPage />} />
                      <Route path="/assets" element={<AssetPage />} />
                      <Route path="/knowledge" element={<KnowledgePage />} />
                      
                      {/* ITSMプロセス管理ページ */}
                      <Route path="/change-management" element={<ChangeManagementPage />} />
                      <Route path="/release-management" element={<ReleaseManagementPage />} />
                      <Route path="/problem-management" element={<ProblemManagementPage />} />
                      <Route path="/service-level-management" element={<ServiceLevelManagementPage />} />
                      <Route path="/capacity-management" element={<CapacityManagementPage />} />
                      <Route path="/availability-management" element={<AvailabilityManagementPage />} />
                      <Route path="/security-management" element={<SecurityManagementPage />} />
                      <Route path="/compliance-management" element={<ComplianceManagementPage />} />
                      
                      {/* システム管理ページ */}
                      <Route path="/audit-log" element={<AuditLogPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      
                      {/* フォールバック */}
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
        <ToastContainer />
      </HashRouter>
    </ErrorBoundary>
  );
};

// ルートアプリケーション - AuthProvider でラップ
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;