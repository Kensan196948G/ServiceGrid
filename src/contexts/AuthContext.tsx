import * as React from 'react';
const { createContext, useState, useContext, useEffect, useCallback } = React;
type ReactNode = React.ReactNode;
import { User, MicrosoftApiCredentials } from '../types';
import { MOCK_MS_CLIENT_ID, MOCK_MS_TENANT_ID } from '../constants';
import * as authApi from '../services/authApiService';

interface AuthContextType {
  user: User | null;
  msApiCreds: MicrosoftApiCredentials;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  setMsClientSecret: (secret: string) => void;
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  lastActivity: Date | null;
  isSessionValid: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [msApiCreds, setMsApiCreds] = useState<MicrosoftApiCredentials>({
    clientId: MOCK_MS_CLIENT_ID,
    tenantId: MOCK_MS_TENANT_ID,
    clientSecret: undefined,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [isSessionValid, setIsSessionValid] = useState(false);

  // セッション自動延長のための活動追跡
  const updateLastActivity = useCallback(() => {
    setLastActivity(new Date());
  }, []);

  // セッション有効性チェック
  const checkSessionValidity = useCallback(() => {
    if (!user || !lastActivity) {
      setIsSessionValid(false);
      return false;
    }

    const sessionTimeout = 30 * 60 * 1000; // 30分
    const timeSinceLastActivity = Date.now() - lastActivity.getTime();
    const valid = timeSinceLastActivity < sessionTimeout;
    
    setIsSessionValid(valid);
    return valid;
  }, [user, lastActivity]);

  // 定期的なセッション有効性チェック
  useEffect(() => {
    const interval = setInterval(() => {
      if (!checkSessionValidity()) {
        console.warn('Session expired due to inactivity');
        logout();
      }
    }, 60000); // 1分毎にチェック

    return () => clearInterval(interval);
  }, [checkSessionValidity]);

  // ユーザー活動の監視
  useEffect(() => {
    const handleUserActivity = () => {
      if (user) {
        updateLastActivity();
      }
    };

    document.addEventListener('mousedown', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);
    document.addEventListener('touchstart', handleUserActivity);

    return () => {
      document.removeEventListener('mousedown', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('scroll', handleUserActivity);
      document.removeEventListener('touchstart', handleUserActivity);
    };
  }, [user, updateLastActivity]);

  useEffect(() => {
    // セッション復元を試行 - 実API認証情報を使用
    const checkAuthStatus = async () => {
      try {
        if (authApi.isAuthenticated()) {
          const currentUser = authApi.getCurrentUser();
          if (currentUser) {
            // APIでユーザー情報を検証
            try {
              const verifiedUser = await authApi.getMe();
              setUser(verifiedUser);
            } catch (apiError) {
              // API検証に失敗した場合はローカルユーザー情報を使用（オフライン対応）
              console.warn('API verification failed, using cached user data:', apiError);
              setUser(currentUser);
            }
          } else {
            // トークンがあるが、ユーザー情報取得に失敗した場合はAPIから取得
            const userData = await authApi.getMe();
            setUser(userData);
          }
        } else {
          // 認証情報がない場合は明示的にnullに設定
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to restore authentication:', error);
        // 認証復元に失敗した場合はローカルデータをクリア
        await authApi.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await authApi.login({ username, password });
      
      if (response.success && response.user) {
        // API応答のユーザー情報を型に合わせて変換
        const userData: User = {
          id: response.user.id.toString(),
          username: response.user.username,
          role: response.user.role,
          email: response.user.email
        };
        
        setUser(userData);
        setSessionId(response.sessionId || crypto.randomUUID());
        updateLastActivity();
        setIsSessionValid(true);
        
        // セキュリティ監査ログ
        console.log(`[SECURITY] User ${username} logged in successfully at ${new Date().toISOString()}`);
        
        return true;
      } else {
        setError(response.message || 'ログインに失敗しました');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof authApi.AuthApiError) {
        setError(error.message);
      } else {
        setError('ログイン処理中にエラーが発生しました');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      // セッション終了のログ記録
      if (user) {
        console.log(`[SECURITY] User ${user.username} logged out at ${new Date().toISOString()}`);
      }
      
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // ログアウトAPIエラーでもローカル状態はクリア
    } finally {
      setUser(null);
      setSessionId(null);
      setLastActivity(null);
      setIsSessionValid(false);
      setMsApiCreds(prev => ({ ...prev, clientSecret: undefined }));
      setError(null);
      setIsLoading(false);
    }
  };

  // トークンリフレッシュ機能
  const refreshToken = async (): Promise<boolean> => {
    if (!user || !authApi.isAuthenticated()) {
      return false;
    }

    try {
      const refreshed = await authApi.refreshToken();
      if (refreshed) {
        updateLastActivity();
        setIsSessionValid(true);
        console.log(`[SECURITY] Token refreshed for user ${user.username}`);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      // リフレッシュに失敗した場合はログアウト
      await logout();
    }
    
    return false;
  };

  const setMsClientSecret = (secret: string) => {
    setMsApiCreds(prev => ({ ...prev, clientSecret: secret }));
    // セキュリティ上、機密情報はメモリのみで管理
    // 監査ログは将来的にAPIを通じて記録する予定
  };
  
  if (isLoading) {
    // You might want to render a global loading spinner here
    return <div className="flex items-center justify-center h-screen bg-slate-100"><div role="status" aria-label="読み込み中"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div></div></div>;
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      refreshToken,
      msApiCreds, 
      setMsClientSecret, 
      isLoading, 
      error,
      sessionId,
      lastActivity,
      isSessionValid
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};