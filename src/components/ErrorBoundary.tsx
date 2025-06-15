import { Component, ErrorInfo, ReactNode, memo } from 'react';
import { Button } from './CommonUI';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  level?: 'page' | 'section' | 'component';
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  eventId?: string;
  resetCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      resetCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      eventId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // エラーをコンソールに記録（開発環境）
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 ErrorBoundary caught an error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // カスタムエラーハンドラーを呼び出し
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        console.error('Error in custom error handler:', handlerError);
      }
    }

    // 本番環境では外部ログサービスに送信
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys && resetKeys.length > 0) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // 本番環境でのエラー報告
      // 実際の実装では、Sentry、LogRocket、Bugsnagなどのサービスを使用
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        level: this.props.level || 'component',
        resetCount: this.state.resetCount
      };

      // TODO: 外部ログサービスに送信
      console.log('Error reported:', errorData);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = window.setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        eventId: undefined,
        resetCount: prevState.resetCount + 1
      }));
    }, 100);
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'component' } = this.props;
      const containerClass = level === 'page' 
        ? 'min-h-screen flex items-center justify-center bg-slate-50'
        : level === 'section'
        ? 'min-h-96 flex items-center justify-center bg-slate-50 rounded-lg'
        : 'min-h-48 flex items-center justify-center bg-slate-50 rounded-md';

      return (
        <div className={containerClass} role="alert">
          <div className="max-w-md w-full mx-auto p-6">
            <div className="bg-white shadow-lg rounded-lg p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <svg 
                  className="w-6 h-6 text-red-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
              
              <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
                申し訳ございません
              </h1>
              
              <p className="text-gray-600 text-center mb-6">
                予期しないエラーが発生しました。<br />
                {this.state.resetCount > 0 && `(${this.state.resetCount}回目のエラー)`}<br />
                しばらく時間をおいてから再度お試しください。
              </p>

              <div className="flex flex-col space-y-3">
                <Button
                  onClick={this.resetErrorBoundary}
                  variant="primary"
                  fullWidth
                  className="justify-center"
                >
                  再試行
                </Button>
                
                <Button
                  onClick={this.handleReload}
                  variant="secondary"
                  fullWidth
                  className="justify-center"
                >
                  ページを再読み込み
                </Button>
                
                <Button
                  onClick={this.handleGoBack}
                  variant="ghost"
                  fullWidth
                  className="justify-center"
                >
                  前のページに戻る
                </Button>
              </div>

              {this.state.eventId && (
                <div className="mt-4 p-2 bg-slate-100 rounded text-xs text-center text-slate-600">
                  エラーID: {this.state.eventId}
                </div>
              )}

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-sm">
                  <summary className="cursor-pointer text-gray-600 font-medium hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
                    🔍 開発者情報 (クリックして表示)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-64">
                    <div className="space-y-3">
                      <div>
                        <div className="font-semibold text-red-600 mb-1">
                          {this.state.error.name}: {this.state.error.message}
                        </div>
                        <div className="text-gray-500 text-xs mb-2">
                          Reset Count: {this.state.resetCount} | Event ID: {this.state.eventId}
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-semibold mb-1">Stack Trace:</div>
                        <pre className="whitespace-pre-wrap text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto">
                          {this.state.error.stack}
                        </pre>
                      </div>
                      
                      {this.state.errorInfo && (
                        <div>
                          <div className="font-semibold mb-1">Component Stack:</div>
                          <pre className="whitespace-pre-wrap text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                      
                      <div>
                        <div className="font-semibold mb-1">Browser Info:</div>
                        <div className="text-xs bg-white p-2 rounded border">
                          <div>User Agent: {navigator.userAgent}</div>
                          <div>URL: {window.location.href}</div>
                          <div>Timestamp: {new Date().toISOString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy error boundary wrapping
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = memo((props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  ));
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for resetting error boundaries (to be used with resetKeys)
export const useErrorBoundaryReset = () => {
  const [resetKey, setResetKey] = React.useState(0);
  const resetErrorBoundary = React.useCallback(() => {
    setResetKey(prev => prev + 1);
  }, []);
  
  return [resetKey, resetErrorBoundary] as const;
};

export default ErrorBoundary;