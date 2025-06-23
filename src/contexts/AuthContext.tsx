import * as React from 'react';
const { createContext, useState, useContext, useEffect, useCallback } = React;
type ReactNode = React.ReactNode;
// 型を直接定義して import エラーを回避
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

interface MicrosoftApiCredentials {
  clientId: string;
  tenantId: string;
  clientSecret?: string; 
}
import { MOCK_MS_CLIENT_ID, MOCK_MS_TENANT_ID } from '../constants';

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
    // 簡単なセッション復元 - ローカルストレージから復元
    const checkAuthStatus = () => {
      try {
        const stored = sessionStorage.getItem('servicegrid_auth');
        if (stored) {
          const authData = JSON.parse(stored);
          if (Date.now() - authData.timestamp < 30 * 60 * 1000) { // 30分
            setUser(authData.user);
            setSessionId(authData.sessionId);
            updateLastActivity();
            setIsSessionValid(true);
          } else {
            sessionStorage.removeItem('servicegrid_auth');
          }
        }
      } catch (error) {
        console.error('Failed to restore authentication:', error);
        sessionStorage.removeItem('servicegrid_auth');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [updateLastActivity]);

  const login = async (username: string, password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    
    try {
      // 簡単なモック認証
      if (username === 'admin' && password === 'admin123') {
        const userData: User = {
          id: '1',
          username: 'admin',
          role: UserRole.ADMIN,
          email: 'admin@servicegrid.com'
        };
        
        const sessionData = {
          user: userData,
          sessionId: crypto.randomUUID(),
          timestamp: Date.now()
        };
        
        setUser(userData);
        setSessionId(sessionData.sessionId);
        updateLastActivity();
        setIsSessionValid(true);
        
        // セッションを保存
        sessionStorage.setItem('servicegrid_auth', JSON.stringify(sessionData));
        
        console.log(`[SECURITY] User ${username} logged in successfully at ${new Date().toISOString()}`);
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
          sessionId: crypto.randomUUID(),
          timestamp: Date.now()
        };
        
        setUser(userData);
        setSessionId(sessionData.sessionId);
        updateLastActivity();
        setIsSessionValid(true);
        
        sessionStorage.setItem('servicegrid_auth', JSON.stringify(sessionData));
        
        console.log(`[SECURITY] User ${username} logged in successfully at ${new Date().toISOString()}`);
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

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      // セッション終了のログ記録
      if (user) {
        console.log(`[SECURITY] User ${user.username} logged out at ${new Date().toISOString()}`);
      }
      
      // セッションストレージをクリア
      sessionStorage.removeItem('servicegrid_auth');
    } catch (error) {
      console.error('Logout error:', error);
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

  // トークンリフレッシュ機能（簡易版）
  const refreshToken = async (): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {
      updateLastActivity();
      setIsSessionValid(true);
      console.log(`[SECURITY] Token refreshed for user ${user.username}`);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      return false;
    }
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