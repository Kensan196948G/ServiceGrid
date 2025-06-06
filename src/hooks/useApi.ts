import { useState, useCallback } from 'react';
import { handleApiError, logError } from '../utils/errorHandler';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  showErrorToast?: boolean;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const execute = useCallback(async (
    apiCall: () => Promise<T>,
    options: UseApiOptions = {}
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiCall();
      setState({ data, loading: false, error: null });
      
      if (options.onSuccess) {
        options.onSuccess(data);
      }
      
      return data;
    } catch (error) {
      const appError = handleApiError(error);
      logError(error, 'API call failed');
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: appError.message 
      }));

      if (options.onError) {
        options.onError(appError);
      }

      throw appError;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset
  };
}

// 特定のAPIエンドポイント用のカスタムhooks
export function useApiCall<T>(apiCall: () => Promise<T>, dependencies: any[] = []) {
  const { data, loading, error, execute } = useApi<T>();

  const refresh = useCallback(() => {
    execute(apiCall);
  }, [execute, ...dependencies]);

  return {
    data,
    loading,
    error,
    refresh
  };
}