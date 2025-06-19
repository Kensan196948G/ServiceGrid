import { useEffect, useRef, useCallback, useState } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  rerenderCount: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usagePercentage: string;
  };
}

interface UsePerformanceOptions {
  trackRerenders?: boolean;
  trackMemory?: boolean;
  logToConsole?: boolean;
  componentName?: string;
}

export const usePerformance = (options: UsePerformanceOptions = {}) => {
  const {
    trackRerenders = true,
    trackMemory = false,
    logToConsole = process.env.NODE_ENV === 'development',
    componentName = 'Component'
  } = options;

  const renderStartTime = useRef<number>(performance.now());
  const rerenderCount = useRef<number>(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    rerenderCount: 0
  });

  // Track render time
  useEffect(() => {
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;

    if (trackRerenders) {
      rerenderCount.current += 1;
    }

    let memoryUsage;
    if (trackMemory && typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2)
      };
    }

    const newMetrics: PerformanceMetrics = {
      renderTime,
      rerenderCount: rerenderCount.current,
      ...(memoryUsage && { memoryUsage })
    };

    setMetrics(newMetrics);

    if (logToConsole) {
      console.group(`⚡ ${componentName} Performance Metrics`);
      console.log(`🕐 Render Time: ${renderTime.toFixed(2)}ms`);
      console.log(`🔄 Rerender Count: ${rerenderCount.current}`);
      
      if (memoryUsage) {
        console.log(`💾 Memory Usage: ${memoryUsage.usagePercentage}%`);
        console.log(`📊 Used Heap: ${(memoryUsage.usedJSHeapSize / 1048576).toFixed(2)} MB`);
      }
      
      console.groupEnd();
    }

    // Reset for next render measurement
    renderStartTime.current = performance.now();
  });

  const markStart = useCallback((markName: string) => {
    if (typeof window !== 'undefined' && window.performance && window.performance.mark) {
      performance.mark(`${componentName}-${markName}-start`);
    }
  }, [componentName]);

  const markEnd = useCallback((markName: string) => {
    if (typeof window !== 'undefined' && window.performance && window.performance.mark) {
      performance.mark(`${componentName}-${markName}-end`);
      
      try {
        performance.measure(
          `${componentName}-${markName}`,
          `${componentName}-${markName}-start`,
          `${componentName}-${markName}-end`
        );
        
        const measures = performance.getEntriesByName(`${componentName}-${markName}`);
        if (measures.length > 0) {
          const measure = measures[measures.length - 1];
          if (logToConsole) {
            console.log(`📏 ${componentName} ${markName}: ${measure.duration.toFixed(2)}ms`);
          }
        }
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }
    }
  }, [componentName, logToConsole]);

  const measureAsync = useCallback(async <T>(
    markName: string,
    asyncOperation: () => Promise<T>
  ): Promise<T> => {
    markStart(markName);
    try {
      const result = await asyncOperation();
      markEnd(markName);
      return result;
    } catch (error) {
      markEnd(markName);
      throw error;
    }
  }, [markStart, markEnd]);

  const getWebVitals = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const paintEntries = performance.getEntriesByType('paint');
    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];

    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    const lcp = paintEntries.find(entry => entry.name === 'largest-contentful-paint');
    const navigation = navigationEntries[0];

    return {
      // First Contentful Paint
      fcp: fcp ? fcp.startTime : null,
      // Largest Contentful Paint  
      lcp: lcp ? lcp.startTime : null,
      // Time to Interactive (approximation)
      tti: navigation ? navigation.domInteractive - navigation.fetchStart : null,
      // Dom Content Loaded
      dcl: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : null,
      // Total Page Load Time
      loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : null
    };
  }, []);

  const optimizationTips = useCallback(() => {
    const tips = [];
    
    if (metrics.renderTime > 100) {
      tips.push('🐌 Render time is high (>100ms). Consider using React.memo or optimizing renders.');
    }
    
    if (metrics.rerenderCount > 5) {
      tips.push('🔄 High rerender count. Check dependencies in useEffect/useMemo/useCallback.');
    }

    if (metrics.memoryUsage && parseFloat(metrics.memoryUsage.usagePercentage) > 80) {
      tips.push('💾 High memory usage detected. Consider cleanup in useEffect or reducing object creations.');
    }

    if (tips.length === 0) {
      tips.push('✅ Performance looks good!');
    }

    return tips;
  }, [metrics]);

  return {
    metrics,
    markStart,
    markEnd,
    measureAsync,
    getWebVitals,
    optimizationTips
  };
};

// Higher-order component for automatic performance tracking
export const withPerformanceTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> => {
  const PerformanceWrapper = (props: P) => {
    const { metrics } = usePerformance({
      componentName: componentName || WrappedComponent.displayName || WrappedComponent.name,
      trackRerenders: true,
      trackMemory: true
    });

    return <WrappedComponent {...props} />;
  };

  PerformanceWrapper.displayName = `withPerformanceTracking(${componentName || WrappedComponent.displayName || WrappedComponent.name})`;

  return PerformanceWrapper;
};

// Hook for monitoring long tasks
export const useLongTaskMonitor = (threshold: number = 50) => {
  const [longTasks, setLongTasks] = useState<PerformanceEntry[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const longTaskEntries = entries.filter(entry => entry.duration > threshold);
      
      if (longTaskEntries.length > 0) {
        setLongTasks(prev => [...prev, ...longTaskEntries]);
        
        if (process.env.NODE_ENV === 'development') {
          longTaskEntries.forEach(task => {
            console.warn(`🐌 Long task detected: ${task.duration.toFixed(2)}ms`);
          });
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('Long task monitoring not supported:', error);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return {
    longTasks,
    clearLongTasks: () => setLongTasks([])
  };
};