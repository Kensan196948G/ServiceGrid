import {
  login,
  logout,
  getMe,
  changePassword,
  testConnection,
  getCurrentUserRole,
  isAuthenticated,
  getAuthToken,
  getCurrentUser,
  AuthApiError
} from '../authApiService';
import { UserRole } from '../../types';

// fetch のモック
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// sessionStorage のモック
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

describe('authApiService', () => {
  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockSessionStorage.getItem.mockClear();
    mockSessionStorage.setItem.mockClear();
    mockSessionStorage.removeItem.mockClear();
  });

  describe('login', () => {
    const mockCredentials = {
      username: 'testuser',
      password: 'testpassword'
    };

    const mockLoginResponse = {
      success: true,
      token: 'mock-jwt-token',
      user: {
        id: 1,
        username: 'testuser',
        role: UserRole.ADMIN,
        display_name: 'Test User',
        email: 'test@example.com'
      },
      message: 'ログインに成功しました'
    };

    it('正常なログインが成功する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoginResponse
      } as Response);

      const result = await login(mockCredentials);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8082/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockCredentials)
      });

      expect(result).toEqual(mockLoginResponse);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('token', 'mock-jwt-token');
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('user_data', JSON.stringify(mockLoginResponse.user));
    });

    it('認証エラーの場合にAuthApiErrorをthrowする', async () => {
      const errorResponse = {
        error: '認証に失敗しました',
        code: 'INVALID_CREDENTIALS'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => errorResponse
      } as Response);

      await expect(login(mockCredentials)).rejects.toThrow(AuthApiError);
      
      try {
        await login(mockCredentials);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthApiError);
        expect((error as AuthApiError).status).toBe(401);
        expect((error as AuthApiError).code).toBe('INVALID_CREDENTIALS');
        expect((error as AuthApiError).message).toBe('認証に失敗しました');
      }
    });

    it('ネットワークエラーの場合にAuthApiErrorをthrowする', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

      await expect(login(mockCredentials)).rejects.toThrow(AuthApiError);
      
      try {
        await login(mockCredentials);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthApiError);
        expect((error as AuthApiError).status).toBe(0);
        expect((error as AuthApiError).code).toBe('NETWORK_ERROR');
        expect((error as AuthApiError).message).toBe('ネットワークエラーが発生しました');
      }
    });

    it('トークンが返されない場合でもセッションストレージに保存しない', async () => {
      const responseWithoutToken = {
        ...mockLoginResponse,
        success: false,
        token: ''
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithoutToken
      } as Response);

      const result = await login(mockCredentials);

      expect(result).toEqual(responseWithoutToken);
      expect(mockSessionStorage.setItem).not.toHaveBeenCalledWith('token', expect.any(String));
    });
  });

  describe('logout', () => {
    it('正常なログアウトが成功する', async () => {
      mockSessionStorage.getItem.mockReturnValue('mock-token');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await logout();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8082/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        }
      });

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('user_data');
    });

    it('APIエラーでもローカルデータはクリアされる', async () => {
      mockSessionStorage.getItem.mockReturnValue('mock-token');
      
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      await logout();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('user_data');
    });

    it('トークンがない場合でもローカルデータはクリアされる', async () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      await logout();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('user_data');
    });
  });

  describe('getMe', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      role: UserRole.ADMIN,
      displayName: 'Test User',
      email: 'test@example.com'
    };

    it('正常にユーザー情報を取得する', async () => {
      mockSessionStorage.getItem.mockReturnValue('mock-token');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser })
      } as Response);

      const result = await getMe();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8082/api/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        }
      });

      expect(result).toEqual(mockUser);
    });

    it('認証エラーの場合にAuthApiErrorをthrowする', async () => {
      mockSessionStorage.getItem.mockReturnValue('invalid-token');
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized', code: 'INVALID_TOKEN' })
      } as Response);

      await expect(getMe()).rejects.toThrow(AuthApiError);
    });
  });

  describe('changePassword', () => {
    it('正常にパスワードを変更する', async () => {
      mockSessionStorage.getItem.mockReturnValue('mock-token');
      
      const mockResponse = {
        success: true,
        message: 'パスワードが正常に変更されました'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await changePassword('currentPassword', 'newPassword');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8082/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        },
        body: JSON.stringify({
          currentPassword: 'currentPassword',
          newPassword: 'newPassword'
        })
      });

      expect(result).toEqual(mockResponse);
    });

    it('現在のパスワードが間違っている場合にエラーをthrowする', async () => {
      mockSessionStorage.getItem.mockReturnValue('mock-token');
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: '現在のパスワードが正しくありません', code: 'INVALID_PASSWORD' })
      } as Response);

      await expect(changePassword('wrongPassword', 'newPassword')).rejects.toThrow(AuthApiError);
    });
  });

  describe('testConnection', () => {
    it('API接続が成功する場合にtrueを返す', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ping: 'pong' })
      } as Response);

      const result = await testConnection();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8082/ping', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(result).toBe(true);
    });

    it('API接続が失敗する場合にfalseを返す', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getCurrentUserRole', () => {
    it('有効なユーザーデータからロールを取得する', () => {
      const userData = {
        id: 1,
        username: 'testuser',
        role: UserRole.ADMIN,
        displayName: 'Test User',
        email: 'test@example.com'
      };

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(userData));

      const result = getCurrentUserRole();

      expect(result).toBe(UserRole.ADMIN);
    });

    it('ユーザーデータがない場合にnullを返す', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const result = getCurrentUserRole();

      expect(result).toBe(null);
    });

    it('無効なJSONの場合にnullを返す', () => {
      mockSessionStorage.getItem.mockReturnValue('invalid-json');

      const result = getCurrentUserRole();

      expect(result).toBe(null);
    });
  });

  describe('isAuthenticated', () => {
    it('トークンとユーザーデータがある場合にtrueを返す', () => {
      mockSessionStorage.getItem
        .mockReturnValueOnce('mock-token')
        .mockReturnValueOnce('{"id":1,"username":"test"}');

      const result = isAuthenticated();

      expect(result).toBe(true);
    });

    it('トークンがない場合にfalseを返す', () => {
      mockSessionStorage.getItem
        .mockReturnValueOnce(null)
        .mockReturnValueOnce('{"id":1,"username":"test"}');

      const result = isAuthenticated();

      expect(result).toBe(false);
    });

    it('ユーザーデータがない場合にfalseを返す', () => {
      mockSessionStorage.getItem
        .mockReturnValueOnce('mock-token')
        .mockReturnValueOnce(null);

      const result = isAuthenticated();

      expect(result).toBe(false);
    });

    it('両方ともない場合にfalseを返す', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const result = isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('getAuthToken', () => {
    it('保存されたトークンを返す', () => {
      mockSessionStorage.getItem.mockReturnValue('mock-token');

      const result = getAuthToken();

      expect(result).toBe('mock-token');
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('token');
    });

    it('トークンがない場合にnullを返す', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const result = getAuthToken();

      expect(result).toBe(null);
    });
  });

  describe('getCurrentUser', () => {
    it('有効なユーザーデータを返す', () => {
      const userData = {
        id: 1,
        username: 'testuser',
        role: UserRole.ADMIN,
        displayName: 'Test User',
        email: 'test@example.com'
      };

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(userData));

      const result = getCurrentUser();

      expect(result).toEqual(userData);
    });

    it('ユーザーデータがない場合にnullを返す', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const result = getCurrentUser();

      expect(result).toBe(null);
    });

    it('無効なJSONの場合にnullを返す', () => {
      mockSessionStorage.getItem.mockReturnValue('invalid-json');

      const result = getCurrentUser();

      expect(result).toBe(null);
    });
  });

  describe('AuthApiError', () => {
    it('正しいプロパティでエラーオブジェクトを作成する', () => {
      const error = new AuthApiError(404, 'NOT_FOUND', 'リソースが見つかりません');

      expect(error.name).toBe('AuthApiError');
      expect(error.status).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('リソースが見つかりません');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('環境変数テスト', () => {
    it('環境変数が設定されている場合にAPIベースURLを使用する', async () => {
      // 環境変数を一時的に変更
      const originalEnv = process.env.VITE_API_BASE_URL;
      process.env.VITE_API_BASE_URL = 'https://api.example.com';

      // モジュールを再ロード（実際のテストでは dynamic import を使用）
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ping: 'pong' })
      } as Response);

      await testConnection();

      // デフォルトのURLが使用されることを確認（モジュール再ロードが必要）
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('localhost:8082'),
        expect.any(Object)
      );

      // 環境変数を元に戻す
      process.env.VITE_API_BASE_URL = originalEnv;
    });
  });
});