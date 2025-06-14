import { renderHook, act } from '@testing-library/react';
import { useApi, useApiCall } from '../useApi';
import { handleApiError, logError } from '../../utils/errorHandler';

// エラーハンドリングのモック
jest.mock('../../utils/errorHandler');
const mockHandleApiError = handleApiError as jest.MockedFunction<typeof handleApiError>;
const mockLogError = logError as jest.MockedFunction<typeof logError>;

describe('useApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('初期状態が正しく設定される', () => {
    const { result } = renderHook(() => useApi<string>());

    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('API呼び出しが成功した場合の状態管理', async () => {
    const mockApiCall = jest.fn().mockResolvedValue('success data');
    const { result } = renderHook(() => useApi<string>());

    await act(async () => {
      await result.current.execute(mockApiCall);
    });

    expect(result.current.data).toBe('success data');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it('API呼び出し中のローディング状態', async () => {
    let resolvePromise: (value: string) => void;
    const mockApiCall = jest.fn().mockReturnValue(
      new Promise<string>((resolve) => {
        resolvePromise = resolve;
      })
    );

    const { result } = renderHook(() => useApi<string>());

    act(() => {
      result.current.execute(mockApiCall);
    });

    // ローディング状態の確認
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);

    await act(async () => {
      resolvePromise!('success data');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('success data');
  });

  it('API呼び出しでエラーが発生した場合の状態管理', async () => {
    const mockError = new Error('API Error');
    const mockHandledError = { message: 'Handled error message' };
    
    mockHandleApiError.mockReturnValue(mockHandledError as any);
    const mockApiCall = jest.fn().mockRejectedValue(mockError);
    
    const { result } = renderHook(() => useApi<string>());

    await act(async () => {
      try {
        await result.current.execute(mockApiCall);
      } catch (error) {
        // エラーはthrowされる
      }
    });

    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Handled error message');
    expect(mockHandleApiError).toHaveBeenCalledWith(mockError);
    expect(mockLogError).toHaveBeenCalledWith(mockError, 'API call failed');
  });

  it('onSuccessコールバックが呼び出される', async () => {
    const mockApiCall = jest.fn().mockResolvedValue('success data');
    const mockOnSuccess = jest.fn();
    
    const { result } = renderHook(() => useApi<string>());

    await act(async () => {
      await result.current.execute(mockApiCall, { onSuccess: mockOnSuccess });
    });

    expect(mockOnSuccess).toHaveBeenCalledWith('success data');
  });

  it('onErrorコールバックが呼び出される', async () => {
    const mockError = new Error('API Error');
    const mockHandledError = { message: 'Handled error message' };
    const mockOnError = jest.fn();
    
    mockHandleApiError.mockReturnValue(mockHandledError as any);
    const mockApiCall = jest.fn().mockRejectedValue(mockError);
    
    const { result } = renderHook(() => useApi<string>());

    await act(async () => {
      try {
        await result.current.execute(mockApiCall, { onError: mockOnError });
      } catch (error) {
        // エラーはthrowされる
      }
    });

    expect(mockOnError).toHaveBeenCalledWith(mockHandledError);
  });

  it('resetが正しく動作する', async () => {
    const mockApiCall = jest.fn().mockResolvedValue('success data');
    const { result } = renderHook(() => useApi<string>());

    // データを設定
    await act(async () => {
      await result.current.execute(mockApiCall);
    });

    expect(result.current.data).toBe('success data');

    // リセット
    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('複数のAPI呼び出しで最後の結果が反映される', async () => {
    const mockApiCall1 = jest.fn().mockResolvedValue('data 1');
    const mockApiCall2 = jest.fn().mockResolvedValue('data 2');
    
    const { result } = renderHook(() => useApi<string>());

    await act(async () => {
      await result.current.execute(mockApiCall1);
    });

    expect(result.current.data).toBe('data 1');

    await act(async () => {
      await result.current.execute(mockApiCall2);
    });

    expect(result.current.data).toBe('data 2');
    expect(result.current.error).toBe(null);
  });

  it('エラー後の成功でエラーがクリアされる', async () => {
    const mockError = new Error('API Error');
    const mockHandledError = { message: 'Handled error message' };
    
    mockHandleApiError.mockReturnValue(mockHandledError as any);
    const mockApiCallError = jest.fn().mockRejectedValue(mockError);
    const mockApiCallSuccess = jest.fn().mockResolvedValue('success data');
    
    const { result } = renderHook(() => useApi<string>());

    // エラーを発生させる
    await act(async () => {
      try {
        await result.current.execute(mockApiCallError);
      } catch (error) {
        // エラーはthrowされる
      }
    });

    expect(result.current.error).toBe('Handled error message');

    // 成功させる
    await act(async () => {
      await result.current.execute(mockApiCallSuccess);
    });

    expect(result.current.data).toBe('success data');
    expect(result.current.error).toBe(null);
  });

  it('executeから返されるデータが正しい', async () => {
    const mockApiCall = jest.fn().mockResolvedValue('success data');
    const { result } = renderHook(() => useApi<string>());

    let returnedData: string | undefined;

    await act(async () => {
      returnedData = await result.current.execute(mockApiCall);
    });

    expect(returnedData).toBe('success data');
    expect(result.current.data).toBe('success data');
  });

  it('executeでエラーが正しくthrowされる', async () => {
    const mockError = new Error('API Error');
    const mockHandledError = { message: 'Handled error message' };
    
    mockHandleApiError.mockReturnValue(mockHandledError as any);
    const mockApiCall = jest.fn().mockRejectedValue(mockError);
    
    const { result } = renderHook(() => useApi<string>());

    let thrownError: any;

    await act(async () => {
      try {
        await result.current.execute(mockApiCall);
      } catch (error) {
        thrownError = error;
      }
    });

    expect(thrownError).toBe(mockHandledError);
  });
});

describe('useApiCall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('依存関係なしで初期化される', () => {
    const mockApiCall = jest.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useApiCall(mockApiCall));

    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.refresh).toBe('function');
  });

  it('依存関係ありで初期化される', () => {
    const mockApiCall = jest.fn().mockResolvedValue('data');
    const dependencies = ['dep1', 'dep2'];
    
    const { result } = renderHook(() => useApiCall(mockApiCall, dependencies));

    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.refresh).toBe('function');
  });

  it('refreshが正しく動作する', async () => {
    const mockApiCall = jest.fn().mockResolvedValue('refreshed data');
    const { result } = renderHook(() => useApiCall(mockApiCall));

    await act(async () => {
      result.current.refresh();
    });

    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it('依存関係が変わるとrefresh関数が更新される', () => {
    const mockApiCall = jest.fn().mockResolvedValue('data');
    let dependencies = ['dep1'];
    
    const { result, rerender } = renderHook(() => useApiCall(mockApiCall, dependencies));
    
    const firstRefresh = result.current.refresh;

    // 依存関係を変更
    dependencies = ['dep2'];
    rerender();

    const secondRefresh = result.current.refresh;

    // 関数が更新されていることを確認（参照が異なる）
    expect(firstRefresh).not.toBe(secondRefresh);
  });

  it('複数回のrefreshが正しく動作する', async () => {
    const mockApiCall = jest.fn()
      .mockResolvedValueOnce('data 1')
      .mockResolvedValueOnce('data 2');
    
    const { result } = renderHook(() => useApiCall(mockApiCall));

    await act(async () => {
      result.current.refresh();
    });

    await act(async () => {
      result.current.refresh();
    });

    expect(mockApiCall).toHaveBeenCalledTimes(2);
  });

  it('refreshでエラーが処理される', async () => {
    const mockError = new Error('Refresh Error');
    const mockHandledError = { message: 'Handled refresh error' };
    
    mockHandleApiError.mockReturnValue(mockHandledError as any);
    const mockApiCall = jest.fn().mockRejectedValue(mockError);
    
    const { result } = renderHook(() => useApiCall(mockApiCall));

    await act(async () => {
      try {
        result.current.refresh();
      } catch (error) {
        // エラーは内部で処理される
      }
    });

    expect(result.current.error).toBe('Handled refresh error');
    expect(result.current.loading).toBe(false);
  });

  it('空の依存関係配列でも正しく動作する', () => {
    const mockApiCall = jest.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useApiCall(mockApiCall, []));

    expect(result.current.data).toBe(null);
    expect(typeof result.current.refresh).toBe('function');
  });

  it('undefinedの依存関係でも正しく動作する', () => {
    const mockApiCall = jest.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useApiCall(mockApiCall, undefined));

    expect(result.current.data).toBe(null);
    expect(typeof result.current.refresh).toBe('function');
  });
});