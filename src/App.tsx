
import * as React from 'react';
import { HashRouter, Routes, Route, Navigate } from './components/RouterPlaceholder';
import { useAuth } from './contexts/AuthContext';
import { MainLayout } from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IncidentPage from './pages/IncidentPage';
import ServiceRequestPage from './pages/ServiceRequestPage';
import AssetPage from './pages/AssetPage'; // Represents Configuration Management
import KnowledgePage from './pages/KnowledgePage'; // Represents Knowledge Management
import SettingsPage from './pages/SettingsPage'; // Represents System Settings
import AuditLogPage from './pages/AuditLogPage'; // Represents Audit Log Management
import { APP_NAME } from './constants';

// Import new placeholder pages
import ChangeManagementPage from './pages/ChangeManagementPage';
import ReleaseManagementPage from './pages/ReleaseManagementPage';
import ProblemManagementPage from './pages/ProblemManagementPage';
import ServiceLevelManagementPage from './pages/ServiceLevelManagementPage';
import CapacityManagementPage from './pages/CapacityManagementPage';
import AvailabilityManagementPage from './pages/AvailabilityManagementPage';
import SecurityManagementPage from './pages/SecurityManagementPage';
import ComplianceManagementPage from './pages/ComplianceManagementPage';


const App: React.FC = () => {
  const { user } = useAuth();

  React.useEffect(() => {
    document.title = APP_NAME;
  }, []);

  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route 
            path="/*"
            element={
              user ? (
                <MainLayout>
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/incidents" element={<IncidentPage />} />
                      <Route path="/requests" element={<ServiceRequestPage />} />
                      <Route path="/change-management" element={<ChangeManagementPage />} />
                      <Route path="/assets" element={<AssetPage />} /> {/* Configuration Management */}
                      <Route path="/release-management" element={<ReleaseManagementPage />} />
                      <Route path="/problem-management" element={<ProblemManagementPage />} />
                      <Route path="/knowledge" element={<KnowledgePage />} /> {/* Knowledge Management */}
                      <Route path="/service-level-management" element={<ServiceLevelManagementPage />} />
                      <Route path="/capacity-management" element={<CapacityManagementPage />} />
                      <Route path="/availability-management" element={<AvailabilityManagementPage />} />
                      <Route path="/security-management" element={<SecurityManagementPage />} />
                      <Route path="/compliance-management" element={<ComplianceManagementPage />} />
                      <Route path="/audit-log" element={<AuditLogPage />} /> {/* Audit Log Management */}
                      <Route path="/settings" element={<SettingsPage />} /> {/* System Settings */}
                      <Route path="*" element={<Navigate to="/" />} /> {/* Fallback for authenticated users */}
                    </Routes>
                  </ErrorBoundary>
                </MainLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
        <ToastContainer />
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;