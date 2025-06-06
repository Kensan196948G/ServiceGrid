import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, MicrosoftApiCredentials } from '../types';
import { MOCK_MS_CLIENT_ID, MOCK_MS_TENANT_ID } from '../constants';
import * as authApi from '../services/authApiService';

interface AuthContextType {
  user: User | null;
  msApiCreds: MicrosoftApiCredentials;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setMsClientSecret: (secret: string) => void;
  isLoading: boolean;
  error: string | null;
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

  useEffect(() => {
    // セッション復元を試行 - 実API認証情報を使用
    const checkAuthStatus = async () => {
      try {
        if (authApi.isAuthenticated()) {
          const currentUser = authApi.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
          } else {
            // トークンがあるが、ユーザー情報取得に失敗した場合はAPIから取得
            const userData = await authApi.getMe();
            setUser(userData);
          }
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
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // ログアウトAPIエラーでもローカル状態はクリア
    } finally {
      setUser(null);
      setMsApiCreds(prev => ({ ...prev, clientSecret: undefined }));
      setError(null);
      setIsLoading(false);
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
    <AuthContext.Provider value={{ user, login, logout, msApiCreds, setMsClientSecret, isLoading, error }}>
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