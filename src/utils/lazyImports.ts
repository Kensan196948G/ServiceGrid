import { lazy } from 'react';

// Lazy load heavy components to reduce initial bundle size
export const LazyDashboardPage = lazy(() => import('../pages/DashboardPage'));
export const LazyAssetPage = lazy(() => import('../pages/AssetPage'));
export const LazyIncidentPage = lazy(() => import('../pages/IncidentPage'));
export const LazyServiceRequestPage = lazy(() => import('../pages/ServiceRequestPage'));
export const LazyKnowledgePage = lazy(() => import('../pages/KnowledgePage'));
export const LazyChangeManagementPage = lazy(() => import('../pages/ChangeManagementPage'));
export const LazyProblemManagementPage = lazy(() => import('../pages/ProblemManagementPage'));
export const LazyReleaseManagementPage = lazy(() => import('../pages/ReleaseManagementPage'));
export const LazyServiceLevelManagementPage = lazy(() => import('../pages/ServiceLevelManagementPage'));
export const LazyCapacityManagementPage = lazy(() => import('../pages/CapacityManagementPage'));
export const LazyAvailabilityManagementPage = lazy(() => import('../pages/AvailabilityManagementPage'));
export const LazySecurityManagementPage = lazy(() => import('../pages/SecurityManagementPage'));
export const LazyComplianceManagementPage = lazy(() => import('../pages/ComplianceManagementPage'));
export const LazyAuditLogPage = lazy(() => import('../pages/AuditLogPage'));
export const LazyMaintenancePage = lazy(() => import('../pages/MaintenancePage'));
export const LazySettingsPage = lazy(() => import('../pages/SettingsPage'));

// Lazy load chart components
export const LazyChartPlaceholder = lazy(() => import('../components/ChartPlaceholder'));

// Utility function to create loading fallback
export const createLoadingFallback = (componentName: string): JSX.Element => (
  <div className="flex items-center justify-center min-h-64 bg-white rounded-lg border border-slate-200">
    <div className="text-center space-y-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p className="text-sm text-slate-600">{componentName}を読み込み中...</p>
    </div>
  </div>
);

// Bundle splitting configuration for specific libraries
export const loadRechartsAsync = () => import('recharts');
export const loadLucideIconsAsync = () => import('lucide-react');

// Performance monitoring utilities
export const measureComponentLoad = (componentName: string) => {
  const start = performance.now();
  
  return () => {
    const end = performance.now();
    const duration = end - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 ${componentName} loaded in ${duration.toFixed(2)}ms`);
    }
    
    // Send to analytics if available
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Component Load Time', {
        component: componentName,
        duration: duration,
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Memory usage monitoring
export const monitorMemoryUsage = () => {
  if (typeof window !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;
    
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2)
    };
  }
  
  return null;
};

// Bundle size optimization hints
export const getBundleOptimizationTips = () => {
  const tips = [];
  
  // Check for unused imports
  if (typeof window !== 'undefined') {
    tips.push('💡 使用していないimportを削除してバンドルサイズを削減');
    tips.push('📦 Tree Shakingが有効になっていることを確認');
    tips.push('🔄 Dynamic Importsを使用して初期ロード時間を短縮');
    tips.push('📊 Webpack Bundle Analyzerでバンドルサイズを分析');
  }
  
  return tips;
};