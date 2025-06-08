import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, UserRole, MicrosoftApiCredentials } from '../types';
import { MOCK_MS_CLIENT_ID, MOCK_MS_TENANT_ID } from '../constants';
import { addAuditLog } from '../services/mockItsmService'; // For logging login/logout

interface AuthContextType {
  user: User | null;
  msApiCreds: MicrosoftApiCredentials;
  login: (username: string, role: UserRole) => void;
  logout: () => void;
  setMsClientSecret: (secret: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [msApiCreds, setMsApiCreds] = useState<MicrosoftApiCredentials>({
    clientId: MOCK_MS_CLIENT_ID,
    tenantId: MOCK_MS_TENANT_ID,
    clientSecret: undefined,
  });
  const [isLoading, setIsLoading] = useState(true); // For checking persisted login

  useEffect(() => {
    // Simulate checking for persisted login (e.g., from localStorage)
    const storedUser = localStorage.getItem('itsmUser');
    const storedSecret = localStorage.getItem('itsmMsClientSecret');
    if (storedUser) {
      const parsedUser: User = JSON.parse(storedUser);
      setUser(parsedUser);
      if(storedSecret) {
        setMsApiCreds(prev => ({ ...prev, clientSecret: storedSecret}));
      }
    }
    setIsLoading(false);
  }, []);

  const login = (username: string, role: UserRole) => {
    const newUser: User = { id: Date.now().toString(), username, role, email: `${username.toLowerCase()}@example.com` };
    setUser(newUser);
    localStorage.setItem('itsmUser', JSON.stringify(newUser));
    // Simulate audit log for login
    addAuditLog({
      userId: newUser.id,
      username: newUser.username,
      action: 'ユーザーログイン',
      details: `ユーザー ${username} がログインしました。`
    });
  };

  const logout = () => {
    if (user) {
       addAuditLog({
        userId: user.id,
        username: user.username,
        action: 'ユーザーログアウト',
        details: `ユーザー ${user.username} がログアウトしました。`
      });
    }
    setUser(null);
    setMsApiCreds(prev => ({ ...prev, clientSecret: undefined })); // Clear secret on logout
    localStorage.removeItem('itsmUser');
    localStorage.removeItem('itsmMsClientSecret');
  };

  const setMsClientSecret = (secret: string) => {
    setMsApiCreds(prev => ({ ...prev, clientSecret: secret }));
    localStorage.setItem('itsmMsClientSecret', secret); // Persist for session convenience (in real scenario, more secure handling)
     if (user) {
        addAuditLog({
            userId: user.id,
            username: user.username,
            action: 'MS APIクライアントシークレット更新',
            details: `クライアントシークレットが設定/更新されました。`
        });
    }
  };
  
  if (isLoading) {
    // You might want to render a global loading spinner here
    return <div className="flex items-center justify-center h-screen bg-slate-100"><div role="status" aria-label="読み込み中"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div></div></div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, msApiCreds, setMsClientSecret, isLoading }}>
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